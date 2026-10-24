import fs from 'node:fs';

let html = fs.readFileSync('index.html', 'utf8');

const marker = '<!-- LÓGICA JAVASCRIPT DE PRODUCCIÓN';
const markerIdx = html.indexOf(marker);

const scriptEndIdx = html.indexOf('<!-- BARRA DE NAVEGACIÓN INFERIOR');

if (markerIdx !== -1 && scriptEndIdx !== -1) {
  const replacement = `<!-- LÓGICA JAVASCRIPT DE PRODUCCIÓN -->\n  <script type="module" src="./app.bundle.js"></script>\n\n  `;
  html = html.slice(0, markerIdx) + replacement + html.slice(scriptEndIdx);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('SUCCESSFULLY FIXED index.html!');
} else {
  console.error('FAILED TO FIND BOUNDARIES:', { markerIdx, scriptEndIdx });
}
