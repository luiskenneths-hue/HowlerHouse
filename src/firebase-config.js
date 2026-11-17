// Configuración del proyecto de Firebase "howler-house".
// Se copia de: Firebase > Configuración del proyecto > Tus apps > Web.
// (Estas claves no son secretas: la seguridad la dan las reglas de Firestore y el inicio de sesión.)
export const firebaseConfig = {
  apiKey: "AIzaSyA-_RA-EgPmmDmyg60cnxJy7w9QcrZZ2FE",
  authDomain: "howlerhouse-fe1fd.firebaseapp.com",
  projectId: "howlerhouse-fe1fd",
  storageBucket: "howlerhouse-fe1fd.firebasestorage.app",
  messagingSenderId: "847309376813",
  appId: "1:847309376813:web:589a2b4c8e51442e6a17a4"
};

// Los dos socios. Los correos deben coincidir con los de firestore.rules
// y con los usuarios creados en Firebase > Authentication.
export const SOCIOS = [
  { email: 'luisk_s@hotmail.com', nombre: 'Luis' },
  { email: 'donald_ruizc@hotmail.com', nombre: 'Donald' }
];
