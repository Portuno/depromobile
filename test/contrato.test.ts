import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const contrato = await import(`../src/${'contrato'}.ts`)

/** Las rutas que pide la app: las de pedir(c, '…') y /api/dispositivo/… en api.ts, y las de la cola de eventos. */
function rutasDeLaApp(): { metodo: string; ruta: string }[] {
  const api = fs.readFileSync('src/api.ts', 'utf8')
  const out: { metodo: string; ruta: string }[] = []
  for (const m of api.matchAll(/pedir<[^>]*>\((?:c|\{ servidor: s \}), [`'"]([a-z/\-]+)(\$\{[^}]+\})?([a-z/\-]*)[^`'"]*[`'"](,\s*\{\s*method: '([A-Z]+)')?/g)) {
    const ruta = m[1] + (m[2] ? (m[1].endsWith('/') ? '1' : '') : '') + (m[3] ?? '')
    out.push({ metodo: m[5] ?? 'GET', ruta: ruta.replace(/\/$/, '/x.jpg') })
  }
  for (const m of api.matchAll(/\/api\/dispositivo\/([a-z/\-]+)[^`]*`, \{ method: '([A-Z]+)'/g)) out.push({ metodo: m[2], ruta: m[1] })
  for (const f of fs.readdirSync('src', { recursive: true }).map(String).filter((x) => x.endsWith('.ts') || x.endsWith('.tsx'))) for (const m of fs.readFileSync(`src/${f}`, 'utf8').matchAll(/encolarEvento\('([a-z/]+)'/g)) out.push({ metodo: 'POST', ruta: m[1] })
  return out
}

test('Mobile 2.2 · la app no pide nada que no esté en el contrato de la API del dispositivo', () => {
  const xs = rutasDeLaApp()
  assert.ok(xs.length >= 20, xs.map((x) => `${x.metodo} ${x.ruta}`).join(', '))
  for (const x of xs) assert.ok(contrato.rutaDe(x.ruta, x.metodo), `la app pide ${x.metodo} ${x.ruta} y el contrato no lo tiene (¿npm run traer-contrato?)`)
})

const servidor = process.env.DEPROCAST_SERVIDOR ?? ['../depromastro', '../deprocast'].find((d) => fs.existsSync(path.join(d, 'src/contrato-dispositivo.ts')))
test('Mobile 2.2 · el contrato es la copia exacta del servidor', { skip: !servidor && 'sin el repo del servidor al lado' }, () => {
  const a = fs.readFileSync(path.join(servidor!, 'src/contrato-dispositivo.ts'), 'utf8').replaceAll('\r\n', '\n')
  assert.equal(fs.readFileSync('src/contrato.ts', 'utf8').replaceAll('\r\n', '\n'), a, 'corré npm run traer-contrato')
})
