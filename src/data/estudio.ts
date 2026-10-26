import type { ImageMetadata } from 'astro';

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
  catalogo: { href: '/catalogo-linum-2026.pdf', paginas: 9 },
};

export type Familia = 'ikat' | 'floral';

export const familias: Familia[] = ['ikat', 'floral'];

const telasBase: { nombre: string; slug: string; familia: Familia; nueva?: boolean }[] = [
  { nombre: 'Cádiz', slug: 'cadiz', familia: 'floral', nueva: true },
  { nombre: 'Mumbai', slug: 'mumbai', familia: 'floral', nueva: true },
  { nombre: 'Osaka', slug: 'osaka', familia: 'floral', nueva: true },
  { nombre: 'Bristol', slug: 'bristol', familia: 'floral', nueva: true },
  { nombre: 'Ubud', slug: 'ubud', familia: 'floral', nueva: true },
  { nombre: 'Melbourne', slug: 'melbourne', familia: 'floral', nueva: true },
  { nombre: 'Granada', slug: 'granada', familia: 'ikat', nueva: true },
  { nombre: 'Tulum', slug: 'tulum', familia: 'ikat', nueva: true },
  { nombre: 'Habana', slug: 'habana', familia: 'floral' },
  { nombre: 'Valencia', slug: 'valencia', familia: 'floral' },
  { nombre: 'Estambul', slug: 'estambul', familia: 'ikat' },
  { nombre: 'Londres', slug: 'londres', familia: 'ikat' },
  { nombre: 'Atenas', slug: 'atenas', familia: 'ikat' },
  { nombre: 'Venecia', slug: 'venecia', familia: 'ikat' },
  { nombre: 'Marrakech', slug: 'marrakech', familia: 'ikat' },
  { nombre: 'Katmandú', slug: 'katmandu', familia: 'ikat' },
  { nombre: 'Tánger', slug: 'tanger', familia: 'ikat' },
  { nombre: 'Cairo', slug: 'cairo', familia: 'ikat' },
  { nombre: 'Roma', slug: 'roma', familia: 'ikat' },
  { nombre: 'Zanzíbar', slug: 'zanzibar', familia: 'ikat' },
  { nombre: 'Bogotá', slug: 'bogota', familia: 'floral' },
  { nombre: 'Phuket', slug: 'phuket', familia: 'floral' },
  { nombre: 'Kioto', slug: 'kioto', familia: 'floral' },
  { nombre: 'Santorini', slug: 'santorini', familia: 'floral' },
];

export const telas = telasBase.map((t) => ({ ...t, imagen: img(telaImgs, 'telas', t.slug) }));

/** Tarifas del catálogo 2026. Cada tramo agrupa dos medidas con el mismo precio. */
export const tamanos = [
  { medida: '60 × 40', ancho: 40, alto: 60, precio: 80 },
  { medida: '50 × 50', ancho: 50, alto: 50, precio: 80 },
  { medida: '70 × 50', ancho: 50, alto: 70, precio: 90 },
  { medida: '60 × 60', ancho: 60, alto: 60, precio: 90 },
  { medida: '90 × 60', ancho: 60, alto: 90, precio: 110 },
  { medida: '80 × 70', ancho: 70, alto: 80, precio: 110 },
  { medida: '100 × 70', ancho: 70, alto: 100, precio: 130 },
  { medida: '90 × 80', ancho: 80, alto: 90, precio: 130 },
];

export const tarifas = [
  { medidas: '60 × 40 · 50 × 50 cm', precio: 80 },
  { medidas: '70 × 50 · 60 × 60 cm', precio: 90 },
  { medidas: '90 × 60 · 80 × 70 cm', precio: 110 },
  { medidas: '100 × 70 · 90 × 80 cm', precio: 130 },
];

export const enmarcado = { precio: 30 };
export const diptico = { descuento: 0.25 };

export const marcos = [
  { id: 'sin', color: null },
  { id: 'natural', color: '#c39a6b' },
  { id: 'blanca', color: '#ece6dc' },
  { id: 'negra', color: '#2b2622' },
] as const;

/** Textos (alt y pie) en src/i18n/ui.ts, por slug. */
export const trabajos = [
  'instalacion-ikat',
  'diptico-salon',
  'flores-aparte',
  'habana-dormitorio',
  'diptico-dormitorio',
  'ikat-verde-infantil',
  'granada-recibidor',
  'osaka-cocina',
  'ubud-dormitorio',
  'londres-estante',
  'cadiz-diptico',
  'valencia-bano',
  'tulum-comedor',
  'katmandu-patio',
].map((slug) => ({ slug, imagen: img(trabajoImgs, 'trabajos', slug) }));

export const imagenes = {
  heroDetalle: img(trabajoImgs, 'trabajos', 'detalle-bogota'),
};
