import { StyleData } from "../types";
import { MeshRegistry } from "../store/MeshRegistry";
import { Painter } from "@mirage-engine/Painter";
import * as THREE from "three";

export function animateMeshByData(
  registry: MeshRegistry,
  data: Map<HTMLElement, StyleData>,
) {
  if (data.size === 0) return;
  data.forEach((styleData, element) => {
    const mesh = registry.get(element);
    if (!mesh) return;
    if (mesh.userData.basePosition) {
      const baseX = mesh.userData.basePosition.x;
      const baseY = mesh.userData.basePosition.y;
      if (styleData.x !== undefined)
        mesh.position.setX(baseX + styleData.x / 1);
      if (styleData.y !== undefined) mesh.position.setY(baseY - styleData.y);
    }
    // Painter.update(
    //   mesh.material as THREE.Material,
    //   "BOX",
    //   styleData.styles,
    //   "",
    //   node.rect.width,
    //   node.rect.height,
    //   this.qualityFactor,
    //   node.isTraveler ? this.renderTarget?.texture : undefined,
    // );
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
