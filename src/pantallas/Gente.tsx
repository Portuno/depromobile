/**
 * Gente (Mobile 2.8): de quién hace mucho que no sabés. Arriba, a quién le toca (las personas a las que les pusiste
 * «cada cuántos días» y ya se pasó); abajo, las importantes con más silencio. El último contacto ya cuenta llamadas y
 * mensajes del teléfono. «Hablé» lo anota como contacto de hoy.
 */
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { traerGente, type Credenciales, type Ficha } from '../api'
import { encolarEvento, fijarAjuste, leerAjuste } from '../almacen'
import { sincronizar } from '../sincronizar'
import { AREA_EXTRA, ESP, LETRA, TOQUE, useTema } from '../tema'

const CACHE = 'gente_cache'
const silencio = (d: number | null) => (d == null ? 'sin contacto anotado' : d === 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`)

export function Gente({ c }: { c: Credenciales }) {
  const t = useTema()
  const [g, setG] = useState<{ toca: Ficha[]; importantes: Ficha[] } | null>(null)
  const [tirando, setTirando] = useState(false)
  const traer = useCallback(async () => {
    try { const x = await traerGente(c); setG(x); void fijarAjuste(CACHE, JSON.stringify(x)) } catch { /* sin red */ }
  }, [c])
  useEffect(() => {
    void leerAjuste(CACHE).then((x) => { if (x) try { setG(JSON.parse(x)) } catch { /* roto */ } })
    void traer()
  }, [traer])

  const hable = async (p: Ficha) => {
    if (g) setG({ toca: g.toca.filter((x) => x.id !== p.id), importantes: g.importantes.map((x) => (x.id === p.id ? { ...x, diasSinContacto: 0 } : x)) })
    await encolarEvento('gente/contacto', { id: p.id })
    void sincronizar(c)
  }

  const fila = (p: Ficha, atrasada: boolean) => (
    <View key={p.id} style={[s.fila, { borderColor: t.linea }]}>
      <View style={{ flex: 1 }}>
        <Text style={[LETRA.cuerpo, { color: t.texto, fontWeight: '600' }]}>{p.nombre}</Text>
        <Text style={[LETRA.chica, { color: atrasada ? t.mal : t.tenue }]}>{silencio(p.diasSinContacto)}{p.cadaDias ? ` · cada ${p.cadaDias} días` : ''}{p.vinculo ? ` · ${p.vinculo}` : ''}</Text>
      </View>
      <Pressable onPress={() => hable(p)} style={[s.hable, { borderColor: t.linea }]} hitSlop={AREA_EXTRA} accessibilityRole="button" accessibilityLabel={`Hablé hoy con ${p.nombre}`}>
        <Text style={[LETRA.chica, { color: t.acento, fontWeight: '700' }]}>Hablé</Text>
      </Pressable>
    </View>
  )

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={s.raiz} refreshControl={<RefreshControl refreshing={tirando} onRefresh={async () => { setTirando(true); await traer(); setTirando(false) }} tintColor={t.acento} colors={[t.acento]} />}>
      {g?.toca.length ? <Text style={[LETRA.chica, s.sub, { color: t.tenue }]}>LES TOCA</Text> : null}
      {g?.toca.map((p) => fila(p, true))}
      {g?.importantes.length ? <Text style={[LETRA.chica, s.sub, { color: t.tenue }]}>IMPORTANTES</Text> : null}
      {g?.importantes.map((p) => fila(p, false))}
      {g && !g.toca.length && !g.importantes.length ? <Text style={[LETRA.cuerpo, { color: t.tenue, textAlign: 'center', padding: ESP(6) }]}>Todavía no marcaste importancia ni «cada cuántos días» en tus personas.</Text> : null}
      {!g ? <Text style={[LETRA.cuerpo, { color: t.tenue, textAlign: 'center' }]}>Cargando…</Text> : null}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  raiz: { padding: ESP(4), gap: ESP(1), paddingBottom: ESP(8) },
  sub: { marginTop: ESP(3), letterSpacing: 1 },
  fila: { minHeight: TOQUE + ESP(2), flexDirection: 'row', alignItems: 'center', gap: ESP(3), borderBottomWidth: 1 },
  hable: { borderWidth: 1, borderRadius: 999, paddingHorizontal: ESP(3), paddingVertical: ESP(1) },
})
