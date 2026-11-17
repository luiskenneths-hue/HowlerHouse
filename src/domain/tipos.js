// Tipos de gasto que se crean la primera vez que se abre la app.
// "Otro" es fijo: no se puede renombrar ni ocultar.
export const TIPOS_INICIALES = [
  { id: 'luz', nombre: 'Luz', orden: 10 },
  { id: 'agua', nombre: 'Agua', orden: 20 },
  { id: 'limpieza', nombre: 'Limpieza', orden: 30 },
  { id: 'reparacion', nombre: 'Reparación', orden: 40 },
  { id: 'insumos', nombre: 'Insumos', orden: 50 },
  { id: 'otro', nombre: 'Otro', orden: 999, fijo: true }
];

export const limpiarNombre = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const comparable = (s) => limpiarNombre(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const existeNombre = (tipos, nombre, exceptoId = null) =>
  tipos.some((t) => t.id !== exceptoId && comparable(t.nombre) === comparable(nombre));

/** Orden para un tipo nuevo: después de los demás, pero antes de "Otro". */
export const siguienteOrden = (tipos) =>
  tipos.filter((t) => !t.fijo).reduce((m, t) => Math.max(m, t.orden ?? 0), 0) + 10;
