import { CoreConfig } from "../types";
import { Renderer } from "../renderer/Renderer";
import { Syncer } from "./Syncer";
import { FilterConfig } from "../types/config";

export class Engine {
  private renderer: Renderer;
  private syncer: Syncer;
  private target: HTMLElement;
  private filterConfig?: FilterConfig;

  constructor(target: HTMLElement, config: CoreConfig, filterConfig?: FilterConfig) {
    this.target = target;
    this.filterConfig = filterConfig;

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

    this.renderer = new Renderer(this.target, config, mountContainer);

    this.renderer.mount();

    this.syncer = new Syncer(this.target, this.renderer, this.filterConfig);
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
