import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';
import * as esbuild from 'esbuild';

export default defineConfig({
  plugins: [
    viteSingleFile(),
    {
      name: 'build-figma-code',
      apply: 'build',
      closeBundle() {
        // Build code.ts menggunakan esbuild (bawaan Vite) saat Vite selesai mem-build ui.html
        esbuild.buildSync({
          entryPoints: ['src/code.ts'],
          bundle: true,
          outfile: 'dist/code.js',
          target: 'es2020',
          format: 'iife'
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        ui: resolve(__dirname, 'src/ui.html')
      },
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
