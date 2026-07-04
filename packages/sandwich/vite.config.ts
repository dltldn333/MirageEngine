import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import path from "path";

export default defineConfig({
  build: {
    target: "es2015",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "SandwichRenderer",
      fileName: (format) =>
        `sandwich.${format === "es" ? "js" : "umd.js"}`,
    },
    rollupOptions: {
      external: ["@mirage-engine/dom-tracker"],
      output: {
        globals: {
          "@mirage-engine/dom-tracker": "DomTracker",
        },
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
