package com.onlinecrm.gateway

import android.content.Context
import android.database.Cursor
import android.provider.CallLog
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.*
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/**
 * Background WorkManager Sync Worker.
 * Resilient upload of call metadata and audio files.
 * Guarantees zero lost calls even when roaming or offline.
 */
class CallSyncWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "CallSyncWorker"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val phone = inputData.getString("phone") ?: return@withContext Result.failure()
        val direction = inputData.getString("direction") ?: "outbound"
        val duration = inputData.getInt("duration", 0)
        val status = inputData.getString("status") ?: "answered"
        val recordingPath = inputData.getString("recordingPath")
        val startedAt = inputData.getLong("startedAt", System.currentTimeMillis())
        val endedAt = inputData.getLong("endedAt", System.currentTimeMillis())

        val prefs = context.getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
        val rawServerUrl = prefs.getString("crm_server_url", "https://online-crm.onrender.com") ?: "https://online-crm.onrender.com"
        val serverUrl = if (rawServerUrl.contains("vercel.app")) "https://online-crm.onrender.com" else rawServerUrl.trim().removeSuffix("/")
        val userId = prefs.getString("crm_user_id", "usr-admin") ?: "usr-admin"
        val deviceToken = prefs.getString("device_token", "dev-" + UUID.randomUUID().toString()) ?: "dev-default"

        val callId = "call_${System.currentTimeMillis()}_${UUID.randomUUID().toString().substring(0, 6)}"

        try {
            // 1. Wait 1.5s for Android OS to flush call log to database
            kotlinx.coroutines.delay(1500)
            val (exactNumber, exactDuration, exactType, simSlot) = fetchCallLogEntry(context, phone, startedAt, endedAt)

            val rawPhone = if (!exactNumber.isNullOrEmpty() && exactNumber != "Unknown") exactNumber else phone
            val targetPhone = normalizePhoneNumber(rawPhone)
            val finalDuration = if (exactDuration > 0) exactDuration else (if (duration > 0) duration else Math.max(0, ((endedAt - startedAt) / 1000).toInt()))
            
            val finalDirection = when (exactType) {
                CallLog.Calls.INCOMING_TYPE, CallLog.Calls.MISSED_TYPE, CallLog.Calls.REJECTED_TYPE -> "inbound"
                CallLog.Calls.OUTGOING_TYPE -> "outbound"
                else -> direction
            }
            val finalStatus = when (exactType) {
                CallLog.Calls.MISSED_TYPE -> "missed"
                CallLog.Calls.REJECTED_TYPE -> "rejected"
                else -> if (finalDuration > 0) "answered" else (if (finalDirection == "inbound") "missed" else "answered")
            }

            Log.d(TAG, "Syncing call to CRM: $finalDirection call with $targetPhone ($finalDuration sec)...")

            // 2. Post Call Log Metadata
            val logPayload = JSONObject().apply {
                put("callId", callId)
                put("deviceToken", deviceToken)
                put("managerId", userId)
                put("callerPhone", targetPhone)
                put("destinationPhone", targetPhone)
                put("direction", finalDirection)
                put("duration", finalDuration)
                put("status", finalStatus)
                put("simSlot", simSlot)
                put("startedAt", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(java.util.Date(startedAt)))
                put("endedAt", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(java.util.Date(endedAt)))
            }

            val logResponse = postJson("$serverUrl/api/telephony/calls/log", logPayload.toString())
            val respJson = JSONObject(logResponse)
            val dealId = respJson.optString("dealId")

            Log.i(TAG, "Call log saved successfully. Deal ID: $dealId")

            // 2. Upload Audio Recording if available (with retry for asynchronous dialer disk flush)
            var finalRecordingPath = recordingPath
            if (finalRecordingPath.isNullOrEmpty() || !File(finalRecordingPath).exists()) {
                Log.d(TAG, "Recording path not ready yet. Waiting 2.5s for dialer to finalize audio file...")
                kotlinx.coroutines.delay(2500)
                finalRecordingPath = AudioRecordingScanner.findRecentRecording(context, phone, startedAt, endedAt)
                if (finalRecordingPath.isNullOrEmpty()) {
                    kotlinx.coroutines.delay(2000)
                    finalRecordingPath = AudioRecordingScanner.findRecentRecording(context, phone, startedAt, endedAt)
                }
            }

            if (!finalRecordingPath.isNullOrEmpty()) {
                val audioFile = File(finalRecordingPath)
                if (audioFile.exists() && audioFile.length() > 0) {
                    Log.d(TAG, "Uploading call recording file: ${audioFile.name} (${audioFile.length()} bytes)...")
                    uploadAudioMultipart(
                        urlStr = "$serverUrl/api/telephony/calls/upload-record",
                        file = audioFile,
                        callId = callId,
                        dealId = dealId,
                        phoneNumber = targetPhone,
                        duration = finalDuration
                    )
                    Log.i(TAG, "Call recording uploaded successfully!")

                    // 3. Auto-Cleanup local storage if enabled (default true to prevent clogging phone memory)
                    val autoDeleteLocal = prefs.getBoolean("auto_delete_local_recordings", true)
                    if (autoDeleteLocal) {
                        try {
                            val deleted = audioFile.delete()
                            Log.i(TAG, "Local audio file deleted to save phone memory: $deleted (${audioFile.name})")
                        } catch (e: Exception) {
                            Log.w(TAG, "Could not delete local recording file: ${e.message}")
                        }
                    }
                }
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to sync call to CRM. Will retry automatically.", e)
            Result.retry()
        }
    }

    private fun postJson(urlStr: String, jsonBody: String): String {
        val url = URL(urlStr)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
        conn.setRequestProperty("Accept", "application/json")
        conn.doOutput = true
        conn.connectTimeout = 15000
        conn.readTimeout = 15000

        OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
            writer.write(jsonBody)
            writer.flush()
        }

        val code = conn.responseCode
        val inputStream = if (code in 200..299) conn.inputStream else conn.errorStream
        val response = inputStream.bufferedReader().use { it.readText() }

        if (code !in 200..299) {
            throw IOException("Server returned HTTP $code: $response")
        }

        return response
    }

    private fun uploadAudioMultipart(
        urlStr: String,
        file: File,
        callId: String,
        dealId: String,
        phoneNumber: String,
        duration: Int
    ) {
        val boundary = "==Boundary_${System.currentTimeMillis()}=="
        val lineEnd = "\r\n"
        val twoHyphens = "--"

        val url = URL(urlStr)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
        conn.connectTimeout = 30000
        conn.readTimeout = 60000

        DataOutputStream(conn.outputStream).use { dos ->
            // Field: callId
            dos.writeBytes("$twoHyphens$boundary$lineEnd")
            dos.writeBytes("Content-Disposition: form-data; name=\"callId\"$lineEnd$lineEnd")
            dos.writeBytes("$callId$lineEnd")

            // Field: dealId
            dos.writeBytes("$twoHyphens$boundary$lineEnd")
            dos.writeBytes("Content-Disposition: form-data; name=\"dealId\"$lineEnd$lineEnd")
            dos.writeBytes("$dealId$lineEnd")

            // Field: phoneNumber
            dos.writeBytes("$twoHyphens$boundary$lineEnd")
            dos.writeBytes("Content-Disposition: form-data; name=\"phoneNumber\"$lineEnd$lineEnd")
            dos.writeBytes("$phoneNumber$lineEnd")

            // Field: duration
            dos.writeBytes("$twoHyphens$boundary$lineEnd")
            dos.writeBytes("Content-Disposition: form-data; name=\"duration\"$lineEnd$lineEnd")
            dos.writeBytes("$duration$lineEnd")

            // File: audio
            dos.writeBytes("$twoHyphens$boundary$lineEnd")
            dos.writeBytes("Content-Disposition: form-data; name=\"audio\"; filename=\"${file.name}\"$lineEnd")
            dos.writeBytes("Content-Type: audio/m4a$lineEnd$lineEnd")

            FileInputStream(file).use { fis ->
                val buffer = ByteArray(8192)
                var bytesRead: Int
                while (fis.read(buffer).also { bytesRead = it } != -1) {
                    dos.write(buffer, 0, bytesRead)
                }
            }

            dos.writeBytes(lineEnd)
            dos.writeBytes("$twoHyphens$boundary$twoHyphens$lineEnd")
            dos.flush()
        }

        val code = conn.responseCode
        if (code !in 200..299) {
            val err = conn.errorStream?.bufferedReader()?.use { it.readText() }
            throw IOException("Upload failed with HTTP $code: $err")
        }
    }

    private fun fetchCallLogEntry(
        context: Context,
        fallbackPhone: String,
        startedAt: Long,
        endedAt: Long
    ): Quadruple<String?, Int, Int, Int> {
        return try {
            val minDate = (startedAt - 20000).coerceAtLeast(0)
            val maxDate = endedAt + 20000
            val cursor: Cursor? = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.PHONE_ACCOUNT_ID
                ),
                "${CallLog.Calls.DATE} >= ? AND ${CallLog.Calls.DATE} <= ?",
                arrayOf(minDate.toString(), maxDate.toString()),
                "${CallLog.Calls.DATE} DESC"
            )
            cursor?.use {
                if (it.moveToFirst()) {
                    val num = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
                    val dur = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.DURATION))
                    val type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                    val simAcc = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.PHONE_ACCOUNT_ID))
                    val simId = (simAcc?.toIntOrNull() ?: 0) + 1
                    return Quadruple(num, dur, type, simId)
                }
            }
            Quadruple(fallbackPhone, 0, 0, 1)
        } catch (e: Exception) {
            Log.w(TAG, "Could not fetch call log entry: ${e.message}")
            Quadruple(fallbackPhone, 0, 0, 1)
        }
    }

    private fun normalizePhoneNumber(raw: String): String {
        val cleaned = raw.trim()
        val digits = cleaned.replace(Regex("\\D"), "")
        return when {
            digits.startsWith("380") && digits.length == 12 -> "+$digits"
            digits.startsWith("80") && digits.length == 11 -> "+3$digits"
            digits.startsWith("0") && digits.length == 10 -> "+38$digits"
            digits.length == 9 -> "+380$digits"
            cleaned.startsWith("+") -> "+$digits"
            digits.length >= 10 -> "+$digits"
            digits.isNotEmpty() -> "+380$digits"
            else -> raw
        }
    }

    data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
}
