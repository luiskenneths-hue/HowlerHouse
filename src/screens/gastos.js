import { esc, money, encabezado, ICONO_MAS, cargando } from '../ui.js';
import { datos, listo } from '../data/store.js';
import { LISTA as SOCIOS, nombreSocio } from '../socios.js';
import { mesesRecientes, fechaCorta } from '../domain/fechas.js';
import { suma, totalesPorMes, primerIndiceConDatos, analizarMes, variacion } from '../domain/gastos.js';

export const id = 'gastos';
export const reactivo = true;

const NMESES = 6;
// Filtros que se recuerdan mientras la app está abierta.
const E = { vista: 'todos', sel: NMESES - 1, cat: 'todas', f: 'todos' };

const fuenteDe = (g) => (g.fuente === 'FONDO' ? 'fondo' : g.socio);
const porFechaDesc = (a, b) => b.fecha - a.fecha;

function pildora(g) {
  if (g.fuente === 'FONDO') return { txt: 'Fondo', cls: 'fondo' };
  const n = nombreSocio(g.socio);
  if (g.estadoReembolso === 'PENDIENTE') return { txt: `${n} · Pendiente`, cls: 'pend' };
  if (g.estadoReembolso === 'REEMBOLSADO') return { txt: `${n} · Reembolsado`, cls: 'hecho' };
  return { txt: `Aporte ${n}`, cls: 'aporte' };
}

