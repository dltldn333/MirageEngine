import * as THREE from "three";

export class MeshRegistry {
  private store: WeakMap<HTMLElement, THREE.Group>;

  constructor() {
    this.store = new WeakMap();
  }

}
