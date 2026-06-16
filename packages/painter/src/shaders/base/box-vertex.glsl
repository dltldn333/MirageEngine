varying vec2 vUv;
varying vec4 vScreenPos;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vScreenPos = gl_Position;
}