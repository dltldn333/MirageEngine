export type Quality = "low" | "medium" | "high" | number;
export type MirageMode = "overlay" | "duplicate";
export interface FilterConfig {
  includeTree?: string[];
  excludeTree?: string[];
  includeSelf?: string[];
  excludeSelf?: string[];
  end?: string[];
}

export interface ResizeConfig {
  delay?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

interface BaseConfig {
  debug?: boolean;
  quality?: Quality;
  style?: {
    zIndex?: string;
  };
  filter?: FilterConfig;
  resizeDebounce?: boolean | ResizeConfig;
}

export interface OverlayConfig extends BaseConfig {
  mode?: "overlay";
}

export interface DuplicateConfig extends BaseConfig {
  mode: "duplicate";
  container?: HTMLElement;
}

export type CoreConfig = OverlayConfig | DuplicateConfig;
