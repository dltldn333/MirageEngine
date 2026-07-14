export type Quality = "low" | "medium" | "high" | number;
export type LayerTarget = "base" | "selected"
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
  /**
   * Defines the render size of the canvas and camera behavior.
   * 'viewport' (default) is optimized for long scrollable pages by allocating canvas size 
   * to the current screen viewport only, significantly improving performance (60fps).
   * 'document' allocates the canvas size to match the full height of the target element,
   * which can cause performance drops on very tall documents but might be necessary 
   * for specific visual needs.
   */
  canvasSize?: "viewport" | "document";
}

export interface DuplicateConfig extends BaseConfig {
  mode: "duplicate";
  container?: HTMLElement;
}

export type CoreConfig = OverlayConfig | DuplicateConfig;
