package expo.modules.registrollamadas

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * El registro de llamadas (Mobile 2.4), con el permiso «Registro de llamadas» (se pide desde la app). Solo quién (el
 * número y el nombre que ya trae el registro), cuándo, cuánto duró y de qué tipo. Nunca se graba ni se escucha nada.
 */
class RegistroLlamadasModule : Module() {
  private val contexto: Context?
    get() = appContext.reactContext

  private fun tienePermiso(): Boolean {
    val ctx = contexto ?: return false
    return ctx.checkSelfPermission(Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
  }

  private fun tipoDe(t: Int): String = when (t) {
    CallLog.Calls.OUTGOING_TYPE -> "saliente"
    CallLog.Calls.MISSED_TYPE -> "perdida"
    CallLog.Calls.REJECTED_TYPE, CallLog.Calls.BLOCKED_TYPE -> "rechazada"
    else -> "entrante"
  }

  override fun definition() = ModuleDefinition {
    Name("RegistroLlamadas")

    Function("tienePermiso") { tienePermiso() }

    // Las llamadas desde un instante (ms), de la más vieja a la más nueva: [{ en, numero, nombre, tipo, duracionS }].
    AsyncFunction("leer") { desde: Double ->
      val ctx = contexto ?: return@AsyncFunction emptyList<Map<String, Any?>>()
      if (!tienePermiso()) return@AsyncFunction emptyList<Map<String, Any?>>()
      val out = mutableListOf<Map<String, Any?>>()
      val columnas = arrayOf(CallLog.Calls.DATE, CallLog.Calls.NUMBER, CallLog.Calls.CACHED_NAME, CallLog.Calls.TYPE, CallLog.Calls.DURATION)
      ctx.contentResolver.query(CallLog.Calls.CONTENT_URI, columnas, "${CallLog.Calls.DATE} > ?", arrayOf(desde.toLong().toString()), "${CallLog.Calls.DATE} ASC")?.use { c ->
        while (c.moveToNext() && out.size < 2000) {
          out.add(mapOf(
            "en" to c.getLong(0).toDouble(),
            "numero" to c.getString(1),
            "nombre" to c.getString(2),
            "tipo" to tipoDe(c.getInt(3)),
            "duracionS" to c.getLong(4).toDouble(),
          ))
        }
      }
      out
    }
  }
}
