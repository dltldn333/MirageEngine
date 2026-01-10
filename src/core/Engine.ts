import { MirageConfig } from "../types";
import { Renderer } from "../renderer/Renderer";
import { Syncer } from "./Syncer";

export class Engine {
  private renderer: Renderer;
  private syncer: Syncer;
  private target: HTMLElement;

  constructor(target: HTMLElement, config: MirageConfig) {
    this.target = target;

    this.renderer = new Renderer(this.target);

    // when target duplicate mode
    // const container = config.container || this.target.parentElement!;

    // when screen overlay mode
    const container = config.container || document.body;
    if (container) {
      this.renderer.mount(container);
    }

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
