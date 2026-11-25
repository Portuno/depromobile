/**
 * La run en el bolsillo (Mobile 2.5). Se trae la run de hoy al abrir, en cada sincronización (como mucho cada 2 minutos)
 * y en la tarea de fondo; queda guardada (la pantalla abre al instante y sin red) y se programan sus avisos: al empezar
 * cada banda, y al terminar, con Hecha / A medias / No. Marcar desde el aviso o la pantalla va a la cola de eventos.
 */
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { encolarEvento, fijarAjuste, leerAjuste } from './almacen'
import { traerRun, type Credenciales, type RunTelefono } from './api'
import { puedeAvisar } from './avisos'
import { alSincronizar, sincronizar } from './sincronizar'
import { avisosDeBandas, BOTONES_BANDA } from './logica/run'

const CANAL = 'deprocast'
const CACHE = 'run_cache'
const escuchas = new Set<(r: RunTelefono) => void>()
export function alCambiarRun(f: (r: RunTelefono) => void): () => void { escuchas.add(f); return () => { escuchas.delete(f) } }

export async function runGuardada(): Promise<RunTelefono | null> {
  try { return JSON.parse((await leerAjuste(CACHE)) ?? 'null') } catch { return null }
}

async function guardar(r: RunTelefono) {
  await fijarAjuste(CACHE, JSON.stringify(r))
  for (const f of escuchas) { try { f(r) } catch { /* una pantalla rota no frena */ } }
}

/** Programa los avisos de las bandas (y cancela los de bandas que ya no están o se marcaron). */
export async function programarBandas(r: RunTelefono, ahora = Date.now()) {
  if (!(await puedeAvisar())) return
  await Notifications.setNotificationCategoryAsync('banda', BOTONES_BANDA.map((b) => ({ identifier: b.id, buttonTitle: b.titulo, options: { opensAppToForeground: true } }))).catch(() => {})
  const plan = r.run ? avisosDeBandas(r.run.fecha, r.run.estado, r.bandas, ahora) : []
  const quiero = new Set(plan.map((a) => a.clave))
  const programados = await Notifications.getAllScheduledNotificationsAsync()
  for (const n of programados) if (n.identifier.startsWith('banda-') && !quiero.has(n.identifier)) await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})
  const ya = new Set(programados.map((n) => n.identifier))
  for (const a of plan) {
    if (ya.has(a.clave)) continue
    await Notifications.scheduleNotificationAsync({
      identifier: a.clave,
      content: { title: a.titulo, body: a.cuerpo, data: { ir: 'run', banda: a.banda }, ...(a.fin ? { categoryIdentifier: 'banda' } : {}) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.en, ...(Platform.OS === 'android' ? { channelId: CANAL } : {}) },
    }).catch(() => {})
  }
}

let ultima = 0
/** Trae la run (si pasaron 2 minutos o se fuerza), la guarda y programa sus avisos. */
export async function refrescarRun(c: Credenciales, o: { forzar?: boolean } = {}): Promise<RunTelefono | null> {
  if (!o.forzar && Date.now() - ultima < 2 * 60_000) return runGuardada()
  ultima = Date.now()
  const r = await traerRun(c)
  await guardar(r)
  await programarBandas(r).catch(() => {})
  return r
}

/** Marca una banda: en la run guardada al instante, y a la cola (sale con la sincronización). */
export async function marcarBanda(c: Credenciales | null, id: number, estado: string, nota: string | null = null) {
  const r = await runGuardada()
  if (r) { r.bandas = r.bandas.map((b) => (b.id === id ? { ...b, estado } : b)); r.hechas = r.bandas.filter((b) => b.estado === 'hecha').length; await guardar(r) }
  await encolarEvento('run/banda', { id, estado, nota })
  await Notifications.cancelScheduledNotificationAsync(`banda-fin-${id}`).catch(() => {})
  if (c) void sincronizar(c)
}

let registrado = false
export function registrarRun(c: Credenciales) {
  if (registrado) return
  registrado = true
  alSincronizar(async (x) => { await refrescarRun(x).catch(() => null) })
  void refrescarRun(c, { forzar: true }).catch(() => null)
}
