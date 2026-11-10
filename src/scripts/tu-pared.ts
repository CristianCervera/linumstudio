/**
 * «Tu pared»: el cliente ve el tapiz sobre una foto de su casa, a tamaño real. La foto no sale del navegador.
 *
 * Se hace a pantalla completa y en tres pasos (data-paso en la figura de la vista previa):
 *  1. foto: hacerla con la cámara, elegirla de la galería o recuperar la última (guardada en IndexedDB).
 *  2. medir: dos puntos sobre algo cuyo ancho se conoce (sofá, cama, puerta, folio…) y su medida en cm.
 *     De ahí sale la escala: cuántos cm de pared abarca la foto. Una lupa ayuda a acertar con el dedo.
 *  3. colocar: el tapiz sobre la foto, a escala; se arrastra, se cambia de tela deslizando o con las flechas,
 *     y se eligen medida y marco sin salir. Al cerrar, la vista previa normal se queda con la foto.
 *
 * Todo se guarda en fracciones de la foto: los extremos de la medida (ax, ay, bx, by), el centro del tapiz (u, v)
 * y el punto en el que se centra el recorte (fu, fv). La pared reutiliza el pintado del configurador:
 * --fx, --fb y --fcm colocan los marcos (ver .frames en Configurador.astro).
 */

export interface TextosFoto {
  abarca: string;
  raro: string;
  mover: string;
  aprox: string;
  intl: string;
}

interface Opciones {
  figura: HTMLElement;
  wall: HTMLElement;
  form: HTMLFormElement;
  /** Ancho y alto en cm de lo que se cuelga (con marco y, si es díptico, las dos piezas). */
  colgado: () => { ancho: number; alto: number };
  /** Vuelve a pintar la pared según la estancia elegida. */
  colgar: () => void;
  /** Avisa de que lo que se ve ha cambiado (para preparar la imagen de compartir). */
  alCambiar: () => void;
  textos: TextosFoto;
}

type Paso = 'foto' | 'medir' | 'colocar';
type Guardado = {
  foto: Blob;
  pared: typeof paredInicial;
  medida: typeof medidaInicial;
  cm: string;
};

const ANCHO_APROX = 300; // cm de pared que se suponen si no se mide nada
const HUECO_CM = 20; // entre lo que se ha medido (el sofá, la cama…) y el borde de abajo del tapiz
const LUPA = { radio: 60, zoom: 3 };
const paredInicial = { fu: 0.5, fv: 0.45, u: 0.5, v: 0.42, anchoCm: ANCHO_APROX, aprox: true };
const medidaInicial = { ax: 0.32, ay: 0.66, bx: 0.68, by: 0.66 };
const limitar = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

