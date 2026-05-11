export type TextQuality = "low" | "medium" | "high" | number;
export type MirageMode = "overlay" | "duplicate";

export interface FilterConfig {
  includeTree?: string[];
  excludeTree?: string[];
  includeSelf?: string[];
  excludeSelf?: string[];
  exitPoint?: string[];
}

interface BaseConfig {
  debug?: boolean;
  textQuality?: TextQuality;
  style?: {
    zIndex?: string;
  };
  filter?: FilterConfig;
}

export interface OverlayConfig extends BaseConfig {
  mode?: "overlay";
}

export interface DuplicateConfig extends BaseConfig {
  mode: "duplicate";
  container?: HTMLElement;
}

export type CoreConfig = OverlayConfig | DuplicateConfig;
