export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const p2 = (n) => String(n).padStart(2, '0');

/** "2026-11" para agrupar y filtrar por mes. */
export const claveMes = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;

/** Los últimos n meses, del más antiguo al actual. */
export function mesesRecientes(n, hoy = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    out.push({ clave: claveMes(d), corto: MESES_CORTOS[d.getMonth()], largo: MESES_LARGOS[d.getMonth()], anio: d.getFullYear() });
  }
  return out;
}

/** yyyy-mm-dd para <input type="date"> */
export const aInputFecha = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** Convierte yyyy-mm-dd en fecha local a mediodía (evita saltos de día por zona horaria). */
export function deInputFecha(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

export const fechaCorta = (d) => `${d.getDate()} ${MESES_CORTOS[d.getMonth()].toLowerCase()}`;
export const fechaLarga = (d) => `${d.getDate()} ${MESES_CORTOS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
