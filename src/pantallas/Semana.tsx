/**
 * Semana (Mobile 2.6): los últimos 7 días en números, uno por fila (pasos, sueño, ánimo, pantalla y gastos), con barras
 * para leer de un vistazo cómo vino la semana, y los promedios arriba. Tocar un día abre su Diario.
 */
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { traerSemana, type Credenciales, type DiaSemana } from '../api'
import { fijarAjuste, leerAjuste } from '../almacen'
import type { Modulo } from '../modulos'
import { ESP, LETRA, TOQUE, useTema } from '../tema'

type Semana = Awaited<ReturnType<typeof traerSemana>>
const CACHE = 'semana_cache'
const coma = (n: number | null | undefined, d = 1) => (n == null ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: d }))
const hm = (m: number | null) => (m == null ? '—' : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m} min`)

export function Semana({ c, irA }: { c: Credenciales; irA: (m: Modulo) => void }) {
  const t = useTema()
  const [s_, setS] = useState<Semana | null>(null)
  const [tirando, setTirando] = useState(false)
  const traer = useCallback(async () => {
    try { const x = await traerSemana(c); setS(x); void fijarAjuste(CACHE, JSON.stringify(x)) } catch { /* sin red */ }
  }, [c])
  useEffect(() => {
    void leerAjuste(CACHE).then((g) => { if (g) try { setS(JSON.parse(g)) } catch { /* roto */ } })
    void traer()
  }, [traer])

  const maxPasos = Math.max(1, ...(s_?.dias.map((d) => d.pasos) ?? [0]))
  const fila = (d: DiaSemana) => (
    <Pressable key={d.fecha} onPress={() => irA('diario')} style={[s.dia, { borderColor: t.linea }]} accessibilityRole="button">
      <Text style={[LETRA.chica, s.fecha, { color: t.texto, fontWeight: '700' }]}>{new Date(`${d.fecha}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })}</Text>
      <View style={{ flex: 1, gap: ESP(1) }}>
        <View style={[s.barra, { backgroundColor: t.linea }]}><View style={[s.lleno, { backgroundColor: t.acento, width: `${Math.round((d.pasos / maxPasos) * 100)}%` }]} /></View>
        <Text style={[LETRA.chica, { color: t.tenue }]} numberOfLines={1}>
          {coma(d.pasos, 0)} pasos · 😴 {d.suenoHoras ? `${coma(d.suenoHoras)} h` : '—'} · 🙂 {coma(d.animo)} · 📱 {hm(d.pantallaMin)}{d.gastos ? ` · ${coma(d.gastos, 2)} €` : ''}
        </Text>
      </View>
    </Pressable>
  )

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={s.raiz} refreshControl={<RefreshControl refreshing={tirando} onRefresh={async () => { setTirando(true); await traer(); setTirando(false) }} tintColor={t.acento} colors={[t.acento]} />}>
      {s_ ? (
        <View style={s.nums}>
          {([[coma(s_.promedio.pasos, 0), 'pasos/día'], [s_.promedio.suenoHoras ? `${coma(s_.promedio.suenoHoras)} h` : '—', 'de sueño'], [s_.promedio.animo ? `${coma(s_.promedio.animo)}/5` : '—', 'ánimo'], [hm(s_.promedio.pantallaMin == null ? null : Math.round(s_.promedio.pantallaMin)), 'pantalla/día']] as const).map(([v, que]) => (
            <View key={que} style={[s.num, { backgroundColor: t.panel, borderColor: t.linea }]}>
              <Text style={[LETRA.titulo, { color: t.texto, fontWeight: '700' }]}>{v}</Text>
              <Text style={[LETRA.chica, { color: t.tenue }]}>{que}</Text>
            </View>
          ))}
        </View>
      ) : <Text style={[LETRA.cuerpo, { color: t.tenue, textAlign: 'center' }]}>Cargando…</Text>}
      {s_ ? [...s_.dias].reverse().map(fila) : null}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  raiz: { padding: ESP(4), gap: ESP(2), paddingBottom: ESP(8) },
  nums: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP(2), marginBottom: ESP(2) },
  num: { minWidth: '45%', flexGrow: 1, borderWidth: 1, borderRadius: 12, padding: ESP(3) },
  dia: { minHeight: TOQUE + ESP(2), flexDirection: 'row', alignItems: 'center', gap: ESP(3), borderBottomWidth: 1, paddingVertical: ESP(2) },
  fecha: { width: ESP(16) },
  barra: { height: ESP(2), borderRadius: ESP(1), overflow: 'hidden' },
  lleno: { height: '100%' },
})
