# MiFlotaRD
MiFlotaRD

## Desarrollo y compilación

1. Instala las dependencias con `npm install`.
2. Ejecuta `npm run build` para compilar `input.css`, empaquetar y ofuscar los módulos de `js/` en `app.bundle.js`, y copiar los recursos actualizados a `www/`.
3. Ejecuta `npm run cap:sync` para construir la aplicación web y sincronizar los plugins con Android.

Los componentes Tailwind se mantienen en `input.css`; `tailwind.config.cjs` escanea `index.html` y los módulos de `js/`.
