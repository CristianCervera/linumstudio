# Linum Estudio · landing

Landing en Astro para Linum Estudio (tapices enmarcados y personalizados, Valencia).

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
```

## Dónde está cada cosa

- `src/data/estudio.ts`: contacto, telas, medidas, precios, marcos y fotos de trabajos. Para cambiar precios o añadir una tela, se edita aquí.
- `src/i18n/ui.ts`: todos los textos en español, inglés, alemán y francés. El español vive en `/` y el resto en `/en/`, `/de/` y `/fr/`. Si añades una foto a la galería, añade su `alt` y su pie en los cuatro idiomas.
- `src/components/Landing.astro`: la página completa; `src/pages/` solo elige el idioma.
- `src/assets/telas/<slug>.jpg`: muestra de cada tela (cuadrada). Una tela nueva necesita su imagen y una línea en `telasBase`.
- `src/assets/trabajos/`: fotos de la galería.
- `src/components/Configurador.astro`: selector de tela, medida y marco con el precio y el enlace a WhatsApp.
- `public/catalogo-linum-2026.pdf`: catálogo descargable. **Sustitúyelo por el PDF exportado desde Canva** (Compartir → Descargar → PDF estándar). El actual se generó a partir de capturas del visor público.

## Pendiente con el estudio

- Fotos originales en alta resolución: las de Instagram llegan a 640 px como máximo.
- Confirmar que el número acepta WhatsApp y que la dirección es la del muestrario.
