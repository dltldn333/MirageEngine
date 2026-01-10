import { Renderer } from "../renderer/Renderer";
import { Syncer } from "./Syncer";

export class Mirage {
  private renderer: Renderer;
  private syncer: Syncer;
  private target: HTMLElement;

  constructor(target: HTMLElement, container?: HTMLElement) {
    if (!target) {
      throw new Error(`[Mirage] Target element is null or undefined.`);
    }
    this.target = target;

    this.renderer = new Renderer(this.target);

    // when target duplicate mode
    // this.renderer.mount(container ? container : this.target.parentElement!);

    // when screen overlay mode
    this.renderer.mount(container ? container : this.target.parentElement!);
    
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
