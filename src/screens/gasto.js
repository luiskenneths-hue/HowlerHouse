// Formulario para registrar o editar un gasto. Ruta: #/gasto (nuevo) o #/gasto/ID (editar).
import { esc, money, miles, toast, confirmar, cargando, ICONO_ATRAS } from '../ui.js';
import { datos, listo } from '../data/store.js';
import { LISTA as SOCIOS, nombreSocio } from '../socios.js';
import { aInputFecha, deInputFecha, fechaLarga } from '../domain/fechas.js';
import { crearGasto, actualizarGasto, eliminarGasto } from '../data/gastos.js';

export const id = 'gasto';
export const padre = 'gastos';
export const sinNav = true;
export const tab = 'gastos';
export const reactivo = false; // se vuelve a pintar solo al terminar de cargar; así no se pierde lo escrito

let F = null; // estado del formulario

export const alSalir = () => { F = null; };

const nuevoForm = () => ({ monto: '', desc: '', tipoId: '', fecha: aInputFecha(new Date()), fuente: 'fondo', reemb: true, error: '' });
const desdeGasto = (g) => ({
  monto: String(g.monto), desc: g.descripcion, tipoId: g.tipoId, fecha: aInputFecha(g.fecha),
  fuente: g.fuente === 'FONDO' ? 'fondo' : g.socio, reemb: !!g.reembolsable, error: ''
});

const cabecera = (titulo) => `<header class="screen-head">
  <button class="icon-btn" data-acc="volver" aria-label="Volver" style="display:flex;align-items:center;justify-content:center">${ICONO_ATRAS}</button>
  <h1 style="flex:1;margin-left:12px;font-size:22px">${esc(titulo)}</h1></header><div class="rule"></div>`;

export function vista(ctx) {
  const titulo = ctx.param ? 'EDITAR GASTO' : 'NUEVO GASTO';
  const { gastos, tipos, error } = datos();
  if (error) return `${cabecera(titulo)}<section class="card"><p class="error" role="alert">${esc(error)}</p></section>`;
  if (!listo()) return cabecera(titulo) + cargando();

  let original = null;
  if (ctx.param) {
    original = gastos.find((g) => g.id === ctx.param);
    if (!original) {
      return `${cabecera(titulo)}<section class="card soon"><h2>Gasto no encontrado</h2><p>Puede que ya se haya eliminado.</p><a class="btn btn-link" href="#/gastos">Volver a gastos</a></section>`;
    }
    if (original.estadoReembolso === 'REEMBOLSADO') {
      return `${cabecera('GASTO')}
        <section class="card"><h2>${esc(original.descripcion)}</h2>
          <p class="muted">${money(original.monto)} · ${fechaLarga(original.fecha)} · pagó ${esc(nombreSocio(original.socio))}</p>
          <div class="aviso"><span>Este gasto ya fue reembolsado y no se puede editar. Para cambiarlo, primero deshaz el reembolso en la pestaña Reembolsos.</span></div>
          <a class="btn btn-link" href="#/reembolsos">Ir a Reembolsos</a></section>`;
    }
  }
  const clave = ctx.param || 'nuevo';
  if (!F || F.clave !== clave) { F = original ? desdeGasto(original) : nuevoForm(); F.clave = clave; }

  const tiposVis = tipos.filter((t) => !t.oculto || t.id === F.tipoId);
  const fuentes = [{ id: 'fondo', n: 'Fondo' }, ...SOCIOS.map((s) => ({ id: s.id, n: s.nombre }))];
  const esSocio = F.fuente !== 'fondo';
  const quien = esSocio ? nombreSocio(F.fuente) : '';
  let resumen;
  if (!esSocio) resumen = 'Se descontará del saldo del fondo de la casa.';
  else if (F.reemb) resumen = `Quedará como pendiente de reembolso para ${quien}. El fondo se lo devolverá gasto por gasto.`;
  else resumen = `Quedará como aporte definitivo de ${quien}, sin devolución.`;

  return `${cabecera(titulo)}
    <div class="form">
      <div class="field"><label for="f-monto">MONTO</label>
        <div class="monto-box"><span class="moneda">₡</span>
          <input id="f-monto" type="text" inputmode="numeric" autocomplete="off" value="${esc(miles(F.monto))}" placeholder="0"></div></div>
      <div class="field"><label for="f-desc">DESCRIPCIÓN</label>
        <input id="f-desc" type="text" maxlength="100" autocomplete="off" value="${esc(F.desc)}" placeholder="Ej: Reparación de bomba de agua"></div>
      <div class="bloque">
        <div class="fila-etiqueta"><span class="etiqueta">TIPO DE GASTO</span><a class="enlace" href="#/tipos">Administrar tipos</a></div>
        <div class="chips wrap">${tiposVis.map((t) => `<button class="chip${F.tipoId === t.id ? ' on' : ''}" data-acc="tipo" data-v="${esc(t.id)}">${esc(t.nombre)}</button>`).join('')}</div>
      </div>
      <div class="field"><label for="f-fecha">FECHA</label><input id="f-fecha" type="date" value="${esc(F.fecha)}"></div>
      <div class="bloque"><span class="etiqueta">¿DE DÓNDE SALIÓ EL DINERO?</span>
        <div class="seg" role="group" aria-label="Fuente del dinero">${fuentes.map((f) => `<button class="${F.fuente === f.id ? 'on' : ''}" data-acc="fuente" data-v="${esc(f.id)}">${esc(f.n)}</button>`).join('')}</div></div>
      ${esSocio ? `<div class="switch-row"><div class="txt"><strong>¿Se reembolsa?</strong><span class="muted">El fondo se lo devolverá después</span></div>
        <button class="switch" role="switch" aria-label="Se reembolsa" aria-checked="${F.reemb}" data-acc="reemb"><span class="pista"><span class="perilla"></span></span></button></div>` : ''}
      <div class="aviso"><span>${esc(resumen)}</span></div>
      ${F.error ? `<div class="error form-error" role="alert">${esc(F.error)}</div>` : ''}
      <button class="btn" data-acc="guardar">${ctx.param ? 'Guardar cambios' : 'Guardar gasto'}</button>
      ${ctx.param ? '<button class="btn-peligro" data-acc="eliminar">Eliminar gasto</button>' : ''}
    </div>`;
}

