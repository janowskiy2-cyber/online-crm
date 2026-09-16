package com.onlinecrm.gateway

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

class LoginActivity : AppCompatActivity() {

    private lateinit var etServerUrl: EditText
    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnLogin: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var tvError: TextView

    private val activityScope = CoroutineScope(Dispatchers.Main + Job())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check if already logged in
        val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
        if (prefs.getBoolean("is_logged_in", false)) {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_login)

        etServerUrl = findViewById(R.id.etLoginServerUrl)
        etEmail = findViewById(R.id.etLoginEmail)
        etPassword = findViewById(R.id.etLoginPassword)
        btnLogin = findViewById(R.id.btnLoginSubmit)
        progressBar = findViewById(R.id.loginProgressBar)
        tvError = findViewById(R.id.tvLoginError)

        val savedUrl = prefs.getString("crm_server_url", "https://online-crm-alpha.vercel.app")
        etServerUrl.setText(savedUrl)

        btnLogin.setOnClickListener {
            performLogin()
        }
    }

    private fun performLogin() {
        val serverUrl = etServerUrl.text.toString().trim().removeSuffix("/")
        val email = etEmail.text.toString().trim()
        val password = etPassword.text.toString().trim()

        if (serverUrl.isEmpty() || email.isEmpty() || password.isEmpty()) {
            showError("Будь ласка, заповніть усі поля")
            return
        }

        progressBar.visibility = View.VISIBLE
        btnLogin.isEnabled = false
        tvError.visibility = View.GONE

        activityScope.launch {
            try {
                val loginResult = withContext(Dispatchers.IO) {
                    executeLoginRequest(serverUrl, email, password)
                }

                if (loginResult != null) {
                    val token = loginResult.optString("token")
                    val userObj = loginResult.optJSONObject("user")
                    val userId = userObj?.optString("id") ?: "usr-admin"
                    val userName = userObj?.optString("name") ?: email

                    val prefs = getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
                    var deviceToken = prefs.getString("device_token", null)
                    if (deviceToken == null) {
                        deviceToken = "dev-" + UUID.randomUUID().toString()
                    }

                    prefs.edit()
                        .putBoolean("is_logged_in", true)
                        .putString("crm_server_url", serverUrl)
                        .putString("crm_user_id", userId)
                        .putString("crm_user_name", userName)
                        .putString("crm_user_email", email)
                        .putString("jwt_token", token)
                        .putString("device_token", deviceToken)
                        .apply()

                    // Register device on CRM server
                    withContext(Dispatchers.IO) {
                        registerDeviceOnServer(serverUrl, userId, userName, deviceToken)
                    }

                    Toast.makeText(this@LoginActivity, "Вітаємо, $userName!", Toast.LENGTH_SHORT).show()
                    startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                    finish()
                } else {
                    showError("Невірний email або пароль")
                }
            } catch (e: Exception) {
                showError("Помилка зв'язку з сервером: ${e.message}")
            } finally {
                progressBar.visibility = View.GONE
                btnLogin.isEnabled = true
            }
        }
    }

    private fun executeLoginRequest(serverUrl: String, email: String, pass: String): JSONObject? {
        val url = URL("$serverUrl/api/auth/login")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 10000
        conn.readTimeout = 10000

        val payload = JSONObject().apply {
            put("email", email)
            put("password", pass)
        }

        OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

        if (conn.responseCode in 200..299) {
            val resp = conn.inputStream.bufferedReader().use { it.readText() }
            return JSONObject(resp)
        }
        return null
    }

    private fun registerDeviceOnServer(serverUrl: String, userId: String, userName: String, deviceToken: String) {
        try {
            val url = URL("$serverUrl/api/telephony/device/register")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 8000

            val payload = JSONObject().apply {
                put("userId", userId)
                put("deviceName", "${android.os.Build.MANUFACTURER.capitalize()} ${android.os.Build.MODEL} ($userName)")
                put("deviceToken", deviceToken)
                put("appVersion", "2.0.0")
            }

            OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
            conn.responseCode
        } catch (e: Exception) {
            // Ignore background ping fail
        }
    }

    private fun showError(msg: String) {
        tvError.text = msg
        tvError.visibility = View.VISIBLE
    }

    override fun onDestroy() {
        activityScope.cancel()
        super.onDestroy()
    }
}
