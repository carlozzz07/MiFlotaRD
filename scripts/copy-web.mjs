import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const rootAssets = [
  'index.html',
  'styles.css',
  'app.bundle.js',
  'manifest.json',
  'sw.js',
  'miflota-icon-192.png',
  'miflota-icon-512.png',
  'nuevologoCompleto512.jpg'
];

await mkdir('www', { recursive: true });

for (const file of rootAssets) {
  await copyFile(file, path.join('www', file));
}
