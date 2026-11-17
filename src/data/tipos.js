import { collection, doc, addDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { TIPOS_INICIALES } from '../domain/tipos.js';

/** Crea los tipos iniciales (ids fijos: si dos teléfonos lo hacen a la vez, queda igual). */
export function sembrarTipos() {
  return Promise.all(TIPOS_INICIALES.map((t) =>
    setDoc(doc(db, 'tiposGasto', t.id), { nombre: t.nombre, oculto: false, fijo: !!t.fijo, orden: t.orden, creadoEn: serverTimestamp() })));
}

export const crearTipo = (nombre, orden) =>
  addDoc(collection(db, 'tiposGasto'), { nombre, oculto: false, fijo: false, orden, creadoEn: serverTimestamp() });

export const renombrarTipo = (id, nombre) => updateDoc(doc(db, 'tiposGasto', id), { nombre });

export const ocultarTipo = (id, oculto) => updateDoc(doc(db, 'tiposGasto', id), { oculto });
