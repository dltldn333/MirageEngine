import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'MirageEngine',
      fileName: (format) => `mirage-engine.${format}.js`,
    },
    rollupOptions: {
      external: ['three'],
      output: {
        globals: {
          three: 'THREE',
        },
      },
    },
  },
  plugins: [dts()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});