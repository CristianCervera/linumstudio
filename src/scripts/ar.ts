/**
 * Verlo con la cámara: el tapiz (o el cuadrito) en realidad aumentada, colgado en la pared a tamaño real.
 *
 * Se genera en el navegador un modelo 3D sencillo con lo elegido (la tela recortada a su medida, el marco y, si es
 * díptico, las dos piezas) y se enseña con <model-viewer>, que abre la realidad aumentada del propio móvil:
 * Quick Look en iPhone y iPad, y WebXR (o Scene Viewer) en Android. Va colgado en la pared (ar-placement="wall")
 * y a escala fija (ar-scale="fixed"): el móvil mide la pared, así que no hace falta foto ni nada que medir.
 * En el ordenador se enseña el modelo para girarlo y un código QR que abre la misma configuración en el móvil.
 *
 * Todo (three.js, model-viewer y el QR) se carga solo al abrirlo, para no hacer más pesada la página.
 */

export interface PiezaAR {
  producto: 'tapiz' | 'cuadrito';
  /** Imagen de la tela (cuadrada) y, en el cuadrito, del diseño de la lámina. */
  tela: string;
  diseno?: string;
  /** Medida de la tela vista, en cm (por dentro del marco). */
  ancho: number;
  alto: number;
  /** Ancho de la moldura en cm (0 sin marco) y su color. */
  moldura: number;
  color: string | null;
  diptico: boolean;
  separacion: number;
  nombre: string;
}

const PROFUNDO = 0.03; // m: grosor del marco
const cargarImagen = (src: string) =>
  new Promise<HTMLImageElement>((ok, ko) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => ok(img);
    img.onerror = () => ko(new Error(`No se ha podido cargar ${src}`));
    img.src = src;
  });

/** La tela recortada a la proporción de la pieza (como object-fit: cover) y, en el cuadrito, con su lámina encima. */
async function texturaLienzo(p: PiezaAR) {
  const tela = await cargarImagen(p.tela);
  const LADO = 1024;
  const canvas = document.createElement('canvas');
  const aspecto = p.ancho / p.alto;
  canvas.width = aspecto >= 1 ? LADO : Math.round(LADO * aspecto);
  canvas.height = aspecto >= 1 ? Math.round(LADO / aspecto) : LADO;
  const ctx = canvas.getContext('2d')!;
  const escala = Math.max(canvas.width / tela.naturalWidth, canvas.height / tela.naturalHeight);
  const sw = canvas.width / escala;
  const sh = canvas.height / escala;
  ctx.drawImage(tela, (tela.naturalWidth - sw) / 2, (tela.naturalHeight - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
  if (p.producto === 'cuadrito' && p.diseno) {
    // La lámina: papel claro centrado algo por encima de la mitad, con el diseño encima (como .lamina en el configurador)
    const lw = canvas.width * 0.47;
    const lh = canvas.height * 0.47;
    const lx = (canvas.width - lw) / 2;
    const ly = canvas.height * 0.47 - lh / 2;
    ctx.fillStyle = '#f8f4ec';
    ctx.shadowColor = 'rgba(40,30,20,0.3)';
    ctx.shadowBlur = canvas.width * 0.012;
    ctx.fillRect(lx, ly, lw, lh);
    ctx.shadowColor = 'transparent';
    const diseno = await cargarImagen(p.diseno);
    const e = Math.min(lw / diseno.naturalWidth, lh / diseno.naturalHeight);
    const dw = diseno.naturalWidth * e;
    const dh = diseno.naturalHeight * e;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(diseno, lx + (lw - dw) / 2, ly + (lh - dh) / 2, dw, dh);
    ctx.globalCompositeOperation = 'source-over';
  }
  return canvas;
}

/** El modelo en GLB: la parte de atrás en z = 0 (contra la pared) y la tela mirando hacia +z. Medidas en metros. */
async function crearModelo(p: PiezaAR): Promise<Blob> {
  const THREE = await import('three');
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');

  const W = p.ancho / 100;
  const H = p.alto / 100;
  const m = p.moldura / 100;
  const textura = new THREE.CanvasTexture(await texturaLienzo(p));
  textura.colorSpace = THREE.SRGBColorSpace;
  const matTela = new THREE.MeshStandardMaterial({ map: textura, roughness: 0.92, metalness: 0 });
  const matMarco = new THREE.MeshStandardMaterial({ color: p.color ?? '#d9cfc1', roughness: 0.65, metalness: 0 });
  const matFondo = new THREE.MeshStandardMaterial({ color: '#d9cfc1', roughness: 1, metalness: 0 });

  const pieza = () => {
    const g = new THREE.Group();
    const fondo = m > 0 ? PROFUNDO - 0.006 : 0.02; // la tela va algo hundida en el marco; sin marco, sobre un bastidor
    const bastidor = new THREE.Mesh(new THREE.BoxGeometry(W, H, fondo), matFondo);
    bastidor.position.z = fondo / 2;
    g.add(bastidor);
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(W, H), matTela);
    tela.position.z = fondo + 0.0005;
    g.add(tela);
    if (m > 0) {
      const liston = (w: number, h: number, x: number, y: number) => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(w, h, PROFUNDO), matMarco);
        l.position.set(x, y, PROFUNDO / 2);
        g.add(l);
      };
      liston(W + 2 * m, m, 0, H / 2 + m / 2);
      liston(W + 2 * m, m, 0, -H / 2 - m / 2);
      liston(m, H, -W / 2 - m / 2, 0);
      liston(m, H, W / 2 + m / 2, 0);
    }
    return g;
  };

  const escena = new THREE.Scene();
  if (p.diptico) {
    const paso = W + 2 * m + p.separacion / 100;
    const a = pieza();
    const b = pieza();
    a.position.x = -paso / 2;
    b.position.x = paso / 2;
    escena.add(a, b);
  } else escena.add(pieza());

  const glb = (await new GLTFExporter().parseAsync(escena, { binary: true })) as ArrayBuffer;
  return new Blob([glb], { type: 'model/gltf-binary' });
}

