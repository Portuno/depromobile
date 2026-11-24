package expo.modules.contextotelefono

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.net.wifi.WifiManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * El contexto del teléfono (Mobile 2.3): a qué wifi está conectado y qué dispositivos de audio Bluetooth tiene (el auto,
 * los auriculares). La wifi necesita el permiso de ubicación (Android la trata como ubicación); sin él, null. Los de audio
 * salen de AudioManager, que no pide permiso de Bluetooth. Nada más: ni redes cercanas ni otros dispositivos.
 */
class ContextoTelefonoModule : Module() {
  private val contexto: Context?
    get() = appContext.reactContext

  private fun wifi(ctx: Context): String? = try {
    val wm = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    @Suppress("DEPRECATION")
    val ssid = wm?.connectionInfo?.ssid
    if (ssid == null || ssid == "<unknown ssid>" || ssid.isBlank()) null else ssid.trim('"')
  } catch (_: Exception) { null }

  private fun audioBluetooth(ctx: Context): List<String> = try {
    val am = ctx.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    val tipos = setOf(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLUETOOTH_SCO, 26 /* BLE_HEADSET */, 27 /* BLE_SPEAKER */)
    (am?.getDevices(AudioManager.GET_DEVICES_OUTPUTS) ?: emptyArray())
      .filter { it.type in tipos }
      .map { it.productName?.toString() ?: "Bluetooth" }
      .distinct()
  } catch (_: Exception) { emptyList() }

  override fun definition() = ModuleDefinition {
    Name("ContextoTelefono")

    // { wifi: "Casa" | null, bt: ["Car Multimedia"] }
    Function("leer") {
      val ctx = contexto ?: return@Function null
      mapOf("wifi" to wifi(ctx), "bt" to audioBluetooth(ctx))
    }
  }
}
