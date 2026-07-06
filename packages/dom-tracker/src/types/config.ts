export interface TrackerConfig {
  resizeDebounce?: boolean | {
    delay?: number;
    onStart?: () => void;
    onEnd?: () => void;
  };
}
