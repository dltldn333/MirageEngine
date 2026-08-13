import { StyleData } from "@mirage-engine/dom-tracker";
import { MeshRegistry } from "../store/MeshRegistry";
import { Painter } from "@mirage-engine/painter";
import * as THREE from "three";
import { WASM_STRIDE, OFFSET_LOCAL_X, OFFSET_LOCAL_Y, OFFSET_PARENT, OFFSET_WORLD_X, OFFSET_WORLD_Y } from "../types";

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
      ...(styleData.width !== undefined && { width: styleData.width }),
      ...(styleData.height !== undefined && { height: styleData.height }),
    });

    if (styleData.width !== undefined || styleData.height !== undefined) {
      const newWidth = styleData.width ?? mesh.userData.domRect?.width ?? 0;
      const newHeight = styleData.height ?? mesh.userData.domRect?.height ?? 0;
      let pad = (mesh.material as THREE.ShaderMaterial).userData?.shadowPadding || 0;
      mesh.scale.set(newWidth + pad * 2, newHeight + pad * 2, 1);
      
      // We also update domRect so future syncs use the new rect
      if (mesh.userData.domRect) {
        if (styleData.width !== undefined) mesh.userData.domRect.width = styleData.width;
        if (styleData.height !== undefined) mesh.userData.domRect.height = styleData.height;
      }
    }

    if (
      sharedArray &&
      mesh.userData.wasmIndex !== undefined
    ) {
      const offset = mesh.userData.wasmIndex * WASM_STRIDE;
      
      let computedLocalX: number | undefined;
      let computedLocalY: number | undefined;

      if (styleData.layoutChanged) {
        const rect = element.getBoundingClientRect();
        const myWorldX = rect.left + (mesh.userData.isFixed ? 0 : window.scrollX);
        const myWorldY = rect.top + (mesh.userData.isFixed ? 0 : window.scrollY);

        const parentIndex = sharedArray[offset + OFFSET_PARENT];
        let parentWorldX = 0;
        let parentWorldY = 0;
        if (parentIndex !== -1) {
          const parentOffset = parentIndex * WASM_STRIDE;
          parentWorldX = sharedArray[parentOffset + OFFSET_WORLD_X];
          parentWorldY = sharedArray[parentOffset + OFFSET_WORLD_Y];
        }

        computedLocalX = myWorldX - parentWorldX;
        computedLocalY = myWorldY - parentWorldY;
      } else {
        if (styleData.x !== undefined && mesh.userData.initialLocalX !== undefined) {
          computedLocalX = mesh.userData.initialLocalX + styleData.x;
        }
        if (styleData.y !== undefined && mesh.userData.initialLocalY !== undefined) {
          computedLocalY = mesh.userData.initialLocalY + styleData.y;
        }
      }

      if (computedLocalX !== undefined) {
        sharedArray[offset + OFFSET_LOCAL_X] = computedLocalX;
      }
      if (computedLocalY !== undefined) {
        sharedArray[offset + OFFSET_LOCAL_Y] = computedLocalY;
      }
    }

    if (mesh.userData.nativeMesh) {
      Painter.forceUpdateUniforms((mesh.userData.nativeMesh as THREE.Mesh).material as THREE.ShaderMaterial, {
        backgroundColor: styleData.backgroundColor,
        backgroundImage: styleData.backgroundImage,
        boxShadow: styleData.boxShadow,
        opacity: styleData.opacity,
        borderRadius: styleData.borderRadius ?? mesh.userData.baseStyles?.borderRadius,
        ...(styleData.width !== undefined && { width: styleData.width }),
        ...(styleData.height !== undefined && { height: styleData.height }),
      });
      
      if (styleData.width !== undefined || styleData.height !== undefined) {
        const nativeMesh = mesh.userData.nativeMesh as THREE.Mesh;
        const newWidth = styleData.width ?? mesh.userData.nativeRect?.width ?? mesh.userData.domRect?.width ?? 0;
        const newHeight = styleData.height ?? mesh.userData.nativeRect?.height ?? mesh.userData.domRect?.height ?? 0;
        let nPad = (nativeMesh.material as THREE.ShaderMaterial).userData?.shadowPadding || 0;
        nativeMesh.scale.set(newWidth + nPad * 2, newHeight + nPad * 2, 1);
        
        if (mesh.userData.nativeRect) {
          if (styleData.width !== undefined) mesh.userData.nativeRect.width = styleData.width;
          if (styleData.height !== undefined) mesh.userData.nativeRect.height = styleData.height;
        }
      }
      
      if (styleData.scaleX !== undefined || styleData.scaleY !== undefined) {
        const nativeMesh = mesh.userData.nativeMesh as THREE.Mesh;
        const currentScaleX = nativeMesh.scale.x;
        const currentScaleY = nativeMesh.scale.y;
        const currentScaleZ = nativeMesh.scale.z;
        nativeMesh.scale.set(
          styleData.scaleX !== undefined ? styleData.scaleX * currentScaleX : currentScaleX,
          styleData.scaleY !== undefined ? styleData.scaleY * currentScaleY : currentScaleY,
          styleData.scaleZ !== undefined ? styleData.scaleZ * currentScaleZ : currentScaleZ
        );
      }
    }
  });
}
