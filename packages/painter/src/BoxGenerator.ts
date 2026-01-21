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
    vec2 p = (vUv - 0.5) * uSize;
    vec2 halfSize = uSize * 0.5;
    
    float d = sdRoundedBox(p, halfSize, uRadius);
    
    float smoothEdge = 1.0; 

    float fillAlpha = 1.0 - smoothstep(-uBorderWidth - smoothEdge, -uBorderWidth, d);
    
    float borderAlpha = (1.0 - smoothstep(0.0, smoothEdge, d)) 
                      - fillAlpha; 
                      
    vec3 color = mix(uColor, uBorderColor, borderAlpha / (borderAlpha + fillAlpha + 0.001));
    
    float shapeAlpha = borderAlpha + (fillAlpha * uBgOpacity);
    
    float alpha = shapeAlpha * uOpacity;
    
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, alpha);
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
  height: number
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
