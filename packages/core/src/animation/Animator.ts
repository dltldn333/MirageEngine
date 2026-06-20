import { StyleData } from "../types";
import { MeshRegistry } from "../store/MeshRegistry";
import { Painter, parseColor } from "@mirage-engine/painter";
import * as THREE from "three";

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

    // --- Capture and Lock Transform Origin (Performance & Accuracy) ---
    // We capture the origin on the very first frame of change (> 0.1px) 
    // to ensure perfect sync from the start of the first animation.
    if (
      styleData.width !== undefined &&
      mesh.userData.originRatioX === undefined &&
      Math.abs(widthDiff) > 0.1 
    ) {
      const rect = element.getBoundingClientRect();
      const tx = styleData.x ?? 0;
      const currentPageX = rect.left + window.scrollX - tx;
      const deltaX = currentPageX - mesh.userData.baseDOM.x;
      
      let ratioX = -deltaX / widthDiff;
      if (Math.abs(ratioX) < 0.05) ratioX = 0.0;
      else if (Math.abs(ratioX - 1.0) < 0.05) ratioX = 1.0;
      else if (Math.abs(ratioX - 0.5) < 0.05) ratioX = 0.5;

      mesh.userData.originRatioX = ratioX;
    }

    if (
      styleData.height !== undefined &&
      mesh.userData.originRatioY === undefined &&
      Math.abs(heightDiff) > 0.1
    ) {
      const rect = element.getBoundingClientRect();
      const ty = styleData.y ?? 0;
      const currentPageY = rect.top + window.scrollY - ty;
      const deltaY = currentPageY - mesh.userData.baseDOM.y;
      
      let ratioY = -deltaY / heightDiff;
      if (Math.abs(ratioY) < 0.05) ratioY = 0.0;
      else if (Math.abs(ratioY - 1.0) < 0.05) ratioY = 1.0;
      else if (Math.abs(ratioY - 0.5) < 0.05) ratioY = 0.5;

      mesh.userData.originRatioY = ratioY;
    }

    // --- Calculate Mesh Position using Measured Origin ---
    const ratioX = mesh.userData.originRatioX ?? 0.5;
    const ratioY = mesh.userData.originRatioY ?? 0.5;

    // Since Three.js meshes expand from center, we offset the center based on the locked origin ratio
    const moveX = widthDiff * (0.5 - ratioX);
    const moveY = heightDiff * (0.5 - ratioY);

    mesh.position.setX(baseX + moveX + (styleData.x ?? 0));
    mesh.position.setY(baseY - (moveY + (styleData.y ?? 0)));
    mesh.scale.set(currentW, currentH, 1);

    Painter.forceUpdateUniforms(mesh.material as THREE.ShaderMaterial, {
      backgroundColor: styleData.backgroundColor,
      opacity: styleData.opacity,
      borderRadius: styleData.borderRadius ?? mesh.userData.baseStyles?.borderRadius,
      width: currentW,
      height: currentH,
    });
  });
}
export function animateMeshByAttribute(
  _target: HTMLElement,
  _options: { duration: number; easing?: string },
) {}

export function extractFromStyle(style: CSSStyleDeclaration): StyleData {
  const styleObject: StyleData = {};

  if (style.opacity) {
    styleObject.opacity = parseFloat(style.opacity);
  }

  if (style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)") {
    const parsed = parseColor(style.backgroundColor);
    styleObject.backgroundColor = [parsed.color.r, parsed.color.g, parsed.color.b];
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
