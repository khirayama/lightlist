package com.example.lightlist

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.google.firebase.Firebase
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.appCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory

class MainActivity : ComponentActivity() {
    private var pendingDeepLink by mutableStateOf(parseDeepLink(intent))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        FirebaseApp.initializeApp(this)
        Firebase.appCheck.installAppCheckProviderFactory(
            if (BuildConfig.DEBUG) {
                DebugAppCheckProviderFactory.getInstance()
            } else {
                PlayIntegrityAppCheckProviderFactory.getInstance()
            }
        )

        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            logException(throwable.message ?: "Unknown error", fatal = true)
            defaultHandler?.uncaughtException(thread, throwable)
        }

        enableEdgeToEdge()
        setContent {
            ContentView(
                pendingDeepLink = pendingDeepLink,
                onPendingDeepLinkConsumed = { pendingDeepLink = null }
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingDeepLink = parseDeepLink(intent)
    }

    private fun parseDeepLink(intent: Intent?): PendingDeepLink? {
        val data = intent?.data ?: return null
        val scheme = data.scheme?.lowercase()
        val host = data.host?.lowercase()
        val pathSegments = data.pathSegments

        if (scheme == "lightlist") {
            if (host == "password-reset") {
                val code = data.getQueryParameter("oobCode")
                if (!code.isNullOrBlank()) {
                    return PendingDeepLink.PasswordReset(code)
                }
            }

            if (host == "sharecodes") {
                val shareCode = pathSegments.firstOrNull()
                if (!shareCode.isNullOrBlank()) {
                    return PendingDeepLink.ShareCode(shareCode.uppercase())
                }
            }
        }

        if ((scheme == "https" || scheme == "http") && host == "lightlist.com") {
            if (pathSegments.size >= 2 && pathSegments[0].equals("sharecodes", ignoreCase = true)) {
                return PendingDeepLink.ShareCode(pathSegments[1].uppercase())
            }

            if (pathSegments.firstOrNull().equals("password_reset", ignoreCase = true)) {
                val code = data.getQueryParameter("oobCode")
                if (!code.isNullOrBlank()) {
                    return PendingDeepLink.PasswordReset(code)
                }
            }
        }

        return null
    }
}
