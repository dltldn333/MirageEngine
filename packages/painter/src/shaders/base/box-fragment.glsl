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

vec4 blendSrcOver(vec4 front, vec4 back) {
  float aOut = front.a + back.a * (1.0 - front.a);
  float safeAlpha = max(aOut, 0.0001);
  vec3 cOut = (front.rgb * front.a + back.rgb * back.a * (1.0 - front.a)) / safeAlpha;
  return vec4(cOut, aOut);
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
