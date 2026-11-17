// Mensajes de WhatsApp para los huéspedes. Se pueden editar antes de enviar.
import { money } from './formato.js';
import { fechaConDia } from './fechas.js';
import { deInputFecha } from './fechas.js';

export const PLANTILLAS = [
  { id: 'confirmacion', titulo: 'Confirmación de reserva', detalle: 'Fechas, total y saldo' },
  { id: 'llegada', titulo: 'Coordinar la llegada', detalle: 'Antes de la entrada' },
  { id: 'pago', titulo: 'Recordatorio de pago', detalle: 'Saldo pendiente' },
  { id: 'gracias', titulo: 'Agradecimiento', detalle: 'Después de la salida' }
];

export function armarMensaje(id, { reserva, pagado, saldo }) {
  const nombre = (reserva.huesped || '').trim().split(/\s+/)[0] || 'hola';
  const entrada = fechaConDia(deInputFecha(reserva.entrada));
  const salida = fechaConDia(deInputFecha(reserva.salida));
  if (id === 'confirmacion') {
    const lineas = [
      `Hola ${nombre}, te confirmamos tu reserva en Howler House (Marbella, Guanacaste).`,
      '',
      `Entrada: ${entrada}`,
      `Salida: ${salida}`,
      `Noches: ${reserva.noches} · Personas: ${reserva.personas}`,
      `Total: ${money(reserva.total)}`
    ];
    if (pagado > 0) lineas.push(`Pagado: ${money(pagado)}`);
    lineas.push(saldo > 0 ? `Saldo pendiente: ${money(saldo)}` : 'Tu reserva está pagada en su totalidad.');
    lineas.push('', 'Cualquier duda, escríbenos por aquí. ¡Te esperamos!');
    return lineas.join('\n');
  }
  if (id === 'llegada') {
    return `Hola ${nombre}, ya falta poco para tu estadía en Howler House (entrada: ${entrada}). Para coordinar tu llegada, ¿a qué hora aproximada llegarían? Con gusto te enviamos la ubicación y las indicaciones para ingresar a la casa.`;
  }
  if (id === 'pago') {
    return `Hola ${nombre}, te escribimos para recordarte el saldo pendiente de tu reserva en Howler House (${entrada} al ${salida}): ${money(saldo)}. Puedes pagarlo por SINPE Móvil, transferencia o en efectivo. ¡Gracias!`;
  }
  return `Hola ${nombre}, gracias por hospedarte en Howler House. Esperamos que hayas disfrutado tu estadía; será un gusto recibirte de nuevo. ¡Un abrazo!`;
}
