import { CoreConfig } from "../types/config";
import { Renderer } from "../renderer/Renderer";
import { MeshRegistry } from "../store/MeshRegistry";
import { extractSceneGraph } from "../dom/Extractor";
import { Visibility, USER_LAYER, ATTR_TRAVEL } from "../types";
import { animateMeshByData, updateFixedMeshesScroll } from "../animation/Animator";
import { Tracker } from "@mirage-engine/dom-tracker";

export class Syncer {
  private target: HTMLElement;
  private renderer: Renderer;
  private registry: MeshRegistry;
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

    // Use Tracker from dom-tracker
    this.tracker = new Tracker(target, {
      resizeDebounce: config.resizeDebounce,
    });

    // Wire up the hooks
    this.tracker.onLayoutChange.add((pendingMask, pendingDeletions) => {
      const discoveredTraveler =
        document.querySelector(`[${ATTR_TRAVEL.NAME}~='${ATTR_TRAVEL.VALUES.TRAVELER}']`) !== null;
      if (discoveredTraveler && !this.isTravelEnabled) {
        this.isTravelEnabled = true;
        this.renderer.createRenderTarget();
      }

      const sceneGraph = extractSceneGraph(
        this.target,
        pendingMask,
        USER_LAYER as Visibility,
        1,
        0,
        this.renderer.qualityFactor
      );

      if (sceneGraph) {
        this.renderer.syncScene(sceneGraph, pendingDeletions);
      }
    });

    this.tracker.onScrollChange.add((scrollX, scrollY) => {
      updateFixedMeshesScroll(this.renderer.fixedMeshes, scrollX, scrollY);
      this.renderer.updateCameraScroll(scrollX, scrollY);
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
    updateFixedMeshesScroll(this.renderer.fixedMeshes, window.scrollX, window.scrollY);
    this.renderer.updateCameraScroll(window.scrollX, window.scrollY);
  }

  public stop() {
    this.tracker.stop();
  }
}
