/**
 * El registro de llamadas (Mobile 2.4). Fuera de Android (o con un APK anterior, sin el módulo) no hay nada.
 */
import { requireOptionalNativeModule } from 'expo'

export type LlamadaCruda = { en: number; numero: string | null; nombre: string | null; tipo: 'entrante' | 'saliente' | 'perdida' | 'rechazada'; duracionS: number }
const nativo = requireOptionalNativeModule<{ tienePermiso(): boolean; leer(desde: number): Promise<LlamadaCruda[]> }>('RegistroLlamadas')

export const hayLlamadas = () => nativo != null
export const tienePermisoLlamadas = (): boolean => { try { return nativo?.tienePermiso() ?? false } catch { return false } }
export async function leerLlamadas(desde: number): Promise<LlamadaCruda[]> { try { return (await nativo?.leer(desde)) ?? [] } catch { return [] } }
