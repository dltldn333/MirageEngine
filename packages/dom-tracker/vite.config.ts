import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import path from "path";

export default defineConfig({
  build: {
    target: "es2015",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "DomTracker",
      fileName: (format) =>
        `dom-tracker.${format === "es" ? "js" : "umd.js"}`,
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
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
