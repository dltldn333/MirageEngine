import { CoreConfig } from "../types";
import { Renderer } from "../renderer/Renderer";
import { Syncer } from "./Syncer";
import { MeshRegistry } from "src/animation/MeshRegistry";

export class Engine {
  private renderer: Renderer;
  private syncer: Syncer;
  private target: HTMLElement;
  private registry: MeshRegistry;

  constructor(target: HTMLElement, config: CoreConfig) {
    this.target = target;
    this.registry = new MeshRegistry();

    let mountContainer: HTMLElement | undefined;

    if (config.mode === "duplicate") {
      mountContainer =
        config.container ?? this.target.parentElement ?? undefined;
    } else {
      mountContainer = this.target.parentElement ?? undefined;
    }

    if (!mountContainer) {
      throw new Error("[Mirage] Cannot find a container (parent or option).");
    }

    this.renderer = new Renderer(this.target, config, mountContainer, this.registry);
    this.renderer.mount();
    this.syncer = new Syncer(this.target, this.renderer, config);
  }

  public start() {
    this.syncer.start();
  }

  public stop() {
    this.syncer.stop();
  }
  public dispose() {
    this.syncer.stop();
    this.renderer.dispose();
  }
}
