//Bitmask Flags
export const DIRTY_NONE = 0;
export const DIRTY_RECT = 1 << 0; // 1: x, y, width, height (00000001)
export const DIRTY_STYLE = 1 << 1; // 2: style (00000010)
export const DIRTY_ZINDEX = 1 << 2; // 4: zIndex (00000100)
export const DIRTY_STRUCTURE = 1 << 3; // 8: childNode add / delete (00001000)
export const DIRTY_CONTENT = 1 << 4; // 16: text content changed (00010000)

// Filtering Flag
export const USER_LAYER = 1 << 0;
export const SYSTEM_LAYER = 1 << 1;
export const EXCLUDED = 0;

// Three.js Layer Channels (0 ~ 31)
export const THREE_LAYERS = {
  BASE: 0,
  TRAVELER: 1,
  CAPTURE_2: 29,
  CAPTURE_1: 30,
  HIDDEN: 31,
} as const;

export type Visibility = 0 | 1 | 2 | 3;

export const ALLOWED_FILTERS = [
  "include-tree",
  "exclude-tree",
  "include-self",
  "exclude-self",
  "end",
];
