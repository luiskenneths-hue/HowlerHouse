import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

export let auth = null;
export let db = null;

export const firebaseListo = () => !String(firebaseConfig.apiKey).startsWith('PEGA');

export function iniciarFirebase() {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Caché local: la app sigue funcionando sin internet y sincroniza al volver la conexión.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }) });
}
