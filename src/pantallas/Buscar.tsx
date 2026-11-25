/**
 * Buscar (Mobile 2.8): todo Deprocast desde el teléfono. Escribís y aparecen, por secciones, las piezas de tu corpus
 * (por palabras y por significado), personas, misiones, lugares y lo que se dijo en la charla. Tocar una pieza la abre
 * para leerla entera.
 */
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { buscar, traerPieza, type Busqueda, type Credenciales } from '../api'
import { ESP, LETRA, TOQUE, useTema } from '../tema'

export function Buscar({ c }: { c: Credenciales }) {
  const t = useTema()
  const [q, setQ] = useState('')
  const [r, setR] = useState<Busqueda | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leyendo, setLeyendo] = useState<number | null>(null)
  const ultima = useRef(0)

  useEffect(() => {
    if (q.trim().length < 2) { setR(null); return }
    const x = setTimeout(async () => {
      const yo = ++ultima.current
      setBuscando(true)
      try { const res = await buscar(c, q.trim()); if (yo === ultima.current) { setR(res); setError(null) } } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { if (yo === ultima.current) setBuscando(false) }
    }, 400)
    return () => clearTimeout(x)
  }, [q, c])

  const seccion = (titulo: string, n: number) => (n ? <Text style={[LETRA.chica, s.sub, { color: t.tenue }]}>{titulo}</Text> : null)
  const vacio = r && !r.piezas.length && !r.personas.length && !r.misiones.length && !r.lugares.length && !r.charla.length

  return (
    <View style={[s.raiz, { backgroundColor: t.fondo }]}>
      <View style={[s.caja, { borderColor: t.linea, backgroundColor: t.panel }]}>
        <Text style={[LETRA.titulo, { color: t.tenue }]}>⌕</Text>
        <TextInput value={q} onChangeText={setQ} placeholder="Buscar en todo…" placeholderTextColor={t.tenue} autoFocus returnKeyType="search" style={[LETRA.cuerpo, s.campo, { color: t.texto }]} />
        {buscando ? <ActivityIndicator color={t.acento} /> : null}
      </View>
      <ScrollView contentContainerStyle={s.lista} keyboardShouldPersistTaps="handled">
        {error ? <Text style={[LETRA.chica, { color: t.mal }]}>{error}</Text> : null}
        {vacio ? <Text style={[LETRA.cuerpo, { color: t.tenue, textAlign: 'center' }]}>Nada con «{q.trim()}».</Text> : null}
        {r ? (
          <>
            {seccion('TU CORPUS', r.piezas.length)}
            {r.piezas.map((p) => (
              <Pressable key={`p${p.id}`} onPress={() => setLeyendo(p.id)} style={[s.fila, { borderColor: t.linea }]} accessibilityRole="button">
                <Text style={[LETRA.cuerpo, { color: t.texto, fontWeight: '600' }]} numberOfLines={2}>{p.titulo}</Text>
                <Text style={[LETRA.chica, { color: t.tenue }]} numberOfLines={3}>{[p.fuente, p.fecha].filter(Boolean).join(' · ')} — {p.extracto}</Text>
              </Pressable>
            ))}
            {seccion('PERSONAS', r.personas.length)}
            {r.personas.map((p) => <View key={`g${p.id}`} style={[s.fila, { borderColor: t.linea }]}><Text style={[LETRA.cuerpo, { color: t.texto }]}>{p.nombre}</Text>{p.ultimoContacto ? <Text style={[LETRA.chica, { color: t.tenue }]}>último contacto {p.ultimoContacto}</Text> : null}</View>)}
            {seccion('MISIONES', r.misiones.length)}
            {r.misiones.map((m) => <View key={`m${m.id}`} style={[s.fila, { borderColor: t.linea }]}><Text style={[LETRA.cuerpo, { color: t.texto }]}>{m.titulo}</Text><Text style={[LETRA.chica, { color: t.tenue }]}>{m.nivel} · {m.estado}</Text></View>)}
            {seccion('LUGARES', r.lugares.length)}
            {r.lugares.map((l) => <View key={`l${l.id}`} style={[s.fila, { borderColor: t.linea }]}><Text style={[LETRA.cuerpo, { color: t.texto }]}>📍 {l.nombre}</Text></View>)}
            {seccion('EN LA CHARLA', r.charla.length)}
            {r.charla.map((m) => <View key={`c${m.id}`} style={[s.fila, { borderColor: t.linea }]}><Text style={[LETRA.chica, { color: t.tenue }]}>{m.rol === 'operador' ? 'Vos' : 'Mastropiero'} · {new Date(m.en).toLocaleDateString('es-AR')}</Text><Text style={[LETRA.cuerpo, { color: t.texto }]} numberOfLines={3}>{m.extracto}</Text></View>)}
          </>
        ) : null}
      </ScrollView>
      <LeerPieza c={c} id={leyendo} cerrar={() => setLeyendo(null)} />
    </View>
  )
}

function LeerPieza({ c, id, cerrar }: { c: Credenciales; id: number | null; cerrar: () => void }) {
  const t = useTema()
  const [p, setP] = useState<Awaited<ReturnType<typeof traerPieza>> | null>(null)
  useEffect(() => { setP(null); if (id != null) void traerPieza(c, id).then(setP).catch(() => cerrar()) }, [id, c]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal visible={id != null} animationType="slide" onRequestClose={cerrar}>
      <View style={[s.raiz, { backgroundColor: t.fondo }]}>
        <Pressable onPress={cerrar} style={s.cerrar} accessibilityRole="button"><Text style={[LETRA.cuerpo, { color: t.acento, fontWeight: '700' }]}>‹ Volver</Text></Pressable>
        {p ? (
          <ScrollView contentContainerStyle={{ gap: ESP(3), paddingBottom: ESP(8) }}>
            <Text style={[LETRA.titulo, { color: t.texto, fontWeight: '700' }]}>{p.titulo}</Text>
            <Text style={[LETRA.chica, { color: t.tenue }]}>{[p.fuente, p.fecha, p.autor].filter(Boolean).join(' · ')}</Text>
            <Text style={[LETRA.cuerpo, { color: t.texto }]} selectable>{p.contenido}</Text>
            {p.largo > p.contenido.length ? <Text style={[LETRA.chica, { color: t.tenue }]}>… sigue (completa en la compu)</Text> : null}
          </ScrollView>
        ) : <ActivityIndicator color={t.acento} />}
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  raiz: { flex: 1, padding: ESP(4), gap: ESP(3) },
  caja: { flexDirection: 'row', alignItems: 'center', gap: ESP(2), borderWidth: 1, borderRadius: 14, paddingHorizontal: ESP(3) },
  campo: { flex: 1, minHeight: TOQUE },
  lista: { gap: ESP(1), paddingBottom: ESP(8) },
  sub: { marginTop: ESP(3), letterSpacing: 1 },
  fila: { minHeight: TOQUE, borderBottomWidth: 1, paddingVertical: ESP(2), gap: ESP(1) },
  cerrar: { minHeight: TOQUE, justifyContent: 'center' },
})
