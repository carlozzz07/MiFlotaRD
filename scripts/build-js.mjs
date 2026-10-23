import { writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';

const result = await build({
  entryPoints: ['./js/app.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  legalComments: 'none',
  write: false
});

const bundle = result.outputFiles[0];
if (!bundle) throw new Error('esbuild no generó el bundle de la aplicación.');

const obfuscated = JavaScriptObfuscator.obfuscate(bundle.text, {
  compact: true,
  stringArray: true
}).getObfuscatedCode();

await writeFile('./app.bundle.js', obfuscated, 'utf8');
