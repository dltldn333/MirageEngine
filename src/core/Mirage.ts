import { Renderer } from "../renderer/Renderer";
import { Syncer } from "./Syncer";

export class Mirage {
  private renderer: Renderer;
  private syncer: Syncer;
  private target: HTMLElement;

  constructor(selector: string) {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      throw new Error(`[Mirage] Element not found: ${selector}`);
    }
    this.target = el;

    this.renderer = new Renderer();
    this.renderer.mount(document.body);
    this.syncer = new Syncer(this.target, this.renderer);
  }

  public start() {
    this.syncer.start();
  }

  public stop() {
    this.syncer.stop();
    this.renderer.dispose();
  }
}
