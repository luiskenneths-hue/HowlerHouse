// Mantiene en memoria los gastos y tipos, sincronizados en vivo con Firestore.
// Las pantallas leen con datos() y se vuelven a pintar cuando algo cambia.
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { sembrarTipos } from './tipos.js';

const estado = { gastos: [], tipos: [], listoGastos: false, listoTipos: false, error: '' };
const oyentes = new Set();
let bajas = [];
let sembrando = false;

export const datos = () => estado;
export const listo = () => estado.listoGastos && estado.listoTipos;
export function suscribir(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }

function avisar(tipo) {
  oyentes.forEach((fn) => { try { fn(tipo); } catch (e) { console.error(e); } });
}
const aFecha = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : null);

function alError(e) {
  console.error(e);
  estado.error = e && e.code === 'permission-denied'
    ? 'No hay permiso para leer los datos. Revisa que los correos de las reglas de Firestore coincidan con los de Authentication.'
    : 'No se pudieron leer los datos. Revisa la conexión.';
  avisar('error');
}

export function iniciarStore() {
  detenerStore();

  bajas.push(onSnapshot(collection(db, 'tiposGasto'), (snap) => {
    // Base nueva y vacía (respuesta del servidor, no de la caché): crear los tipos iniciales.
    if (snap.empty && !snap.metadata.fromCache && !sembrando) {
      sembrando = true;
      sembrarTipos().catch(console.error);
    }
    estado.tipos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.orden ?? 500) - (b.orden ?? 500) || String(a.nombre).localeCompare(String(b.nombre), 'es'));
    const antes = listo();
    estado.listoTipos = true;
    estado.error = '';
    avisar(!antes && listo() ? 'listo' : 'datos');
  }, alError));

  bajas.push(onSnapshot(collection(db, 'gastos'), (snap) => {
    estado.gastos = snap.docs
      .map((d) => {
        const x = d.data();
        return { id: d.id, ...x, fecha: aFecha(x.fecha), fechaReembolso: aFecha(x.fechaReembolso) };
      })
      .filter((g) => g.fecha && Number.isFinite(g.monto));
    const antes = listo();
    estado.listoGastos = true;
    estado.error = '';
    avisar(!antes && listo() ? 'listo' : 'datos');
  }, alError));
}

export function detenerStore() {
  bajas.forEach((b) => b());
  bajas = [];
  estado.gastos = []; estado.tipos = [];
  estado.listoGastos = false; estado.listoTipos = false; estado.error = '';
  sembrando = false;
}
