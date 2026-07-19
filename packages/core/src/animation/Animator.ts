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

    Painter.forceUpdateUniforms(mesh.material as THREE.ShaderMaterial, {
      backgroundColor: styleData.backgroundColor,
      backgroundImage: styleData.backgroundImage,
      boxShadow: styleData.boxShadow,
      opacity: styleData.opacity,
      borderRadius:
        styleData.borderRadius ?? mesh.userData.baseStyles?.borderRadius,
      // width and height are no longer updated here, they are updated in syncMeshesByDOM
    });

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
