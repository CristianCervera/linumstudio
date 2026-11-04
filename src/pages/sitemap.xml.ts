// Una entrada por página e idioma, cada una con sus alternativas (hreflang) para que Google las agrupe
import type { APIRoute } from 'astro';
import { langs, paginas, rutaDe, defaultLang, type Pagina } from '../i18n/ui';

export const GET: APIRoute = ({ site }) => {
  const url = (ruta: string) => new URL(ruta, site).href;
  const alternativas = (p: Pagina) =>
    [
      ...langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${url(rutaDe(l, p))}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(rutaDe(defaultLang, p))}"/>`,
    ].join('\n');
  const entradas = paginas
    .flatMap((p) => langs.map((l) => `  <url>\n    <loc>${url(rutaDe(l, p))}</loc>\n${alternativas(p)}\n  </url>`))
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entradas}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
