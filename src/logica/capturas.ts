/**
 * Las capturas de Mobile 2.1, sin nada de React Native: se prueban desde el repo.
 * - fotosParaSubir: las fotos nuevas de la galería que van solas (ni capturas de pantalla ni lo de WhatsApp: esas ya
 *   pasaron por otro lado o no son tuyas);
 * - despertar: si con las sesiones de pantalla de la noche se ve que te acabás de despertar (para preguntar «¿soñaste
 *   algo?» una vez por mañana);
 * - BOTONES_ANIMO: los tres botones del aviso (Android no muestra más de tres).
 */

export type Foto = { id: string; filename: string; creationTime: number }

/** Capturas de pantalla, lo que llega por WhatsApp o Telegram y lo descargado: no son fotos que sacaste vos. */
const NO_SON_TUYAS = /screenshot|captura|screen[_-]?shot|^IMG-\d{8}-WA|whatsapp|telegram|download/i

/** Las fotos nuevas que suben solas, de la más vieja a la más nueva, a partir de la marca. */
export function fotosParaSubir(fotos: Foto[], marca: number, max = 30): Foto[] {
  return fotos.filter((f) => f.creationTime > marca && !NO_SON_TUYAS.test(f.filename)).sort((a, b) => a.creationTime - b.creationTime).slice(0, max)
}

/** La marca nueva después de una pasada: la foto más nueva que se miró (aunque no se haya subido). */
export function marcaNueva(fotos: Foto[], marca: number): number {
  return fotos.reduce((m, f) => Math.max(m, f.creationTime), marca)
}

const HORA = 3_600_000
/** Un hueco de pantalla de al menos este largo es la noche. */
export const NOCHE_MIN = 3 * HORA
/** Se pregunta si la primera sesión de la mañana empezó hace menos que esto. */
export const RECIEN = 45 * 60_000

/**
 * ¿Te acabás de despertar? Con las sesiones de pantalla desde la tarde anterior: entre las 4 y las 13, la primera
 * sesión después de un hueco de 3 h o más, empezada hace menos de 45 min. Devuelve la hora del despertar o null.
 * yaPreguntado: la fecha ('AAAA-MM-DD') en que ya se preguntó (una vez por mañana).
 */
export function despertar(sesiones: [number, number][], ahora: number, yaPreguntado: string | null): number | null {
  const d = new Date(ahora)
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (yaPreguntado === hoy || d.getHours() < 4 || d.getHours() >= 13) return null
  const cuatro = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 4).getTime()
  const xs = [...sesiones].filter(([a, b]) => b > a && a <= ahora).sort((x, y) => x[0] - y[0])
  for (let i = 0; i < xs.length; i++) {
    if (xs[i][0] < cuatro) continue
    const antes = i > 0 ? xs[i - 1][1] : null
    if (antes == null || xs[i][0] - antes < NOCHE_MIN) continue
    return ahora - xs[i][0] <= RECIEN ? xs[i][0] : null
  }
  return null
}

/** Los tres botones del aviso de ánimo y lo que vale cada uno (de 1 a 5). */
export const BOTONES_ANIMO = [
  { id: 'animo-2', titulo: 'Bajo', animo: 2 },
  { id: 'animo-3', titulo: 'Normal', animo: 3 },
  { id: 'animo-4', titulo: 'Arriba', animo: 4 },
] as const
/** Las horas del aviso de ánimo. */
export const HORAS_ANIMO = [11, 16, 21]
export const animoDeBoton = (accion: string): number | null => BOTONES_ANIMO.find((b) => b.id === accion)?.animo ?? null
