// Utilidades de interfaz compartidas por todas las pantallas.
export const $ = (s) => document.querySelector(s);
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => '₡ ' + String(Math.round(Math.abs(Number(n)) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const miles = (digitos) => String(digitos ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const ICONO_MAS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
export const ICONO_ATRAS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2800);
}

let alCerrarHoja = null;
export function openSheet(titulo, html, alCerrar = null) {
  alCerrarHoja = alCerrar;
  $('#sheet').innerHTML =
    `<div class="overlay" data-cerrar></div>
     <div class="panel" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
       <div class="panel-head"><h2>${esc(titulo)}</h2><button class="icon-btn" data-cerrar aria-label="Cerrar">✕</button></div>
       ${html}
     </div>`;
  $('#sheet').querySelectorAll('[data-cerrar]').forEach((el) => el.addEventListener('click', closeSheet));
  return $('#sheet .panel');
}
export function closeSheet() {
  const cb = alCerrarHoja;
  alCerrarHoja = null;
  $('#sheet').innerHTML = '';
  if (cb) cb();
}
export const sheetAbierta = () => !!$('#sheet').firstChild;

/** Pregunta de confirmación. Devuelve una promesa: true si confirma, false si cancela o cierra. */
export function confirmar(titulo, texto, boton = 'Confirmar') {
  return new Promise((resolve) => {
    const p = openSheet(titulo,
      `<p class="sheet-text">${esc(texto)}</p>
       <button class="btn" data-ok>${esc(boton)}</button>
       <button class="btn-ghost" data-no>Cancelar</button>`,
      () => resolve(false));
    p.querySelector('[data-ok]').addEventListener('click', () => { resolve(true); closeSheet(); });
    p.querySelector('[data-no]').addEventListener('click', closeSheet);
  });
}

// Encabezado estándar de pantalla (título con letras separadas, igual que el diseño).
export function encabezado(titulo, accion = '') {
  return `<header class="screen-head"><h1>${esc(titulo)}</h1>${accion}</header><div class="rule"></div>`;
}

// Tarjeta temporal para las pantallas que se construyen en pasos posteriores.
export function proximamente(titulo, texto, paso) {
  return `<section class="card soon"><h2>${esc(titulo)}</h2><p>${esc(texto)}</p><span class="tag">Se construye en el ${esc(paso)}</span></section>`;
}

export const cargando = (texto = 'Cargando…') => `<section class="card soon"><p>${esc(texto)}</p></section>`;
