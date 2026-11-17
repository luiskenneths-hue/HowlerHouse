// Detalle de una reserva: huésped, fechas, pagos, estado y mensajes de WhatsApp. Ruta: #/reserva/ID
import { esc, money, miles, toast, openSheet, closeSheet, confirmar, cargando, ICONO_ATRAS } from '../ui.js';
import { datos, listo } from '../data/store.js';
import { ESTADOS, ORDEN_ESTADOS, pagadoDe, saldoDe, tipoDePago, ETIQUETA_PAGO, METODOS, telefonoWhatsapp } from '../domain/reservas.js';
import { aInputFecha, deInputFecha, fechaConDia, fechaCorta } from '../domain/fechas.js';
import { PLANTILLAS, armarMensaje } from '../domain/mensajes.js';
import { registrarPago, eliminarPago, cancelarReserva, reactivarReserva, cambiarEstado, eliminarReserva } from '../data/reservas.js';
import { Share } from '@capacitor/share';

export const id = 'reserva';
export const padre = 'reservas';
export const tab = 'reservas';
export const reactivo = true;

const cab = (extra = '') => `<header class="screen-head">
  <button class="icon-btn" data-acc="volver" aria-label="Volver" style="display:flex;align-items:center;justify-content:center">${ICONO_ATRAS}</button>
  <h1 style="flex:1;margin-left:12px;font-size:22px">RESERVA</h1>${extra}</header><div class="rule"></div>`;

export function vista(ctx) {
  const { reservas, pagos, error } = datos();
  if (error) return `${cab()}<section class="card"><p class="error" role="alert">${esc(error)}</p></section>`;
  if (!listo()) return cab() + cargando();
  const r = reservas.find((x) => x.id === ctx.param);
  if (!r) return `${cab()}<section class="card soon"><h2>Reserva no encontrada</h2><p>Puede que ya se haya eliminado.</p><a class="btn btn-link" href="#/reservas">Volver a reservas</a></section>`;

  const st = ESTADOS[r.estado] || ESTADOS.CONSULTA;
  const cancelada = r.estado === 'CANCELADA';
  const susPagos = pagos.filter((p) => p.reservaId === r.id).sort((a, b) => a.fecha - b.fecha);
  const pagado = pagadoDe(pagos, r.id);
  const saldo = saldoDe(r, pagos);
  const pct = r.total > 0 ? Math.min(100, Math.round((pagado / r.total) * 100)) : 100;
  const tel = (r.telefono || '').trim();

  const filaPago = (p) => `<div class="pago"><div class="ico" aria-hidden="true">✓</div>
    <div class="info"><strong>${esc(ETIQUETA_PAGO[p.tipo] || 'Pago')}</strong><span class="muted">${fechaCorta(p.fecha)} · ${esc(METODOS[p.metodo] || p.metodo)}${p.nota ? ' · ' + esc(p.nota) : ''}</span></div>
    <span class="cant">${money(p.monto)}</span>
    <button class="mini suave" data-acc="del-pago" data-v="${esc(p.id)}" aria-label="Eliminar pago">Quitar</button></div>`;

  return `${cab(`<button class="estado-chip ${st.cls}" data-acc="estado" aria-label="Cambiar estado: ${esc(st.label)}">${esc(st.label)} ▾</button>`)}
    <section class="card">
      <div style="display:flex;flex-direction:column;gap:2px">
        <span style="font-family:'Exo 2',sans-serif;font-weight:600;font-size:22px;overflow-wrap:anywhere">${esc(r.huesped)}</span>
        <span class="muted">${tel ? `<a href="tel:${esc(tel.replace(/[^\d+]/g, ''))}" style="color:var(--gold-hi)">${esc(tel)}</a> · ` : ''}${r.personas} ${r.personas === 1 ? 'persona' : 'personas'}</span>
      </div>
      <div class="tarjeta-fechas">
        <div class="caja"><span class="muted">Entrada</span><strong>${esc(fechaConDia(r.fEntrada).replace(/ \d{4}$/, ''))}</strong></div>
        <div class="caja"><span class="muted">Salida</span><strong>${esc(fechaConDia(r.fSalida).replace(/ \d{4}$/, ''))}</strong></div>
      </div>
      ${r.notas ? `<p class="muted" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(r.notas)}</p>` : ''}
    </section>
    <section class="card">
      <div class="cobro-row" style="color:var(--muted)"><span>${r.noches} ${r.noches === 1 ? 'noche' : 'noches'} × ${money(r.tarifaNoche)}</span></div>
      <div class="total-row"><span>Total</span><strong>${money(r.total)}</strong></div>
      <div class="progreso" role="img" aria-label="Cobrado ${pct}%"><div style="width:${pct}%"></div></div>
      <div class="cobro-row"><span class="c">Cobrado ${money(pagado)}</span><span class="s">Saldo ${money(saldo)}</span></div>
    </section>
    <section style="display:flex;flex-direction:column;gap:10px">
      <h2 class="titulo-seccion">Pagos</h2>
      ${susPagos.map(filaPago).join('')}
      ${saldo > 0 && !cancelada ? `<div class="pago pendiente"><div class="ico" aria-hidden="true" style="color:var(--orange)">◔</div><div class="info"><strong>Saldo por cobrar</strong></div><span class="cant" style="color:var(--orange)">${money(saldo)}</span></div>` : ''}
      ${!susPagos.length && saldo === 0 ? '<div class="vacio">Sin pagos registrados.</div>' : ''}
    </section>
    <div class="dos-botones">
      <button class="btn" data-acc="pago" ${saldo === 0 || cancelada ? 'disabled' : ''}>Registrar pago</button>
      <button class="btn-oro-borde" data-acc="whatsapp">WhatsApp</button>
    </div>
    <div class="dos-botones">
      ${cancelada ? '' : `<a class="btn-ghost btn-link" href="#/rform/${esc(r.id)}">Editar</a>`}
      ${cancelada ? '' : '<button class="btn-ghost" data-acc="cancelar">Cancelar reserva</button>'}
    </div>
    ${susPagos.length === 0 ? '<button class="btn-peligro" data-acc="eliminar">Eliminar reserva</button>' : ''}`;
}

