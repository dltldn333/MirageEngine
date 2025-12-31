// src/renderer/DomProjector.ts
// Placeholder: utilities to convert DOM coords to WebGL coords

export function domToWebGL(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
) {
  return {
    x: x - canvasWidth / 2,
    y: -y + canvasHeight / 2,
  };
}
