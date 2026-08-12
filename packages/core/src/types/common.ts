import { TextStyles, BoxStyles, ShaderHooks } from "@mirage-engine/painter";
import { Visibility } from "./flags";

export type NodeType = "BOX" | "TEXT";

export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const WASM_STRIDE = 5;
export const OFFSET_PARENT = 0;
export const OFFSET_LOCAL_X = 1;
export const OFFSET_LOCAL_Y = 2;
export const OFFSET_WORLD_X = 3;
export const OFFSET_WORLD_Y = 4;

export interface SceneNode {
  id: string;
  type: NodeType;
  element: HTMLElement;

  rect: NodeRect;
  styles: BoxStyles;

  textContent?: string;
  textStyles?: TextStyles;
  textLines?: { text: string; rect: NodeRect }[];

  dirtyMask: number;
  // TODO: SceneNode의 sort 로직 추가(아마도)

  visibility: Visibility;
  isTraveler: boolean;
  captureLayer: number;
  nativeLayer?: number;
  nativeStyles?: BoxStyles | TextStyles;
  nativeRect?: NodeRect;
  isFixed: boolean;
  shaderHooks?: ShaderHooks;
  clipElements?: HTMLElement[];

  wasmIndex?: number;

  children: SceneNode[];
}
