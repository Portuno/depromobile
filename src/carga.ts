/**
 * La carga (Mobile 2.1): cuándo estuvo enchufado el teléfono, para el sueño estimado. Una muestra en cada pasada de fondo
 * (~15 min) y en cada cambio mientras la app está viva; esperan en disco y salen con la sincronización. Solo eso: si está
 * cargando y el nivel. Respeta el interruptor general de la captura.
 */
import { anotarCarga, cargaEnCola, sacarCarga } from './almacen'
import { subirCarga, type Credenciales } from './api'
import { ajustesCaptura } from './captura'
import { alSincronizar } from './sincronizar'

export async function tomarMuestraCarga() {
  if (!(await ajustesCaptura()).todo) return
  const B = await import('expo-battery')
  const e = await B.getBatteryStateAsync()
  const nivel = await B.getBatteryLevelAsync().catch(() => -1)
  await anotarCarga(Date.now(), e === B.BatteryState.CHARGING || e === B.BatteryState.FULL, nivel >= 0 ? Math.round(nivel * 100) / 100 : null)
}

export async function subirCargaPendiente(c: Credenciales) {
  const xs = await cargaEnCola()
  if (!xs.length) return
  await subirCarga(c, xs.map((x) => ({ en: x.en, cargando: !!x.cargando, nivel: x.nivel })))
  await sacarCarga(xs.at(-1)!.en)
}

let registrado = false
/** Al abrir: una muestra ahora, otra en cada cambio (enchufar, desenchufar) y la subida con cada sincronización. */
export async function registrarCarga() {
  if (registrado) return
  registrado = true
  alSincronizar(subirCargaPendiente)
  try {
    const B = await import('expo-battery')
    B.addBatteryStateListener(() => { void tomarMuestraCarga().catch(() => {}) })
  } catch { /* sin el módulo */ }
  await tomarMuestraCarga().catch(() => {})
}
