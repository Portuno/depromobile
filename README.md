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

## Lo compartido con el servidor

- `src/conciencia/` (acústica, rasgos, movimiento) es una **copia exacta** de `src/conciencia/` del servidor. Si cambia
  allá: `npm run traer-conciencia` (busca el repo del servidor en `../depromastro` o `../deprocast`, o pasale la ruta).
  `test/conciencia.test.ts` avisa si se desfasaron.
- Los tipos de la API están en `src/api.ts`. Las pruebas de las rutas del dispositivo quedan en el servidor
  (`test/movil-servidor.test.ts`).
