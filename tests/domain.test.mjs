// Ejecutar con: node --experimental-default-type=module --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { mesesRecientes, claveMes, deInputFecha, aInputFecha } from '../src/domain/fechas.js';
import { suma, totalesPorMes, primerIndiceConDatos, variacion, analizarMes } from '../src/domain/gastos.js';
import { existeNombre, siguienteOrden, limpiarNombre } from '../src/domain/tipos.js';

const meses = mesesRecientes(6, new Date(2026, 10, 16)); // nov 2026
const g = (mes, monto, tipoId = 'luz') => ({ mes, monto, tipoId });

test('meses recientes: del más antiguo al actual, cruzando de año', () => {
  assert.deepEqual(meses.map((m) => m.clave), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
  const ene = mesesRecientes(3, new Date(2027, 0, 5));
  assert.deepEqual(ene.map((m) => m.clave), ['2026-11', '2026-12', '2027-01']);
  assert.equal(meses[5].largo, 'Noviembre');
});

test('fechas: ida y vuelta con el campo de fecha, sin saltos de día', () => {
  const d = deInputFecha('2026-11-16');
  assert.equal(aInputFecha(d), '2026-11-16');
  assert.equal(claveMes(d), '2026-11');
  assert.equal(deInputFecha('2026-02-31'), null);
  assert.equal(deInputFecha(''), null);
});

test('totales por mes y primer mes con datos', () => {
  const gs = [g('2026-09', 100), g('2026-09', 50), g('2026-11', 30)];
  assert.deepEqual(totalesPorMes(gs, meses), [0, 0, 0, 150, 0, 30]);
  assert.equal(primerIndiceConDatos(gs, meses), 3);
  assert.equal(primerIndiceConDatos([g('2025-01', 1)], meses), 0);
  assert.equal(primerIndiceConDatos([], meses), -1);
  assert.equal(suma(gs), 180);
});

test('variación contra el mes anterior', () => {
  assert.deepEqual(variacion(150, 100), { pct: 50, sube: true });
  assert.deepEqual(variacion(50, 100), { pct: 50, sube: false });
  assert.equal(variacion(50, 0), null);
});

test('alerta: sin historial suficiente no compara (evita falsas alarmas al empezar)', () => {
  const gs = [g('2026-11', 80000)];
  const r = analizarMes({ gastos: gs, meses, fm: 5, primerIdx: primerIndiceConDatos(gs, meses), tipoId: 'luz' });
  assert.equal(r.estado, 'sin-historial');
  const gs2 = [g('2026-10', 40000), g('2026-11', 80000)]; // solo 1 mes previo
  assert.equal(analizarMes({ gastos: gs2, meses, fm: 5, primerIdx: 4, tipoId: 'luz' }).estado, 'sin-historial');
});

test('alerta: detecta un tipo que se dispara y respeta los umbrales', () => {
  const base = [g('2026-08', 45000), g('2026-09', 47000), g('2026-10', 46000)];
  const dispara = [...base, g('2026-11', 68000)];
  const r = analizarMes({ gastos: dispara, meses, fm: 5, primerIdx: 2, tipoId: 'luz' });
  assert.equal(r.estado, 'sale');
  assert.equal(r.avg, 46000);
  assert.equal(r.pct, 48);
  const normal = [...base, g('2026-11', 50000)];
  assert.equal(analizarMes({ gastos: normal, meses, fm: 5, primerIdx: 2, tipoId: 'luz' }).estado, 'normal');
  // +100 % pero solo ₡5.000 de diferencia: no alerta
  const chico = [g('2026-08', 5000), g('2026-09', 5000), g('2026-10', 5000), g('2026-11', 10000)];
  assert.equal(analizarMes({ gastos: chico, meses, fm: 5, primerIdx: 2, tipoId: 'luz' }).estado, 'normal');
});

test('alerta: un tipo nuevo este mes aparece como "nuevo" (pct nulo)', () => {
  const gs = [g('2026-08', 45000, 'luz'), g('2026-09', 45000, 'luz'), g('2026-10', 45000, 'luz'), g('2026-11', 60000, 'reparacion')];
  const r = analizarMes({ gastos: gs, meses, fm: 5, primerIdx: 2, tipoId: 'reparacion' });
  assert.equal(r.estado, 'sale');
  assert.equal(r.pct, null);
});

test('tipos: nombres repetidos (sin importar tildes ni mayúsculas) y orden', () => {
  const tipos = [{ id: 'a', nombre: 'Reparación', orden: 40 }, { id: 'o', nombre: 'Otro', orden: 999, fijo: true }, { id: 'b', nombre: 'Luz', orden: 10 }];
  assert.equal(existeNombre(tipos, '  reparacion '), true);
  assert.equal(existeNombre(tipos, 'REPARACIÓN', 'a'), false); // el mismo tipo no cuenta como repetido
  assert.equal(existeNombre(tipos, 'Piscina'), false);
  assert.equal(siguienteOrden(tipos), 50); // ignora a "Otro"
  assert.equal(limpiarNombre('  Seguridad   privada '), 'Seguridad privada');
});
