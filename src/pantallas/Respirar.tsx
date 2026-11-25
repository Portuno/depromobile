/**
 * Respirar (Mobile 2.8): los ejercicios de Meditación en el teléfono. Elegís uno (caja, 4-7-8, coherencia, los tuyos) y
 * un círculo te marca el ritmo: crece al inhalar, se queda al retener, baja al exhalar. Cada cambio de fase vibra
 * (podés cerrar los ojos). Al terminar, cómo quedaste (mejor, igual, peor) y queda anotada la sesión.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native'
import { useKeepAwake } from 'expo-keep-awake'
import { traerRespirar, type Credenciales, type Ejercicio } from '../api'
import { encolarEvento, fijarAjuste, leerAjuste } from '../almacen'
import { escala, faseEn, NOMBRE_FASE, totalSegundos } from '../logica/respirar'
import { sincronizar } from '../sincronizar'
import { ESP, LETRA, TOQUE, useTema } from '../tema'

const CACHE = 'respirar_cache'
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function Respirar({ c, avisar }: { c: Credenciales; avisar: (t: string) => void }) {
  const t = useTema()
  const [xs, setXs] = useState<Ejercicio[] | null>(null)
  const [en, setEn] = useState<Ejercicio | null>(null)
  useEffect(() => {
    void leerAjuste(CACHE).then((g) => { if (g) try { setXs(JSON.parse(g)) } catch { /* roto */ } })
    void traerRespirar(c).then((r) => { setXs(r.ejercicios); void fijarAjuste(CACHE, JSON.stringify(r.ejercicios)) }).catch(() => {})
  }, [c])

  if (en) return <Sesion c={c} e={en} salir={(m) => { setEn(null); if (m) avisar(m) }} />
  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={s.raiz}>
      {xs?.map((e) => (
        <Pressable key={e.id} onPress={() => setEn(e)} style={[s.ejercicio, { backgroundColor: t.panel, borderColor: t.linea }]} accessibilityRole="button">
          <View style={{ flex: 1, gap: ESP(1) }}>
            <Text style={[LETRA.cuerpo, { color: t.texto, fontWeight: '700' }]}>{e.nombre}</Text>
            <Text style={[LETRA.chica, { color: t.tenue }]} numberOfLines={2}>{e.intencion}</Text>
          </View>
          <Text style={[LETRA.chica, { color: t.acento, fontWeight: '700' }]}>{mmss(e.segundos)}</Text>
        </Pressable>
      )) ?? <Text style={[LETRA.cuerpo, { color: t.tenue, textAlign: 'center' }]}>Cargando…</Text>}
    </ScrollView>
  )
}

function Sesion({ c, e, salir }: { c: Credenciales; e: Ejercicio; salir: (mensaje: string | null) => void }) {
  useKeepAwake()
  const t = useTema()
  const total = totalSegundos(e.fases, e.ciclos, e.minutos)
  const [seg, setSeg] = useState(0)
  const [fin, setFin] = useState(false)
  const inicio = useRef(Date.now())
  const tam = useRef(new Animated.Value(0)).current
  const faseAntes = useRef('')

  useEffect(() => {
    const x = setInterval(() => {
      const s = (Date.now() - inicio.current) / 1000
      setSeg(s)
      const f = faseEn(e.fases, total, s)
      const clave = `${f.ciclo}-${f.fase.tipo}`
      if (clave !== faseAntes.current) { faseAntes.current = clave; Vibration.vibrate(f.fase.tipo === 'inhalar' ? 40 : 20) }
      Animated.timing(tam, { toValue: escala(f.fase, f.avance), duration: 100, useNativeDriver: true }).start()
      if (f.terminado) { clearInterval(x); setFin(true); Vibration.vibrate([0, 60, 80, 60]) }
    }, 100)
    return () => clearInterval(x)
  }, [e, total, tam])

  const terminar = useCallback(async (animo: 'mejor' | 'igual' | 'peor' | null) => {
    const segundos = Math.round(Math.min(seg, total))
    if (segundos >= 10) { await encolarEvento('respirar', { ejercicio: e.id, segundos, completa: seg >= total, animo }); void sincronizar(c) }
    salir(segundos >= 10 ? `${e.nombre}: ${mmss(segundos)}` : null)
  }, [seg, total, e, c, salir])

  const f = faseEn(e.fases, total, seg)
  const s_ = tam.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] })
  return (
    <View style={[s.sesion, { backgroundColor: t.fondo }]}>
      <Text style={[LETRA.chica, { color: t.tenue }]}>{e.nombre} · ciclo {f.ciclo} · {mmss(Math.max(0, total - seg))}</Text>
      <View style={s.centro}>
        <Animated.View style={[s.circulo, { backgroundColor: t.acento, transform: [{ scale: s_ }] }]} />
        <View style={s.textoCirculo}>
          <Text style={[LETRA.grande, { color: t.texto, fontWeight: '700' }]}>{fin ? 'Listo' : NOMBRE_FASE[f.fase.tipo]}</Text>
          {!fin ? <Text style={[LETRA.titulo, { color: t.texto }]}>{f.restan}</Text> : null}
        </View>
      </View>
      {fin ? (
        <View style={s.botones}>
          {(['mejor', 'igual', 'peor'] as const).map((a) => (
            <Pressable key={a} onPress={() => terminar(a)} style={[s.boton, { borderColor: t.linea }]} accessibilityRole="button">
              <Text style={[LETRA.cuerpo, { color: t.texto, fontWeight: '700' }]}>{a === 'mejor' ? 'Mejor' : a === 'igual' ? 'Igual' : 'Peor'}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable onPress={() => terminar(null)} style={[s.boton, { borderColor: t.linea, flex: 0 }]} accessibilityRole="button">
          <Text style={[LETRA.cuerpo, { color: t.tenue }]}>Terminar</Text>
        </Pressable>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  raiz: { padding: ESP(4), gap: ESP(2), paddingBottom: ESP(8) },
  ejercicio: { minHeight: TOQUE + ESP(4), flexDirection: 'row', alignItems: 'center', gap: ESP(3), borderWidth: 1, borderRadius: 14, padding: ESP(4) },
  sesion: { flex: 1, padding: ESP(5), gap: ESP(4), alignItems: 'center' },
  centro: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  circulo: { width: 260, height: 260, borderRadius: 130, opacity: 0.35 },
  textoCirculo: { position: 'absolute', alignItems: 'center' },
  botones: { flexDirection: 'row', gap: ESP(2), alignSelf: 'stretch' },
  boton: { flex: 1, minHeight: TOQUE + ESP(2), borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ESP(5) },
})
