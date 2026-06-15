import * as THREE from "three";

export function parsePixelValue(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value) || 0;
}

export function parseColor(colorStr: string) {
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
