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
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `

  varying vec2 vUv;
  
  uniform vec2 uSize;
  uniform vec4 uRadius;
  uniform float uBorderWidth;
  uniform vec3 uColor;
  uniform vec3 uBorderColor;
  uniform float uOpacity;
  uniform float uBgOpacity;
  uniform float uBorderOpacity;

  // SDF box
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    // return length(max(q, 0.0)) - r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    // uVu: (0.0, 0.0) ~ (1.0, 1.0) / center: (0.5, 0.5)
    // p: (-1.0, -1.0) ~ (1.0, 1.0) / center: (0.0, 0.0)
    vec2 p = (vUv - 0.5) * uSize;
    vec2 halfSize = uSize * 0.5;
    
    // # border-radius
    vec2 xRadii = mix(uRadius.xw, uRadius.yz, step(0.0, p.x));
    float r = mix(xRadii.y, xRadii.x, step(0.0, p.y));
    float d = sdRoundedBox(p, halfSize, r);

    // 1px blur for anti-aliasing
    float aa = 1.0; 

    // x == 0~aa -> 1
    // x < 0 -> 0 
    // x > aa -> 1
    float bgMask = 1.0 - smoothstep(0.0, aa, d);

    // v valley
    // 10px -> 5
    float halfBorder = uBorderWidth * 0.5;
    // 10px :
    // 0 -> 0
    // -10 -> 0
    // -5 -> -5
    float borderD = abs(d + halfBorder) - halfBorder;
    // ^ border 내부는 음수/외부는 양수

    // [!] 내부가 음수인 곳에서 시작점이 0이면 내부는 안티 얼리어싱 되지 않음.
    // 1에서 빼든 그대로든 상관없이 경계선 밖 1px

    // 최종 alpha를 위해 border 부분에 해당하는 픽셀 만 1로 반환.
    float borderAlpha = (1.0 - smoothstep(0.0, aa, borderD)) * uBorderOpacity; 

    if (uBorderWidth <= 0.01) {
      borderAlpha = 0.0;
    }

    float aFront = borderAlpha;
    float aBack = uBgOpacity;
    float aOut = aFront + aBack * (1.0 - aFront);

    float safeAlpha = max(aOut, 0.0001);
    vec3 cOut = (uBorderColor * aFront + uColor * aBack * (1.0 - aFront)) / safeAlpha;

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

  // console.log(rgbaMatch)

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
): THREE.ShaderMaterial {
  const parsedBg = parseColor(styles.backgroundColor);
  const parsedBorder = parseColor(styles.borderColor);

  // console.log(parsedBorder.color )

  const uniforms = {
    uSize: { value: new THREE.Vector2(width, height) },
    uRadius: { value: new THREE.Vector4(0, 0, 0, 0) },
    uBorderWidth: { value: parsePixelValue(styles.borderWidth) },
    uColor: { value: parsedBg.color },
    uBorderColor: { value: parsedBorder.color },
    uOpacity: { value: styles.opacity ?? 1.0 },
    uBgOpacity: { value: parsedBg.alpha },
    uBorderOpacity: { value: parsedBorder.alpha },
  };
  console.log(parsedBorder.alpha);

  // border radius value initialize
  setBorderRadius(uniforms.uRadius.value, styles.borderRadius);

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

  // material.uniforms.uRadius.value = parsePixelValue(styles.borderRadius);
  setBorderRadius(material.uniforms.uRadius.value, styles.borderRadius);
  material.uniforms.uBorderWidth.value = parsePixelValue(styles.borderWidth);

  material.uniforms.uColor.value.copy(parsedBg.color);
  material.uniforms.uBorderColor.value.copy(parsedBorder.color);

  material.uniforms.uOpacity.value = styles.opacity ?? 1.0;
  material.uniforms.uBgOpacity.value = parsedBg.alpha;
  material.uniforms.uBorderOpacity.value = parsedBorder.alpha;
}