/* ---------- Hojas ---------- */
function falla(e, texto) {
  console.error(e);
  toast(e && e.code === 'conflicto-fechas' ? 'Esas fechas ya están ocupadas por otra reserva o bloqueo.' : texto);
}

function abrirPago(ctx, r) {
  const { pagos } = datos();
  const pagadoAntes = pagadoDe(pagos, r.id);
  const saldo = saldoDe(r, pagos);
  let metodo = 'SINPE';
  const p = openSheet('Registrar pago', `
    <div class="field"><label for="p-monto">MONTO</label>
      <div class="monto-box"><span class="moneda">₡</span><input id="p-monto" type="text" inputmode="numeric" autocomplete="off" value="${miles(saldo)}"></div>
      <span class="muted">Saldo pendiente: ${money(saldo)}</span></div>
    <div class="field"><label for="p-fecha">FECHA</label><input id="p-fecha" type="date" value="${aInputFecha(new Date())}"></div>
    <div class="bloque"><span class="etiqueta">MÉTODO</span>
      <div class="seg" id="p-metodo" role="group" aria-label="Método de pago">${Object.entries(METODOS).map(([k, v]) => `<button data-m="${k}" class="${k === metodo ? 'on' : ''}">${v}</button>`).join('')}</div></div>
    <div class="field"><label for="p-nota">NOTA (OPCIONAL)</label><input id="p-nota" type="text" maxlength="80" autocomplete="off"></div>
    <div class="error" id="p-error" role="alert"></div>
    <button class="btn" id="p-guardar">Registrar pago</button>`);
  const q = (s) => p.querySelector(s);
  q('#p-monto').addEventListener('input', (e) => { e.target.value = miles(e.target.value.replace(/\D/g, '').slice(0, 9).replace(/^0+(?=\d)/, '')); });
  q('#p-metodo').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    metodo = b.dataset.m;
    q('#p-metodo').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  });
  q('#p-guardar').addEventListener('click', () => {
    const monto = parseInt(q('#p-monto').value.replace(/\D/g, '') || '0', 10);
    const fecha = deInputFecha(q('#p-fecha').value);
    const err = (m) => { q('#p-error').textContent = m; };
    if (!monto) return err('Escribe el monto del pago.');
    if (monto > saldo) return err(`El pago supera el saldo pendiente (${money(saldo)}). Si el total cambió, edita la reserva.`);
    if (!fecha) return err('Revisa la fecha.');
    const tipo = tipoDePago({ pagadoAntes, saldo, monto });
    registrarPago({ monto, fecha, metodo, tipo, nota: q('#p-nota').value.trim() }, r, ctx.user.email)
      .catch((e) => falla(e, 'No se pudo registrar el pago.'));
    closeSheet();
    toast(navigator.onLine ? 'Pago registrado' : 'Guardado. Se enviará cuando haya internet.');
  });
}

