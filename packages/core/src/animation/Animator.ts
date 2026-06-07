import { StyleData } from "../types";
import { MeshRegistry } from "../store/MeshRegistry";
import { Painter } from "@mirage-engine/painter";
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

    // mesh.scale.set(
    //   !styleData.width ? 1 : styleData.width,
    //   !styleData.height ? 1 : styleData.height,
    //   1,
    // );

    Painter.forceUpdateUniforms(mesh.material as THREE.ShaderMaterial, {
      backgroundColor: styleData.backgroundColor,
      opacity: styleData.opacity,
      borderRadius: styleData.borderRadius,
      width: styleData.width,
      height: styleData.height,
    });
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

  if (style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)") {
    const color = new THREE.Color(style.backgroundColor);
    styleObject.backgroundColor = [color.r, color.g, color.b];
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

    // [TODO] direct matrix data pipeline to webGL
    // styleObject.matrix = matrix.toFloat32Array();
  }

  return styleObject;
}
