import './styles.css';
import '@fontsource/exo-2/latin-300.css';
import '@fontsource/exo-2/latin-ext-300.css';
import '@fontsource/exo-2/latin-600.css';
import '@fontsource/exo-2/latin-ext-600.css';
import '@fontsource/exo-2/latin-700.css';
import '@fontsource/exo-2/latin-ext-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-ext-600.css';

import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { App as CapApp } from '@capacitor/app';
import { auth, iniciarFirebase, firebaseListo } from './firebase.js';
import { socioPorEmail } from './socios.js';
import { iniciarStore, detenerStore, suscribir } from './data/store.js';
import { $, esc, toast, openSheet, closeSheet, sheetAbierta } from './ui.js';
import logoUrl from './logo-oro.png';
import * as inicio from './screens/inicio.js';
import * as calendario from './screens/calendario.js';
import * as reservas from './screens/reservas.js';
import * as gastos from './screens/gastos.js';
import * as reembolsos from './screens/reembolsos.js';
import * as gasto from './screens/gasto.js';
import * as tipos from './screens/tipos.js';

const APP_VERSION = '0.2.0';

const ICONOS = {
  inicio: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  reservas: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  gastos: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  reembolsos: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>'
};
const RUTAS = [
  { modulo: inicio, label: 'Inicio' },
  { modulo: calendario, label: 'Calendario' },
  { modulo: reservas, label: 'Reservas' },
  { modulo: gastos, label: 'Gastos' },
  { modulo: reembolsos, label: 'Reembolsos' }
];
// Pantallas internas (no están en el menú inferior).
const TODAS = [...RUTAS.map((r) => r.modulo), gasto, tipos];

const ERRORES = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'Revisa que el correo esté bien escrito.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Se necesita internet para iniciar sesión.'
};

const S = { user: null, socio: null, error: '' };
const app = $('#app');

const socioDe = socioPorEmail;

// Ruta actual: #/gastos  ·  #/gasto  ·  #/gasto/ID
function rutaActual() {
  const m = location.hash.match(/^#\/(\w+)(?:\/([\w-]+))?/);
  const modulo = TODAS.find((x) => x.id === (m && m[1])) || inicio;
  return { modulo, param: (m && m[2]) || null };
}
let rutaPrevia = null;

function volver() {
  const { modulo } = rutaActual();
  if (history.length > 1) history.back();
  else location.hash = `#/${modulo.padre || 'inicio'}`;
}

/* ---------- Pantallas de acceso ---------- */
function renderCargando() {
  app.innerHTML = `<div class="center"><img class="logo" src="${logoUrl}" alt="Howler House"></div>`;
}

function renderSetup() {
  app.innerHTML = `<div class="center"><div class="setup">
    <h1>Falta configurar Firebase</h1>
    <p>Abre <b>src/firebase-config.js</b>, pega las claves de tu proyecto de Firebase y escribe los correos de los dos socios. Después vuelve a compilar la app.</p>
  </div></div>`;
}

function renderLogin(error = '') {
  app.innerHTML = `<div class="center">
    <img class="logo" src="${logoUrl}" alt="Howler House, Marbella, Guanacaste">
    <form id="f-login" class="login-form" novalidate>
      <div class="field"><label for="email">CORREO</label>
        <input id="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" required></div>
      <div class="field"><label for="clave">CONTRASEÑA</label>
        <input id="clave" type="password" autocomplete="current-password" required></div>
      ${error ? `<div class="error" role="alert">${esc(error)}</div>` : ''}
      <button class="btn" type="submit">Entrar</button>
      <div class="login-note">Acceso solo para los dos socios</div>
    </form>
  </div>`;
  $('#f-login').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = $('#email').value.trim();
    const clave = $('#clave').value;
    if (!email || !clave) { renderLogin('Escribe tu correo y tu contraseña.'); $('#email').value = email; return; }
    const btn = $('#f-login .btn');
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      await signInWithEmailAndPassword(auth, email, clave);
      // El resto lo hace onAuthStateChanged.
    } catch (err) {
      S.error = ERRORES[err.code] || 'No se pudo iniciar sesión. Inténtalo de nuevo.';
      renderLogin(S.error);
      $('#email').value = email;
    }
  });
}

