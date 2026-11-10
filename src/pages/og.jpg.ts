// Imagen para compartir la web (WhatsApp, Instagram, Facebook…): tres trabajos en tríptico, 1200 × 630
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import contenido from '../data/contenido.json' with { type: 'json' };

// Las medidas se repiten en las etiquetas og:image de Base.astro
// Si alguna de las preferidas ya no está, se completa con otras fotos de trabajos visibles.
const preferidas = ['valencia-salon', 'habana-pared-verde', 'katmandu-patio'];
const ruta = (slug: string) => `src/assets/trabajos/${slug}.jpg`;
const disponibles = contenido.trabajos.filter((t) => t.visible !== false && existsSync(ruta(t.slug))).map((t) => t.slug);
const fotos = [...preferidas.filter((s) => disponibles.includes(s)), ...disponibles.filter((s) => !preferidas.includes(s))].slice(0, 3);
const OG = { ancho: 1200, alto: 630, fotos };

export const GET: APIRoute = async () => {
  // Si en el panel se ha subido una imagen para compartir, se usa esa
  const propia = 'src/assets/compartir.jpg';
  if ((contenido as { web?: { compartir?: { imagen?: boolean } } }).web?.compartir?.imagen && existsSync(propia)) {
    const jpg = await sharp(propia).resize(OG.ancho, OG.alto, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg' } });
  }
  const hueco = 6;
  const ancho = (OG.ancho - hueco * (OG.fotos.length - 1)) / OG.fotos.length;
  const piezas = await Promise.all(
    OG.fotos.map((f) => sharp(ruta(f)).resize(Math.round(ancho), OG.alto, { fit: 'cover' }).toBuffer())
  );
  const jpg = await sharp({ create: { width: OG.ancho, height: OG.alto, channels: 3, background: '#faf6f0' } })
    .composite(piezas.map((input, i) => ({ input, left: Math.round(i * (ancho + hueco)), top: 0 })))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg' } });
};
