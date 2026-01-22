<p align="center">
 <img  src="https://raw.githubusercontent.com/dltldn333/MirageEngine/main/.github/assets/mirage-engine.png" width="300px">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@mirage-engine/painter"><img src="https://img.shields.io/npm/v/@mirage-engine/painter.svg?color=black"></a>
  <a href="https://www.npmjs.org/package/@mirage-engine/painter"><img src="https://img.shields.io/npm/dm/@mirage-engine/painter.svg?color=black"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?color=black"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue.svg?color=black"></a>
</p>

# @mirage-engine/painter

A standalone text & style texture generator for Three.js.

## Usage

```typescript
import { Painter } from "@mirage-engine/painter";
const geometry = new THREE.PlaneGeometry(1, 1);

const styles = {
    backgroundColor: "#ff0000",
    borderColor: "#000000",
    borderWidth: 2,
    borderRadius: 5,
}

const material = Painter.create(
  "BOX",
  styles,
  "",
  50, //width
  50, //height
);

mesh = new THREE.Mesh(geometry, material);
```
