package com.onlinecrm.gateway

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private val PERMISSIONS_REQUEST_CODE = 1001

    private lateinit var tvStatus: TextView
    private lateinit var tvManagerName: TextView
    private lateinit var etServerUrl: EditText
    private lateinit var etUserId: EditText
    private lateinit var btnSaveConfig: Button
    private lateinit var btnOpenCrm: Button
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus = findViewById(R.id.tvStatus)
        tvManagerName = findViewById(R.id.tvManagerName)
        etServerUrl = findViewById(R.id.etServerUrl)
        etUserId = findViewById(R.id.etUserId)
        btnSaveConfig = findViewById(R.id.btnSaveConfig)
        btnOpenCrm = findViewById(R.id.btnOpenCrm)
        webView = findViewById(R.id.webView)

        loadSavedConfig()
        checkAndRequestPermissions()
        startGatewayService()

        btnSaveConfig.setOnClickListener {
            saveConfig()
        }

        btnOpenCrm.setOnClickListener {
            toggleCrmWebView()
        }

        requestBatteryOptimizationExemption()
    }

    private fun loadSavedConfig() {
        val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("crm_server_url", "https://online-crm-alpha.vercel.app")
        val userId = prefs.getString("crm_user_id", "usr-admin")
        val userName = prefs.getString("crm_user_name", "Адміністратор")

        etServerUrl.setText(serverUrl)
        etUserId.setText(userId)
        tvManagerName.text = "Менеджер: $userName ($userId)"
        tvStatus.text = "🟢 GSM Шлюз активний (SIM 1)"
    }

    private fun saveConfig() {
        val serverUrl = etServerUrl.text.toString().trim()
        val userId = etUserId.text.toString().trim()

        if (serverUrl.isEmpty() || userId.isEmpty()) {
            Toast.makeText(this, "Заповніть всі поля", Toast.LENGTH_SHORT).show()
            return
        }

        val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("crm_server_url", serverUrl)
            .putString("crm_user_id", userId)
            .apply()

        Toast.makeText(this, "Налаштування збережено!", Toast.LENGTH_SHORT).show()
        loadSavedConfig()
        startGatewayService()
    }

    private fun toggleCrmWebView() {
        if (webView.visibility == View.VISIBLE) {
            webView.visibility = View.GONE
            btnOpenCrm.text = "Відкрити інтерфейс CRM"
        } else {
            val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
            val serverUrl = prefs.getString("crm_server_url", "https://online-crm-alpha.vercel.app") ?: "https://online-crm-alpha.vercel.app"

            webView.visibility = View.VISIBLE
            btnOpenCrm.text = "Закрити CRM"

            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
            }
            webView.webViewClient = WebViewClient()
            webView.loadUrl(serverUrl)
        }
    }

    private fun startGatewayService() {
        val serviceIntent = Intent(this, TelephonyGatewayService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.READ_CALL_LOG,
            Manifest.permission.CALL_PHONE
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
            permissions.add(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }

        val notGranted = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (notGranted.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, notGranted.toTypedArray(), PERMISSIONS_REQUEST_CODE)
        }
    }

    private fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    // Ignore if restricted by OEM
                }
            }
        }
    }
}
