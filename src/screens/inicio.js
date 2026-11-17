import { money, esc, encabezado } from '../ui.js';
import monoUrl from '../mono-oro.png';

export const id = 'inicio';

export function vista(ctx) {
  const inicial = esc(ctx.socio.nombre.slice(0, 1).toUpperCase());
  return `
    <header class="brand-head">
      <img src="${monoUrl}" alt="Howler House" class="mono">
      <div class="brand-text">
        <span class="brand-name">HOWLER HOUSE</span>
        <span class="brand-sub">Marbella, Guanacaste</span>
      </div>
      <button id="btn-perfil" class="avatar" aria-label="Perfil">${inicial}</button>
    </header>
    <div class="rule"></div>

    <section class="card hero">
      <div class="hero-top"><span class="eyebrow">FONDO DE LA CASA</span></div>
      <div class="hero-amount">${money(0)}</div>
      <div class="muted">Saldo disponible para mantenimientos</div>
      <div class="stats">
        <div class="stat"><span class="muted">Cobrado en reservas</span><strong>${money(0)}</strong></div>
        <div class="stat"><span class="muted">Gastado y reembolsado</span><strong>${money(0)}</strong></div>
      </div>
    </section>

    <section class="card soon">
      <h2>Hola, ${esc(ctx.socio.nombre)}</h2>
      <p>La base de la app está lista: sesión, navegación y conexión con Firebase. Los datos reales aparecerán cuando se construyan los gastos y las reservas.</p>
      <span class="tag">Paso 1 completo</span>
    </section>`;
}

export function montar(ctx) {
  document.querySelector('#btn-perfil')?.addEventListener('click', ctx.abrirPerfil);
}
