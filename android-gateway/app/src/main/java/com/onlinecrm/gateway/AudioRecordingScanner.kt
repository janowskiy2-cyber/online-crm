package com.onlinecrm.gateway

import android.content.Context
import android.os.Environment
import android.util.Log
import java.io.File

/**
 * Intelligent Audio Scanner for native smartphone call recordings.
 * Matches audio files created during the active call window.
 */
object AudioRecordingScanner {

    private const val TAG = "AudioRecordScanner"

    // Standard phone vendor recording directories
    private val RECORDING_PATHS = arrayOf(
        // Xiaomi / Redmi / POCO (MIUI & HyperOS)
        "MIUI/sound_recorder/call_rec",
        // Samsung Galaxy (OneUI native recorder)
        "Recordings/Call",
        "Voice Recorder",
        // OnePlus / Oppo / Realme (ColorOS / OxygenOS)
        "Recordings",
        "Recordings/Call Recordings",
        // Huawei / Honor
        "Sounds/CallRecord",
        // Tecno / Infinix / Itel (HiOS / XOS)
        "Audio/AutoCallRecorder",
        // Generic Android standards
        "Music/Recordings/Call",
        "Download/CallRecordings"
    )

    fun findRecentRecording(context: Context, startTimeMs: Long, endTimeMs: Long): String? {
        try {
            val root = Environment.getExternalStorageDirectory() ?: return null
            val allowedWindowStart = if (startTimeMs > 0) startTimeMs - 5000 else System.currentTimeMillis() - 300000
            val allowedWindowEnd = endTimeMs + 10000

            for (subPath in RECORDING_PATHS) {
                val dir = File(root, subPath)
                if (dir.exists() && dir.isDirectory) {
                    val matchingFile = searchInDirectory(dir, allowedWindowStart, allowedWindowEnd)
                    if (matchingFile != null) {
                        Log.i(TAG, "Found matching call audio recording: ${matchingFile.absolutePath}")
                        return matchingFile.absolutePath
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error while scanning for call audio recording", e)
        }
        return null
    }

    private fun searchInDirectory(dir: File, startWindow: Long, endWindow: Long): File? {
        val files = dir.listFiles { file ->
            val name = file.name.lowercase()
            file.isFile && (name.endsWith(".mp3") || name.endsWith(".m4a") || name.endsWith(".amr") || name.endsWith(".aac") || name.endsWith(".wav"))
        } ?: return null

        // Sort by newest first
        val sortedFiles = files.sortedByDescending { it.lastModified() }
        for (f in sortedFiles) {
            val modTime = f.lastModified()
            if (modTime in startWindow..endWindow) {
                return f
            }
        }
        return null
    }
}
