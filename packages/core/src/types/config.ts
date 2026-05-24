export type Quality = "low" | "medium" | "high" | number;
export type MirageMode = "overlay" | "duplicate";
export type PxUnit = `${number}px`;
export type PercentUnit = `${number}%`;
export type travelerClipArea = PxUnit | PercentUnit | number;
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
  travelerClipArea? : travelerClipArea;
}

export interface OverlayConfig extends BaseConfig {
  mode?: "overlay";
}

export interface DuplicateConfig extends BaseConfig {
  mode: "duplicate";
  container?: HTMLElement;
}

export type CoreConfig = OverlayConfig | DuplicateConfig;
