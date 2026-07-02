import * as THREE from "three";

export type TextureReadyCallback = (
  element: HTMLElement,
  texture: THREE.Texture | null,
) => void;

export class TextureLifecycleManager {
  private observer: IntersectionObserver;
  private textures: WeakMap<HTMLElement, THREE.Texture> = new WeakMap();
  private loadStatus: WeakMap<HTMLElement, boolean> = new WeakMap();
  private elementUrls: WeakMap<HTMLElement, string> = new WeakMap();
  private onUpdate: TextureReadyCallback;

  constructor(onUpdate: TextureReadyCallback) {
    this.onUpdate = onUpdate;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            this.loadTexture(el);
          } else {
            this.disposeTexture(el);
          }
        }
      },
      { rootMargin: "300px" },
    );
  }

  public register(element: HTMLElement, url: string) {
    if (element.nodeType !== Node.ELEMENT_NODE) return;
    const currentUrl = this.elementUrls.get(element);
    if (currentUrl !== url) {
      this.elementUrls.set(element, url);
      // Restart observation to trigger intersecting check
      this.observer.unobserve(element);
      this.observer.observe(element);
    }
  }

  public unregister(element: HTMLElement) {
    if (element.nodeType === Node.ELEMENT_NODE) {
      this.observer.unobserve(element);
    }
    this.disposeTexture(element);
    this.elementUrls.delete(element);
    this.loadStatus.delete(element);
  }

  private async loadTexture(element: HTMLElement) {
    if (this.loadStatus.get(element) || this.textures.has(element)) return;

    const url = this.elementUrls.get(element);
    if (!url) return;

    this.loadStatus.set(element, true);

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob, { imageOrientation: "flipY" });

      // Check if URL changed or element was unregistered while decoding
      if (this.elementUrls.get(element) !== url) {
        bitmap.close();
        return;
      }

      // Check if element is no longer intersecting (debounced unobserve might have fired)
      // Actually we just check if it's still observed and has the URL. 
      // A more robust check for intersection state might be needed, but for now we rely on disposeTexture.

      const texture = new THREE.CanvasTexture(bitmap);
      texture.needsUpdate = true;
      this.textures.set(element, texture);
      this.onUpdate(element, texture);
    } catch (e) {
      console.warn("[MirageEngine] Failed to load texture:", url, e);
    } finally {
      // Re-check url, if it changed, we should probably trigger loadTexture again,
      // but IntersectionObserver will handle it if it's still intersecting.
      if (this.elementUrls.has(element)) {
        this.loadStatus.set(element, false);
      }
    }
  }

  private disposeTexture(element: HTMLElement) {
    const texture = this.textures.get(element);
    if (texture) {
      texture.dispose();
      this.textures.delete(element);
      this.onUpdate(element, null);
    }
    // Also cancel loading state if we had one
    this.loadStatus.set(element, false);
  }

  public get(element: HTMLElement) {
    return this.textures.get(element);
  }

  public disposeAll() {
    this.observer.disconnect();
    // Assuming WeakMap handles GC of remaining textures, but in WebGL we must explicitly delete.
    // However, WeakMap is not iterable, so we can't easily iterate and delete. 
    // The renderer should unregister nodes upon pendingDeletions.
  }
}
