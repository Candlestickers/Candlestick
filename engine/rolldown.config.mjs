import { defineConfig } from 'rolldown';
import path from 'path';

const root = process.cwd();

export default defineConfig({
  input: 'src/Wick.js',
  external: ['paper', '$', 'jquery'],
  resolve: {
    alias: {},
    aliasFields: [['browser']],
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.js', '.json'],
    modules: ['node_modules']
  },
  output: {
    dir: path.resolve(root, 'dist'),
    format: 'iife',
    name: 'Wick',
    intro: "globalThis.Wick = globalThis.Wick || {}; var exports = globalThis.Wick;",
    outro: `(function mergeModuleIntoRuntime() {
    // The IIFE result is assigned to the global var named 'Wick' (because name:'Wick').
    var mod = typeof Wick !== 'undefined' ? Wick : null;
    if (!mod && typeof exports !== 'undefined') mod = exports;
    if (!mod) return;

    // If the module used a default wrapper, prefer the inner default object if it looks like the real export container
    if (mod && mod.default && typeof mod.default === 'object' && Object.getOwnPropertyNames(mod.default).length > 0) {
      // If default only contains __esModule, ignore it; otherwise use it as source
      var defKeys = Object.getOwnPropertyNames(mod.default).filter(k => k !== '__esModule');
      if (defKeys.length > 0) mod = mod.default;
    }

    // If some CJS wrappers put the real exports on module.exports, try to find it
    if (mod && mod.module && mod.module.exports && typeof mod.module.exports === 'object') {
      var candidate = mod.module.exports;
      if (Object.getOwnPropertyNames(candidate).length > 0) mod = candidate;
    }

    // Copy all own property descriptors (names + symbols) preserving getters/setters and attributes
    var src = mod;
    var dst = globalThis.Wick = globalThis.Wick || {};
    var names = Object.getOwnPropertyNames(src);
    var syms = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(src) : [];
    var keys = names.concat(syms);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === '__esModule') continue;
      try {
        Object.defineProperty(dst, k, Object.getOwnPropertyDescriptor(src, k));
      } catch (e) {
        try { dst[k] = src[k]; } catch (e2) {}
      }
    }
    })();`,
    entryFileNames: 'wickengine.js',
    sourcemap: true,
    exports: 'named',
    codeSplitting: false,
  }
});