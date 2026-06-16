import vertexShader from "./base/box-vertex.glsl?raw";
import fragmentShader from "./base/box-fragment.glsl?raw";
import declChunk from "./chunk/decl-chunk.glsl?raw";
import uvChunk from "./chunk/uv-chunk.glsl?raw";
import baseColorChunk from "./chunk/base-color-chunk.glsl?raw";

export const BoxShader = {
  vertexShader,
  fragmentShader,
};

export const BoxChunk = {
  declChunk,
  uvChunk,
  baseColorChunk,
};
