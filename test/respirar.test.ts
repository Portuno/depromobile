import { test } from 'node:test'
import assert from 'node:assert/strict'

const r = await import(`../src/logica/${'respirar'}.ts`)
const caja = [{ tipo: 'inhalar', seg: 4 }, { tipo: 'retener', seg: 4 }, { tipo: 'exhalar', seg: 4 }, { tipo: 'sostener', seg: 4 }]

test('Mobile 2.8 · respirar: la fase, el ciclo y lo que falta a cada segundo; el círculo crece al inhalar', () => {
  const total = r.totalSegundos(caja, 10, null)
  assert.equal(total, 160)
  assert.equal(r.totalSegundos(caja, null, 1), 64, 'por minutos, ciclos enteros')
  const a = r.faseEn(caja, total, 1)
  assert.equal(a.fase.tipo, 'inhalar'); assert.equal(a.restan, 3); assert.equal(a.ciclo, 1)
  const b = r.faseEn(caja, total, 17)
  assert.equal(b.fase.tipo, 'inhalar'); assert.equal(b.ciclo, 2)
  assert.equal(r.faseEn(caja, total, 9).fase.tipo, 'exhalar')
  assert.equal(r.faseEn(caja, total, 160).terminado, true)
  assert.equal(r.escala({ tipo: 'inhalar', seg: 4 }, 0.5), 0.5)
  assert.equal(r.escala({ tipo: 'exhalar', seg: 4 }, 0.25), 0.75)
})
