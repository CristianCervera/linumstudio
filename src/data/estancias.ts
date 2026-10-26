/**
 * Fondos del configurador: fotos de 2752 × 1536 px. Todo en píxeles de la foto salvo `aire` (cm).
 * - escala: px por cm en el plano de la pared (medido con el mueble de referencia).
 * - cx: centro del hueco donde va el tapiz. apoyo: y del canto superior del mueble. aire: hueco hasta el marco.
 * - techo: y del techo o la moldura, que el tapiz no debe pasar.
 * - obstaculos: [x1, x2, yArriba] de lo que sobresale del mueble; si el tapiz lo taparía, sube.
 * - y0: borde superior del recorte cuadrado que se muestra (lado VISTA px).
 */
export const FOTO = { ancho: 2752, alto: 1536 };
export const VISTA = 1300;

const estanciasFoto = [
  { id: 'salon', escala: 4.7, cx: 1372, apoyo: 898, aire: 22, techo: 0, y0: 236,
    obstaculos: [[740, 800, 616], [318, 670, 628], [2055, 2220, 743], [2305, 2510, 585]] },
  { id: 'dormitorio', escala: 4.8, cx: 1404, apoyo: 633, aire: 18, techo: 0, y0: 0,
    obstaculos: [[616, 722, 748], [2021, 2133, 748], [2150, 2322, 817]] },
  { id: 'infantil', escala: 5.3, cx: 1083, apoyo: 857, aire: 25, techo: 95, y0: 122,
    obstaculos: [[1410, 1480, 857], [2199, 2623, 284]] },
  { id: 'comedor', escala: 4.6, cx: 1380, apoyo: 956, aire: 30, techo: 210, y0: 236,
    obstaculos: [[1011, 1163, 843], [1625, 1766, 812]] },
  { id: 'recibidor', escala: 4.8, cx: 1434, apoyo: 984, aire: 25, techo: 145, y0: 236,
    obstaculos: [[908, 1213, 628], [1656, 1837, 740]] },
  { id: 'despacho', escala: 5.2, cx: 1395, apoyo: 951, aire: 30, techo: 0, y0: 204,
    obstaculos: [[1109, 1166, 860], [1293, 1483, 829], [1634, 1746, 731]] },
  { id: 'bano', escala: 4.6, cx: 900, apoyo: 822, aire: 20, techo: 35, y0: 202,
    obstaculos: [[912, 1027, 915], [1751, 1918, 361]] },
] as const;

export type EstanciaFoto = (typeof estanciasFoto)[number];
export type EstanciaId = 'cerca' | EstanciaFoto['id'];
export const estancias: { id: EstanciaId; foto?: EstanciaFoto }[] = [
  { id: 'cerca' },
  ...estanciasFoto.map((foto) => ({ id: foto.id, foto })),
];

/** Borde izquierdo del recorte, centrado en el hueco sin salirse de la foto. */
export const recorteX = (e: EstanciaFoto) => Math.min(Math.max(e.cx - VISTA / 2, 0), FOTO.ancho - VISTA);

/**
 * Dónde colgar un tapiz (o díptico) de `anchoCm` × `altoCm` con marco incluido.
 * Devuelve el centro y el borde inferior en % del recorte, cuántos % del recorte mide 1 cm
 * el borde superior del recorte (y0), que baja si hace falta para que el tapiz se vea entero,
 * y la altura de su centro como fracción del recorte (cy), para centrarlo en una vista más baja que ancha.
 */
export function colocar(e: EstanciaFoto, anchoCm: number, altoCm: number) {
  const mitad = (anchoCm * e.escala) / 2;
  const margen = 4 * e.escala;
  let base = e.apoyo - e.aire * e.escala;
  for (const [x1, x2, arriba] of e.obstaculos) {
    if (x2 > e.cx - mitad && x1 < e.cx + mitad) base = Math.min(base, arriba - margen);
  }
  const alto = altoCm * e.escala;
  const tope = e.techo + 2 * margen;
  if (base - alto < tope) base = tope + alto;
  const y0 = Math.min(Math.max(Math.min(e.y0, base - alto - 2 * margen), 0), FOTO.alto - VISTA);
  return {
    x: ((e.cx - recorteX(e)) / VISTA) * 100,
    abajo: ((y0 + VISTA - base) / VISTA) * 100,
    cm: (e.escala / VISTA) * 100,
    y0,
    cy: (base - alto / 2 - y0) / VISTA,
  };
}

/** Moldura del marco y separación entre las dos piezas de un díptico, en cm. */
export const MOLDURA = 3;
export const SEPARACION_DIPTICO = 8;

/** Ancho y alto totales que ocupa en la pared un tapiz (o un díptico), con el marco si lo lleva. */
export function medidasColgado(anchoCm: number, altoCm: number, conMarco: boolean, diptico: boolean) {
  const m = conMarco ? 2 * MOLDURA : 0;
  return {
    ancho: diptico ? 2 * (anchoCm + m) + SEPARACION_DIPTICO : anchoCm + m,
    alto: altoCm + m,
  };
}
