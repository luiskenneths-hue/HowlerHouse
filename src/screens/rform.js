// Crear o editar una reserva. Ruta: #/rform (nueva) · #/rform/AAAA-MM-DD (nueva desde ese día) · #/rform/ID (editar)
import { esc, money, miles, toast, cargando, ICONO_ATRAS } from '../ui.js';
import { datos, listo } from '../data/store.js';
import { nochesEntre, conflictos, pagadoDe, MAX_NOCHES } from '../domain/reservas.js';
import { aInputFecha, deInputFecha, sumarDias, rangoCorto } from '../domain/fechas.js';
import { crearReserva, actualizarReserva } from '../data/reservas.js';

export const id = 'rform';
export const padre = 'reservas';
export const sinNav = true;
export const tab = 'reservas';
export const reactivo = false; // se repinta solo al terminar de cargar, para no perder lo escrito

let R = null;
export const alSalir = () => { R = null; };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const cab = (titulo) => `<header class="screen-head">
  <button class="icon-btn" data-acc="volver" aria-label="Volver" style="display:flex;align-items:center;justify-content:center">${ICONO_ATRAS}</button>
  <h1 style="flex:1;margin-left:12px;font-size:22px">${esc(titulo)}</h1></header><div class="rule"></div>`;

function nuevoForm(entradaInicial) {
  const hoy = aInputFecha(new Date());
  const entrada = entradaInicial && entradaInicial >= hoy ? entradaInicial : hoy;
  return { huesped: '', telefono: '', personas: '2', entrada, salida: sumarDias(entrada, 1), tarifa: '', estado: 'CONFIRMADA', notas: '', error: '', guardando: false };
}
const desdeReserva = (r) => ({
  huesped: r.huesped, telefono: r.telefono || '', personas: String(r.personas), entrada: r.entrada, salida: r.salida,
  tarifa: String(r.tarifaNoche), estado: r.estado, notas: r.notas || '', error: '', guardando: false
});

export function vista(ctx) {
  const editando = ctx.param && !FECHA.test(ctx.param);
  const titulo = editando ? 'EDITAR RESERVA' : 'NUEVA RESERVA';
  const { reservas, error } = datos();
  if (error) return `${cab(titulo)}<section class="card"><p class="error" role="alert">${esc(error)}</p></section>`;
  if (!listo()) return cab(titulo) + cargando();

  let original = null;
  if (editando) {
    original = reservas.find((x) => x.id === ctx.param);
    if (!original) return `${cab(titulo)}<section class="card soon"><h2>Reserva no encontrada</h2><a class="btn btn-link" href="#/reservas">Volver a reservas</a></section>`;
    if (original.estado === 'CANCELADA') return `${cab(titulo)}<section class="card soon"><h2>Reserva cancelada</h2><p>Para editarla, primero reactívala cambiando su estado.</p><a class="btn btn-link" href="#/reserva/${esc(original.id)}">Ir a la reserva</a></section>`;
  }
  const clave = ctx.param || 'nueva';
  if (!R || R.clave !== clave) { R = original ? desdeReserva(original) : nuevoForm(ctx.param); R.clave = clave; }

  const estados = [['CONSULTA', 'Consulta'], ['CONFIRMADA', 'Confirmada']];
  return `${cab(titulo)}
    <div class="form">
      <div class="field"><label for="r-huesped">HUÉSPED</label>
        <input id="r-huesped" type="text" maxlength="60" autocomplete="off" value="${esc(R.huesped)}" placeholder="Nombre de quien reserva"></div>
      <div class="fechas-2">
        <div class="field"><label for="r-tel">TELÉFONO</label><input id="r-tel" type="tel" inputmode="tel" maxlength="20" autocomplete="off" value="${esc(R.telefono)}" placeholder="8888 1234"></div>
        <div class="field" style="max-width:110px"><label for="r-pers">PERSONAS</label><input id="r-pers" type="text" inputmode="numeric" maxlength="2" autocomplete="off" value="${esc(R.personas)}"></div>
      </div>
      <div class="fechas-2">
        <div class="field"><label for="r-entrada">ENTRADA</label><input id="r-entrada" type="date" value="${esc(R.entrada)}"></div>
        <div class="field"><label for="r-salida">SALIDA</label><input id="r-salida" type="date" value="${esc(R.salida)}"></div>
      </div>
      <div class="field"><label for="r-tarifa">TARIFA POR NOCHE</label>
        <div class="monto-box"><span class="moneda">₡</span><input id="r-tarifa" type="text" inputmode="numeric" autocomplete="off" value="${esc(miles(R.tarifa))}" placeholder="0"></div></div>
      <div class="resumen-reserva" id="r-resumen" aria-live="polite"></div>
      ${editando ? '' : `<div class="bloque"><span class="etiqueta">ESTADO INICIAL</span>
        <div class="seg" role="group" aria-label="Estado inicial">${estados.map(([k, v]) => `<button class="${R.estado === k ? 'on' : ''}" data-acc="estado" data-v="${k}">${v}</button>`).join('')}</div>
        <span class="muted">Una consulta también reserva las fechas. Al registrar el primer pago pasa a "Con adelanto".</span></div>`}
      <div class="field"><label for="r-notas">NOTAS (OPCIONAL)</label><textarea id="r-notas" maxlength="300" placeholder="Ej: trae mascota, llega tarde">${esc(R.notas)}</textarea></div>
      ${R.error ? `<div class="error form-error" role="alert">${esc(R.error)}</div>` : ''}
      <button class="btn" data-acc="guardar" ${R.guardando ? 'disabled' : ''}>${R.guardando ? 'Guardando…' : (editando ? 'Guardar cambios' : 'Guardar reserva')}</button>
    </div>`;
}

