import { TrackerConfig } from "./types/config";
import {
  DIRTY_NONE,
  DIRTY_RECT,
  DIRTY_STRUCTURE,
  DIRTY_CONTENT,
  DIRTY_STYLE,
  StyleData,
} from "./types";
import { extractFromStyle } from "./Parser";

interface InternalResizeConfig {
  enabled: boolean;
  delay: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export class Tracker {
  private target: HTMLElement;
  private observer: MutationObserver;
  private pendingDeletions: Set<HTMLElement> = new Set();
  private pendingStyles: Map<HTMLElement, StyleData> = new Map();

  private isDomDirty: boolean = false;
  private isRunning: boolean = false;

  private pendingMask: number = DIRTY_NONE;

  private mutationTimer: number | null = null;
  private cssTimer: number | null = null;

  private resizeConfig: InternalResizeConfig;
  private resizeTimer: number | null = null;
  private isResizing: boolean = false;

  private lastScrollX: number = 0;
  private lastScrollY: number = 0;
  private scrollTimer: number | null = null;

  public onBeforeRender: Set<() => void> = new Set();
  public onLayoutChange: Set<(mask: number, deletions: Set<HTMLElement>) => void> = new Set();
  public onStyleChange: Set<(styles: Map<HTMLElement, StyleData>) => void> = new Set();
  public onScrollChange: Set<(scrollX: number, scrollY: number) => void> = new Set();
  public onRender: Set<() => void> = new Set();

  constructor(target: HTMLElement, config: TrackerConfig) {
    this.target = target;

    const debounceOpt = config.resizeDebounce ?? true;
    if (debounceOpt === false) {
      this.resizeConfig = { enabled: false, delay: 0 };
    } else if (debounceOpt === true) {
      this.resizeConfig = { enabled: true, delay: 150 };
    } else {
      this.resizeConfig = {
        enabled: true,
        delay: debounceOpt.delay ?? 150,
        onStart: debounceOpt.onStart,
        onEnd: debounceOpt.onEnd,
      };
    }

    this.observer = new MutationObserver((mutations) => {
      let currentMask = DIRTY_NONE;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          currentMask |= DIRTY_STRUCTURE;
          if (mutation.removedNodes.length > 0) {
            mutation.removedNodes.forEach((node) => {
              if (node instanceof HTMLElement) {
                this.pendingDeletions.add(node);
              }
            });
          }
        } else if (mutation.type === "attributes") {
          if (mutation.attributeName === "style") {
            currentMask |= DIRTY_RECT | DIRTY_STYLE;
            const target = mutation.target as HTMLElement;
            const extractedStyleData = extractFromStyle(target.style);
            this.pendingStyles.set(target, extractedStyleData);
          } else if (mutation.attributeName === "class") {
            currentMask |= DIRTY_RECT | DIRTY_STYLE;
          } else if (mutation.attributeName && mutation.attributeName.startsWith("data-")) {
            currentMask |= DIRTY_RECT | DIRTY_STYLE;
          }
        } else if (mutation.type === "characterData") {
          currentMask |= DIRTY_CONTENT | DIRTY_RECT;
        }
      }

      if (currentMask !== DIRTY_NONE) {
        this.pendingMask |= currentMask;

        if (currentMask & DIRTY_STRUCTURE) {
          this.clearTimers();
          this.isDomDirty = true;
          return;
        }
        if (this.mutationTimer) {
          clearTimeout(this.mutationTimer);
        }
        this.mutationTimer = window.setTimeout(() => {
          this.mutationTimer = null;
          this.isDomDirty = true;
        }, 200);
      }
    });
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.observer.observe(this.target, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    this.target.addEventListener("transitionend", this.onTransitionFinished);
    this.target.addEventListener("animationend", this.onTransitionFinished);
    window.addEventListener("resize", this.onWindowResize);

    this.isDomDirty = true;
    this.lastScrollX = window.scrollX;
    this.lastScrollY = window.scrollY;

    this.renderLoop();
  }

  public stop() {
    this.isRunning = false;
    this.observer.disconnect();

    this.clearTimers();

    this.target.removeEventListener("transitionend", this.onTransitionFinished);
    this.target.removeEventListener("animationend", this.onTransitionFinished);
    window.removeEventListener("resize", this.onWindowResize);
  }

  private clearTimers() {
    if (this.mutationTimer) {
      clearTimeout(this.mutationTimer);
      this.mutationTimer = null;
    }
    if (this.cssTimer) {
      clearTimeout(this.cssTimer);
      this.cssTimer = null;
    }
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
  }

  private onTransitionFinished = (e: Event) => {
    if (!this.target.contains(e.target as Node)) return;
    if (this.mutationTimer !== null) return;
    if (this.cssTimer) clearTimeout(this.cssTimer);
    if (this.pendingStyles.size != 0) return;
    this.pendingMask |= DIRTY_RECT | DIRTY_STYLE;
    this.cssTimer = window.setTimeout(() => {
      this.isDomDirty = true;
      this.cssTimer = null;
    }, 50);
  };

  private onWindowResize = () => {
    if (!this.resizeConfig.enabled) {
      this.isDomDirty = true;
      return;
    }
    if (!this.isResizing) {
      this.isResizing = true;
      if (this.resizeConfig.onStart) this.resizeConfig.onStart();
    }
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.isDomDirty = true;
      if (this.resizeConfig.onEnd) this.resizeConfig.onEnd();
      this.isResizing = false;
      this.resizeTimer = null;
    }, this.resizeConfig.delay);
  };

  private renderLoop = () => {
    if (!this.isRunning) return;

    this.onBeforeRender.forEach((cb) => cb());

    if (this.isDomDirty) {
      this.isDomDirty = false;
      this.onLayoutChange.forEach((cb) => cb(this.pendingMask, this.pendingDeletions));
      this.pendingDeletions.clear();
      this.pendingMask = DIRTY_NONE;
    }

    const currentScrollX = window.scrollX;
    const currentScrollY = window.scrollY;
    if (currentScrollX !== this.lastScrollX || currentScrollY !== this.lastScrollY) {
      this.onScrollChange.forEach((cb) => cb(currentScrollX, currentScrollY));

      this.lastScrollX = currentScrollX;
      this.lastScrollY = currentScrollY;

      if (this.scrollTimer) clearTimeout(this.scrollTimer);
      this.scrollTimer = window.setTimeout(() => {
        this.pendingMask |= DIRTY_RECT;
        this.isDomDirty = true;
        this.scrollTimer = null;
      }, 150);
    }

    if (this.pendingStyles.size > 0) {
      this.onStyleChange.forEach((cb) => cb(this.pendingStyles));
      this.pendingStyles.clear();
    }

    this.onRender.forEach((cb) => cb());

    requestAnimationFrame(this.renderLoop);
  };
}
