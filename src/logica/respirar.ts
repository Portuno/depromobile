/**
 * Respirar (Mobile 2.8), sin nada de React Native: se prueba desde el repo. Un ejercicio es una secuencia de fases
 * (inhalar, retener, exhalar, sostener) que se repite por ciclos o por minutos. faseEn dice, a los t segundos, en qué
 * fase y ciclo vas, cuánto le falta y si terminó; escala es cuánto se agranda el círculo (lleno al inhalar, vacío al
 * exhalar).
 */
export type Fase = { tipo: 'inhalar' | 'retener' | 'exhalar' | 'sostener'; seg: number }
export const NOMBRE_FASE: Record<Fase['tipo'], string> = { inhalar: 'Inhalá', retener: 'Retené', exhalar: 'Exhalá', sostener: 'Vacío' }

export function totalSegundos(fases: Fase[], ciclos: number | null, minutos: number | null): number {
  const ciclo = fases.reduce((s, f) => s + f.seg, 0)
  if (!ciclo) return Math.round((minutos ?? 5) * 60)
  return ciclos ? ciclo * ciclos : Math.ceil(((minutos ?? 5) * 60) / ciclo) * ciclo
}

export function faseEn(fases: Fase[], total: number, t: number): { fase: Fase; ciclo: number; restan: number; avance: number; terminado: boolean } {
  const ciclo = fases.reduce((s, f) => s + f.seg, 0) || 1
  const terminado = t >= total
  const x = Math.min(Math.max(0, t), Math.max(0, total - 0.001))
  let dentro = x % ciclo
  for (const f of fases) {
    if (dentro < f.seg) return { fase: f, ciclo: Math.floor(x / ciclo) + 1, restan: Math.ceil(f.seg - dentro), avance: dentro / f.seg, terminado }
    dentro -= f.seg
  }
  return { fase: fases[fases.length - 1], ciclo: Math.floor(x / ciclo) + 1, restan: 0, avance: 1, terminado }
}

/** El tamaño del círculo (0 vacío, 1 lleno): crece al inhalar, queda arriba al retener, baja al exhalar, queda abajo vacío. */
export function escala(f: Fase, avance: number): number {
  return f.tipo === 'inhalar' ? avance : f.tipo === 'retener' ? 1 : f.tipo === 'exhalar' ? 1 - avance : 0
}
