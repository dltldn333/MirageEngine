import { StyleData } from "./types";

function parseColor(color: string) {
  // basic rgb/rgba parser since we don't have painter's parseColor here
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return {
      r: parseInt(match[1]) / 255,
      g: parseInt(match[2]) / 255,
      b: parseInt(match[3]) / 255,
      a: match[4] !== undefined ? parseFloat(match[4]) : 1,
    };
  }
  return { r: 1, g: 1, b: 1, a: 1 };
}

export function extractFromStyle(style: CSSStyleDeclaration): StyleData {
  const styleObject: StyleData = {};

  if (style.opacity) {
    styleObject.opacity = parseFloat(style.opacity);
  }

  if (style.backgroundColor) {
    const parsed = parseColor(style.backgroundColor);
    styleObject.backgroundColor = [parsed.r, parsed.g, parsed.b, parsed.a];
  }

  if (style.backgroundImage) {
    styleObject.backgroundImage = style.backgroundImage;
  } else if (style.background) {
    styleObject.backgroundImage = style.background;
  }

  if (style.boxShadow) {
    styleObject.boxShadow = style.boxShadow;
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

    styleObject.scaleX = Math.sqrt(matrix.m11 * matrix.m11 + matrix.m12 * matrix.m12 + matrix.m13 * matrix.m13);
    styleObject.scaleY = Math.sqrt(matrix.m21 * matrix.m21 + matrix.m22 * matrix.m22 + matrix.m23 * matrix.m23);
    styleObject.scaleZ = Math.sqrt(matrix.m31 * matrix.m31 + matrix.m32 * matrix.m32 + matrix.m33 * matrix.m33);
  }

  if (style.left || style.right || style.top || style.bottom || style.margin || style.marginLeft || style.marginTop || style.marginRight || style.marginBottom || style.padding || style.paddingLeft || style.paddingTop || style.paddingRight || style.paddingBottom) {
    styleObject.layoutChanged = true;
  }

  return styleObject;
}
