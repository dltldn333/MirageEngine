import * as THREE from "three";
import { BoxStyles } from "./types";

function parsePixelValue(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value) || 0;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uBorderWidth;
  uniform vec3 uColor;
  uniform vec3 uBorderColor;
  uniform float uOpacity;
  uniform float uBgOpacity;

  // SDF 박스 함수
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    // 중심점 기준 좌표 변환
    vec2 p = (vUv - 0.5) * uSize;
    vec2 halfSize = uSize * 0.5;
    
    // SDF 거리 계산
    float d = sdRoundedBox(p, halfSize, uRadius);
    
    // 안티앨리어싱 부드러운 경계 (1px)
    float smoothEdge = 1.0; 

    // 1. 배경(Fill) 알파값 계산
    // 테두리 안쪽(-uBorderWidth)에서부터 흐려짐
    float fillAlpha = 1.0 - smoothstep(-uBorderWidth - smoothEdge, -uBorderWidth, d);
    
    // 2. 테두리(Border) 알파값 계산
    float borderAlpha = 0.0;
    
    // ✨ [핵심 수정] 테두리 두께가 0보다 클 때만 테두리 값을 계산합니다.
    if (uBorderWidth > 0.01) {
      borderAlpha = (1.0 - smoothstep(0.0, smoothEdge, d)) - fillAlpha;
    }

    // 3. 색상 믹싱 (0으로 나누기 방지 포함)
    vec3 color = uColor;
    float totalAlpha = borderAlpha + fillAlpha;
    
    if (totalAlpha > 0.001) {
       // 테두리 비중에 따라 색상 섞기
       color = mix(uColor, uBorderColor, borderAlpha / totalAlpha);
    }
    
    // 4. 최종 알파값 (배경 투명도 적용)
    // 배경은 uBgOpacity를 곱하고, 테두리는 불투명(1.0)하게 유지
    float shapeAlpha = borderAlpha + (fillAlpha * uBgOpacity);
    float finalOpacity = shapeAlpha * uOpacity;
    
    // 투명도 컷오프 (성능 최적화)
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
