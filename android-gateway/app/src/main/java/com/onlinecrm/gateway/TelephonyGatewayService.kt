package com.onlinecrm.gateway

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject

/**
 * Foreground Service for Telephony Gateway.
 * Keeps connection to CRM Socket for Click-to-Call commands.
 * Minimal battery footprint.
 */
class TelephonyGatewayService : Service() {

    companion object {
        private const val TAG = "TelephonyService"
        private const val CHANNEL_ID = "crm_telephony_channel"
        private const val NOTIFICATION_ID = 101
    }

    private var socket: Socket? = null

    override fun onCreate() {
        super.onCreate()
        try {
            createNotificationChannel()
            val notification = buildNotification("Синхронізація дзвінків активна")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground service: ${e.message}", e)
        }

        try {
            connectSocket()
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing socket: ${e.message}", e)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    private fun connectSocket() {
        val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
        val rawServerUrl = prefs.getString("crm_server_url", "https://online-crm.onrender.com") ?: "https://online-crm.onrender.com"
        val serverUrl = if (rawServerUrl.contains("vercel.app")) "https://online-crm.onrender.com" else rawServerUrl.trim().removeSuffix("/")
        val userId = prefs.getString("crm_user_id", "usr-admin") ?: "usr-admin"

        try {
            val opts = IO.Options().apply {
                reconnection = true
                reconnectionAttempts = Int.MAX_VALUE
                reconnectionDelay = 3000
                timeout = 20000
                transports = arrayOf("websocket", "polling")
            }

            socket = IO.socket(serverUrl, opts).apply {
                on(Socket.EVENT_CONNECT) {
                    Log.i(TAG, "Socket connected to CRM server ($serverUrl)")
                    emit("register_device", JSONObject().apply {
                        put("userId", userId)
                    })
                }

                on(Socket.EVENT_CONNECT_ERROR) { args ->
                    Log.w(TAG, "Socket connect error: ${args.getOrNull(0)}")
                }

                // Click-to-Call event received from Web CRM desktop
                on("sim_dial_request") { args ->
                    if (args.isNotEmpty()) {
                        val data = args[0] as? JSONObject
                        val targetNumber = data?.optString("phoneNumber")
                        val targetManagerId = data?.optString("managerId")

                        // Verify this call is for this manager
                        if (!targetNumber.isNullOrEmpty() && (targetManagerId.isNullOrEmpty() || targetManagerId == userId)) {
                            Log.i(TAG, "Click-to-Call command received for: $targetNumber")
                            initiatePhoneDial(targetNumber)
                        }
                    }
                }

                on(Socket.EVENT_DISCONNECT) {
                    Log.w(TAG, "Socket disconnected from CRM")
                }

                connect()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect socket", e)
        }
    }

    private fun initiatePhoneDial(phoneNumber: String) {
        try {
            val intent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:$phoneNumber")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
        } catch (e: SecurityException) {
            // Fallback to dialer if CALL_PHONE permission is not granted
            val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:$phoneNumber")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(dialIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start phone call", e)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "OnlineCRM Телефонія",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Фоновий моніторинг викликів SIM-карти для CRM"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("OnlineCRM GSM Шлюз")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_call_service)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        socket?.disconnect()
        socket?.close()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
