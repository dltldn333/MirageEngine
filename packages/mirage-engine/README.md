<p align="center">
 <img  src="https://raw.githubusercontent.com/dltldn333/MirageEngine/main/.github/assets/mirage-engine.png" width="300px">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mirage-engine"><img src="https://img.shields.io/npm/v/mirage-engine.svg?color=black"></a>
  <a href="https://www.npmjs.org/package/mirage-engine"><img src="https://img.shields.io/npm/dm/mirage-engine.svg?color=black"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?color=black"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue.svg?color=black"></a>
</p>

# MirageEngine

> **An engine that mirrors HTML DOM elements to a WebGL scene in real-time.**

MirageEngine directly mirrors HTML DOM elements to WebGL objects. It observes DOM mutations and synchronizes position, style, and content in real-time, allowing standard HTML elements to exist within a WebGL context.

## Installation

```bash
npm install mirage-engine three
```

## Usage

### Use simple

```ts
import { Mirage } from "mirage-engine";

const target = document.querySelector("#target") as HTMLElement;

const mirage = new Mirage(target);

mirage.start();
```

### Use option

```ts
import { Mirage } from "mirage-engine";

const target = document.querySelector("#target") as HTMLElement;
const container = document.querySelector("#container") as HTMLElement;

const mirage = new Mirage(target, {
  textQuality: "low", //default is "medium" (== 2) ("low" | "medium" | "high" | number;)
  mode: "duplicate", //default is "overaly" ("overlay" | "duplicate")
  container: container, //The container option is only available in "duplicate" mode.
});

mirage.start();
```

**License | MIT © dltldn333**
