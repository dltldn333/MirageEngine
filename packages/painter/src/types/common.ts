// For CanvasRenderingContext2D
export interface TextStyles {
  font: string;
  fontSize :string;
  color: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  direction: CanvasDirection;
  lineHeight: number; // px
  letterSpacing: number; // px
  transform?: string;
}

export interface BoxStyles {
  backgroundColor: string;
  backgroundImage: string;
  imageSrc?: string;
  isTraveler?: boolean;
  opacity: number;
  zIndex: number;
  borderRadius: string;
  borderColor: string;
  borderWidth: string;
  transform?: string;
  boxShadow?: string;
}

export interface ShaderHooks {
  uvModifier?: string; 
  colorModifier?: string; 
  uniforms?: Record<string, any>;
}

