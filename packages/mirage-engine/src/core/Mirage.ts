import { MirageConfig } from "@/types";
import { Engine, ATTR_SANDWICH } from "@mirage-engine/core";
import { SandwichRenderer } from "@mirage-engine/sandwich";

export class Mirage {
  private _engine: Engine;
  private _sandwich?: SandwichRenderer;

  constructor(target: HTMLElement, config: MirageConfig) {
    if (!target) {
      throw new Error("[Mirage] Target element is required.");
    }
    this._engine = new Engine(target, config);

    if (config.sandwich !== false) {
      const sandwichOptions = typeof config.sandwich === "object" ? config.sandwich : {};
      this._sandwich = new SandwichRenderer({
        frontSelector: sandwichOptions.frontSelector || `[${ATTR_SANDWICH.NAME}='${ATTR_SANDWICH.VALUES.FRONT}']`,
      });
      this._sandwich.useTracker(this._engine.getTracker());
    }
  }

  public async start(): Promise<void> {
    await this._engine.start();
      // public start(): void {
    // this._engine.start();
    if (this._sandwich) {
      this._sandwich.init();
    }
  }

  public stop(): void {
    this._engine.stop();
  }

  public destroy(): void {
    this._engine.dispose();
  }

  public getTracker() {
    return this._engine.getTracker();
  }

  public getCanvas() {
    return this._engine.getCanvas();
  }

  public updateUniforms(element: HTMLElement, uniforms: Record<string, any>) {
    this._engine.updateUniforms(element, uniforms);
  }

  public test(): void {
    this._engine.test();
  }
}
