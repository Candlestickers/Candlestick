import { defineConfig } from 'rolldown';
import path from 'path';

const root = process.cwd();

export default defineConfig({
  input: 'src/Wick.mjs',
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
    name: 'WickModule',
    intro: `globalThis.Wick = {
      version: window.CandlestickVersion || "dev",
      resourcepath: '../dist/',
      _originals: {},
      gesture: { active: false, type: null }};
    /**
     * This object creates a Wick namespace for wick-engine functionality and utilities.
     */
    let _resolveLoaded;
    globalThis.Wick.loaded = new Promise(resolve => { _resolveLoaded = resolve; });
    // expose resolver so we can resolve later when bootstrap completes
    globalThis.Wick._resolveLoaded = _resolveLoaded;

    // Ensure that the Wick namespace is accessible in environments where globals are finicky (react, vite, etc)
    const Wick = globalThis.Wick;
    window.Wick = Wick;`,
    outro: `if (Wick.Wick && typeof Wick.Wick === 'object') {
      Object.assign(Wick, Wick.Wick);
    };
    /* One instance of each Wick.Base class is created so we can access
    * a list of all possible properties of each class. This is used
    * to clean up custom variables after projects are stopped.
    *
    * Instantiating these classes creates paper.js views, which need a
    * real document.body to compute canvas bounds against. This script
    * runs synchronously while the document is still being parsed (often
    * before <body> exists), so this step is deferred until the DOM is
    * actually ready instead of running immediately.
    */
    function _collectWickOriginals() {
      for (const [name, value] of Object.entries(Wick)) {
        if (typeof value === 'function' && Wick.Base) {
          const proto = value.prototype;
          if (proto && proto instanceof Wick.Base) {
            Wick._originals[name] = new value();
          }
        }
      }

      if (globalThis.Wick && globalThis.Wick._resolveLoaded) {
        try { globalThis.Wick._resolveLoaded(globalThis.Wick); } catch (e) {}
        delete globalThis.Wick._resolveLoaded;
      } else globalThis.Wick.loaded = Promise.resolve(globalThis.Wick);
    }

    if (document.body) {
      _collectWickOriginals();
    } else {
      document.addEventListener('DOMContentLoaded', _collectWickOriginals, { once: true });
    }`,
    entryFileNames: 'wickengine.js',
    sourcemap: true,
    exports: 'auto',
    esModule: false,
    codeSplitting: false,
  }
});