/**
 * Run (Mobile 2.5): la run de hoy en el bolsillo. Arriba, la banda de ahora en grande con cuánto le falta y tres botones
 * (Hecha, A medias, No); abajo, todas las bandas con su hora y cómo quedaron. Una run propuesta se arranca acá. Sin run,
 * lo dice y lleva a Hoy para pedirla. Abre al instante con lo guardado; tirando hacia abajo se actualiza.
 */
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { arrancarRun, pasarASiguiente, type Banda, type Credenciales, type RunTelefono } from '../api'
import { faltan } from '../logica/run'
import type { Modulo } from '../modulos'
import { alCambiarRun, marcarBanda, programarBandas, refrescarRun, runGuardada } from '../run'
import { ESP, LETRA, TOQUE, useTema } from '../tema'

const ESTADO: Record<string, string> = { hecha: '✓', parcial: '½', no: '✕', activa: '·', sugerida: '·' }

export function Run({ c, irA }: { c: Credenciales; irA: (m: Modulo) => void }) {
  const t = useTema()
  const [r, setR] = useState<RunTelefono | null>(null)
  const [tirando, setTirando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setTic] = useState(0)

  const traer = useCallback(async (forzar = false) => {
    try { setR(await refrescarRun(c, { forzar })); setError(null) } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }, [c])
  useEffect(() => {
    void runGuardada().then((x) => x && setR(x))
    void traer(true)
    const sacar = alCambiarRun(setR)
    const reloj = setInterval(() => setTic((n) => n + 1), 30_000)
    return () => { sacar(); clearInterval(reloj) }
  }, [traer])

  const accion = async (f: () => Promise<RunTelefono>) => {
    try { const x = await f(); setR(x); void programarBandas(x) } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }

  if (r && !r.run) {
    return (
      <View style={[s.vacia, { backgroundColor: t.fondo }]}>
        <Text style={[LETRA.titulo, { color: t.texto, fontWeight: '700' }]}>Sin run hoy</Text>
        <Pressable onPress={() => irA('hoy')} style={[s.boton, { backgroundColor: t.acento }]} accessibilityRole="button">
          <Text style={[LETRA.cuerpo, { color: t.sobreAcento, fontWeight: '700' }]}>Pedírsela a Mastropiero</Text>
        </Pressable>
      </View>
    )
  }

  const run = r?.run
  const ahora = r?.bandas.find((b) => b.id === r.ahora) ?? null
  const sigue = r?.bandas.find((b) => b.id === r.siguiente) ?? null
  const marcar = (b: Banda, estado: string) => void marcarBanda(c, b.id, estado)

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={s.raiz} refreshControl={<RefreshControl refreshing={tirando} onRefresh={async () => { setTirando(true); await traer(true); setTirando(false) }} tintColor={t.acento} colors={[t.acento]} />}>
      {error && !r ? <Text style={[LETRA.chica, { color: t.mal, textAlign: 'center' }]}>Sin conexión: {error}</Text> : null}
      {run ? (
        <Text style={[LETRA.chica, { color: t.tenue, textAlign: 'center' }]}>
          {run.inicio}–{run.fin} · {r!.hechas}/{r!.bandas.length} hechas{run.estado === 'propuesta' ? ' · propuesta' : ''}
        </Text>
      ) : null}

      {run?.estado === 'propuesta' ? (
        <Pressable onPress={() => accion(() => arrancarRun(c, run.id))} style={[s.boton, { backgroundColor: t.acento }]} accessibilityRole="button">
          <Text style={[LETRA.cuerpo, { color: t.sobreAcento, fontWeight: '700' }]}>▶ Arrancar la run</Text>
        </Pressable>
      ) : null}

      {ahora && run ? (
        <View style={[s.ahora, { backgroundColor: t.panel, borderColor: t.acento }]}>
          <Text style={[LETRA.chica, { color: t.acento, fontWeight: '700' }]}>AHORA · {ahora.inicio}–{ahora.fin} · faltan {faltan(run.fecha, ahora.fin, Date.now())}</Text>
          <Text style={[LETRA.grande, { color: t.texto, fontWeight: '700' }]}>{ahora.titulo}</Text>
          {ahora.detalle ? <Text style={[LETRA.cuerpo, { color: t.tenue }]} numberOfLines={4}>{ahora.detalle}</Text> : null}
          <View style={s.botones}>
            {([['hecha', 'Hecha'], ['parcial', 'A medias'], ['no', 'No']] as const).map(([e, nombre]) => (
              <Pressable key={e} onPress={() => marcar(ahora, e)} style={[s.marca, { borderColor: t.linea, backgroundColor: ahora.estado === e ? t.acento : 'transparent' }]} accessibilityRole="button">
                <Text style={[LETRA.cuerpo, { color: ahora.estado === e ? t.sobreAcento : t.texto, fontWeight: '700' }]}>{nombre}</Text>
              </Pressable>
            ))}
          </View>
          {sigue ? (
            <Pressable onPress={() => accion(() => pasarASiguiente(c, run.id))} style={s.enlace} accessibilityRole="button">
              <Text style={[LETRA.chica, { color: t.acento, fontWeight: '700' }]}>Pasar ya a «{sigue.titulo}» ›</Text>
            </Pressable>
          ) : null}
        </View>
      ) : sigue && run?.estado === 'en_curso' ? (
        <View style={[s.ahora, { backgroundColor: t.panel, borderColor: t.linea }]}>
          <Text style={[LETRA.chica, { color: t.tenue }]}>SIGUE · {sigue.inicio}</Text>
          <Text style={[LETRA.titulo, { color: t.texto, fontWeight: '700' }]}>{sigue.titulo}</Text>
        </View>
      ) : null}

      {r?.bandas.map((b) => (
        <View key={b.id} style={[s.banda, { borderColor: t.linea, opacity: b.estado === 'no' ? 0.55 : 1 }]}>
          <Text style={[LETRA.chica, s.hora, { color: b.id === r.ahora ? t.acento : t.tenue }]}>{b.inicio}</Text>
          <Text style={[LETRA.cuerpo, { color: b.id === r.ahora ? t.acento : t.texto, flex: 1, fontWeight: b.id === r.ahora ? '700' : '400' }]} numberOfLines={2}>{b.titulo}</Text>
          <Text style={[LETRA.titulo, { color: b.estado === 'hecha' ? t.ok : b.estado === 'no' ? t.mal : t.tenue }]}>{ESTADO[b.estado] ?? '·'}</Text>
        </View>
      ))}
      {!r ? <Text style={[LETRA.cuerpo, { color: t.tenue, textAlign: 'center' }]}>Cargando…</Text> : null}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  raiz: { padding: ESP(4), gap: ESP(3), paddingBottom: ESP(8) },
  vacia: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: ESP(4), padding: ESP(6) },
  boton: { minHeight: TOQUE + ESP(2), borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ESP(5) },
  ahora: { borderWidth: 2, borderRadius: 18, padding: ESP(4), gap: ESP(2) },
  botones: { flexDirection: 'row', gap: ESP(2), marginTop: ESP(2) },
  marca: { flex: 1, minHeight: TOQUE + ESP(2), borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  enlace: { minHeight: TOQUE, justifyContent: 'center' },
  banda: { minHeight: TOQUE, flexDirection: 'row', alignItems: 'center', gap: ESP(3), borderBottomWidth: 1, paddingVertical: ESP(2) },
  hora: { width: ESP(12), fontVariant: ['tabular-nums'] },
})
