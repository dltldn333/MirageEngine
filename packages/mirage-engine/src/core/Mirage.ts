import { MirageConfig } from "@/types";
import { Engine } from "@mirage-engine/core";
import { ExtractorConfig } from "@mirage-engine/core/"; 

export class Mirage {
  private _engine: Engine;
  private _extractorConfig?: ExtractorConfig;
  // private _engine: Engine | Traveler;

  constructor(target: HTMLElement, config: MirageConfig, extractorConfig?: ExtractorConfig) {
    if (!target) {
      throw new Error("[Mirage] Target element is required.");
    }
    this._extractorConfig = extractorConfig;
    this._engine = new Engine(target, config, this._extractorConfig);
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
