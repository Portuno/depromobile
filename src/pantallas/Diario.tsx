/**
 * Diario del día (Mobile 2.2): todo lo capturado de un día en una línea, como en la web. Arriba los números, los pasos
 * por hora y la línea (sueño, agenda, paradas y trayectos, fotos, charlas, comidas, ánimo y gastos). ‹ › cambia de día.
 * Lo arma el servidor (/api/dispositivo/diario); sin red, se ve el último que se trajo de ese día.
 */
import { useCallback, useEffect, useState } from 'react'
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { cabeceraDe, traerDiario, urlAdjunto, type Credenciales, type DiarioDia } from '../api'
import { fijarAjuste, leerAjuste } from '../almacen'
import type { Modulo } from '../modulos'
import { AREA_EXTRA, ESP, LETRA, TOQUE, useTema } from '../tema'

const dos = (n: number) => String(n).padStart(2, '0')
const fechaDe = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
const correr = (f: string, dias: number) => { const [a, m, d] = f.split('-').map(Number); return fechaDe(new Date(a, m - 1, d + dias, 12)) }
const hm = (t: number) => new Date(t).toTimeString().slice(0, 5)
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}` : `${m} min`)
const coma = (n: number) => String(n).replace('.', ',')

export function Diario({ c, irA }: { c: Credenciales; irA: (m: Modulo) => void }) {
  const t = useTema()
  const hoy = fechaDe(new Date())
  const [fecha, setFecha] = useState(hoy)
  const [d, setD] = useState<DiarioDia | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tirando, setTirando] = useState(false)

  const traer = useCallback(async () => {
    // Lo último guardado de ese día, al instante; después, lo del servidor.
    try { const g = await leerAjuste(`diario_${fecha}`); setD(g ? JSON.parse(g) : null) } catch { setD(null) }
    try {
      const r = await traerDiario(c, fecha)
      setD(r); setError(null)
      void fijarAjuste(`diario_${fecha}`, JSON.stringify(r))
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }, [c, fecha])
  useEffect(() => { void traer() }, [traer])

  const r = d?.resumen
  const nums = r ? ([
    r.pasos ? [r.pasos.toLocaleString('es-AR'), 'pasos'] : null,
    r.km ? [`${coma(r.km)} km`, 'recorridos'] : null,
    r.suenoHoras ? [`${coma(r.suenoHoras)} h`, 'de sueño'] : null,
    r.animo ? [`${coma(r.animo)}/5`, 'ánimo'] : null,
    r.pantallaMin != null ? [dur(r.pantallaMin), 'pantalla'] : null,
    r.gastos ? [`${coma(r.gastos)} €`, 'gastados'] : null,
    r.fotos ? [String(r.fotos), r.fotos === 1 ? 'foto' : 'fotos'] : null,
    r.charlas ? [String(r.charlas), r.charlas === 1 ? 'charla' : 'charlas'] : null,
  ].filter(Boolean) as [string, string][]) : []
  const max = Math.max(1, ...(d?.pasosPorHora ?? [0]))

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={s.raiz} refreshControl={<RefreshControl refreshing={tirando} onRefresh={async () => { setTirando(true); await traer(); setTirando(false) }} tintColor={t.acento} colors={[t.acento]} />}>
      <View style={s.cab}>
        <Pressable onPress={() => setFecha(correr(fecha, -1))} style={s.flecha} hitSlop={AREA_EXTRA} accessibilityRole="button" accessibilityLabel="Día anterior"><Text style={[LETRA.titulo, { color: t.acento }]}>‹</Text></Pressable>
        <Text style={[LETRA.titulo, { color: t.texto, fontWeight: '700', flex: 1, textAlign: 'center' }]}>
          {fecha === hoy ? 'Hoy' : new Date(`${fecha}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
        </Text>
        <Pressable onPress={() => fecha < hoy && setFecha(correr(fecha, 1))} style={[s.flecha, { opacity: fecha < hoy ? 1 : 0.3 }]} hitSlop={AREA_EXTRA} accessibilityRole="button" accessibilityLabel="Día siguiente"><Text style={[LETRA.titulo, { color: t.acento }]}>›</Text></Pressable>
      </View>
      {error && !d ? <Text style={[LETRA.chica, { color: t.mal, textAlign: 'center' }]}>Sin conexión: {error}</Text> : null}

      {nums.length ? (
        <View style={s.nums}>
          {nums.map(([v, que]) => (
            <View key={que} style={[s.num, { backgroundColor: t.panel, borderColor: t.linea }]}>
              <Text style={[LETRA.titulo, { color: t.texto, fontWeight: '700' }]}>{v}</Text>
              <Text style={[LETRA.chica, { color: t.tenue }]}>{que}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {d?.pasosPorHora.some((x) => x) ? (
        <View>
          <View style={s.horas}>{d.pasosPorHora.map((x, i) => <View key={i} style={[s.hora, { backgroundColor: x ? t.acento : t.linea, height: Math.max(ESP(1), Math.round((x / max) * ESP(12))) }]} />)}</View>
          <View style={s.eje}>{['0', '6', '12', '18', '24 h'].map((x) => <Text key={x} style={[LETRA.chica, { color: t.tenue }]}>{x}</Text>)}</View>
        </View>
      ) : null}

      {d?.momentos.length ? d.momentos.map((m, i) => (
        <Pressable key={i} onPress={() => m.lat != null && irA('mapa')} style={[s.momento, { borderColor: t.linea }]} accessibilityRole={m.lat != null ? 'button' : 'text'}>
          <Text style={[LETRA.chica, s.hm, { color: t.tenue }]}>{hm(m.en)}</Text>
          <Text style={LETRA.titulo}>{m.icono}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[LETRA.cuerpo, { color: m.tipo === 'parada' || m.tipo === 'trayecto' ? t.acento : t.texto, fontWeight: '600' }]}>{m.titulo}</Text>
            {m.sub ? <Text style={[LETRA.chica, { color: t.tenue }]} numberOfLines={4}>{m.sub}</Text> : null}
            {m.foto ? <Image source={{ uri: urlAdjunto(c, m.foto.replace(/^\/adjuntos\//, ''), 480), headers: cabeceraDe(c) }} style={[s.foto, { backgroundColor: t.linea }]} resizeMode="cover" /> : null}
          </View>
        </Pressable>
      )) : <Text style={[LETRA.cuerpo, s.vacio, { color: t.tenue }]}>{d ? 'Nada capturado este día.' : 'Cargando…'}</Text>}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  raiz: { padding: ESP(4), gap: ESP(3), paddingBottom: ESP(8) },
  cab: { flexDirection: 'row', alignItems: 'center', gap: ESP(2) },
  flecha: { minWidth: TOQUE, alignItems: 'center' },
  nums: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP(2) },
  num: { minWidth: '30%', flexGrow: 1, borderWidth: 1, borderRadius: 12, padding: ESP(3) },
  horas: { flexDirection: 'row', alignItems: 'flex-end', gap: ESP(1), height: ESP(12) },
  hora: { flex: 1, borderRadius: 2 },
  eje: { flexDirection: 'row', justifyContent: 'space-between' },
  momento: { minHeight: TOQUE, flexDirection: 'row', gap: ESP(2), borderBottomWidth: 1, paddingVertical: ESP(2) },
  hm: { width: ESP(11), paddingTop: ESP(1), fontVariant: ['tabular-nums'] },
  foto: { width: '100%', height: 180, borderRadius: 12, marginTop: ESP(2) },
  vacio: { textAlign: 'center', padding: ESP(6) },
})
