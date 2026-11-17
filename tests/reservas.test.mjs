// Ejecutar con: node --experimental-default-type=module --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { nochesEntre, listaNoches, conflictos, agruparBloqueos, pagadoDe, saldoDe, estadoDelDia, telefonoWhatsapp, tipoDePago } from '../src/domain/reservas.js';
import { saldoFondo, resumenPeriodo, serieMensual } from '../src/domain/fondo.js';
import { armarMensaje } from '../src/domain/mensajes.js';
import { mesesRecientes, sumarDias, fechaConDia, deInputFecha, rangoCorto } from '../src/domain/fechas.js';

const R = (id, entrada, salida, extra = {}) => ({ id, huesped: 'Huésped ' + id, entrada, salida, estado: 'CONFIRMADA', total: 360000, noches: nochesEntre(entrada, salida), personas: 4, ...extra });

test('noches: cuenta y lista, incluso cruzando de mes y de año', () => {
  assert.equal(nochesEntre('2026-11-21', '2026-11-24'), 3);
  assert.deepEqual(listaNoches('2026-11-21', '2026-11-24'), ['2026-11-21', '2026-11-22', '2026-11-23']);
  assert.deepEqual(listaNoches('2026-12-30', '2027-01-02'), ['2026-12-30', '2026-12-31', '2027-01-01']);
  assert.equal(nochesEntre('2026-11-24', '2026-11-21'), -3);
  assert.deepEqual(listaNoches('2026-11-24', '2026-11-24'), []);
  assert.equal(nochesEntre('', '2026-11-21'), 0);
  assert.equal(sumarDias('2026-02-28', 1), '2026-03-01');
});

test('cruces: el día de salida queda libre para otra entrada', () => {
  const reservas = [R('a', '2026-11-21', '2026-11-24')];
  const c = (e, s, ex) => conflictos({ reservas, bloqueos: [], entrada: e, salida: s, excluirId: ex });
  assert.equal(c('2026-11-24', '2026-11-26').length, 0, 'entrar el día que otro sale es válido');
  assert.equal(c('2026-11-19', '2026-11-21').length, 0, 'salir el día que otro entra es válido');
  assert.equal(c('2026-11-23', '2026-11-25').length, 1, 'una noche en común');
  assert.equal(c('2026-11-20', '2026-11-30').length, 1, 'contiene a la otra');
  assert.equal(c('2026-11-22', '2026-11-23').length, 1, 'dentro de la otra');
  assert.equal(c('2026-11-23', '2026-11-25', 'a').length, 0, 'al editar no choca consigo misma');
});

test('cruces: una reserva cancelada no ocupa fechas; los bloqueos sí', () => {
  const reservas = [R('a', '2026-11-21', '2026-11-24', { estado: 'CANCELADA' })];
  assert.equal(conflictos({ reservas, bloqueos: [], entrada: '2026-11-22', salida: '2026-11-23' }).length, 0);
  const bloqueos = [{ id: 'b', desde: '2026-11-12', hasta: '2026-11-14', motivo: 'Pintura' }];
  const c = conflictos({ reservas: [], bloqueos, entrada: '2026-11-13', salida: '2026-11-15' });
  assert.equal(c.length, 1);
  assert.equal(c[0].tipo, 'bloqueo');
  assert.equal(conflictos({ reservas: [], bloqueos, entrada: '2026-11-14', salida: '2026-11-16' }).length, 0);
});

test('bloqueos: las noches sueltas se agrupan en un rango', () => {
  const noches = [
    { bloqueoId: 'x', fecha: '2026-11-13', motivo: 'Pintura' }, { bloqueoId: 'x', fecha: '2026-11-12', motivo: 'Pintura' },
    { bloqueoId: 'y', fecha: '2026-12-01', motivo: 'Uso personal' }
  ];
  const b = agruparBloqueos(noches);
  assert.equal(b.length, 2);
  assert.deepEqual([b[0].desde, b[0].hasta, b[0].motivo], ['2026-11-12', '2026-11-14', 'Pintura']);
  assert.deepEqual([b[1].desde, b[1].hasta], ['2026-12-01', '2026-12-02']);
});

test('saldo de una reserva', () => {
  const r = R('a', '2026-11-21', '2026-11-24');
  const pagos = [{ reservaId: 'a', monto: 180000 }, { reservaId: 'b', monto: 999 }];
  assert.equal(pagadoDe(pagos, 'a'), 180000);
  assert.equal(saldoDe(r, pagos), 180000);
  assert.equal(saldoDe(r, [{ reservaId: 'a', monto: 400000 }]), 0, 'nunca negativo');
});

