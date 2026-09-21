'use strict';

const fs = require('node:fs');
const path = require('node:path');

const srcDir = path.join(__dirname, '..', 'src', 'renderer');
const destDir = path.join(__dirname, '..', 'dist', 'renderer');

fs.mkdirSync(destDir, { recursive: true });

for (const name of ['index.html', 'settings.html', 'theme.css', 'settings.css']) {
  fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
}
