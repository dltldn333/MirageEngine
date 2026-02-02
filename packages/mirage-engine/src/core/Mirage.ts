import { MirageConfig } from "@/types";
import { Engine } from "@mirage-engine/core";

export class Mirage {
  private _engine: Engine;

  constructor(element: HTMLElement, config: MirageConfig = {}) {
    if (!element) {
      throw new Error("[Mirage] Target element is required.");
    }
    this._engine = new Engine(element, config);
  }

  public start(): void {
    this._engine.start();
  }

  public stop(): void {
    this._engine.stop();
  }

  public destroy(): void {
    this._engine.dispose();
  }
}
