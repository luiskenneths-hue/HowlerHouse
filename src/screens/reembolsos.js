import { encabezado, proximamente } from '../ui.js';

export const id = 'reembolsos';

export function vista() {
  return encabezado('REEMBOLSOS') + proximamente('Reembolsos', 'Pendientes y reembolsados, gasto por gasto.', 'paso 2');
}
