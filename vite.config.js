/// <reference types="vitest" />
import {resolve} from 'path';
import {defineConfig} from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: '@Artium-Studios/the-storm-network-store',
      fileName: 'the-storm-network-store',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    watch: false,
    clearMocks: true
  },
  plugins: [dts()],
});
