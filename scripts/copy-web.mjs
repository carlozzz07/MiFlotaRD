import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const rootAssets = [
  'index.html',
  'styles.css',
  'app.bundle.js',
  'manifest.json',
  'sw.js',
  'icono-192.png',
  'icono-512.png'
];

await mkdir('www', { recursive: true });

for (const file of rootAssets) {
  await copyFile(file, path.join('www', file));
}
