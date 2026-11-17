// Lógica pura de reservas: noches, cruces de fechas, saldos y estados.
import { aInputFecha, deInputFecha, sumarDias } from './fechas.js';

export const MAX_NOCHES = 60;
const MS_DIA = 86400000;

export const ESTADOS = {
  CONSULTA: { label: 'Consulta', cls: 'consulta' },
  CON_ADELANTO: { label: 'Con adelanto', cls: 'adelanto' },
  CONFIRMADA: { label: 'Confirmada', cls: 'confirmada' },
  CHECK_IN: { label: 'Check-in hecho', cls: 'confirmada' },
  FINALIZADA: { label: 'Finalizada', cls: 'finalizada' },
  CANCELADA: { label: 'Cancelada', cls: 'cancelada' }
};
export const ORDEN_ESTADOS = ['CONSULTA', 'CON_ADELANTO', 'CONFIRMADA', 'CHECK_IN', 'FINALIZADA', 'CANCELADA'];

/** Cantidad de noches entre dos fechas "yyyy-mm-dd" (0 si hay un dato inválido). */
export function nochesEntre(entrada, salida) {
  const a = deInputFecha(entrada);
  const b = deInputFecha(salida);
  if (!a || !b) return 0;
  return Math.round((b - a) / MS_DIA);
}

/** Cada noche ocupada: de la entrada hasta el día ANTES de la salida. */
export function listaNoches(entrada, salida) {
  const n = nochesEntre(entrada, salida);
  return Array.from({ length: Math.max(0, n) }, (_, i) => sumarDias(entrada, i));
}

export const ocupaFechas = (r) => r.estado !== 'CANCELADA';

/**
 * Reservas y bloqueos que se cruzan con [entrada, salida).
 * El día de salida queda libre para una nueva entrada.
 */
export function conflictos({ reservas, bloqueos, entrada, salida, excluirId = null }) {
  const out = [];
  for (const r of reservas) {
    if (r.id === excluirId || !ocupaFechas(r)) continue;
    if (entrada < r.salida && r.entrada < salida) out.push({ tipo: 'reserva', id: r.id, nombre: r.huesped, entrada: r.entrada, salida: r.salida });
  }
  for (const b of bloqueos) {
    if (entrada < b.hasta && b.desde < salida) out.push({ tipo: 'bloqueo', id: b.id, nombre: b.motivo || 'Bloqueado', entrada: b.desde, salida: b.hasta });
  }
  return out;
}

/** Junta las noches bloqueadas (una por documento) en bloqueos con desde / hasta. */
export function agruparBloqueos(nochesBloqueo) {
  const grupos = new Map();
  for (const n of nochesBloqueo) {
    if (!grupos.has(n.bloqueoId)) grupos.set(n.bloqueoId, { id: n.bloqueoId, motivo: n.motivo || '', claves: [] });
    grupos.get(n.bloqueoId).claves.push(n.fecha);
  }
  return [...grupos.values()].map((g) => {
    g.claves.sort();
    return { ...g, desde: g.claves[0], hasta: sumarDias(g.claves[g.claves.length - 1], 1) };
  }).sort((a, b) => a.desde.localeCompare(b.desde));
}

export const pagadoDe = (pagos, reservaId) => pagos.filter((p) => p.reservaId === reservaId).reduce((a, p) => a + p.monto, 0);
export const saldoDe = (reserva, pagos) => Math.max(0, reserva.total - pagadoDe(pagos, reserva.id));

/** Qué pasa un día: quién ocupa la noche, quién entra y quién sale. */
export function estadoDelDia(key, reservas, bloqueos) {
  const vivas = reservas.filter(ocupaFechas);
  return {
    ocupa: vivas.find((r) => r.entrada <= key && key < r.salida) || null,
    bloqueo: bloqueos.find((b) => b.desde <= key && key < b.hasta) || null,
    entran: vivas.filter((r) => r.entrada === key),
    salen: vivas.filter((r) => r.salida === key)
  };
}

/** Número de WhatsApp en formato internacional. Costa Rica: 8 dígitos → 506 + número. '' si no sirve. */
export function telefonoWhatsapp(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 8) d = '506' + d;
  return d.length >= 10 && d.length <= 15 ? d : '';
}

/** Clasifica un pago: pago completo, saldo (liquida lo que faltaba), adelanto o abono. */
export function tipoDePago({ pagadoAntes, saldo, monto }) {
  if (pagadoAntes === 0 && monto >= saldo) return 'COMPLETO';
  if (monto >= saldo) return 'SALDO';
  return pagadoAntes === 0 ? 'ADELANTO' : 'ABONO';
}
export const ETIQUETA_PAGO = { COMPLETO: 'Pago completo', SALDO: 'Saldo', ADELANTO: 'Adelanto', ABONO: 'Abono' };
export const METODOS = { EFECTIVO: 'Efectivo', SINPE: 'SINPE', TRANSFERENCIA: 'Transferencia' };

export { aInputFecha };
