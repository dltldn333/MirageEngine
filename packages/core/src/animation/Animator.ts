import { StyleData } from "@mirage-engine/dom-tracker";
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
    if (!mesh || !mesh.userData.basePosition) return;

    let { x: baseX, y: baseY } = mesh.userData.basePosition;
    const { width: baseW, height: baseH } = mesh.userData.baseSize;

    const currentW = styleData.width ?? baseW;
    const currentH = styleData.height ?? baseH;
    const widthDiff = currentW - baseW;
    const heightDiff = currentH - baseH;

    if (
      styleData.width !== undefined &&
      mesh.userData.originRatioX === undefined &&
      Math.abs(widthDiff) > 0.1 
    ) {
      const rect = element.getBoundingClientRect();
      const tx = styleData.x ?? 0;
      const baseTx = mesh.userData.baseTransform?.x ?? 0;
      const scrollOffsetX = mesh.userData.isFixed ? 0 : window.scrollX;
      const currentPageX = rect.left + scrollOffsetX - tx + baseTx;
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
      const baseTy = mesh.userData.baseTransform?.y ?? 0;
      const scrollOffsetY = mesh.userData.isFixed ? 0 : window.scrollY;
      const currentPageY = rect.top + scrollOffsetY - ty + baseTy;
      const deltaY = currentPageY - mesh.userData.baseDOM.y;
      
      let ratioY = -deltaY / heightDiff;
      if (Math.abs(ratioY) < 0.05) ratioY = 0.0;
      else if (Math.abs(ratioY - 1.0) < 0.05) ratioY = 1.0;
      else if (Math.abs(ratioY - 0.5) < 0.05) ratioY = 0.5;

      mesh.userData.originRatioY = ratioY;
    }

    const ratioX = mesh.userData.originRatioX ?? 0.5;
    const ratioY = mesh.userData.originRatioY ?? 0.5;

    const moveX = widthDiff * (0.5 - ratioX);
    const moveY = heightDiff * (0.5 - ratioY);

    const baseTx = mesh.userData.baseTransform?.x ?? 0;
    const baseTy = mesh.userData.baseTransform?.y ?? 0;
    
    const deltaTx = (styleData.x ?? baseTx) - baseTx;
    const deltaTy = (styleData.y ?? baseTy) - baseTy;

    mesh.position.setX(baseX + moveX + deltaTx);
    mesh.position.setY(baseY - (moveY + deltaTy));
    mesh.scale.set(currentW, currentH, 1);

    Painter.forceUpdateUniforms(mesh.material as THREE.ShaderMaterial, {
      backgroundColor: styleData.backgroundColor,
      backgroundImage: styleData.backgroundImage,
      opacity: styleData.opacity,
      borderRadius: styleData.borderRadius ?? mesh.userData.baseStyles?.borderRadius,
      width: currentW,
      height: currentH,
    });
  });
}

export function updateFixedMeshesScroll(
  fixedMeshes: Set<THREE.Mesh>,
  currentScrollX: number,
  currentScrollY: number,
) {
  fixedMeshes.forEach((mesh) => {
    if (mesh.userData.isFixed && mesh.userData.initialScroll && mesh.userData.originalBasePosition) {
      const offsetX = currentScrollX - mesh.userData.initialScroll.x;
      const offsetY = currentScrollY - mesh.userData.initialScroll.y;

      mesh.userData.basePosition.x = mesh.userData.originalBasePosition.x + offsetX;
      mesh.userData.basePosition.y = mesh.userData.originalBasePosition.y - offsetY;

      mesh.position.x = mesh.userData.basePosition.x;
      mesh.position.y = mesh.userData.basePosition.y;
    }
  });
}