function abrirEstado(ctx, r) {
  const botones = ORDEN_ESTADOS.map((k) => `<button class="opcion ${k === r.estado ? 'on' : ''}" data-e="${k}">${esc(ESTADOS[k].label)}${k === r.estado ? '<small>Estado actual</small>' : ''}</button>`).join('');
  const p = openSheet('Estado de la reserva', botones);
  p.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-e]'); if (!b) return;
    const nuevo = b.dataset.e;
    if (nuevo === r.estado) { closeSheet(); return; }
    closeSheet();
    if (nuevo === 'CANCELADA') return cancelar(r);
    if (r.estado === 'CANCELADA') {
      try { await reactivarReserva(r, nuevo); toast('Reserva reactivada'); } catch (e) { falla(e, 'No se pudo reactivar. Se necesita internet.'); }
      return;
    }
    cambiarEstado(r.id, nuevo).catch((e) => falla(e, 'No se pudo cambiar el estado.'));
    toast('Estado actualizado');
  });
}

async function cancelar(r) {
  const ok = await confirmar('Cancelar reserva', `Se cancelará la reserva de ${r.huesped} y sus fechas quedarán libres. Los pagos registrados se conservan.`, 'Cancelar reserva');
  if (!ok) return;
  cancelarReserva(r).catch((e) => falla(e, 'No se pudo cancelar la reserva.'));
  toast('Reserva cancelada');
}

function abrirWhatsApp(r) {
  const { pagos } = datos();
  const base = { reserva: r, pagado: pagadoDe(pagos, r.id), saldo: saldoDe(r, pagos) };
  const lista = PLANTILLAS.map((t) => `<button class="opcion" data-t="${t.id}">${esc(t.titulo)}<small>${esc(t.detalle)}</small></button>`).join('');
  const p = openSheet('Mensaje por WhatsApp', lista);
  p.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-t]'); if (!b) return;
    editarMensaje(r, armarMensaje(b.dataset.t, base));
  });
}

function editarMensaje(r, texto) {
  const numero = telefonoWhatsapp(r.telefono);
  const p = openSheet('Revisa el mensaje', `
    <textarea class="msg" id="w-texto" aria-label="Mensaje">${esc(texto)}</textarea>
    <span class="muted">${numero ? `Se abrirá WhatsApp con el chat de ${esc(r.huesped)}.` : 'Esta reserva no tiene un teléfono válido: se abrirá el menú de compartir.'}</span>
    <button class="btn" id="w-enviar">${numero ? 'Abrir WhatsApp' : 'Compartir'}</button>`);
  p.querySelector('#w-enviar').addEventListener('click', async () => {
    const msg = p.querySelector('#w-texto').value.trim();
    if (!msg) return;
    closeSheet();
    if (numero) window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');
    else { try { await Share.share({ text: msg }); } catch (e) { /* se canceló */ } }
  });
}

export function montar(ctx) {
  document.querySelector('#main').onclick = async (ev) => {
    const b = ev.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    if (acc === 'volver') { ctx.volver(); return; }
    const r = datos().reservas.find((x) => x.id === ctx.param);
    if (!r) return;
    if (acc === 'pago') abrirPago(ctx, r);
    else if (acc === 'estado') abrirEstado(ctx, r);
    else if (acc === 'whatsapp') abrirWhatsApp(r);
    else if (acc === 'cancelar') cancelar(r);
    else if (acc === 'del-pago') {
      const pg = datos().pagos.find((x) => x.id === b.dataset.v);
      if (!pg) return;
      const ok = await confirmar('Quitar pago', `Se quitará el pago de ${money(pg.monto)} del ${fechaCorta(pg.fecha)}. Baja el saldo del fondo y sube el saldo pendiente de la reserva.`, 'Quitar pago');
      if (!ok) return;
      eliminarPago(pg.id).catch((e) => falla(e, 'No se pudo quitar el pago.'));
      toast('Pago eliminado');
    } else if (acc === 'eliminar') {
      const ok = await confirmar('Eliminar reserva', `Se eliminará la reserva de ${r.huesped} y sus fechas quedarán libres. Esta acción no se puede deshacer.`, 'Eliminar');
      if (!ok) return;
      eliminarReserva(r).catch((e) => falla(e, 'No se pudo eliminar la reserva.'));
      toast('Reserva eliminada');
      ctx.volver();
    }
  };
}
