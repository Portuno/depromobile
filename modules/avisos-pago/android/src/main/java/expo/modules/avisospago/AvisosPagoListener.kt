package expo.modules.avisospago

import android.app.Notification
import android.content.Context
import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject

/**
 * Los avisos de pago (Fragua #296). Android le pasa a este servicio cada notificación (con el permiso «Acceso a
 * notificaciones», que se da una vez); el permiso no se puede acotar por app, así que el filtro es este: solo se guarda
 * lo de las apps de pago y banco (la lista que fija la app, o un nombre de app que lo dice) y que trae un monto. Todo lo
 * demás se ignora sin guardarse. Lo guardado espera en el teléfono hasta que la app lo manda.
 */
class AvisosPagoListener : NotificationListenerService() {
  companion object {
    const val PREFS = "deprocast_avisos_pago"
    const val COLA = "cola"
    const val PAQUETES = "paquetes"
    // Mobile 2.3: lo que suena (de los avisos de reproducción de las apps de música).
    const val SONANDO = "sonando"
    private val MUSICA = Regex("(?i)spotify|apps\\.youtube\\.music|deezer|soundcloud|tidal|amazon\\.mp3|apple\\.android\\.music|music")
    private val NOMBRE_DE_PAGO = Regex("(?i)\\b(bank|banco|banca|pay|wallet|billetera|card|tarjeta|revolut|n26|bbva|santander|caixa|ing\\b|sabadell|bankinter|openbank|mercado ?pago|belo|wise|ual[aá]|brubank|naranja|galicia|lemon|prex)")
    // El signo pesos va escapado para Kotlin (\$) y para la expresión regular (\\): «\\\$».
    private val MONTO = Regex("(€|EUR|US\\\$|USD|U\\\$S|\\\$|ARS|USDC|USDT)\\s?\\d|\\d[\\d.,]*\\s?(€|EUR|USD|ARS|pesos|euros|d[oó]lares)", RegexOption.IGNORE_CASE)

    fun cola(ctx: Context): JSONArray = try { JSONArray(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(COLA, "[]")) } catch (_: Exception) { JSONArray() }
    fun guardarCola(ctx: Context, a: JSONArray) { ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(COLA, a.toString()).apply() }
    fun paquetes(ctx: Context): Set<String> = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getStringSet(PAQUETES, emptySet()) ?: emptySet()
    fun sonando(ctx: Context): JSONArray = try { JSONArray(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(SONANDO, "[]")) } catch (_: Exception) { JSONArray() }
    fun guardarSonando(ctx: Context, a: JSONArray) { ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(SONANDO, a.toString()).apply() }
  }

  /** Un aviso de reproducción de una app de música: el tema y el artista (solo si cambió desde el último). */
  private fun anotarSonando(n: StatusBarNotification): Boolean {
    val esMedia = n.notification.extras.containsKey(Notification.EXTRA_MEDIA_SESSION) || n.notification.category == Notification.CATEGORY_TRANSPORT
    if (!esMedia || !MUSICA.containsMatchIn(n.packageName)) return false
    val extras = n.notification.extras
    val tema = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: return true
    val artista = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
    if (tema.isEmpty()) return true
    val c = sonando(this)
    val ultimo = if (c.length() > 0) c.optJSONObject(c.length() - 1) else null
    if (ultimo != null && ultimo.optString("tema") == tema && ultimo.optString("artista") == artista) return true
    c.put(JSONObject().put("paquete", n.packageName).put("app", nombreDe(n.packageName)).put("tema", tema.take(200)).put("artista", artista.take(200)).put("en", System.currentTimeMillis().toDouble()))
    val recortada = if (c.length() > 500) JSONArray().also { r -> for (i in c.length() - 500 until c.length()) r.put(c.get(i)) } else c
    guardarSonando(this, recortada)
    return true
  }

  private fun nombreDe(paquete: String): String = try {
    val pm = packageManager
    pm.getApplicationLabel(pm.getApplicationInfo(paquete, PackageManager.GET_META_DATA)).toString()
  } catch (_: Exception) { paquete }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val n = sbn ?: return
    try {
      if (n.packageName == packageName) return
      if (anotarSonando(n)) return
      if ((n.notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return
      val app = nombreDe(n.packageName)
      if (n.packageName !in paquetes(this) && !NOMBRE_DE_PAGO.containsMatchIn(app) && !NOMBRE_DE_PAGO.containsMatchIn(n.packageName)) return
      val extras = n.notification.extras
      val titulo = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
      val texto = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString() ?: ""
      if (!MONTO.containsMatchIn("$titulo $texto")) return
      val c = cola(this)
      // El mismo aviso (que la app vuelve a publicar al actualizarlo) no entra dos veces.
      for (i in 0 until c.length()) {
        val x = c.optJSONObject(i) ?: continue
        if (x.optString("paquete") == n.packageName && x.optString("titulo") == titulo && x.optString("texto") == texto) return
      }
      c.put(JSONObject().put("paquete", n.packageName).put("app", app).put("titulo", titulo.take(200)).put("texto", texto.take(600)).put("en", n.postTime.toDouble()))
      // Como mucho los últimos 300 (si la app no los pudo mandar por días).
      val recortada = if (c.length() > 300) JSONArray().also { r -> for (i in c.length() - 300 until c.length()) r.put(c.get(i)) } else c
      guardarCola(this, recortada)
    } catch (_: Exception) { /* un aviso raro no tumba el servicio */ }
  }
}
