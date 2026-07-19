import * as THREE from "three";
import {
  SceneNode,
  DIRTY_CONTENT,
  Quality,
  CoreConfig,
  MirageMode,
  USER_LAYER,
  SELECT_LAYER,
  travelerClipArea,
  THREE_LAYERS,
  ATTR_TRAVEL,
  LayerTarget,
} from "../types";
import { Painter, TextStyles, BoxStyles } from "@mirage-engine/painter";
import { MeshRegistry } from "../store/MeshRegistry";
import { TextureLifecycleManager } from "../store/TextureLifecycleManager";

export class Renderer {
  public readonly canvas: HTMLCanvasElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private renderTargets: THREE.WebGLRenderTarget[] = [];
  private renderOrder: number = 0;
  public qualityFactor: number = 2;
  private mode: MirageMode = "overlay";
  private canvasSize: "viewport" | "document" = "viewport";
  private clipArea: travelerClipArea = 1;
  public targetLayer: number | LayerTarget = "base";
  private readonly overscan: number = 200;

  private get isViewport(): boolean {
    return this.mode === "overlay" && this.canvasSize === "viewport";
  }

  private target: HTMLElement;
  private mountContainer: HTMLElement;
  private registry: MeshRegistry;
  private targetRect: DOMRect;

  private travelersByLayer: Set<THREE.Mesh>[] = Array.from(
    { length: ATTR_TRAVEL.MAX_LAYERS },
    () => new Set(),
  );
  private textureManager: TextureLifecycleManager;
  // private meshMap: Map<HTMLElement, THREE.Mesh> = new Map();

  public readonly fixedMeshes: Set<THREE.Mesh> = new Set();

