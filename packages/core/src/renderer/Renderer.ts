import * as THREE from "three";
import {
  SceneNode,
  DIRTY_CONTENT,
  Quality,
  CoreConfig,
  MirageMode,
  USER_LAYER,
  SYSTEM_LAYER,
  travelerClipArea,
} from "../types";
import { Painter } from "@mirage-engine/painter";
import { MeshRegistry } from "src/animation/MeshRegistry";

export class Renderer {
  public readonly canvas: HTMLCanvasElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private renderTarget: THREE.WebGLRenderTarget | null = null;
  private renderOrder: number = 0;
  private qualityFactor: number = 2;
  private mode: MirageMode = "overlay";
  private clipArea: travelerClipArea = 1;

  private target: HTMLElement;
  private mountContainer: HTMLElement;
  private targetRect: DOMRect;

  // private meshMap: Map<HTMLElement, THREE.Mesh> = new Map();

  constructor(
    target: HTMLElement,
    config: CoreConfig,
    mountContainer: HTMLElement,
    registry: MeshRegistry
  ) {
    this.target = target;
    this.mountContainer = mountContainer;
    this.mode = config.mode ?? "overlay";
    this.clipArea = config.travelerClipArea ?? 1;
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
    this.camera.layers.set(0);

    // [new]
    // THREE.ColorManagement.enabled = false;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      // [new]
      // premultipliedAlpha: true
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);

