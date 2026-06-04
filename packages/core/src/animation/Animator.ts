import { StyleData } from "../types";

export function animateMeshByData(data: Map<string, any>) {}

export function animateMeshByAttribute(
  target: HTMLElement,
  options: { duration: number; easing?: string },
) {}

export function extractFromStyle(style: CSSStyleDeclaration): StyleData {
  const styleObject: StyleData = {};

    if (style.opacity) {
        styleObject.opacity = parseFloat(style.opacity);
    }

    if (style.transform && style.transform !== 'none') {
        const matrix = new DOMMatrix(style.transform);

        styleObject.x = matrix.m41;
        styleObject.y = matrix.m42;
        styleObject.z = matrix.m43;
        
        // [TODO] direct matrix data pipeline to webGL
        // styleObject.matrix = matrix.toFloat32Array(); 
    }

  return styleObject;
}
