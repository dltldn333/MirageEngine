import * as THREE from "three";
import { BoxStyles, TextStyles } from "./types";
import { createBoxMaterial, updateBoxMaterial } from "./BoxGenerator";
import { createTextTexture } from "./TextGenerator";

export const Painter = {
  create(
    type: "BOX" | "TEXT",
    styles: any,
    content: string,
    width: number,
    height: number,
    quality: number = 2,
  ): THREE.Material {
    if (type === "BOX") {
      return createBoxMaterial(styles as BoxStyles, width, height);
    } else if (type === "TEXT") {
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
    styles: any,
    content: string,
    width: number,
    height: number,
    quality: number = 2,
  ) {
    if (type === "BOX") {
      updateBoxMaterial(
        material as THREE.ShaderMaterial,
        styles as BoxStyles,
        width,
        height,
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
};
