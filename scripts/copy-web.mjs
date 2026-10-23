import { copyFile, mkdir, readdir } from 'node:fs/promises';
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
await mkdir(path.join('www', 'js'), { recursive: true });

for (const file of rootAssets) {
  await copyFile(file, path.join('www', file));
}

for (const file of await readdir('js')) {
  if (file.endsWith('.js')) {
    await copyFile(path.join('js', file), path.join('www', 'js', file));
  }
}
