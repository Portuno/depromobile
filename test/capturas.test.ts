import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const c = await import(`../src/logica/${'capturas'}.ts`)
const H = (h: number, m = 0, dia = 16) => new Date(2026, 10, dia, h, m).getTime()

test('Mobile 2.1 · fotos nuevas: solo las que sacaste (ni capturas ni WhatsApp), de la más vieja a la más nueva, desde la marca', () => {
  const fotos = [
    { id: '3', filename: 'IMG_20261116_101500.jpg', creationTime: H(10, 15) },
    { id: '1', filename: 'IMG_20261116_090000.jpg', creationTime: H(9) },
    { id: '2', filename: 'Screenshot_20261116-093000.png', creationTime: H(9, 30) },
    { id: '4', filename: 'IMG-20261116-WA0003.jpg', creationTime: H(10, 30) },
    { id: '0', filename: 'IMG_20261115_230000.jpg', creationTime: H(23, 0, 15) },
  ]
  assert.deepEqual(c.fotosParaSubir(fotos, H(0)).map((f: any) => f.id), ['1', '3'])
  assert.equal(c.marcaNueva(fotos, H(0)), H(10, 30), 'la marca avanza aunque la última no se suba')
})

test('Mobile 2.1 · ¿te acabás de despertar?: la primera pantalla después de 3 h sin tocarlo, de 4 a 13, hace menos de 45 min, una vez por mañana', () => {
  const sesiones: [number, number][] = [[H(23, 0, 15), H(23, 50, 15)], [H(3, 10), H(3, 12)], [H(7, 40), H(7, 45)]]
  assert.equal(c.despertar(sesiones, H(8, 0), null), H(7, 40), 'la mirada de las 3 no cuenta (antes de las 4)')
  assert.equal(c.despertar(sesiones, H(9, 0), null), null, 'hace más de 45 min: ya pasó')
  assert.equal(c.despertar(sesiones, H(8, 0), '2026-11-16'), null, 'ya se preguntó hoy')
  assert.equal(c.despertar([[H(6, 0), H(6, 30)], [H(7, 0), H(7, 5)]], H(7, 10), null), null, 'sin hueco largo antes: no es despertar')
})

test('Mobile 2.1 · el aviso de ánimo: tres botones (Android no muestra más) que valen 2, 3 y 4', () => {
  assert.equal(c.BOTONES_ANIMO.length, 3)
  assert.equal(c.animoDeBoton('animo-4'), 4)
  assert.equal(c.animoDeBoton('expo.modules.notifications.actions.DEFAULT'), null, 'tocar el aviso no es un botón')
  const app = fs.readFileSync('App.tsx', 'utf8')
  assert.match(app, /addNotificationResponseReceivedListener/, 'el toque de un aviso se atiende')
  assert.match(app, /getLastNotificationResponseAsync/, 'también si abrió la app')
})

test('Mobile 2.3 · los cambios de app para el foco: sin el lanzador ni la misma app seguida', async () => {
  const uso = await import(`../src/logica/${'uso'}.ts`)
  assert.deepEqual(uso.limpiarCambios([
    { t: 3, p: 'com.notion.id' }, { t: 1, p: 'com.whatsapp' }, { t: 2, p: 'com.android.launcher3' }, { t: 4, p: 'com.notion.id' },
  ]), [[1, 'com.whatsapp'], [3, 'com.notion.id']])
  const r = uso.resumirUso('2026-11-16', { pantallaMs: 0, desbloqueos: 0, apps: [] })
  assert.equal(r.cambios, undefined, 'un APK sin el dato no manda cambios vacíos')
})
