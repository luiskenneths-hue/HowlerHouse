# Howler House

App de administración de la casa de playa (reservas, pagos, gastos y reembolsos) para Luis y Donald.
Funciona igual que la del taller: web empaquetada con Capacitor, Firebase gratis y APK compilado en GitHub.

## 1. Firebase (una sola vez)
1. console.firebase.google.com > **Agregar proyecto** > nombre `howler-house` (Google Analytics se puede desactivar).
2. **Authentication** > Comenzar > **Correo electrónico/contraseña** > Habilitar.
   En la pestaña **Users** > *Add user*: crea un usuario para Luis y otro para Donald, con sus correos y una contraseña cada uno.
3. **Firestore Database** > Crear base de datos > modo **producción** (elige la región más cercana).
4. Engranaje de **Configuración del proyecto** > *Tus apps* > ícono **Web (</>)** > registra la app (sin Hosting) y copia el bloque `firebaseConfig`.
5. Firestore > pestaña **Reglas**: pega el contenido de `firestore.rules`, cambia los dos correos por los reales y pulsa **Publicar**.

## 2. Configurar la app
Abre `src/firebase-config.js`:
- Pega el bloque `firebaseConfig`.
- En `SOCIOS` escribe los correos de Luis y Donald (los mismos de las reglas y de Authentication).

## 3. GitHub
1. Crea un repositorio **privado** nuevo (por ejemplo `HowlerHouse`).
2. Sube TODO el contenido de esta carpeta, incluida la carpeta oculta `.github`. No subas `node_modules` ni `android`.
3. En la pestaña **Actions** se compila el APK (tarda unos minutos). Al terminar, descárgalo desde **Releases**
   (o desde el *artifact* de la ejecución). En un repositorio privado hay que iniciar sesión en GitHub para descargarlo.
4. Instala el APK en los dos teléfonos (hay que permitir "instalar apps desconocidas").

## Notas
- Si Android no deja instalar una versión nueva encima de la anterior, desinstala la app y vuelve a instalarla.
  Los datos no se pierden: están en Firebase.
- Los dos teléfonos ven los mismos datos. Sin internet la app sigue funcionando y sincroniza al volver la conexión.

## Estructura
```
.github/workflows/build.yml   compila el APK en GitHub
scripts/customize-android.mjs vertical, permiso de avisos, ícono y pantalla de arranque
brand/                        ícono y splash (logo dorado)
firestore.rules               reglas: solo entran los dos socios
www/index.html                página base
src/
  app.js                      arranque, inicio de sesión y navegación
  firebase.js · firebase-config.js
  ui.js · styles.css          utilidades y tema negro y dorado
  screens/                    inicio · calendario · reservas · gastos · reembolsos
```

## Pasos siguientes
2. Gastos, tipos de gasto y reembolsos · 3. Inicio con fondo y gráfico mensual · 4. Calendario y reservas · 5. Extras (WhatsApp, avisos, reportes).
