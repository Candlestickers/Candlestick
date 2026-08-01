import { defineConfig } from 'rolldown';
import path from 'path';

const root = process.cwd();

export default defineConfig({
  input: 'src/Wick.js',
  external: ['jsdom'],
  resolve: {
    alias: {
      // map both the package name and the explicit subpath to the actual file
      'paper': path.resolve(root, '..', 'node_modules', 'paper', 'dist', 'paper-core.js'),
      'paper/dist/paper-core.js': path.resolve(root, '..', 'node_modules', 'paper', 'dist', 'paper-core.js'),

      // treat node-only canvas file as absent
      'paper/dist/node/canvas.js': false,
      'paper/dist/node/canvas': false
    },
    aliasFields: [['browser']],
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.js', '.json'],
    modules: ['node_modules']
  },
  output: {
    dir: path.resolve(root, 'dist'),
    format: 'iife',
    intro: "globalThis.Wick = globalThis.Wick || {};",
    name: 'Wick',
    entryFileNames: 'wickengine.js',
    chunkFileNames: 'chunks/[name]-[hash].js', // should not be used if inlineDynamicImports true
    sourcemap: true,
    exports: 'named'
  }
});