/**
 * Lo que pide un lugar (Mobile 2.5). El servidor dice qué vigilar (side quests con lugar y tus tiendas cuando hay algo
 * para comprar); el teléfono lo registra como geovallas (Android las vigila aunque la app esté cerrada, sin gastar GPS
 * de más) y al entrar en una avisa: «🛒 Estás en Mercadona: 5 en la lista» o «📍 Cerca de la plaza: …». Una vez cada
 * 3 horas por lugar. Necesita la ubicación «todo el tiempo» (la misma del recorrido) y respeta el interruptor de
 * Ubicación. La tarea tiene que estar definida apenas arranca la app: este archivo se importa desde index.ts.
 */
import { Platform } from 'react-native'
import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import { fijarAjuste, leerAjuste } from './almacen'
import { traerCerca, type Credenciales, type Region } from './api'
import { ajustesCaptura } from './captura'
import { capta } from './logica/captura'

export const TAREA_GEOVALLAS = 'deprocast-geovallas'
const CACHE = 'geovallas'
const REPETIR_MS = 3 * 3_600_000

TaskManager.defineTask(TAREA_GEOVALLAS, async ({ data, error }) => {
  if (error || !data) return
  const d = data as { eventType?: number; region?: { identifier?: string } }
  const L = await import('expo-location')
  if (d.eventType !== L.GeofencingEventType.Enter || !d.region?.identifier) return
  let regiones: Region[] = []
  try { regiones = JSON.parse((await leerAjuste(CACHE)) ?? '[]') } catch { regiones = [] }
  const r = regiones.find((x) => x.id === d.region!.identifier)
  if (!r) return
  const clave = `geovalla_${r.id}`
  if (Date.now() - (Number(await leerAjuste(clave)) || 0) < REPETIR_MS) return
  await fijarAjuste(clave, String(Date.now()))
  await Notifications.scheduleNotificationAsync({
    content: { title: r.titulo, body: r.cuerpo, data: { ir: r.tipo === 'compras' ? 'compras' : 'hoy' } },
    trigger: Platform.OS === 'android' ? { channelId: 'deprocast' } : null,
  }).catch(() => {})
})

let ultima = 0
/** Pide al servidor qué vigilar y lo registra (si cambió). Cada 30 minutos como mucho, salvo forzar. */
export async function refrescarGeovallas(c: Credenciales, o: { forzar?: boolean } = {}) {
  if (!o.forzar && Date.now() - ultima < 30 * 60_000) return
  ultima = Date.now()
  const L = await import('expo-location')
  const apagar = async () => { if (await L.hasStartedGeofencingAsync(TAREA_GEOVALLAS).catch(() => false)) await L.stopGeofencingAsync(TAREA_GEOVALLAS).catch(() => {}) }
  if (!capta(await ajustesCaptura(), 'ubicacion') || !(await L.getBackgroundPermissionsAsync()).granted) return apagar()
  const { regiones } = await traerCerca(c)
  const clave = JSON.stringify(regiones.map((r) => [r.id, r.lat, r.lon, r.radio]))
  await fijarAjuste(CACHE, JSON.stringify(regiones))
  if (!regiones.length) return apagar()
  if ((await leerAjuste('geovallas_clave')) === clave && (await L.hasStartedGeofencingAsync(TAREA_GEOVALLAS).catch(() => false))) return
  await L.startGeofencingAsync(TAREA_GEOVALLAS, regiones.map((r) => ({ identifier: r.id, latitude: r.lat, longitude: r.lon, radius: r.radio, notifyOnEnter: true, notifyOnExit: false })))
  await fijarAjuste('geovallas_clave', clave)
}

export async function cuantasGeovallas(): Promise<number> {
  try { return (JSON.parse((await leerAjuste(CACHE)) ?? '[]') as Region[]).length } catch { return 0 }
}
