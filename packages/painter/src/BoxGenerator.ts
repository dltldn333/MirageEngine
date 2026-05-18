import * as THREE from "three";
import { BoxStyles } from "./types";

function parsePixelValue(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value) || 0;
}

function setBorderRadius(target: THREE.Vector4, radius: string) {
  if (!radius) {
    target.set(0, 0, 0, 0);
    return;
  }
  const arr = radius.split("/")[0].trim().split(/\s+/);
  const tl = parsePixelValue(arr[0]);
  const tr = parsePixelValue(arr[1] ?? arr[0]);
  const br = parsePixelValue(arr[2] ?? arr[0]);
  const bl = parsePixelValue(arr[3] ?? arr[1] ?? arr[0]);

  target.set(tl, tr, br, bl);
}

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

  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    vec2 halfSize = uSize * 0.5;

    #INJECT_UV_MODIFIER
    
    // color decision pipeline
    vec4 baseColor = vec4(uBgColor, uBgOpacity);

    #INJECT_BASE_COLOR

    // sdf shape pipeline
    vec2 xRadii = mix(uBorderRadius.xw, uBorderRadius.yz, step(0.0, p.x));
    float r = mix(xRadii.y, xRadii.x, step(0.0, p.y));
    float d = sdRoundedBox(p, halfSize, r);

    float aa = 1.0; 
    float bgMask = 1.0 - smoothstep(0.0, aa, d);

    float halfBorder = uBorderWidth * 0.5;
    float borderD = abs(d + halfBorder) - halfBorder;
    float borderAlpha = (1.0 - smoothstep(0.0, aa, borderD)) * uBorderOpacity; 

    // [TODO] fix branching to math
    if (uBorderWidth <= 0.01) {
      borderAlpha = 0.0;
    }

    // final blending (border + background)
    float aFront = borderAlpha;
    float aBack = uBgOpacity;
    float aOut = aFront + aBack * (1.0 - aFront);

    float safeAlpha = max(aOut, 0.0001);
    vec3 cOut = (uBorderColor * aFront + uBgColor * aBack * (1.0 - aFront)) / safeAlpha;

    float finalOpacity = aOut * bgMask * uOpacity;

    if (finalOpacity < 0.001) discard;

    gl_FragColor = vec4(cOut, finalOpacity);

    #include <colorspace_fragment>
  }
`;

function parseColor(colorStr: string) {
  if (!colorStr || colorStr === "transparent") {
    return { color: new THREE.Color(0xffffff), alpha: 0.0 };
  }

  const rgbaMatch = colorStr.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
  );

  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1.0;

    return { color: new THREE.Color(`rgb(${r}, ${g}, ${b})`), alpha: a };
  }

  return { color: new THREE.Color(colorStr), alpha: 1.0 };
}

export function createBoxMaterial(
  styles: BoxStyles,
  width: number,
  height: number,
  texture: THREE.Texture | null = null,
): THREE.ShaderMaterial {


  const fragmentShader = fragmentShaderTemplate;

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
    uTexture: { value: texture },
  };
  // border radius value initialize
  setBorderRadius(uniforms.uBorderRadius.value, styles.borderRadius);

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
) {
  const parsedBg = parseColor(styles.backgroundColor);
  const parsedBorder = parseColor(styles.borderColor);

  material.uniforms.uSize.value.set(width, height);

  // material.uniforms.uBorderRadius.value = parsePixelValue(styles.borderRadius);
  setBorderRadius(material.uniforms.uBorderRadius.value, styles.borderRadius);
  material.uniforms.uBorderWidth.value = parsePixelValue(styles.borderWidth);

  material.uniforms.uBgColor.value.copy(parsedBg.color);
  material.uniforms.uBorderColor.value.copy(parsedBorder.color);

  material.uniforms.uOpacity.value = styles.opacity ?? 1.0;
  material.uniforms.uBgOpacity.value = parsedBg.alpha;
  material.uniforms.uBorderOpacity.value = parsedBorder.alpha;
}
