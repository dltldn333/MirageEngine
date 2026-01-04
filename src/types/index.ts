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

// For CanvasRenderingContext2D
export interface TextStyles {
  font: string;
  color: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  direction: CanvasDirection;
  lineHeight: number;    // px
  letterSpacing: number; // px
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

//Bitmask Flags
export const DIRTY_NONE = 0;
export const DIRTY_RECT = 1 << 0; // 1: x, y, width, height (00000001)
export const DIRTY_STYLE = 1 << 1; // 2: style (00000010)
export const DIRTY_ZINDEX = 1 << 2; // 4: zIndex (00000100)
export const DIRTY_STRUCTURE = 1 << 3; // 8: childNode add / delete (00001000)
export const DIRTY_CONTENT = 1 << 4;   // 16: text content changed (00010000)
