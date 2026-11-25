/**
 * Plata (Mobile 2.6): anotar un gasto en dos toques (el monto, una categoría y listo) y firmar lo que vino de los avisos
 * del banco. Arriba, el mes: lo gastado, lo que entró y el neto. Sin red, lo anotado espera en la cola.
 */
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { traerPlata, type Credenciales, type Plata as PlataApi } from '../api'
import { encolarEvento, fijarAjuste, leerAjuste } from '../almacen'
import { sincronizar } from '../sincronizar'
import { AREA_EXTRA, ESP, LETRA, TOQUE, useTema } from '../tema'

const CACHE = 'plata_cache'
const euros = (n: number) => `${n.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`
const RAPIDAS = ['comida', 'transporte', 'ocio', 'salud', 'vivienda', 'otros']

export function Plata({ c, avisar }: { c: Credenciales; avisar: (t: string) => void }) {
  const t = useTema()
  const [p, setP] = useState<PlataApi | null>(null)
  const [monto, setMonto] = useState('')
  const [que, setQue] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const [ingreso, setIngreso] = useState(false)
  const [tirando, setTirando] = useState(false)

  const traer = useCallback(async () => {
    try { const x = await traerPlata(c); setP(x); void fijarAjuste(CACHE, JSON.stringify(x)) } catch { /* sin red: lo guardado */ }
  }, [c])
  useEffect(() => {
    void leerAjuste(CACHE).then((g) => { if (g) try { setP(JSON.parse(g)) } catch { /* roto */ } })
    void traer()
  }, [traer])

  const n = Number(monto.replace(',', '.'))
  const valido = Number.isFinite(n) && n > 0
  const anotar = async () => {
    if (!valido) return
    const firmado = ingreso ? n : -n
    await encolarEvento('plata', { monto: firmado, descripcion: que.trim() || (cat ?? (ingreso ? 'Ingreso' : 'Gasto')), categoria: ingreso ? 'ingresos' : cat })
    avisar(`Anotado: ${ingreso ? '+' : '−'}${euros(n)}`)
    setMonto(''); setQue(''); setCat(null); setIngreso(false)
    await sincronizar(c)
    void traer()
  }
  const firmar = async (id: number, accion: 'aceptar' | 'descartar') => {
    if (p) setP({ ...p, sugeridos: p.sugeridos.filter((s) => s.id !== id) })
    await encolarEvento('plata/sugerido', { id, accion })
    await sincronizar(c)
    void traer()
  }

  return (
    <ScrollView style={{ backgroundColor: t.fondo }} contentContainerStyle={s.raiz} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={tirando} onRefresh={async () => { setTirando(true); await traer(); setTirando(false) }} tintColor={t.acento} colors={[t.acento]} />}>
      {p ? (
        <View style={s.fila}>
          {([['Gastado', p.mes.gastos, t.texto], ['Entró', p.mes.ingresos, t.ok], ['Neto', p.mes.neto, p.mes.neto < 0 ? t.mal : t.ok]] as const).map(([k, v, color]) => (
            <View key={k} style={[s.num, { backgroundColor: t.panel, borderColor: t.linea }]}>
              <Text style={[LETRA.titulo, { color, fontWeight: '700' }]} numberOfLines={1}>{euros(v)}</Text>
              <Text style={[LETRA.chica, { color: t.tenue }]}>{k} en el mes</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[s.caja, { backgroundColor: t.panel, borderColor: t.linea }]}>
        <View style={s.fila}>
          <Pressable onPress={() => setIngreso((x) => !x)} style={[s.signo, { borderColor: t.linea }]} accessibilityRole="switch" accessibilityState={{ checked: ingreso }} accessibilityLabel={ingreso ? 'Es un ingreso' : 'Es un gasto'}>
            <Text style={[LETRA.titulo, { color: ingreso ? t.ok : t.mal, fontWeight: '700' }]}>{ingreso ? '+' : '−'}</Text>
          </Pressable>
          <TextInput value={monto} onChangeText={setMonto} placeholder="0,00" placeholderTextColor={t.tenue} keyboardType="decimal-pad" style={[LETRA.grande, s.monto, { color: t.texto }]} />
          <Text style={[LETRA.titulo, { color: t.tenue }]}>€</Text>
        </View>
        <TextInput value={que} onChangeText={setQue} placeholder="En qué (opcional)" placeholderTextColor={t.tenue} style={[LETRA.cuerpo, s.campo, { color: t.texto, borderColor: t.linea }]} />
        {!ingreso ? (
          <View style={s.chips}>
            {RAPIDAS.map((x) => (
              <Pressable key={x} onPress={() => setCat(cat === x ? null : x)} style={[s.chip, { borderColor: cat === x ? t.acento : t.linea, backgroundColor: cat === x ? t.acento : 'transparent' }]} hitSlop={AREA_EXTRA} accessibilityRole="radio" accessibilityState={{ selected: cat === x }}>
                <Text style={[LETRA.chica, { color: cat === x ? t.sobreAcento : t.texto, fontWeight: '600' }]}>{x}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable onPress={anotar} style={[s.anotar, { backgroundColor: valido ? t.acento : t.linea }]} accessibilityRole="button" accessibilityState={{ disabled: !valido }}>
          <Text style={[LETRA.cuerpo, { color: valido ? t.sobreAcento : t.tenue, fontWeight: '700' }]}>Anotar</Text>
        </Pressable>
      </View>

      {p?.sugeridos.length ? <Text style={[LETRA.chica, s.sub, { color: t.tenue }]}>ESPERAN TU FIRMA</Text> : null}
      {p?.sugeridos.map((x) => (
        <View key={x.id} style={[s.mov, { borderColor: t.linea }]}>
          <View style={{ flex: 1 }}>
            <Text style={[LETRA.cuerpo, { color: t.texto }]} numberOfLines={2}>{x.descripcion}</Text>
            <Text style={[LETRA.chica, { color: t.tenue }]}>{x.fecha}</Text>
          </View>
          <Text style={[LETRA.cuerpo, { color: x.monto < 0 ? t.texto : t.ok, fontWeight: '700' }]}>{euros(x.monto)}</Text>
          <Pressable onPress={() => firmar(x.id, 'aceptar')} style={s.icono} accessibilityRole="button" accessibilityLabel="Firmar"><Text style={[LETRA.titulo, { color: t.ok }]}>✓</Text></Pressable>
          <Pressable onPress={() => firmar(x.id, 'descartar')} style={s.icono} accessibilityRole="button" accessibilityLabel="Descartar"><Text style={[LETRA.titulo, { color: t.mal }]}>✕</Text></Pressable>
        </View>
      ))}

      {p?.hoy.length ? <Text style={[LETRA.chica, s.sub, { color: t.tenue }]}>HOY</Text> : null}
      {p?.hoy.map((x) => (
        <View key={x.id} style={[s.mov, { borderColor: t.linea }]}>
          <Text style={[LETRA.cuerpo, { color: t.texto, flex: 1 }]} numberOfLines={1}>{x.descripcion}</Text>
          <Text style={[LETRA.chica, { color: t.tenue }]}>{x.categoria}</Text>
          <Text style={[LETRA.cuerpo, { color: x.monto < 0 ? t.texto : t.ok, fontWeight: '700' }]}>{euros(x.monto)}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  raiz: { padding: ESP(4), gap: ESP(3), paddingBottom: ESP(8) },
  fila: { flexDirection: 'row', alignItems: 'center', gap: ESP(2) },
  num: { flex: 1, borderWidth: 1, borderRadius: 12, padding: ESP(3) },
  caja: { borderWidth: 1, borderRadius: 16, padding: ESP(4), gap: ESP(3) },
  signo: { minHeight: TOQUE, minWidth: TOQUE, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  monto: { flex: 1, fontWeight: '700' },
  campo: { minHeight: TOQUE, borderBottomWidth: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP(2) },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: ESP(3), paddingVertical: ESP(1) },
  anotar: { minHeight: TOQUE + ESP(2), borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sub: { marginTop: ESP(2), letterSpacing: 1 },
  mov: { minHeight: TOQUE, flexDirection: 'row', alignItems: 'center', gap: ESP(2), borderBottomWidth: 1, paddingVertical: ESP(1) },
  icono: { minHeight: TOQUE, minWidth: TOQUE, alignItems: 'center', justifyContent: 'center' },
})
