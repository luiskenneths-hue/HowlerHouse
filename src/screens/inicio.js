import { esc, money, miles, toast, openSheet, closeSheet, ICONO_MAS, cargando } from '../ui.js';
import monoUrl from '../mono-oro.png';
import { datos, listo } from '../data/store.js';
import { LISTA as SOCIOS } from '../socios.js';
import { saldoFondo, resumenPeriodo, serieMensual } from '../domain/fondo.js';
import { ESTADOS, saldoDe } from '../domain/reservas.js';
import { suma } from '../domain/gastos.js';
import { mesesRecientes, aInputFecha, rangoCorto, MESES_CORTOS } from '../domain/fechas.js';
import { guardarSaldoInicial } from '../data/fondo.js';

export const id = 'inicio';
export const reactivo = true;

const I = { periodo: null }; // null = mes actual · 'todo' · "2026-11"
const N = 6;

const cabecera = (socio) => `
  <header class="brand-head">
    <img src="${monoUrl}" alt="Howler House" class="mono">
    <div class="brand-text"><span class="brand-name">HOWLER HOUSE</span><span class="brand-sub">Marbella, Guanacaste</span></div>
    <button class="avatar" data-acc="perfil" aria-label="Mi cuenta">${esc(socio.nombre.slice(0, 1).toUpperCase())}</button>
  </header><div class="rule"></div>`;

export function vista(ctx) {
  const { gastos, pagos, reservas, saldoInicial, error } = datos();
  const cab = cabecera(ctx.socio);
  if (error) return `${cab}<section class="card"><p class="error" role="alert">${esc(error)}</p></section>`;
  if (!listo()) return cab + cargando('Cargando…');

  const meses = mesesRecientes(N);
  const actual = meses[N - 1].clave;
  let periodo = I.periodo ?? actual;
  if (periodo !== 'todo' && !meses.some((m) => m.clave === periodo)) periodo = actual;
  const mesP = meses.find((m) => m.clave === periodo);
  const etiquetaPeriodo = periodo === 'todo' ? 'Todo el tiempo' : `${mesP.largo} ${mesP.anio}`;

  const fondo = saldoFondo({ saldoInicial, pagos, gastos });
  const res = resumenPeriodo({ pagos, gastos, clave: periodo === 'todo' ? null : periodo });
  const negativo = fondo.saldo < 0;

  /* Pendiente de reembolso por socio */
  const pend = gastos.filter((g) => g.fuente === 'SOCIO' && g.reembolsable && g.estadoReembolso === 'PENDIENTE');
  const tarjetasPend = SOCIOS.map((s) => {
    const mios = pend.filter((g) => g.socio === s.id);
    return `<div class="mini-card"><span class="muted">Se le debe a ${esc(s.nombre)}</span><span class="v">${money(suma(mios))}</span>
      <span class="muted">${mios.length} ${mios.length === 1 ? 'gasto' : 'gastos'}</span></div>`;
  }).join('');

  /* Por cobrar y próximas reservas */
  const hoy = aInputFecha(new Date());
  const vivas = reservas.filter((r) => r.estado !== 'CANCELADA');
  const conSaldo = vivas.map((r) => saldoDe(r, pagos)).filter((s) => s > 0);
  const porCobrar = conSaldo.reduce((a, s) => a + s, 0);
  const proximas = vivas.filter((r) => r.salida >= hoy).sort((a, b) => a.entrada.localeCompare(b.entrada)).slice(0, 3);
  const filaReserva = (r) => {
    const st = ESTADOS[r.estado] || ESTADOS.CONSULTA;
    return `<a class="r-row" href="#/reserva/${esc(r.id)}">
      <div class="dia-badge"><b>${Number(r.entrada.slice(8, 10))}</b><span>${MESES_CORTOS[Number(r.entrada.slice(5, 7)) - 1].toLowerCase()}</span></div>
      <div class="info"><span class="nombre">${esc(r.huesped)}</span><span class="muted">${esc(rangoCorto(r.entrada, r.salida))} · ${r.personas} ${r.personas === 1 ? 'persona' : 'personas'}</span></div>
      <span class="estado-chip ${st.cls}">${esc(st.label)}</span></a>`;
  };

  /* Gráfico: cobrado y gastado por mes */
  const serie = serieMensual({ pagos, gastos, meses });
  const max = Math.max(1, ...serie.flatMap((s) => [s.cobrado, s.gastado]));
  const h = (v) => (v === 0 ? 3 : Math.max(4, Math.round((v / max) * 96)));
  const grupos = serie.map((s, i) => `<div class="dgrupo${s.clave === periodo ? ' act' : ''}" role="img" aria-label="${meses[i].largo}: cobrado ${money(s.cobrado)}, gastado ${money(s.gastado)}">
    <div class="dpar"><i class="ing" style="height:${h(s.cobrado)}px"></i><i class="gas" style="height:${h(s.gastado)}px"></i></div><span class="l">${meses[i].corto}</span></div>`).join('');

  return `${cab}
    <section class="card hero">
      <div class="hero-top"><span class="eyebrow">FONDO DE LA CASA</span>
        <button class="periodo-btn" data-acc="periodo" aria-label="Cambiar periodo: ${esc(etiquetaPeriodo)}">${esc(etiquetaPeriodo)} ▾</button></div>
      <div class="hero-amount${negativo ? ' hero-neg' : ''}">${negativo ? '−' : ''}${money(fondo.saldo)}</div>
      <div class="muted">${negativo ? 'El fondo está en negativo: se ha gastado más de lo cobrado.' : 'Saldo disponible para mantenimientos'}</div>
      <div class="stats">
        <div class="stat"><span class="muted">Cobrado en reservas</span><strong>${money(res.cobrado)}</strong></div>
        <a class="stat" href="#/gastos"><span class="muted">Gastado y reembolsado</span><strong>${money(res.gastado)}</strong></a>
      </div>
      <button class="enlace" data-acc="saldo-inicial" style="align-self:flex-start">Saldo inicial del fondo: ${money(saldoInicial)} · cambiar</button>
    </section>

    <section style="display:flex;flex-direction:column;gap:12px">
      <div class="fila-seccion"><h2 class="titulo-seccion">Pendiente de reembolso</h2><a class="enlace" href="#/reembolsos">Ver todo</a></div>
      <div class="dos">${tarjetasPend}</div>
    </section>

    ${conSaldo.length ? `<a class="cobrar-card" href="#/reservas"><div style="display:flex;flex-direction:column;gap:2px"><span class="muted">Por cobrar en reservas</span><span class="muted">${conSaldo.length} ${conSaldo.length === 1 ? 'reserva con saldo' : 'reservas con saldo'}</span></div><span class="v">${money(porCobrar)}</span></a>` : ''}

    <section class="dos-botones">
      <a class="btn btn-link" href="#/rform" style="gap:8px">${ICONO_MAS}Nueva reserva</a>
      <a class="btn-oro-borde btn-link" href="#/gasto" style="gap:8px">${ICONO_MAS}Nuevo gasto</a>
    </section>

    <section style="display:flex;flex-direction:column;gap:12px">
      <div class="fila-seccion"><h2 class="titulo-seccion">Próximas reservas</h2><a class="enlace" href="#/calendario">Calendario</a></div>
      ${proximas.length ? proximas.map(filaReserva).join('') : '<div class="vacio">No hay reservas próximas.</div>'}
    </section>

    <section class="grafico" aria-label="Cobrado y gastado por mes">
      <h2 class="titulo-seccion">Ingresos y gastos por mes</h2>
      <div class="dbars">${grupos}</div>
      <div class="leyenda-g"><span><i style="background:var(--gold)"></i>Cobrado</span><span><i style="background:var(--blue)"></i>Gastado del fondo</span></div>
    </section>`;
}