/** ¿Móvil o tableta? En ellos se ofrece la realidad aumentada; en el ordenador, el QR. */
export const esMovil = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || // iPad que se presenta como Mac
  matchMedia('(pointer: coarse) and (hover: none)').matches;

let modelViewerCargado: Promise<unknown> | null = null;

/**
 * Abre el diálogo: genera el modelo, lo enseña y, en el móvil, ofrece verlo en la pared;
 * en el ordenador, el QR con `url`.
 */
export async function abrirAR(dialogo: HTMLDialogElement, pieza: PiezaAR, url: string) {
  const $ = <T extends Element = HTMLElement>(s: string) => dialogo.querySelector<T>(s)!;
  const visor = $('[data-ar-visor]');
  const activar = $<HTMLButtonElement>('[data-ar-activar]');
  const no = $('[data-ar-no]');
  const movil = esMovil();
  dialogo.dataset.modo = movil ? 'movil' : 'escritorio';
  dialogo.dataset.estado = 'cargando';
  $('[data-ar-titulo]').textContent = pieza.producto === 'cuadrito' ? dialogo.dataset.tituloCuadrito! : dialogo.dataset.titulo!;
  $('[data-ar-nombre]').textContent = pieza.nombre;
  no.hidden = true;
  activar.hidden = !movil;
  activar.disabled = true;
  visor.querySelector('model-viewer')?.remove();
  if (!dialogo.open) dialogo.showModal();

  if (!movil) {
    const { default: qrcode } = await import('qrcode-generator');
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    $('[data-ar-qr]').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }

  try {
    modelViewerCargado ??= import('@google/model-viewer');
    const [blob] = await Promise.all([crearModelo(pieza), modelViewerCargado]);
    const anterior = visor.dataset.url;
    if (anterior) URL.revokeObjectURL(anterior);
    const src = URL.createObjectURL(blob);
    visor.dataset.url = src;

    const mv = document.createElement('model-viewer') as HTMLElement & { canActivateAR: boolean; activateAR: () => Promise<void> };
    Object.entries({
      src,
      alt: pieza.nombre,
      ar: '',
      'ar-modes': 'webxr scene-viewer quick-look',
      'ar-placement': 'wall',
      'ar-scale': 'fixed',
      'camera-controls': '',
      'touch-action': 'pan-y',
      'shadow-intensity': '0.6',
      'environment-image': 'neutral',
      exposure: '1.05',
      'camera-orbit': '20deg 80deg auto',
      'interaction-prompt': 'none',
    }).forEach(([k, v]) => mv.setAttribute(k, v));
    // El botón propio de model-viewer no se usa: se abre con el nuestro
    const sinBoton = document.createElement('span');
    sinBoton.slot = 'ar-button';
    mv.append(sinBoton);
    visor.append(mv);
    await new Promise<void>((ok) => mv.addEventListener('load', () => ok(), { once: true }));
    dialogo.dataset.estado = 'listo';
    if (movil) {
      // canActivateAR se sabe tras cargar; en algunos navegadores tarda un instante más
      await new Promise((r) => setTimeout(r, 300));
      activar.disabled = !mv.canActivateAR;
      no.hidden = mv.canActivateAR;
      activar.hidden = !mv.canActivateAR;
      activar.onclick = () => mv.activateAR();
    }
  } catch (e) {
    console.error(e);
    dialogo.dataset.estado = 'error';
    no.hidden = false;
    activar.hidden = true;
  }
}
