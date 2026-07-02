import * as THREE from "three";

export class MeshRegistry {
  private store: WeakMap<HTMLElement, THREE.Mesh>;

  constructor() {
    this.store = new WeakMap();
  }
  public register(element: HTMLElement, mesh: THREE.Mesh): void {
    this.store.set(element, mesh);
  }

  public get(element: HTMLElement): THREE.Mesh | undefined {
    return this.store.get(element);
  }
  // public register(element: HTMLElement, meshGroup: THREE.Group): void {
  //   this.store.set(element, meshGroup);
  // }

  // public get(element: HTMLElement): THREE.Group | undefined {
  //   return this.store.get(element);
  // }

  public has(element: HTMLElement): boolean {
    return this.store.has(element);
  }

  // Optional
  public remove(element: HTMLElement): void {
    this.store.delete(element);
  }
}
