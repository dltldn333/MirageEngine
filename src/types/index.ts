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
}

export interface SceneNode {
  type: "BOX";
  element: HTMLElement;
  rect: NodeRect;
  styles: BoxStyles;
  dirtyMask: number;
  children: SceneNode[];
}

//Bitmask
export const DIRTY_NONE = 0;
export const DIRTY_RECT = 1 << 0; // 1: x, y, width, height
export const DIRTY_STYLE = 1 << 1; // 2: style
export const DIRTY_ZINDEX = 1 << 2; // 4: zIndex
export const DIRTY_STRUCTURE = 1 << 3; // 8: childNode add / delete
