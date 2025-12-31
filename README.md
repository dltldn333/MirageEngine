# MirageEngine

> **An engine that mirrors HTML DOM elements to a WebGL scene in real-time.**

MirageEngine directly mirrors HTML DOM elements to WebGL objects. It observes DOM mutations and synchronizes position, style, and content in real-time, allowing standard HTML elements to exist within a WebGL context.

## Installation

```bash
npm install mirage-engine
```

## Usage

```ts
import { Mirage } from 'mirage-engine';

// 1. Initialize
const engine = new Mirage();

// 2. Mirror a DOM element
const target = document.getElementById('my-element');
engine.mirror(target);
```