/** Calcula noches, total y cruces con lo que hay ahora en pantalla. */
function evaluar(excluirId) {
  const noches = nochesEntre(R.entrada, R.salida);
  const tarifa = parseInt(R.tarifa || '0', 10);
  const { reservas, bloqueos } = datos();
  const cruces = noches > 0 ? conflictos({ reservas, bloqueos, entrada: R.entrada, salida: R.salida, excluirId }) : [];
  return { noches, tarifa, total: noches > 0 ? noches * tarifa : 0, cruces };
}

function pintarResumen(excluirId) {
  const el = document.querySelector('#r-resumen');
  if (!el) return;
  const e = evaluar(excluirId);
  let html;
  if (e.noches <= 0) html = '<span class="muted">La salida debe ser después de la entrada.</span>';
  else {
    html = `<span class="muted">${e.noches} ${e.noches === 1 ? 'noche' : 'noches'} × ${money(e.tarifa)}</span><span class="t">${money(e.total)}</span>`;
    if (e.noches > MAX_NOCHES) html += `<span class="error">Máximo ${MAX_NOCHES} noches por reserva.</span>`;
  }
  if (e.cruces.length) {
    html += `<span class="error" role="alert">Estas fechas se cruzan con: ${e.cruces.map((c) => `${esc(c.nombre)} (${esc(rangoCorto(c.entrada, c.salida))})`).join(', ')}.</span>`;
  } else if (e.noches > 0) html += '<span style="color:var(--blue);font-size:13px;font-weight:600">✓ Fechas disponibles</span>';
  el.innerHTML = html;
}

function mensajeError(e) {
  if (e && e.code === 'conflicto-fechas') return 'Esas fechas acaban de ocuparse (otra reserva o bloqueo). Revisa el calendario y elige otras.';
  if (e && e.code === 'tiempo') return 'No se pudo confirmar a tiempo. Revisa la conexión y mira en Reservas si quedó guardada antes de intentar de nuevo.';
  return 'No se pudo guardar la reserva. Se necesita internet para evitar reservar dos veces la misma fecha; revisa la conexión.';
}

