/**
 * Escribe el `alt` y el pie de las fotos de trabajos en los cuatro idiomas con Claude.
 *
 *   node scripts/textos-fotos.ts                 # todas las fotos de src/assets/trabajos/ sin textos
 *   node scripts/textos-fotos.ts terraza osaka-mesa
 *   node scripts/textos-fotos.ts --probar        # muestra los textos sin tocar ui.ts
 *
 * Necesita ANTHROPIC_API_KEY. Los textos se añaden a src/i18n/ui.ts: revísalos con `git diff`.
 * Para que la foto salga en la galería, añade además su slug a `trabajos` en src/data/estudio.ts.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { ui, langs, type Lang } from '../src/i18n/ui.ts';

const raiz = new URL('../', import.meta.url);
const dirTrabajos = new URL('src/assets/trabajos/', raiz);
const rutaUi = new URL('src/i18n/ui.ts', raiz);

const args = process.argv.slice(2);
const probar = args.includes('--probar');
const pedidos = args.filter((a) => !a.startsWith('--'));

const existentes = ui.es.trabajos.items;
const disponibles = readdirSync(dirTrabajos).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4));
for (const slug of pedidos) {
  if (!disponibles.includes(slug)) throw new Error(`No existe src/assets/trabajos/${slug}.jpg`);
}
const slugs = pedidos.length ? pedidos : disponibles.filter((s) => !existentes[s]);
if (!slugs.length) {
  console.log('Todas las fotos de trabajos ya tienen textos.');
  process.exit(0);
}

// Los nombres de las telas, leídos de estudio.ts (que no se puede importar fuera de Astro)
const telas = [...readFileSync(new URL('src/data/estudio.ts', raiz), 'utf8').matchAll(/nombre: '([^']+)', slug:/g)].map((m) => m[1]);

const Texto = z.object({ alt: z.string(), pie: z.string() });
const Textos = z.object({ es: Texto, en: Texto, de: Texto, fr: Texto });

const ejemplos = Object.keys(existentes)
  .map((slug) => JSON.stringify({ slug, ...Object.fromEntries(langs.map((l) => [l, ui[l].trabajos.items[slug]])) }))
  .join('\n');

const sistema = `Escribes los textos de la galería de Linum Estudio, un taller de Valencia que hace tapices de tela enmarcados en madera (ikats y florales).
Para cada foto devuelves, en español, inglés (británico), alemán y francés:
- alt: qué se ve, para quien no puede ver la foto. Una frase de 8 a 16 palabras sin punto final: la pieza (colores, estampado, si es ikat o floral, si son dos piezas), dónde está colgada y lo que la rodea. No empieces por "Foto de" ni "Imagen de".
- pie: muy corto, de 1 a 5 palabras, con el tono de los ejemplos ("Granada en un recibidor", "Díptico Tulum en un comedor").
Telas del catálogo: ${telas.join(', ')}. Usa el nombre de una tela solo si aparece en el slug de la foto; si no, no nombres ninguna y describe la pieza en el pie. Los nombres de tela no se traducen.
Traduce con naturalidad, siguiendo el vocabulario de los ejemplos en cada idioma (en: "piece", de: "Stoffbild", fr: "tableau").

Ejemplos ya publicados:
${ejemplos}`;

const client = new Anthropic();

const describir = async (slug: string) => {
  const foto = readFileSync(new URL(`${slug}.jpg`, dirTrabajos)).toString('base64');
  const respuesta = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: sistema, cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: foto } },
          { type: 'text', text: `Slug de la foto: ${slug}` },
        ],
      },
    ],
    output_config: { effort: 'medium', format: betaZodOutputFormat(Textos) },
  });
  if (respuesta.stop_reason === 'refusal') throw new Error(`Claude no ha descrito ${slug}`);
  if (!respuesta.parsed_output) throw new Error(`Respuesta sin textos para ${slug} (${respuesta.stop_reason})`);
  return respuesta.parsed_output;
};

const cadena = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const lineaTs = (slug: string, t: z.infer<typeof Texto>) => `      '${slug}': { alt: ${cadena(t.alt)}, pie: ${cadena(t.pie)} },`;

// Añade o sustituye la línea del slug al final de `trabajos.items` de cada idioma
const escribir = (fuente: string, slug: string, textos: z.infer<typeof Textos>) => {
  const lineas = fuente.split('\n');
  for (const lang of langs as Lang[]) {
    const inicio = lineas.findIndex((l) => l.startsWith(`const ${lang}`));
    const items = lineas.findIndex((l, i) => i > inicio && l === '    items: {');
    const fin = lineas.findIndex((l, i) => i > items && l.startsWith('    }'));
    if (inicio < 0 || items < 0 || fin < 0) throw new Error(`No encuentro trabajos.items de '${lang}' en ui.ts`);
    const previa = lineas.findIndex((l, i) => i > items && i < fin && l.startsWith(`      '${slug}':`));
    const nueva = lineaTs(slug, textos[lang]);
    if (previa >= 0) lineas[previa] = nueva;
    else lineas.splice(fin, 0, nueva);
  }
  return lineas.join('\n');
};

let fuente = readFileSync(rutaUi, 'utf8');
for (const slug of slugs) {
  process.stdout.write(`${slug}… `);
  const textos = await describir(slug);
  console.log(`\n${langs.map((l) => `  ${l}  ${textos[l].pie} · ${textos[l].alt}`).join('\n')}`);
  if (!probar) {
    fuente = escribir(fuente, slug, textos);
    writeFileSync(rutaUi, fuente);
  }
}
if (!probar) console.log(`\nTextos guardados en src/i18n/ui.ts. Revísalos con git diff.`);
