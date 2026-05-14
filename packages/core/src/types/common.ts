import { TextStyles, BoxStyles } from "@mirage-engine/painter";
import { Visibility } from "./flags";

export type NodeType = "BOX" | "TEXT"

export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneNode {
  id: string;
  type: NodeType;
  element: HTMLElement;
  
  rect: NodeRect;
  styles: BoxStyles;

  textContent?: string;
  textStyles?: TextStyles;

  dirtyMask: number;
  // TODO: SceneNode의 sort 로직 추가(아마도)

  visibility: Visibility;
  
  children: SceneNode[];
}