export function vista() {
  const { gastos, tipos, error } = datos();
  const cabecera = encabezado('GASTOS', `<a class="add-btn" href="#/gasto" aria-label="Nuevo gasto">${ICONO_MAS}</a>`);
  if (error) return `${cabecera}<section class="card"><p class="error" role="alert">${esc(error)}</p></section>`;
  if (!listo()) return cabecera + cargando('Cargando gastos…');
  if (!gastos.length) {
    return `${cabecera}<section class="card soon"><h2>Aún no hay gastos</h2>
      <p>Registra el primero y aquí verás el total por mes, el gráfico y quién pagó cada gasto.</p>
      <a class="btn btn-link" href="#/gasto">Registrar el primer gasto</a></section>`;
  }

  const meses = mesesRecientes(NMESES);
  const todos = E.vista === 'todos';
  const fm = todos ? NMESES - 1 : E.sel;
  const nombreTipo = (tid) => tipos.find((t) => t.id === tid)?.nombre ?? 'Sin tipo';
  const claves = new Set(meses.map((m) => m.clave));
  const ventana = gastos.filter((g) => claves.has(g.mes));
  const okCat = (g) => E.cat === 'todas' || g.tipoId === E.cat;
  const okF = (g) => E.f === 'todos' || fuenteDe(g) === E.f;
  const F = ventana.filter((g) => okCat(g) && okF(g));
  const tot = totalesPorMes(F, meses);
  const max = Math.max(1, ...tot);

  /* ---- Gráfico ---- */
  const barras = meses.map((m, i) => {
    const on = todos || i === E.sel;
    const h = tot[i] === 0 ? 3 : Math.round((tot[i] / max) * 66) + 6;
    return `<button class="bar-col${on ? ' on' : ''}" data-acc="mes" data-v="${i}" aria-label="${m.largo}: ${money(tot[i])}">
      <span class="bar-val">${tot[i] === 0 ? '–' : Math.round(tot[i] / 1000) + 'k'}</span>
      <span class="bar" style="height:${h}px"></span>
      <span class="bar-lbl">${m.corto}</span></button>`;
  }).join('');

  /* ---- Resumen ---- */
  const nomCat = E.cat === 'todas' ? '' : nombreTipo(E.cat).toUpperCase();
  const nomF = E.f === 'todos' ? '' : (E.f === 'fondo' ? 'FONDO' : nombreSocio(E.f).toUpperCase());
  const filtroTxt = [nomCat, nomF].filter(Boolean).join(' · ');
  let titulo, total, nota, notaCls = 'plano';
  if (todos) {
    titulo = `${filtroTxt || 'TODOS LOS GASTOS'} · 6 MESES`;
    total = suma(F);
    nota = `Promedio ${money(Math.round(total / NMESES))} al mes`;
  } else {
    titulo = `${filtroTxt ? filtroTxt + ' · ' : ''}${meses[E.sel].largo.toUpperCase()}`;
    total = tot[E.sel];
    if (E.sel === 0) nota = 'Sin mes anterior para comparar';
    else {
      const v = variacion(tot[E.sel], tot[E.sel - 1]);
      if (!v) nota = `Sin gasto en ${meses[E.sel - 1].largo}`;
      else { nota = `${v.sube ? '▲' : '▼'} ${v.pct}% ${v.sube ? 'más' : 'menos'} que ${meses[E.sel - 1].largo}`; notaCls = v.sube ? 'sube' : 'baja'; }
    }
  }

  /* ---- Alerta: ¿algún tipo de gasto se está disparando? ---- */
  const base = gastos.filter(okF);
  const prim = primerIndiceConDatos(gastos, meses);
  const tiposEnUso = [...new Set(gastos.map((g) => g.tipoId))];
  const evaluar = (tid) => ({ tid, r: analizarMes({ gastos: base, meses, fm, primerIdx: prim, tipoId: tid }) });
  let alerta;
  const sinHist = evaluar(tiposEnUso[0]).r.estado === 'sin-historial';
  if (sinHist) {
    alerta = { cls: 'neutro', txt: 'Aún no hay suficiente historial para detectar alzas: se necesitan al menos 2 meses anteriores con gastos.' };
  } else if (E.cat !== 'todas') {
    const { r } = evaluar(E.cat);
    const detalle = r.pct === null ? 'no había gasto en este tipo en los meses anteriores' : `${`+${r.pct}%`} sobre su promedio de ${money(r.avg)}`;
    alerta = r.estado === 'sale'
      ? { cls: 'sale', txt: `▲ ${nombreTipo(E.cat)} se está disparando en ${meses[fm].largo}: ${money(r.cur)} (${detalle}).` }
      : { cls: 'ok', txt: `✓ ${nombreTipo(E.cat)} está dentro de su promedio (${money(r.avg)} al mes).` };
  } else {
    const etiqueta = (x) => (x.r.pct === null ? `${nombreTipo(x.tid)} (primer gasto)` : `${nombreTipo(x.tid)} +${x.r.pct}%`);
    const salen = tiposEnUso.map(evaluar).filter((x) => x.r.estado === 'sale');
    alerta = salen.length
      ? { cls: 'sale', txt: `▲ Sobre su promedio en ${meses[fm].largo}: ${salen.map(etiqueta).join(' · ')}.` }
      : { cls: 'ok', txt: '✓ Ningún tipo de gasto se sale de su promedio.' };
  }

  /* ---- Filtros ---- */
  const tiposChips = tipos.filter((t) => !t.oculto || tiposEnUso.includes(t.id));
  const chipsCat = [{ id: 'todas', nombre: 'Todas' }, ...tiposChips]
    .map((t) => `<button class="chip${E.cat === t.id ? ' on' : ''}" data-acc="cat" data-v="${esc(t.id)}">${esc(t.nombre)}</button>`).join('');
  const baseF = ventana.filter((g) => okCat(g) && (todos || g.mes === meses[E.sel].clave));
  const opcionesF = [{ id: 'todos', n: 'Todos' }, { id: 'fondo', n: 'Fondo' }, ...SOCIOS.map((s) => ({ id: s.id, n: s.nombre }))];
  const botonesF = opcionesF.map((o) => {
    const monto = suma(baseF.filter((g) => o.id === 'todos' || fuenteDe(g) === o.id));
    return `<button class="fuente${E.f === o.id ? ' on' : ''}" data-acc="f" data-v="${esc(o.id)}"><span>${esc(o.n)}</span><span>${money(monto)}</span></button>`;
  }).join('');

  /* ---- Lista ---- */
  const fila = (g) => {
    const p = pildora(g);
    return `<a class="g-row" href="#/gasto/${esc(g.id)}">
      <div class="info"><span class="desc">${esc(g.descripcion)}</span>
        <div class="meta"><span>${esc(nombreTipo(g.tipoId))} · ${fechaCorta(g.fecha)}</span><span class="pill ${p.cls}">${esc(p.txt)}</span></div></div>
      <span class="monto">${money(g.monto)}</span></a>`;
  };
  let filas = '';
  if (todos) {
    for (let i = NMESES - 1; i >= 0; i--) {
      const gm = F.filter((g) => g.mes === meses[i].clave).sort(porFechaDesc);
      if (!gm.length) continue;
      filas += `<div class="mes-titulo"><span>${meses[i].largo}</span><span class="muted">${money(suma(gm))}</span></div>${gm.map(fila).join('')}`;
    }
  } else {
    filas = F.filter((g) => g.mes === meses[E.sel].clave).sort(porFechaDesc).map(fila).join('');
  }
  if (!filas) filas = '<div class="vacio">No hay gastos con este filtro.</div>';

  return `${cabecera}
    <div class="seg" role="group" aria-label="Periodo">
      <button class="${todos ? 'on' : ''}" data-acc="vista" data-v="todos">Todos los meses</button>
      <button class="${todos ? '' : 'on'}" data-acc="vista" data-v="mes">Por mes</button>
    </div>
    <div class="bloque"><span class="etiqueta">TIPO DE GASTO</span>
      <div class="fila-etiqueta" style="gap:8px"><div class="chips" id="chips-cat" style="flex:1">${chipsCat}</div></div>
      <a class="enlace" href="#/tipos">Administrar tipos de gasto</a></div>
    <div class="bloque"><span class="etiqueta">QUIÉN PAGÓ</span><div class="fuentes">${botonesF}</div></div>
    <section class="resumen">
      <div class="resumen-top"><span class="t">${esc(titulo)}</span><span class="n ${notaCls}">${esc(nota)}</span></div>
      <div class="resumen-total">${money(total)}</div>
      <div class="bars">${barras}</div>
      <div class="alerta ${alerta.cls}" role="status">${esc(alerta.txt)}</div>
    </section>
    <div class="lista">${filas}</div>
    <p class="muted nota-pie">Se muestran los últimos 6 meses.</p>`;
}

function refrescar(ctx) {
  const sc = document.querySelector('#chips-cat')?.scrollLeft || 0;
  ctx.repintar(true);
  const n = document.querySelector('#chips-cat');
  if (n) n.scrollLeft = sc;
}

export function montar(ctx) {
  document.querySelector('#main').onclick = (ev) => {
    const b = ev.target.closest('[data-acc]');
    if (!b) return;
    const v = b.dataset.v;
    if (b.dataset.acc === 'vista') E.vista = v;
    else if (b.dataset.acc === 'mes') { E.vista = 'mes'; E.sel = Number(v); }
    else if (b.dataset.acc === 'cat') E.cat = v;
    else if (b.dataset.acc === 'f') E.f = v;
    refrescar(ctx);
  };
}
