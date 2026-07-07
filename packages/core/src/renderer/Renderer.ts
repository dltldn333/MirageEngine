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
import { Painter } from "@mirage-engine/painter";
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
  private clipArea: travelerClipArea = 1;
  public targetLayer: number | LayerTarget = "base";

  private target: HTMLElement;
  private mountContainer: HTMLElement;
  private registry: MeshRegistry;
  private targetRect: DOMRect;
  private nativeMaterialMeshes: Set<THREE.Mesh> = new Set();

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

    this.textureManager = new TextureLifecycleManager((el, texture) => {
      const mesh = this.registry.get(el);
      if (mesh && mesh.material instanceof THREE.ShaderMaterial) {
        Painter.forceUpdateUniforms(mesh.material, { texture: texture });
      }
    });

    this.mode = config.mode ?? "overlay";
    this.clipArea = config.travelerClipArea ?? 1;
    this.targetLayer = config.layer ?? "base";
    this.canvas = document.createElement("canvas");
    this.scene = new THREE.Scene();

    this.targetRect = this.target.getBoundingClientRect();
    const width = this.targetRect.width;
    const height = this.targetRect.height;

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
      this.renderTargets.push(
        new THREE.WebGLRenderTarget(
          this.targetRect.width * this.qualityFactor,
          this.targetRect.height * this.qualityFactor,
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
    this.canvas.style.width = `${this.targetRect.width}px`;
    this.canvas.style.height = `${this.targetRect.height}px`;

    if (this.mode === "duplicate") {
      this.canvas.style.position = "";
      this.canvas.style.top = "";
      this.canvas.style.left = "";
      this.canvas.style.display = "block";
    } else {
      this.canvas.style.position = "absolute";
      this.canvas.style.top = `${this.target.offsetTop}px`;
      this.canvas.style.left = `${this.target.offsetLeft}px`;
      this.canvas.style.display = "block";
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

    const isResized =
      Math.abs(newRect.width - this.targetRect.width) > 0.1 ||
      Math.abs(newRect.height - this.targetRect.height) > 0.1;

    const isMoved =
      this.mode === "overlay" &&
      (Math.abs(newRect.top - this.targetRect.top) > 0.1 ||
        Math.abs(newRect.left - this.targetRect.left) > 0.1);

    if (isResized) {
      this.targetRect = newRect;
      this.setSize(this.targetRect.width, this.targetRect.height);

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
          if (meshToDestroy.userData.nativeMaterial) {
            if (Array.isArray(meshToDestroy.userData.nativeMaterial)) {
              meshToDestroy.userData.nativeMaterial.forEach((mat: THREE.Material) => mat.dispose());
            } else {
              meshToDestroy.userData.nativeMaterial.dispose();
            }
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
          this.nativeMaterialMeshes.delete(meshToDestroy);
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
    }

    if (node.nativeStyles && node.nativeLayer !== undefined) {
      const initialTexture = node.isTraveler
        ? this.renderTargets[node.captureLayer - 2]?.texture
        : this.textureManager.get(node.element);

      if (!mesh.userData.nativeMaterial) {
        mesh.userData.nativeMaterial = Painter.create(
          "BOX",
          node.nativeStyles!,
          "",
          node.rect.width,
          node.rect.height,
          this.qualityFactor,
          initialTexture,
          node.shaderHooks,
        );
      }
      mesh.userData.nativeLayer = node.nativeLayer;
      this.nativeMaterialMeshes.add(mesh);
    } else if (mesh.userData.nativeMaterial) {
      if (Array.isArray(mesh.userData.nativeMaterial)) {
        mesh.userData.nativeMaterial.forEach((m: THREE.Material) => m.dispose());
      } else {
        mesh.userData.nativeMaterial.dispose();
      }
      mesh.userData.nativeMaterial = undefined;
      mesh.userData.nativeLayer = undefined;
      this.nativeMaterialMeshes.delete(mesh);
    }

    // [Important] use whene mesh animating with js
    mesh.userData.domRect = node.rect;

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
      this.reconcileTextChild(mesh, node);
    }
  }

  private reconcileTextChild(parentMesh: THREE.Mesh, node: SceneNode) {
    const lines = node.textLines || [
      { text: node.textContent || "", rect: node.rect },
    ];
    const currentStyleHash =
      JSON.stringify(node.textStyles) +
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
          node.textStyles!,
          line.text,
          line.rect.width,
          line.rect.height,
          this.qualityFactor,
        );

        const geometry = new THREE.PlaneGeometry(1, 1);
        const textMesh = new THREE.Mesh(geometry, material);

        textMesh.name = `TEXT_CHILD_${index}`;
        this.updateMeshLayers(textMesh, node);

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
  }

  private updateMeshProperties(mesh: THREE.Mesh, node: SceneNode) {
    const { rect, styles } = node;

    const pixelRatio = this.renderer.getPixelRatio();
    const canvasWidth = this.renderer.domElement.width / pixelRatio;
    const canvasHeight = this.renderer.domElement.height / pixelRatio;

    mesh.scale.set(rect.width, rect.height, 1);

    const Z_MICRO_OFFSET = 0.001;
    this.renderOrder++;

    const targetPageX = this.targetRect.left + window.scrollX;
    const targetPageY = this.targetRect.top + window.scrollY;

    const localX = rect.x - targetPageX;
    const localY = rect.y - targetPageY;

    const baseX = localX - canvasWidth / 2 + rect.width / 2;
    const baseY = -localY + canvasHeight / 2 - rect.height / 2;

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
    if (mesh.userData.baseMaterial) {
      Painter.update(
        mesh.userData.baseMaterial,
        "BOX",
        node.styles,
        "",
        node.rect.width,
        node.rect.height,
        this.qualityFactor,
        node.isTraveler
          ? this.renderTargets[node.captureLayer - 2]?.texture
          : this.textureManager.get(node.element),
      );
    }
    
    if (mesh.userData.nativeMaterial) {
      Painter.update(
        mesh.userData.nativeMaterial,
        "BOX",
        node.nativeStyles!,
        "",
        node.rect.width,
        node.rect.height,
        this.qualityFactor,
        node.isTraveler
          ? this.renderTargets[node.captureLayer - 2]?.texture
          : this.textureManager.get(node.element),
      );
    }
  }

  private updateMeshLayers(mesh: THREE.Mesh, node: SceneNode) {
    const layerNum =
      node.visibility & USER_LAYER ? THREE_LAYERS.BASE : THREE_LAYERS.HIDDEN;
    mesh.layers.set(layerNum);

    if (node.visibility & SELECT_LAYER) {
      mesh.layers.enable(THREE_LAYERS.SELECTED);
    }

    if (node.visibility & USER_LAYER) {
      for (let i = node.captureLayer; i <= ATTR_TRAVEL.MAX_LAYERS + 1; i++) {
        mesh.layers.enable(THREE_LAYERS.getCaptureLayer(i));
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
    const canvasWidth = this.targetRect.width;
    const canvasHeight = this.targetRect.height;

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
    for (const mesh of this.nativeMaterialMeshes) {
      mesh.material = mesh.userData.baseMaterial;
    }

    for (let i = 0; i < ATTR_TRAVEL.MAX_LAYERS; i++) {
      const currentLayer = i + 1;
      for (const mesh of this.nativeMaterialMeshes) {
        if (currentLayer >= mesh.userData.nativeLayer) {
          mesh.material = mesh.userData.nativeMaterial;
        } else {
          mesh.material = mesh.userData.baseMaterial;
        }
      }

      this.captureRenderTarget(
        this.travelersByLayer[i],
        THREE_LAYERS.getCaptureLayer(currentLayer),
        this.renderTargets[i],
      );
    }

    for (const mesh of this.nativeMaterialMeshes) {
      mesh.material = mesh.userData.baseMaterial;
    }

    this.renderer.render(this.scene, this.camera);
  }

  
}
