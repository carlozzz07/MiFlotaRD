import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';

const outputDirectory = './electron-build';
const outputFile = `${outputDirectory}/app.bundle.js`;

const result = await build({
  entryPoints: ['./js/app.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  legalComments: 'none',
  write: false
});

const bundle = result.outputFiles[0];
if (!bundle) throw new Error('esbuild no generó el bundle de Electron.');

const obfuscated = JavaScriptObfuscator.obfuscate(bundle.text, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: true,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 1,
  transformObjectKeys: true
}).getObfuscatedCode();

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, obfuscated, 'utf8');
console.log(`Bundle de Electron ofuscado generado en ${outputFile}`);
