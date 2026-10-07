import fs from 'node:fs';
/* Generate empty HTML file ready for wick projects to be injected into */
var blankHTML = fs.readFileSync('src/export/html/project.html', 'utf8');
var engineSRC = fs.readFileSync('dist/wickengine.js', 'utf8');
var engineSRCSafe = engineSRC.replace(/\$/g, "$$$"); // http://forums.mozillazine.org/viewtopic.php?f=19&t=2182187
blankHTML = blankHTML.replace('<!--INJECT_WICKENGINE_HERE-->', engineSRCSafe);
fs.writeFileSync('dist/emptyproject.html', blankHTML);

/* Copy ZIP export resources to dist folder */
var zipindex = fs.readFileSync('src/export/zip/index.html', 'utf8');
var preloadjs = fs.readFileSync('src/export/zip/preloadjs.min.js', 'utf8');
var projecthtml = fs.readFileSync('src/export/html/project.html', 'utf8');
fs.writeFileSync('dist/index.html', zipindex);
fs.writeFileSync('dist/preloadjs.min.js', preloadjs);
fs.writeFileSync('dist/project.html', projecthtml);