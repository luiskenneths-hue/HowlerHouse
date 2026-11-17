// Escritura de reservas, pagos y bloqueos.
// Cada noche ocupada es un documento en "noches" (id = fecha). Al crear o mover una reserva,
// una transacción comprueba que ninguna noche exista ya: así dos teléfonos no pueden cobrar la misma fecha.
import { collection, doc, runTransaction, writeBatch, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { listaNoches } from '../domain/reservas.js';
import { claveMes } from '../domain/fechas.js';

function conflicto(fechas) {
  const e = new Error('Fechas ocupadas');
  e.code = 'conflicto-fechas';
  e.fechas = fechas;
  return e;
}

// f = { huesped, telefono, personas, entrada, salida, noches, tarifaNoche, total, estado, notas }
const camposReserva = (f) => ({
  huesped: f.huesped, telefono: f.telefono, personas: f.personas,
  entrada: f.entrada, salida: f.salida, noches: f.noches,
  tarifaNoche: f.tarifaNoche, total: f.total, estado: f.estado, notas: f.notas
});

async function ocuparNoches(tx, claves, reservaId, extra) {
  const ref = (k) => doc(db, 'noches', k);
  const snaps = await Promise.all(claves.map((k) => tx.get(ref(k))));
  const ocupadas = claves.filter((k, i) => snaps[i].exists() && snaps[i].data().reservaId !== reservaId);
  if (ocupadas.length) throw conflicto(ocupadas);
  return ref;
}

export async function crearReserva(f, email) {
  const reservaRef = doc(collection(db, 'reservas'));
  const claves = listaNoches(f.entrada, f.salida);
  await runTransaction(db, async (tx) => {
    const ref = await ocuparNoches(tx, claves, reservaRef.id);
    tx.set(reservaRef, { ...camposReserva(f), creadoPor: email, creadoEn: serverTimestamp() });
    claves.forEach((k) => tx.set(ref(k), { tipo: 'RESERVA', reservaId: reservaRef.id, fecha: k }));
  });
  return reservaRef.id;
}

/** Edita una reserva activa; si cambian las fechas, libera las noches viejas y ocupa las nuevas. */
export async function actualizarReserva(id, f, email) {
  const reservaRef = doc(db, 'reservas', id);
  const nuevas = listaNoches(f.entrada, f.salida);
  await runTransaction(db, async (tx) => {
    const actual = await tx.get(reservaRef);
    const viejas = actual.exists() ? listaNoches(actual.data().entrada, actual.data().salida) : [];
    const ref = await ocuparNoches(tx, nuevas, id);
    viejas.filter((k) => !nuevas.includes(k)).forEach((k) => tx.delete(ref(k)));
    nuevas.forEach((k) => tx.set(ref(k), { tipo: 'RESERVA', reservaId: id, fecha: k }));
    tx.update(reservaRef, { ...camposReserva(f), editadoPor: email, editadoEn: serverTimestamp() });
  });
}

/** Cancelar libera las noches. Funciona sin internet. */
export function cancelarReserva(r) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'reservas', r.id), { estado: 'CANCELADA' });
  listaNoches(r.entrada, r.salida).forEach((k) => batch.delete(doc(db, 'noches', k)));
  return batch.commit();
}

/** Volver a activar una cancelada: se comprueba de nuevo que las fechas sigan libres. */
export async function reactivarReserva(r, estado) {
  const claves = listaNoches(r.entrada, r.salida);
  await runTransaction(db, async (tx) => {
    const ref = await ocuparNoches(tx, claves, r.id);
    claves.forEach((k) => tx.set(ref(k), { tipo: 'RESERVA', reservaId: r.id, fecha: k }));
    tx.update(doc(db, 'reservas', r.id), { estado });
  });
}

export const cambiarEstado = (id, estado) => updateDoc(doc(db, 'reservas', id), { estado });

/** Solo para reservas sin pagos (si ya hay pagos, se cancela). */
export function eliminarReserva(r) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'reservas', r.id));
  listaNoches(r.entrada, r.salida).forEach((k) => batch.delete(doc(db, 'noches', k)));
  return batch.commit();
}

/* ---------- Pagos ---------- */
// p = { monto, fecha (Date), metodo, tipo, nota }
export function registrarPago(p, reserva, email) {
  const batch = writeBatch(db);
  const ref = doc(collection(db, 'pagos'));
  batch.set(ref, {
    reservaId: reserva.id, monto: p.monto, fecha: Timestamp.fromDate(p.fecha), mes: claveMes(p.fecha),
    metodo: p.metodo, tipo: p.tipo, nota: p.nota || '', registradoPor: email, creadoEn: serverTimestamp()
  });
  // Primer pago de una consulta: pasa a "con adelanto".
  if (reserva.estado === 'CONSULTA') batch.update(doc(db, 'reservas', reserva.id), { estado: 'CON_ADELANTO' });
  return batch.commit();
}

export const eliminarPago = (id) => deleteDoc(doc(db, 'pagos', id));

/* ---------- Bloqueos (mantenimiento, uso personal) ---------- */
export async function crearBloqueo({ desde, hasta, motivo }, email) {
  const bloqueoId = doc(collection(db, 'noches')).id;
  const claves = listaNoches(desde, hasta);
  await runTransaction(db, async (tx) => {
    const ref = await ocuparNoches(tx, claves, null);
    claves.forEach((k) => tx.set(ref(k), { tipo: 'BLOQUEO', bloqueoId, motivo, fecha: k, creadoPor: email }));
  });
}

export function eliminarBloqueo(bloqueo) {
  const batch = writeBatch(db);
  bloqueo.claves.forEach((k) => batch.delete(doc(db, 'noches', k)));
  return batch.commit();
}
