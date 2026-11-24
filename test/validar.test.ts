import { test } from 'node:test'
import assert from 'node:assert/strict'

const deLaApp = (m: string): Promise<any> => import(`../src/logica/${m}.ts`)
const v = await deLaApp('validar')
const atajo = await deLaApp('atajo')

test('Mobile · validar deslizando: solo un gesto marcado es un sí o un no (no hay deshacer)', () => {
  assert.equal(v.decidirDeslizar(130, 0.1), 'aceptar')
  assert.equal(v.decidirDeslizar(-115, -0.2), 'descartar')
  assert.equal(v.decidirDeslizar(60, 0.2), null, 'poco recorrido y lento: vuelve')
  assert.equal(v.decidirDeslizar(50, 1.4), 'aceptar', 'un tirón rápido')
  assert.equal(v.decidirDeslizar(20, 2), null, 'un tirón sin recorrido no cuenta')
  assert.equal(v.decidirDeslizar(60, -1.4), null, 'el tirón para el otro lado no cuenta')
  assert.equal(v.cierreDeTanda(10, 1243), 'Respondiste 10. Quedan 1.243 para validar.')
  assert.equal(v.cierreDeTanda(1, 0), 'Respondiste una. No queda nada para validar.')
})

test('Mobile · los botones del widget abren la app en su módulo', () => {
  assert.equal(atajo.pestanaDelLink('deprocast://validar'), 'validar')
  assert.equal(atajo.pestanaDelLink('deprocast://hoy'), 'hoy')
  assert.equal(atajo.pestanaDelLink('deprocast://dictar'), null, 'dictar va por su propio camino')
  assert.equal(atajo.pestanaDelLink(null), null)
})
