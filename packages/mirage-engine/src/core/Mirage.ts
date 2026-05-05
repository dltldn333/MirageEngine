import { MirageConfig } from "@/types";
import { Engine } from "@mirage-engine/core";
import { FilterConfig } from "@mirage-engine/core/"; 

export class Mirage {
  private _engine: Engine;
  private _filterConfig?: FilterConfig;

  constructor(target: HTMLElement, config: MirageConfig, filterConfig?: FilterConfig) {
    if (!target) {
      throw new Error("[Mirage] Target element is required.");
    }
    this._filterConfig = filterConfig;
    this._engine = new Engine(target, config, this._filterConfig);
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
