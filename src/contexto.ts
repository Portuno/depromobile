/**
 * El contexto (Mobile 2.3): a qué wifi y a qué audio Bluetooth está conectado el teléfono. Se mira al abrir, en la tarea
 * de fondo y en cada sincronización; solo cuando cambia, va a la cola de eventos (y de ahí a Deprocast). La wifi dice
 * dónde estás: respeta el interruptor de Ubicación.
 */
import { leer } from '../modules/contexto-telefono'
import { encolarEvento, fijarAjuste, leerAjuste } from './almacen'
import { ajustesCaptura } from './captura'
import { capta } from './logica/captura'
import { alSincronizar } from './sincronizar'

export async function tomarContexto(ahora = Date.now()) {
  const a = await ajustesCaptura()
  if (!a.todo) return
  const x = leer()
  if (!x) return
  const muestra = { wifi: capta(a, 'ubicacion') ? x.wifi : null, bt: [...x.bt].sort() }
  const clave = JSON.stringify(muestra)
  if ((await leerAjuste('contexto_ultimo')) === clave) return
  await fijarAjuste('contexto_ultimo', clave)
  await encolarEvento('contexto', { en: ahora, ...muestra })
}

let registrado = false
export function registrarContexto() {
  if (registrado) return
  registrado = true
  alSincronizar(async () => { await tomarContexto() })
  void tomarContexto().catch(() => {})
}
