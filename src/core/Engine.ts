import { MirageConfig } from "../types";
import { Renderer } from "../renderer/Renderer";
import { Syncer } from "./Syncer";

export class Engine {
  private renderer: Renderer;
  private syncer: Syncer;
  private target: HTMLElement;

  constructor(target: HTMLElement, config: MirageConfig) {
    this.target = target;
    const container = config.container || this.target.parentElement;
    if (!container) {
      throw new Error("[Mirage] Container element not found.");
    }

    this.renderer = new Renderer(this.target, config);
    this.renderer.mount(container);

    this.syncer = new Syncer(this.target, this.renderer);
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
