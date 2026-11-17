// Mantiene en memoria los datos de la casa, sincronizados en vivo con Firestore.
// Las pantallas leen con datos() y se vuelven a pintar cuando algo cambia.
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { sembrarTipos } from './tipos.js';
import { agruparBloqueos } from '../domain/reservas.js';
import { deInputFecha } from '../domain/fechas.js';

const vacio = () => ({
  gastos: [], tipos: [], reservas: [], pagos: [], bloqueos: [], saldoInicial: 0,
  listos: { gastos: false, tipos: false, reservas: false, pagos: false, noches: false, config: false },
  error: ''
});
const estado = vacio();
const oyentes = new Set();
let bajas = [];
let sembrando = false;

export const datos = () => estado;
export const listo = () => Object.values(estado.listos).every(Boolean);
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

// Marca una colección como cargada y avisa ('listo' la primera vez que todo está cargado).
function cargado(clave) {
  const antes = listo();
  estado.listos[clave] = true;
  estado.error = '';
  avisar(!antes && listo() ? 'listo' : 'datos');
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
    cargado('tipos');
  }, alError));

  bajas.push(onSnapshot(collection(db, 'gastos'), (snap) => {
    estado.gastos = snap.docs
      .map((d) => {
        const x = d.data();
        return { id: d.id, ...x, fecha: aFecha(x.fecha), fechaReembolso: aFecha(x.fechaReembolso) };
      })
      .filter((g) => g.fecha && Number.isFinite(g.monto));
    cargado('gastos');
  }, alError));

  bajas.push(onSnapshot(collection(db, 'reservas'), (snap) => {
    estado.reservas = snap.docs
      .map((d) => {
        const x = d.data();
        return { id: d.id, ...x, fEntrada: deInputFecha(x.entrada), fSalida: deInputFecha(x.salida) };
      })
      .filter((r) => r.fEntrada && r.fSalida);
    cargado('reservas');
  }, alError));

  bajas.push(onSnapshot(collection(db, 'pagos'), (snap) => {
    estado.pagos = snap.docs
      .map((d) => { const x = d.data(); return { id: d.id, ...x, fecha: aFecha(x.fecha) }; })
      .filter((p) => p.fecha && Number.isFinite(p.monto));
    cargado('pagos');
  }, alError));

  // Solo las noches bloqueadas; las de reservas se calculan desde las propias reservas.
  bajas.push(onSnapshot(query(collection(db, 'noches'), where('tipo', '==', 'BLOQUEO')), (snap) => {
    estado.bloqueos = agruparBloqueos(snap.docs.map((d) => d.data()));
    cargado('noches');
  }, alError));

  bajas.push(onSnapshot(doc(db, 'config', 'fondo'), (snap) => {
    const x = snap.exists() ? snap.data() : {};
    estado.saldoInicial = Number.isFinite(x.saldoInicial) ? x.saldoInicial : 0;
    cargado('config');
  }, alError));
}

export function detenerStore() {
  bajas.forEach((b) => b());
  bajas = [];
  Object.assign(estado, vacio());
  sembrando = false;
}
