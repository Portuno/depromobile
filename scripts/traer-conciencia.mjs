// Copia la conciencia acústica del repo del servidor (el original) a esta app. Uso: npm run traer-conciencia [ruta-del-servidor]
import fs from 'node:fs'
import path from 'node:path'
const servidor = process.argv[2] ?? process.env.DEPROCAST_SERVIDOR ?? ['../depromastro', '../deprocast'].find((d) => fs.existsSync(path.join(d, 'src/conciencia/acustica.ts')))
if (!servidor) { console.error('No encuentro el repo del servidor: pasá su ruta (npm run traer-conciencia -- ../depromastro)'); process.exit(1) }
for (const f of ['acustica.ts', 'rasgos.ts', 'movimiento.ts']) {
  fs.copyFileSync(path.join(servidor, 'src/conciencia', f), path.join('src/conciencia', f))
  console.log('copiado', f)
}
