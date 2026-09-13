# MirageEngine

> **An engine that mirrors HTML DOM elements to a WebGL scene in real-time.**

MirageEngine directly mirrors HTML DOM elements to WebGL objects. It observes DOM mutations and synchronizes position, style, and content in real-time, allowing standard HTML elements to exist within a WebGL context.

## Installation

```bash
npm install mirage-engine three
```

## Usage

[Live Demo](https://mirage-engine.vercel.app/get-started/introduction#live-demo)

### Simple

```ts
import { Mirage } from "mirage-engine";

const target = document.querySelector("#target") as HTMLElement;

const mirage = new Mirage(target, {});

await mirage.start();
```

`config` is required — pass `{}` for defaults. `start()` is async because it
boots the WebAssembly module on first call.

### With options

```ts
import { Mirage } from "mirage-engine";

const target = document.querySelector("#target") as HTMLElement;
const container = document.querySelector("#container") as HTMLElement;

const mirage = new Mirage(target, {
  quality: "low",       // default "medium" (== 2)  ("low" | "medium" | "high" | number)
  mode: "duplicate",    // default "overlay"        ("overlay" | "duplicate")
  container,            // "duplicate" mode only
});

await mirage.start();
```

### Lifecycle

```ts
mirage.stop();    // pause the render loop, keep the scene
mirage.destroy(); // stop, dispose the renderer, remove the canvas
```

## Documentation

Full documentation, in English and Korean:
**https://mirage-engine.vercel.app**

- [Quick Start](https://mirage-engine.vercel.app/get-started/quick-start)
- [Configuration](https://mirage-engine.vercel.app/reference/configuration)
- [Data Attributes](https://mirage-engine.vercel.app/reference/data-attributes)
- [Contributing](https://mirage-engine.vercel.app/contributing/setup)
