import * as THREE from "three";

export function parsePixelValue(value: string | number, baseSize: number = 0): number {
  if (typeof value === "number") return value;
  const num = parseFloat(value) || 0;
  if (typeof value === "string" && value.includes("%")) {
    return (num / 100) * baseSize;
  }
  return num;
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

export function splitByComma(str: string) {
  const result = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current) result.push(current.trim());
  return result;
}

export function parseLinearGradient(value: string | null | undefined) {
  if (!value || typeof value !== "string" || !value.includes("linear-gradient")) return null;

  const match = value.match(/linear-gradient\((.*)\)/);
  if (!match) return null;

  const content = match[1];
  const parts = splitByComma(content);

  let angle = Math.PI; // default: to bottom
  let firstStopIndex = 0;

  const firstPart = parts[0].trim();
  if (firstPart.startsWith("to ")) {
    if (firstPart === "to top") angle = 0;
    else if (firstPart === "to right") angle = Math.PI / 2;
    else if (firstPart === "to bottom") angle = Math.PI;
    else if (firstPart === "to left") angle = Math.PI * 1.5;
    else if (firstPart === "to top right" || firstPart === "to right top")
      angle = Math.PI / 4;
    else if (
      firstPart === "to bottom right" ||
      firstPart === "to right bottom"
    )
      angle = Math.PI * 0.75;
    else if (firstPart === "to bottom left" || firstPart === "to left bottom")
      angle = Math.PI * 1.25;
    else if (firstPart === "to top left" || firstPart === "to left top")
      angle = Math.PI * 1.75;
    firstStopIndex = 1;
  } else if (
    firstPart.endsWith("deg") ||
    firstPart.endsWith("rad") ||
    firstPart.endsWith("turn")
  ) {
    const num = parseFloat(firstPart);
    if (firstPart.endsWith("deg")) angle = num * (Math.PI / 180);
    else if (firstPart.endsWith("rad")) angle = num;
    else if (firstPart.endsWith("turn")) angle = num * Math.PI * 2;
    firstStopIndex = 1;
  }

  const stops = [];
  for (let i = firstStopIndex; i < parts.length; i++) {
    if (stops.length >= 8) break;
    const part = parts[i].trim();
    const lastSpace = part.lastIndexOf(" ");
    let colorStr = part;
    let stopPos = null;

    if (lastSpace !== -1 && !part.endsWith(")")) {
      const possiblePos = part.substring(lastSpace + 1);
      if (
        possiblePos.endsWith("%") ||
        possiblePos.endsWith("px") ||
        !isNaN(parseFloat(possiblePos))
      ) {
        colorStr = part.substring(0, lastSpace).trim();
        stopPos = possiblePos;
      }
    }

    const parsedColor = parseColor(colorStr);
    stops.push({
      color: parsedColor.color,
      alpha: parsedColor.alpha,
      rawStop: stopPos,
      stop: 0,
    });
  }

  if (stops.length > 0) {
    for (let i = 0; i < stops.length; i++) {
      if (stops[i].rawStop !== null) {
        stops[i].stop = parseFloat(stops[i].rawStop!) / 100;
      }
    }

    if (stops[0].rawStop === null) stops[0].stop = 0.0;

    if (stops.length > 1) {
      if (stops[stops.length - 1].rawStop === null) stops[stops.length - 1].stop = 1.0;
    }

    let lastKnownIndex = 0;
    for (let i = 1; i < stops.length; i++) {
      if (stops[i].rawStop !== null || i === stops.length - 1) {
        const diff = i - lastKnownIndex;
        if (diff > 1) {
          const startVal = stops[lastKnownIndex].stop;
          const endVal = stops[i].stop;
          const step = (endVal - startVal) / diff;
          for (let j = 1; j < diff; j++) {
            stops[lastKnownIndex + j].stop = startVal + step * j;
          }
        }
        lastKnownIndex = i;
      }
    }
  }

  return { angle, stops };
}

export function parseBoxShadow(value: string | null | undefined) {
  if (!value || value === "none") return null;

  const shadows = splitByComma(value);
  if (shadows.length === 0) return null;
  const shadowStr = shadows[0].trim();

  const colorRegex = /(rgba?\([^)]+\)|#[0-9a-fA-F]+|[a-zA-Z]+)/;
  const colorMatch = shadowStr.match(colorRegex);
  
  let colorStr = "transparent";
  let restStr = shadowStr;
  
  if (colorMatch && colorMatch[1] !== 'inset') {
    const c = colorMatch[1];
    if (c.startsWith("rgb") || c.startsWith("#") || c === "black" || c === "white" || c === "transparent") {
       colorStr = c;
       restStr = shadowStr.replace(c, "").trim();
    }
  }

  restStr = restStr.replace("inset", "").trim();
  const lengths = restStr.split(/\s+/).map(s => parseFloat(s) || 0);
  
  const offsetX = lengths[0] || 0;
  const offsetY = lengths[1] || 0;
  const blurRadius = lengths[2] || 0;
  const spreadRadius = lengths[3] || 0;

  const color = parseColor(colorStr);

  return { offsetX, offsetY, blurRadius, spreadRadius, color: color.color, alpha: color.alpha };
}
