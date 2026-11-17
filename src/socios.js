// Los dos socios con un identificador estable (se guarda en cada gasto).
import { SOCIOS } from './firebase-config.js';

const idDe = (nombre) => nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const LISTA = SOCIOS.map((s) => ({ ...s, id: idDe(s.nombre) }));
export const nombreSocio = (id) => LISTA.find((s) => s.id === id)?.nombre ?? 'Socio';
export const socioPorEmail = (email) => {
  const e = String(email || '').trim().toLowerCase();
  return LISTA.find((s) => s.email.toLowerCase() === e) || null;
};
