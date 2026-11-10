import type { ImageMetadata } from 'astro';
import contenido from './contenido.json' with { type: 'json' };

const telaImgs = import.meta.glob<{ default: ImageMetadata }>('../assets/telas/*.jpg', { eager: true });
const trabajoImgs = import.meta.glob<{ default: ImageMetadata }>('../assets/trabajos/*.jpg', { eager: true });

const img = (set: typeof telaImgs, dir: string, slug: string) => {
  const mod = set[`../assets/${dir}/${slug}.jpg`];
  if (!mod) throw new Error(`Falta la imagen ${dir}/${slug}.jpg`);
  return mod.default;
};

export const contacto = {
  telefono: '+34 634 264 135',
  telefonoHref: 'tel:+34634264135',
  whatsapp: 'https://wa.me/34634264135',
  instagram: 'https://www.instagram.com/linumestudio/',
  instagramUser: '@linumestudio',
  muestrario: { nombre: 'Flores Aparte', instagram: 'https://www.instagram.com/floresaparte/' },
  direccion: ['C/ de les Avellanes 19', '46003 Valencia'],
  mapa: 'https://maps.google.com/?q=Carrer+de+les+Avellanes+19,+46003+Valencia',
  catalogo: { href: '/catalogo-linum-2026.pdf', paginas: 11 },
};

export type Familia = 'ikat' | 'floral';

export const familias: Familia[] = ['ikat', 'floral'];

// Telas, trabajos, cuadritos y precios viven en contenido.json, que se edita desde el panel (/admin/)
// y `npm run contenido` descarga del back con sus imágenes. Lo que no es visible no sale en la web.
const visibles = <T extends { visible?: boolean }>(xs: T[]) => xs.filter((x) => x.visible !== false);

export const telas = visibles(contenido.telas).map((t) => ({
  nombre: t.nombre,
  slug: t.slug,
  familia: t.familia as Familia,
  nueva: t.nueva,
  destacada: t.destacada,
  imagen: img(telaImgs, 'telas', t.slug),
}));

/** Telas que salen de muestra en la portada y en la cabecera de los tapices. */
export const telasDestacadas = telas.filter((t) => t.destacada).length ? telas.filter((t) => t.destacada) : telas.slice(0, 7);

/** Tarifas del catálogo. Las medidas se escriben alto × ancho; las que comparten precio van en el mismo tramo. */
const precios = contenido.precios;
export const tamanos = precios.tamanos.map((t) => ({ medida: `${t.alto} × ${t.ancho}`, ancho: t.ancho, alto: t.alto, precio: t.precio }));

export const tarifas = [...new Set(tamanos.map((t) => t.precio))].map((precio) => ({
  medidas: `${tamanos.filter((t) => t.precio === precio).map((t) => t.medida).join(' · ')} cm`,
  precio,
}));

export const enmarcado = { precio: precios.enmarcado };
export const diptico = { descuento: precios.diptico };

/**
 * Cuadritos: una lámina sobre tela de fondo, en marco de madera natural (incluido). Catálogo de cuadritos 2026.
 * Las medidas son por fuera del marco; los nombres de telas y diseños, en contenido.json.
 */
const cuadritoTelaImgs = import.meta.glob<{ default: ImageMetadata }>('../assets/cuadritos/telas/*.jpg', { eager: true });
const disenoImgs = import.meta.glob<{ default: ImageMetadata }>('../assets/cuadritos/disenos/*.jpg', { eager: true });

export const cuadrito = {
  medida: '27 × 20',
  ancho: 20,
  alto: 27,
  moldura: 2,
  telas: visibles(contenido.cuadrito.telas).map(({ slug }) => ({
    slug,
    imagen: img(cuadritoTelaImgs, 'cuadritos/telas', slug),
  })),
  disenos: visibles(contenido.cuadrito.disenos).map(({ slug }) => ({
    slug,
    imagen: img(disenoImgs, 'cuadritos/disenos', slug),
  })),
  impresiones: [
    { id: 'papel', precio: precios.impresiones.papel },
    { id: 'tela', precio: precios.impresiones.tela },
  ] as const,
};

export type Impresion = (typeof cuadrito.impresiones)[number]['id'];

export const marcos = [
  { id: 'sin', color: null },
  { id: 'natural', color: '#c39a6b' },
  { id: 'blanca', color: '#ece6dc' },
  { id: 'negra', color: '#2b2622' },
] as const;

export type Producto = 'tapiz' | 'cuadrito';

/** Fotos de trabajos de cada producto, para su página. Textos (alt y pie) en contenido.json, por slug. */
const trabajosVisibles = visibles(contenido.trabajos).map((t) => ({ ...t, imagen: img(trabajoImgs, 'trabajos', t.slug) }));
const trabajosDe = (p: Producto) => trabajosVisibles.filter((t) => t.producto === p).map(({ slug, imagen }) => ({ slug, imagen }));
export const trabajos: Record<Producto, { slug: string; imagen: ImageMetadata }[]> = {
  tapiz: trabajosDe('tapiz'),
  cuadrito: trabajosDe('cuadrito'),
};

/** Precio más bajo de cada producto, para los «desde». */
export const desde: Record<Producto, number> = {
  tapiz: Math.min(...tarifas.map((x) => x.precio)),
  cuadrito: Math.min(...cuadrito.impresiones.map((i) => i.precio)),
};

/**
 * Imágenes sueltas que se cambian desde el panel (src/assets/<slug>.jpg) y, en las que se recortan, el punto
 * que queda en el centro. `compartir` es opcional: sin ella, og.jpg se hace con tres fotos de trabajos.
 */
type Web = Partial<Record<string, { imagen?: boolean; pos?: string }>>;
const web = ((contenido as { web?: Web }).web ?? {}) as Web;
export const encuadre = (slug: string, porDefecto: string) => web[slug]?.pos ?? porDefecto;
export const hayImagenWeb = (slug: string) => web[slug]?.imagen === true;

/** Todas las fotos de trabajos visibles (también las que no son de ningún producto), para el mosaico de la cabecera. */
export const mosaico = [...trabajosVisibles].sort((a, b) => a.slug.localeCompare(b.slug)).map((t) => t.imagen);
