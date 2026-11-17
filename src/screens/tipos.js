// Administrar los tipos de gasto: agregar, renombrar y ocultar.
import { esc, toast, cargando, ICONO_ATRAS } from '../ui.js';
import { datos, listo } from '../data/store.js';
import { crearTipo, renombrarTipo, ocultarTipo } from '../data/tipos.js';
import { limpiarNombre, existeNombre, siguienteOrden } from '../domain/tipos.js';

export const id = 'tipos';
export const padre = 'gastos';
export const sinNav = true;
export const tab = 'gastos';
export const reactivo = true;

const T = { nuevo: '', editId: null, editVal: '', error: '' };
export const alSalir = () => { T.nuevo = ''; T.editId = null; T.editVal = ''; T.error = ''; };

const ICONO_LAPIZ = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const ICONO_CANDADO = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

const usos = (n) => (n === 0 ? 'Sin gastos todavía' : n === 1 ? '1 gasto' : `${n} gastos`);

export function vista() {
  const { tipos, gastos, error } = datos();
  const cab = `<header class="screen-head"><button class="icon-btn" data-acc="volver" aria-label="Volver" style="display:flex;align-items:center;justify-content:center">${ICONO_ATRAS}</button>
    <h1 style="flex:1;margin-left:12px;font-size:20px;letter-spacing:.18em">TIPOS DE GASTO</h1></header><div class="rule"></div>`;
  if (error) return `${cab}<section class="card"><p class="error" role="alert">${esc(error)}</p></section>`;
  if (!listo()) return cab + cargando();

  const cuenta = (tid) => gastos.filter((g) => g.tipoId === tid).length;
  const activos = tipos.filter((t) => !t.oculto);
  const ocultos = tipos.filter((t) => t.oculto);

  const filaActiva = (t) => {
    if (T.editId === t.id) {
      return `<div class="tipo-row"><input id="t-edit" type="text" maxlength="30" aria-label="Nuevo nombre" value="${esc(T.editVal)}">
        <button class="mini lleno" data-acc="guardar" data-v="${esc(t.id)}">Guardar</button>
        <button class="mini suave" data-acc="cancelar">Cancelar</button></div>`;
    }
    const info = `<div class="info"><strong>${esc(t.nombre)}</strong><span class="muted">${usos(cuenta(t.id))}</span></div>`;
    if (t.fijo) return `<div class="tipo-row">${info}<span class="fijo">${ICONO_CANDADO}Fijo</span></div>`;
    return `<div class="tipo-row">${info}
      <button class="icon-sq" data-acc="editar" data-v="${esc(t.id)}" aria-label="Renombrar ${esc(t.nombre)}">${ICONO_LAPIZ}</button>
      <button class="mini" data-acc="ocultar" data-v="${esc(t.id)}">Ocultar</button></div>`;
  };

  return `${cab}
    <div class="aviso"><span>Al renombrar un tipo se actualizan todos sus gastos. Los tipos que ya tienen gastos no se borran: se ocultan y dejan de aparecer al registrar.</span></div>
    <div class="bloque"><label class="etiqueta" for="t-nuevo">NUEVO TIPO</label>
      <div class="agregar-fila"><input id="t-nuevo" type="text" maxlength="30" autocomplete="off" placeholder="Ej: Piscina, Seguridad, Internet" value="${esc(T.nuevo)}">
        <button class="btn" data-acc="agregar">Agregar</button></div>
      ${T.error ? `<span class="error" role="alert">${esc(T.error)}</span>` : ''}</div>
    <div class="bloque"><span class="etiqueta">ACTIVOS (${activos.length})</span><div class="lista">${activos.map(filaActiva).join('')}</div></div>
    ${ocultos.length ? `<div class="bloque"><span class="etiqueta">OCULTOS (${ocultos.length})</span><div class="lista">${ocultos.map((t) => `
      <div class="tipo-row oculto"><div class="info"><strong>${esc(t.nombre)}</strong><span class="muted">${usos(cuenta(t.id))}</span></div>
      <button class="mini oro" data-acc="mostrar" data-v="${esc(t.id)}">Mostrar</button></div>`).join('')}</div></div>` : ''}`;
}

const falla = (msg) => (e) => { console.error(e); toast(msg); };

export function montar(ctx) {
  const q = (s) => document.querySelector(s);
  q('#t-nuevo')?.addEventListener('input', (e) => { T.nuevo = e.target.value; });
  q('#t-nuevo')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') q('[data-acc="agregar"]').click(); });
  q('#t-edit')?.addEventListener('input', (e) => { T.editVal = e.target.value; });
  q('#t-edit')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') q('[data-acc="guardar"]').click(); });
  if (T.editId) { const i = q('#t-edit'); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); }

  q('#main').onclick = (ev) => {
    const b = ev.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    const tid = b.dataset.v;
    const { tipos } = datos();
    if (acc === 'volver') { ctx.volver(); return; }

    if (acc === 'agregar') {
      const nombre = limpiarNombre(T.nuevo);
      if (!nombre) T.error = 'Escribe un nombre para el nuevo tipo.';
      else if (existeNombre(tipos, nombre)) T.error = 'Ya existe un tipo con ese nombre.';
      else {
        crearTipo(nombre, siguienteOrden(tipos)).catch(falla('No se pudo agregar el tipo.'));
        T.nuevo = ''; T.error = '';
        toast('Tipo agregado');
      }
    } else if (acc === 'editar') {
      T.editId = tid; T.editVal = tipos.find((t) => t.id === tid)?.nombre ?? ''; T.error = '';
    } else if (acc === 'cancelar') {
      T.editId = null; T.error = '';
    } else if (acc === 'guardar') {
      const nombre = limpiarNombre(T.editVal);
      if (!nombre) T.error = 'El nombre no puede quedar vacío.';
      else if (existeNombre(tipos, nombre, tid)) T.error = 'Ya existe un tipo con ese nombre.';
      else {
        renombrarTipo(tid, nombre).catch(falla('No se pudo renombrar el tipo.'));
        T.editId = null; T.error = '';
        toast('Nombre actualizado');
      }
    } else if (acc === 'ocultar') {
      ocultarTipo(tid, true).catch(falla('No se pudo ocultar el tipo.'));
      toast('Tipo oculto');
    } else if (acc === 'mostrar') {
      ocultarTipo(tid, false).catch(falla('No se pudo mostrar el tipo.'));
      toast('Tipo visible de nuevo');
    }
    ctx.repintar(true);
  };
}
