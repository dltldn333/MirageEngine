import { TextStyles, BoxStyles } from "@mirage-engine/painter";

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
  children: SceneNode[];
}

