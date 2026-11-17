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
  app.js                      arranque, inicio de sesión, rutas y navegación
  firebase.js · firebase-config.js
  socios.js                   Luis y Donald con su identificador
  ui.js · styles.css          utilidades y tema negro y dorado
  data/                       store (lectura en vivo) y escritura: gastos, tipos, reservas, fondo
  domain/                     cálculos puros: fechas, gastos y alertas, reservas, fondo, mensajes
  screens/                    inicio · calendario · reservas · reserva · rform
                              gastos · gasto · tipos · reembolsos
tests/                        pruebas de la lógica
```

## Pruebas de la lógica
`node --experimental-default-type=module --test tests/*.test.mjs`

## Datos en Firestore
- `tiposGasto`: nombre, oculto, fijo, orden. Se crean solos la primera vez.
- `gastos`: monto, descripcion, tipoId, fecha, mes ("2026-11"), fuente (FONDO | SOCIO), socio, reembolsable,
  estadoReembolso (NO_APLICA | PENDIENTE | REEMBOLSADO), fechaReembolso, creadoPor.
- `reservas`: huesped, telefono, personas, entrada y salida ("2026-11-21"), noches, tarifaNoche, total,
  estado (CONSULTA | CON_ADELANTO | CONFIRMADA | CHECK_IN | FINALIZADA | CANCELADA), notas.
- `pagos`: reservaId, monto, fecha, mes, metodo (EFECTIVO | SINPE | TRANSFERENCIA),
  tipo (COMPLETO | ADELANTO | ABONO | SALDO), nota.
- `noches`: una por cada noche ocupada (id = la fecha). Es lo que evita reservar dos veces la misma fecha:
  al crear o mover una reserva, una transacción comprueba que ninguna de esas noches exista.
  Las noches de un bloqueo llevan tipo "BLOQUEO", bloqueoId y motivo.
- `config/fondo`: saldoInicial.

## Cómo se calcula el fondo
`saldo = saldo inicial + cobrado en reservas − gastos pagados con el fondo − reembolsos entregados`.
Los gastos pendientes de reembolso y los aportes definitivos de un socio no tocan el fondo.

## Pasos siguientes
5. Extras: tarifas por temporada, avisos de check-in y saldos, reportes en PDF o Excel.
