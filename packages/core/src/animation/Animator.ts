import { StyleData } from "../types";
import { MeshRegistry } from "../store/MeshRegistry";

export function animateMeshByData(
  registry: MeshRegistry,
  data: Map<HTMLElement, Object>,
) {
  if (data.size === 0) return;
  data.forEach((styleData, element) => {
    const mesh = registry.get(element);
    if (mesh) {
      mesh.position.setX(styleData.x ?? mesh.position.x);
      mesh.position.setY(styleData.y ?? mesh.position.y);
      mesh.position.setZ(styleData.z ?? mesh.position.z);
    }
  });
}

export function animateMeshByAttribute(
  target: HTMLElement,
  options: { duration: number; easing?: string },
) {}

export function extractFromStyle(style: CSSStyleDeclaration): StyleData {
  const styleObject: StyleData = {};

  if (style.opacity) {
    styleObject.opacity = parseFloat(style.opacity);
  }

  if (style.transform && style.transform !== "none") {
    const matrix = new DOMMatrix(style.transform);

    styleObject.x = matrix.m41;
    styleObject.y = matrix.m42;
    styleObject.z = matrix.m43;

    // [TODO] direct matrix data pipeline to webGL
    // styleObject.matrix = matrix.toFloat32Array();
  }

  return styleObject;
}
