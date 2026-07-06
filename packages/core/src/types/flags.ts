import { ATTR_FILTER } from "./attributes";

export {
  DIRTY_NONE,
  DIRTY_RECT,
  DIRTY_STYLE,
  DIRTY_ZINDEX,
  DIRTY_STRUCTURE,
  DIRTY_CONTENT,
} from "@mirage-engine/dom-tracker";

// Filtering Flag
export const USER_LAYER = 1 << 0;
export const SYSTEM_LAYER = 1 << 1;
export const EXCLUDED = 0;

// Three.js Layer Channels (0 ~ 31)
export const THREE_LAYERS = {
  BASE: 0,
  SELECTED: 1,
  CAPTURE_2: 29,
  CAPTURE_1: 30,
  HIDDEN: 31,
} as const;

export type Visibility = 0 | 1 | 2 | 3;

export const ALLOWED_FILTERS = Object.values(ATTR_FILTER.VALUES);
