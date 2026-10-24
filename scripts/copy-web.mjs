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

const androidAssetsDir = path.join('android', 'app', 'src', 'main', 'assets', 'public');

await mkdir('www', { recursive: true });
await mkdir(androidAssetsDir, { recursive: true });

for (const file of rootAssets) {
  try {
    await copyFile(file, path.join('www', file));
    await copyFile(file, path.join(androidAssetsDir, file));
  } catch (err) {
    console.warn(`Aviso: No se pudo copiar ${file}:`, err.message);
  }
}
