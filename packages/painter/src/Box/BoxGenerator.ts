import * as THREE from "three";
import { BoxStyles, ShaderHooks } from "../types";
import {
  parsePixelValue,
  parseColor,
  parseLinearGradient,
  parseBoxShadow,
} from "../tools/parser";
import { BoxShader, BoxChunk } from "../shaders/index";

export function createBoxMaterial(
  styles: BoxStyles,
  width: number,
  height: number,
  texture: THREE.Texture | null = null,
  hooks?: ShaderHooks,
): THREE.ShaderMaterial {
  const hasTexture = texture !== null || !!styles.imageSrc;

  let customUniformsCode = "";
  const customUniforms: any = {};
  
  if (hooks?.uniforms) {
    for (const [key, value] of Object.entries(hooks.uniforms)) {
      if (typeof value === "number") {
        customUniformsCode += `uniform float ${key};\n`;
        customUniforms[key] = { value };
      } else if (Array.isArray(value)) {
        if (value.length === 2) {
          customUniformsCode += `uniform vec2 ${key};\n`;
          customUniforms[key] = { value: new THREE.Vector2(...value) };
        } else if (value.length === 3) {
          customUniformsCode += `uniform vec3 ${key};\n`;
          customUniforms[key] = { value: new THREE.Vector3(...value) };
        } else if (value.length === 4) {
          customUniformsCode += `uniform vec4 ${key};\n`;
          customUniforms[key] = { value: new THREE.Vector4(...value) };
        }
      } else {
        customUniformsCode += `uniform float ${key};\n`;
        customUniforms[key] = { value };
      }
    }
  }

  const hasHooks = hooks !== undefined;
  const declChunk = (hasTexture || hasHooks ? BoxChunk.declChunk : "") + "\n" + customUniformsCode;
  const screenUvDecl = "vec2 screenUv = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;\n";
  const baseUvCode = styles.isTraveler ? "vec2 resultUv = screenUv;\n" : "vec2 localUv = (p / uSize) + 0.5;\nvec2 resultUv = localUv * uTextureRepeat + uTextureOffset;\n";
  const uvChunk = (hasTexture || hasHooks) ? screenUvDecl + baseUvCode + (hooks?.uvModifier || "") : "";
  const baseColorChunk = (hasTexture || hasHooks) ? BoxChunk.baseColorChunk : "";
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
    uMeshSize: { value: new THREE.Vector2(width, height) },
    uShadowColor: { value: new THREE.Vector4(0, 0, 0, 0) },
    uShadowOffset: { value: new THREE.Vector2(0, 0) },
    uShadowBlur: { value: 0 },
    uShadowSpread: { value: 0 },
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
    uTextureRepeat: { value: new THREE.Vector2(1.0, 1.0) },
    uTextureOffset: { value: new THREE.Vector2(0.0, 0.0) },

    uGradientCount: { value: 0 },
    uGradientAngle: { value: 0 },
    uGradientColors: {
      value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)),
    },
    uGradientStops: { value: new Float32Array(8) },
  };
  // border radius value initialize
  setBorderRadius(uniforms.uBorderRadius.value, styles.borderRadius, Math.min(width, height));

  if (hasTexture) {
    uniforms.uTexture.value = texture;
  }

  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, ...customUniforms },
    vertexShader: BoxShader.vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    side: THREE.FrontSide, // for better performance
  });

  // Initial gradient setup
  if (styles.backgroundImage) {
    setBoxUniforms(material, { backgroundImage: styles.backgroundImage });
  }

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
    backgroundImage: styles.backgroundImage,
    boxShadow: styles.boxShadow,
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
  backgroundImage?: string;
  boxShadow?: string;
  [key: string]: any;
}

