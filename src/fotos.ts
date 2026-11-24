/**
 * Las fotos nuevas, solas (Mobile 2.1). Cada pasada (al abrir la app y en la tarea de fondo) mira la galería desde la
 * última marca: las fotos que sacaste (no capturas de pantalla ni lo de WhatsApp, logica/capturas.ts) se copian y
 * entran a la misma cola que lo de 📎, marcadas como automáticas: suben solo con wifi y en Deprocast se leen y se
 * guardan sin abrir charla en Hoy (un plato, un ticket o la balanza igual se anotan solos).
 * La primera vez solo deja la marca: no sube la galería vieja.
 */
import * as ML from 'expo-media-library/legacy'
import { Directory, File, Paths } from 'expo-file-system'
import { encolarArchivo, fijarAjuste, leerAjuste } from './almacen'
import { ajustesCaptura } from './captura'
import { capta } from './logica/captura'
import { fotosParaSubir, marcaNueva } from './logica/capturas'
import { nombreYTipo } from './logica/archivos'
import { claveNueva } from './logica/sincro'

const MARCA = 'fotos_marca'

function carpeta(): Directory {
  const d = new Directory(Paths.document, 'archivos')
  if (!d.exists) d.create()
  return d
}

let mirando: Promise<number> | null = null
/** Encola las fotos nuevas. Devuelve cuántas. Sin el ajuste o sin permiso (no lo pide: eso es desde Permisos), nada. */
export function revisarFotosNuevas(): Promise<number> {
  mirando ??= (async () => {
    try {
      if (!capta(await ajustesCaptura(), 'fotos')) return 0
      if (!(await ML.getPermissionsAsync()).granted) return 0
      const marca = Number(await leerAjuste(MARCA))
      if (!marca) { await fijarAjuste(MARCA, String(Date.now())); return 0 }
      const r = await ML.getAssetsAsync({ mediaType: ML.MediaType.photo, first: 60, createdAfter: marca, sortBy: [[ML.SortBy.creationTime, false]] })
      const fotos = r.assets.map((a) => ({ id: a.id, filename: a.filename, creationTime: a.creationTime }))
      let n = 0
      for (const f of fotosParaSubir(fotos, marca)) {
        const a = r.assets.find((x) => x.id === f.id)!
        const info = await ML.getAssetInfoAsync(a).catch(() => null)
        if (!info?.localUri) continue
        const { nombre, tipo } = nombreYTipo({ uri: info.localUri, fileName: a.filename, type: 'image' })
        const id = claveNueva()
        const destino = new File(carpeta(), `${id}-${nombre}`)
        try { new File(info.localUri).copy(destino) } catch { continue }
        await encolarArchivo({ id, uri: destino.uri, nombre, tipo, nota: null, en: Math.round(a.creationTime), lat: null, lon: null, auto: 1 })
        n++
      }
      await fijarAjuste(MARCA, String(marcaNueva(fotos, marca)))
      return n
    } finally { mirando = null }
  })()
  return mirando
}
