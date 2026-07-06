import { CoreConfig, ATTR_DOM } from "../types";
import { Renderer } from "../renderer/Renderer";
import { Syncer } from "./Syncer";
import { MeshRegistry } from "../store/MeshRegistry";

export class Engine {
  private renderer: Renderer;
  private syncer: Syncer;
  private target: HTMLElement;
  private registry: MeshRegistry;

  constructor(target: HTMLElement, config: CoreConfig) {
    this.target = target;
    this.registry = new MeshRegistry();

    if (!document.getElementById("mirage-engine-styles")) {
      const style = document.createElement("style");
      style.id = "mirage-engine-styles";
      style.textContent = `
        [${ATTR_DOM.NAME}="${ATTR_DOM.VALUES.HIDE}"] {
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }

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

    this.renderer = new Renderer(
      this.target,
      config,
      mountContainer,
      this.registry,
    );
    this.renderer.mount();
    this.syncer = new Syncer(this.target, this.renderer, this.registry, config);
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

  public getTracker() {
    return this.syncer.tracker;
  }

  public getCanvas() {
    return this.renderer.canvas;
  }

  public test() {
    const boxMesh = this.registry.get(
      document.querySelector("#box2") as HTMLElement,
    );

    if (!boxMesh) return;

    const keys: { [key: string]: boolean } = {
      ArrowRight: false,
      ArrowLeft: false,
      ArrowUp: false,
      ArrowDown: false,
    };

    window.addEventListener("keydown", (e) => {
      if (keys[e.key] !== undefined) keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => {
      if (keys[e.key] !== undefined) keys[e.key] = false;
    });

    const moveStep = 2;

    const animate = () => {
      requestAnimationFrame(animate);

      if (keys.ArrowRight) boxMesh.position.setX(boxMesh.position.x + moveStep);
      if (keys.ArrowLeft) boxMesh.position.setX(boxMesh.position.x - moveStep);
      if (keys.ArrowUp) boxMesh.position.setY(boxMesh.position.y + moveStep);
      if (keys.ArrowDown) boxMesh.position.setY(boxMesh.position.y - moveStep);
    };

    animate();
  }
}