export function setBoxUniforms(
  material: THREE.ShaderMaterial,
  values: BoxUniformValues,
) {
  if (values.boxShadow !== undefined) {
    const shadow = parseBoxShadow(values.boxShadow);
    if (shadow) {
      material.uniforms.uShadowColor.value.set(shadow.color.r, shadow.color.g, shadow.color.b, shadow.alpha);
      material.uniforms.uShadowOffset.value.set(shadow.offsetX, shadow.offsetY);
      material.uniforms.uShadowBlur.value = shadow.blurRadius;
      material.uniforms.uShadowSpread.value = shadow.spreadRadius;
      material.userData.shadowPadding = shadow.blurRadius + shadow.spreadRadius + Math.max(Math.abs(shadow.offsetX), Math.abs(shadow.offsetY));
    } else {
      material.uniforms.uShadowColor.value.w = 0;
      material.userData.shadowPadding = 0;
    }
  }

  if (values.width !== undefined && values.height !== undefined) {
    material.uniforms.uSize.value.set(values.width, values.height);
  }
  
  if (material.uniforms.uMeshSize) {
    const pad = material.userData.shadowPadding || 0;
    const cw = values.width !== undefined ? values.width : material.uniforms.uSize.value.x;
    const ch = values.height !== undefined ? values.height : material.uniforms.uSize.value.y;
    material.uniforms.uMeshSize.value.set(cw + pad * 2, ch + pad * 2);
  }

  if (values.borderRadius !== undefined) {
    const baseSize = values.width !== undefined && values.height !== undefined 
      ? Math.min(values.width, values.height) 
      : Math.min(material.uniforms.uSize.value.x, material.uniforms.uSize.value.y);
    setBorderRadius(material.uniforms.uBorderRadius.value, values.borderRadius, baseSize);
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

  const currentTex = values.texture !== undefined ? values.texture : material.uniforms.uTexture?.value;
  if (currentTex && (currentTex.image instanceof ImageBitmap || currentTex.image instanceof HTMLImageElement || currentTex.image instanceof HTMLCanvasElement)) {
    const imgWidth = (currentTex.image as HTMLImageElement).naturalWidth || currentTex.image.videoWidth || currentTex.image.width;
    const imgHeight = (currentTex.image as HTMLImageElement).naturalHeight || currentTex.image.videoHeight || currentTex.image.height;
    const domWidth = values.width ?? material.uniforms.uSize.value.x;
    const domHeight = values.height ?? material.uniforms.uSize.value.y;
    
    if (imgWidth && imgHeight && domWidth && domHeight) {
      const imageAspect = imgWidth / imgHeight;
      const domAspect = domWidth / domHeight;

      if (imageAspect > domAspect) {
        const repeatX = domAspect / imageAspect;
        material.uniforms.uTextureRepeat.value.set(repeatX, 1);
        material.uniforms.uTextureOffset.value.set((1 - repeatX) / 2, 0);
      } else {
        const repeatY = imageAspect / domAspect;
        material.uniforms.uTextureRepeat.value.set(1, repeatY);
        material.uniforms.uTextureOffset.value.set(0, (1 - repeatY) / 2);
      }
    }
  } else if (material.uniforms.uTextureRepeat) {
    material.uniforms.uTextureRepeat.value.set(1, 1);
    material.uniforms.uTextureOffset.value.set(0, 0);
  }

  if (values.backgroundImage !== undefined) {
    const gradient = parseLinearGradient(values.backgroundImage);
    if (gradient) {
      material.uniforms.uGradientCount.value = gradient.stops.length;
      material.uniforms.uGradientAngle.value = gradient.angle;
      for (let i = 0; i < 8; i++) {
        if (i < gradient.stops.length) {
          const s = gradient.stops[i];
          material.uniforms.uGradientColors.value[i].set(
            s.color.r,
            s.color.g,
            s.color.b,
            s.alpha,
          );
          // console.log(s.color.r, s.color.g, s.color.b);
          material.uniforms.uGradientStops.value[i] = s.stop;
        } else {
          material.uniforms.uGradientColors.value[i].set(0, 0, 0, 0);
          material.uniforms.uGradientStops.value[i] = 1.0;
        }
      }
    } else {
      material.uniforms.uGradientCount.value = 0;
    }
  }

  // Update dynamic custom uniforms
  for (const key of Object.keys(values)) {
    if (
      key !== "width" &&
      key !== "height" &&
      key !== "borderRadius" &&
      key !== "borderWidth" &&
      key !== "backgroundColor" &&
      key !== "borderColor" &&
      key !== "opacity" &&
      key !== "bgOpacity" &&
      key !== "borderOpacity" &&
      key !== "texture" &&
      key !== "backgroundImage" &&
      key !== "boxShadow"
    ) {
      if (material.uniforms[key] !== undefined) {
        if (
          material.uniforms[key].value !== undefined &&
          material.uniforms[key].value !== null &&
          typeof material.uniforms[key].value.set === "function"
        ) {
          if (Array.isArray(values[key])) {
            material.uniforms[key].value.set(...values[key]);
          } else if (values[key] !== undefined) {
            if (values[key].copy) {
              material.uniforms[key].value.copy(values[key]);
            } else {
              material.uniforms[key].value = values[key];
            }
          }
        } else {
          material.uniforms[key].value = values[key];
        }
      }
    }
  }
}

function setBorderRadius(
  target: THREE.Vector4,
  radius: string | number | [number, number, number, number] | undefined | null,
  baseSize: number = 0,
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
  const tl = parsePixelValue(arr[0], baseSize);
  const tr = parsePixelValue(arr[1] ?? arr[0], baseSize);
  const br = parsePixelValue(arr[2] ?? arr[0], baseSize);
  const bl = parsePixelValue(arr[3] ?? arr[1] ?? arr[0], baseSize);

  target.set(tl, tr, br, bl);
}
