/**
 * Buscar actualización (Mobile 2.1): las OTA no siempre se aplicaban solas (Android cierra la app antes de que termine de
 * bajar). Desde el Menú se busca, se baja y se reinicia en un toque; si falla, se dice por qué.
 */
import * as Updates from 'expo-updates'

/** La versión que corre: la del APK y, si hay, la de la OTA aplicada encima. */
export function versionActual(): string {
  const base = Updates.runtimeVersion ?? '?'
  if (!Updates.isEnabled) return `${base} · sin actualizaciones`
  return Updates.isEmbeddedLaunch ? `${base} · del APK` : `${base} · OTA ${Updates.createdAt ? Updates.createdAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : ''}`.trim()
}

/** Busca, baja y reinicia. Devuelve qué pasó (si reinicia, no vuelve). */
export async function buscarActualizacion(): Promise<string> {
  if (!Updates.isEnabled) return 'Esta instalación no recibe actualizaciones (es de desarrollo).'
  try {
    const r = await Updates.checkForUpdateAsync()
    if (!r.isAvailable) return 'Ya tenés la última.'
    await Updates.fetchUpdateAsync()
    await Updates.reloadAsync()
    return 'Actualizando…'
  } catch (e) {
    return `No pude actualizar: ${e instanceof Error ? e.message : String(e)}`
  }
}
