varying vec2 vUv;
uniform vec2 uSize;
uniform vec4 uBorderRadius;
uniform float uBorderWidth;
uniform vec4 uBgColor;
uniform vec4 uBorderColor;
uniform float uOpacity;

uniform int uGradientCount;
uniform float uGradientAngle;
uniform vec4 uGradientColors[8];
uniform float uGradientStops[8];

#INJECT_DECLARATIONS

vec3 linearToSrgb(vec3 linearColor) {
    vec3 linearPart = 12.92 * linearColor;
    vec3 curvePart = 1.055 * pow(linearColor, vec3(1.0 / 2.4)) - 0.055;
    vec3 switchCondition = step(vec3(0.0031308), linearColor);
    return mix(linearPart, curvePart, switchCondition);
}

vec3 srgbToLinear(vec3 srgbColor) {
    vec3 linearPart = srgbColor / 12.92;
    vec3 curvePart = pow((srgbColor + vec3(0.055)) / 1.055, vec3(2.4));
    vec3 switchCondition = step(vec3(0.04045), srgbColor);
    return mix(linearPart, curvePart, switchCondition);
}

vec4 blendSrcOverInLinear(vec4 front, vec4 back) {
  front.rgb = srgbToLinear(front.rgb);
  back.rgb  = srgbToLinear(back.rgb);
  float aOut = front.a + back.a * (1.0 - front.a);
  float safeAlpha = max(aOut, 0.0001);
  vec3 cOut = (front.rgb * front.a + back.rgb * back.a * (1.0 - front.a)) / safeAlpha;
  return vec4(linearToSrgb(cOut), aOut);
}

vec4 blendSrcOver(vec4 front, vec4 back) {
  float aOut = front.a + back.a * (1.0 - front.a);
  float safeAlpha = max(aOut, 0.0001);
  vec3 cOut = (front.rgb * front.a + back.rgb * back.a * (1.0 - front.a)) / safeAlpha;
  return vec4(cOut, aOut);
}

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

vec4 calculateGradientLayer(vec2 uv) {
  if (uGradientCount < 2) return uGradientColors[0];

  vec2 dir = vec2(sin(uGradientAngle), cos(uGradientAngle));
  vec2 p = (uv - 0.5) * uSize;
  float proj = dot(p, dir);
  float L = abs(uSize.x * dir.x) + abs(uSize.y * dir.y);
  float t = clamp((proj / L) + 0.5, 0.0, 1.0);
  
  vec4 color = uGradientColors[0];
  for (int i = 1; i < 8; i++) {
    if (i >= uGradientCount) break;
    float prevStop = uGradientStops[i-1];
    float currStop = uGradientStops[i];
    
    float factor = clamp((t - prevStop) / (currStop - prevStop + 0.00001), 0.0, 1.0);
    color = mix(color, uGradientColors[i], factor);
  }
  // return vec4(linearToSrgb(color.rgb), color.a);
  return vec4(color);
}

void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec2 halfSize = uSize * 0.5;

  #INJECT_UV_MODIFIER

  // color decision pipeline
  vec4 baseColor = vec4(uBgColor.rgb, uBgColor.a);

  if (uGradientCount > 0) {
    vec4 gradColor = calculateGradientLayer(vUv);
    baseColor = blendSrcOver(gradColor, baseColor);
  }

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
  float borderAlpha = (1.0 - smoothstep(0.0, 1.0, borderD)) * uBorderColor.a; 
  if (uBorderWidth <= 0.01) {
    borderAlpha = 0.0;
  }

  // final blending (border + background) using blendSrcOver
  vec4 borderLayer = vec4(uBorderColor.rgb, borderAlpha);
  vec4 finalColor = blendSrcOver(borderLayer, baseColor);
  // final color control (Tint, Noise)
  #INJECT_COLOR_MODIFIER

  float finalOpacity = finalColor.a * bgMask * uOpacity;
  if (finalOpacity < 0.001) discard;

  gl_FragColor = vec4(finalColor.rgb, finalOpacity);


  // #include <colorspace_fragment>
}
