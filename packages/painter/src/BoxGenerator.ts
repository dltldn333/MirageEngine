import * as THREE from "three";
import { BoxStyles } from "./types";

function parsePixelValue(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value) || 0;
}

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `

  varying vec2 vUv;
  
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uBorderWidth;
  uniform vec3 uColor;
  uniform vec3 uBorderColor;
  uniform float uOpacity;
  uniform float uBgOpacity;

  // SDF box
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    // uVu: (0.0, 0.0) ~ (1.0, 1.0) / center: (0.5, 0.5)
    // p: (-1.0, -1.0) ~ (1.0, 1.0) / center: (0.0, 0.0)
    vec2 p = (vUv - 0.5) * uSize;
    vec2 halfSize = uSize * 0.5;
    
    // # border-radius
    // d == distance (returned border radius distance)
    float d = sdRoundedBox(p, halfSize, uRadius);
    
    // 1px blur for anti-aliasing
    float aa = 1.0; 

    // Alpha == visible (0 or 1(without smootstep))

    // fill area
    float fillAlpha = 1.0 - smoothstep(-uBorderWidth - aa, -uBorderWidth, d);
    
    // border area
    float borderAlpha = 0.0;
    
    // if has border
    if (uBorderWidth > 0.01) {
      // entire - fill
      borderAlpha = (1.0 - smoothstep(0.0, aa, d)) - fillAlpha;
    }


    vec3 color = uColor;
    float totalAlpha = borderAlpha + fillAlpha;
    
    if (totalAlpha > 0.001) {
       color = mix(uColor, uBorderColor, borderAlpha / totalAlpha);
    }
    
    float shapeAlpha = borderAlpha + (fillAlpha * uBgOpacity);
    float finalOpacity = shapeAlpha * uOpacity;
    
    if (finalOpacity < 0.001) discard;

    gl_FragColor = vec4(color, finalOpacity);
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
): THREE.ShaderMaterial {
  const parsedBg = parseColor(styles.backgroundColor);
  const parsedBorder = parseColor(styles.borderColor);

  const uniforms = {
    uSize: { value: new THREE.Vector2(width, height) },
    uRadius: { value: parsePixelValue(styles.borderRadius) },
    uBorderWidth: { value: parsePixelValue(styles.borderWidth) },
    uColor: { value: parsedBg.color },
    uBorderColor: { value: parsedBorder.color },
    uOpacity: { value: styles.opacity ?? 1.0 },
    uBgOpacity: { value: parsedBg.alpha },
  };

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

  material.uniforms.uRadius.value = parsePixelValue(styles.borderRadius);
  material.uniforms.uBorderWidth.value = parsePixelValue(styles.borderWidth);

  material.uniforms.uColor.value.copy(parsedBg.color);
  material.uniforms.uBorderColor.value.copy(parsedBorder.color);

  material.uniforms.uOpacity.value = styles.opacity ?? 1.0;
  material.uniforms.uBgOpacity.value = parsedBg.alpha;
}
