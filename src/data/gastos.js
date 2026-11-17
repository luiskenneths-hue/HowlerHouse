import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { claveMes } from '../domain/fechas.js';

// f = { monto, descripcion, tipoId, fecha (Date), fuente: 'FONDO' | 'SOCIO', socio, reembolsable }
function camposBase(f) {
  const esSocio = f.fuente === 'SOCIO';
  const reembolsable = esSocio ? !!f.reembolsable : false;
  return {
    monto: f.monto,
    descripcion: f.descripcion,
    tipoId: f.tipoId,
    fecha: Timestamp.fromDate(f.fecha),
    mes: claveMes(f.fecha),
    fuente: f.fuente,
    socio: esSocio ? f.socio : null,
    reembolsable,
    estadoReembolso: reembolsable ? 'PENDIENTE' : 'NO_APLICA'
  };
}

export const crearGasto = (f, email) =>
  addDoc(collection(db, 'gastos'), {
    ...camposBase(f), fechaReembolso: null, reembolsadoPor: null, creadoPor: email, creadoEn: serverTimestamp()
  });

// Solo se edita un gasto que NO está reembolsado (la pantalla lo impide).
export const actualizarGasto = (id, f, email) =>
  updateDoc(doc(db, 'gastos', id), { ...camposBase(f), editadoPor: email, editadoEn: serverTimestamp() });

export const eliminarGasto = (id) => deleteDoc(doc(db, 'gastos', id));

export const marcarReembolsado = (id, email) =>
  updateDoc(doc(db, 'gastos', id), { estadoReembolso: 'REEMBOLSADO', fechaReembolso: Timestamp.now(), reembolsadoPor: email });

export const deshacerReembolso = (id) =>
  updateDoc(doc(db, 'gastos', id), { estadoReembolso: 'PENDIENTE', fechaReembolso: null, reembolsadoPor: null });
