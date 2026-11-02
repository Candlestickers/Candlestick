import { defineConfig } from 'rolldown';
import path from 'node:path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Generate build number */
/* Year.Month.Day[micro] */
var date = new Date();
var year = date.getFullYear();
var month = date.getMonth() + 1;
var day = date.getDate();
var hour = date.getHours();
var minute = date.getMinutes();
var second = date.getSeconds();
var buildString = year + '.' + month + '.' + day + '.' + hour + '.' + minute + '.' + second;
const banner =
`/*Wick Engine https://github.com/Wicklets/wick-engine*/
var WICK_ENGINE_BUILD_VERSION = "${buildString}";
`;

export default defineConfig({
  input: 'src/Wick.js',
  output: {
    banner: banner,
    file: 'dist/wickengine.js',
    format: 'iife',
    name: 'Wick',
    sourcemap: true
  },
  resolve: {
    alias: {
        'jquery': path.resolve(__dirname, './lib/jquery-3.3.1.min.js'),

        'lib': path.resolve(__dirname, './lib'),
        'src': path.resolve(__dirname, './src'),
        'base': path.resolve(__dirname, './src/base'),
        'export': path.resolve(__dirname, './src/export'),
        'tools': path.resolve(__dirname, './src/tools'),
        'view': path.resolve(__dirname, './src/view'),
        'gui': path.resolve(__dirname, './src/gui')
    }
  }
});