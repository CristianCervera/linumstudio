# Linum Estudio · landing

Web en Astro para Linum Estudio (tapices Linum y cuadritos enmarcados, Valencia). Tiene tres páginas: la principal (`/`), los tapices (`/linum/`) y los cuadritos (`/cuadritos/`), cada una en cuatro idiomas.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
```

## Dónde está cada cosa

- `src/data/estudio.ts`: contacto, telas, medidas, precios, marcos y fotos de trabajos. Para cambiar precios o añadir una tela, se edita aquí.
- `src/i18n/ui.ts`: todos los textos en español, inglés, alemán y francés. El español vive en `/` y el resto en `/en/`, `/de/` y `/fr/` (por ejemplo, `/en/cuadritos/`); las rutas salen de `rutaDe(lang, pagina)`. Si añades una foto a la galería, añade su `alt` y su pie en los cuatro idiomas.
- `src/components/Inicio.astro`: la página principal (cabecera con fotos, los dos productos, catálogo y visita).
- `src/components/PaginaProducto.astro`: la página de un producto (presentación, `Galeria`, `Configurador` y `Precios`), que se usa para los tapices y para los cuadritos.
- `src/layouts/Sitio.astro`: la barra superior, el menú y el pie, comunes a las tres páginas. `src/pages/` solo elige la página y el idioma.
- `src/assets/telas/<slug>.jpg`: muestra de cada tela (cuadrada). Una tela nueva necesita su imagen y una línea en `telasBase`.
- `src/assets/trabajos/`: fotos de la galería. Cada foto sale en la página de su producto si su slug está en `trabajos.tapiz` o `trabajos.cuadrito` de `src/data/estudio.ts`; el mosaico de la portada usa todas. Para escribir su `alt` y su pie en los cuatro idiomas con IA: `npm run textos-fotos` (todas las fotos sin textos) o `npm run textos-fotos -- <slug>`; añade `--probar` para verlos sin guardarlos. Necesita `ANTHROPIC_API_KEY` y conviene revisar el resultado con `git diff`.
- `src/components/Configurador.astro`: el simulador de cada página, con el precio y el enlace a WhatsApp. Con `producto="tapiz"` se eligen tela, medida y marco; con `producto="cuadrito"`, tela de fondo, diseño e impresión.
- Cuadritos: medidas y precios en `cuadrito` de `src/data/estudio.ts`; nombres de telas y diseños en `config.cuadrito` de `src/i18n/ui.ts`. Imágenes en `src/assets/cuadritos/telas/<slug>.jpg` (20 × 27, vertical) y `src/assets/cuadritos/disenos/<slug>.jpg` (el diseño original, sobre fondo claro).
- `public/catalogo-linum-2026.pdf`: catálogo descargable. **Sustitúyelo por el PDF exportado desde Canva** (Compartir → Descargar → PDF estándar). El actual se generó a partir de capturas del visor público. Las dos últimas páginas son el catálogo de cuadritos, añadidas desde sus capturas; si exportas desde Canva, une los dos catálogos en un solo PDF y ajusta `catalogo.paginas` en `src/data/estudio.ts`.

## Pendiente con el estudio

- Cuadritos: nombres reales de las telas (ahora son descriptivos) y fotos de las telas Granadas y Rayas azules, que solo salen en pequeño en el catálogo.
- Fotos originales en alta resolución: las de Instagram llegan a 640 px como máximo.
- Confirmar que el número acepta WhatsApp y que la dirección es la del muestrario.
