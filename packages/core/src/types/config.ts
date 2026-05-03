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


export interface ExtractorConfig {
  includeClasses?: string[]; 
  excludeClasses?: string[];
}

export type CoreConfig = OverlayConfig | DuplicateConfig;