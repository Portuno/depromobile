# Deprocast móvil

La app de Deprocast para el teléfono (Expo / React Native, Android). Habla con tu Deprocast por la API del dispositivo
(`/api/dispositivo/*`, con el token `dpd_…` que da la vinculación); el servidor vive en el repo `Portuno/deprocast`.

Mobile 2.0: abajo Hoy (el chat), Mapa, Escucha y Menú; en el Menú, todos los módulos (Validar, Actividad, Audios,
Permisos). Local-first: todo se guarda primero en el teléfono y sale con la sincronización.

## Comandos

```bash
npm install
npm test                         # la lógica pura y las reglas de la interfaz (node --test, sin emulador)
npx tsc --noEmit                 # tipos
npx expo start                   # desarrollo (con el dev client)
npx eas-cli@latest update --channel production --environment production --platform android --message "…"   # OTA
npx eas-cli@latest build --platform android --profile production                                          # APK nuevo
```

Una actualización OTA llega a los APK con el mismo `version` de `app.json` (el runtime es la versión de la app). Si
agregás una librería nativa o cambiás permisos, hace falta un APK nuevo (y subir `versionCode`).

## APK sin gastar builds de Expo

En una compu con Linux o macOS, Java 17 y el Android SDK: `./scripts/apk-local.sh` arma el APK de producción en `dist/`
(corre las pruebas y el typecheck antes). Es el mismo build que en la nube, sin el límite mensual del plan.

## Lo compartido con el servidor

- `src/contrato.ts` es la **copia exacta** del contrato de la API del dispositivo (`src/contrato-dispositivo.ts` del
  servidor; para otros lenguajes, `docs/api-dispositivo.json` allá). `npm run traer-contrato` la actualiza y
  `test/contrato.test.ts` falla si la app pide una ruta que el contrato no tiene.

- `src/conciencia/` (acústica, rasgos, movimiento) es una **copia exacta** de `src/conciencia/` del servidor. Si cambia
  allá: `npm run traer-conciencia` (busca el repo del servidor en `../depromastro` o `../deprocast`, o pasale la ruta).
  `test/conciencia.test.ts` avisa si se desfasaron.
- Los tipos de la API están en `src/api.ts`. Las pruebas de las rutas del dispositivo quedan en el servidor
  (`test/movil-servidor.test.ts`).
