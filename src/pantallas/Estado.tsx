/**
 * Estado (Mobile 2.5): qué está captando el teléfono de verdad. Una fila por cosa (recorrido, escucha, pasos, uso,
 * carga, llamadas, mensajes, fotos, geovallas, tarea de fondo) con la última vez que llegó a Deprocast: verde si es
 * reciente, rojo si hace más de 3 horas. Para ver en un vistazo si Android cortó algo, sin esperar al aviso del vigía.
 */
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as TaskManager from 'expo-task-manager'
import { traerEstado, type Credenciales } from '../api'
import { cuantoEnCola, estadoSincro, leerAjuste } from '../almacen'
import { cuantasGeovallas } from '../geovallas'
import { version } from '../errores'
import type { Modulo } from '../modulos'
import { recorridoPrendido } from '../recorrido'
import { useEscuchaGlobal } from '../escuchaGlobal'
import { ESP, LETRA, TOQUE, useTema } from '../tema'

const hace = (t: number | null | undefined) => {
  if (!t) return 'nunca'
  const m = Math.round((Date.now() - t) / 60_000)
  return m < 1 ? 'recién' : m < 60 ? `hace ${m} min` : m < 48 * 60 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} días`
}
const fresco = (t: number | null | undefined, horas = 3) => !!t && Date.now() - t < horas * 3_600_000

type Fila = { nombre: string; valor: string; bien: boolean | null }

export function Estado({ c, irA }: { c: Credenciales; irA: (m: Modulo) => void }) {
  const t = useTema()
  const e = useEscuchaGlobal()
  const [filas, setFilas] = useState<Fila[]>([])
  const [tirando, setTirando] = useState(false)

  const leer = useCallback(async () => {
    const [sincro, cola, prendido, geo, fondo, fotos] = await Promise.all([estadoSincro(), cuantoEnCola(), recorridoPrendido(), cuantasGeovallas(), TaskManager.isTaskRegisteredAsync('deprocast-fondo').catch(() => false), leerAjuste('fotos_marca')])
    let u: Record<string, number | null> = {}
    try { u = (await traerEstado(c)).ultimas } catch { /* sin red: solo lo local */ }
    setFilas([
      { nombre: 'Sincronización', valor: sincro.error ? `sin conexión · ${hace(sincro.sincronizadoEn)}` : hace(sincro.sincronizadoEn), bien: !sincro.error && fresco(sincro.sincronizadoEn, 1) },
      { nombre: 'Esperando salir', valor: `${cola.textos + cola.voces}`, bien: cola.textos + cola.voces < 10 },
      { nombre: 'Recorrido', valor: prendido ? `anotando · llegó ${hace(u.recorrido)}` : 'apagado', bien: prendido ? fresco(u.recorrido) : null },
      { nombre: 'Escucha', valor: e.activa ? `escuchando · ${hace(u.escucha)}` : `apagada · ${hace(u.escucha)}`, bien: e.activa ? true : null },
      { nombre: 'Pasos', valor: hace(u.pasos), bien: fresco(u.pasos) },
      { nombre: 'Uso del teléfono', valor: hace(u.uso), bien: u.uso ? fresco(u.uso) : null },
      { nombre: 'Carga', valor: hace(u.carga), bien: u.carga ? fresco(u.carga, 1) : null },
      { nombre: 'Llamadas', valor: hace(u.llamadas), bien: null },
      { nombre: 'Quién te escribe', valor: hace(u.mensajes), bien: null },
      { nombre: 'Fotos nuevas', valor: fotos ? `mirando desde ${new Date(Number(fotos)).toLocaleDateString('es-AR')}` : 'sin empezar', bien: fotos ? true : null },
      { nombre: 'Lugares vigilados', valor: `${geo}`, bien: null },
      { nombre: 'Tarea de fondo', valor: fondo ? 'registrada' : 'no registrada', bien: fondo },
      { nombre: 'Versión', valor: version(), bien: null },
    ])
  }, [c, e.activa])
  useEffect(() => { void leer() }, [leer])

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={s.raiz} refreshControl={<RefreshControl refreshing={tirando} onRefresh={async () => { setTirando(true); await leer(); setTirando(false) }} tintColor={t.acento} colors={[t.acento]} />}>
      {filas.map((f) => (
        <View key={f.nombre} style={[s.fila, { borderColor: t.linea }]}>
          <View style={[s.punto, { backgroundColor: f.bien == null ? t.linea : f.bien ? t.ok : t.mal }]} />
          <Text style={[LETRA.cuerpo, { color: t.texto, flex: 1 }]}>{f.nombre}</Text>
          <Text style={[LETRA.chica, { color: f.bien === false ? t.mal : t.tenue }]}>{f.valor}</Text>
        </View>
      ))}
      <Pressable onPress={() => irA('captura')} style={s.enlace} accessibilityRole="button">
        <Text style={[LETRA.cuerpo, { color: t.acento, fontWeight: '700' }]}>Permisos ›</Text>
      </Pressable>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  raiz: { padding: ESP(4), gap: ESP(1), paddingBottom: ESP(8) },
  fila: { minHeight: TOQUE, flexDirection: 'row', alignItems: 'center', gap: ESP(3), borderBottomWidth: 1 },
  punto: { width: ESP(3), height: ESP(3), borderRadius: ESP(2) },
  enlace: { minHeight: TOQUE, justifyContent: 'center', marginTop: ESP(3) },
})