function abrirPeriodo(ctx) {
  const meses = mesesRecientes(N);
  const actual = I.periodo ?? meses[N - 1].clave;
  const op = (v, t) => `<button class="opcion ${actual === v ? 'on' : ''}" data-p="${v}">${esc(t)}</button>`;
  const p = openSheet('Periodo', op('todo', 'Todo el tiempo') + [...meses].reverse().map((m) => op(m.clave, `${m.largo} ${m.anio}`)).join(''));
  p.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-p]'); if (!b) return;
    I.periodo = b.dataset.p === meses[N - 1].clave ? null : b.dataset.p;
    closeSheet(); ctx.repintar(true);
  });
}

function abrirSaldoInicial(ctx) {
  const { saldoInicial } = datos();
  const p = openSheet('Saldo inicial del fondo', `
    <p class="sheet-text">Es el dinero que ya había en el fondo cuando empezaron a usar la app. Se suma al saldo junto con lo que se cobre en reservas.</p>
    <div class="field"><label for="s-monto">MONTO</label>
      <div class="monto-box"><span class="moneda">₡</span><input id="s-monto" type="text" inputmode="numeric" autocomplete="off" value="${miles(saldoInicial)}" placeholder="0"></div></div>
    <button class="btn" id="s-guardar">Guardar</button>`);
  const inp = p.querySelector('#s-monto');
  inp.addEventListener('input', (e) => { e.target.value = miles(e.target.value.replace(/\D/g, '').slice(0, 10).replace(/^0+(?=\d)/, '')); });
  p.querySelector('#s-guardar').addEventListener('click', () => {
    const monto = parseInt(inp.value.replace(/\D/g, '') || '0', 10);
    guardarSaldoInicial(monto, ctx.user.email).catch((e) => { console.error(e); toast('No se pudo guardar el saldo inicial.'); });
    closeSheet();
    toast('Saldo inicial actualizado');
  });
}

export function montar(ctx) {
  document.querySelector('#main').onclick = (ev) => {
    const b = ev.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    if (acc === 'perfil') ctx.abrirPerfil();
    else if (acc === 'periodo') abrirPeriodo(ctx);
    else if (acc === 'saldo-inicial') abrirSaldoInicial(ctx);
  };
}
