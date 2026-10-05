package com.lightlist.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.Firebase
import com.google.firebase.auth.auth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.Source
import com.google.firebase.firestore.firestore
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import java.util.UUID

private const val SHARED_LIST_NOTIFICATION_CHANNEL_ID = "shared_list_updates"
private const val SHARED_LIST_NOTIFICATION_DEVICE_ID_KEY = "deviceId"
private const val SHARED_LIST_NOTIFICATION_CHANNEL_NAME_KEY = "channelName"

private fun existingSharedListNotificationDeviceId(context: Context): String? =
    context.getSharedPreferences("lightlist.notifications", Context.MODE_PRIVATE)
        .getString(SHARED_LIST_NOTIFICATION_DEVICE_ID_KEY, null)

internal fun registeredSharedListNotificationToken(context: Context, settings: DocumentSnapshot): String? {
    val deviceId = existingSharedListNotificationDeviceId(context) ?: return null
    return runCatching { settings.getString("notificationDevices.$deviceId.token") }.getOrNull()
}

internal fun sharedListNotificationDeviceId(context: Context): String {
    val preferences = context.getSharedPreferences("lightlist.notifications", Context.MODE_PRIVATE)
    val existingId = existingSharedListNotificationDeviceId(context)
    if (existingId != null) return existingId
    val deviceId = UUID.randomUUID().toString()
    preferences.edit().putString(SHARED_LIST_NOTIFICATION_DEVICE_ID_KEY, deviceId).apply()
    return deviceId
}

@Suppress("DEPRECATION")
internal suspend fun sharedListNotificationToken(): String =
    FirebaseMessaging.getInstance().token.await()

internal suspend fun saveSharedListNotificationToken(
    context: Context,
    uid: String,
    token: String,
    enablePreference: Boolean = false
) {
    ensureSharedListNotificationChannel(context)
    val deviceId = sharedListNotificationDeviceId(context)
    val fields = mutableMapOf<String, Any>(
        "notificationDevices.$deviceId" to mapOf(
            "token" to token,
            "platform" to "android",
            "updatedAt" to System.currentTimeMillis()
        ),
        "updatedAt" to System.currentTimeMillis()
    )
    if (enablePreference) fields["notifySharedListUpdates"] = true
    Firebase.firestore.collection("settings").document(uid).update(fields).await()
}

internal fun ensureSharedListNotificationChannel(context: Context, name: String? = null) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val preferences = context.getSharedPreferences("lightlist.notifications", Context.MODE_PRIVATE)
        if (name != null && name != preferences.getString(SHARED_LIST_NOTIFICATION_CHANNEL_NAME_KEY, null)) {
            preferences.edit().putString(SHARED_LIST_NOTIFICATION_CHANNEL_NAME_KEY, name).apply()
        }
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(
            NotificationChannel(
                SHARED_LIST_NOTIFICATION_CHANNEL_ID,
                name
                    ?: preferences.getString(SHARED_LIST_NOTIFICATION_CHANNEL_NAME_KEY, null)
                    ?: context.getString(R.string.app_name),
                NotificationManager.IMPORTANCE_DEFAULT
            )
        )
    }
}

internal suspend fun refreshSharedListNotificationToken(
    context: Context,
    uid: String,
    token: String
) {
    val settings = Firebase.firestore.collection("settings").document(uid).get(Source.CACHE).await()
    if (settings.getBoolean("notifySharedListUpdates") != true || Firebase.auth.currentUser?.uid != uid) return
    if (registeredSharedListNotificationToken(context, settings) == token) return
    saveSharedListNotificationToken(context, uid, token)
}

internal suspend fun removeSharedListNotificationToken(
    context: Context,
    uid: String,
    registered: Boolean,
    isOnline: Boolean
) {
    val deviceId = existingSharedListNotificationDeviceId(context) ?: return
    val removal = if (registered) {
        Firebase.firestore.collection("settings").document(uid).update(
            "notificationDevices.$deviceId",
            FieldValue.delete()
        )
    } else {
        null
    }
    if (!isOnline) return
    val tokenRemoval = FirebaseMessaging.getInstance().deleteToken()
    withTimeoutOrNull(3000L) {
        runCatching { removal?.await() }
        runCatching { tokenRemoval.await() }
    }
}

class LightlistMessagingService : FirebaseMessagingService() {
    @Suppress("OVERRIDE_DEPRECATION")
    override fun onNewToken(token: String) {
        val uid = Firebase.auth.currentUser?.uid ?: return
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            runCatching {
                refreshSharedListNotificationToken(applicationContext, uid, token)
            }
        }
    }

    @Suppress("OVERRIDE_DEPRECATION")
    override fun onMessageReceived(message: RemoteMessage) {
        val notification = message.notification ?: return
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) !=
                android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        ensureSharedListNotificationChannel(this)
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            message.data["taskListId"]?.let { putExtra("taskListId", it) }
        }
        val taskListId = message.data["taskListId"]
        val notificationId = taskListId?.hashCode() ?: 0
        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val builder = NotificationCompat.Builder(this, SHARED_LIST_NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentTitle(notification.title ?: getString(R.string.app_name))
            .setContentText(notification.body.orEmpty())
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        NotificationManagerCompat.from(this).notify(taskListId, 0, builder.build())
    }
}
