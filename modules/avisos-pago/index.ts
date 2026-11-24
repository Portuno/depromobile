/**
 * Los avisos de pago (Fragua #296): lo que el teléfono guardó de las apps de pago y banco (con el permiso «Acceso a
 * notificaciones»). Fuera de Android (o sin el módulo compilado) no hay.
 */
import { requireOptionalNativeModule } from 'expo'

export type AvisoPago = { paquete: string; app: string; titulo: string; texto: string; en: number }
export type Recibido = { app: string; remitente: string; conversacion: string | null; grupo: boolean; en: number }
export type Sonando = { paquete: string; app: string; tema: string; artista: string; en: number }
type Nativo = { tienePermiso(): boolean; abrirPermiso(): boolean; fijarPaquetes(p: string[]): boolean; pendientes(): AvisoPago[]; soltar(hasta: number): number; sonandoPendientes?(): Sonando[]; soltarSonando?(hasta: number): number; fijarMensajes?(si: boolean): boolean; recibidosPendientes?(): Recibido[]; soltarRecibidos?(hasta: number): number }
const nativo = requireOptionalNativeModule<Nativo>('AvisosPago')

export const hayAvisosPago = () => nativo != null
export const tienePermisoPagos = (): boolean => { try { return nativo?.tienePermiso() ?? false } catch { return false } }
export const abrirPermisoPagos = (): boolean => { try { return nativo?.abrirPermiso() ?? false } catch { return false } }
export const fijarPaquetes = (p: string[]): boolean => { try { return nativo?.fijarPaquetes(p) ?? false } catch { return false } }
export const pendientesPago = (): AvisoPago[] => { try { return nativo?.pendientes() ?? [] } catch { return [] } }
export const soltarPagos = (hasta: number): number => { try { return nativo?.soltar(hasta) ?? 0 } catch { return 0 } }
// Mobile 2.3: lo que sonó en las apps de música (un APK anterior no tiene estas funciones: no hay nada).
export const sonandoPendientes = (): Sonando[] => { try { return nativo?.sonandoPendientes?.() ?? [] } catch { return [] } }
export const soltarSonando = (hasta: number): number => { try { return nativo?.soltarSonando?.(hasta) ?? 0 } catch { return 0 } }
// Mobile 2.4: quién te escribe (un APK anterior no tiene estas funciones: no hay nada).
export const fijarMensajes = (si: boolean): boolean => { try { return nativo?.fijarMensajes?.(si) ?? false } catch { return false } }
export const recibidosPendientes = (): Recibido[] => { try { return nativo?.recibidosPendientes?.() ?? [] } catch { return [] } }
export const soltarRecibidos = (hasta: number): number => { try { return nativo?.soltarRecibidos?.(hasta) ?? 0 } catch { return 0 } }