function guardar(ctx) {
  const monto = parseInt(F.monto || '0', 10);
  const descripcion = F.desc.trim();
  const fecha = deInputFecha(F.fecha);
  let err = '';
  if (!monto) err = 'Escribe el monto del gasto.';
  else if (!descripcion) err = 'Escribe una descripción.';
  else if (!F.tipoId) err = 'Elige el tipo de gasto.';
  else if (!fecha) err = 'Revisa la fecha.';
  if (err) {
    F.error = err;
    ctx.repintar(true);
    document.querySelector('.form-error')?.scrollIntoView({ block: 'center' });
    return;
  }
  const datosGasto = {
    monto, descripcion, tipoId: F.tipoId, fecha,
    fuente: F.fuente === 'fondo' ? 'FONDO' : 'SOCIO', socio: F.fuente === 'fondo' ? null : F.fuente, reembolsable: F.reemb
  };
  const op = ctx.param ? actualizarGasto(ctx.param, datosGasto, ctx.user.email) : crearGasto(datosGasto, ctx.user.email);
  // No se espera la respuesta del servidor: sin internet queda guardado y se envía al volver la conexión.
  op.catch((e) => { console.error(e); toast('No se pudo guardar el gasto. Inténtalo de nuevo.'); });
  toast(navigator.onLine ? (ctx.param ? 'Cambios guardados' : 'Gasto guardado') : 'Guardado. Se enviará cuando haya internet.');
  F = null;
  ctx.volver();
}

async function eliminar(ctx) {
  const g = datos().gastos.find((x) => x.id === ctx.param);
  if (!g) return;
  const ok = await confirmar('Eliminar gasto', `Se eliminará "${g.descripcion}" por ${money(g.monto)}. Esta acción no se puede deshacer.`, 'Eliminar');
  if (!ok) return;
  eliminarGasto(g.id).catch((e) => { console.error(e); toast('No se pudo eliminar el gasto.'); });
  toast('Gasto eliminado');
  F = null;
  ctx.volver();
}

export function montar(ctx) {
  const q = (s) => document.querySelector(s);
  q('#f-monto')?.addEventListener('input', (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 9).replace(/^0+(?=\d)/, '');
    F.monto = d;
    e.target.value = miles(d);
  });
  q('#f-desc')?.addEventListener('input', (e) => { F.desc = e.target.value; });
  q('#f-fecha')?.addEventListener('change', (e) => { F.fecha = e.target.value; });
  q('#main').onclick = (ev) => {
    const b = ev.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    if (acc === 'volver') { F = null; ctx.volver(); return; }
    if (!F) return;
    if (acc === 'tipo') { F.tipoId = b.dataset.v; F.error = ''; ctx.repintar(true); }
    else if (acc === 'fuente') { F.fuente = b.dataset.v; F.error = ''; ctx.repintar(true); }
    else if (acc === 'reemb') { F.reemb = !F.reemb; ctx.repintar(true); }
    else if (acc === 'guardar') guardar(ctx);
    else if (acc === 'eliminar') eliminar(ctx);
  };
}
