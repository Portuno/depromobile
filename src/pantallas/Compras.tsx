/**
 * Compras (Mobile 2.5): la lista de compras de Deprocast, para usar en el súper. Tocar tacha (y deshacer vuelve a
 * ponerla); arriba se suma algo escribiéndolo. Funciona sin red: se guarda en el teléfono y los cambios salen con la
 * sincronización. Al entrar a una tienda tuya, la app avisa con la lista (geovallas.ts).
 */
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { traerCompras, type Compra, type Credenciales } from '../api'
import { encolarEvento, fijarAjuste, leerAjuste } from '../almacen'
import { sincronizar } from '../sincronizar'
import { ESP, LETRA, TOQUE, useTema } from '../tema'

type Lista = { pendientes: Compra[]; comprados: Compra[] }
const CACHE = 'compras_cache'

export function Compras({ c }: { c: Credenciales }) {
  const t = useTema()
  const [l, setL] = useState<Lista | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [tirando, setTirando] = useState(false)

  const guardar = (x: Lista) => { setL(x); void fijarAjuste(CACHE, JSON.stringify(x)) }
  const traer = useCallback(async () => {
    try { guardar(await traerCompras(c)) } catch { /* sin red: queda lo guardado */ }
  }, [c]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void leerAjuste(CACHE).then((g) => { if (g) try { setL(JSON.parse(g)) } catch { /* roto */ } })
    void traer()
  }, [traer])

  const tachar = async (x: Compra, estado: 'comprado' | 'pendiente') => {
    if (!l) return
    const sin = (xs: Compra[]) => xs.filter((y) => y.id !== x.id)
    guardar(estado === 'comprado' ? { pendientes: sin(l.pendientes), comprados: [{ ...x, estado }, ...l.comprados] } : { pendientes: [...l.pendientes, { ...x, estado }], comprados: sin(l.comprados) })
    await encolarEvento('compras/marcar', { ids: [x.id], estado })
    void sincronizar(c)
  }
  const sumar = async () => {
    const item = nuevo.trim()
    if (!item) return
    setNuevo('')
    if (l) guardar({ ...l, pendientes: [...l.pendientes, { id: -Date.now(), item, cantidad: null, nota: null, estado: 'pendiente' }] })
    await encolarEvento('compras', { items: [{ item }] })
    await sincronizar(c)
    void traer()
  }

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={s.raiz} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={tirando} onRefresh={async () => { setTirando(true); await traer(); setTirando(false) }} tintColor={t.acento} colors={[t.acento]} />}>
      <View style={[s.alta, { borderColor: t.linea, backgroundColor: t.panel }]}>
        <TextInput value={nuevo} onChangeText={setNuevo} onSubmitEditing={sumar} placeholder="Sumar: «leche», «2 kg de tomates»…" placeholderTextColor={t.tenue} returnKeyType="done" style={[LETRA.cuerpo, s.campo, { color: t.texto }]} />
        <Pressable onPress={sumar} style={[s.mas, { backgroundColor: nuevo.trim() ? t.acento : t.linea }]} accessibilityRole="button" accessibilityLabel="Sumar a la lista">
          <Text style={[LETRA.titulo, { color: nuevo.trim() ? t.sobreAcento : t.tenue }]}>+</Text>
        </Pressable>
      </View>
      {l?.pendientes.length ? l.pendientes.map((x) => (
        <Pressable key={x.id} onPress={() => x.id > 0 && tachar(x, 'comprado')} style={[s.item, { borderColor: t.linea }]} accessibilityRole="checkbox" accessibilityState={{ checked: false }}>
          <View style={[s.caja, { borderColor: t.acento }]} />
          <Text style={[LETRA.cuerpo, { color: t.texto, flex: 1 }]}>{x.item}{x.cantidad ? ` · ${x.cantidad}` : ''}</Text>
        </Pressable>
      )) : <Text style={[LETRA.cuerpo, s.vacio, { color: t.tenue }]}>{l ? 'Nada para comprar.' : 'Cargando…'}</Text>}
      {l?.comprados.length ? <Text style={[LETRA.chica, s.sub, { color: t.tenue }]}>COMPRADO</Text> : null}
      {l?.comprados.slice(0, 15).map((x) => (
        <Pressable key={x.id} onPress={() => tachar(x, 'pendiente')} style={[s.item, { borderColor: t.linea }]} accessibilityRole="checkbox" accessibilityState={{ checked: true }}>
          <View style={[s.caja, { borderColor: t.linea, backgroundColor: t.linea }]} />
          <Text style={[LETRA.cuerpo, { color: t.tenue, flex: 1, textDecorationLine: 'line-through' }]}>{x.item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  raiz: { padding: ESP(4), gap: ESP(1), paddingBottom: ESP(8) },
  alta: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingLeft: ESP(3), marginBottom: ESP(3) },
  campo: { flex: 1, minHeight: TOQUE },
  mas: { minHeight: TOQUE, minWidth: TOQUE, borderRadius: 12, alignItems: 'center', justifyContent: 'center', margin: ESP(1) },
  item: { minHeight: TOQUE + ESP(2), flexDirection: 'row', alignItems: 'center', gap: ESP(3), borderBottomWidth: 1 },
  caja: { width: ESP(6), height: ESP(6), borderRadius: ESP(2), borderWidth: 2 },
  sub: { marginTop: ESP(4), letterSpacing: 1 },
  vacio: { textAlign: 'center', padding: ESP(6) },
})
