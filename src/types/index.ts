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
  rect: NodeRect;
  styles: BoxStyles;
  children: SceneNode[];
}
