import { encabezado, proximamente } from '../ui.js';

export const id = 'reservas';

export function vista() {
  return encabezado('RESERVAS') + proximamente('Reservas y pagos', 'Huésped, fechas, total, adelantos y saldo pendiente.', 'paso 4');
}
