import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "MiragePainter",
      fileName: (format) =>
        `mirage-painter.${format === "es" ? "js" : "umd.js"}`,
    },
    rollupOptions: {
      external: ["three"],
      output: {
        globals: {
          three: "THREE",
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
