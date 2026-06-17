import * as THREE from "three";
import { BoxStyles, ShaderHooks } from "./types";
import { parsePixelValue, parseColor } from "./tools/parser";
import { BoxShader, BoxChunk } from "./shaders/index";

export function createBoxMaterial(
  styles: BoxStyles,
  width: number,
  height: number,
  texture: THREE.Texture | null = null,
  hooks?: ShaderHooks,
): THREE.ShaderMaterial {
  const hasTexture = texture !== null;

  const declChunk = hasTexture ? BoxChunk.declChunk : "";
  const uvChunk = hasTexture ? (BoxChunk.uvChunk + hooks?.uvModifier || "" ): "";
  const baseColorChunk = hasTexture ? BoxChunk.baseColorChunk : "";
  const colorModChunk = hooks?.colorModifier || "";

  const fragmentShader = BoxShader.fragmentShader
    .replace("#INJECT_DECLARATIONS", declChunk)
    .replace("#INJECT_UV_MODIFIER", uvChunk)
    .replace("#INJECT_BASE_COLOR", baseColorChunk)
    .replace("#INJECT_COLOR_MODIFIER", colorModChunk);

  // uniform setting
  const parsedBg = parseColor(styles.backgroundColor);
  const parsedBorder = parseColor(styles.borderColor);
  const uniforms = {
    uSize: { value: new THREE.Vector2(width, height) },
    uBgColor: {
      value: new THREE.Vector4(
        parsedBg.color.r,
        parsedBg.color.g,
        parsedBg.color.b,
        parsedBg.alpha,
      ),
    },
    uBorderColor: {
      value: new THREE.Vector4(
        parsedBorder.color.r,
        parsedBorder.color.g,
        parsedBorder.color.b,
        parsedBorder.alpha,
      ),
    },
    uBorderRadius: { value: new THREE.Vector4(0, 0, 0, 0) },
    uBorderWidth: { value: parsePixelValue(styles.borderWidth) },
    uOpacity: { value: styles.opacity ?? 1.0 },
    uTexture: { value: null as THREE.Texture | null },
  };
  // border radius value initialize
  setBorderRadius(uniforms.uBorderRadius.value, styles.borderRadius);

  if (hasTexture) {
    uniforms.uTexture.value = texture;
  }

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: BoxShader.vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    side: THREE.FrontSide, // for better performance
  });

  return material;
}

export function updateBoxMaterial(
  material: THREE.ShaderMaterial,
  styles: BoxStyles,
  width: number,
  height: number,
  texture?: THREE.Texture | null,
) {
  const parsedBorderWidth = parsePixelValue(styles.borderWidth);
  setBoxUniforms(material, {
    width,
    height,
    borderRadius: styles.borderRadius,
    borderWidth: parsedBorderWidth,
    backgroundColor: styles.backgroundColor,
    borderColor: styles.borderColor,
    opacity: styles.opacity,
    texture,
  });
}

export interface BoxUniformValues {
  width?: number;
  height?: number;
  borderRadius?: string | number | [number, number, number, number];
  borderWidth?: number;
  backgroundColor?: THREE.Color | [number, number, number] | string;
  borderColor?: THREE.Color | [number, number, number] | string;
  opacity?: number;
  bgOpacity?: number;
  borderOpacity?: number;
  texture?: THREE.Texture | null;
}

export function setBoxUniforms(
  material: THREE.ShaderMaterial,
  values: BoxUniformValues,
) {
  if (values.width !== undefined && values.height !== undefined) {
    material.uniforms.uSize.value.set(values.width, values.height);
  }
  if (values.borderRadius !== undefined) {
    setBorderRadius(material.uniforms.uBorderRadius.value, values.borderRadius);
  }
  if (values.borderWidth !== undefined) {
    material.uniforms.uBorderWidth.value = values.borderWidth;
  }

  if (values.backgroundColor !== undefined) {
    if (Array.isArray(values.backgroundColor)) {
      const currentAlpha = material.uniforms.uBgColor.value.w;
      material.uniforms.uBgColor.value.set(
        values.backgroundColor[0],
        values.backgroundColor[1],
        values.backgroundColor[2],
        currentAlpha,
      );
    } else if (typeof values.backgroundColor === "string") {
      const parsed = parseColor(values.backgroundColor);
      material.uniforms.uBgColor.value.set(
        parsed.color.r,
        parsed.color.g,
        parsed.color.b,
        parsed.alpha,
      );
    } else {
      const currentAlpha = material.uniforms.uBgColor.value.w;
      material.uniforms.uBgColor.value.set(
        values.backgroundColor.r,
        values.backgroundColor.g,
        values.backgroundColor.b,
        currentAlpha,
      );
    }
  }

  if (values.borderColor !== undefined) {
    if (Array.isArray(values.borderColor)) {
      const currentAlpha = material.uniforms.uBorderColor.value.w;
      material.uniforms.uBorderColor.value.set(
        values.borderColor[0],
        values.borderColor[1],
        values.borderColor[2],
        currentAlpha,
      );
    } else if (typeof values.borderColor === "string") {
      const parsed = parseColor(values.borderColor);
      material.uniforms.uBorderColor.value.set(
        parsed.color.r,
        parsed.color.g,
        parsed.color.b,
        parsed.alpha,
      );
    } else {
      const currentAlpha = material.uniforms.uBorderColor.value.w;
      material.uniforms.uBorderColor.value.set(
        values.borderColor.r,
        values.borderColor.g,
        values.borderColor.b,
        currentAlpha,
      );
    }
  }

  if (values.opacity !== undefined) {
    material.uniforms.uOpacity.value = values.opacity;
  }
  if (values.bgOpacity !== undefined) {
    material.uniforms.uBgColor.value.w = values.bgOpacity;
  }
  if (values.borderOpacity !== undefined) {
    material.uniforms.uBorderColor.value.w = values.borderOpacity;
  }
  if (material.uniforms.uTexture && values.texture !== undefined) {
    material.uniforms.uTexture.value = values.texture;
  }
}

function setBorderRadius(
  target: THREE.Vector4,
  radius?: string | number | [number, number, number, number],
) {
  if (radius === undefined || radius === null) {
    target.set(0, 0, 0, 0);
    return;
  }

  if (typeof radius === "number") {
    target.set(radius, radius, radius, radius);
    return;
  }

  if (Array.isArray(radius)) {
    target.set(radius[0], radius[1], radius[2], radius[3]);
    return;
  }

  const arr = radius.split("/")[0].trim().split(/\s+/);
  const tl = parsePixelValue(arr[0]);
  const tr = parsePixelValue(arr[1] ?? arr[0]);
  const br = parsePixelValue(arr[2] ?? arr[0]);
  const bl = parsePixelValue(arr[3] ?? arr[1] ?? arr[0]);

  target.set(tl, tr, br, bl);
}
