/**
 * La run en el bolsillo (Mobile 2.5), sin nada de React Native: se prueba desde el repo.
 * - avisosDeBandas: qué avisos programar para la run de hoy: al empezar cada banda («Ahora: …») y al terminar
 *   («¿Cómo salió …?», con los botones Hecha, A medias y No). Solo lo que todavía no pasó y no está marcado.
 * - faltan: cuánto le queda a la banda de ahora, en palabras cortas.
 */
export type BandaAviso = { id: number; titulo: string; inicio: string; fin: string; estado: string }
export type Aviso = { clave: string; en: number; titulo: string; cuerpo: string; banda: number; fin: boolean }

const enHora = (fecha: string, h: string) => { const [a, m, d] = fecha.split('-').map(Number); const [hh, mm] = h.split(':').map(Number); return new Date(a, m - 1, d, hh, mm).getTime() }
const MARCADAS = new Set(['hecha', 'parcial', 'no', 'descartada'])

export function avisosDeBandas(fecha: string, estadoRun: string, bandas: BandaAviso[], ahora: number): Aviso[] {
  if (estadoRun !== 'en_curso') return []
  const out: Aviso[] = []
  for (const b of bandas) {
    if (MARCADAS.has(b.estado)) continue
    const ini = enHora(fecha, b.inicio), fin = enHora(fecha, b.fin)
    if (ini > ahora + 5_000) out.push({ clave: `banda-ini-${b.id}`, en: ini, titulo: `Ahora: ${b.titulo}`, cuerpo: `Hasta las ${b.fin}`, banda: b.id, fin: false })
    if (fin > ahora + 5_000) out.push({ clave: `banda-fin-${b.id}`, en: fin, titulo: `¿Cómo salió «${b.titulo}»?`, cuerpo: 'Un toque y queda marcada.', banda: b.id, fin: true })
  }
  return out.sort((a, b) => a.en - b.en).slice(0, 60)
}

/** «8 min», «1 h 5 min» o «ya terminó». */
export function faltan(fecha: string, fin: string, ahora: number): string {
  const m = Math.round((enHora(fecha, fin) - ahora) / 60_000)
  if (m <= 0) return 'ya terminó'
  return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`
}

/** Los botones del aviso de fin de banda. */
export const BOTONES_BANDA = [
  { id: 'banda-hecha', titulo: 'Hecha', estado: 'hecha' },
  { id: 'banda-parcial', titulo: 'A medias', estado: 'parcial' },
  { id: 'banda-no', titulo: 'No', estado: 'no' },
] as const
export const estadoDeBoton = (accion: string): string | null => BOTONES_BANDA.find((b) => b.id === accion)?.estado ?? null
