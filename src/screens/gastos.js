import { encabezado, proximamente } from '../ui.js';

export const id = 'gastos';

export function vista() {
  return encabezado('GASTOS') + proximamente('Gastos por mes', 'Lista de gastos, filtros por tipo y por socio, y alertas de variación.', 'paso 2');
}
