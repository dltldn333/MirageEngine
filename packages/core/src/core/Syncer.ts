import { CoreConfig } from "../types/config";
import { Renderer } from "../renderer/Renderer";
import { MeshRegistry } from "../store/MeshRegistry";
import { extractSceneGraph } from "../dom/Extractor";
import { Visibility, USER_LAYER, ATTR_TRAVEL, WASM_STRIDE } from "../types";
import { animateMeshByData } from "../animation/Animator";
import { Tracker } from "@mirage-engine/dom-tracker";
import { WasmSynchronizer } from "../wasm/WasmSynchronizer";

export class Syncer {
  private target: HTMLElement;
  private renderer: Renderer;
  private registry: MeshRegistry;
  private isTravelEnabled: boolean = false;
  private wasmSync: WasmSynchronizer;
  
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
    this.wasmSync = new WasmSynchronizer();

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

      const sharedArray = this.wasmSync.sharedArray;
      const extractContext = sharedArray ? { sharedArray, currentIndex: 0 } : undefined;

      const sceneGraph = extractSceneGraph(
        this.target,
        pendingMask,
        USER_LAYER as Visibility,
        1,
        0,
        this.renderer.qualityFactor,
        undefined,
        undefined,
        undefined,
        extractContext
      );

      if (sceneGraph) {
        this.renderer.syncScene(sceneGraph, pendingDeletions);
      }
    });

    this.tracker.onStyleChange.add((pendingStyles) => {
      animateMeshByData(this.registry, pendingStyles);
    });

    this.tracker.onRender.add(() => {
      this.renderer.syncMeshesByDOM();
      this.renderer.render();
    });
  }

  public async start() {
    // 10000개 노드 분량의 공유 메모리를 넉넉하게 선행 할당 (1-Pass 위함)
    await this.wasmSync.initialize(10000 * WASM_STRIDE);
    this.tracker.start();
  }

  public stop() {
    this.tracker.stop();
  }
}
