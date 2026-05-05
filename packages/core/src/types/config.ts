export type TextQuality = "low" | "medium" | "high" | number;
export type MirageMode = "overlay" | "duplicate";

interface BaseConfig {
  debug?: boolean;
  textQuality?: TextQuality;
  style?: {
    zIndex?: string;
  };
}

export interface OverlayConfig extends BaseConfig {
  mode?: "overlay"; 
}

export interface DuplicateConfig extends BaseConfig {
  mode: "duplicate"; 
  container?: HTMLElement; 
}


// Extractor Config -> conditional의 의미를 포함하는 형태로 변경
export interface ExtractorConfig {
  includeTree?: string[]; 

  excludeTree?: string[];
  
}

export type CoreConfig = OverlayConfig | DuplicateConfig;