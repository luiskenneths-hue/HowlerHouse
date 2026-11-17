// Cálculos puros sobre gastos (sin Firebase), fáciles de probar.
export const UMBRAL_RATIO = 1.3;       // 30 % sobre el promedio
export const UMBRAL_MONTO = 15000;     // y al menos ₡15.000 de diferencia
export const MIN_MESES_HISTORIAL = 2;  // meses anteriores necesarios para comparar

export const suma = (arr) => arr.reduce((a, g) => a + g.monto, 0);

/** Total por cada mes de la lista `meses` (en el mismo orden). */
export const totalesPorMes = (gastos, meses) => meses.map((m) => suma(gastos.filter((g) => g.mes === m.clave)));

/** Posición, dentro de `meses`, del primer mes con gastos. -1 si no hay datos en la ventana. */
export function primerIndiceConDatos(gastos, meses) {
  if (!gastos.length) return -1;
  const min = gastos.map((g) => g.mes).sort()[0];
  if (min <= meses[0].clave) return 0;
  return meses.findIndex((m) => m.clave >= min);
}

/** Variación del mes actual contra el anterior. */
export function variacion(actual, anterior) {
  if (anterior === 0) return null;
  const pct = Math.round((Math.abs(actual - anterior) / anterior) * 100);
  return { pct, sube: actual >= anterior };
}

/**
 * Compara el gasto de un tipo en el mes `fm` con su promedio de los meses anteriores.
 * Devuelve { estado: 'sin-historial' | 'sale' | 'normal', cur, avg, pct }.
 */
export function analizarMes({ gastos, meses, fm, primerIdx, tipoId }) {
  if (primerIdx < 0 || fm - primerIdx < MIN_MESES_HISTORIAL) return { estado: 'sin-historial', cur: 0, avg: 0, pct: null };
  const delTipo = gastos.filter((g) => g.tipoId === tipoId);
  const serie = totalesPorMes(delTipo, meses);
  const previos = serie.slice(primerIdx, fm);
  const avg = Math.round(previos.reduce((a, v) => a + v, 0) / previos.length);
  const cur = serie[fm];
  const sale = cur >= avg * UMBRAL_RATIO && cur - avg >= UMBRAL_MONTO;
  const pct = avg > 0 ? Math.round((cur / avg - 1) * 100) : null; // null = no tenía gasto antes
  return { estado: sale ? 'sale' : 'normal', cur, avg, pct };
}
