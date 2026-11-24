/**
 * Sueño (Mobile 2.1): «¿Soñaste algo?» a la mañana. Una caja para escribirlo (o dictarlo con el micrófono del teclado),
 * «Guardar» y «No me acuerdo». Va a Sueños con la hora en que te despertaste, si el teléfono la vio.
 */
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Credenciales } from '../api'
import { anotarSueno, despertarDeHoy, soltarSueno } from '../manana'
import type { Modulo } from '../modulos'
import { useAltoTeclado } from '../teclado'
import { ESP, LETRA, TOQUE, useTema } from '../tema'

export function Sueno({ c, irA, avisar }: { c: Credenciales; irA: (m: Modulo) => void; avisar: (t: string) => void }) {
  const t = useTema()
  const [texto, setTexto] = useState('')
  const [despertar, setDespertar] = useState<string | null>(null)
  useEffect(() => { void despertarDeHoy().then(setDespertar) }, [])
  const teclado = useAltoTeclado()
  const bordes = useSafeAreaInsets()

  const guardar = async () => {
    const x = texto.trim()
    if (!x) return
    await anotarSueno(c, x, despertar)
    avisar('Sueño guardado')
    irA('hoy')
  }
  const nada = async () => { await soltarSueno(); irA('hoy') }

  return (
    <View style={[s.raiz, { backgroundColor: t.fondo, paddingBottom: teclado ? Math.max(0, teclado - bordes.bottom) + ESP(3) : ESP(5) }]}>
      <Text style={[LETRA.grande, { color: t.texto, fontWeight: '700' }]}>¿Soñaste algo?</Text>
      {despertar ? <Text style={[LETRA.chica, { color: t.tenue }]}>Te despertaste a las {despertar}</Text> : null}
      <TextInput value={texto} onChangeText={setTexto} placeholder="Lo que te acuerdes, aunque sea una imagen suelta…" placeholderTextColor={t.tenue} multiline autoFocus style={[s.caja, { color: t.texto, borderColor: t.linea, backgroundColor: t.panel }]} />
      <View style={s.botones}>
        <Pressable onPress={nada} style={[s.boton, { borderColor: t.linea }]} accessibilityRole="button">
          <Text style={[LETRA.cuerpo, { color: t.tenue }]}>No me acuerdo</Text>
        </Pressable>
        <Pressable onPress={guardar} style={[s.boton, { backgroundColor: texto.trim() ? t.acento : t.linea, borderColor: 'transparent' }]} accessibilityRole="button">
          <Text style={[LETRA.cuerpo, { color: texto.trim() ? t.sobreAcento : t.tenue, fontWeight: '700' }]}>Guardar</Text>
        </Pressable>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  raiz: { flex: 1, padding: ESP(5), gap: ESP(3) },
  caja: { ...LETRA.cuerpo, flex: 1, borderWidth: 1, borderRadius: 14, padding: ESP(4), textAlignVertical: 'top' },
  botones: { flexDirection: 'row', gap: ESP(3) },
  boton: { flex: 1, minHeight: TOQUE + ESP(2), borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
})
