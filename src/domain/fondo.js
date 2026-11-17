// Saldo del fondo de la casa y resúmenes por periodo.
import { suma } from './gastos.js';
import { claveMes } from './fechas.js';

const mesDeReembolso = (g) => (g.fechaReembolso ? claveMes(g.fechaReembolso) : null);

/**
 * saldo = saldo inicial + cobrado en reservas − gastos pagados con el fondo − reembolsos entregados.
 * Un gasto reembolsado salió del bolsillo de un socio y el fondo se lo devolvió: por eso resta aquí.
 */
export function saldoFondo({ saldoInicial = 0, pagos, gastos }) {
  const cobrado = suma(pagos);
  const gastadoFondo = suma(gastos.filter((g) => g.fuente === 'FONDO'));
  const reembolsado = suma(gastos.filter((g) => g.estadoReembolso === 'REEMBOLSADO'));
  return { saldoInicial, cobrado, gastadoFondo, reembolsado, saldo: saldoInicial + cobrado - gastadoFondo - reembolsado };
}

/** Cobrado y gastado del periodo. clave = "2026-11", o null para todo el tiempo. */
export function resumenPeriodo({ pagos, gastos, clave = null }) {
  const enPeriodo = (mes) => clave === null || mes === clave;
  const cobrado = suma(pagos.filter((p) => enPeriodo(p.mes)));
  const gastadoFondo = suma(gastos.filter((g) => g.fuente === 'FONDO' && enPeriodo(g.mes)));
  const reembolsado = suma(gastos.filter((g) => g.estadoReembolso === 'REEMBOLSADO' && enPeriodo(mesDeReembolso(g))));
  return { cobrado, gastado: gastadoFondo + reembolsado };
}

/** Serie para el gráfico: cobrado y gastado por cada mes de `meses`. */
export const serieMensual = ({ pagos, gastos, meses }) =>
  meses.map((m) => ({ clave: m.clave, ...resumenPeriodo({ pagos, gastos, clave: m.clave }) }));
