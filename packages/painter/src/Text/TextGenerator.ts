import * as THREE from "three";
import { TextStyles } from "../types";
import { FontMetricsManager } from "./FontMetricsManager";

export class TextGenerator extends THREE.MeshBasicMaterial {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private qualityFactor: number;

  constructor(text: string, styles: TextStyles, rectWidth: number, rectHeight: number, qualityFactor: number = 2) {
    super({
      transparent: true,
      side: THREE.FrontSide,
      color: 0xffffff,
    });

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;

    if (!this.ctx) {
      throw new Error("[Mirage] Failed to create canvas context");
    }

    this.qualityFactor = qualityFactor;

    this.map = new THREE.CanvasTexture(this.canvas);
    this.map.colorSpace = THREE.LinearSRGBColorSpace;
    this.map.minFilter = THREE.LinearFilter;
    this.map.magFilter = THREE.LinearFilter;

    this.updateText(text, styles, rectWidth, rectHeight);
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const forcedLines = text.split("\n");
    const resultLines: string[] = [];

    forcedLines.forEach((line) => {
      const words = line.match(/[^\s\-]+\-?|\-|\s+/g) || [];

      if (words.length === 0) {
        resultLines.push("");
        return;
      }

      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = this.ctx.measureText(currentLine + word).width;

        if (width <= maxWidth + 2) {
          currentLine += word;
        } else {
          if (currentLine) resultLines.push(currentLine);
          currentLine = word.trimStart();
        }
      }

      if (currentLine) {
        resultLines.push(currentLine);
      }
    });

    return resultLines;
  }

  public updateText(text: string, styles: TextStyles, rectWidth: number, rectHeight: number, qualityFactor?: number) {
    if (qualityFactor !== undefined) {
      this.qualityFactor = qualityFactor;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    const scale = pixelRatio * this.qualityFactor;

    const newCanvasWidth = rectWidth * scale;
    const newCanvasHeight = rectHeight * scale;

    if (this.canvas.width !== newCanvasWidth || this.canvas.height !== newCanvasHeight) {
      this.canvas.width = newCanvasWidth;
      this.canvas.height = newCanvasHeight;
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Reset transform and apply scale
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);

    this.ctx.font = styles.font;
    this.ctx.fillStyle = styles.color;
    this.ctx.textBaseline = "alphabetic";
    this.ctx.globalAlpha = 1;

    const lines = this.wrapText(text, rectWidth);
    const lineHeight = styles.lineHeight;
    const baseline = FontMetricsManager.getBaseline(styles.font);

    lines.forEach((line, index) => {
      const y = index * lineHeight + baseline;

      let x = 0;
      if (styles.textAlign === "center") {
        x = rectWidth / 2;
      } else if (styles.textAlign === "right") {
        x = rectWidth;
      }
      this.ctx.textAlign = styles.textAlign as CanvasTextAlign;
      this.ctx.fillText(line, x, y);
    });

    if (this.map) {
      this.map.needsUpdate = true;
    }
  }

  public dispose() {
    if (this.map) {
      this.map.dispose();
    }
    super.dispose();
  }
}
