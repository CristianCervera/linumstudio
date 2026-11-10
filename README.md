# Linum Estudio · landing

Web en Astro para Linum Estudio (tapices Linum y cuadritos enmarcados, Valencia). Tiene tres páginas: la principal (`/`), los tapices (`/linum/`) y los cuadritos (`/cuadritos/`), cada una en cuatro idiomas.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
```

## Panel de contenido (`/admin/`)

En `/admin/` hay un panel con usuario y contraseña para gestionar los ejemplos (fotos de trabajos), las telas de tapiz, las telas y los diseños de los cuadritos y los precios, traer las fotos nuevas de Instagram y publicar la web. Habla con el back, [linumstudio-back](https://github.com/cristiancervera/linumstudio-back), que guarda el contenido y las imágenes (su README explica cómo montarlo y cómo conseguir el token de Instagram).

- `PUBLIC_LINUM_API_URL`: dirección del back que usa el panel. Si no está, `http://localhost:3001` con `npm run dev` y `https://linumstudio-back.onrender.com` en la web publicada.
- `LINUM_API_URL`: si está definida, `npm run build` descarga antes el contenido del back (`npm run contenido`) a `src/data/contenido.json` y `src/assets/`, y la web se construye con él. Sin ella se usa lo que haya en el repositorio. En el build de producción tienen que estar las dos.
- **Publicar web**, en el panel, hace que el back llame al deploy hook de la web (`DEPLOY_HOOK_URL` en el back), que lanza ese build.

En Render, la web, el back y su base de datos se crean juntos con el Blueprint (`render.yaml`) de linumstudio-back.

Para trabajar en local con el panel: arranca el back (`npm start` en linumstudio-back) y aquí `npm run dev`; entra en http://localhost:4321/admin/. Para traer a este repositorio lo que hay en el back: `LINUM_API_URL=http://localhost:3001 npm run contenido`.

## Dónde está cada cosa

- `src/data/contenido.json`: lo que se gestiona desde el panel: telas, fotos de trabajos (con su producto y sus textos en los cuatro idiomas), telas y diseños de cuadrito (con sus nombres) y precios. Lo que tiene `visible: false` no sale. Si la web se gestiona desde el back, no lo edites a mano: `npm run contenido` lo sobrescribe.
- `src/data/estudio.ts`: lee `contenido.json` y le añade las imágenes; además, contacto y marcos.
- `src/i18n/ui.ts`: todos los textos en español, inglés, alemán y francés (los de las fotos y los nombres de cuadrito salen de `contenido.json`). El español vive en `/` y el resto en `/en/`, `/de/` y `/fr/` (por ejemplo, `/en/cuadritos/`); las rutas salen de `rutaDe(lang, pagina)`.
- `src/components/Inicio.astro`: la página principal (cabecera con fotos, los dos productos, catálogo y visita).
- `src/components/PaginaProducto.astro`: la página de un producto (presentación, `Galeria`, `Configurador` y `Precios`), que se usa para los tapices y para los cuadritos.
- `src/layouts/Sitio.astro`: la barra superior, el menú y el pie, comunes a las tres páginas. `src/pages/` solo elige la página y el idioma.
- `src/assets/telas/<slug>.jpg`: muestra de cada tela (cuadrada). Una tela nueva necesita su imagen y una entrada en `telas` de `contenido.json`; las `destacada` salen de muestra en la portada y en la cabecera de los tapices.
- `src/assets/trabajos/`: fotos de la galería. Cada foto sale en la página de su producto según su `producto` en `contenido.json` (`tapiz`, `cuadrito` o `null` para que solo salga en el mosaico de la portada, que usa todas las visibles). Para escribir su `alt` y su pie en los cuatro idiomas con IA: `npm run textos-fotos` (todas las fotos sin textos) o `npm run textos-fotos -- <slug>`; añade `--probar` para verlos sin guardarlos. Necesita `ANTHROPIC_API_KEY` y conviene revisar el resultado con `git diff`.
- `src/components/Configurador.astro`: el simulador de cada página, con el precio y el enlace a WhatsApp. Con `producto="tapiz"` se eligen tela, medida y marco; con `producto="cuadrito"`, tela de fondo, diseño e impresión.
- Cuadritos: medidas en `cuadrito` de `src/data/estudio.ts`; precios, telas y diseños (con sus nombres) en `contenido.json`. Imágenes en `src/assets/cuadritos/telas/<slug>.jpg` (20 × 27, vertical) y `src/assets/cuadritos/disenos/<slug>.jpg` (el diseño original, sobre fondo claro).
- `public/catalogo-linum-2026.pdf`: catálogo descargable. **Sustitúyelo por el PDF exportado desde Canva** (Compartir → Descargar → PDF estándar). El actual se generó a partir de capturas del visor público. Las dos últimas páginas son el catálogo de cuadritos, añadidas desde sus capturas; si exportas desde Canva, une los dos catálogos en un solo PDF y ajusta `catalogo.paginas` en `src/data/estudio.ts`.

## Pendiente con el estudio

- Cuadritos: nombres reales de las telas (ahora son descriptivos) y fotos de las telas Granadas y Rayas azules, que solo salen en pequeño en el catálogo.
- Fotos originales en alta resolución: las de Instagram llegan a 640 px como máximo.
- Confirmar que el número acepta WhatsApp y que la dirección es la del muestrario.