    this.applyTextQuality(config.quality ?? "medium");
  }
  public createRenderTarget() {
    this.renderTarget = new THREE.WebGLRenderTarget(
      this.targetRect.width * this.qualityFactor,
      this.targetRect.height * this.qualityFactor,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        stencilBuffer: false,
        depthBuffer: true,
        samples: 4,
      },
    );
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
    // TODO: Scene 내부 Mesh들도 순회하며 dispose
  }

  public setSize(width: number, height: number) {
    this.renderer.setSize(width, height);
    if (this.renderTarget) {
      this.renderTarget.setSize(
        width * this.qualityFactor,
        height * this.qualityFactor,
      );
    }
    this.camera.left = width / -2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = height / -2;
    this.camera.updateProjectionMatrix();
  }

  public syncScene(graphNode: SceneNode) {
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

    const activeElements = new Set<HTMLElement>();

    this.reconcileNode(graphNode, activeElements);

    for (const [el, mesh] of this.meshMap.entries()) {
      if (!activeElements.has(el)) {
        this.scene.remove(mesh);

        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) mesh.material.dispose();
        this.meshMap.delete(el);
      }
    }
  }

  // 탐색 후 완성된 Scene node를 이용하여 mesh를 만들거나 조정
  // => 이 과정에서 scene node에 있는 ele를 넣은 hash => activeElements
  // => 이후 activeElements를 이용하여 mesh를 정리!!!+ map에서도 삭제

  private reconcileNode(node: SceneNode, activeElements: Set<HTMLElement>) {
    activeElements.add(node.element);

    let mesh = this.meshMap.get(node.element);
    if (!mesh) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      let material: THREE.MeshBasicMaterial | THREE.Material;
      material = Painter.create(
        "BOX",
        node.styles,
        "",
        node.rect.width,
        node.rect.height,
        this.qualityFactor,
        node.isTraveler ? this.renderTarget?.texture : undefined,
        node.shaderHooks
      );
      mesh = new THREE.Mesh(geometry, material);
      if (node.type === "TEXT") mesh.name = "BG_MESH";
      this.scene.add(mesh);
      this.meshMap.set(node.element, mesh);
    }

    // [Important] use whene mesh animating with js
    mesh.userData.domRect = node.rect;

    this.updateMeshProperties(mesh, node);
    this.updateMeshLayers(mesh, node);
    if (node.isTraveler) mesh.layers.enable(28);

    if (node.type === "BOX") {
      for (const child of node.children) {
        this.reconcileNode(child, activeElements);
      }
    } else if (node.type === "TEXT") {
      this.reconcileTextChild(mesh, node);
    }
  }

  private reconcileTextChild(parentMesh: THREE.Mesh, node: SceneNode) {
    let textMesh = parentMesh.children.find(
      (c) => c.name === "TEXT_CHILD",
    ) as THREE.Mesh;

    const currentStyleHash = JSON.stringify(node.textStyles);
    const cachedStyleHash = textMesh?.userData?.styleHash;
    const isDirty =
      !textMesh ||
      node.dirtyMask & DIRTY_CONTENT ||
      currentStyleHash !== cachedStyleHash;

    if (isDirty) {
      if (textMesh) {
        (textMesh.material as THREE.MeshBasicMaterial).map?.dispose();
        textMesh.geometry.dispose();
        parentMesh.remove(textMesh);
      }

      const material = Painter.create(
        "TEXT",
        node.textStyles!,
        node.textContent || "",
        node.rect.width,
        node.rect.height,
        this.qualityFactor,
      );

      const geometry = new THREE.PlaneGeometry(1, 1);
      textMesh = new THREE.Mesh(geometry, material);

      textMesh.name = "TEXT_CHILD";
      textMesh.userData = { styleHash: currentStyleHash };
      this.updateMeshLayers(textMesh, node);
      textMesh.position.z = 0.005;
      parentMesh.add(textMesh);
    }

    if (textMesh) {
      const parentRect = parentMesh.userData.domRect;
      const parentCenterX = parentRect.x + parentRect.width / 2;
      const parentCenterY = parentRect.y + parentRect.height / 2;

      const textCenterX = node.rect.x + node.rect.width / 2;
      const textCenterY = node.rect.y + node.rect.height / 2;

      const offsetX = textCenterX - parentCenterX;
      const offsetY = -(textCenterY - parentCenterY);

      textMesh.position.set(offsetX, offsetY, 0.005);
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

    mesh.position.set(
      localX - canvasWidth / 2 + rect.width / 2,
      -localY + canvasHeight / 2 - rect.height / 2,
      styles.zIndex + this.renderOrder * Z_MICRO_OFFSET,
    );
    Painter.update(
      mesh.material as THREE.Material,
      "BOX",
      node.styles,
      "",
      node.rect.width,
      node.rect.height,
      this.qualityFactor,
      node.isTraveler ? this.renderTarget?.texture : undefined,
    );
  }

  private updateMeshLayers(mesh: THREE.Mesh, node: SceneNode) {
    const layerNum = (1 - (node.visibility & USER_LAYER)) * 30;
    mesh.layers.set(layerNum);
    if (node.visibility === (USER_LAYER | SYSTEM_LAYER)) mesh.layers.enable(29);
  }

  private captureRenderTarget() {
    // [Problem] this method called on requestAnimationFrame
    // => this logic travers all meshes every frame, need optimization
    const travelers: THREE.Mesh[] = [];
    for (const mesh of this.meshMap.values()) {
      if ((mesh.layers.mask & (1 << 28)) !== 0) {
        travelers.push(mesh);
      }
    }
    if (travelers.length === 0) return;

    const oldClearColor = new THREE.Color();
    const oldClearAlpha = this.renderer.getClearAlpha();
    this.renderer.getClearColor(oldClearColor);

    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setRenderTarget(this.renderTarget);

    this.renderer.clear();

    this.renderer.autoClear = false;
    this.renderer.setScissorTest(true);
    this.camera.layers.set(29);

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
    this.camera.layers.set(28);
    this.renderer.setClearColor(oldClearColor, oldClearAlpha);
  }

  public render() {
    if (this.renderTarget) this.captureRenderTarget();
    this.renderer.render(this.scene, this.camera);
  }

  // for debugging
  public showScissoredRenderTarget() {
    if (!this.renderTarget) return;

    const w = this.targetRect.width;
    const h = this.targetRect.height;

    const geometry = new THREE.PlaneGeometry(w, h);
    const material = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    const debugMesh = new THREE.Mesh(geometry, material);

    debugMesh.position.set(0, 0, 90);
    debugMesh.layers.set(28);

    this.scene.add(debugMesh);
  }
}
