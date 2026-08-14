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

  const elementsToUpdateLayout = new Set<HTMLElement>();

  data.forEach((styleData, element) => {
    const mesh = registry.get(element);
    if (!mesh || !mesh.userData.basePosition) return;

    // Fast-path styling updates (colors, opacity, etc.)
    Painter.forceUpdateUniforms(mesh.material as THREE.ShaderMaterial, {
      backgroundColor: styleData.backgroundColor,
      backgroundImage: styleData.backgroundImage,
      boxShadow: styleData.boxShadow,
      opacity: styleData.opacity,
      borderRadius: styleData.borderRadius ?? mesh.userData.baseStyles?.borderRadius,
    });

    if (mesh.userData.nativeMesh) {
      Painter.forceUpdateUniforms((mesh.userData.nativeMesh as THREE.Mesh).material as THREE.ShaderMaterial, {
        backgroundColor: styleData.backgroundColor,
        backgroundImage: styleData.backgroundImage,
        boxShadow: styleData.boxShadow,
        opacity: styleData.opacity,
        borderRadius: styleData.borderRadius ?? mesh.userData.baseStyles?.borderRadius,
      });

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

    if (styleData.layoutChanged || styleData.width !== undefined || styleData.height !== undefined) {
      elementsToUpdateLayout.add(element);
      // Add all descendants that are in the registry
      const descendants = element.querySelectorAll('*');
      for (let i = 0; i < descendants.length; i++) {
        const desc = descendants[i] as HTMLElement;
        if (registry.has(desc)) {
          elementsToUpdateLayout.add(desc);
        }
      }
    } else if (styleData.x !== undefined || styleData.y !== undefined) {
      // Just transform update (x, y) - doesn't affect child layout natively!
      if (sharedArray && mesh.userData.wasmIndex !== undefined) {
        const offset = mesh.userData.wasmIndex * WASM_STRIDE;
        if (styleData.x !== undefined && mesh.userData.initialLocalX !== undefined) {
          sharedArray[offset + OFFSET_LOCAL_X] = mesh.userData.initialLocalX + styleData.x;
        }
        if (styleData.y !== undefined && mesh.userData.initialLocalY !== undefined) {
          sharedArray[offset + OFFSET_LOCAL_Y] = mesh.userData.initialLocalY + styleData.y;
        }
      }
    }
  });

  // Now, process all layout updates efficiently!
  elementsToUpdateLayout.forEach((element) => {
    const mesh = registry.get(element);
    if (!mesh) return;

    const rect = element.getBoundingClientRect();
    
    if (mesh.userData.domRect) {
      mesh.userData.domRect.width = rect.width;
      mesh.userData.domRect.height = rect.height;
    }
    
    let pad = (mesh.material as THREE.ShaderMaterial).userData?.shadowPadding || 0;
    mesh.scale.set(rect.width + pad * 2, rect.height + pad * 2, 1);
    
    Painter.forceUpdateUniforms(mesh.material as THREE.ShaderMaterial, {
      width: rect.width,
      height: rect.height,
    });

    if (sharedArray && mesh.userData.wasmIndex !== undefined) {
      const offset = mesh.userData.wasmIndex * WASM_STRIDE;
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

      sharedArray[offset + OFFSET_LOCAL_X] = myWorldX - parentWorldX;
      sharedArray[offset + OFFSET_LOCAL_Y] = myWorldY - parentWorldY;
    }

    if (mesh.userData.nativeMesh) {
      const nativeMesh = mesh.userData.nativeMesh as THREE.Mesh;
      let nPad = (nativeMesh.material as THREE.ShaderMaterial).userData?.shadowPadding || 0;
      nativeMesh.scale.set(rect.width + nPad * 2, rect.height + nPad * 2, 1);
      
      Painter.forceUpdateUniforms(nativeMesh.material as THREE.ShaderMaterial, {
        width: rect.width,
        height: rect.height,
      });

      if (mesh.userData.nativeRect) {
        mesh.userData.nativeRect.width = rect.width;
        mesh.userData.nativeRect.height = rect.height;
      }
    }
  });
}
