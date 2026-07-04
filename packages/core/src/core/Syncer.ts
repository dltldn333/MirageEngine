import { CoreConfig } from "../types/config";
import { Renderer } from "../renderer/Renderer";
import { MeshRegistry } from "../store/MeshRegistry";
import { extractSceneGraph } from "../dom/Extractor";
import { Visibility, USER_LAYER, SYSTEM_LAYER } from "../types";
import { animateMeshByData, updateFixedMeshesScroll } from "../animation/Animator";
import { Tracker } from "@mirage-engine/dom-tracker";

export class Syncer {
  private target: HTMLElement;
  private renderer: Renderer;
  private registry: MeshRegistry;
  private filter: CoreConfig["filter"];
  private isTravelEnabled: boolean = false;
  
  public tracker: Tracker;

  constructor(
    target: HTMLElement,
    renderer: Renderer,
    registry: MeshRegistry,
    config: CoreConfig,
  ) {
    this.target = target;
    this.renderer = renderer;
    this.registry = registry;
    this.filter = config.filter;

    // Use Tracker from dom-tracker
    this.tracker = new Tracker(target, {
      resizeDebounce: config.resizeDebounce,
    });

    // Wire up the hooks
    this.tracker.onLayoutChange.add((pendingMask, pendingDeletions) => {
      const discoveredTraveler =
        document.querySelector("[data-mirage-travel~='traveler']") !== null;
      if (discoveredTraveler && !this.isTravelEnabled) {
        this.isTravelEnabled = true;
        this.renderer.createRenderTarget();
      }

      const sceneGraph = extractSceneGraph(
        this.target,
        pendingMask,
        (discoveredTraveler
          ? USER_LAYER | SYSTEM_LAYER
          : USER_LAYER) as Visibility,
        this.filter,
      );

      if (sceneGraph) {
        this.renderer.syncScene(sceneGraph, pendingDeletions);
      }
    });

    this.tracker.onScrollChange.add((scrollX, scrollY) => {
      updateFixedMeshesScroll(this.renderer.fixedMeshes, scrollX, scrollY);
    });

    this.tracker.onStyleChange.add((pendingStyles) => {
      animateMeshByData(this.registry, pendingStyles);
    });

    this.tracker.onRender.add(() => {
      this.renderer.render();
    });
  }

  public start() {
    this.tracker.start();
  }

  public stop() {
    this.tracker.stop();
  }
}
