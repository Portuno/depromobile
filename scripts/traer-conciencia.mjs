// Copia del repo del servidor (el original) lo que la app comparte con él: la conciencia acústica y el contrato de la API
// del dispositivo. Uso: npm run traer-conciencia [ruta-del-servidor]   (también: npm run traer-contrato)
import fs from 'node:fs'
import path from 'node:path'
const servidor = process.argv[2] ?? process.env.DEPROCAST_SERVIDOR ?? ['../depromastro', '../deprocast'].find((d) => fs.existsSync(path.join(d, 'src/conciencia/acustica.ts')))
if (!servidor) { console.error('No encuentro el repo del servidor: pasá su ruta (npm run traer-conciencia -- ../depromastro)'); process.exit(1) }
for (const f of ['acustica.ts', 'rasgos.ts', 'movimiento.ts']) {
  fs.copyFileSync(path.join(servidor, 'src/conciencia', f), path.join('src/conciencia', f))
  console.log('copiado', `src/conciencia/${f}`)
}
fs.copyFileSync(path.join(servidor, 'src/contrato-dispositivo.ts'), 'src/contrato.ts')
console.log('copiado src/contrato.ts')
