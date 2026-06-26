import * as THREE from "three";
import { TextStyles } from "./types";
import { FontMetricsManager } from "./tools/FontMetricsManager";

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const forcedLines = text.split("\n");
  const resultLines: string[] = [];

  forcedLines.forEach((line) => {
    const words = line.split(" ");
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;

      if (width <= maxWidth + 2) {
        currentLine += " " + word;
      } else {
        resultLines.push(currentLine);
        currentLine = word;
      }
    }
    resultLines.push(currentLine);
  });

  return resultLines;
}

export function createTextTexture(
  text: string,
  styles: TextStyles,
  rectWidth: number,
  rectHeight: number,
  qualityFactor: number = 2,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("[Mirage] Failed to create canvas context");
  }
  // text Quality

  const pixelRatio = window.devicePixelRatio || 1;
  const scale = pixelRatio * qualityFactor;

  canvas.width = rectWidth * scale;
  canvas.height = rectHeight * scale;
  ctx.scale(scale, scale);

  ctx.font = styles.font;
  ctx.fillStyle = styles.color;
  ctx.textBaseline = "alphabetic";

  ctx.globalAlpha = 1;

  console.log(text, styles.font);

  const lines = wrapText(ctx, text, rectWidth);
  const lineHeight = styles.lineHeight;
  const fontSize = parseFloat(styles.fontSize);

  const baseline = FontMetricsManager.getBaseline(styles.font);

  console.log("lineHeight : ", lineHeight);
  console.log("fontSize : ", fontSize);

  lines.forEach((line, index) => {
    const y = index * lineHeight + baseline;

    let x = 0;
    if (styles.textAlign === "center") {
      x = rectWidth / 2;
    } else if (styles.textAlign === "right") {
      x = rectWidth;
    }
    ctx.textAlign = styles.textAlign as CanvasTextAlign;
    // ctx.letterSpacing = `${styles.letterSpacing}px`;

    ctx.fillText(line, x, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}
