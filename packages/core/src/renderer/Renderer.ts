import * as THREE from "three";
import {
  SceneNode,
  DIRTY_CONTENT,
  TextQuality,
  CoreConfig,
  MirageMode,
} from "../types";
import { Painter } from "@mirage-engine/painter";

export class Renderer {
  public readonly canvas: HTMLCanvasElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private renderOrder: number = 0;
  private textQualityFactor: number = 2;
  private mode: MirageMode = "overlay";

  private target: HTMLElement;
  private mountContainer: HTMLElement;
  private targetRect: DOMRect;

  private meshMap: Map<HTMLElement, THREE.Mesh> = new Map();

  constructor(
    target: HTMLElement,
    config: CoreConfig,
    mountContainer: HTMLElement,
  ) {
    this.target = target;
    this.mountContainer = mountContainer;

    this.mode = config.mode ?? "overlay";

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

    this.applyTextQuality(config.textQuality ?? "medium");
  }

  private applyTextQuality(quality: TextQuality) {
    if (typeof quality === "number") {
      this.textQualityFactor = Math.max(0.1, quality);
      return;
    }
    switch (quality) {
      case "low":
        this.textQualityFactor = 1;
        break;
      case "high":
        this.textQualityFactor = 4;
        break;
      case "medium":
      default:
        this.textQualityFactor = 2;
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
      this.renderer.setSize(this.targetRect.width, this.targetRect.height);

      this.camera.left = this.targetRect.width / -2;
      this.camera.right = this.targetRect.width / 2;
      this.camera.top = this.targetRect.height / 2;
      this.camera.bottom = this.targetRect.height / -2;
      this.camera.layers.set(0);
      this.camera.updateProjectionMatrix();

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

  private reconcileNode(node: SceneNode, activeElements: Set<HTMLElement>) {
    activeElements.add(node.element);

    let mesh = this.meshMap.get(node.element);
    if (!mesh) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const material = Painter.create(
        "BOX",
        node.styles,
        "",
        node.rect.width,
        node.rect.height,
      );

      mesh = new THREE.Mesh(geometry, material);
      mesh.layers.set(node.visibility);
      if (node.type === "TEXT") mesh.name = "BG_MESH";
      this.scene.add(mesh);
      this.meshMap.set(node.element, mesh);
    }

    mesh.userData.domRect = node.rect;

    this.updateMeshProperties(mesh, node);

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
        this.textQualityFactor,
      );

      const geometry = new THREE.PlaneGeometry(1, 1);
      textMesh = new THREE.Mesh(geometry, material);

      textMesh.name = "TEXT_CHILD";
      textMesh.userData = { styleHash: currentStyleHash };
      textMesh.layers.set(node.visibility);
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
    );
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }
}
