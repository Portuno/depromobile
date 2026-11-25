/**
 * Los módulos de la app (Mobile 2.0): un solo lugar con su nombre, su ícono y para qué sirve. La barra de abajo muestra
 * cuatro; el Menú, todos.
 */
export type Modulo = 'hoy' | 'mapa' | 'escucha' | 'menu' | 'validar' | 'actividad' | 'audios' | 'captura' | 'animo' | 'sueno' | 'diario' | 'run' | 'compras' | 'estado' | 'plata' | 'semana'

export const MODULOS: Record<Modulo, { nombre: string; icono: string; para: string }> = {
  hoy: { nombre: 'Hoy', icono: '💬', para: 'Charlar con Mastropiero' },
  mapa: { nombre: 'Mapa', icono: '🗺', para: 'Por dónde anduviste' },
  escucha: { nombre: 'Escucha', icono: '🎙', para: 'Tu voz y tus charlas' },
  menu: { nombre: 'Menú', icono: '☰', para: 'Todo' },
  validar: { nombre: 'Validar', icono: '✅', para: 'Lo que espera tu ok' },
  actividad: { nombre: 'Actividad', icono: '🚶', para: 'Pasos y uso del teléfono' },
  audios: { nombre: 'Audios', icono: '🎧', para: 'Lo grabado, en el teléfono' },
  captura: { nombre: 'Permisos', icono: '⚙', para: 'Qué capta y qué no' },
  animo: { nombre: 'Ánimo', icono: '🙂', para: 'Cómo venís, de 1 a 5' },
  sueno: { nombre: 'Sueño', icono: '🌙', para: 'Lo que soñaste' },
  diario: { nombre: 'Diario', icono: '📔', para: 'Tu día en una línea' },
  run: { nombre: 'Run', icono: '⏱', para: 'La banda de ahora' },
  compras: { nombre: 'Compras', icono: '🛒', para: 'La lista, para el súper' },
  estado: { nombre: 'Estado', icono: '🩺', para: 'Qué está captando' },
  plata: { nombre: 'Plata', icono: '💶', para: 'Anotar y firmar gastos' },
  semana: { nombre: 'Semana', icono: '📊', para: 'Tus 7 días en números' },
}

/** Los fijos de abajo. */
export const BARRA: Modulo[] = ['hoy', 'mapa', 'escucha', 'menu']
/** Los del Menú, en orden. */
export const EN_MENU: Modulo[] = ['run', 'diario', 'hoy', 'mapa', 'escucha', 'compras', 'plata', 'semana', 'validar', 'actividad', 'animo', 'audios', 'sueno', 'estado', 'captura']
