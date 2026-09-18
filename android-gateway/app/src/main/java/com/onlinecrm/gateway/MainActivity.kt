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
import android.util.Log
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private val PERMISSIONS_REQUEST_CODE = 1001

    private lateinit var tvGatewayStatus: TextView
    private lateinit var tvManagerInfo: TextView
    private lateinit var tvServerInfo: TextView

    private lateinit var switchSyncEnabled: SwitchCompat
    private lateinit var rgSimFilter: RadioGroup
    private lateinit var rbSimAll: RadioButton
    private lateinit var rbSim1: RadioButton
    private lateinit var rbSim2: RadioButton

    private lateinit var switchWorkHours: SwitchCompat
    private lateinit var etWorkStartHour: EditText
    private lateinit var etWorkEndHour: EditText

    private lateinit var etBlacklist: EditText
    private lateinit var btnOverlayPermission: Button
    private lateinit var switchAutoDeleteRecordings: SwitchCompat

    private lateinit var btnSaveSettings: Button
    private lateinit var btnOpenCrm: Button
    private lateinit var btnLogout: Button
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
            if (!prefs.getBoolean("is_logged_in", false)) {
                startActivity(Intent(this, LoginActivity::class.java))
                finish()
                return
            }

            setContentView(R.layout.activity_main)

            initViews()
            loadSettings()
            checkAndRequestPermissions()
            startGatewayService()
            requestBatteryOptimizationExemption()
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to initialize MainActivity: ${e.message}", e)
            Toast.makeText(this, "Помилка запуску шлюзу: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun initViews() {
        tvGatewayStatus = findViewById(R.id.tvGatewayStatus)
        tvManagerInfo = findViewById(R.id.tvManagerInfo)
        tvServerInfo = findViewById(R.id.tvServerInfo)

        switchSyncEnabled = findViewById(R.id.switchSyncEnabled)
        rgSimFilter = findViewById(R.id.rgSimFilter)
        rbSimAll = findViewById(R.id.rbSimAll)
        rbSim1 = findViewById(R.id.rbSim1)
        rbSim2 = findViewById(R.id.rbSim2)

        switchWorkHours = findViewById(R.id.switchWorkHours)
        etWorkStartHour = findViewById(R.id.etWorkStartHour)
        etWorkEndHour = findViewById(R.id.etWorkEndHour)

        etBlacklist = findViewById(R.id.etBlacklist)
        btnOverlayPermission = findViewById(R.id.btnOverlayPermission)
        switchAutoDeleteRecordings = findViewById(R.id.switchAutoDeleteRecordings)

        btnSaveSettings = findViewById(R.id.btnSaveSettings)
        btnOpenCrm = findViewById(R.id.btnOpenCrm)
        btnLogout = findViewById(R.id.btnLogout)
        webView = findViewById(R.id.webView)

        btnSaveSettings.setOnClickListener {
            saveSettings()
        }

        btnOpenCrm.setOnClickListener {
            toggleCrmWebView()
        }

        btnLogout.setOnClickListener {
            logout()
        }

        btnOverlayPermission.setOnClickListener {
            requestOverlayPermission()
        }

        switchSyncEnabled.setOnCheckedChangeListener { _, isChecked ->
            updateStatusText(isChecked)
        }
    }

    private fun loadSettings() {
        val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
        val userName = prefs.getString("crm_user_name", "Користувач")
        val userEmail = prefs.getString("crm_user_email", "")
        val serverUrl = prefs.getString("crm_server_url", "https://online-crm-alpha.vercel.app")

        tvManagerInfo.text = "Менеджер: $userName ($userEmail)"
        tvServerInfo.text = "Сервер: $serverUrl"

        val syncEnabled = prefs.getBoolean("sync_enabled", true)
        switchSyncEnabled.isChecked = syncEnabled
        updateStatusText(syncEnabled)

        when (prefs.getInt("active_sim_slot", 0)) {
            1 -> rbSim1.isChecked = true
            2 -> rbSim2.isChecked = true
            else -> rbSimAll.isChecked = true
        }

        switchWorkHours.isChecked = prefs.getBoolean("work_hours_enabled", false)
        etWorkStartHour.setText(prefs.getInt("work_hours_start", 9).toString())
        etWorkEndHour.setText(prefs.getInt("work_hours_end", 19).toString())

        etBlacklist.setText(prefs.getString("blacklist_phones", ""))
        switchAutoDeleteRecordings.isChecked = prefs.getBoolean("auto_delete_local_recordings", true)
    }

    private fun saveSettings() {
        val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
        val simSlot = when (rgSimFilter.checkedRadioButtonId) {
            R.id.rbSim1 -> 1
            R.id.rbSim2 -> 2
            else -> 0
        }

        val startHour = etWorkStartHour.text.toString().toIntOrNull() ?: 9
        val endHour = etWorkEndHour.text.toString().toIntOrNull() ?: 19

        prefs.edit()
            .putBoolean("sync_enabled", switchSyncEnabled.isChecked)
            .putInt("active_sim_slot", simSlot)
            .putBoolean("work_hours_enabled", switchWorkHours.isChecked)
            .putInt("work_hours_start", startHour)
            .putInt("work_hours_end", endHour)
            .putString("blacklist_phones", etBlacklist.text.toString().trim())
            .putBoolean("auto_delete_local_recordings", switchAutoDeleteRecordings.isChecked)
            .apply()

        updateStatusText(switchSyncEnabled.isChecked)
        Toast.makeText(this, "✅ Налаштування збережено!", Toast.LENGTH_SHORT).show()
    }

    private fun updateStatusText(enabled: Boolean) {
        if (enabled) {
            tvGatewayStatus.text = "🟢 Шлюз активний (Синхронізація увімкнена)"
            tvGatewayStatus.setTextColor(ContextCompat.getColor(this, android.R.color.holo_green_light))
        } else {
            tvGatewayStatus.text = "🔴 Шлюз на паузі (Синхронізація вимкнена)"
            tvGatewayStatus.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_light))
        }
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
            } else {
                Toast.makeText(this, "Дозвіл вже надано!", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun logout() {
        val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("is_logged_in", false)
            .remove("jwt_token")
            .apply()

        // Stop foreground service
        stopService(Intent(this, TelephonyGatewayService::class.java))

        Toast.makeText(this, "Ви вийшли з акаунту", Toast.LENGTH_SHORT).show()
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }

    private fun toggleCrmWebView() {
        if (webView.visibility == View.VISIBLE) {
            webView.visibility = View.GONE
            btnOpenCrm.text = "🌐 Відкрити інтерфейс CRM"
        } else {
            val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
            val serverUrl = prefs.getString("crm_server_url", "https://online-crm-alpha.vercel.app") ?: "https://online-crm-alpha.vercel.app"

            webView.visibility = View.VISIBLE
            btnOpenCrm.text = "❌ Закрити CRM"

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
        try {
            val serviceIntent = Intent(this, TelephonyGatewayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to start TelephonyGatewayService: ${e.message}", e)
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

