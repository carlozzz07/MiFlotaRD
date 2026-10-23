# MiFlotaRD
MiFlotaRD

## Desarrollo y compilación

1. Instala las dependencias con `npm install`.
2. Ejecuta `npm run build` para compilar `input.css` y generar `app.bundle.js` a partir de los módulos de `js/`.
3. Ejecuta `npm run cap:sync` para copiar los recursos web, ofuscar el JavaScript y sincronizar los plugins con Android.

Los componentes Tailwind se mantienen en `input.css`; `tailwind.config.cjs` escanea `index.html` y los módulos de `js/`.
