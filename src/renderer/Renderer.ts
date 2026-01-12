import * as THREE from "three";
import {
  SceneNode,
  DIRTY_CONTENT,
  TextQuality,
  MirageConfig,
  MirageMode,
} from "../types";
import { createTextTexture } from "./utils/TextGenerator";

export class Renderer {
  public readonly canvas: HTMLCanvasElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private renderOrder: number = 0;
  private textQualityFactor: number = 2;
  private mode: MirageMode = "overlay";

  private meshMap: Map<HTMLElement, THREE.Mesh> = new Map();

  constructor(target: HTMLElement, config: MirageConfig) {
    this.canvas = document.createElement("canvas");
    this.scene = new THREE.Scene();

    const width = window.innerWidth;
    const height = window.innerHeight;

    // target duplicate mode
    // const width = target.parentElement!.clientWidth;
    // const height = target.parentElement!.clientHeight;

    this.camera = new THREE.OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      1,
      1000
    );
    this.camera.position.z = 100;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);

    this.mode = config.mode ?? "overlay";

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

  public mount(parent: HTMLElement) {
    parent.appendChild(this.canvas);

    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "9999";

    if (this.mode === "overlay") {
      this.canvas.style.pointerEvents = "none";
    } else {
      this.canvas.style.pointerEvents = "auto";
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
    this.renderOrder = 0;

    const activeElements = new Set<HTMLElement>();

    this.reconcileNode(graphNode, activeElements);

    for (const [el, mesh] of this.meshMap.entries()) {
      if (!activeElements.has(el)) {
        this.scene.remove(mesh);

        // Garbage Collection
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
      const material = new THREE.MeshBasicMaterial({ transparent: true });
      mesh = new THREE.Mesh(geometry, material);
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
      (c) => c.name === "TEXT_CHILD"
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

      const texture = createTextTexture(
        node.textContent || "",
        node.textStyles!,
        node.rect.width,
        node.rect.height,
        this.textQualityFactor
      );

      const textGeo = new THREE.PlaneGeometry(1, 1);
      const textMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.FrontSide,
        color: 0xffffff,
      });

      textMesh = new THREE.Mesh(textGeo, textMat);
      textMesh.name = "TEXT_CHILD";
      textMesh.userData = { styleHash: currentStyleHash };

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

    mesh.position.set(
      rect.x - canvasWidth / 2 + rect.width / 2,
      -rect.y + canvasHeight / 2 - rect.height / 2,
      styles.zIndex + this.renderOrder * Z_MICRO_OFFSET
    );

    const material = mesh.material as THREE.MeshBasicMaterial;
    const rawColor = styles.backgroundColor;
    let safeColor = rawColor;
    let alphaFromColor = 1.0;

    if (rawColor === "transparent" || rawColor === "rgba(0, 0, 0, 0)") {
      safeColor = "#ffffff";
      alphaFromColor = 0.0;
    } else if (rawColor.startsWith("rgba")) {
      const rgba = rawColor.match(/[\d.]+/g);
      if (rgba && rgba.length >= 4) {
        const r = rgba[0];
        const g = rgba[1];
        const b = rgba[2];
        alphaFromColor = parseFloat(rgba[3]);
        safeColor = `rgb(${r}, ${g}, ${b})`;
      }
    }

    const finalOpacity = styles.opacity * alphaFromColor;

    material.color.set(safeColor);
    material.opacity = finalOpacity;
    material.transparent = finalOpacity < 1;
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }
}