  constructor(
    target: HTMLElement,
    config: CoreConfig,
    mountContainer: HTMLElement,
    registry: MeshRegistry,
  ) {
    this.target = target;
    this.mountContainer = mountContainer;
    this.registry = registry;

    this.mode = config.mode ?? "overlay";
    this.canvasSize = (config as any).canvasSize ?? "viewport";
    this.clipArea = config.travelerClipArea ?? 1;
    this.targetLayer = config.layer ?? "base";

    this.textureManager = new TextureLifecycleManager((el, texture) => {
      const mesh = this.registry.get(el);
      if (mesh && mesh.material instanceof THREE.ShaderMaterial) {
        Painter.forceUpdateUniforms(mesh.material, { texture: texture });
      }
    }, this.isViewport);

    this.canvas = document.createElement("canvas");
    this.scene = new THREE.Scene();

    this.targetRect = this.target.getBoundingClientRect();
    const width = this.isViewport
      ? window.innerWidth + this.overscan * 2
      : this.targetRect.width;
    const height = this.isViewport
      ? window.innerHeight + this.overscan * 2
      : this.targetRect.height;

    // target duplicate mode
    // const width = target.parentElement!.clientWidth;
    // const height = target.parentElement!.clientHeight;

    this.camera = new THREE.OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      1,
      1000,
    );
    this.camera.position.z = 100;
    this.camera.layers.set(this.getSceneLayer());

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      // [new]
      // premultipliedAlpha: true
    });

    THREE.ColorManagement.enabled = false;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);

    this.applyTextQuality(config.quality ?? "medium");
  }

  private getSceneLayer(): number {
    if (typeof this.targetLayer === "number") {
      return this.targetLayer;
    } else if (this.targetLayer === "selected") {
      return THREE_LAYERS.SELECTED;
    } else {
      return THREE_LAYERS.BASE;
    }
  }

  public createRenderTarget() {
    for (let i = 0; i < ATTR_TRAVEL.MAX_LAYERS; i++) {
      const width = this.isViewport
        ? window.innerWidth + this.overscan * 2
        : this.targetRect.width;
      const height = this.isViewport
        ? window.innerHeight + this.overscan * 2
        : this.targetRect.height;
      this.renderTargets.push(
        new THREE.WebGLRenderTarget(
          width * this.qualityFactor,
          height * this.qualityFactor,
          {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false,
            depthBuffer: true,
          },
        ),
      );
    }
  }

  private applyTextQuality(quality: Quality) {
    if (typeof quality === "number") {
      this.qualityFactor = Math.max(0.1, quality);
      return;
    }
    switch (quality) {
      case "low":
        this.qualityFactor = 1;
        break;
      case "high":
        this.qualityFactor = 4;
        break;
      case "medium":
        // this.qualityFactor = 2;
        this.qualityFactor = 2;
        break;
      default:
        this.qualityFactor = 2;
        break;
    }
  }

  public mount() {
    this.mountContainer.prepend(this.canvas);

    this.canvas.style.pointerEvents = this.mode === "overlay" ? "none" : "auto";

    this.updateCanvasLayout();
  }

  private updateCanvasLayout() {
    const width = this.isViewport
      ? window.innerWidth + this.overscan * 2
      : this.targetRect.width;
    const height = this.isViewport
      ? window.innerHeight + this.overscan * 2
      : this.targetRect.height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.mode === "duplicate") {
      this.canvas.style.position = "";
      this.canvas.style.top = "";
      this.canvas.style.left = "";
      this.canvas.style.display = "block";
    } else {
      this.canvas.style.position = this.isViewport ? "fixed" : "absolute";
      this.canvas.style.top = this.isViewport
        ? `-${this.overscan}px`
        : `${this.target.offsetTop}px`;
      this.canvas.style.left = this.isViewport
        ? `-${this.overscan}px`
        : `${this.target.offsetLeft}px`;
      this.canvas.style.display = "block";
    }
  }

  public updateUniforms(element: HTMLElement, uniforms: Record<string, any>) {
    const mesh = this.registry.get(element);
    if (!mesh) return;

    mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
        Painter.forceUpdateUniforms(
          (child as THREE.Mesh).material as THREE.ShaderMaterial,
          uniforms,
        );
      }
    });

    if (mesh.userData.nativeMesh) {
      mesh.userData.nativeMesh.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
          Painter.forceUpdateUniforms(
            (child as THREE.Mesh).material as THREE.ShaderMaterial,
            uniforms,
          );
        }
      });
    }
  }

  public dispose() {
    this.renderer.dispose();
    this.canvas.remove();
    this.textureManager.disposeAll();
    // TODO: Scene 내부 Mesh들도 순회하며 dispose
  }

  public setSize(width: number, height: number) {
    this.renderer.setSize(width, height);
    for (const target of this.renderTargets) {
      target.setSize(width * this.qualityFactor, height * this.qualityFactor);
    }
    this.camera.left = width / -2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = height / -2;
    this.camera.updateProjectionMatrix();
  }

  public syncScene(graphNode: SceneNode, pendingDeletions: Set<HTMLElement>) {
    const newRect = this.target.getBoundingClientRect();
    const newWidth = this.isViewport
      ? window.innerWidth + this.overscan * 2
      : newRect.width;
    const newHeight = this.isViewport
      ? window.innerHeight + this.overscan * 2
      : newRect.height;
    const oldWidth = this.isViewport
      ? this.canvas.clientWidth
      : this.targetRect.width;
    const oldHeight = this.isViewport
      ? this.canvas.clientHeight
      : this.targetRect.height;

    const isResized =
      Math.abs(newWidth - oldWidth) > 0.1 ||
      Math.abs(newHeight - oldHeight) > 0.1;

    const isMoved =
      this.mode === "overlay" &&
      (Math.abs(newRect.top - this.targetRect.top) > 0.1 ||
        Math.abs(newRect.left - this.targetRect.left) > 0.1);

    if (isResized) {
      this.targetRect = newRect;
      this.setSize(newWidth, newHeight);

      this.updateCanvasLayout();
    } else if (isMoved) {
      this.targetRect = newRect;
      this.updateCanvasLayout();
    } else {
      this.targetRect = newRect;
    }

    this.renderOrder = 0;

    this.reconcileNode(graphNode);

    if (pendingDeletions.size > 0) {
      pendingDeletions.forEach((el) => {
        const meshToDestroy = this.registry.get(el) as THREE.Mesh | undefined;
        if (meshToDestroy) {
          this.scene.remove(meshToDestroy);
          for (const set of this.travelersByLayer) {
            set.delete(meshToDestroy);
          }
          this.fixedMeshes.delete(meshToDestroy);
          meshToDestroy.geometry.dispose();
          if (meshToDestroy.userData.nativeMesh) {
            this.scene.remove(meshToDestroy.userData.nativeMesh);
            if (Array.isArray(meshToDestroy.userData.nativeMesh.material)) {
              meshToDestroy.userData.nativeMesh.material.forEach(
                (mat: THREE.Material) => mat.dispose(),
              );
            } else {
              meshToDestroy.userData.nativeMesh.material.dispose();
            }
            meshToDestroy.userData.nativeMesh.geometry.dispose();
          }
          meshToDestroy.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat) => mat.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });
          this.registry.remove(el);
          this.textureManager.unregister(el);
        }
      });
    }

    //     mesh.geometry.dispose();
    //     if (mesh.material instanceof THREE.Material) mesh.material.dispose();
    //     this.meshMap.delete(el);
    //   }
    // }
  }

  // 탐색 후 완성된 Scene node를 이용하여 mesh를 만들거나 조정
  // => 이 과정에서 scene node에 있는 ele를 넣은 hash => activeElements
  // => 이후 activeElements를 이용하여 mesh를 정리!!!+ map에서도 삭제

  // private reconcileNode(node: SceneNode, activeElements: Set<HTMLElement>) {
  private reconcileNode(node: SceneNode) {
    let mesh = this.registry.get(node.element) as THREE.Mesh | undefined;

    const currentShaderHash = JSON.stringify(node.shaderHooks || null);

    if (mesh && mesh.userData.shaderHash !== currentShaderHash) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) mesh.material.dispose();
      this.registry.remove(node.element);
      mesh = undefined;
    }

    if (!mesh) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const initialTexture = node.isTraveler
        ? this.renderTargets[node.captureLayer - 2]?.texture
        : this.textureManager.get(node.element);

      const material = Painter.create(
        "BOX",
        node.styles,
        "",
        node.rect.width,
        node.rect.height,
        this.qualityFactor,
        initialTexture,
        node.shaderHooks,
      );

      mesh = new THREE.Mesh(geometry, material);

      if (node.type === "TEXT") mesh.name = "BG_MESH";
      this.scene.add(mesh);

      this.registry.register(node.element, mesh);
      mesh.userData.baseMaterial = material;
      mesh.userData.domElement = node.element;
      mesh.userData.shaderHash = currentShaderHash;
    }

    mesh.userData.clipElements = node.clipElements;
    
    if (node.nativeStyles?.transform) {
      mesh.userData.nativeTransform = node.nativeStyles.transform;
    } else {
      mesh.userData.nativeTransform = undefined;
    }

    // [Important] use whene mesh animating with js

    this.updateMeshProperties(mesh, node);
    this.updateMeshLayers(mesh, node);
    if (node.isTraveler) {
      for (let i = 0; i < ATTR_TRAVEL.MAX_LAYERS; i++) {
        if (i === node.captureLayer - 2) {
          this.travelersByLayer[i].add(mesh);
        } else {
          this.travelersByLayer[i].delete(mesh);
        }
      }
    } else {
      for (const set of this.travelersByLayer) {
        set.delete(mesh);
      }
    }

    if (node.isFixed) {
      this.fixedMeshes.add(mesh);
    } else {
      this.fixedMeshes.delete(mesh);
    }

    if (node.styles.imageSrc) {
      this.textureManager.register(node.element, node.styles.imageSrc);
    } else {
      this.textureManager.unregister(node.element);
    }

    if (node.type === "BOX") {
      for (const child of node.children) {
        this.reconcileNode(child);
      }
    } else if (node.type === "TEXT") {
      this.reconcileTextChild(mesh, node, false);
      if (mesh.userData.nativeMesh && node.nativeStyles) {
        this.reconcileTextChild(
          mesh.userData.nativeMesh as THREE.Mesh,
          node,
          true,
        );
      }
    }
  }

  private reconcileTextChild(
    parentMesh: THREE.Mesh,
    node: SceneNode,
    isNative: boolean,
  ) {
    const lines = node.textLines || [
      { text: node.textContent || "", rect: node.rect },
    ];

    const stylesToUse = (
      isNative ? node.nativeStyles : node.textStyles
    ) as TextStyles;
    const currentStyleHash =
      JSON.stringify(stylesToUse) +
      node.textContent +
      lines.map((l) => l.text).join("|");
    const cachedStyleHash = parentMesh.userData?.textChildStyleHash;
    const isDirty =
      node.dirtyMask & DIRTY_CONTENT || currentStyleHash !== cachedStyleHash;

    if (isDirty) {
      // Remove all existing TEXT_CHILD meshes
      const existingChildren = parentMesh.children.filter((c) =>
        c.name.startsWith("TEXT_CHILD"),
      );
      existingChildren.forEach((child) => {
        const textMesh = child as THREE.Mesh;
        (textMesh.material as THREE.MeshBasicMaterial).map?.dispose();
        textMesh.geometry.dispose();
        parentMesh.remove(textMesh);
      });

      const parentRect = node.rect;
      const parentCenterX = parentRect.x + parentRect.width / 2;
      const parentCenterY = parentRect.y + parentRect.height / 2;

      lines.forEach((line, index) => {
        const material = Painter.create(
          "TEXT",
          stylesToUse,
          line.text,
          line.rect.width,
          line.rect.height,
          this.qualityFactor,
        );

        const geometry = new THREE.PlaneGeometry(1, 1);
        const textMesh = new THREE.Mesh(geometry, material);

        textMesh.name = `TEXT_CHILD_${index}`;

        // Parent is already scaled to node.rect.width/height.
        // We counter-scale the child so its absolute size is exactly line.rect.width/height.
        const scaleX =
          node.rect.width === 0 ? 1 : line.rect.width / node.rect.width;
        const scaleY =
          node.rect.height === 0 ? 1 : line.rect.height / node.rect.height;
        textMesh.scale.set(scaleX, scaleY, 1);

        const textCenterX = line.rect.x + line.rect.width / 2;
        const textCenterY = line.rect.y + line.rect.height / 2;

        const offsetX = textCenterX - parentCenterX;
        const offsetY = -(textCenterY - parentCenterY);

        // Position must also be counter-scaled relative to parent's scale
        textMesh.position.set(
          node.rect.width === 0 ? 0 : offsetX / node.rect.width,
          node.rect.height === 0 ? 0 : offsetY / node.rect.height,
          0.005,
        );

        parentMesh.add(textMesh);
      });

      parentMesh.userData.textChildStyleHash = currentStyleHash;
    }

    // Always update layers for all text children, as visibility/nativeLayer can change without dirtifying the style
    parentMesh.children.forEach((child) => {
      if (!child.name.startsWith("TEXT_CHILD")) return;
      const textMesh = child as THREE.Mesh;

      if (isNative && node.nativeLayer !== undefined) {
        textMesh.layers.set(THREE_LAYERS.HIDDEN);
        if (node.visibility & USER_LAYER) {
          textMesh.layers.enable(THREE_LAYERS.getCaptureLayer(node.nativeLayer));
        }
      } else {
        const layerNum =
          node.visibility & USER_LAYER ? THREE_LAYERS.BASE : THREE_LAYERS.HIDDEN;
        textMesh.layers.set(layerNum);

        if (node.visibility & SELECT_LAYER) {
          textMesh.layers.enable(THREE_LAYERS.SELECTED);
        }

        if (node.visibility & USER_LAYER) {
          if (
            !isNative &&
            node.nativeLayer !== undefined &&
            node.nativeStyles !== undefined
          ) {
            for (let i = node.captureLayer; i <= ATTR_TRAVEL.MAX_LAYERS + 1; i++) {
              if (i !== node.nativeLayer) {
                textMesh.layers.enable(THREE_LAYERS.getCaptureLayer(i));
              }
            }
          } else {
            for (
              let i = node.captureLayer;
              i <= ATTR_TRAVEL.MAX_LAYERS + 1;
              i++
            ) {
              textMesh.layers.enable(THREE_LAYERS.getCaptureLayer(i));
            }
          }
        }
      }
    });
  }

  private updateMeshProperties(mesh: THREE.Mesh, node: SceneNode) {
    const { rect, styles } = node;

    const pixelRatio = this.renderer.getPixelRatio();
    const canvasWidth = this.renderer.domElement.width / pixelRatio;
    const canvasHeight = this.renderer.domElement.height / pixelRatio;

    mesh.material = mesh.userData.baseMaterial as THREE.Material;
    let pad = (mesh.material as THREE.ShaderMaterial).userData?.shadowPadding || 0;
    mesh.scale.set(rect.width + pad * 2, rect.height + pad * 2, 1);

    mesh.userData.domRect = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };

    const Z_MICRO_OFFSET = 0.001;
    this.renderOrder++;

    const targetPageX = this.targetRect.left + window.scrollX;
    const targetPageY = this.targetRect.top + window.scrollY;

    let baseX: number, baseY: number;
    if (this.isViewport) {
      baseX = rect.x - window.innerWidth / 2 + rect.width / 2;
      baseY = -rect.y + window.innerHeight / 2 - rect.height / 2;
    } else {
      const localX = rect.x - targetPageX;
      const localY = rect.y - targetPageY;
      baseX = localX - canvasWidth / 2 + rect.width / 2;
      baseY = -localY + canvasHeight / 2 - rect.height / 2;
    }

    mesh.position.set(
      baseX,
      baseY,
      styles.zIndex + this.renderOrder * Z_MICRO_OFFSET,
    );
    const pureDOM_X = rect.x; // 트랜스폼 오염 전 순수 좌표 (가정)
    const pureDOM_Y = rect.y;

    mesh.userData.basePosition = { x: baseX, y: baseY };
    mesh.userData.originalBasePosition = { x: baseX, y: baseY };
    mesh.userData.baseSize = { width: rect.width, height: rect.height };

    mesh.userData.baseDOM = { x: pureDOM_X, y: pureDOM_Y };
    mesh.userData.isFixed = node.isFixed;
    mesh.userData.initialScroll = { x: window.scrollX, y: window.scrollY };

    const targetEl =
      node.element.nodeType === Node.TEXT_NODE
        ? node.element.parentElement!
        : node.element;
    const computed = window.getComputedStyle(targetEl);
    let baseTx = 0,
      baseTy = 0;
    if (computed.transform && computed.transform !== "none") {
      const matrix = new DOMMatrix(computed.transform);
      baseTx = matrix.m41;
      baseTy = matrix.m42;
    }
    mesh.userData.baseTransform = { x: baseTx, y: baseTy };

    delete mesh.userData.originRatioX;
    delete mesh.userData.originRatioY;
    // mesh.position.set(
    //   localX - canvasWidth / 2 + rect.width / 2,
    //   -localY + canvasHeight / 2 - rect.height / 2,
    //   styles.zIndex + this.renderOrder * Z_MICRO_OFFSET,
    // );
    Painter.update(
      mesh.userData.baseMaterial,
      "BOX",
      styles,
      "",
      rect.width,
      rect.height,
      this.qualityFactor,
      node.isTraveler
        ? this.renderTargets[node.captureLayer - 2]?.texture
        : this.textureManager.get(node.element),
    );

    if (node.nativeStyles && node.nativeRect) {
      if (!mesh.userData.nativeMesh) {
        const nativeMaterial = Painter.create(
          "BOX",
          node.nativeStyles,
          "",
          node.nativeRect.width,
          node.nativeRect.height,
          this.qualityFactor,
          node.isTraveler
            ? this.renderTargets[node.captureLayer - 2]?.texture
            : this.textureManager.get(node.element),
          node.shaderHooks,
        );
        const nativeMesh = new THREE.Mesh(mesh.geometry, nativeMaterial);
        if (node.type === "TEXT") nativeMesh.name = "BG_MESH";
        this.scene.add(nativeMesh);
        mesh.userData.nativeMesh = nativeMesh;
      }

      const nativeMesh = mesh.userData.nativeMesh as THREE.Mesh;
      let nativeBaseX: number, nativeBaseY: number;
      if (this.isViewport) {
        nativeBaseX =
          node.nativeRect.x - window.innerWidth / 2 + node.nativeRect.width / 2;
        nativeBaseY =
          -node.nativeRect.y +
          window.innerHeight / 2 -
          node.nativeRect.height / 2;
      } else {
        const nativeLocalX = node.nativeRect.x - targetPageX;
        const nativeLocalY = node.nativeRect.y - targetPageY;
        nativeBaseX =
          nativeLocalX - canvasWidth / 2 + node.nativeRect.width / 2;
        nativeBaseY =
          -nativeLocalY + canvasHeight / 2 - node.nativeRect.height / 2;
      }

      let nScaleX = node.nativeRect.width;
      let nScaleY = node.nativeRect.height;
      let nPosX = nativeBaseX;
      let nPosY = nativeBaseY;

      if (node.nativeStyles.transform) {
        const transformStr = node.nativeStyles.transform;
        
        const scaleMatch = transformStr.match(/scale\(([\d.]+%?)\)/);
        if (scaleMatch) {
          let scaleVal = parseFloat(scaleMatch[1]);
          if (scaleMatch[1].includes("%")) scaleVal /= 100;
          nScaleX *= scaleVal;
          nScaleY *= scaleVal;
        }

        const scaleXMatch = transformStr.match(/scaleX\(([\d.]+%?)\)/);
        if (scaleXMatch) {
          let scaleVal = parseFloat(scaleXMatch[1]);
          if (scaleXMatch[1].includes("%")) scaleVal /= 100;
          nScaleX *= scaleVal;
        }

        const scaleYMatch = transformStr.match(/scaleY\(([\d.]+%?)\)/);
        if (scaleYMatch) {
          let scaleVal = parseFloat(scaleYMatch[1]);
          if (scaleYMatch[1].includes("%")) scaleVal /= 100;
          nScaleY *= scaleVal;
        }

        const translateMatch = transformStr.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
          const txStr = translateMatch[1].trim();
          const tyStr = translateMatch[2].trim();
          let tx = parseFloat(txStr);
          if (txStr.includes("%")) tx = (tx / 100) * node.nativeRect.width;
          let ty = parseFloat(tyStr);
          if (tyStr.includes("%")) ty = (ty / 100) * node.nativeRect.height;
          nPosX += tx;
          nPosY -= ty;
        }

        const translateXMatch = transformStr.match(/translateX\(([^)]+)\)/);
        if (translateXMatch) {
          const txStr = translateXMatch[1].trim();
          let tx = parseFloat(txStr);
          if (txStr.includes("%")) tx = (tx / 100) * node.nativeRect.width;
          nPosX += tx;
        }

        const translateYMatch = transformStr.match(/translateY\(([^)]+)\)/);
        if (translateYMatch) {
          const tyStr = translateYMatch[1].trim();
          let ty = parseFloat(tyStr);
          if (tyStr.includes("%")) ty = (ty / 100) * node.nativeRect.height;
          nPosY -= ty;
        }
      }

      let nPad = (nativeMesh.material as THREE.ShaderMaterial).userData?.shadowPadding || 0;
      nativeMesh.scale.set(nScaleX + nPad * 2, nScaleY + nPad * 2, 1);
      nativeMesh.position.set(
        nPosX,
        nPosY,
        (node.nativeStyles as BoxStyles).zIndex +
          this.renderOrder * Z_MICRO_OFFSET,
      );

      Painter.update(
        nativeMesh.material as THREE.Material,
        "BOX",
        node.nativeStyles,
        "",
        node.nativeRect.width,
        node.nativeRect.height,
        this.qualityFactor,
        node.isTraveler
          ? this.renderTargets[node.captureLayer - 2]?.texture
          : this.textureManager.get(node.element),
      );
    } else {
      if (mesh.userData.nativeMesh) {
        this.scene.remove(mesh.userData.nativeMesh);
        if (mesh.userData.nativeMesh.material instanceof THREE.Material) {
          mesh.userData.nativeMesh.material.dispose();
        }
        delete mesh.userData.nativeMesh;
      }
    }
  }

  private updateMeshLayers(mesh: THREE.Mesh, node: SceneNode) {
    const layerNum =
      node.visibility & USER_LAYER ? THREE_LAYERS.BASE : THREE_LAYERS.HIDDEN;
    mesh.layers.set(layerNum);

    if (node.visibility & SELECT_LAYER) {
      mesh.layers.enable(THREE_LAYERS.SELECTED);
    }

    if (mesh.userData.nativeMesh && node.nativeLayer !== undefined) {
      const nativeMesh = mesh.userData.nativeMesh as THREE.Mesh;
      nativeMesh.layers.set(THREE_LAYERS.HIDDEN);

      if (node.visibility & USER_LAYER) {
        nativeMesh.layers.enable(THREE_LAYERS.getCaptureLayer(node.nativeLayer));
        
        for (let i = node.captureLayer; i <= ATTR_TRAVEL.MAX_LAYERS + 1; i++) {
          if (i !== node.nativeLayer) {
            mesh.layers.enable(THREE_LAYERS.getCaptureLayer(i));
          }
        }
      }
    } else {
      if (node.visibility & USER_LAYER) {
        for (let i = node.captureLayer; i <= ATTR_TRAVEL.MAX_LAYERS + 1; i++) {
          mesh.layers.enable(THREE_LAYERS.getCaptureLayer(i));
        }
      }
    }
  }

  private captureRenderTarget(
    travelers: Set<THREE.Mesh>,
    targetLayer: number,
    renderTarget: THREE.WebGLRenderTarget | null,
  ) {
    // [Problem] this method called on requestAnimationFrame
    // => this logic travers all meshes every frame, need optimization

    // if (travelers.length === 0) return;
    if (travelers.size === 0 || !renderTarget) return;

    const oldClearColor = new THREE.Color();
    const oldClearAlpha = this.renderer.getClearAlpha();
    this.renderer.getClearColor(oldClearColor);

    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setRenderTarget(renderTarget);

    this.renderer.clear();

    this.renderer.autoClear = false;
    this.renderer.setScissorTest(true);
    this.camera.layers.set(targetLayer);

    const vector = new THREE.Vector3();
    const canvasWidth = this.isViewport
      ? window.innerWidth + this.overscan * 2
      : this.targetRect.width;
    const canvasHeight = this.isViewport
      ? window.innerHeight + this.overscan * 2
      : this.targetRect.height;

    const pixelRatio = this.renderer.getPixelRatio();

    for (const traveler of travelers) {
      vector.setFromMatrixPosition(traveler.matrixWorld);
      vector.project(this.camera);

      const centerX = ((vector.x + 1) / 2) * canvasWidth;
      const centerY = ((vector.y + 1) / 2) * canvasHeight;

      let clipDiff = 0;
      let clipRadito = 1;
      if (typeof this.clipArea === "number") {
        clipRadito = this.clipArea;
      } else if (this.clipArea.endsWith("%")) {
        clipRadito = parseFloat(this.clipArea) / 100;
      } else if (this.clipArea.endsWith("px")) {
        clipDiff = parseFloat(this.clipArea);
      }

      const width = traveler.scale.x * clipRadito + 0.5;
      const height = traveler.scale.y * clipRadito + 0.5;

      const localX = centerX - width / 2;
      const localY = centerY - height / 2;

      const scissorX = (localX * this.qualityFactor - clipDiff) / pixelRatio;
      const scissorY = (localY * this.qualityFactor - clipDiff) / pixelRatio;
      const scissorW = (width * this.qualityFactor + clipDiff * 2) / pixelRatio;
      const scissorH =
        (height * this.qualityFactor + clipDiff * 2) / pixelRatio;

      this.renderer.setScissor(scissorX, scissorY, scissorW, scissorH);
      this.renderer.render(this.scene, this.camera);
    }
    this.renderer.setScissorTest(false);
    this.renderer.autoClear = true;
    this.renderer.setRenderTarget(null);
    this.camera.layers.set(this.getSceneLayer());
    this.renderer.setClearColor(oldClearColor, oldClearAlpha);
  }

  public render() {
    for (let i = 0; i < ATTR_TRAVEL.MAX_LAYERS; i++) {
      const currentLayer = i + 1;

      this.captureRenderTarget(
        this.travelersByLayer[i],
        THREE_LAYERS.getCaptureLayer(currentLayer),
        this.renderTargets[i],
      );
    }

    const gl = this.renderer.getContext();
    const pixelRatio = this.renderer.getPixelRatio();
    const canvasHeight = this.renderer.domElement.height / pixelRatio;
    const canvasEl = this.renderer.domElement;
    const canvasTop = canvasEl.getBoundingClientRect().top;
    const canvasLeft = canvasEl.getBoundingClientRect().left;

    // Assign per-mesh onBeforeRender / onAfterRender to handle scissor
    this.scene.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const scissorRect = mesh.userData?.scissorRect as
        | { x: number; y: number; width: number; height: number }
        | undefined;

      if (scissorRect && scissorRect.width > 0 && scissorRect.height > 0) {
        // Convert viewport CSS coords → WebGL bottom-left pixel coords
        const sx = Math.floor((scissorRect.x - canvasLeft) * pixelRatio);
        const sy = Math.floor(
          (canvasHeight - (scissorRect.y - canvasTop + scissorRect.height)) *
            pixelRatio,
        );
        const sw = Math.ceil(scissorRect.width * pixelRatio);
        const sh = Math.ceil(scissorRect.height * pixelRatio);

        mesh.onBeforeRender = () => {
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(sx, sy, sw, sh);
        };
        mesh.onAfterRender = () => {
          gl.disable(gl.SCISSOR_TEST);
        };
      } else {
        // Clear hooks if no clipping needed
        if (mesh.onBeforeRender && (mesh as any).__hasScissorHook) {
          mesh.onBeforeRender = () => {};
          mesh.onAfterRender = () => {};
          (mesh as any).__hasScissorHook = false;
        }
      }

      if (scissorRect) {
        (mesh as any).__hasScissorHook = true;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  public syncMeshesByDOM() {
    // If not in viewport mode, we must account for page scroll in absolute positions.
    const targetPageX = this.targetRect.left + window.scrollX;
    const targetPageY = this.targetRect.top + window.scrollY;

    const pixelRatio = this.renderer.getPixelRatio();
    const canvasWidth = this.renderer.domElement.width / pixelRatio;
    const canvasHeight = this.renderer.domElement.height / pixelRatio;

    this.scene.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.userData || !mesh.userData.domElement) return;

      const element = mesh.userData.domElement as HTMLElement;
      if (!element.isConnected) return;
      let rect: DOMRect;
      if (element.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        range.selectNode(element);
        rect = range.getBoundingClientRect();
      } else {
        rect = element.getBoundingClientRect();
      }
      const cached = mesh.userData.domRect;

      // Update if position or size changed by more than 0.5px
      if (
        !cached ||
        Math.abs(rect.x - cached.x) > 0.5 ||
        Math.abs(rect.y - cached.y) > 0.5 ||
        Math.abs(rect.width - cached.width) > 0.5 ||
        Math.abs(rect.height - cached.height) > 0.5
      ) {
        mesh.userData.domRect = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };

        // Compute scissorRect from clipElements (overflow:hidden ancestors)
        const clipEls = mesh.userData.clipElements as HTMLElement[] | undefined;
        if (clipEls && clipEls.length > 0) {
          let clipLeft = -Infinity;
          let clipTop = -Infinity;
          let clipRight = Infinity;
          let clipBottom = Infinity;
          for (const clipEl of clipEls) {
            const cr = clipEl.getBoundingClientRect();
            clipLeft = Math.max(clipLeft, cr.left);
            clipTop = Math.max(clipTop, cr.top);
            clipRight = Math.min(clipRight, cr.right);
            clipBottom = Math.min(clipBottom, cr.bottom);
          }
          // Intersect with the mesh's own rect to avoid scissoring larger than the mesh
          mesh.userData.scissorRect = {
            x: clipLeft,
            y: clipTop,
            width: Math.max(0, clipRight - clipLeft),
            height: Math.max(0, clipBottom - clipTop),
          };
        } else {
          mesh.userData.scissorRect = undefined;
        }

        let baseX: number, baseY: number;
        if (this.isViewport) {
          baseX = rect.x - window.innerWidth / 2 + rect.width / 2;
          baseY = -rect.y + window.innerHeight / 2 - rect.height / 2;
        } else {
          const localX = rect.x - targetPageX;
          const localY = rect.y - targetPageY;
          baseX = localX - canvasWidth / 2 + rect.width / 2;
          baseY = -localY + canvasHeight / 2 - rect.height / 2;
        }

        // Apply new position and scale
        mesh.position.setX(baseX);
        mesh.position.setY(baseY);
        let pad = (mesh.material as THREE.ShaderMaterial).userData?.shadowPadding || 0;
        mesh.scale.set(rect.width + pad * 2, rect.height + pad * 2, 1);
        mesh.updateMatrixWorld();

        // Update uniforms so shader-based drawing (like border-radius) doesn't stretch
        if (mesh.material instanceof THREE.ShaderMaterial) {
          Painter.forceUpdateUniforms(mesh.material, {
            width: rect.width,
            height: rect.height,
          });
        }

        // Update native mesh if exists
        if (mesh.userData.nativeMesh) {
          const nativeMesh = mesh.userData.nativeMesh as THREE.Mesh;
          let nScaleX = rect.width;
          let nScaleY = rect.height;
          let nPosX = baseX;
          let nPosY = baseY;

          if (mesh.userData.nativeTransform) {
            const transformStr = mesh.userData.nativeTransform as string;
            
            const scaleMatch = transformStr.match(/scale\(([\d.]+%?)\)/);
            if (scaleMatch) {
              let scaleVal = parseFloat(scaleMatch[1]);
              if (scaleMatch[1].includes("%")) scaleVal /= 100;
              nScaleX *= scaleVal;
              nScaleY *= scaleVal;
            }

            const scaleXMatch = transformStr.match(/scaleX\(([\d.]+%?)\)/);
            if (scaleXMatch) {
              let scaleVal = parseFloat(scaleXMatch[1]);
              if (scaleXMatch[1].includes("%")) scaleVal /= 100;
              nScaleX *= scaleVal;
            }

            const scaleYMatch = transformStr.match(/scaleY\(([\d.]+%?)\)/);
            if (scaleYMatch) {
              let scaleVal = parseFloat(scaleYMatch[1]);
              if (scaleYMatch[1].includes("%")) scaleVal /= 100;
              nScaleY *= scaleVal;
            }

            const translateMatch = transformStr.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (translateMatch) {
              const txStr = translateMatch[1].trim();
              const tyStr = translateMatch[2].trim();
              
              let tx = parseFloat(txStr);
              if (txStr.includes("%")) tx = (tx / 100) * rect.width;
              
              let ty = parseFloat(tyStr);
              if (tyStr.includes("%")) ty = (ty / 100) * rect.height;
              
              nPosX += tx;
              nPosY -= ty;
            }

            const translateXMatch = transformStr.match(/translateX\(([^)]+)\)/);
            if (translateXMatch) {
              const txStr = translateXMatch[1].trim();
              let tx = parseFloat(txStr);
              if (txStr.includes("%")) tx = (tx / 100) * rect.width;
              nPosX += tx;
            }

            const translateYMatch = transformStr.match(/translateY\(([^)]+)\)/);
            if (translateYMatch) {
              const tyStr = translateYMatch[1].trim();
              let ty = parseFloat(tyStr);
              if (tyStr.includes("%")) ty = (ty / 100) * rect.height;
              nPosY -= ty;
            }
          }

          let nPad = (nativeMesh.material as THREE.ShaderMaterial).userData?.shadowPadding || 0;
          nativeMesh.position.setX(nPosX);
          nativeMesh.position.setY(nPosY);
          nativeMesh.scale.set(nScaleX + nPad * 2, nScaleY + nPad * 2, 1);
          nativeMesh.updateMatrixWorld();

          // Update uniforms so native shader-based drawing doesn't stretch
          if (nativeMesh.material instanceof THREE.ShaderMaterial) {
            Painter.forceUpdateUniforms(nativeMesh.material, {
              width: nScaleX,
              height: nScaleY,
            });
          }
        }
      }
    });
  }
}
