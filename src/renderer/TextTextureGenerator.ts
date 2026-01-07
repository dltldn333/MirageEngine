import * as THREE from "three";
import { TextStyles } from "../types";

export function createTextTexture(
  text: string,
  styles: TextStyles,
  rectWidth: number,
  rectHeight: number
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("[Mirage] Failed to create canvas context");
  }
  // text Quality
  const superSampleFactor = 2;
  const scale = (window.devicePixelRatio || 2) * superSampleFactor;

  canvas.width = rectWidth * scale;
  canvas.height = rectHeight * scale;
  ctx.scale(scale, scale);

  ctx.font = styles.font;
  ctx.fillStyle = styles.color;

  ctx.textAlign = styles.textAlign;
  ctx.direction = styles.direction;

  ctx.textBaseline = "middle";

  let x = 0;
  if (styles.textAlign === "center") x = rectWidth / 2;
  if (styles.textAlign === "right") x = rectWidth;

  const y = rectHeight / 2;

  ctx.fillText(text, x, y);

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}
