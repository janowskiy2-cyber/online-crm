package com.onlinecrm.gateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.provider.CallLog
import android.telephony.TelephonyManager
import android.util.Log
import androidx.work.*
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * Event-Driven Call State Receiver v2.0
 * Includes:
 * - Dual-SIM Filtering (SIM 1 / SIM 2 / All)
 * - Work Hours Scheduling
 * - Personal Number Blacklist
 * - Caller ID Overlay trigger
 * - 0% Idle Battery Drain
 */
class CallReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallReceiver"
        private var lastState = TelephonyManager.CALL_STATE_IDLE
        private var callStartTime: Long = 0
        private var isIncoming = false
        private var savedNumber: String? = null
    }

    override fun onReceive(context: Context, intent: Intent) {
        val prefs = context.getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)
        
        // 1. Master Switch Check
        if (!prefs.getBoolean("sync_enabled", true)) {
            return
        }

        if (intent.action == Intent.ACTION_NEW_OUTGOING_CALL) {
            savedNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
            isIncoming = false
            return
        }

        if (intent.action == TelephonyManager.ACTION_PHONE_STATE_CHANGED) {
            val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            val incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
            if (!incomingNumber.isNullOrEmpty()) {
                savedNumber = incomingNumber
            }

            var state = TelephonyManager.CALL_STATE_IDLE
            if (stateStr == TelephonyManager.EXTRA_STATE_RINGING) {
                state = TelephonyManager.CALL_STATE_RINGING
            } else if (stateStr == TelephonyManager.EXTRA_STATE_OFFHOOK) {
                state = TelephonyManager.CALL_STATE_OFFHOOK
            }

            onCustomCallStateChanged(context, state, savedNumber)
        }
    }

    private fun onCustomCallStateChanged(context: Context, state: Int, number: String?) {
        if (lastState == state) {
            return
        }

        when (state) {
            TelephonyManager.CALL_STATE_RINGING -> {
                isIncoming = true
                callStartTime = System.currentTimeMillis()
                Log.d(TAG, "Incoming call ringing: $number")

                // Trigger Caller ID Floating Card if enabled
                if (!number.isNullOrEmpty()) {
                    val overlayIntent = Intent(context, CallerIdOverlayService::class.java).apply {
                        action = "SHOW_CALLER_ID"
                        putExtra("phone", number)
                    }
                    context.startService(overlayIntent)
                }
            }
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                if (lastState != TelephonyManager.CALL_STATE_RINGING) {
                    isIncoming = false
                    callStartTime = System.currentTimeMillis()
                    Log.d(TAG, "Outgoing call started: $number")
                } else {
                    Log.d(TAG, "Incoming call answered: $number")
                }
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                // Dismiss Caller ID Overlay
                val hideIntent = Intent(context, CallerIdOverlayService::class.java).apply {
                    action = "HIDE_CALLER_ID"
                }
                context.startService(hideIntent)

                val callEndTime = System.currentTimeMillis()
                val roughDurationSec = if (callStartTime > 0) ((callEndTime - callStartTime) / 1000).toInt() else 0

                // Fetch details from Android CallLog
                val (exactNumber, exactDuration, callType, simId) = fetchLastCallDetails(context, number)
                val targetPhone = exactNumber ?: number ?: "Unknown"

                // 2. Privacy Checks: Blacklist, Work Hours, Dual-SIM
                val prefs = context.getSharedPreferences("crm_gateway_prefs", Context.MODE_PRIVATE)

                if (isBlacklisted(prefs, targetPhone)) {
                    Log.i(TAG, "Call with $targetPhone is in Blacklist. Skipping sync.")
                    resetState()
                    return
                }

                if (!isWithinWorkHours(prefs)) {
                    Log.i(TAG, "Call is outside of configured work hours. Skipping sync.")
                    resetState()
                    return
                }

                if (!isAllowedSimSlot(prefs, simId)) {
                    Log.i(TAG, "Call was made on non-work SIM card ($simId). Skipping sync.")
                    resetState()
                    return
                }

                val direction = if (isIncoming) "inbound" else "outbound"
                val status = when (callType) {
                    CallLog.Calls.MISSED_TYPE -> "missed"
                    CallLog.Calls.REJECTED_TYPE -> "rejected"
                    else -> if (exactDuration > 0) "answered" else "missed"
                }

                val recordingPath = AudioRecordingScanner.findRecentRecording(context, callStartTime, callEndTime)

                scheduleCallSync(
                    context = context,
                    phone = targetPhone,
                    direction = direction,
                    duration = if (exactDuration > 0) exactDuration else roughDurationSec,
                    status = status,
                    recordingPath = recordingPath,
                    startedAt = callStartTime,
                    endedAt = callEndTime
                )

                resetState()
            }
        }
        lastState = state
    }

    private fun resetState() {
        callStartTime = 0
        savedNumber = null
    }

    private fun isBlacklisted(prefs: android.content.SharedPreferences, phone: String): Boolean {
        val blacklistStr = prefs.getString("blacklist_phones", "") ?: ""
        if (blacklistStr.isEmpty()) return false
        val cleanTarget = phone.replace(Regex("\\D"), "")
        return blacklistStr.split(",", ";", "\n").any {
            val cleanItem = it.trim().replace(Regex("\\D"), "")
            cleanItem.isNotEmpty() && cleanTarget.contains(cleanItem)
        }
    }

    private fun isWithinWorkHours(prefs: android.content.SharedPreferences): Boolean {
        if (!prefs.getBoolean("work_hours_enabled", false)) return true
        val cal = Calendar.getInstance()
        val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
        // Check if weekend (Saturday or Sunday)
        if (dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY) {
            return false
        }
        val hour = cal.get(Calendar.HOUR_OF_DAY)
        val startHour = prefs.getInt("work_hours_start", 9)
        val endHour = prefs.getInt("work_hours_end", 19)
        return hour in startHour until endHour
    }

    private fun isAllowedSimSlot(prefs: android.content.SharedPreferences, simId: Int): Boolean {
        val targetSlot = prefs.getInt("active_sim_slot", 0) // 0 = All, 1 = SIM 1, 2 = SIM 2
        if (targetSlot == 0) return true
        // If system could not determine SIM slot, allow it
        if (simId < 0) return true
        val normalizedSlot = simId + 1 // 0-based to 1-based
        return normalizedSlot == targetSlot
    }

    private fun fetchLastCallDetails(context: Context, fallbackNumber: String?): Quadruple<String?, Int, Int, Int> {
        return try {
            val cursor: Cursor? = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.PHONE_ACCOUNT_ID
                ),
                null,
                null,
                "${CallLog.Calls.DATE} DESC"
            )
            cursor?.use {
                if (it.moveToFirst()) {
                    val num = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
                    val dur = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.DURATION))
                    val type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                    val simAcc = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.PHONE_ACCOUNT_ID))
                    val simId = simAcc?.toIntOrNull() ?: -1
                    return Quadruple(num, dur, type, simId)
                }
            }
            Quadruple(fallbackNumber, 0, CallLog.Calls.OUTGOING_TYPE, -1)
        } catch (e: Exception) {
            Quadruple(fallbackNumber, 0, CallLog.Calls.OUTGOING_TYPE, -1)
        }
    }

    private fun scheduleCallSync(
        context: Context,
        phone: String,
        direction: String,
        duration: Int,
        status: String,
        recordingPath: String?,
        startedAt: Long,
        endedAt: Long
    ) {
        val inputData = workDataOf(
            "phone" to phone,
            "direction" to direction,
            "duration" to duration,
            "status" to status,
            "recordingPath" to (recordingPath ?: ""),
            "startedAt" to startedAt,
            "endedAt" to endedAt
        )

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncWorkRequest = OneTimeWorkRequestBuilder<CallSyncWorker>()
            .setConstraints(constraints)
            .setInputData(inputData)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
            .build()

        WorkManager.getInstance(context).enqueue(syncWorkRequest)
    }

    data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
}
