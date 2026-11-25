import { test } from 'node:test'
import assert from 'node:assert/strict'

const r = await import(`../src/logica/${'run'}.ts`)
const F = '2026-11-25'
const H = (h: number, m = 0) => new Date(2026, 10, 25, h, m).getTime()
const bandas = [
  { id: 1, titulo: 'Escribir el mail', inicio: '10:00', fin: '10:25', estado: 'hecha' },
  { id: 2, titulo: 'Revisar el contrato', inicio: '10:30', fin: '11:00', estado: 'activa' },
  { id: 3, titulo: 'Llamar a Ana', inicio: '11:00', fin: '11:12', estado: 'activa' },
]

test('Mobile 2.5 · los avisos de la run: al empezar y al terminar cada banda que falta, nada de lo marcado ni de lo que ya pasó', () => {
  const xs = r.avisosDeBandas(F, 'en_curso', bandas, H(10, 40))
  assert.deepEqual(xs.map((x: any) => x.clave), ['banda-fin-2', 'banda-ini-3', 'banda-fin-3'])
  assert.equal(xs[0].titulo, '¿Cómo salió «Revisar el contrato»?')
  assert.equal(xs[1].titulo, 'Ahora: Llamar a Ana')
  assert.equal(xs[0].fin, true)
  assert.deepEqual(r.avisosDeBandas(F, 'propuesta', bandas, H(9)), [], 'una run propuesta no avisa')
})

test('Mobile 2.5 · cuánto falta y los botones del aviso', () => {
  assert.equal(r.faltan(F, '11:00', H(10, 52)), '8 min')
  assert.equal(r.faltan(F, '12:10', H(11, 0)), '1 h 10 min')
  assert.equal(r.faltan(F, '10:00', H(10, 5)), 'ya terminó')
  assert.equal(r.estadoDeBoton('banda-parcial'), 'parcial')
  assert.equal(r.estadoDeBoton('animo-3'), null)
})
