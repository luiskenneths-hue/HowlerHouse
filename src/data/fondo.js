import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';

/** Saldo con el que arrancó el fondo antes de usar la app. */
export const guardarSaldoInicial = (monto, email) =>
  setDoc(doc(db, 'config', 'fondo'), { saldoInicial: monto, editadoPor: email, editadoEn: serverTimestamp() }, { merge: true });
