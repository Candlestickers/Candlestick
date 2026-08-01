import fs from 'fs';
import path from 'path';

// Path
const engineFile = path.join(path.resolve('./dist'), 'wickengine.js');

// Read bundle
const engineSRC = fs.readFileSync(engineFile, 'utf8');
const engineSRCSafe = engineSRC.replace(/\$/g, "$$$");

// Inject into project.html
let distDir = 'dist';
let blankHTML = fs.readFileSync('src/export/html/project.html', 'utf8');
blankHTML = blankHTML.replace('<!--INJECT_WICKENGINE_HERE-->', engineSRCSafe);
fs.writeFileSync(path.join(distDir, 'emptyproject.html'), blankHTML);
fs.writeFileSync(path.join(distDir, 'index.html'), fs.readFileSync('src/export/zip/index.html', 'utf8'));
fs.writeFileSync(path.join(distDir, 'preloadjs.min.js'), fs.readFileSync('src/export/zip/preloadjs.min.js', 'utf8'));
fs.writeFileSync(path.join(distDir, 'project.html'), fs.readFileSync('src/export/html/project.html', 'utf8'));

console.log('Engine built!')