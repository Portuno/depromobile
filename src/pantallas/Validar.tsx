/**
 * Validar en 5 minutos: lo que espera tu ok, de a una tarjeta. Deslizá a la derecha para sí y a la izquierda para no
 * (un gesto marcado: no hay deshacer), o usá los botones; «Después» la deja para otra tanda. Tandas de 10.
 *
 * Mobile 2.7: arriba, «Filtros» abre un menú para elegir qué tipos ver (uno o varios: lo que soñó, lo que anotó de vos,
 * montos…) y el orden (lo que más pesa, lo más nuevo, lo más viejo o al azar); queda guardado. Desde ahí también se
 * exporta todo: lo ya cribado (con lo que se mostró y qué respondiste) y lo que falta, en un archivo para compartir.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native'
import { File, Paths } from 'expo-file-system'
import { shareAsync } from 'expo-sharing'
import { responderTarjeta, traerExportacion, traerTanda, type Credenciales, type FiltroTanda, type OrdenTanda, type Tanda, type Tarjeta } from '../api'
import { fijarAjuste, leerAjuste } from '../almacen'
import { cierreDeTanda, decidirDeslizar } from '../logica/validar'
import { AREA_EXTRA, ESP, LETRA, TOQUE, useTema } from '../tema'

const ORDENES: { clave: OrdenTanda; nombre: string }[] = [
  { clave: 'peso', nombre: 'Lo que más pesa' }, { clave: 'nuevo', nombre: 'Más nuevo' }, { clave: 'viejo', nombre: 'Más viejo' }, { clave: 'azar', nombre: 'Al azar' },
]
const FILTRO_INICIAL: FiltroTanda = { tipos: [], orden: 'peso' }
const CLAVE = 'validar_filtro'
const cuando = (t: number | null | undefined) => (t ? new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' }) : null)

export function Validar({ c, alCambiar }: { c: Credenciales; alCambiar?: (quedan: number) => void }) {
  const t = useTema()
  const [tanda, setTanda] = useState<Tarjeta[] | null>(null)
  const [tipos, setTipos] = useState<Tanda['tipos']>([])
  const [filtro, setFiltro] = useState<FiltroTanda | null>(null)
  const [verFiltros, setVerFiltros] = useState(false)
  const [i, setI] = useState(0)
  const [quedan, setQuedan] = useState(0)
  const [respondidas, setRespondidas] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [mandando, setMandando] = useState(false)
  const pos = useRef(new Animated.ValueXY()).current
  const actual = useRef<{ tarjeta: Tarjeta | null; mandando: boolean }>({ tarjeta: null, mandando: false })

  // El filtro guardado (la primera vez, el de siempre).
  useEffect(() => { void leerAjuste(CLAVE).then((g) => { try { setFiltro(g ? { ...FILTRO_INICIAL, ...JSON.parse(g) } : FILTRO_INICIAL) } catch { setFiltro(FILTRO_INICIAL) } }) }, [])

  const cargar = useCallback(async () => {
    if (!filtro) return
    setError(null)
    setTanda(null)
    try {
      const r = await traerTanda(c, 10, filtro)
      setTanda(r.tarjetas)
      setTipos(r.tipos ?? [])
      const q = filtro.tipos.length && r.filtrado != null ? r.filtrado : r.total
      setQuedan(q)
      setI(0)
      setRespondidas(0)
      alCambiar?.(r.total)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setTanda([]) }
  }, [c, alCambiar, filtro])
  useEffect(() => { void cargar() }, [cargar])

  const aplicar = (f: FiltroTanda) => { setFiltro(f); void fijarAjuste(CLAVE, JSON.stringify(f)); setVerFiltros(false) }

  const tarjeta = tanda?.[i] ?? null
  actual.current.tarjeta = tarjeta
  actual.current.mandando = mandando

  const siguiente = useCallback(() => { pos.setValue({ x: 0, y: 0 }); setI((x) => x + 1) }, [pos])

  const responder = useCallback(async (accion: 'aceptar' | 'descartar' | null) => {
    const x = actual.current.tarjeta
    if (!x || actual.current.mandando) return
    if (!accion) return siguiente()
    setMandando(true)
    try {
      await responderTarjeta(c, x, accion)
      Vibration.vibrate(12)
      setRespondidas((n) => n + 1)
      setQuedan((n) => { const q = Math.max(0, n - 1); alCambiar?.(q); return q })
      siguiente()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()
    } finally { setMandando(false) }
  }, [c, alCambiar, pos, siguiente])

  const volar = useCallback((accion: 'aceptar' | 'descartar') => {
    Animated.timing(pos, { toValue: { x: accion === 'aceptar' ? 500 : -500, y: 0 }, duration: 180, useNativeDriver: false }).start(() => { void responder(accion) })
  }, [pos, responder])

  const gestos = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: Animated.event([null, { dx: pos.x }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      const d = actual.current.mandando ? null : decidirDeslizar(g.dx, g.vx)
      if (d) volar(d)
      else Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()
    },
    onPanResponderTerminate: () => Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
  })).current

  const nombreFiltro = filtro ? [filtro.tipos.length ? `${filtro.tipos.length} tipo${filtro.tipos.length === 1 ? '' : 's'}` : 'Todo', ORDENES.find((o) => o.clave === filtro.orden)?.nombre].filter(Boolean).join(' · ') : ''
  const cabecera = (
    <View style={s.cabecera}>
      <Text style={[LETRA.chica, { color: t.tenue, flex: 1 }]} numberOfLines={1}>{tarjeta ? `${i + 1} de ${tanda!.length} · ` : ''}quedan {quedan.toLocaleString('es-AR')}</Text>
      <Pressable onPress={() => setVerFiltros(true)} style={[s.filtros, { borderColor: filtro && (filtro.tipos.length || filtro.orden !== 'peso') ? t.acento : t.linea }]} hitSlop={AREA_EXTRA} accessibilityRole="button" accessibilityLabel="Filtros y orden">
        <Text style={[LETRA.chica, { color: t.texto, fontWeight: '700' }]} numberOfLines={1}>⚙ {nombreFiltro}</Text>
      </Pressable>
    </View>
  )
  const menu = filtro ? <MenuFiltros visible={verFiltros} c={c} filtro={filtro} tipos={tipos ?? []} cerrar={() => setVerFiltros(false)} aplicar={aplicar} /> : null

  if (tanda == null) return <View style={s.centro}><ActivityIndicator color={t.acento} />{menu}</View>

  if (!tarjeta) {
    return (
      <View style={s.raiz}>
        {cabecera}
        <View style={[s.centro, { gap: ESP(4) }]}>
          <Text style={[LETRA.titulo, { color: t.texto, textAlign: 'center' }]}>{tanda.length ? 'Listo' : 'Nada para validar'}</Text>
          <Text style={[LETRA.cuerpo, { color: t.tenue, textAlign: 'center' }]}>{tanda.length ? cierreDeTanda(respondidas, quedan) : filtro?.tipos.length ? 'Nada de esos tipos. Probá con otros en ⚙.' : quedan ? 'Lo que espera necesita la pantalla grande (pesar quántomos, nombres del archivo).' : 'Cuando Mastropiero proponga algo, aparece acá.'}</Text>
          {error ? <Text style={[LETRA.chica, { color: t.mal, textAlign: 'center' }]}>{error}</Text> : null}
          <Pressable onPress={() => void cargar()} style={[s.boton, s.ancho, { backgroundColor: t.acento }]} accessibilityRole="button">
            <Text style={[LETRA.cuerpo, { color: t.sobreAcento, fontWeight: '700' }]}>{tanda.length ? 'Otra tanda' : 'Buscar de nuevo'}</Text>
          </Pressable>
        </View>
        {menu}
      </View>
    )
  }

  const giro = pos.x.interpolate({ inputRange: [-240, 0, 240], outputRange: ['-8deg', '0deg', '8deg'] })
  const si = pos.x.interpolate({ inputRange: [0, 110], outputRange: [0, 1], extrapolate: 'clamp' })
  const no = pos.x.interpolate({ inputRange: [-110, 0], outputRange: [1, 0], extrapolate: 'clamp' })
  return (
    <View style={s.raiz}>
      {cabecera}
      <Animated.View {...gestos.panHandlers} style={[s.tarjeta, { backgroundColor: t.panel, borderColor: t.linea, transform: [{ translateX: pos.x }, { rotate: giro }] }]} accessibilityHint="Deslizá a la derecha para sí, a la izquierda para no">
        <Animated.Text style={[LETRA.chica, s.sello, { color: t.ok, borderColor: t.ok, opacity: si, right: ESP(4) }]}>{tarjeta.si.toUpperCase()}</Animated.Text>
        <Animated.Text style={[LETRA.chica, s.sello, { color: t.mal, borderColor: t.mal, opacity: no, left: ESP(4) }]}>{tarjeta.no.toUpperCase()}</Animated.Text>
        <Text style={[LETRA.chica, { color: t.acento, fontWeight: '700' }]} numberOfLines={1}>{tarjeta.grupo}{cuando(tarjeta.en) ? ` · ${cuando(tarjeta.en)}` : ''}</Text>
        <Text style={[LETRA.titulo, { color: t.texto }]} numberOfLines={7}>{tarjeta.texto}</Text>
        {tarjeta.sub ? <Text style={[LETRA.cuerpo, { color: t.tenue }]} numberOfLines={6}>{tarjeta.sub}</Text> : null}
      </Animated.View>
      {error ? <Text style={[LETRA.chica, { color: t.mal }]}>{error}</Text> : null}
      <View style={s.botones}>
        <Pressable disabled={mandando} onPress={() => volar('descartar')} style={[s.boton, { borderColor: t.mal, borderWidth: 1 }]} accessibilityRole="button" accessibilityLabel={`No: ${tarjeta.no}`}>
          <Text style={[LETRA.cuerpo, { color: t.mal, fontWeight: '700' }]} numberOfLines={1}>✕ {tarjeta.no}</Text>
        </Pressable>
        <Pressable disabled={mandando} onPress={() => void responder(null)} style={[s.boton, { borderColor: t.linea, borderWidth: 1 }]} accessibilityRole="button">
          <Text style={[LETRA.cuerpo, { color: t.tenue }]}>Después</Text>
        </Pressable>
        <Pressable disabled={mandando} onPress={() => volar('aceptar')} style={[s.boton, { backgroundColor: t.ok }]} accessibilityRole="button" accessibilityLabel={`Sí: ${tarjeta.si}`}>
          <Text style={[LETRA.cuerpo, { color: t.sobreAcento, fontWeight: '700' }]} numberOfLines={1}>✓ {tarjeta.si}</Text>
        </Pressable>
      </View>
      {menu}
    </View>
  )
}

/** El menú: qué tipos (uno o varios; ninguno = todos), en qué orden, y exportar. */
function MenuFiltros({ visible, c, filtro, tipos, cerrar, aplicar }: { visible: boolean; c: Credenciales; filtro: FiltroTanda; tipos: { tipo: string; nombre: string; n: number }[]; cerrar: () => void; aplicar: (f: FiltroTanda) => void }) {
  const t = useTema()
  const [f, setF] = useState(filtro)
  const [exportando, setExportando] = useState(false)
  useEffect(() => { if (visible) setF(filtro) }, [visible, filtro])
  const alternar = (tipo: string) => setF((x) => ({ ...x, tipos: x.tipos.includes(tipo) ? x.tipos.filter((y) => y !== tipo) : [...x.tipos, tipo] }))
  // Un tipo elegido que hoy no tiene nada igual se muestra (para poder sacarlo).
  const lista = [...tipos, ...f.tipos.filter((x) => !tipos.some((y) => y.tipo === x)).map((x) => ({ tipo: x, nombre: x, n: 0 }))]

  const exportar = async () => {
    setExportando(true)
    try {
      const x = await traerExportacion(c)
      const archivo = new File(Paths.cache, `validacion-${x.fecha}.json`)
      if (archivo.exists) archivo.delete()
      archivo.create()
      archivo.write(JSON.stringify(x, null, 2))
      await shareAsync(archivo.uri, { mimeType: 'application/json', dialogTitle: 'Lo cribado y lo que falta' })
    } catch (e) { Alert.alert('No pude exportar', e instanceof Error ? e.message : String(e)) } finally { setExportando(false) }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cerrar}>
      <Pressable style={s.velo} onPress={cerrar} />
      <View style={[s.hoja, { backgroundColor: t.panel, borderColor: t.linea }]}>
        <ScrollView contentContainerStyle={{ gap: ESP(3) }}>
          <Text style={[LETRA.chica, s.sub, { color: t.tenue }]}>QUÉ VER {f.tipos.length ? '' : '· TODO'}</Text>
          <View style={s.chips}>
            {lista.map((x) => {
              const on = f.tipos.includes(x.tipo)
              return (
                <Pressable key={x.tipo} onPress={() => alternar(x.tipo)} style={[s.chip, { borderColor: on ? t.acento : t.linea, backgroundColor: on ? t.acento : 'transparent' }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                  <Text style={[LETRA.chica, { color: on ? t.sobreAcento : t.texto, fontWeight: '600' }]}>{x.nombre} · {x.n}</Text>
                </Pressable>
              )
            })}
          </View>
          {f.tipos.length ? (
            <Pressable onPress={() => setF((x) => ({ ...x, tipos: [] }))} style={s.enlace} accessibilityRole="button">
              <Text style={[LETRA.chica, { color: t.acento, fontWeight: '700' }]}>Ver todo</Text>
            </Pressable>
          ) : null}
          <Text style={[LETRA.chica, s.sub, { color: t.tenue }]}>ORDEN</Text>
          <View style={s.chips}>
            {ORDENES.map((o) => (
              <Pressable key={o.clave} onPress={() => setF((x) => ({ ...x, orden: o.clave }))} style={[s.chip, { borderColor: f.orden === o.clave ? t.acento : t.linea, backgroundColor: f.orden === o.clave ? t.acento : 'transparent' }]} accessibilityRole="radio" accessibilityState={{ selected: f.orden === o.clave }}>
                <Text style={[LETRA.chica, { color: f.orden === o.clave ? t.sobreAcento : t.texto, fontWeight: '600' }]}>{o.nombre}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => aplicar(f)} style={[s.boton, { backgroundColor: t.acento }]} accessibilityRole="button">
            <Text style={[LETRA.cuerpo, { color: t.sobreAcento, fontWeight: '700' }]}>Aplicar</Text>
          </Pressable>
          <Pressable onPress={exportar} disabled={exportando} style={[s.boton, { borderColor: t.linea, borderWidth: 1 }]} accessibilityRole="button">
            <Text style={[LETRA.cuerpo, { color: t.texto }]}>{exportando ? 'Exportando…' : '⤓ Exportar lo cribado y lo que falta'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  raiz: { flex: 1, padding: ESP(4), gap: ESP(4) },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: ESP(6) },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: ESP(2) },
  filtros: { borderWidth: 1, borderRadius: 999, paddingHorizontal: ESP(3), paddingVertical: ESP(1), maxWidth: '60%' },
  tarjeta: { flex: 1, borderWidth: 1, borderRadius: 16, padding: ESP(5), paddingTop: ESP(10), gap: ESP(3), justifyContent: 'center' },
  sello: { position: 'absolute', top: ESP(4), borderWidth: 2, borderRadius: 8, paddingVertical: ESP(1), paddingHorizontal: ESP(2), fontWeight: '800', letterSpacing: 1 },
  botones: { flexDirection: 'row', gap: ESP(2) },
  boton: { flex: 1, minHeight: TOQUE, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: ESP(2) },
  ancho: { alignSelf: 'stretch' },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  hoja: { maxHeight: '80%', borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, padding: ESP(5), paddingBottom: ESP(9) },
  sub: { letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESP(2) },
  chip: { minHeight: TOQUE - ESP(2), justifyContent: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: ESP(3) },
  enlace: { minHeight: TOQUE, justifyContent: 'center' },
})
