// Imagen para compartir la web (WhatsApp, Instagram, Facebook…): tres trabajos en tríptico, 1200 × 630
import type { APIRoute } from 'astro';
import sharp from 'sharp';

// Las medidas se repiten en las etiquetas og:image de Base.astro
const OG = { ancho: 1200, alto: 630, fotos: ['valencia-salon', 'habana-pared-verde', 'katmandu-patio'] };

export const GET: APIRoute = async () => {
  const hueco = 6;
  const ancho = (OG.ancho - hueco * (OG.fotos.length - 1)) / OG.fotos.length;
  const piezas = await Promise.all(
    OG.fotos.map((f) => sharp(`src/assets/trabajos/${f}.jpg`).resize(Math.round(ancho), OG.alto, { fit: 'cover' }).toBuffer())
  );
  const jpg = await sharp({ create: { width: OG.ancho, height: OG.alto, channels: 3, background: '#faf6f0' } })
    .composite(piezas.map((input, i) => ({ input, left: Math.round(i * (ancho + hueco)), top: 0 })))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg' } });
};
