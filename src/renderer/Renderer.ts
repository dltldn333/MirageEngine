import * as THREE from "three";
import { SceneNode } from "../types";

export class Renderer {
  public readonly canvas: HTMLCanvasElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private renderOrder: number = 0;

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

  private clearScene() {
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }

  private buildScene(graphNode: SceneNode) {
    if (graphNode.type === "BOX") {
      const geometry = new THREE.PlaneGeometry(
        graphNode.rect.width,
        graphNode.rect.height
      );

      const rawColor = graphNode.styles.backgroundColor;
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
      const finalOpacity = graphNode.styles.opacity * alphaFromColor;

      const material = new THREE.MeshBasicMaterial({
        color: safeColor,
        opacity: finalOpacity,
        transparent: finalOpacity < 1,
      });

      const mesh = new THREE.Mesh(geometry, material);

      const canvasWidth = this.renderer.domElement.width;
      const canvasHeight = this.renderer.domElement.height;

      const Z_MICRO_OFFSET = 0.001;
      this.renderOrder++;

      mesh.position.set(
        graphNode.rect.x - canvasWidth / 2 + graphNode.rect.width / 2,
        -graphNode.rect.y + canvasHeight / 2 - graphNode.rect.height / 2,
        graphNode.styles.zIndex + this.renderOrder * Z_MICRO_OFFSET
      );

      this.scene.add(mesh);

      for (const child of graphNode.children) {
        this.buildScene(child);
      }
    }
  }

  public syncScene(graphNode: SceneNode) {
    this.clearScene();
    this.renderOrder = 0;

    this.buildScene(graphNode);
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }
}
