import { esc, money, toast, confirmar, encabezado, cargando } from '../ui.js';
import { datos, listo } from '../data/store.js';
import { LISTA as SOCIOS, nombreSocio } from '../socios.js';
import { fechaCorta } from '../domain/fechas.js';
import { suma } from '../domain/gastos.js';
import { saldoFondo } from '../domain/fondo.js';
import { marcarReembolsado, deshacerReembolso } from '../data/gastos.js';

export const id = 'reembolsos';
export const reactivo = true;

const R = { tab: 'pend' };

export function vista() {
  const { gastos, tipos, error } = datos();
  const cab = encabezado('REEMBOLSOS', '<a class="add-btn" href="#/gasto" aria-label="Nuevo gasto"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></a>');
  if (error) return `${cab}<section class="card"><p class="error" role="alert">${esc(error)}</p></section>`;
  if (!listo()) return cab + cargando();

  const reemb = gastos.filter((g) => g.fuente === 'SOCIO' && g.reembolsable);
  const pend = reemb.filter((g) => g.estadoReembolso === 'PENDIENTE').sort((a, b) => a.fecha - b.fecha);
  const hechos = reemb.filter((g) => g.estadoReembolso === 'REEMBOLSADO')
    .sort((a, b) => (b.fechaReembolso?.getTime() ?? 0) - (a.fechaReembolso?.getTime() ?? 0));
  const nombreTipo = (tid) => tipos.find((t) => t.id === tid)?.nombre ?? 'Sin tipo';
  const enPend = R.tab === 'pend';

  const tarjetas = SOCIOS.map((s) => `<div class="mini-card"><span class="muted">Pendiente para ${esc(s.nombre)}</span>
    <span class="v">${money(suma(pend.filter((g) => g.socio === s.id)))}</span></div>`).join('');

  const tarjeta = (g) => `<div class="r-card">
    <div class="r-top"><div class="info"><span class="desc">${esc(g.descripcion)}</span>
      <span class="muted">${esc(nombreTipo(g.tipoId))} · ${fechaCorta(g.fecha)}</span></div>
      <span class="monto">${money(g.monto)}</span></div>
    <div class="r-bot">${enPend
      ? `<span class="estado pend">Pendiente · Paga ${esc(nombreSocio(g.socio))}</span><button class="mini oro" data-acc="reembolsar" data-v="${esc(g.id)}">Reembolsar</button>`
      : `<span class="estado hecho">Reembolsado a ${esc(nombreSocio(g.socio))} · ${g.fechaReembolso ? fechaCorta(g.fechaReembolso) : ''}</span><button class="mini suave" style="text-decoration:underline" data-acc="deshacer" data-v="${esc(g.id)}">Deshacer</button>`}
    </div></div>`;

  const lista = enPend ? pend : hechos;
  const vacio = enPend ? 'No hay reembolsos pendientes.' : 'Todavía no se ha reembolsado ningún gasto.';

  return `${cab}
    <div class="dos">${tarjetas}</div>
    <div class="seg" role="group" aria-label="Estado">
      <button class="${enPend ? 'on' : ''}" data-acc="tab" data-v="pend">Pendientes (${pend.length})</button>
      <button class="${enPend ? '' : 'on'}" data-acc="tab" data-v="hechos">Reembolsados (${hechos.length})</button>
    </div>
    <div class="lista">${lista.length ? lista.map(tarjeta).join('') : `<div class="vacio">${vacio}</div>`}</div>`;
}

export function montar(ctx) {
  document.querySelector('#main').onclick = async (ev) => {
    const b = ev.target.closest('[data-acc]');
    if (!b) return;
    const acc = b.dataset.acc;
    if (acc === 'tab') { R.tab = b.dataset.v; ctx.repintar(true); return; }
    const g = datos().gastos.find((x) => x.id === b.dataset.v);
    if (!g) return;
    if (acc === 'reembolsar') {
      const d = datos();
      const saldo = saldoFondo({ saldoInicial: d.saldoInicial, pagos: d.pagos, gastos: d.gastos }).saldo;
      const aviso = saldo < g.monto ? ` Ojo: el saldo del fondo (${saldo < 0 ? '−' : ''}${money(saldo)}) no alcanza para este reembolso. Puedes registrarlo igual.` : '';
      const ok = await confirmar('Reembolsar gasto', `Se marcará como reembolsado a ${nombreSocio(g.socio)}: "${g.descripcion}" por ${money(g.monto)}. Hazlo cuando ya le hayan entregado el dinero.${aviso}`, 'Marcar como reembolsado');
      if (!ok) return;
      marcarReembolsado(g.id, ctx.user.email).catch((e) => { console.error(e); toast('No se pudo registrar el reembolso.'); });
      toast('Reembolso registrado');
    } else if (acc === 'deshacer') {
      const ok = await confirmar('Deshacer reembolso', `"${g.descripcion}" volverá a quedar como pendiente de reembolso para ${nombreSocio(g.socio)}.`, 'Deshacer reembolso');
      if (!ok) return;
      deshacerReembolso(g.id).catch((e) => { console.error(e); toast('No se pudo deshacer el reembolso.'); });
      toast('Reembolso deshecho');
    }
  };
}