// —— La última foto, en el propio navegador (IndexedDB). Si no se puede, se sigue sin guardar ——
const BD = 'linum-tu-pared';
const ALMACEN = 'fotos';
const abrirBD = () =>
  new Promise<IDBDatabase>((ok, ko) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
async function leerUltima(): Promise<Guardado | null> {
  try {
    const db = await abrirBD();
    return await new Promise((ok) => {
      const q = db.transaction(ALMACEN).objectStore(ALMACEN).get('ultima');
      q.onsuccess = () => ok((q.result as Guardado) ?? null);
      q.onerror = () => ok(null);
    });
  } catch {
    return null;
  }
}
async function guardarUltima(v: Guardado) {
  try {
    const db = await abrirBD();
    db.transaction(ALMACEN, 'readwrite').objectStore(ALMACEN).put(v, 'ultima');
  } catch {}
}

export function iniciarTuPared(o: Opciones) {
  const { figura, wall, form, textos } = o;
  const $ = <T extends Element = HTMLElement>(s: string) => figura.querySelector<T>(s)!;
  const $$ = <T extends Element = HTMLElement>(s: string) => [...figura.querySelectorAll<T>(s)];

  const miFoto = $<HTMLImageElement>('[data-mi-foto]');
  const frames = $('[data-frames]');
  const capaMedida = $('[data-tp-medida]');
  const puntos = { a: $('[data-tp-punto="a"]'), b: $('[data-tp-punto="b"]') };
  const lineas = $$<SVGLineElement>('[data-tp-linea]');
  const cota = $('[data-tp-cota]');
  const lupa = $('[data-tp-lupa]');
  const inputCm = $<HTMLInputElement>('[data-tp-cm]');
  const abarca = $('[data-tp-abarca]');
  const botonColocar = $<HTMLButtonElement>('[data-tp-colocar]');
  const aviso = $('[data-tp-aviso]');
  const avisoTexto = $('[data-tp-aviso-texto]');
  const avisoMedir = $('[data-tp-aviso] [data-tp-ir]');
  const botonUltima = $<HTMLButtonElement>('[data-tp-ultima]');
  const etiquetas = $$('[data-tp-etiqueta]');
  const fondo = (v: string) => form.ownerDocument.querySelector<HTMLInputElement>(`input[name="fondo"][value="${v}"]`);
  const fmt = new Intl.NumberFormat(textos.intl, { maximumFractionDigits: 1 });

  const pared = { ...paredInicial };
  const m = { ...medidaInicial };
  let fotoBlob: Blob | null = null;
  let movido = false; // el cliente ya ha arrastrado el tapiz: se quita la ayuda

  // —— Dónde se pinta la foto: entera mientras se mide (o si recortarla quitaría mucho), si no a sangre ——
  const encaje = () => {
    const sw = wall.clientWidth;
    const sh = wall.clientHeight;
    const cabe = Math.min(sw / miFoto.naturalWidth, sh / miFoto.naturalHeight);
    const cubre = Math.max(sw / miFoto.naturalWidth, sh / miFoto.naturalHeight);
    const entera = wall.dataset.foto === 'midiendo' || cubre / cabe > 1.25;
    const s = entera ? cabe : cubre;
    const w = miFoto.naturalWidth * s;
    const h = miFoto.naturalHeight * s;
    const lado = (hueco: number, mide: number, f: number) =>
      entera ? (hueco - mide) / 2 : limitar(hueco / 2 - f * mide, hueco - mide, 0);
    return { x: lado(sw, w, pared.fu), y: lado(sh, h, pared.fv), w, h, sw, sh };
  };

  // —— La escala: cuántos cm de pared abarca la foto según lo medido ——
  const escala = () => {
    const cm = Number(inputCm.value.replace(',', '.'));
    const d = Math.hypot((m.bx - m.ax) * miFoto.naturalWidth, (m.by - m.ay) * miFoto.naturalHeight);
    if (!(cm > 0) || d < 8) return null;
    return { cm, anchoCm: (miFoto.naturalWidth * cm) / d, pxPorCm: d / cm };
  };

  const pintarMedida = (r: ReturnType<typeof encaje>) => {
    const A = { x: r.x + m.ax * r.w, y: r.y + m.ay * r.h };
    const B = { x: r.x + m.bx * r.w, y: r.y + m.by * r.h };
    Object.assign(puntos.a.style, { left: `${A.x}px`, top: `${A.y}px` });
    Object.assign(puntos.b.style, { left: `${B.x}px`, top: `${B.y}px` });
    for (const l of lineas) {
      l.setAttribute('x1', String(A.x));
      l.setAttribute('y1', String(A.y));
      l.setAttribute('x2', String(B.x));
      l.setAttribute('y2', String(B.y));
    }
    const e = escala();
    cota.textContent = e ? `${fmt.format(e.cm)} cm` : '? cm';
    Object.assign(cota.style, { left: `${(A.x + B.x) / 2}px`, top: `${Math.min(A.y, B.y)}px` });
  };

  const pintar = () => {
    if (!wall.dataset.foto || !miFoto.naturalWidth) return;
    const r = encaje();
    Object.assign(miFoto.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    if (wall.dataset.foto === 'midiendo') return pintarMedida(r);
    const cm = r.w / pared.anchoCm;
    const centroY = r.y + pared.v * r.h;
    wall.style.setProperty('--fx', String(((r.x + pared.u * r.w) / r.sw) * 100));
    wall.style.setProperty('--fcm', String((cm / r.sw) * 100));
    wall.style.setProperty('--fb', String(((r.sh - centroY - (o.colgado().alto * cm) / 2) / r.sh) * 100));
  };

  const actualizarAbarca = () => {
    const e = escala();
    botonColocar.disabled = !e;
    if (!e) {
      abarca.textContent = '';
      return;
    }
    const metros = e.anchoCm / 100;
    const raro = metros < 0.4 || metros > 15;
    abarca.textContent = (raro ? textos.raro : textos.abarca).replace('{m}', fmt.format(metros));
    abarca.toggleAttribute('data-raro', raro);
  };

  const actualizarAviso = () => {
    const mostrar = wall.dataset.foto === 'lista' && (pared.aprox || !movido);
    aviso.hidden = !mostrar;
    avisoTexto.textContent = pared.aprox ? textos.aprox : textos.mover;
    avisoMedir.hidden = !pared.aprox;
  };

  // —— Guardar la última foto (con lo medido y dónde está el tapiz), para la próxima visita ——
  let esperaGuardar = 0;
  const guardar = () => {
    clearTimeout(esperaGuardar);
    esperaGuardar = window.setTimeout(() => {
      if (!fotoBlob || wall.dataset.foto !== 'lista') return;
      guardarUltima({ foto: fotoBlob, pared: { ...pared }, medida: { ...m }, cm: inputCm.value });
      botonUltima.hidden = false;
    }, 400);
  };

  // —— Pasos y pantalla completa ——
  const inmersivo = () => figura.hasAttribute('data-inmersivo');
  const ir = (paso: Paso) => {
    figura.dataset.paso = paso;
    if (paso === 'medir') wall.dataset.foto = 'midiendo';
    else if (paso === 'colocar') wall.dataset.foto = 'lista';
    else if (wall.dataset.foto === 'midiendo') delete wall.dataset.foto;
    for (const li of $$('[data-tp-paso-n]')) li.toggleAttribute('aria-current', li.dataset.tpPasoN === paso);
    if (paso === 'medir') actualizarAbarca();
    o.colgar();
    pintar();
    actualizarAviso();
    if (paso === 'colocar') {
      guardar();
      o.alCambiar();
    }
  };

  let anterior = (form.ownerDocument.querySelector<HTMLInputElement>('input[name="fondo"]:checked')?.value ?? 'salon');
  const elegirFondo = (v: string) => {
    const r = fondo(v);
    if (r) r.checked = true;
  };

  const abrir = (paso?: Paso) => {
    elegirFondo('foto');
    if (!inmersivo()) {
      figura.setAttribute('data-inmersivo', '');
      document.documentElement.classList.add('tp-abierto');
      history.pushState({ tuPared: true }, '');
    }
    ir(paso ?? (wall.dataset.foto === 'lista' ? 'colocar' : miFoto.naturalWidth && fotoBlob ? 'medir' : 'foto'));
    $<HTMLButtonElement>('[data-tp-cerrar]').focus({ preventScroll: true });
  };
  const ocultar = () => {
    if (!inmersivo()) return;
    figura.removeAttribute('data-inmersivo');
    delete figura.dataset.paso;
    document.documentElement.classList.remove('tp-abierto');
    lupa.style.display = 'none';
    // Sin terminar, se vuelve a la estancia de antes; con el tapiz colocado, la vista previa se queda en la foto
    if (wall.dataset.foto !== 'lista') {
      delete wall.dataset.foto;
      elegirFondo(anterior);
    }
    o.colgar();
    pintar();
    o.alCambiar();
    $('[data-tp-abrir]')?.focus({ preventScroll: true });
  };
  const cerrar = () => (history.state?.tuPared ? history.back() : ocultar());
  window.addEventListener('popstate', () => ocultar());
  $('[data-tp-cerrar]').addEventListener('click', cerrar);
  document.addEventListener('keydown', (e) => {
    if (!inmersivo()) return;
    if (e.key === 'Escape') cerrar();
    if (figura.dataset.paso === 'colocar' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !(e.target as Element).closest('input')) {
      cambiarTela(e.key === 'ArrowLeft' ? -1 : 1);
    }
  });

  // «Tu pared» en la lista de estancias o el botón de la vista previa abren la pantalla completa
  form.ownerDocument.querySelector('[data-rooms]')?.addEventListener('change', (e) => {
    const v = (e.target as HTMLInputElement).value;
    if (v !== 'foto') anterior = v;
    else if (wall.dataset.foto !== 'lista') abrir();
  });
  $$('[data-tp-abrir], [data-tp-pantalla]').forEach((b) => b.addEventListener('click', () => abrir()));
  $$('[data-tp-ir]').forEach((b) =>
    b.addEventListener('click', () => {
      const paso = b.dataset.tpIr as Paso;
      if (inmersivo()) ir(paso);
      else abrir(paso);
    })
  );

  // —— Paso 1: la foto ——
  const cargarFoto = async (blob: Blob, guardado?: Guardado) => {
    if (miFoto.src.startsWith('blob:')) URL.revokeObjectURL(miFoto.src);
    miFoto.src = URL.createObjectURL(blob);
    await miFoto.decode().catch(() => {});
    fotoBlob = blob;
    movido = false;
    if (guardado) {
      Object.assign(pared, guardado.pared);
      Object.assign(m, guardado.medida);
      inputCm.value = guardado.cm;
      movido = true;
      ir('colocar');
    } else {
      Object.assign(pared, paredInicial);
      Object.assign(m, medidaInicial);
      ir('medir');
    }
  };
  $$<HTMLInputElement>('[data-tp-archivo]').forEach((input) =>
    input.addEventListener('change', () => {
      const archivo = input.files?.[0];
      input.value = '';
      if (archivo) cargarFoto(archivo);
    })
  );
  leerUltima().then((g) => {
    if (!g?.foto) return;
    botonUltima.hidden = false;
    botonUltima.addEventListener('click', async () => {
      const ultima = await leerUltima();
      if (ultima?.foto) cargarFoto(ultima.foto, ultima);
    });
  });

  // —— Paso 2: medir ——
  const caja = () => wall.getBoundingClientRect();
  const mostrarLupa = (k: 'a' | 'b') => {
    const r = encaje();
    const px = r.x + m[`${k}x`] * r.w;
    const py = r.y + m[`${k}y`] * r.h;
    const R = LUPA.radio;
    // Encima del dedo; si no cabe, debajo
    const arriba = py - 2 * R - 40;
    Object.assign(lupa.style, {
      display: 'block',
      left: `${limitar(px - R, 4, r.sw - 2 * R - 4)}px`,
      top: `${arriba > 4 ? arriba : py + 40}px`,
      backgroundImage: `url("${miFoto.src}")`,
      backgroundSize: `${r.w * LUPA.zoom}px ${r.h * LUPA.zoom}px`,
      backgroundPosition: `${R - (px - r.x) * LUPA.zoom}px ${R - (py - r.y) * LUPA.zoom}px`,
    });
  };
  const moverPunto = (k: 'a' | 'b', clientX: number, clientY: number) => {
    const r = encaje();
    const c = caja();
    m[`${k}x`] = limitar((clientX - c.left - r.x) / r.w, 0, 1);
    m[`${k}y`] = limitar((clientY - c.top - r.y) / r.h, 0, 1);
    pintar();
    mostrarLupa(k);
    actualizarAbarca();
  };
  // Se arrastra un extremo; o se toca la foto y el extremo más cercano salta ahí y sigue al dedo
  const empezar = (k: 'a' | 'b', e: PointerEvent, el: HTMLElement) => {
    e.preventDefault();
    e.stopPropagation();
    el.setPointerCapture(e.pointerId);
    wall.classList.add('arrastrando');
    moverPunto(k, e.clientX, e.clientY);
    const mv = (ev: PointerEvent) => moverPunto(k, ev.clientX, ev.clientY);
    const fin = () => {
      el.removeEventListener('pointermove', mv);
      el.removeEventListener('pointerup', fin);
      el.removeEventListener('pointercancel', fin);
      wall.classList.remove('arrastrando');
      lupa.style.display = 'none';
    };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', fin);
    el.addEventListener('pointercancel', fin);
  };
  (['a', 'b'] as const).forEach((k) => {
    puntos[k].addEventListener('pointerdown', (e) => empezar(k, e, puntos[k]));
    // Con el teclado, las flechas mueven el extremo un poco
    puntos[k].addEventListener('keydown', (e) => {
      const paso = e.shiftKey ? 0.02 : 0.004;
      const d = { ArrowLeft: [-paso, 0], ArrowRight: [paso, 0], ArrowUp: [0, -paso], ArrowDown: [0, paso] }[e.key];
      if (!d) return;
      e.preventDefault();
      m[`${k}x`] = limitar(m[`${k}x`] + d[0], 0, 1);
      m[`${k}y`] = limitar(m[`${k}y`] + d[1], 0, 1);
      pintar();
      actualizarAbarca();
    });
  });
  capaMedida.addEventListener('pointerdown', (e) => {
    if (e.target !== capaMedida && !(e.target as Element).closest('svg')) return;
    const r = encaje();
    const c = caja();
    const x = (e.clientX - c.left - r.x) / r.w;
    const y = (e.clientY - c.top - r.y) / r.h;
    const k = Math.hypot(x - m.ax, y - m.ay) <= Math.hypot(x - m.bx, y - m.by) ? 'a' : 'b';
    empezar(k, e, capaMedida);
  });
  inputCm.addEventListener('input', () => {
    for (const b of $$('[data-tp-ref]')) b.setAttribute('aria-pressed', String(b.dataset.tpRef === inputCm.value));
    pintar();
    actualizarAbarca();
  });
  $$('[data-tp-ref]').forEach((b) =>
    b.addEventListener('click', () => {
      inputCm.value = b.dataset.tpRef!;
      inputCm.dispatchEvent(new Event('input'));
    })
  );

  // Con la escala, el tapiz se coloca: centrado en un folio (que se pega donde iría el tapiz),
  // o encima de un mueble grande, con un hueco de HUECO_CM sobre el punto más alto de lo medido
  botonColocar.addEventListener('click', () => {
    const e = escala();
    if (!e) return;
    pared.anchoCm = e.anchoCm;
    pared.aprox = false;
    pared.u = (m.ax + m.bx) / 2;
    if (e.cm <= 40) pared.v = (m.ay + m.by) / 2;
    else {
      const nh = miFoto.naturalHeight;
      const bordeY = Math.min(m.ay, m.by) * nh;
      pared.v = limitar((bordeY - (HUECO_CM + o.colgado().alto / 2) * e.pxPorCm) / nh, 0.06, 0.94);
    }
    pared.fu = pared.u;
    pared.fv = pared.v;
    movido = false;
    ir('colocar');
  });
  $('[data-tp-sin-medida]').addEventListener('click', () => {
    Object.assign(pared, { anchoCm: ANCHO_APROX, aprox: true, u: 0.5, v: 0.42, fu: 0.5, fv: 0.45 });
    ir('colocar');
  });

  // —— Paso 3: colocar ——
  // Arrastrar el tapiz
  frames.addEventListener('pointerdown', (e) => {
    if (wall.dataset.room !== 'foto' || wall.dataset.foto !== 'lista') return;
    e.preventDefault();
    e.stopPropagation();
    frames.setPointerCapture(e.pointerId);
    wall.classList.add('arrastrando');
    let px = e.clientX;
    let py = e.clientY;
    const mv = (ev: PointerEvent) => {
      const r = encaje();
      pared.u = limitar(pared.u + (ev.clientX - px) / r.w, 0, 1);
      pared.v = limitar(pared.v + (ev.clientY - py) / r.h, 0, 1);
      px = ev.clientX;
      py = ev.clientY;
      pintar();
    };
    const fin = () => {
      frames.removeEventListener('pointermove', mv);
      frames.removeEventListener('pointerup', fin);
      frames.removeEventListener('pointercancel', fin);
      wall.classList.remove('arrastrando');
      movido = true;
      actualizarAviso();
      guardar();
      o.alCambiar();
    };
    frames.addEventListener('pointermove', mv);
    frames.addEventListener('pointerup', fin);
    frames.addEventListener('pointercancel', fin);
  });

  // Cambiar de tela: flechas, teclado o deslizar el dedo sobre la foto
  const cambiarTela = (paso: number) => {
    const telas = [...form.querySelectorAll<HTMLInputElement>('input[name="tela"]')];
    if (!telas.length) return;
    const i = telas.findIndex((t) => t.checked);
    const sig = telas[(i + paso + telas.length) % telas.length];
    sig.checked = true;
    form.dispatchEvent(new Event('change', { bubbles: true }));
    figura.querySelector(`[data-tp-elegir="tela"][data-valor="${CSS.escape(sig.value)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  };
  $$('[data-tp-flecha]').forEach((b) => b.addEventListener('click', () => cambiarTela(Number(b.dataset.tpFlecha))));
  wall.addEventListener('pointerdown', (e) => {
    if (!inmersivo() || figura.dataset.paso !== 'colocar' || (e.target as Element).closest('button, [data-frames]')) return;
    e.preventDefault();
    wall.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const y0 = e.clientY;
    const fin = (ev: PointerEvent) => {
      wall.removeEventListener('pointerup', fin);
      wall.removeEventListener('pointercancel', fin);
      const dx = ev.clientX - x0;
      if (ev.type === 'pointerup' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(ev.clientY - y0) * 1.5) cambiarTela(dx < 0 ? 1 : -1);
    };
    wall.addEventListener('pointerup', fin);
    wall.addEventListener('pointercancel', fin);
  });

  // Tela, medida, marco y díptico sin salir de la pantalla completa: espejo de los del formulario
  $$('[data-tp-elegir]').forEach((b) =>
    b.addEventListener('click', () => {
      const input = form.querySelector<HTMLInputElement>(`input[name="${b.dataset.tpElegir}"][value="${CSS.escape(b.dataset.valor!)}"]`);
      if (!input) return;
      input.checked = true;
      form.dispatchEvent(new Event('change', { bubbles: true }));
    })
  );
  const diptico = form.querySelector<HTMLInputElement>('input[name="diptico"]');
  $$('[data-tp-diptico]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!diptico) return;
      diptico.checked = !diptico.checked;
      form.dispatchEvent(new Event('change', { bubbles: true }));
    })
  );
  $$('[data-tp-compartir]').forEach((b) =>
    b.addEventListener('click', () => form.querySelector<HTMLButtonElement>('[data-compartir]')?.click())
  );

  /** Tras cada cambio del formulario: marca lo elegido, el precio y la medida que se ve sobre el tapiz. */
  const sincronizar = () => {
    for (const b of $$('[data-tp-elegir]')) {
      const input = form.querySelector<HTMLInputElement>(`input[name="${b.dataset.tpElegir}"]:checked`);
      b.setAttribute('aria-pressed', String(input?.value === b.dataset.valor));
    }
    for (const b of $$('[data-tp-diptico]')) b.setAttribute('aria-pressed', String(Boolean(diptico?.checked)));
    const total = form.querySelector('[data-total]')?.textContent ?? '';
    for (const p of $$('[data-tp-precio]')) p.textContent = total;
    const cta = form.querySelector<HTMLAnchorElement>('[data-whatsapp]');
    for (const a of $$<HTMLAnchorElement>('[data-tp-pedir]')) if (cta) a.href = cta.href;
    const tamano = form.querySelector<HTMLInputElement>('input[name="tamano"]:checked');
    const texto = tamano ? `${diptico?.checked ? '2 × ' : ''}${tamano.value} cm` : '';
    for (const e of etiquetas) e.textContent = texto;
    pintar();
  };

  return { pintar, sincronizar, abrir };
}
