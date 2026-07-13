import { Tracker, TrackerConfig } from "@mirage-engine/dom-tracker";

interface SandwichOptions {
  frontSelector?: string;
  midLayerElement?: HTMLElement;
  trackerConfig?: TrackerConfig;
}

interface SandwichItem {
  placeholder: HTMLDivElement;
  original: HTMLElement;
}

export class SandwichRenderer {
  private frontSelector: string;
  private midLayerElement: HTMLElement | null;
  private items: SandwichItem[] = [];
  private isInitialized: boolean = false;
  private midLayer: HTMLDivElement | null = null;
  private frontLayer: HTMLDivElement | null = null;
  private tracker: Tracker | null = null;

  constructor(options: SandwichOptions = {}) {
    this.frontSelector = options.frontSelector || ".front";
    this.midLayerElement = options.midLayerElement || null;
    this.items = [];
    this.isInitialized = false;

    // We can either use a passed tracker, or create one if this is used standalone
    this.tracker = new Tracker(document.body, options.trackerConfig || { resizeDebounce: true });
  }

  init(): void {
    if (this.isInitialized) return;

    this.createLayers();
    this.setupMidLayer();
    this.hijackFrontElements();

    this.setupHooks();
    this.tracker?.start();

    this.isInitialized = true;
    console.log("🥪 sand-telepochi initialized!");
  }

  // Allow passing an existing tracker (e.g. from mirage-engine/core)
  useTracker(tracker: Tracker) {
    this.tracker = tracker;
    this.setupHooks();
  }

  private createLayers(): void {
    this.midLayer = document.createElement("div");
    this.midLayer.id = "sand-layer-mid";
    Object.assign(this.midLayer.style, {
      position: "fixed",
      inset: "0",
      zIndex: "9998",
      pointerEvents: "none",
    });

    this.frontLayer = document.createElement("div");
    this.frontLayer.id = "sand-layer-front";
    Object.assign(this.frontLayer.style, {
      position: "fixed",
      inset: "0",
      zIndex: "9999",
      pointerEvents: "none",
    });

    document.body.appendChild(this.midLayer);
    document.body.appendChild(this.frontLayer);
  }

  private setupMidLayer(): void {
    if (this.midLayerElement && this.midLayer) {
      this.midLayer.appendChild(this.midLayerElement);
      this.midLayerElement.style.pointerEvents = "auto";
    }
  }

  private hijackFrontElements(): void {
    const frontElements = document.querySelectorAll<HTMLElement>(this.frontSelector);

    if (!this.frontLayer) return;

    frontElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      const placeholder = document.createElement("div");

      placeholder.className = "sand-placeholder";

      Object.assign(placeholder.style, {
        display: computed.display === "inline" ? "inline-block" : computed.display,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        boxSizing: "border-box",
        marginTop: computed.marginTop,
        marginBottom: computed.marginBottom,
        marginLeft: computed.marginLeft,
        marginRight: computed.marginRight,
        visibility: "hidden",
        pointerEvents: "none",
      });

      el.parentNode?.insertBefore(placeholder, el);

      this.frontLayer!.appendChild(el);

      Object.assign(el.style, {
        position: "fixed",
        margin: "0",
        boxSizing: "border-box",
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        pointerEvents: "auto",
      });

      this.items.push({ placeholder, original: el });
    });
  }

  private setupHooks(): void {
    if (!this.tracker) return;

    this.tracker.onBeforeRender.add(() => {
      // Before render, sync positions (Read + Write)
      // Since dom-tracker handles MutationObserver, we should sync rects.
      // Wait, to avoid layout thrashing, we should read ALL rects first, then write ALL tops.
      const rects = this.items.map(({ placeholder }) => placeholder.getBoundingClientRect());
      
      this.items.forEach(({ original }, index) => {
        const rect = rects[index];
        original.style.top = `${rect.top}px`;
        original.style.left = `${rect.left}px`;
        original.style.width = `${rect.width}px`;
        original.style.height = `${rect.height}px`;
      });
    });
  }
}
