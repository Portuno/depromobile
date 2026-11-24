/**
 * El contexto del teléfono (Mobile 2.3): la wifi y los dispositivos de audio Bluetooth. Fuera de Android (o con un APK
 * viejo, sin el módulo) no hay: leer() da null.
 */
import { requireOptionalNativeModule } from 'expo'

export type Contexto = { wifi: string | null; bt: string[] }
const nativo = requireOptionalNativeModule<{ leer(): Contexto | null }>('ContextoTelefono')

export const hayContexto = () => nativo != null
export function leer(): Contexto | null { try { return nativo?.leer() ?? null } catch { return null } }
