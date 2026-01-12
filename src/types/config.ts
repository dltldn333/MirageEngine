export type TextQuality = "low" | "medium" | "high" | number;
export type MirageMode = "overlay" | "piece";

export interface MirageConfig {
  container?: HTMLElement;
  debug?: boolean;
  textQuality?: TextQuality;
  /**
   * Rendering mode
   * @default 'overlay'
   */
  mode?: MirageMode;
}
