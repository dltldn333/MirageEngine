import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      "mirage-engine": path.resolve(__dirname, "../packages/mirage-engine/src/index.ts"),
      "@mirage-engine/core": path.resolve(__dirname, "../packages/core/src/index.ts"),
      "@mirage-engine/painter": path.resolve(__dirname, "../packages/painter/src/index.ts")
    }
  }
});
