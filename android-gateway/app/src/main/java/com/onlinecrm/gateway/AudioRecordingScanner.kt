package com.onlinecrm.gateway

import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import java.io.File

/**
 * Intelligent Multi-Strategy Audio Scanner for smartphone call recordings.
 * 1. Queries Android MediaStore (Scoped Storage safe, Android 10-14+)
 * 2. Matches by phone number in filename
 * 3. Scans OEM physical directories (Samsung OneUI, Xiaomi MIUI/HyperOS, OnePlus, Huawei, etc.)
 */
object AudioRecordingScanner {

    private const val TAG = "AudioRecordScanner"

    // Standard phone vendor recording directories relative to external storage root
    private val RECORDING_PATHS = arrayOf(
        // Samsung Galaxy (OneUI native recorder)
        "Recordings/Call",
        "Recordings",
        "Voice Recorder",
        // Xiaomi / Redmi / POCO (MIUI & HyperOS)
        "MIUI/sound_recorder/call_rec",
        "MIUI/sound_recorder",
        // OnePlus / Oppo / Realme (ColorOS / OxygenOS)
        "Recordings/Call Recordings",
        "Recordings/Calls",
        // Huawei / Honor
        "Sounds/CallRecord",
        "Record/Call",
        // Vivo / iQOO (FuntouchOS / OriginOS)
        "Record/Call",
        "Recordings/Call",
        // Tecno / Infinix / Itel (HiOS / XOS)
        "Audio/AutoCallRecorder",
        // Generic Android standards
        "Music/Recordings/Call",
        "Music/Recordings",
        "Download/CallRecordings",
        "CallRecordings"
    )

    fun findRecentRecording(
        context: Context,
        phoneNumber: String?,
        startTimeMs: Long,
        endTimeMs: Long
    ): String? {
        val windowStart = if (startTimeMs > 0) startTimeMs - 30000 else System.currentTimeMillis() - 600000
        val windowEnd = endTimeMs + 30000
        val cleanPhone = phoneNumber?.replace(Regex("\\D"), "")?.takeLast(9) ?: ""

        Log.d(TAG, "Scanning for call recording (phone: $cleanPhone, window: $windowStart..$windowEnd)")

        // Strategy 1: Android MediaStore (Guaranteed to work with Scoped Storage)
        val mediaStoreResult = searchViaMediaStore(context, cleanPhone, windowStart, windowEnd)
        if (mediaStoreResult != null) {
            Log.i(TAG, "✅ Found call recording via MediaStore: $mediaStoreResult")
            return mediaStoreResult
        }

        // Strategy 2: Direct File System Search in known OEM paths
        val fileSystemResult = searchViaFileSystem(cleanPhone, windowStart, windowEnd)
        if (fileSystemResult != null) {
            Log.i(TAG, "✅ Found call recording via FileSystem: $fileSystemResult")
            return fileSystemResult
        }

        Log.w(TAG, "⚠️ No call recording file found matching phone '$cleanPhone' in time window")
        return null
    }

    private fun searchViaMediaStore(
        context: Context,
        cleanPhone: String,
        windowStartMs: Long,
        windowEndMs: Long
    ): String? {
        try {
            val projection = arrayOf(
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.DATE_MODIFIED,
                MediaStore.Audio.Media.DATE_ADDED
            )

            val startSec = (windowStartMs / 1000) - 30
            val endSec = (windowEndMs / 1000) + 30

            val cursor = context.contentResolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                projection,
                "${MediaStore.Audio.Media.DATE_MODIFIED} >= ?",
                arrayOf(startSec.toString()),
                "${MediaStore.Audio.Media.DATE_MODIFIED} DESC"
            )

            cursor?.use { c ->
                val dataIndex = c.getColumnIndex(MediaStore.Audio.Media.DATA)
                val nameIndex = c.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME)
                val dateModIndex = c.getColumnIndex(MediaStore.Audio.Media.DATE_MODIFIED)

                while (c.moveToNext()) {
                    val filePath = if (dataIndex >= 0) c.getString(dataIndex) else null
                    val fileName = if (nameIndex >= 0) c.getString(nameIndex)?.lowercase() ?: "" else ""
                    val modSec = if (dateModIndex >= 0) c.getLong(dateModIndex) else 0L

                    if (filePath.isNullOrEmpty()) continue

                    val isAudio = fileName.endsWith(".m4a") || fileName.endsWith(".mp3") ||
                            fileName.endsWith(".amr") || fileName.endsWith(".aac") ||
                            fileName.endsWith(".wav") || fileName.endsWith(".ogg") ||
                            filePath.endsWith(".m4a", ignoreCase = true) ||
                            filePath.endsWith(".mp3", ignoreCase = true)

                    if (!isAudio) continue

                    val file = File(filePath)
                    if (!file.exists() || file.length() < 1024) continue // Must be at least 1KB

                    // Match 1: Phone number in filename or path
                    if (cleanPhone.length >= 7 && (fileName.contains(cleanPhone) || filePath.contains(cleanPhone))) {
                        return filePath
                    }

                    // Match 2: Timestamp in time window and path/name indicates call
                    if (modSec in startSec..endSec) {
                        val pathLower = filePath.lowercase()
                        if (pathLower.contains("call") || pathLower.contains("rec") || fileName.contains("call")) {
                            return filePath
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in searchViaMediaStore", e)
        }
        return null
    }

    private fun searchViaFileSystem(
        cleanPhone: String,
        windowStartMs: Long,
        windowEndMs: Long
    ): String? {
        try {
            val root = Environment.getExternalStorageDirectory() ?: return null

            for (subPath in RECORDING_PATHS) {
                val dir = File(root, subPath)
                if (dir.exists() && dir.isDirectory) {
                    val candidate = searchInDirectory(dir, cleanPhone, windowStartMs, windowEndMs)
                    if (candidate != null) return candidate.absolutePath
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in searchViaFileSystem", e)
        }
        return null
    }

    private fun searchInDirectory(
        dir: File,
        cleanPhone: String,
        startWindow: Long,
        endWindow: Long
    ): File? {
        val files = dir.listFiles { file ->
            val name = file.name.lowercase()
            file.isFile && file.length() > 1024 && (
                name.endsWith(".mp3") || name.endsWith(".m4a") ||
                name.endsWith(".amr") || name.endsWith(".aac") ||
                name.endsWith(".wav") || name.endsWith(".ogg")
            )
        } ?: return null

        val sortedFiles = files.sortedByDescending { it.lastModified() }

        // First pass: Phone number exact match
        if (cleanPhone.length >= 7) {
            for (f in sortedFiles) {
                if (f.name.contains(cleanPhone)) {
                    return f
                }
            }
        }

        // Second pass: Timestamp window match
        for (f in sortedFiles) {
            val modTime = f.lastModified()
            if (modTime in startWindow..endWindow) {
                return f
            }
        }

        return null
    }
}
