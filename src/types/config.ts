export type TextQuality = "low" | "medium" | "high" | number;

export interface MirageConfig {
  container?: HTMLElement;
  debug?: boolean;

  textQuality?: TextQuality;
}