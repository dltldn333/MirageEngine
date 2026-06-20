// For CanvasRenderingContext2D
export interface TextStyles {
  font: string;
  color: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  direction: CanvasDirection;
  lineHeight: number; // px
  letterSpacing: number; // px
}

export interface BoxStyles {
  backgroundColor: string;
  backgroundImage: string;
  opacity: number;
  zIndex: number;
  borderRadius: string;
  borderColor: string;
  borderWidth: string;
}

export interface ShaderHooks {
  uvModifier?: string; 
  colorModifier?: string; 
}

