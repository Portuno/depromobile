/**
 * Los errores de la app (Mobile 2.5): como no se ve el teléfono, la app reporta lo que se rompe (un error sin atrapar,
 * o uno que se atrapa y se quiere saber) con dónde pasó, el comienzo de la pila y la versión. Va a la cola de eventos y
 * sale con la sincronización; Mastropiero los lee con ver_errores_telefono.
 */
import * as Updates from 'expo-updates'
import { encolarEvento } from './almacen'

export function version(): string {
  const id = Updates.updateId ? Updates.updateId.slice(0, 8) : 'apk'
  return `${Updates.runtimeVersion ?? '?'}·${id}`
}

/** Anota un error (no tira nunca). */
export function reportar(donde: string, e: unknown) {
  const err = e instanceof Error ? e : new Error(String(e))
  void encolarEvento('error', { donde, mensaje: err.message.slice(0, 500), pila: (err.stack ?? '').slice(0, 4000), version: version(), en: Date.now() }).catch(() => {})
}

let instalado = false
/** Al abrir: los errores sin atrapar también se reportan (y después siguen su curso normal). */
export function instalarReporteDeErrores() {
  if (instalado) return
  instalado = true
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler(): (e: unknown, fatal?: boolean) => void; setGlobalHandler(f: (e: unknown, fatal?: boolean) => void): void } }
  const eu = g.ErrorUtils
  if (!eu) return
  const anterior = eu.getGlobalHandler()
  eu.setGlobalHandler((e, fatal) => {
    reportar(fatal ? 'global (fatal)' : 'global', e)
    anterior(e, fatal)
  })
}