/* ---------- Estructura principal ---------- */
function ctx() {
  return { user: S.user, socio: S.socio, param: rutaActual().param, abrirPerfil, repintar: pintarRuta, volver };
}

function renderShell() {
  const tabs = RUTAS.map((r) => `
    <a class="tab" href="#/${r.modulo.id}" data-ruta="${r.modulo.id}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[r.modulo.id]}</svg>${r.label}
    </a>`).join('');
  app.innerHTML = `<main id="main"></main><nav class="bottom">${tabs}</nav>`;
  pintarRuta();
}

function pintarRuta(conservarScroll = false) {
  if (!S.user) return;
  const actual = rutaActual();
  // Al cambiar de pantalla, la anterior limpia su formulario.
  if (rutaPrevia && (rutaPrevia.modulo !== actual.modulo || rutaPrevia.param !== actual.param)) rutaPrevia.modulo.alSalir?.();
  rutaPrevia = actual;
  const main = $('#main');
  const y = main.scrollTop;
  main.innerHTML = actual.modulo.vista(ctx());
  main.scrollTop = conservarScroll === true ? y : 0;
  actual.modulo.montar?.(ctx());
  const tabActiva = actual.modulo.tab || actual.modulo.id;
  $('.bottom').hidden = !!actual.modulo.sinNav;
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.ruta === tabActiva;
    t.classList.toggle('on', on);
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
}

function abrirPerfil() {
  const p = openSheet('Mi cuenta', `
    <div class="field"><label>SOCIO</label><div>${esc(S.socio.nombre)}</div></div>
    <div class="field"><label>CORREO</label><div>${esc(S.user.email)}</div></div>
    <div class="muted">Howler House · versión ${APP_VERSION}</div>
    <button id="btn-salir" class="btn-ghost">Cerrar sesión</button>`);
  p.querySelector('#btn-salir').addEventListener('click', async () => {
    closeSheet();
    try { await signOut(auth); } catch (e) { toast('No se pudo cerrar la sesión.'); }
  });
}

function render() {
  if (!firebaseListo()) return renderSetup();
  if (!S.user) return renderLogin(S.error);
  renderShell();
}

/* ---------- Arranque ---------- */
window.addEventListener('hashchange', () => pintarRuta());

// Cuando llegan datos nuevos de Firestore, se repinta la pantalla que los muestra.
suscribir((tipo) => {
  if (!S.user) return;
  if (tipo === 'listo' || tipo === 'error' || rutaActual().modulo.reactivo) pintarRuta(true);
});

try {
  // Botón "atrás" de Android: cierra la hoja, vuelve a Inicio o sale de la app.
  CapApp.addListener('backButton', () => {
    if (sheetAbierta()) return closeSheet();
    if (!S.user) return CapApp.exitApp();
    const { modulo } = rutaActual();
    if (modulo.padre) { volver(); return; }
    if (modulo.id !== 'inicio') { location.hash = '#/inicio'; return; }
    CapApp.exitApp();
  });
} catch (e) { /* en el navegador no existe */ }

if (!firebaseListo()) {
  renderSetup();
} else {
  renderCargando();
  iniciarFirebase();
  onAuthStateChanged(auth, (u) => {
    if (u) {
      const socio = socioDe(u.email);
      if (!socio) {
        S.error = 'Esta cuenta no tiene acceso a Howler House.';
        detenerStore();
        S.user = null; S.socio = null;
        signOut(auth);
        return;
      }
      if (!S.user || S.user.uid !== u.uid) iniciarStore();
      S.user = u; S.socio = socio; S.error = '';
    } else {
      detenerStore();
      rutaPrevia = null;
      S.user = null; S.socio = null;
    }
    render();
  });
}