const conTiempo = (promesa, ms = 20000) => Promise.race([
  promesa,
  new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('tiempo'), { code: 'tiempo' })), ms))
]);

async function guardar(ctx, editando) {
  const e = evaluar(editando ? ctx.param : null);
  const personas = parseInt(R.personas || '0', 10);
  const huesped = R.huesped.trim();
  let err = '';
  if (!huesped) err = 'Escribe el nombre del huésped.';
  else if (!personas || personas < 1) err = 'Indica cuántas personas son.';
  else if (!deInputFecha(R.entrada) || !deInputFecha(R.salida)) err = 'Revisa las fechas.';
  else if (e.noches <= 0) err = 'La salida debe ser después de la entrada.';
  else if (e.noches > MAX_NOCHES) err = `Máximo ${MAX_NOCHES} noches por reserva.`;
  else if (R.tarifa === '' ) err = 'Escribe la tarifa por noche (puede ser 0).';
  else if (e.cruces.length) err = 'Esas fechas se cruzan con otra reserva o bloqueo. Elige otras.';
  if (!err && editando) {
    const pagado = pagadoDe(datos().pagos, ctx.param);
    if (e.total < pagado) err = `El total (${money(e.total)}) no puede ser menor a lo ya cobrado (${money(pagado)}).`;
  }
  if (err) { R.error = err; ctx.repintar(true); document.querySelector('.form-error')?.scrollIntoView({ block: 'center' }); return; }

  const f = {
    huesped, telefono: R.telefono.trim(), personas, entrada: R.entrada, salida: R.salida,
    noches: e.noches, tarifaNoche: e.tarifa, total: e.total, estado: R.estado, notas: R.notas.trim()
  };
  R.error = ''; R.guardando = true; ctx.repintar(true);
  try {
    if (editando) {
      await conTiempo(actualizarReserva(ctx.param, f, ctx.user.email));
      toast('Cambios guardados');
      R = null; ctx.volver();
    } else {
      const nuevoId = await conTiempo(crearReserva(f, ctx.user.email));
      toast('Reserva guardada');
      R = null; location.replace(`#/reserva/${nuevoId}`);
    }
  } catch (ex) {
    console.error(ex);
    R.guardando = false; R.error = mensajeError(ex);
    ctx.repintar(true);
    document.querySelector('.form-error')?.scrollIntoView({ block: 'center' });
  }
}

export function montar(ctx) {
  const editando = ctx.param && !FECHA.test(ctx.param);
  const excluir = editando ? ctx.param : null;
  const q = (s) => document.querySelector(s);
  if (!q('#r-huesped')) return; // pantalla de carga o de error
  pintarResumen(excluir);
  q('#r-huesped').addEventListener('input', (e) => { R.huesped = e.target.value; });
  q('#r-tel').addEventListener('input', (e) => { R.telefono = e.target.value; });
  q('#r-pers').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2); R.personas = e.target.value; });
  q('#r-notas').addEventListener('input', (e) => { R.notas = e.target.value; });
  q('#r-tarifa').addEventListener('input', (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 9).replace(/^0+(?=\d)/, '');
    R.tarifa = d; e.target.value = miles(d); pintarResumen(excluir);
  });
  q('#r-entrada').addEventListener('change', (e) => {
    R.entrada = e.target.value;
    if (deInputFecha(R.entrada) && (!deInputFecha(R.salida) || R.salida <= R.entrada)) { R.salida = sumarDias(R.entrada, 1); q('#r-salida').value = R.salida; }
    pintarResumen(excluir);
  });
  q('#r-salida').addEventListener('change', (e) => { R.salida = e.target.value; pintarResumen(excluir); });

  q('#main').onclick = (ev) => {
    const b = ev.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    if (acc === 'volver') { R = null; ctx.volver(); return; }
    if (!R) return;
    if (acc === 'estado') { R.estado = b.dataset.v; ctx.repintar(true); }
    else if (acc === 'guardar' && !R.guardando) guardar(ctx, editando);
  };
}
