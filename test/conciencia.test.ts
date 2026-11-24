import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// El original de la conciencia acústica es del servidor (repo deprocast, src/conciencia). La app lleva una copia exacta.
// Con el repo del servidor al lado (o en DEPROCAST_SERVIDOR), se comparan; si no está, la prueba se salta.
const servidor = process.env.DEPROCAST_SERVIDOR ?? ['../depromastro', '../deprocast'].find((d) => fs.existsSync(path.join(d, 'src/conciencia/acustica.ts')))

test('La app usa la misma conciencia acústica que el servidor (el mismo archivo, sin desviarse)', { skip: !servidor && 'sin el repo del servidor al lado' }, () => {
  for (const f of ['acustica.ts', 'rasgos.ts', 'movimiento.ts']) {
    // Sin contar los finales de línea (en Windows git los cambia al bajar).
    const original = fs.readFileSync(path.join(servidor!, 'src/conciencia', f), 'utf8').replaceAll('\r\n', '\n')
    const copia = fs.readFileSync(`src/conciencia/${f}`, 'utf8').replaceAll('\r\n', '\n')
    assert.equal(copia, original, `cambió src/conciencia/${f} en el servidor: corré npm run traer-conciencia`)
  }
})
