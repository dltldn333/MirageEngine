import { StyleData } from "@mirage-engine/dom-tracker";
import { MeshRegistry } from "../store/MeshRegistry";
import { Painter } from "@mirage-engine/painter";
import * as THREE from "three";
import { WASM_STRIDE, OFFSET_LOCAL_X, OFFSET_LOCAL_Y } from "../types";

export function animateMeshByData(
  registry: MeshRegistry,
  data: Map<HTMLElement, StyleData>,
  sharedArray?: Float32Array,
) {
  if (data.size === 0) return;

  data.forEach((styleData, element) => {
    const mesh = registry.get(element);
    if (!mesh || !mesh.userData.basePosition) return;

    Painter.forceUpdateUniforms(mesh.material as THREE.ShaderMaterial, {
      backgroundColor: styleData.backgroundColor,
      backgroundImage: styleData.backgroundImage,
      boxShadow: styleData.boxShadow,
      opacity: styleData.opacity,
      borderRadius:
        styleData.borderRadius ?? mesh.userData.baseStyles?.borderRadius,
      // width and height are no longer updated here, they are updated in syncMeshesByDOM
    });

    if (
      sharedArray &&
      mesh.userData.wasmIndex !== undefined &&
      (styleData.x !== undefined || styleData.y !== undefined)
    ) {
      const offset = mesh.userData.wasmIndex * WASM_STRIDE;
      if (styleData.x !== undefined && mesh.userData.initialLocalX !== undefined) {
        sharedArray[offset + OFFSET_LOCAL_X] = mesh.userData.initialLocalX + styleData.x;
      }
      if (styleData.y !== undefined && mesh.userData.initialLocalY !== undefined) {
        sharedArray[offset + OFFSET_LOCAL_Y] = mesh.userData.initialLocalY + styleData.y;
      }
    }

    if (mesh.userData.nativeMesh) {
      Painter.forceUpdateUniforms((mesh.userData.nativeMesh as THREE.Mesh).material as THREE.ShaderMaterial, {
        backgroundColor: styleData.backgroundColor,
        backgroundImage: styleData.backgroundImage,
        boxShadow: styleData.boxShadow,
        opacity: styleData.opacity,
        borderRadius: styleData.borderRadius ?? mesh.userData.baseStyles?.borderRadius,
      });
    }
  });
}
