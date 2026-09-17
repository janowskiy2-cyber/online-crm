package com.onlinecrm.gateway

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.*
import android.widget.TextView
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class CallerIdOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == "SHOW_CALLER_ID") {
            val phone = intent.getStringExtra("phone")
            if (!phone.isNullOrEmpty()) {
                showOverlay(phone)
            }
        } else if (action == "HIDE_CALLER_ID") {
            hideOverlay()
        }
        return START_NOT_STICKY
    }

    private fun showOverlay(phone: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            return
        }

        hideOverlay() // Clear previous if any

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val inflater = LayoutInflater.from(this)
        overlayView = inflater.inflate(R.layout.overlay_caller_id, null)

        val tvClientName = overlayView?.findViewById<TextView>(R.id.tvOverlayClientName)
        val tvCompany = overlayView?.findViewById<TextView>(R.id.tvOverlayCompany)
        val tvDealInfo = overlayView?.findViewById<TextView>(R.id.tvOverlayDealInfo)
        val tvLastNote = overlayView?.findViewById<TextView>(R.id.tvOverlayLastNote)
        val btnClose = overlayView?.findViewById<View>(R.id.btnOverlayClose)

        tvClientName?.text = "Пошук в CRM: $phone..."
        btnClose?.setOnClickListener { hideOverlay() }

        val layoutParamsType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutParamsType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = 120
        }

        try {
            windowManager?.addView(overlayView, params)
        } catch (e: Exception) {
            return
        }

        // Fetch Caller Data from CRM API
        serviceScope.launch {
            val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
            val rawServerUrl = prefs.getString("crm_server_url", "https://online-crm.onrender.com") ?: "https://online-crm.onrender.com"
            val serverUrl = if (rawServerUrl.contains("vercel.app")) "https://online-crm.onrender.com" else rawServerUrl.trim().removeSuffix("/")

            val callerData = withContext(Dispatchers.IO) {
                fetchCallerInfo(serverUrl, phone)
            }

            if (callerData != null && callerData.optBoolean("found", false)) {
                val name = callerData.optString("contactName", phone)
                val comp = callerData.optString("companyName", "")
                val deal = callerData.optString("dealTitle", "")
                val budget = callerData.optInt("dealBudget", 0)
                val stage = callerData.optString("stageName", "")
                val note = callerData.optString("lastNoteContent", "")

                tvClientName?.text = "👤 $name"
                tvCompany?.text = if (comp.isNotEmpty()) "🏢 $comp" else "Новий лід"
                tvCompany?.visibility = View.VISIBLE

                if (deal.isNotEmpty()) {
                    tvDealInfo?.text = "💰 $deal • $stage ($budget ₴)"
                    tvDealInfo?.visibility = View.VISIBLE
                }

                if (note.isNotEmpty()) {
                    tvLastNote?.text = "📌 $note"
                    tvLastNote?.visibility = View.VISIBLE
                }
            } else {
                tvClientName?.text = "Новий контакт (+${phone.replace(Regex("\\D"), "")})"
                tvCompany?.text = "Угоди ще не створено"
            }
        }
    }

    private fun fetchCallerInfo(serverUrl: String, phone: String): JSONObject? {
        return try {
            val url = URL("$serverUrl/api/telephony/caller-info?phone=${phone.replace(Regex("\\D"), "")}")
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 4000
            conn.readTimeout = 4000
            if (conn.responseCode in 200..299) {
                val resp = conn.inputStream.bufferedReader().use { it.readText() }
                JSONObject(resp)
            } else null
        } catch (e: Exception) {
            null
        }
    }

    private fun hideOverlay() {
        if (overlayView != null && windowManager != null) {
            try {
                windowManager?.removeView(overlayView)
            } catch (e: Exception) {}
            overlayView = null
        }
    }

    override fun onDestroy() {
        hideOverlay()
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
