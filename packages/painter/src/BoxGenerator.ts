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
  
  uniform vec2 uSize;          // box size (width, height)
  uniform float uRadius;       // border radius
  uniform float uBorderWidth;  // border width
  uniform vec3 uColor;         // background color (RGB)
  uniform vec3 uBorderColor;   // border color (RGB)
  uniform float uOpacity;      // opacity
  uniform float uBgOpacity;    // background opacity

  // SDF function : Rounded Box
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  void main() {
    // 중심점(0,0) 기준 좌표계 변환
    vec2 p = (vUv - 0.5) * uSize;
    vec2 halfSize = uSize * 0.5;
    
    // 거리 계산 (d = 0: 표면, d < 0: 내부)
    float d = sdRoundedBox(p, halfSize, uRadius);
    
    // 안티에일리어싱 (부드러운 경계)
    float smoothEdge = 1.0; 

    // 1. 내부 영역 (Fill)
    // d < -uBorderWidth 인 영역이 진짜 내부
    float fillAlpha = 1.0 - smoothstep(-uBorderWidth - smoothEdge, -uBorderWidth, d);
    
    // 2. 테두리 영역 (Border)
    // -uBorderWidth < d < 0 인 영역
    float borderAlpha = (1.0 - smoothstep(0.0, smoothEdge, d)) 
                      - fillAlpha; 
                      
    // 색상 합성
    // 테두리 부분이면 테두리색, 아니면 배경색
    vec3 color = mix(uColor, uBorderColor, borderAlpha / (borderAlpha + fillAlpha + 0.001));
    
    // 최종 알파값 계산
    // 테두리는 불투명(1.0), 배경은 uBgOpacity 적용
    float shapeAlpha = borderAlpha + (fillAlpha * uBgOpacity);
    
    // 전체 투명도 적용
    float alpha = shapeAlpha * uOpacity;
    
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

export function createBoxMaterial(
  styles: BoxStyles,
  width: number,
  height: number
): THREE.ShaderMaterial {
  // CSS 색상 파싱
  const bgColor = new THREE.Color(styles.backgroundColor || "#000000");
  const bdColor = new THREE.Color(styles.borderColor || "#000000");
  
  // 배경색이 투명("transparent" or rgba(x,x,x,0))인지 확인 필요하지만
  // Three.js Color는 알파를 버리므로, 일단 1.0으로 둠 (추후 정교화 가능)
  const bgOpacity = styles.backgroundColor === "transparent" ? 0.0 : 1.0;

  const uniforms = {
    uSize: { value: new THREE.Vector2(width, height) },
    uRadius: { value: parsePixelValue(styles.borderRadius) },
    uBorderWidth: { value: parsePixelValue(styles.borderWidth) },
    uColor: { value: bgColor },
    uBorderColor: { value: bdColor },
    uOpacity: { value: styles.opacity ?? 1.0 },
    uBgOpacity: { value: bgOpacity },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    side: THREE.FrontSide, // 성능 최적화 (뒷면 그리지 않음)
  });

  return material;
}

/**
 * [V3 대비용] 실시간 업데이트 함수
 * 텍스처를 재생성하지 않고 Uniform 값만 바꿔서 스타일을 변경합니다.
 */
export function updateBoxMaterial(
  material: THREE.ShaderMaterial,
  styles: BoxStyles,
  width: number,
  height: number
) {
  material.uniforms.uSize.value.set(width, height);
  material.uniforms.uRadius.value = parsePixelValue(styles.borderRadius);
  material.uniforms.uBorderWidth.value = parsePixelValue(styles.borderWidth);
  material.uniforms.uColor.value.set(styles.backgroundColor);
  material.uniforms.uBorderColor.value.set(styles.borderColor);
  material.uniforms.uOpacity.value = styles.opacity ?? 1.0;
}