package com.onlinecrm.gateway

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.PowerManager
import android.provider.Settings
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class PermissionsActivity : AppCompatActivity() {

    private val REQ_CALL_PERMS = 2001
    private val REQ_STORAGE_PERMS = 2002

    private lateinit var btnPermCalls: Button
    private lateinit var btnPermOverlay: Button
    private lateinit var btnPermBattery: Button
    private lateinit var btnPermStorage: Button
    private lateinit var btnProceedToLogin: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // If already setup and logged in, bypass directly to MainActivity
        val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
        if (prefs.getBoolean("is_logged_in", false) && areCorePermissionsGranted()) {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_permissions)

        btnPermCalls = findViewById(R.id.btnPermCalls)
        btnPermOverlay = findViewById(R.id.btnPermOverlay)
        btnPermBattery = findViewById(R.id.btnPermBattery)
        btnPermStorage = findViewById(R.id.btnPermStorage)
        btnProceedToLogin = findViewById(R.id.btnProceedToLogin)

        btnPermCalls.setOnClickListener {
            requestCallPermissions()
        }

        btnPermOverlay.setOnClickListener {
            requestOverlayPermission()
        }

        btnPermBattery.setOnClickListener {
            requestBatteryExemption()
        }

        btnPermStorage.setOnClickListener {
            requestStoragePermissions()
        }

        btnProceedToLogin.setOnClickListener {
            val intent = if (prefs.getBoolean("is_logged_in", false)) {
                Intent(this, MainActivity::class.java)
            } else {
                Intent(this, LoginActivity::class.java)
            }
            startActivity(intent)
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        updatePermissionButtonsState()
    }

    private fun areCorePermissionsGranted(): Boolean {
        val phoneState = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
        val callLog = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
        return phoneState && callLog
    }

    private fun updatePermissionButtonsState() {
        // 1. Calls & Call Log
        val hasCallPerms = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED
        setButtonStatus(btnPermCalls, hasCallPerms, "Надати дозвіл на дзвінки")

        // 2. Overlay
        val hasOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else true
        setButtonStatus(btnPermOverlay, hasOverlay, "Дозволити показ поверх додатків")

        // 3. Battery
        val hasBattery = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            pm.isIgnoringBatteryOptimizations(packageName)
        } else true
        setButtonStatus(btnPermBattery, hasBattery, "Вимкнути обмеження батареї")

        // 4. Storage / Audio
        val hasStorage = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager() || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO) == PackageManager.PERMISSION_GRANTED)
        } else {
            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
        }
        setButtonStatus(btnPermStorage, hasStorage, "Дозволити доступ до файлів записів")
    }

    private fun setButtonStatus(button: Button, granted: Boolean, defaultText: String) {
        if (granted) {
            button.text = "✅ Дозволено"
            button.setBackgroundColor(Color.parseColor("#059669"))
            button.isEnabled = false
        } else {
            button.text = defaultText
            button.isEnabled = true
        }
    }

    private fun requestCallPermissions() {
        val perms = mutableListOf(
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.READ_CALL_LOG,
            Manifest.permission.CALL_PHONE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        ActivityCompat.requestPermissions(this, perms.toTypedArray(), REQ_CALL_PERMS)
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                try {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:$packageName")
                    )
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "Відкрийте налаштування та надайте дозвіл оверлею", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun requestBatteryExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "Вимкніть обмеження фонової роботи в налаштуваннях", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun requestStoragePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                    return
                } catch (e: Exception) {
                    // Fallback to standard request below
                }
            }
        }

        val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        ActivityCompat.requestPermissions(this, perms, REQ_STORAGE_PERMS)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        updatePermissionButtonsState()
    }
}
