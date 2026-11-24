/**
 * Lo que suena (Mobile 2.3): el servicio de avisos (el mismo de los pagos, con «Acceso a notificaciones») anota el tema y
 * el artista cada vez que una app de música cambia de tema. Acá sale hacia Deprocast con la sincronización y la tarea de
 * fondo; allá quedan como escuchas (con la hora y, cruzando, dónde estabas) y entran al Diario del día.
 */
import { sonandoPendientes, soltarSonando } from '../modules/avisos-pago'
import { mandarEscuchas, type Credenciales } from './api'
import { alSincronizar } from './sincronizar'

export async function subirSonando(c: Credenciales) {
  const xs = sonandoPendientes()
  if (!xs.length) return
  await mandarEscuchas(c, xs.map((x) => ({ en: x.en, tema: x.tema, artista: x.artista, app: x.app })))
  soltarSonando(Math.max(...xs.map((x) => x.en)))
}

let registrado = false
export function registrarSonando() {
  if (registrado) return
  registrado = true
  alSincronizar(subirSonando)
}
