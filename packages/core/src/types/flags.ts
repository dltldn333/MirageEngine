//Bitmask Flags
export const DIRTY_NONE = 0;
export const DIRTY_RECT = 1 << 0; // 1: x, y, width, height (00000001)
export const DIRTY_STYLE = 1 << 1; // 2: style (00000010)
export const DIRTY_ZINDEX = 1 << 2; // 4: zIndex (00000100)
export const DIRTY_STRUCTURE = 1 << 3; // 8: childNode add / delete (00001000)
export const DIRTY_CONTENT = 1 << 4;   // 16: text content changed (00010000)

// Filtering Flag
export const EXCLUDED = 0;
export const INCLUDED = 1;

// 다른 파일에서 파라미터 타입 지정용으로 사용
export type Visibility = typeof EXCLUDED | typeof INCLUDED;

export type MirageFilter = 
  | 'include-tree' 
  | 'exclude-tree' 
  | 'include-self' 
  | 'exclude-self' 
  | 'end';