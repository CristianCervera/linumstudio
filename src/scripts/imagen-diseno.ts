/**
 * Dibuja en un canvas lo que se ve en la vista previa del configurador (la estancia y el tapiz o el cuadrito),
 * recortado como la pared: en móvil solo se ve una franja de la escena y la imagen es esa franja,
 * con un pie de tela, medida, marco y precio, y lo devuelve como JPEG para compartir.
 * Copia la posición y el tamaño de cada elemento tal como los pinta el navegador, así la imagen
 * coincide con la vista previa sin repetir los cálculos de colocación.
 */

const ANCHO = 1080;
const PIE = 210;

export interface Pie { nombre: string; detalle: string; precio: string; marca: string }

const cargada = async (img: HTMLImageElement) => {
  if (!img.complete || !img.naturalWidth) await img.decode().catch(() => {});
};

/** Dibuja `img` cubriendo el rectángulo (como object-fit: cover). */
function cubrir(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const escala = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / escala;
  const sh = h / escala;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

/** Dibuja `img` entera dentro del rectángulo (como object-fit: contain). */
function contener(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const escala = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * escala;
  const dh = img.naturalHeight * escala;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Hilos sueltos alrededor de un retal de tela, como los flecos de la lámina impresa en tela. */
function flecos(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, largo: number, color: string) {
  ctx.fillStyle = color;
  const paso = Math.max(2, largo / 4);
  const hilo = Math.max(1, paso / 2.5);
  // Pseudoaleatorio fijo, para que la misma lámina salga siempre igual
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);
  for (let i = x; i < x + w; i += paso) {
    ctx.fillRect(i, y - largo * (0.5 + azar() / 2), hilo, largo);
    ctx.fillRect(i, y + h - largo * azar() / 2, hilo, largo);
  }
  for (let j = y; j < y + h; j += paso) {
    ctx.fillRect(x - largo * (0.5 + azar() / 2), j, largo, hilo);
    ctx.fillRect(x + w - largo * azar() / 2, j, largo, hilo);
  }
}

export async function imagenDiseno(wall: HTMLElement, pie: Pie): Promise<Blob> {
  const escena = wall.querySelector<HTMLElement>('.scene')!;
  const caja = wall.getBoundingClientRect();
  const k = ANCHO / caja.width;
  const alto = Math.round(caja.height * k);
  const css = getComputedStyle(document.documentElement);
  const token = (n: string) => css.getPropertyValue(n).trim();

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO;
  canvas.height = alto + PIE;
  const ctx = canvas.getContext('2d')!;
  const rect = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - caja.left) * k, y: (r.top - caja.top) * k, w: r.width * k, h: r.height * k };
  };

  // Fondo: la foto de la estancia (o la del cliente), o la pared lisa con suelo en la vista de cerca
  ctx.fillStyle = token('--wall');
  ctx.fillRect(0, 0, ANCHO, alto);
  const foto = [...escena.querySelectorAll<HTMLImageElement>('[data-estancia]')].find((img) => img.offsetParent);
  if (foto) {
    await cargada(foto);
    const r = rect(foto);
    ctx.drawImage(foto, r.x, r.y, r.w, r.h);
  } else {
    const luz = ctx.createRadialGradient(ANCHO * 0.3, 0, 0, ANCHO * 0.3, 0, ANCHO * 0.9);
    luz.addColorStop(0, token('--wall-light'));
    luz.addColorStop(0.6, token('--wall'));
    ctx.fillStyle = luz;
    ctx.fillRect(0, 0, ANCHO, alto);
    const suelo = escena.querySelector('.floor');
    if (suelo) {
      const r = rect(suelo);
      ctx.fillStyle = 'rgb(0 0 0 / 0.06)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }

  // Tapiz o díptico: marco, sombra y tela
  for (const frame of escena.querySelectorAll<HTMLElement>('.frame')) {
    if (!frame.offsetParent) continue;
    const r = rect(frame);
    const estilo = getComputedStyle(frame);
    const tela = frame.querySelector('img')!;
    await cargada(tela);
    ctx.save();
    ctx.shadowColor = 'rgb(30 20 10 / 0.35)';
    ctx.shadowBlur = Math.max(6, r.w * 0.04);
    ctx.shadowOffsetY = Math.max(3, r.w * 0.02);
    ctx.fillStyle = estilo.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#000' : estilo.backgroundColor;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    const p = parseFloat(estilo.paddingLeft) * k;
    cubrir(ctx, tela, r.x + p, r.y + p, r.w - 2 * p, r.h - 2 * p);

    // Cuadrito: la lámina, de papel o de tela con flecos, y el diseño impreso encima
    const lamina = frame.querySelector<HTMLElement>('.lamina');
    if (!lamina?.offsetParent) continue;
    const l = rect(lamina);
    const el = getComputedStyle(lamina);
    const fondo = el.getPropertyValue('--lino').trim() || el.getPropertyValue('--papel').trim();
    if (el.getPropertyValue('--lino').trim()) flecos(ctx, l.x, l.y, l.w, l.h, l.w * 0.045, fondo);
    ctx.save();
    ctx.shadowColor = 'rgb(40 30 20 / 0.25)';
    ctx.shadowBlur = Math.max(2, l.w * 0.03);
    ctx.shadowOffsetY = Math.max(1, l.w * 0.012);
    ctx.fillStyle = fondo;
    ctx.fillRect(l.x, l.y, l.w, l.h);
    ctx.restore();
    const diseno = lamina.querySelector('img')!;
    await cargada(diseno);
    const px = parseFloat(el.paddingLeft) * k;
    const py = parseFloat(el.paddingTop) * k;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    contener(ctx, diseno, l.x + px, l.y + py, l.w - 2 * px, l.h - 2 * py);
    ctx.restore();
  }

  // Pie con el diseño y la marca
  const display = token('--font-display');
  const body = token('--font-body');
  await document.fonts.ready;
  ctx.fillStyle = token('--raised');
  ctx.fillRect(0, alto, ANCHO, PIE);
  ctx.fillStyle = token('--rule');
  ctx.fillRect(0, alto, ANCHO, 2);
  const m = 56;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = token('--ink');
  ctx.font = `500 64px ${display}`;
  ctx.fillText(pie.nombre, m, alto + 88);
  ctx.textAlign = 'right';
  ctx.font = `600 60px ${display}`;
  ctx.fillText(pie.precio, ANCHO - m, alto + 88);
  ctx.textAlign = 'left';
  ctx.fillStyle = token('--ink-2');
  ctx.font = `400 30px ${body}`;
  ctx.fillText(pie.detalle, m, alto + 136, ANCHO - 2 * m);
  ctx.fillStyle = token('--accent');
  ctx.font = `500 24px ${body}`;
  ctx.fillText(pie.marca, m, alto + 180, ANCHO - 2 * m);

  return new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error('toBlob'))), 'image/jpeg', 0.9));
}
