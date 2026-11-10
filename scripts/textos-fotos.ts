/**
 * Escribe el `alt` y el pie de las fotos de trabajos en los cuatro idiomas con Claude.
 *
 *   node scripts/textos-fotos.ts                 # todas las fotos de src/assets/trabajos/ sin textos
 *   node scripts/textos-fotos.ts terraza osaka-mesa
 *   node scripts/textos-fotos.ts --probar        # muestra los textos sin tocar contenido.json
 *
 * Necesita ANTHROPIC_API_KEY. Los textos se guardan en src/data/contenido.json: revísalos con `git diff`.
 * Las fotos nuevas se añaden como «solo portada»; para que salgan en una galería, elige su producto en el panel
 * (/admin/) o en `producto` de contenido.json. Si la web se gestiona desde el back, edita los textos en el panel:
 * `npm run contenido` sobrescribe contenido.json con lo que haya allí.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { ui, langs, type Lang } from '../src/i18n/ui.ts';

const raiz = new URL('../', import.meta.url);
const dirTrabajos = new URL('src/assets/trabajos/', raiz);
const rutaContenido = new URL('src/data/contenido.json', raiz);

const args = process.argv.slice(2);
const probar = args.includes('--probar');
const pedidos = args.filter((a) => !a.startsWith('--'));

const existentes = Object.fromEntries(
  Object.entries(ui.es.trabajos.items).filter(([, t]) => t.alt)
);
const disponibles = readdirSync(dirTrabajos).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4));
for (const slug of pedidos) {
  if (!disponibles.includes(slug)) throw new Error(`No existe src/assets/trabajos/${slug}.jpg`);
}
const slugs = pedidos.length ? pedidos : disponibles.filter((s) => !existentes[s]);
if (!slugs.length) {
  console.log('Todas las fotos de trabajos ya tienen textos.');
  process.exit(0);
}

type TextosTrabajo = Record<Lang, { alt: string; pie: string }>;
type Contenido = { telas: { nombre: string }[]; trabajos: { slug: string; producto: string | null; visible: boolean; textos: TextosTrabajo }[] };
const leerContenido = (): Contenido => JSON.parse(readFileSync(rutaContenido, 'utf8'));
const telas = leerContenido().telas.map((t) => t.nombre);

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

// Sustituye los textos del trabajo, o lo añade (solo en la portada) si aún no estaba en contenido.json
const escribir = (slug: string, textos: TextosTrabajo) => {
  const contenido = leerContenido();
  const previo = contenido.trabajos.find((t) => t.slug === slug);
  if (previo) previo.textos = textos;
  else contenido.trabajos.push({ slug, producto: null, visible: true, textos });
  writeFileSync(rutaContenido, JSON.stringify(contenido, null, 2) + '\n');
};

for (const slug of slugs) {
  process.stdout.write(`${slug}… `);
  const textos = await describir(slug);
  console.log(`\n${langs.map((l) => `  ${l}  ${textos[l].pie} · ${textos[l].alt}`).join('\n')}`);
  if (!probar) escribir(slug, textos);
}
if (!probar) console.log(`\nTextos guardados en src/data/contenido.json. Revísalos con git diff.`);
