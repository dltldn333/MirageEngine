::header{pkg="@mirage-engine/painter"}

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
};

const material = Painter.create(
  "BOX",
  styles,
  "",
  50, //width
  50, //height
);

mesh = new THREE.Mesh(geometry, material);
```

::BASE
