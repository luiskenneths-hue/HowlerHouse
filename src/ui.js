// Utilidades de interfaz compartidas por todas las pantallas.
export const $ = (s) => document.querySelector(s);
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => '₡ ' + String(Math.round(Math.abs(Number(n)) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}

export function openSheet(titulo, html) {
  $('#sheet').innerHTML =
    `<div class="overlay" data-cerrar></div>
     <div class="panel" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
       <div class="panel-head"><h2>${esc(titulo)}</h2><button class="icon-btn" data-cerrar aria-label="Cerrar">✕</button></div>
       ${html}
     </div>`;
  $('#sheet').querySelectorAll('[data-cerrar]').forEach((el) => el.addEventListener('click', closeSheet));
  return $('#sheet .panel');
}
export function closeSheet() { $('#sheet').innerHTML = ''; }
export const sheetAbierta = () => !!$('#sheet').firstChild;

// Encabezado estándar de pantalla (título con letras separadas, igual que el diseño).
export function encabezado(titulo, accion = '') {
  return `<header class="screen-head"><h1>${esc(titulo)}</h1>${accion}</header><div class="rule"></div>`;
}

// Tarjeta temporal para las pantallas que se construyen en pasos posteriores.
export function proximamente(titulo, texto, paso) {
  return `<section class="card soon"><h2>${esc(titulo)}</h2><p>${esc(texto)}</p><span class="tag">Se construye en el ${esc(paso)}</span></section>`;
}
