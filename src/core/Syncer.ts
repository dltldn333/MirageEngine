import { Renderer } from "../renderer/Renderer";
import { extractSceneGraph } from "../dom/Extractor";
import {
  DIRTY_NONE,
  DIRTY_RECT,
  DIRTY_STRUCTURE,
  DIRTY_STYLE,
  DIRTY_ZINDEX,
} from "@/types";

export class Syncer {
  private target: HTMLElement;
  private renderer: Renderer;
  private observer: MutationObserver;

  private isDomDirty: boolean = false;
  private isRunning: boolean = false;

  private pendingMask: number = DIRTY_NONE;

  private mutationTimer: number | null = null;
  private cssTimer: number | null = null;

  constructor(target: HTMLElement, renderer: Renderer) {
    this.target = target;
    this.renderer = renderer;

    this.observer = new MutationObserver((mutations) => {
      let currentMask = DIRTY_NONE;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          currentMask |= DIRTY_STRUCTURE;
        } else if (mutation.type === "attributes") {
          if (
            mutation.attributeName === "style" ||
            mutation.attributeName === "class"
          ) {
            currentMask |= DIRTY_RECT | DIRTY_STYLE;
          }
        }
      }

      if (currentMask !== DIRTY_NONE) {
        this.pendingMask |= currentMask;

        // Structural Change detected
        if (currentMask & DIRTY_STRUCTURE) {
          this.clearTimers();
          console.log("Structural Change detected");
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

    //DOM observing start
    this.observer.observe(this.target, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    this.target.addEventListener("transitionend", this.onTransitionFinished);
    this.target.addEventListener("animationend", this.onTransitionFinished);

    window.addEventListener("resize", this.onWindowResize);

    this.forceUpdateScene();
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
  }

  private onTransitionFinished = (e: Event) => {
    if (!this.target.contains(e.target as Node)) return;

    if (this.mutationTimer !== null) return;

    if (this.cssTimer) clearTimeout(this.cssTimer);

    this.pendingMask |= DIRTY_RECT | DIRTY_STYLE;

    this.cssTimer = window.setTimeout(() => {
      this.isDomDirty = true;
      this.cssTimer = null;
    }, 50);
  };

  private onWindowResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.isDomDirty = true;
  };

  private forceUpdateScene() {
    this.isDomDirty = false;
    const sceneGraph = extractSceneGraph(this.target, this.pendingMask);

    if (sceneGraph) {
      this.renderer.syncScene(sceneGraph);
    }

    this.pendingMask = DIRTY_NONE;
  }

  private renderLoop = () => {
    if (!this.isRunning) return;

    if (this.isDomDirty) {
      this.forceUpdateScene();
    }

    this.renderer.render();
    requestAnimationFrame(this.renderLoop);
  };
}
