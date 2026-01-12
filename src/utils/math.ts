/**
 * Converts DOM coordinates (Top-Left 0,0) to WebGL coordinates (Center 0,0).
 * @param x - The x coordinate of the DOM element (Left)
 * @param y - The y coordinate of the DOM element (Top)
 * @param width - The width of the DOM element
 * @param height - The height of the DOM element
 * @param canvasWidth - The total width of the canvas
 * @param canvasHeight - The total height of the canvas
 */

export function domToWebGL(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const xGL = x - canvasWidth / 2 + width / 2;
  const yGL = -(y - canvasHeight / 2 + height / 2);
  
  return { x: xGL, y: yGL };
}