import * as THREE from "three";
import { BoxStyles, ShaderHooks } from "./types";
import {parsePixelValue, parseColor} from "./tools/parser"
// import { glassHooks } from "./dev/devShader";



const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec4 vScreenPos;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vScreenPos = gl_Position;
  }
`;

const fragmentShaderTemplate = /* glsl */ `

  varying vec2 vUv;
  
  uniform vec2 uSize;
  uniform vec4 uBorderRadius;
  uniform float uBorderWidth;
  uniform vec3 uBgColor;
  uniform vec3 uBorderColor;
  uniform float uOpacity;
  uniform float uBgOpacity;
  uniform float uBorderOpacity;

  #INJECT_DECLARATIONS

  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;

    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  float sdVisualBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    float n = 2.01; 
    float d = pow(pow(max(q.x, 0.0), n) + pow(max(q.y, 0.0), n), 1.0/n) - r;
    return min(max(q.x, q.y), 0.0) + d;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    vec2 halfSize = uSize * 0.5;

    #INJECT_UV_MODIFIER

    // color decision pipeline
    vec4 baseColor = vec4(uBgColor, uBgOpacity);

    #INJECT_BASE_COLOR

  // Hybrid SDF

    vec2 xRadii = mix(uBorderRadius.xw, uBorderRadius.yz, step(0.0, p.x));
    float r = mix(xRadii.y, xRadii.x, step(0.0, p.y));
    r = min(r, min(halfSize.x, halfSize.y));

    float d = sdRoundedBox(p, halfSize, r);

    float d_smooth = sdVisualBox(p, halfSize, r);
    float d_visual = d_smooth / fwidth(d_smooth);

    // rendering pipeline
    float bgMask = 1.0 - smoothstep(-0.5, 0.5, d_visual);

    float halfBorder = uBorderWidth * 0.5;
    float borderD = abs(d + halfBorder) - halfBorder;
    float borderAlpha = (1.0 - smoothstep(0.0, 1.0, borderD)) * uBorderOpacity; 
    if (uBorderWidth <= 0.01) {
      borderAlpha = 0.0;
    }

    // final blending (border + background)
    float aFront = borderAlpha;
    float aBack = baseColor.a;
    float aOut = aFront + aBack * (1.0 - aFront);

    float safeAlpha = max(aOut, 0.0001);
    vec3 cOut = (uBorderColor * aFront + baseColor.rgb * aBack * (1.0 - aFront)) / safeAlpha;
    vec4 finalColor = vec4(cOut, aOut);

    // final color control (Tint, Noise)
    #INJECT_COLOR_MODIFIER

    float finalOpacity = finalColor.a * bgMask * uOpacity;
    if (finalOpacity < 0.001) discard;

    gl_FragColor = vec4(finalColor.rgb, finalOpacity);

    #include <colorspace_fragment>
  }
`;

export function createBoxMaterial(
  styles: BoxStyles,
  width: number,
  height: number,
  texture: THREE.Texture | null = null,
  hooks?: ShaderHooks,
): THREE.ShaderMaterial {
  const hasTexture = texture !== null;
  // [for dev]
  // const activeHooks = hasTexture ? glassHooks : hooks;

  const declChunk = hasTexture
    ? /* glsl */ `
    uniform sampler2D uTexture;
    varying vec4 vScreenPos;
  `
    : "";

  // [un dev]
  const uvChunk = hasTexture
    ? /* glsl */ `
    vec2 screenUv = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;
    vec2 resultUv = screenUv;
    ${hooks?.uvModifier || ""}
  `
    : "";

  // [for dev]
  // const uvChunk = hasTexture
  //   ? /* glsl */ `
  //   vec2 screenUv = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;
  //   vec2 resultUv = screenUv;
  //   ${activeHooks?.uvModifier || ""}
  // `
  //   : "";

  const baseColorChunk = hasTexture
    ? /* glsl */ `
    vec4 texColor = texture2D(uTexture, resultUv);
    baseColor.rgb = mix(texColor.rgb, uBgColor, uBgOpacity);
    baseColor.a = max(texColor.a, uBgOpacity);
  `
    : "";

  // [un dev]
  const colorModChunk = hooks?.colorModifier || "";

  // [for dev]
  // const colorModChunk = hasTexture
  //   ? activeHooks?.colorModifier || ""
  //   : hooks?.colorModifier || "";

  const fragmentShader = fragmentShaderTemplate
    .replace("#INJECT_DECLARATIONS", declChunk)
    .replace("#INJECT_UV_MODIFIER", uvChunk)
    .replace("#INJECT_BASE_COLOR", baseColorChunk)
    .replace("#INJECT_COLOR_MODIFIER", colorModChunk);

  // uniform setting
  const parsedBg = parseColor(styles.backgroundColor);
  const parsedBorder = parseColor(styles.borderColor);
  const uniforms = {
    uSize: { value: new THREE.Vector2(width, height) },
    uBorderRadius: { value: new THREE.Vector4(0, 0, 0, 0) },
    uBorderWidth: { value: parsePixelValue(styles.borderWidth) },
    uBgColor: { value: parsedBg.color },
    uBorderColor: { value: parsedBorder.color },
    uOpacity: { value: styles.opacity ?? 1.0 },
    uBgOpacity: { value: parsedBg.alpha },
    uBorderOpacity: { value: parsedBorder.alpha },
    uTexture: { value: null as THREE.Texture | null },
  };
  // border radius value initialize
  setBorderRadius(uniforms.uBorderRadius.value, styles.borderRadius);

  if (hasTexture) {
    uniforms.uTexture.value = texture;
  }

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
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
  const parsedBg = parseColor(styles.backgroundColor);
  const parsedBorderColor = parseColor(styles.borderColor);
  const parsedBorderWidth = parsePixelValue(styles.borderWidth);
  setBoxUniforms(material, {
    width,
    height,
    borderRadius: styles.borderRadius,
    borderWidth: parsedBorderWidth,
    backgroundColor: parsedBg.color,
    borderColor: parsedBorderColor.color,
    opacity: styles.opacity,
    bgOpacity: parsedBg.alpha,
    borderOpacity: parsedBorderColor.alpha,
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
      material.uniforms.uBgColor.value.setRGB(
        values.backgroundColor[0],
        values.backgroundColor[1],
        values.backgroundColor[2],
      );
    } else if (typeof values.backgroundColor === "string") {
      const parsed = parseColor(values.backgroundColor);
      material.uniforms.uBgColor.value.copy(parsed.color);
      material.uniforms.uBgOpacity.value = parsed.alpha;
    } else {
      material.uniforms.uBgColor.value.copy(values.backgroundColor);
    }
  }

  if (values.borderColor !== undefined) {
    if (Array.isArray(values.borderColor)) {
      material.uniforms.uBorderColor.value.setRGB(
        values.borderColor[0],
        values.borderColor[1],
        values.borderColor[2],
      );
    } else if (typeof values.borderColor === "string") {
      const parsed = parseColor(values.borderColor);
      material.uniforms.uBorderColor.value.copy(parsed.color);
      material.uniforms.uBorderOpacity.value = parsed.alpha;
    } else {
      material.uniforms.uBorderColor.value.copy(values.borderColor);
    }
  }

  if (values.opacity !== undefined) {
    material.uniforms.uOpacity.value = values.opacity;
  }

  if (values.bgOpacity !== undefined) {
    material.uniforms.uBgOpacity.value = values.bgOpacity;
  }

  if (values.borderOpacity !== undefined) {
    material.uniforms.uBorderOpacity.value = values.borderOpacity;
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