test('estado de un día: ocupa, entra, sale, bloqueado', () => {
  const reservas = [R('a', '2026-11-21', '2026-11-24'), R('b', '2026-11-24', '2026-11-26')];
  const bloqueos = [{ id: 'z', desde: '2026-11-12', hasta: '2026-11-14', motivo: 'Pintura' }];
  const d24 = estadoDelDia('2026-11-24', reservas, bloqueos);
  assert.equal(d24.ocupa.id, 'b');
  assert.deepEqual(d24.salen.map((r) => r.id), ['a']);
  assert.deepEqual(d24.entran.map((r) => r.id), ['b']);
  assert.equal(estadoDelDia('2026-11-13', reservas, bloqueos).bloqueo.motivo, 'Pintura');
  assert.equal(estadoDelDia('2026-11-14', reservas, bloqueos).bloqueo, null);
  assert.equal(estadoDelDia('2026-11-10', reservas, bloqueos).ocupa, null);
});

test('teléfono de WhatsApp', () => {
  assert.equal(telefonoWhatsapp('8888 1234'), '50688881234');
  assert.equal(telefonoWhatsapp('+506 8888-1234'), '50688881234');
  assert.equal(telefonoWhatsapp('00506 88881234'), '50688881234');
  assert.equal(telefonoWhatsapp('+1 305 555 0100'), '13055550100');
  assert.equal(telefonoWhatsapp('123'), '');
  assert.equal(telefonoWhatsapp(''), '');
});

test('fondo: saldo = inicial + cobrado − gastos del fondo − reembolsos', () => {
  const pagos = [{ monto: 180000, mes: '2026-11' }, { monto: 100000, mes: '2026-10' }];
  const gastos = [
    { monto: 68000, fuente: 'FONDO', mes: '2026-11', estadoReembolso: 'NO_APLICA' },
    { monto: 30000, fuente: 'FONDO', mes: '2026-10', estadoReembolso: 'NO_APLICA' },
    { monto: 38000, fuente: 'SOCIO', mes: '2026-11', estadoReembolso: 'REEMBOLSADO', fechaReembolso: new Date(2026, 10, 5) },
    { monto: 60000, fuente: 'SOCIO', mes: '2026-11', estadoReembolso: 'PENDIENTE' },
    { monto: 120000, fuente: 'SOCIO', mes: '2026-07', estadoReembolso: 'NO_APLICA' }
  ];
  const f = saldoFondo({ saldoInicial: 50000, pagos, gastos });
  assert.equal(f.cobrado, 280000);
  assert.equal(f.gastadoFondo, 98000);
  assert.equal(f.reembolsado, 38000);
  assert.equal(f.saldo, 50000 + 280000 - 98000 - 38000);
  // los pendientes y los aportes definitivos NO tocan el fondo
  const nov = resumenPeriodo({ pagos, gastos, clave: '2026-11' });
  assert.deepEqual(nov, { cobrado: 180000, gastado: 68000 + 38000 });
  assert.deepEqual(resumenPeriodo({ pagos, gastos }), { cobrado: 280000, gastado: 98000 + 38000 });
  const serie = serieMensual({ pagos, gastos, meses: mesesRecientes(2, new Date(2026, 10, 16)) });
  assert.deepEqual(serie.map((s) => [s.clave, s.cobrado, s.gastado]), [['2026-10', 100000, 30000], ['2026-11', 180000, 106000]]);
});

test('mensajes de WhatsApp: llevan los datos de la reserva', () => {
  const r = R('a', '2026-11-21', '2026-11-24', { huesped: 'María Vargas', personas: 6 });
  const m = armarMensaje('confirmacion', { reserva: r, pagado: 180000, saldo: 180000 });
  assert.match(m, /^Hola María,/);
  assert.match(m, /sáb 21 nov 2026/);
  assert.match(m, /Saldo pendiente: ₡ 180\.000/);
  assert.match(armarMensaje('confirmacion', { reserva: r, pagado: 360000, saldo: 0 }), /pagada en su totalidad/);
  assert.match(armarMensaje('pago', { reserva: r, pagado: 0, saldo: 360000 }), /₡ 360\.000/);
  assert.match(armarMensaje('llegada', { reserva: r, pagado: 0, saldo: 0 }), /llegada/);
  assert.match(armarMensaje('gracias', { reserva: r, pagado: 0, saldo: 0 }), /gracias por hospedarte/);
  assert.equal(fechaConDia(deInputFecha('2026-11-21')), 'sáb 21 nov 2026');
});

test('tipo de pago y rango de fechas', () => {
  assert.equal(tipoDePago({ pagadoAntes: 0, saldo: 360000, monto: 360000 }), 'COMPLETO');
  assert.equal(tipoDePago({ pagadoAntes: 0, saldo: 360000, monto: 180000 }), 'ADELANTO');
  assert.equal(tipoDePago({ pagadoAntes: 180000, saldo: 180000, monto: 180000 }), 'SALDO');
  assert.equal(tipoDePago({ pagadoAntes: 100000, saldo: 260000, monto: 60000 }), 'ABONO');
  assert.equal(rangoCorto('2026-11-21', '2026-11-24'), '21 – 24 nov');
  assert.equal(rangoCorto('2026-11-28', '2026-12-01'), '28 nov – 1 dic');
});
