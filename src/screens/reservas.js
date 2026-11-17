import { esc, money, encabezado, ICONO_MAS, cargando } from '../ui.js';
import { datos, listo } from '../data/store.js';
import { ESTADOS, saldoDe } from '../domain/reservas.js';
import { aInputFecha, rangoCorto, MESES_CORTOS } from '../domain/fechas.js';

export const id = 'reservas';
export const reactivo = true;

const L = { tab: 'prox' };

export function vista() {
  const { reservas, pagos, error } = datos();
  const cab = encabezado('RESERVAS', `<a class="add-btn" href="#/rform" aria-label="Nueva reserva">${ICONO_MAS}</a>`);
  if (error) return `${cab}<section class="card"><p class="error" role="alert">${esc(error)}</p></section>`;
  if (!listo()) return cab + cargando('Cargando reservas…');
  if (!reservas.length) {
    return `${cab}<section class="card soon"><h2>Aún no hay reservas</h2>
      <p>Registra la primera y aparecerá aquí y en el calendario, con sus pagos y su saldo pendiente.</p>
      <a class="btn btn-link" href="#/rform">Crear la primera reserva</a></section>`;
  }

  const hoy = aInputFecha(new Date());
  const vivas = reservas.filter((r) => r.estado !== 'CANCELADA');
  const grupos = {
    prox: vivas.filter((r) => r.salida >= hoy).sort((a, b) => a.entrada.localeCompare(b.entrada)),
    pasadas: vivas.filter((r) => r.salida < hoy).sort((a, b) => b.entrada.localeCompare(a.entrada)),
    canc: reservas.filter((r) => r.estado === 'CANCELADA').sort((a, b) => b.entrada.localeCompare(a.entrada))
  };
  const lista = grupos[L.tab];
  const vacio = { prox: 'No hay reservas próximas.', pasadas: 'Todavía no hay reservas anteriores.', canc: 'No hay reservas canceladas.' }[L.tab];

  const fila = (r) => {
    const saldo = r.estado === 'CANCELADA' ? 0 : saldoDe(r, pagos);
    const st = ESTADOS[r.estado] || ESTADOS.CONSULTA;
    return `<a class="r-row" href="#/reserva/${esc(r.id)}">
      <div class="dia-badge"><b>${Number(r.entrada.slice(8, 10))}</b><span>${MESES_CORTOS[Number(r.entrada.slice(5, 7)) - 1].toLowerCase()}</span></div>
      <div class="info"><span class="nombre">${esc(r.huesped)}</span>
        <span class="muted">${esc(rangoCorto(r.entrada, r.salida))} · ${r.personas} ${r.personas === 1 ? 'persona' : 'personas'}</span></div>
      <div class="lado"><span class="estado-chip ${st.cls}">${esc(st.label)}</span>${saldo > 0 ? `<span class="saldo">Saldo ${money(saldo)}</span>` : ''}</div></a>`;
  };

  const tab = (clave, texto) => `<button class="${L.tab === clave ? 'on' : ''}" data-acc="tab" data-v="${clave}">${texto} (${grupos[clave].length})</button>`;
  return `${cab}
    <div class="seg" role="group" aria-label="Reservas">${tab('prox', 'Próximas')}${tab('pasadas', 'Anteriores')}${tab('canc', 'Canceladas')}</div>
    <div class="lista">${lista.length ? lista.map(fila).join('') : `<div class="vacio">${vacio}</div>`}</div>`;
}

export function montar(ctx) {
  document.querySelector('#main').onclick = (ev) => {
    const b = ev.target.closest('[data-acc="tab"]');
    if (!b) return;
    L.tab = b.dataset.v;
    ctx.repintar(true);
  };
}
