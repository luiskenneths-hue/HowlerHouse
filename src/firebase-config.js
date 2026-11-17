// Configuración del proyecto de Firebase "howler-house".
// Se copia de: Firebase > Configuración del proyecto > Tus apps > Web.
// (Estas claves no son secretas: la seguridad la dan las reglas de Firestore y el inicio de sesión.)
export const firebaseConfig = {
  apiKey: 'PEGA_AQUI_TU_API_KEY',
  authDomain: 'PEGA_AQUI.firebaseapp.com',
  projectId: 'PEGA_AQUI',
  storageBucket: 'PEGA_AQUI.firebasestorage.app',
  messagingSenderId: 'PEGA_AQUI',
  appId: 'PEGA_AQUI'
};

// Los dos socios. Los correos deben coincidir con los de firestore.rules
// y con los usuarios creados en Firebase > Authentication.
export const SOCIOS = [
  { email: 'correo.de.luis@gmail.com', nombre: 'Luis' },
  { email: 'correo.de.donald@gmail.com', nombre: 'Donald' }
];
