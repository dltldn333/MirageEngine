import * as THREE from "three";
import { SceneNode, DIRTY_CONTENT } from "../types";
import { createTextTexture } from "./TextTextureGenerator";

export class Renderer {
  public readonly canvas: HTMLCanvasElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private renderOrder: number = 0;

  private meshMap: Map<HTMLElement, THREE.Mesh> = new Map();

  constructor() {
    this.canvas = document.createElement("canvas");
    this.scene = new THREE.Scene();

    const width = window.innerWidth;
    const height = window.innerHeight;

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
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.renderer.setSize(width, height);
  }

  public mount(parent: HTMLElement) {
    parent.appendChild(this.canvas);
  }

  public dispose() {
    try {
      this.renderer.dispose();
    } catch (e) {
      // ignore
    }
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
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
    if (node.type === "BOX") {
      activeElements.add(node.element);

      let mesh = this.meshMap.get(node.element);

      if (!mesh) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ transparent: true });
        mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        this.meshMap.set(node.element, mesh);
      }

      this.updateMeshProperties(mesh, node);

      for (const child of node.children) {
        this.reconcileNode(child, activeElements);
      }
    }

    if (node.type === "TEXT") {
      activeElements.add(node.element);

      let mesh = this.meshMap.get(node.element);
      if (!mesh) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({ transparent: true });
        mesh = new THREE.Mesh(geometry, material);
        mesh.name = "BG_MESH";
        this.scene.add(mesh);
        this.meshMap.set(node.element, mesh);
      }

      this.updateMeshProperties(mesh, node);

      let textMesh = mesh.children.find(
        (c) => c.name === "TEXT_CHILD"
      ) as THREE.Mesh;

      const currentStyleHash = JSON.stringify(node.textStyles);
      const cachedStyleHash = textMesh?.userData?.styleHash;

      const isContentDirty = node.dirtyMask & DIRTY_CONTENT;
      const isStyleDirty = currentStyleHash !== cachedStyleHash;

      if (!textMesh || isContentDirty || isStyleDirty) {
        if (textMesh) {
          (textMesh.material as THREE.MeshBasicMaterial).map?.dispose();
          textMesh.geometry.dispose();
          mesh.remove(textMesh);
        }

        const texture = createTextTexture(
          node.textContent || "",
          node.textStyles!,
          node.rect.width,
          node.rect.height
        );

        const textGeo = new THREE.PlaneGeometry(1, 1);
        const textMat = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.FrontSide,
          color: 0xffffff,
          opacity: 1.0,
        });

        textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.name = "TEXT_CHILD";

        textMesh.userData = { styleHash: currentStyleHash };
        textMesh.position.z = 0.005;

        mesh.add(textMesh);
      }
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
