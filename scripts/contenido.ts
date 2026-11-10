/**
 * Descarga del back (linumstudio-back) el contenido que se gestiona desde el panel /admin/: telas, fotos de trabajos,
 * telas y diseños de cuadrito y precios. Escribe src/data/contenido.json y deja sus imágenes en src/assets/.
 *
 *   LINUM_API_URL=https://api.linumestudio.es npm run contenido
 *
 * `npm run build` lo ejecuta antes de construir si LINUM_API_URL está definida (así se publica lo que se edita en
 * el panel); sin ella, la web se construye con el contenido.json y las imágenes que haya en el repositorio.
 * Las imágenes de las carpetas gestionadas que ya no están en el contenido se borran.
 */
import { mkdir, readdir, rm, writeFile, rename } from 'node:fs/promises';

const api = process.env.LINUM_API_URL?.replace(/\/+$/, '');
const soloSiHayApi = process.argv.includes('--si-hay-api');

if (!api) {
  if (soloSiHayApi) {
    console.log('LINUM_API_URL no está definida: se usa el contenido del repositorio.');
    process.exit(0);
  }
  console.error('Define LINUM_API_URL con la dirección del back, p. ej. LINUM_API_URL=http://localhost:3001 npm run contenido');
  process.exit(1);
}

const raiz = new URL('../', import.meta.url);
type Item = { slug: string };
type Contenido = { telas: Item[]; trabajos: Item[]; cuadrito: { telas: Item[]; disenos: Item[] }; precios: unknown };

const pedir = async (ruta: string) => {
  const r = await fetch(`${api}${ruta}`, { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`${api}${ruta} → HTTP ${r.status}`);
  return r;
};

const contenido = (await (await pedir('/api/contenido')).json()) as Contenido;
if (!contenido?.telas?.length || !contenido.cuadrito?.telas?.length || !contenido.cuadrito?.disenos?.length || !contenido.precios) {
  throw new Error('El back ha devuelto un contenido incompleto: no se toca nada.');
}

const carpetas: [string, Item[]][] = [
  ['telas', contenido.telas],
  ['trabajos', contenido.trabajos],
  ['cuadritos/telas', contenido.cuadrito.telas],
  ['cuadritos/disenos', contenido.cuadrito.disenos],
];

// Primero se descarga todo a una carpeta temporal; si algo falla, src/ queda como estaba
const tmp = new URL('.contenido-tmp/', raiz);
await rm(tmp, { recursive: true, force: true });
const tareas = carpetas.flatMap(([dir, items]) => items.map((x) => ({ dir, slug: x.slug })));
let hechas = 0;
const trabajar = async () => {
  for (let t = tareas.shift(); t; t = tareas.shift()) {
    if (!/^[a-z0-9-]+$/.test(t.slug)) throw new Error(`Slug no válido: ${t.slug}`);
    const datos = Buffer.from(await (await pedir(`/media/${t.dir}/${t.slug}.jpg`)).arrayBuffer());
    await mkdir(new URL(`${t.dir}/`, tmp), { recursive: true });
    await writeFile(new URL(`${t.dir}/${t.slug}.jpg`, tmp), datos);
    hechas++;
  }
};
await Promise.all(Array.from({ length: 6 }, trabajar));

for (const [dir, items] of carpetas) {
  const destino = new URL(`src/assets/${dir}/`, raiz);
  await mkdir(destino, { recursive: true });
  const quedan = new Set(items.map((x) => `${x.slug}.jpg`));
  for (const f of await readdir(destino)) {
    if (f.endsWith('.jpg') && !quedan.has(f)) await rm(new URL(f, destino));
  }
  for (const f of quedan) await rename(new URL(`${dir}/${f}`, tmp), new URL(f, destino));
}
await rm(tmp, { recursive: true, force: true });
await writeFile(new URL('src/data/contenido.json', raiz), JSON.stringify(contenido, null, 2) + '\n');
console.log(
  `Contenido de ${api}: ${contenido.telas.length} telas, ${contenido.trabajos.length} fotos de trabajos, ` +
    `${contenido.cuadrito.telas.length} telas y ${contenido.cuadrito.disenos.length} diseños de cuadrito (${hechas} imágenes).`
);
