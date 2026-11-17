import { esc, money, toast, openSheet, closeSheet, confirmar, encabezado, ICONO_MAS, cargando } from '../ui.js';
import { datos, listo } from '../data/store.js';
import { ESTADOS, estadoDelDia, saldoDe, MAX_NOCHES, nochesEntre } from '../domain/reservas.js';
import { aInputFecha, MESES_LARGOS, fechaConDia, deInputFecha, sumarDias, rangoCorto } from '../domain/fechas.js';
import { crearBloqueo, eliminarBloqueo } from '../data/reservas.js';

export const id = 'calendario';
export const reactivo = true;

const hoyClave = () => aInputFecha(new Date());
const C = { anio: null, mes: null, sel: null };

const ICO_IZQ = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
const ICO_DER = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

function iniciar() {
  if (C.anio !== null) return;
  const h = new Date();
  C.anio = h.getFullYear(); C.mes = h.getMonth(); C.sel = hoyClave();
}

export function vista() {
  iniciar();
  const { reservas, pagos, bloqueos, error } = datos();
  const cab = encabezado('CALENDARIO', `<a class="add-btn" href="#/rform" aria-label="Nueva reserva">${ICONO_MAS}</a>`);
  if (error) return `${cab}<section class="card"><p class="error" role="alert">${esc(error)}</p></section>`;
  if (!listo()) return cab + cargando('Cargando calendario…');

  const hoy = hoyClave();
  const primero = new Date(C.anio, C.mes, 1);
  const dias = new Date(C.anio, C.mes + 1, 0).getDate();
  const huecos = (primero.getDay() + 6) % 7; // semana de lunes a domingo
  const p2 = (n) => String(n).padStart(2, '0');

  let celdas = '';
  for (let i = 0; i < huecos; i++) celdas += '<div class="cal-blank"></div>';
  for (let d = 1; d <= dias; d++) {
    const key = `${C.anio}-${p2(C.mes + 1)}-${p2(d)}`;
    const e = estadoDelDia(key, reservas, bloqueos);
    let cls = ''; let etiqueta = 'libre';
    if (e.bloqueo) { cls = 'bloqueo'; etiqueta = `bloqueado: ${e.bloqueo.motivo || 'sin motivo'}`; }
    else if (e.ocupa) { const st = ESTADOS[e.ocupa.estado] || ESTADOS.CONSULTA; cls = st.cls; etiqueta = `ocupado, ${st.label.toLowerCase()}`; }
    const nombre = `${d} de ${MESES_LARGOS[C.mes].toLowerCase()}, ${etiqueta}${key === hoy ? ', hoy' : ''}`;
    celdas += `<button class="cal-day ${cls}${key === hoy ? ' hoy' : ''}${key === C.sel ? ' sel' : ''}" data-acc="dia" data-v="${key}" aria-label="${esc(nombre)}">${d}</button>`;
  }

  /* ---- Detalle del día elegido ---- */
  const sel = C.sel;
  const e = estadoDelDia(sel, reservas, bloqueos);
  const itemReserva = (r, etq) => {
    const st = ESTADOS[r.estado] || ESTADOS.CONSULTA;
    const saldo = saldoDe(r, pagos);
    return `<a class="dia-item" href="#/reserva/${esc(r.id)}"><span class="etq">${etq}</span>
      <div class="fila"><span class="nombre">${esc(r.huesped)}</span><span class="estado-chip ${st.cls}">${esc(st.label)}</span></div>
      <div class="fila muted"><span>${esc(rangoCorto(r.entrada, r.salida))} · ${r.noches} ${r.noches === 1 ? 'noche' : 'noches'} · ${r.personas} pers.</span>${saldo > 0 ? `<span style="color:var(--orange);font-weight:600">Saldo ${money(saldo)}</span>` : ''}</div></a>`;
  };
  let detalle = '';
  if (e.ocupa) detalle += itemReserva(e.ocupa, 'OCUPADO');
  e.salen.filter((r) => !e.ocupa || r.id !== e.ocupa.id).forEach((r) => { detalle += itemReserva(r, 'SALE ESTE DÍA'); });
  e.entran.filter((r) => !e.ocupa || r.id !== e.ocupa.id).forEach((r) => { detalle += itemReserva(r, 'ENTRA ESTE DÍA'); });
  if (e.bloqueo) {
    detalle += `<div class="dia-item"><span class="etq">BLOQUEADO</span>
      <div class="fila"><span class="nombre">${esc(e.bloqueo.motivo || 'Sin motivo')}</span>
        <button class="mini" data-acc="quitar-bloqueo" data-v="${esc(e.bloqueo.id)}">Quitar</button></div>
      <span class="muted">${esc(rangoCorto(e.bloqueo.desde, e.bloqueo.hasta))}</span></div>`;
  }
  const libre = !e.ocupa && !e.bloqueo;
  if (!detalle) detalle = '<div class="dia-item"><span class="nombre">Libre</span><span class="muted">No hay reservas ni bloqueos este día.</span></div>';
  const accionesDia = libre && sel >= hoy
    ? `<a class="btn btn-link" href="#/rform/${sel}">Nueva reserva desde este día</a>` : '';

  return `${cab}
    <div class="cal-nav">
      <button class="icon-btn" data-acc="mes-ant" aria-label="Mes anterior" style="display:flex;align-items:center;justify-content:center">${ICO_IZQ}</button>
      <button class="cal-title" data-acc="hoy" style="background:none;border:none;color:inherit;min-height:44px" aria-label="Ir a hoy">${MESES_LARGOS[C.mes]} ${C.anio}</button>
      <button class="icon-btn" data-acc="mes-sig" aria-label="Mes siguiente" style="display:flex;align-items:center;justify-content:center">${ICO_DER}</button>
    </div>
    <div class="cal-grid">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<span class="cal-dow">${x}</span>`).join('')}${celdas}</div>
    <div class="leyenda">
      <span><i style="background:var(--gold)"></i>Confirmada</span><span><i style="background:var(--orange)"></i>Con adelanto</span>
      <span><i style="border:1.5px dashed var(--gold)"></i>Consulta</span><span><i style="background:#2A2A2E"></i>Finalizada</span>
      <span><i style="background:repeating-linear-gradient(135deg,#232327,#232327 3px,#3A3A40 3px,#3A3A40 6px)"></i>Bloqueado</span></div>
    <section class="dia-card"><h3>${esc(fechaConDia(deInputFecha(sel)).toUpperCase())}${sel === hoy ? ' · HOY' : ''}</h3>${detalle}${accionesDia}</section>
    <button class="btn-ghost" data-acc="bloquear">Bloquear fechas (mantenimiento o uso propio)</button>`;
}

function cambiarMes(delta) {
  const d = new Date(C.anio, C.mes + delta, 1);
  C.anio = d.getFullYear(); C.mes = d.getMonth();
  const p2 = (n) => String(n).padStart(2, '0');
  C.sel = `${C.anio}-${p2(C.mes + 1)}-01`;
}

function mensajeError(e) {
  if (e && e.code === 'conflicto-fechas') return `Esas fechas ya están ocupadas (${e.fechas.length} ${e.fechas.length === 1 ? 'noche' : 'noches'}). Revisa el calendario.`;
  return 'No se pudo guardar. Se necesita internet para bloquear fechas; revisa la conexión.';
}

function abrirBloqueo(ctx) {
  const desdeInicial = C.sel >= hoyClave() ? C.sel : hoyClave();
  const p = openSheet('Bloquear fechas', `
    <div class="fechas-2">
      <div class="field"><label for="b-desde">DESDE</label><input id="b-desde" type="date" value="${desdeInicial}"></div>
      <div class="field"><label for="b-hasta">HASTA (INCLUSIVE)</label><input id="b-hasta" type="date" value="${desdeInicial}"></div>
    </div>
    <div class="field"><label for="b-motivo">MOTIVO</label><input id="b-motivo" type="text" maxlength="60" placeholder="Ej: Pintura, uso propio" autocomplete="off"></div>
    <div class="error" id="b-error" role="alert"></div>
    <button class="btn" id="b-guardar">Bloquear</button>`);
  const q = (s) => p.querySelector(s);
  q('#b-desde').addEventListener('change', () => { if (q('#b-hasta').value < q('#b-desde').value) q('#b-hasta').value = q('#b-desde').value; });
  q('#b-guardar').addEventListener('click', async () => {
    const desde = q('#b-desde').value; const ultimo = q('#b-hasta').value; const motivo = q('#b-motivo').value.trim();
    const err = (m) => { q('#b-error').textContent = m; };
    if (!deInputFecha(desde) || !deInputFecha(ultimo)) return err('Revisa las fechas.');
    if (ultimo < desde) return err('La fecha final no puede ser anterior a la inicial.');
    const hasta = sumarDias(ultimo, 1);
    if (nochesEntre(desde, hasta) > MAX_NOCHES) return err(`Máximo ${MAX_NOCHES} noches seguidas.`);
    if (!motivo) return err('Escribe el motivo del bloqueo.');
    const btn = q('#b-guardar'); btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      await crearBloqueo({ desde, hasta, motivo }, ctx.user.email);
      closeSheet(); toast('Fechas bloqueadas');
    } catch (e) {
      console.error(e); err(mensajeError(e)); btn.disabled = false; btn.textContent = 'Bloquear';
    }
  });
}

export function montar(ctx) {
  document.querySelector('#main').onclick = async (ev) => {
    const b = ev.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    if (acc === 'mes-ant') cambiarMes(-1);
    else if (acc === 'mes-sig') cambiarMes(1);
    else if (acc === 'hoy') { const h = new Date(); C.anio = h.getFullYear(); C.mes = h.getMonth(); C.sel = hoyClave(); }
    else if (acc === 'dia') C.sel = b.dataset.v;
    else if (acc === 'bloquear') { abrirBloqueo(ctx); return; }
    else if (acc === 'quitar-bloqueo') {
      const bl = datos().bloqueos.find((x) => x.id === b.dataset.v);
      if (!bl) return;
      const ok = await confirmar('Quitar bloqueo', `Se liberarán las fechas ${rangoCorto(bl.desde, bl.hasta)} (${bl.motivo || 'sin motivo'}).`, 'Quitar bloqueo');
      if (!ok) return;
      eliminarBloqueo(bl).catch((e) => { console.error(e); toast('No se pudo quitar el bloqueo.'); });
      toast('Bloqueo eliminado');
      return;
    }
    ctx.repintar(true);
  };
}
