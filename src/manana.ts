/**
 * Ánimo y sueños (Mobile 2.1).
 * - Ánimo: tres avisos por día (11, 16 y 21 h) con tres botones (Bajo, Normal, Arriba): un toque y queda anotado en
 *   Salud. Tocando el aviso (no un botón) se abre el módulo Ánimo, con ánimo y energía de 1 a 5.
 * - «¿Soñaste algo?»: la tarea de fondo mira las sesiones de pantalla y, cuando ve que te acabás de despertar
 *   (logica/capturas.ts), avisa una vez por mañana; el aviso abre el módulo Sueño.
 * Lo que se anota sin red espera en la cola de eventos y sale con la sincronización.
 */
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Uso from '../modules/uso-telefono'
import { encolarEvento, eventosEnCola, fijarAjuste, leerAjuste, sacarEvento } from './almacen'
import { ErrorApi, mandarEvento, type Credenciales } from './api'
import { puedeAvisar } from './avisos'
import { alSincronizar, sincronizar } from './sincronizar'
import { BOTONES_ANIMO, HORAS_ANIMO, animoDeBoton, despertar } from './logica/capturas'
import { estadoDeBoton } from './logica/run'
import { marcarBanda } from './run'
import type { Modulo } from './modulos'

const CANAL = 'deprocast'
const CATEGORIA = 'animo'
const dos = (n: number) => String(n).padStart(2, '0')
const hoy = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}` }
export const hm = (t: number) => new Date(t).toTimeString().slice(0, 5)

// ─── la cola de eventos ─────────────────────────────────────────────────
export async function vaciarEventos(c: Credenciales) {
  for (const e of await eventosEnCola()) {
    try { await mandarEvento(c, e.ruta, JSON.parse(e.cuerpo)); await sacarEvento(e.id) } catch (err) {
      const status = err instanceof ErrorApi ? err.status : null
      if (status == null) return // sin red: la próxima
      if (status >= 400 && status < 500) await sacarEvento(e.id) // roto: no se reintenta
    }
  }
}

/** Anota el ánimo (y la energía): a la cola y, si hay red, enseguida. */
export async function anotarAnimo(c: Credenciales | null, animo: number, energia: number | null = null) {
  await encolarEvento('animo', { animo, energia, en: Date.now() })
  if (c) void sincronizar(c)
}

/** Anota lo que soñaste (despertar: 'HH:MM' si se sabe). */
export async function anotarSueno(c: Credenciales | null, texto: string, despertarHm: string | null) {
  await encolarEvento('sueno', { texto, despertar: despertarHm })
  await fijarAjuste('sueno_resuelto', hoy())
  if (c) void sincronizar(c)
}
/** «No me acuerdo» (o ya lo anotaste): hoy no se pregunta más. */
export const soltarSueno = () => fijarAjuste('sueno_resuelto', hoy())
/** ¿Se muestra la tarjeta de «¿soñaste algo?» en Hoy? De 4 a 13 h, si hoy no se resolvió. */
export async function suenoPendiente(): Promise<boolean> {
  const h = new Date().getHours()
  return h >= 4 && h < 13 && (await leerAjuste('sueno_resuelto')) !== hoy()
}

// ─── los avisos ─────────────────────────────────────────────────────────
/** Programa los avisos de ánimo de todos los días (una vez: si ya están, no los toca). */
export async function programarAnimo() {
  if (!(await puedeAvisar())) return
  await Notifications.setNotificationCategoryAsync(CATEGORIA, BOTONES_ANIMO.map((b) => ({ identifier: b.id, buttonTitle: b.titulo, options: { opensAppToForeground: true } }))).catch(() => {})
  const ya = new Set((await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier))
  for (const h of HORAS_ANIMO) {
    const id = `animo-${h}`
    if (ya.has(id)) continue
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: '¿Cómo venís?', body: 'Un toque y queda anotado.', categoryIdentifier: CATEGORIA, data: { ir: 'animo' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: 0, ...(Platform.OS === 'android' ? { channelId: CANAL } : {}) },
    }).catch(() => {})
  }
}

/** En la tarea de fondo: si te acabás de despertar, «¿soñaste algo?» (una vez por mañana). Necesita «Acceso a uso». */
export async function revisarDespertar(ahora = Date.now()) {
  if (!Uso.tienePermiso() || !(await puedeAvisar())) return
  const preguntado = await leerAjuste('sueno_preguntado')
  if (preguntado === hoy(ahora) || (await leerAjuste('sueno_resuelto')) === hoy(ahora)) return
  const crudo = await Uso.leer(ahora - 18 * 3_600_000, ahora)
  const t = despertar(crudo?.sesiones ?? [], ahora, preguntado)
  if (t == null) return
  await fijarAjuste('sueno_preguntado', hoy(ahora))
  await fijarAjuste('sueno_despertar', hm(t))
  await Notifications.scheduleNotificationAsync({
    content: { title: '¿Soñaste algo?', body: 'Anotalo antes de que se vaya.', data: { ir: 'sueno' } },
    trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
  }).catch(() => {})
}
export const despertarDeHoy = async () => ((await leerAjuste('sueno_preguntado')) === hoy() ? leerAjuste('sueno_despertar') : null)

/**
 * Lo que hiciste con un aviso: un botón de ánimo lo anota; tocar el aviso abre su módulo. Devuelve el cartel a mostrar
 * (o null). Una respuesta se atiende una sola vez (al abrir la app puede volver la última).
 */
const atendidas = new Set<string>()
export async function atenderRespuesta(r: Notifications.NotificationResponse, c: Credenciales | null, irA: (m: Modulo) => void): Promise<string | null> {
  const clave = `${r.notification.request.identifier}:${r.notification.date}:${r.actionIdentifier}`
  if (atendidas.has(clave)) return null
  atendidas.add(clave)
  const animo = animoDeBoton(r.actionIdentifier)
  if (animo != null) {
    await anotarAnimo(c, animo)
    return `Anotado: ánimo ${animo}/5`
  }
  // Mobile 2.5: el aviso de fin de banda marca la banda.
  const estado = estadoDeBoton(r.actionIdentifier)
  const banda = Number(r.notification.request.content.data?.banda)
  if (estado && banda) {
    await marcarBanda(c, banda, estado)
    return `Banda marcada: ${estado === 'hecha' ? 'hecha' : estado === 'parcial' ? 'a medias' : 'no'}`
  }
  const ir = r.notification.request.content.data?.ir
  if (ir === 'animo' || ir === 'sueno' || ir === 'hoy' || ir === 'validar' || ir === 'run' || ir === 'compras') irA(ir)
  return null
}

let registrado = false
/** Al abrir: la cola de eventos sale con cada sincronización y se programan los avisos de ánimo. */
export function registrarManana() {
  if (registrado) return
  registrado = true
  alSincronizar(vaciarEventos)
  void programarAnimo().catch(() => {})
}
