import { encabezado, proximamente } from '../ui.js';

export const id = 'calendario';

export function vista() {
  return encabezado('CALENDARIO') + proximamente('Calendario de reservas', 'Vista mensual con noches ocupadas, libres y bloqueadas.', 'paso 4');
}
