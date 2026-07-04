import { StyleData } from "./types";

function parseColor(color: string) {
  // basic rgb/rgba parser since we don't have painter's parseColor here
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1]) / 255,
      g: parseInt(match[2]) / 255,
      b: parseInt(match[3]) / 255,
    };
  }
  return { r: 1, g: 1, b: 1 };
}

export function extractFromStyle(style: CSSStyleDeclaration): StyleData {
  const styleObject: StyleData = {};

  if (style.opacity) {
    styleObject.opacity = parseFloat(style.opacity);
  }

  if (style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)") {
    const parsed = parseColor(style.backgroundColor);
    styleObject.backgroundColor = [parsed.r, parsed.g, parsed.b];
  }

  if (style.backgroundImage) {
    styleObject.backgroundImage = style.backgroundImage;
  } else if (style.background) {
    styleObject.backgroundImage = style.background;
  }

  if (style.borderRadius) {
    styleObject.borderRadius = parseFloat(style.borderRadius);
  }
  if (style.width) {
    styleObject.width = parseFloat(style.width);
  }
  if (style.height) {
    styleObject.height = parseFloat(style.height);
  }
  if (style.transform && style.transform !== "none") {
    const matrix = new DOMMatrix(style.transform);

    styleObject.x = matrix.m41;
    styleObject.y = matrix.m42;
    styleObject.z = matrix.m43;
  }

  return styleObject;
}
