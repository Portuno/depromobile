/**
 * Quién te llama y quién te escribe (Mobile 2.4).
 * - Llamadas: del registro de llamadas (permiso «Registro de llamadas»): quién, cuándo, cuánto y de qué tipo. Desde la
 *   última marca (la primera vez, la última semana).
 * - Quién te escribe: el servicio de avisos (el de los pagos, con «Acceso a notificaciones») anota el remitente, la app
 *   y si era un grupo de WhatsApp, Telegram, Instagram, Signal, Messenger y los SMS. Nunca el texto.
 * Las dos salen con la sincronización y la tarea de fondo, y cada una respeta su interruptor en Permisos.
 */
import { PermissionsAndroid, Platform } from 'react-native'
import { fijarMensajes, recibidosPendientes, soltarRecibidos } from '../modules/avisos-pago'
import { leerLlamadas, tienePermisoLlamadas } from '../modules/registro-llamadas'
import { fijarAjuste, leerAjuste } from './almacen'
import { mandarLlamadas, mandarRecibidos, type Credenciales } from './api'
import { ajustesCaptura } from './captura'
import { capta } from './logica/captura'
import { alSincronizar } from './sincronizar'

const MARCA = 'llamadas_marca'

/** Pide el permiso del registro de llamadas (solo con la app abierta). */
export async function pedirPermisoLlamadas(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  try { return (await PermissionsAndroid.request('android.permission.READ_CALL_LOG' as never)) === PermissionsAndroid.RESULTS.GRANTED } catch { return false }
}

export async function subirLlamadas(c: Credenciales) {
  if (!capta(await ajustesCaptura(), 'llamadas') || !tienePermisoLlamadas()) return
  const marca = Number(await leerAjuste(MARCA)) || Date.now() - 7 * 86_400_000
  const xs = await leerLlamadas(marca)
  if (!xs.length) return
  await mandarLlamadas(c, xs)
  await fijarAjuste(MARCA, String(Math.max(...xs.map((x) => x.en))))
}

export async function subirRecibidos(c: Credenciales) {
  const si = capta(await ajustesCaptura(), 'mensajes')
  fijarMensajes(si)
  const xs = recibidosPendientes()
  if (!xs.length) return
  if (si) await mandarRecibidos(c, xs)
  soltarRecibidos(Math.max(...xs.map((x) => x.en)))
}

let registrado = false
export function registrarComunicaciones() {
  if (registrado) return
  registrado = true
  alSincronizar(async (c) => { await subirLlamadas(c).catch(() => {}); await subirRecibidos(c).catch(() => {}) })
  void ajustesCaptura().then((a) => fijarMensajes(capta(a, 'mensajes'))).catch(() => {})
}
