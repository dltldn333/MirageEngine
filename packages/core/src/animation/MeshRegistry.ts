import * as THREE from "three";

export class MeshRegistry {
  private store: WeakMap<HTMLElement, THREE.Group>;

  constructor() {
    this.store = new WeakMap();
  }
  public register(element: HTMLElement, meshGroup: THREE.Group): void {
    this.store.set(element, meshGroup);
  }

  public get(element: HTMLElement): THREE.Group | undefined {
    return this.store.get(element);
  }

  public remove(element: HTMLElement): void {
    this.store.delete(element);
  }

  public has(element: HTMLElement): boolean {
    return this.store.has(element);
  }
}
