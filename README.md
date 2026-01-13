# MirageEngine

> **An engine that mirrors HTML DOM elements to a WebGL scene in real-time.**

[![npm version](https://img.shields.io/npm/v/mirage-engine.svg?style=flat-square)](https://www.npmjs.com/package/mirage-engine)
[![NPM Downloads](https://img.shields.io/npm/dm/mirage-engine.svg)](https://www.npmjs.org/package/mirage-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)


MirageEngine directly mirrors HTML DOM elements to WebGL objects. It observes DOM mutations and synchronizes position, style, and content in real-time, allowing standard HTML elements to exist within a WebGL context.

## Installation

```bash
npm install mirage-engine
```

## Usage

```ts
import { Mirage } from 'mirage-engine';

const target = document.querySelector("#target") as HTMLElement;

const mirage = new Mirage(target);

mirage.start();
```

**License | MIT © dltldn333**