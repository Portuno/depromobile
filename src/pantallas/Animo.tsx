/**
 * Ánimo (Mobile 2.1): cómo venís, de 1 a 5, y la energía. Dos filas de cinco y «Anotar». Va a Salud (tipo «ánimo»).
 * Lo mismo, en un toque, desde los avisos de las 11, las 16 y las 21.
 */
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Credenciales } from '../api'
import { anotarAnimo } from '../manana'
import type { Modulo } from '../modulos'
import { ESP, LETRA, TOQUE, useTema } from '../tema'

const ESCALA = [1, 2, 3, 4, 5]
const CARA = ['😞', '😕', '😐', '🙂', '😄']

export function Animo({ c, irA, avisar }: { c: Credenciales; irA: (m: Modulo) => void; avisar: (t: string) => void }) {
  const t = useTema()
  const [animo, setAnimo] = useState<number | null>(null)
  const [energia, setEnergia] = useState<number | null>(null)

  const fila = (valor: number | null, poner: (n: number) => void, etiqueta: (n: number) => string) => (
    <View style={s.fila}>
      {ESCALA.map((n) => (
        <Pressable key={n} onPress={() => poner(n)} style={[s.opcion, { borderColor: valor === n ? t.acento : t.linea, backgroundColor: valor === n ? t.acento : t.panel }]} accessibilityRole="radio" accessibilityState={{ selected: valor === n }}>
          <Text style={[LETRA.titulo, { color: valor === n ? t.sobreAcento : t.texto }]}>{etiqueta(n)}</Text>
        </Pressable>
      ))}
    </View>
  )

  const anotar = async () => {
    if (animo == null) return
    await anotarAnimo(c, animo, energia)
    avisar(`Anotado: ánimo ${animo}/5${energia ? ` · energía ${energia}/5` : ''}`)
    irA('hoy')
  }

  return (
    <View style={[s.raiz, { backgroundColor: t.fondo }]}>
      <Text style={[LETRA.grande, { color: t.texto, fontWeight: '700' }]}>¿Cómo venís?</Text>
      <Text style={[LETRA.chica, s.sub, { color: t.tenue }]}>ÁNIMO</Text>
      {fila(animo, setAnimo, (n) => CARA[n - 1])}
      <Text style={[LETRA.chica, s.sub, { color: t.tenue }]}>ENERGÍA</Text>
      {fila(energia, setEnergia, String)}
      <Pressable onPress={anotar} style={[s.anotar, { backgroundColor: animo == null ? t.linea : t.acento }]} accessibilityRole="button" accessibilityState={{ disabled: animo == null }}>
        <Text style={[LETRA.cuerpo, { color: animo == null ? t.tenue : t.sobreAcento, fontWeight: '700' }]}>Anotar</Text>
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  raiz: { flex: 1, padding: ESP(5), gap: ESP(3) },
  sub: { marginTop: ESP(3), letterSpacing: 1 },
  fila: { flexDirection: 'row', gap: ESP(2) },
  opcion: { flex: 1, minHeight: TOQUE + ESP(4), borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  anotar: { minHeight: TOQUE + ESP(3), borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: ESP(6) },
})
