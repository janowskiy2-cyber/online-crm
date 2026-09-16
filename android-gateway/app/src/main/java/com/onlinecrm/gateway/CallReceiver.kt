package com.onlinecrm.gateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.provider.CallLog
import android.telephony.TelephonyManager
import android.util.Log
import androidx.work.*
import java.util.concurrent.TimeUnit

/**
 * Event-Driven Call State Receiver
 * Woken up by Android OS ONLY during call state changes.
 * Consumes 0% CPU and 0% Battery while idling.
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
                // Call ended or missed!
                val callEndTime = System.currentTimeMillis()
                val roughDurationSec = if (callStartTime > 0) ((callEndTime - callStartTime) / 1000).toInt() else 0
                
                Log.d(TAG, "Call finished. Investigating call log for exact details...")
                
                // Fetch exact metadata from Android CallLog
                val (exactNumber, exactDuration, callType) = fetchLastCallDetails(context, number)
                val direction = if (isIncoming) "inbound" else "outbound"
                val status = when (callType) {
                    CallLog.Calls.MISSED_TYPE -> "missed"
                    CallLog.Calls.REJECTED_TYPE -> "rejected"
                    else -> if (exactDuration > 0) "answered" else "missed"
                }

                // Check for recorded audio file created during call
                val recordingPath = AudioRecordingScanner.findRecentRecording(context, callStartTime, callEndTime)

                // Schedule sync via WorkManager (Works even if offline with auto-retry)
                scheduleCallSync(
                    context = context,
                    phone = exactNumber ?: number ?: "Unknown",
                    direction = direction,
                    duration = if (exactDuration > 0) exactDuration else roughDurationSec,
                    status = status,
                    recordingPath = recordingPath,
                    startedAt = callStartTime,
                    endedAt = callEndTime
                )

                // Reset state
                callStartTime = 0
                savedNumber = null
            }
        }
        lastState = state
    }

    private fun fetchLastCallDetails(context: Context, fallbackNumber: String?): Triple<String?, Int, Int> {
        return try {
            val cursor: Cursor? = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.DURATION, CallLog.Calls.TYPE),
                null,
                null,
                "${CallLog.Calls.DATE} DESC"
            )
            cursor?.use {
                if (it.moveToFirst()) {
                    val num = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
                    val dur = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.DURATION))
                    val type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                    return Triple(num, dur, type)
                }
            }
            Triple(fallbackNumber, 0, CallLog.Calls.OUTGOING_TYPE)
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission missing for CallLog query", e)
            Triple(fallbackNumber, 0, CallLog.Calls.OUTGOING_TYPE)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching call details", e)
            Triple(fallbackNumber, 0, CallLog.Calls.OUTGOING_TYPE)
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
        Log.d(TAG, "Call sync enqueued in WorkManager successfully")
    }
}
