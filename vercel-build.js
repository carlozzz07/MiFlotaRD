import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';

const outputFile = resolve(process.env.VERCEL_OUTPUT_DIR || 'www', 'app.bundle.js');

const result = await build({
  entryPoints: ['js/app.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  legalComments: 'none',
  write: false
});

const bundle = result.outputFiles[0];
if (!bundle) throw new Error('esbuild no generó el bundle web para Vercel.');

const obfuscated = JavaScriptObfuscator.obfuscate(bundle.text, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.65,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 1,
  transformObjectKeys: true
}).getObfuscatedCode();

await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, obfuscated, 'utf8');
console.log(`Bundle ofuscado para Vercel generado en ${outputFile}`);
