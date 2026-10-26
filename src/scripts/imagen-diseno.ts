/**
 * Dibuja en un canvas lo que se ve en la vista previa del configurador (la estancia y el tapiz)
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

export async function imagenDiseno(wall: HTMLElement, pie: Pie): Promise<Blob> {
  const escena = wall.querySelector<HTMLElement>('.scene')!;
  const caja = escena.getBoundingClientRect();
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

  // Fondo: la foto de la estancia, o la pared lisa con suelo en la vista de cerca
  ctx.fillStyle = token('--wall');
  ctx.fillRect(0, 0, ANCHO, alto);
  const foto = [...escena.querySelectorAll<HTMLImageElement>('.estancia')].find((img) => img.offsetParent);
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
