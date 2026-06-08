import { StyleData } from "../types";
import { MeshRegistry } from "../store/MeshRegistry";
import { Painter } from "@mirage-engine/painter";
import * as THREE from "three";
// src/animation/Animator.ts
export function animateMeshByData(
  registry: MeshRegistry,
  data: Map<HTMLElement, StyleData>,
) {
  if (data.size === 0) return;

  data.forEach((styleData, element) => {
    const mesh = registry.get(element);
    if (!mesh || !mesh.userData.basePosition) return;

    let { x: baseX, y: baseY } = mesh.userData.basePosition;
    const { width: baseW, height: baseH } = mesh.userData.baseSize;

    const currentW = styleData.width ?? baseW;
    const currentH = styleData.height ?? baseH;
    const widthDiff = currentW - baseW;
    const heightDiff = currentH - baseH;

    if (
      styleData.width !== undefined &&
      mesh.userData.originRatioX === undefined
    ) {
      if (Math.abs(widthDiff) > 0.5) {
        const rect = element.getBoundingClientRect();

        const tx = styleData.x ?? 0;
        const pureX = rect.x - tx;
        const deltaX = pureX - mesh.userData.baseDOM.x;

        mesh.userData.originRatioX = -deltaX / widthDiff;
      } else {
        mesh.userData.originRatioX = 0.5;
      }
    }


    const ratioX = mesh.userData.originRatioX ?? 0.5;


    const adjustedBaseX = baseX + widthDiff * (0.5 - ratioX);
    const adjustedBaseY = baseY + heightDiff 

    mesh.position.setX(adjustedBaseX + (styleData.x ?? 0));
    mesh.position.setY(baseY - (styleData.y ?? 0)); 
    mesh.scale.set(currentW, currentH, 1);

    Painter.forceUpdateUniforms(mesh.material as THREE.ShaderMaterial, {
      backgroundColor: styleData.backgroundColor,
      opacity: styleData.opacity,
      borderRadius: styleData.borderRadius,
      width: currentW,
      height: currentH,
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
