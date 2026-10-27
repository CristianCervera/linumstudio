// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://linumestudio.es',
  i18n: {
    locales: ['es', 'en', 'de', 'fr'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    // El proyecto vive en /mnt/c (WSL): los eventos de archivo de Windows no llegan, así que se sondea.
    server: { watch: { usePolling: true, interval: 300 } },
  },
});
