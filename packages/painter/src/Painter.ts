import * as THREE from "three";
import { BoxStyles, TextStyles, ShaderHooks } from "./types";
import {
  createBoxMaterial,
  updateBoxMaterial,
  setBoxUniforms,
  BoxUniformValues,
} from "./BoxGenerator";
import { createTextTexture } from "./Text/TextGenerator";

export const Painter = {
  create(
    type: "BOX" | "TEXT",
    styles: BoxStyles | TextStyles,
    content: string,
    width: number,
    height: number,
    quality: number = 2,
    texture: THREE.Texture | null = null,
    shaderHooks?: ShaderHooks,
  ): THREE.Material {
    if (type === "BOX") {
      return createBoxMaterial(
        styles as BoxStyles,
        width,
        height,
        texture,
        shaderHooks,
      );
    } else if (type === "TEXT") {
      // return createTextMaterial()
      const texture = createTextTexture(
        content || "",
        styles as TextStyles,
        width,
        height,
        quality,
      );
      return new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.FrontSide,
        color: 0xffffff,
      });
    }

    return new THREE.MeshBasicMaterial({ visible: false });
  },

  update(
    material: THREE.Material,
    type: "BOX" | "TEXT",
    styles: BoxStyles | TextStyles,
    content: string,
    width: number,
    height: number,
    quality: number = 2,
    texture?: THREE.Texture | null,
  ) {
    if (type === "BOX") {
      updateBoxMaterial(
        material as THREE.ShaderMaterial,
        styles as BoxStyles,
        width,
        height,
        texture,
      );
    } else if (type === "TEXT") {
      const basicMat = material as THREE.MeshBasicMaterial;

      if (basicMat.map) {
        basicMat.map.dispose();
      }

      const newTexture = createTextTexture(
        content || "",
        styles as TextStyles,
        width,
        height,
        quality,
      );

      basicMat.map = newTexture;
      basicMat.needsUpdate = true;
    }
  },

  forceUpdateUniforms(
    material: THREE.ShaderMaterial,
    values: BoxUniformValues,
  ) {
    setBoxUniforms(material, values);
  },
};
