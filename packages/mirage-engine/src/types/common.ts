import { TextStyles } from "@mirage-engine/painter";

export type NodeType = "BOX" | "TEXT"

export interface NodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoxStyles {
  backgroundColor: string;
  opacity: number;
  zIndex: number;

  borderRadius: string;
  borderColor: string;
  borderWidth: string;
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

