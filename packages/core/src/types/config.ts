export type Quality = "low" | "medium" | "high" | number;
export type LayerTarget = "base" | "sellected"
export type MirageMode = "overlay" | "duplicate";
export type PxUnit = `${number}px`;
export type PercentUnit = `${number}%`;
export type travelerClipArea = PxUnit | PercentUnit | number;
export interface ResizeConfig {
  delay?: number;
  onStart?: () => void;
  onEnd?: () => void;
}



interface BaseConfig {
  debug?: boolean;
  layer?: number | LayerTarget;
  quality?: Quality;
  style?: {
    zIndex?: string;
  };
  resizeDebounce?: boolean | ResizeConfig;
  travelerClipArea?: travelerClipArea;
}

export interface OverlayConfig extends BaseConfig {
  mode?: "overlay";
}

export interface DuplicateConfig extends BaseConfig {
  mode: "duplicate";
  container?: HTMLElement;
}

export type CoreConfig = OverlayConfig | DuplicateConfig;
