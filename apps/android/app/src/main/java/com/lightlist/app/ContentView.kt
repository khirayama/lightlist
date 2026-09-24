package com.lightlist.app

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.text.format.DateFormat
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.Crossfade
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.ClipEntry
import androidx.compose.ui.platform.LocalClipboard
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.semantics.CustomAccessibilityAction
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.customActions
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.google.firebase.Firebase
import com.google.firebase.auth.ActionCodeSettings
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.auth
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldPath
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.MetadataChanges
import com.google.firebase.firestore.Source
import com.google.firebase.firestore.firestore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.collectLatest
import androidx.compose.foundation.border
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.cancel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.focus.FocusManager
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.isAltPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.changedToDownIgnoreConsumed
import androidx.compose.ui.input.pointer.changedToUpIgnoreConsumed
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.boundsInRoot
import java.util.Calendar
import java.util.GregorianCalendar
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.Date
import java.util.TimeZone
import java.security.SecureRandom
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.zIndex
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.window.PopupProperties
import androidx.core.view.WindowCompat
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.input.pointer.pointerInput
import com.google.firebase.firestore.FieldValue
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.key
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import com.google.android.gms.oss.licenses.OssLicensesMenuActivity
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.analytics
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics
import java.text.DateFormatSymbols

import org.json.JSONObject
import org.json.JSONArray
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.RowScope
import androidx.core.net.toUri
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.selection.toggleable
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.Image
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DragIndicator
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.ripple
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

private const val COMPLETED_TASK_ALPHA = 0.55f
private const val STARTUP_CACHE_PREFERENCES = "lightlist.startup"
private val autoSortOverrides = mutableStateMapOf<String, Boolean>()
private val TaskListBackgroundOptions = listOf<String?>(
    null,
    "#F87171",
    "#FBBF24",
    "#34D399",
    "#38BDF8",
    "#818CF8",
    "#A78BFA"
)
private val shareCodeRandom = SecureRandom()
private val shareCodePattern = Regex("^[A-Z0-9]{8}$")

private fun normalizedShareCode(rawValue: String?): String? {
    val shareCode = rawValue?.trim()?.uppercase(Locale.ROOT) ?: return null
    return shareCode.takeIf(shareCodePattern::matches)
}

private fun taskListOrderCacheKey(userId: String): String = "lightlist.taskListOrder.$userId"

private fun readCachedTaskListOrderIds(userId: String): List<String> {
    val preferences = FirebaseApp.getInstance().applicationContext.getSharedPreferences(
        STARTUP_CACHE_PREFERENCES,
        Context.MODE_PRIVATE
    )
    val rawValue = preferences.getString(taskListOrderCacheKey(userId), null) ?: return emptyList()
    return runCatching {
        val values = JSONArray(rawValue)
        List(values.length()) { index -> values.getString(index) }
    }.getOrDefault(emptyList())
}

private fun writeCachedTaskListOrderIds(userId: String, taskListIds: List<String>) {
    val preferences = FirebaseApp.getInstance().applicationContext.getSharedPreferences(
        STARTUP_CACHE_PREFERENCES,
        Context.MODE_PRIVATE
    )
    preferences.edit()
        .putString(taskListOrderCacheKey(userId), JSONArray(taskListIds).toString())
        .apply()
}

private fun passwordResetCode(rawValue: String?): String? {
    val code = rawValue?.trim() ?: return null
    return code.takeIf { it.isNotEmpty() && it.toByteArray().size <= 2048 }
}

private fun nowMillis(): Long = System.currentTimeMillis()

private fun exceptionCategory(error: Exception): String =
    (error as? FirebaseFirestoreException)?.code?.name ?: error::class.java.simpleName

private fun firestoreErrorDescription(operation: String, error: Exception): String =
    "Android $operation failed: ${exceptionCategory(error)}"

private fun logDebugSync(message: String) {
    if (BuildConfig.DEBUG) {
        Log.d("lightlist-sync", message)
    }
}

private fun shortDebugId(value: String): String {
    if (!BuildConfig.DEBUG) return ""
    return when {
        value.length <= 8 -> value
        else -> "${value.take(4)}...${value.takeLast(4)}"
    }
}

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFF9FAFB),
    onPrimary = Color(0xFF111827),
    primaryContainer = Color(0xFF374151),
    onPrimaryContainer = Color(0xFFF9FAFB),
    secondary = Color(0xFFD1D5DB),
    onSecondary = Color(0xFF111827),
    secondaryContainer = Color(0xFF374151),
    onSecondaryContainer = Color(0xFFF9FAFB),
    tertiary = Color(0xFFD1D5DB),
    onTertiary = Color(0xFF111827),
    background = Color(0xFF030712),
    onBackground = Color(0xFFF9FAFB),
    surface = Color(0xFF030712),
    surfaceDim = Color(0xFF030712),
    onSurface = Color(0xFFF9FAFB),
    surfaceVariant = Color(0xFF374151),
    onSurfaceVariant = Color(0xFFD1D5DB),
    surfaceContainerLowest = Color(0xFF030712),
    surfaceContainerLow = Color(0xFF111827),
    surfaceContainer = Color(0xFF111827),
    surfaceContainerHigh = Color(0xFF111827),
    surfaceContainerHighest = Color(0xFF374151),
    outline = Color(0xFF4B5563),
    outlineVariant = Color(0xFF374151),
    error = Color(0xFFEF4444),
    onError = Color(0xFFF9FAFB),
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF111827),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFF9FAFB),
    onPrimaryContainer = Color(0xFF111827),
    secondary = Color(0xFF4B5563),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFF9FAFB),
    onSecondaryContainer = Color(0xFF111827),
    tertiary = Color(0xFF4B5563),
    onTertiary = Color(0xFFFFFFFF),
    background = Color(0xFFFFFFFF),
    onBackground = Color(0xFF111827),
    surface = Color(0xFFFFFFFF),
    surfaceDim = Color(0xFFF9FAFB),
    onSurface = Color(0xFF111827),
    surfaceVariant = Color(0xFFF9FAFB),
    onSurfaceVariant = Color(0xFF4B5563),
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFFFFFFF),
    surfaceContainer = Color(0xFFFFFFFF),
    surfaceContainerHigh = Color(0xFFFFFFFF),
    surfaceContainerHighest = Color(0xFFF9FAFB),
    outline = Color(0xFFD1D5DB),
    outlineVariant = Color(0xFFD1D5DB),
    error = Color(0xFFDC2626),
    onError = Color(0xFFFFFFFF),
)

private val GenInterfaceJPBodyFontFamily = FontFamily(
    Font(R.font.gen_interface_jp_regular, FontWeight.Normal),
    Font(R.font.gen_interface_jp_medium, FontWeight.Medium),
    Font(R.font.gen_interface_jp_semibold, FontWeight.SemiBold),
    Font(R.font.gen_interface_jp_bold, FontWeight.Bold),
)

private val GenInterfaceJPDisplayFontFamily = FontFamily(
    Font(R.font.gen_interface_jp_display_bold, FontWeight.Bold),
    Font(R.font.gen_interface_jp_display_extrabold, FontWeight.ExtraBold),
)

private data class ManualLicense(
    val id: String,
    val name: String,
    val license: String,
    val source: String?,
    val text: String
)

private fun loadManualLicenses(context: Context): List<ManualLicense> {
    return try {
        val json = context.assets.open("manual-licenses.json").bufferedReader().use { it.readText() }
        val array = org.json.JSONArray(json)
        List(array.length()) { index ->
            val item = array.getJSONObject(index)
            ManualLicense(
                id = item.getString("id"),
                name = item.getString("name"),
                license = item.getString("license"),
                source = item.optString("source").ifBlank { null },
                text = item.getString("text")
            )
        }
    } catch (_: Exception) {
        emptyList()
    }
}

private val BaseTypography = Typography()

private val LightlistTypography = Typography(
    displayLarge = BaseTypography.displayLarge.copy(fontFamily = GenInterfaceJPDisplayFontFamily),
    displayMedium = BaseTypography.displayMedium.copy(fontFamily = GenInterfaceJPDisplayFontFamily),
    displaySmall = BaseTypography.displaySmall.copy(fontFamily = GenInterfaceJPDisplayFontFamily),
    headlineLarge = BaseTypography.headlineLarge.copy(fontFamily = GenInterfaceJPDisplayFontFamily),
    headlineMedium = BaseTypography.headlineMedium.copy(fontFamily = GenInterfaceJPDisplayFontFamily),
    headlineSmall = BaseTypography.headlineSmall.copy(fontFamily = GenInterfaceJPDisplayFontFamily),
    titleLarge = BaseTypography.titleLarge.copy(fontFamily = GenInterfaceJPDisplayFontFamily),
    titleMedium = BaseTypography.titleMedium.copy(fontFamily = GenInterfaceJPDisplayFontFamily),
    titleSmall = BaseTypography.titleSmall.copy(fontFamily = GenInterfaceJPDisplayFontFamily),
    bodyLarge = BaseTypography.bodyLarge.copy(
        fontFamily = GenInterfaceJPBodyFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp,
    ),
    bodyMedium = BaseTypography.bodyMedium.copy(fontFamily = GenInterfaceJPBodyFontFamily),
    bodySmall = BaseTypography.bodySmall.copy(fontFamily = GenInterfaceJPBodyFontFamily),
    labelLarge = BaseTypography.labelLarge.copy(fontFamily = GenInterfaceJPBodyFontFamily),
    labelMedium = BaseTypography.labelMedium.copy(fontFamily = GenInterfaceJPBodyFontFamily),
    labelSmall = BaseTypography.labelSmall.copy(fontFamily = GenInterfaceJPBodyFontFamily),
)

@Composable
private fun LightlistTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val reduceMotion = rememberReduceMotion()
    MaterialTheme(
        colorScheme = colorScheme,
        typography = LightlistTypography,
    ) {
        CompositionLocalProvider(LocalReduceMotion provides reduceMotion, content = content)
    }
}

private fun readReduceMotion(context: Context): Boolean {
    return android.provider.Settings.Global.getFloat(
        context.contentResolver,
        android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
        1f
    ) == 0f
}

@Composable
private fun rememberReduceMotion(): Boolean {
    val context = LocalContext.current
    val reduceMotion = remember { mutableStateOf(readReduceMotion(context)) }
    DisposableEffect(context) {
        val observer = object : android.database.ContentObserver(
            android.os.Handler(android.os.Looper.getMainLooper())
        ) {
            override fun onChange(selfChange: Boolean) {
                reduceMotion.value = readReduceMotion(context)
            }
        }
        val resolver = context.contentResolver
        resolver.registerContentObserver(
            android.provider.Settings.Global.getUriFor(
                android.provider.Settings.Global.ANIMATOR_DURATION_SCALE
            ),
            false,
            observer
        )
        onDispose { resolver.unregisterContentObserver(observer) }
    }
    return reduceMotion.value
}

class Translations {
    private var dict: JSONObject = JSONObject()
    private var currentLanguage = "ja"

    companion object {
        val supported = listOf("ja","en","es","de","fr","ko","zh-CN","hi","ar","pt-BR","id")
        fun isSupported(language: String): Boolean = supported.contains(language)
        @Volatile
        private var allLocales: JSONObject? = null

        fun preload(context: Context) {
            loadLocales(context)
        }

        private fun loadLocales(context: Context): JSONObject {
            allLocales?.let { return it }
            val locales = try {
                JSONObject(context.assets.open("locales.json").bufferedReader().readText())
            } catch (_: Exception) {
                JSONObject()
            }
            allLocales = locales
            return locales
        }

        fun from(context: Context, language: String): Translations {
            val locales = loadLocales(context)
            return Translations().apply {
                val lang = if (supported.contains(language)) language else "ja"
                currentLanguage = lang
                dict = locales.optJSONObject(lang) ?: JSONObject()
            }
        }

        fun getRelativePatterns(language: String): List<TaskDatePattern> {
            val lang = if (supported.contains(language)) language else "ja"
            val locale = allLocales?.optJSONObject(lang) ?: return emptyList()
            return getRelativePatternsFromDict(locale)
        }

        private fun getRelativePatternsFromDict(dict: JSONObject): List<TaskDatePattern> {
            val datePatterns = dict.optJSONObject("datePatterns") ?: return emptyList()
            val relative = datePatterns.optJSONArray("relative") ?: return emptyList()
            val weekdays = datePatterns.optJSONObject("weekdays") ?: JSONObject()

            return List(relative.length()) { i ->
                val p = relative.getJSONObject(i)
                val pattern = p.getString("pattern")
                val options = if (p.optString("options").contains("i")) setOf(RegexOption.IGNORE_CASE) else emptySet()

                TaskDatePattern(Regex(pattern, options)) { match ->
                    if (p.has("offset")) {
                        return@TaskDatePattern makeTaskOffsetDate(p.getInt("offset"))
                    }
                    if (p.has("offsetGroup")) {
                        val groupIndex = p.getInt("offsetGroup")
                        val offset = match.groupValues.getOrNull(groupIndex)?.toIntOrNull()
                        if (offset != null) return@TaskDatePattern makeTaskOffsetDate(offset)
                    }
                    if (p.has("weekdayGroup")) {
                        val groupIndex = p.getInt("weekdayGroup")
                        val key = match.groupValues.getOrNull(groupIndex)
                        if (key != null) {
                            return@TaskDatePattern resolveWeekdayDate(key, weekdays)
                        }
                    }
                    null
                }
            }
        }

        private fun resolveWeekdayDate(key: String, weekdays: JSONObject): Date? {
            val target = if (weekdays.has(key)) weekdays.getInt(key) else findWeekday(key, weekdays)
            val current = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1
            return target?.let { makeTaskOffsetDate(nextTaskWeekdayOffset(it, current)) }
        }

        private fun findWeekday(key: String, weekdays: JSONObject): Int? {
            val lowerKey = key.lowercase()
            val keys = weekdays.keys()
            while (keys.hasNext()) {
                val candidate = keys.next()
                if (candidate.lowercase() == lowerKey) return weekdays.getInt(candidate)
            }
            return null
        }
    }

    fun load(context: Context, language: String) {
        val lang = if (supported.contains(language)) language else "ja"
        currentLanguage = lang
        dict = loadLocales(context).optJSONObject(lang) ?: JSONObject()
    }

    fun languageTag(): String = currentLanguage

    fun t(key: String, vars: Map<String, String> = emptyMap()): String {
        val parts = key.split(".")
        var current: Any = dict
        for (part in parts) {
            current = when (current) {
                is JSONObject -> if (current.has(part)) current.get(part) else return key
                else -> return key
            }
        }
        var result = current as? String ?: return key
        vars.forEach { (k, v) -> result = result.replace("{{$k}}", v) }
        return result
    }

    fun getPinPrefixes(): List<String> {
        val prefixes = dict.optJSONArray("pinPrefixes") ?: return listOf("pin", "pinned")
        val list = mutableListOf<String>()
        for (i in 0 until prefixes.length()) {
            list.add(prefixes.getString(i))
        }
        return (listOf("pin", "pinned") + list).distinct().sortedByDescending { it.length }
    }

    fun getRelativePatterns(): List<TaskDatePattern> {
        return Translations.getRelativePatterns(currentLanguage)
    }
}

private fun log(eventName: String, params: Bundle? = null) {
    if (BuildConfig.DEBUG) {
        val parameterNames = params?.keySet()?.sorted().orEmpty()
        Log.d("analytics", "$eventName params=$parameterNames")
    }
    Firebase.analytics.logEvent(eventName, params)
}

private fun log(eventName: String, block: Bundle.() -> Unit) {
    log(eventName, Bundle().apply(block))
}

private fun logSignUp() = log(FirebaseAnalytics.Event.SIGN_UP) { putString(FirebaseAnalytics.Param.METHOD, "email") }
private fun logLogin() = log(FirebaseAnalytics.Event.LOGIN) { putString(FirebaseAnalytics.Param.METHOD, "email") }
private fun logSignOut() = log("app_sign_out")
private fun logDeleteAccount() = log("app_delete_account")
private fun logPasswordResetEmailSent() = log("app_password_reset_email_sent")
private fun logEmailChangeRequested() = log("app_email_change_requested")
private fun logTaskListCreate() = log("app_task_list_create")
private fun logTaskListReorder() = log("app_task_list_reorder")
private fun logTaskAdd(hasDate: Boolean) = log("app_task_add") { putBoolean("has_date", hasDate) }
private fun logTaskUpdate(fields: String) = log("app_task_update") { putString("fields", fields) }
private fun logTaskReorder() = log("app_task_reorder")
private fun logTaskSort() = log("app_task_sort")
private fun logTaskDeleteCompleted(count: Int) = log("app_task_delete_completed") { putInt("count", count) }
private fun logShareCodeGenerate() = log("app_share_code_generate")
private fun logShareCodeRemove() = log("app_share_code_remove")
private fun logShareCodeJoin() = log("app_share_code_join")
private fun logShare() = log(FirebaseAnalytics.Event.SHARE) {
    putString(FirebaseAnalytics.Param.METHOD, "share_code")
    putString(FirebaseAnalytics.Param.CONTENT_TYPE, "task_list")
}
private fun logSettingsThemeChange(theme: String) = log("app_settings_theme_change") { putString("theme", theme) }
private fun logSettingsLanguageChange(language: String) = log("app_settings_language_change") { putString("language", language) }
private fun logSettingsTaskInsertPositionChange(position: String) = log("app_settings_task_insert_position_change") { putString("position", position) }
private fun logSettingsAutoSortChange(enabled: Boolean) = log("app_settings_auto_sort_change") { putBoolean("enabled", enabled) }
private fun logSettingsStartupViewChange(view: String) = log("app_settings_startup_view_change") { putString("view", view) }

private fun recordNonFatalException(operation: String, error: Exception? = null) {
    val errorCategory = error?.let(::exceptionCategory)
    log("app_exception") {
        putString("operation", operation)
        errorCategory?.let { putString("error_category", it) }
    }
    val message = errorCategory?.let { "Android $operation failed: $it" }
        ?: "Android $operation failed"
    FirebaseCrashlytics.getInstance().recordException(IllegalStateException(message))
}

private fun recordSyncListenerError(source: String, error: Exception) {
    val errorCategory = exceptionCategory(error)
    log("app_sync_listener_error") {
        putString("source", source)
        putString("error_category", errorCategory)
    }
    FirebaseCrashlytics.getInstance().recordException(
        IllegalStateException("Android sync listener $source failed: $errorCategory")
    )
}

val LocalTranslations = compositionLocalOf { Translations() }

sealed class AppRoute(val route: String, val title: String) {
    data object TaskLists : AppRoute("TaskLists", "TaskLists")
    data object Settings : AppRoute("Settings", "Settings")
    data object Calendar : AppRoute("Calendar?initial={initial}", "Calendar") {
        const val argumentName = "initial"

        fun createRoute(initial: Boolean = false): String = "Calendar?initial=$initial"
    }
    data object TaskList : AppRoute("TaskList/{taskListId}", "TaskList") {
        const val argumentName = "taskListId"

        fun createRoute(taskListId: String): String = "TaskList/$taskListId"
    }
}

sealed class PendingDeepLink {
    data class PasswordReset(val code: String) : PendingDeepLink()
    data class ShareCode(val shareCode: String) : PendingDeepLink()
}

private fun warmUpStartupData(context: Context) {
    Thread {
        Translations.preload(context)
        val uid = Firebase.auth.currentUser?.uid ?: return@Thread
        val db = Firebase.firestore
        val cachedTaskListIds = readCachedTaskListOrderIds(uid)
        db.collection("settings").document(uid).get(Source.CACHE)
        db.collection("taskListOrder").document(uid).get(Source.CACHE)
            .addOnSuccessListener { snapshot ->
                val orderedTaskListIds = parseOrderedTaskListIds(snapshot.data ?: emptyMap())
                writeCachedTaskListOrderIds(uid, orderedTaskListIds)
            }
        val cachedMemberTaskListIds = runBlocking {
            resolveMemberTaskListIds(db, cachedTaskListIds, uid, Source.CACHE)
        }
        cachedMemberTaskListIds.chunked(10).forEach { chunk ->
            db.collection("taskLists")
                .whereIn(FieldPath.documentId(), chunk)
                .get(Source.CACHE)
        }
    }.start()
}

private fun isInitialAutoNavigation(entry: NavBackStackEntry): Boolean {
    return (entry.destination.route == AppRoute.TaskList.route &&
        entry.arguments?.getString(AppRoute.TaskList.argumentName) == "__initial__") ||
        (entry.destination.route == AppRoute.Calendar.route &&
            entry.arguments?.getString(AppRoute.Calendar.argumentName) == "true")
}

private fun normalizeStartupView(value: String?): String = when (value) {
    "calendar", "taskLists" -> value
    else -> "taskList"
}

class MainActivity : ComponentActivity() {
    private var pendingDeepLink by mutableStateOf<PendingDeepLink?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingDeepLink = parseDeepLink(intent)

        FirebaseApp.initializeApp(this)
        warmUpStartupData(applicationContext)

        enableEdgeToEdge()
        setContent {
            RootScreen(
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
        val scheme = data.scheme?.lowercase(Locale.ROOT)
        val host = data.host?.lowercase(Locale.ROOT)
        val pathSegments = data.pathSegments

        if (scheme == "lightlist") {
            if (host == "password-reset" && pathSegments.isEmpty()) {
                passwordResetCode(data.getQueryParameter("oobCode"))?.let { code ->
                    return PendingDeepLink.PasswordReset(code)
                }
            }

            if (host == "sharecodes" && pathSegments.size == 1) {
                normalizedShareCode(pathSegments[0])?.let { shareCode ->
                    return PendingDeepLink.ShareCode(shareCode)
                }
            }
        }

        if (scheme == "https" && host == "lightlist.com" && (data.port == -1 || data.port == 443)) {
            if (pathSegments.size == 1 && pathSegments[0].equals("sharecodes", ignoreCase = true)) {
                normalizedShareCode(data.getQueryParameter("code"))?.let { shareCode ->
                    return PendingDeepLink.ShareCode(shareCode)
                }
            }

            if (pathSegments.size == 2 && pathSegments[0].equals("sharecodes", ignoreCase = true)) {
                normalizedShareCode(pathSegments[1])?.let { shareCode ->
                    return PendingDeepLink.ShareCode(shareCode)
                }
            }

            if (pathSegments.size == 1 && pathSegments[0].equals("password_reset", ignoreCase = true)) {
                passwordResetCode(data.getQueryParameter("oobCode"))?.let { code ->
                    return PendingDeepLink.PasswordReset(code)
                }
            }
        }

        if (
            scheme == "https" &&
                host == BuildConfig.PASSWORD_RESET_LINK_DOMAIN.lowercase(Locale.ROOT) &&
                (data.port == -1 || data.port == 443) &&
                data.getQueryParameter("mode")?.equals("resetPassword", ignoreCase = true) == true
        ) {
            passwordResetCode(data.getQueryParameter("oobCode"))?.let { code ->
                return PendingDeepLink.PasswordReset(code)
            }
        }

        return null
    }
}

private enum class AuthScreen {
    SignIn,
    SignUp,
    Reset
}

@Immutable
private data class TaskSummary(
    val id: String,
    val text: String,
    val completed: Boolean,
    val date: String,
    val order: Double,
    val pinned: Boolean
)

private data class FirestoreTaskRecord(
    val id: String? = null,
    val text: String? = null,
    val completed: Boolean? = null,
    val date: String? = null,
    val order: Double? = null,
    val pinned: Boolean? = null
)

private data class FirestoreTaskListRecord(
    val name: String? = null,
    val tasks: Map<String, FirestoreTaskRecord> = emptyMap(),
    val history: List<String> = emptyList(),
    val memberCount: Long? = null,
    val background: String? = null,
    val shareCode: String? = null
)

private data class FirestoreSettingsRecord(
    val theme: String? = null,
    val language: String? = null,
    val taskInsertPosition: String? = null,
    val autoSort: Boolean? = null,
    val startupView: String? = null
)

private fun FirestoreTaskRecord.toTaskSummary(taskId: String): TaskSummary? {
    val resolvedText = text ?: return null
    val resolvedCompleted = completed ?: return null
    val resolvedDate = date ?: return null
    val resolvedOrder = order?.takeIf { it.isFinite() } ?: return null
    val resolvedPinned = pinned ?: return null
    val normalizedDate = resolvedDate.takeIf { it.isEmpty() || parseTaskInputDate(it) != null }.orEmpty()
    if (id != taskId || !hasTaskContent(resolvedText, normalizedDate, resolvedPinned)) return null
    return TaskSummary(
        id = taskId,
        text = resolvedText,
        completed = resolvedCompleted,
        date = normalizedDate,
        order = resolvedOrder,
        pinned = resolvedPinned
    )
}

private fun FirestoreTaskListRecord.taskSummaries(): List<TaskSummary> {
    return tasks.mapNotNull { (taskId, task) -> task.toTaskSummary(taskId) }
        .sortedWith(compareBy<TaskSummary> { it.order }.thenBy { it.id })
}

private fun decodeTaskListRecord(document: DocumentSnapshot): FirestoreTaskListRecord {
    return runCatching {
        document.toObject(FirestoreTaskListRecord::class.java)
    }.getOrNull() ?: FirestoreTaskListRecord(
        name = document.getString("name"),
        tasks = (document.get("tasks") as? Map<*, *>)
            ?.entries
            ?.mapNotNull { (key, value) ->
                val taskId = key as? String ?: return@mapNotNull null
                val task = value as? Map<*, *> ?: return@mapNotNull null
                val record = FirestoreTaskRecord(
                    id = task["id"] as? String,
                    text = task["text"] as? String,
                    completed = task["completed"] as? Boolean,
                    date = task["date"] as? String,
                    order = (task["order"] as? Number)?.toDouble(),
                    pinned = task["pinned"] as? Boolean
                )
                taskId to record
            }
            ?.toMap()
            .orEmpty(),
        history = (document.get("history") as? List<*>)?.mapNotNull { it as? String }.orEmpty(),
        memberCount = (document.get("memberCount") as? Number)?.toLong(),
        background = document.getString("background"),
        shareCode = document.getString("shareCode")
    )
}

private class TaskListMutationQueue(
    private val scope: CoroutineScope
) {
    private var pendingCount = 0
    private val idleHandlers = mutableListOf<() -> Unit>()

    fun enqueue(
        onIdle: () -> Unit = {},
        onError: (Exception) -> Unit = {},
        block: () -> com.google.android.gms.tasks.Task<Void>
    ) {
        pendingCount += 1
        idleHandlers.add(onIdle)
        try {
            val write = block()
            scope.launch {
                try {
                    write.await()
                } catch (error: Exception) {
                    onError(error)
                } finally {
                    finish()
                }
            }
        } catch (error: Exception) {
            onError(error)
            finish()
        }
    }

    private fun finish() {
        pendingCount -= 1
        if (pendingCount == 0) {
            val handlers = idleHandlers.toList()
            idleHandlers.clear()
            handlers.forEach { it() }
        }
    }
}

private object TaskListMutationQueues {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val queues = mutableMapOf<String, TaskListMutationQueue>()

    @Synchronized
    fun queueFor(key: String): TaskListMutationQueue {
        return queues.getOrPut(key) { TaskListMutationQueue(scope) }
    }

    fun enqueueFor(
        taskListIds: List<String>,
        onIdle: () -> Unit = {},
        onError: (Exception) -> Unit = {},
        block: () -> com.google.android.gms.tasks.Task<Void>
    ) {
        try {
            val write = block()
            val ids = taskListIds.distinct().sorted()
            ids.forEachIndexed { index, id ->
                queueFor(id).enqueue(
                    onIdle = if (index == 0) onIdle else ({}),
                    onError = if (index == 0) onError else ({})
                ) { write }
            }
        } catch (error: Exception) {
            onError(error)
            onIdle()
        }
    }
}

private data class ActionSheetState(
    val taskId: String
)

private data class TaskListSummary(
    val id: String,
    val name: String,
    val remainingTaskCount: Int,
    val memberCount: Int,
    val background: String?
)

@Immutable
private data class TaskListDetail(
    val id: String,
    val name: String,
    val tasks: List<TaskSummary>,
    val history: List<String>,
    val memberCount: Int,
    val background: String? = null,
    val shareCode: String? = null
)

private data class SharedTaskListPreviewUiState(
    val taskListId: String? = null,
    val taskList: TaskListDetail? = null,
    val isLoading: Boolean = false,
    val isAdded: Boolean = false,
    val errorMessage: String? = null
)

private data class CalendarTask(
    val id: String,
    val taskListId: String,
    val taskListName: String,
    val taskListBackground: String?,
    val taskId: String,
    val text: String,
    val completed: Boolean,
    val dateKey: String,
    val dateValue: java.util.Date?,
    val pinned: Boolean,
    val order: Double,
    val taskListIndex: Int,
    val taskIndex: Int
)

private const val TASK_LIST_NOT_FOUND_ERROR = "TASK_LIST_NOT_FOUND"
private const val SHARE_CODE_GENERATION_FAILED_ERROR = "SHARE_CODE_GENERATION_FAILED"
private const val TASK_LIST_ORDER_NOT_FOUND_ERROR = "TASK_LIST_ORDER_NOT_FOUND"
private const val TASK_LIST_ALREADY_ADDED_ERROR = "TASK_LIST_ALREADY_ADDED"
private const val TABLET_MIN_WIDTH_DP = 840
private object AppIconMetrics {
    val standardActionIconSize = 24.dp
    val headerActionIconSize = 22.dp
    val compactActionIconSize = 20.dp
    val inlineActionIconSize = 18.dp
    val metaIconSize = 14.dp
}
private object TaskListDetailMetrics {
    val topBarHeight = 48.dp
    val indicatorContentInset = 42.dp
    val indicatorTouchSize = 24.dp
    val indicatorDotSize = 8.dp
    val contentMaxWidth = 672.dp
    val sectionSpacing = 16.dp
    val toolbarTopSpacing = 12.dp
    val toolbarBottomSpacing = 8.dp
    val inputCornerRadius = 14.dp
    val inputHorizontalPadding = 14.dp
    val inputVerticalPadding = 10.dp
    val inputMinHeight = 44.dp
    val inputActionSize = 44.dp
    val rowBleed = 12.dp
    val rowVerticalPadding = 2.dp
    val controlSize = 48.dp
    val handleOverlap = 20.dp
    val completionOverlap = 8.dp
    val completionDotSize = 20.dp
    val dateRowHeight = 20.dp
    val dateOffset = 8.dp
    val textLineHeight = 28.sp
    val inputLineHeight = 24.sp
}

private object AppGray {
    val g300 = Color(0xFFD1D5DB)
    val g400 = Color(0xFF9CA3AF)
    val g500 = Color(0xFF6B7280)
    val g700 = Color(0xFF374151)
}

private val LocalReduceMotion = compositionLocalOf { false }

@Composable
@ReadOnlyComposable
private fun isAppDarkTheme(): Boolean = MaterialTheme.colorScheme.background.luminance() < 0.5f

@Composable
@ReadOnlyComposable
private fun mutedTextColor(): Color =
    MaterialTheme.colorScheme.onSurface.copy(alpha = if (isAppDarkTheme()) 0.68f else 0.64f)

@Composable
@ReadOnlyComposable
private fun mutedIconColor(): Color =
    MaterialTheme.colorScheme.onSurface.copy(alpha = if (isAppDarkTheme()) 0.45f else 0.42f)

@Composable
@ReadOnlyComposable
private fun rowActiveColor(): Color =
    MaterialTheme.colorScheme.onSurface.copy(alpha = if (isAppDarkTheme()) 0.1f else 0.07f)

@Composable
@ReadOnlyComposable
private fun subtleOutlineColor(): Color = if (isAppDarkTheme()) AppGray.g500 else AppGray.g400

@Composable
@ReadOnlyComposable
private fun completedFillColor(): Color = if (isAppDarkTheme()) AppGray.g700 else AppGray.g300

private val AppButtonTextStyle = TextStyle(
    fontFamily = GenInterfaceJPBodyFontFamily,
    fontSize = 14.sp,
    fontWeight = FontWeight.SemiBold,
    lineHeight = 20.sp
)

private val AppFieldTextStyle = TextStyle(
    fontFamily = GenInterfaceJPBodyFontFamily,
    fontSize = 16.sp,
    lineHeight = 24.sp
)

private val AppFieldLabelTextStyle = TextStyle(
    fontFamily = GenInterfaceJPBodyFontFamily,
    fontSize = 14.sp,
    fontWeight = FontWeight.Medium,
    lineHeight = 20.sp
)

private val AppDialogTitleTextStyle = TextStyle(
    fontFamily = GenInterfaceJPDisplayFontFamily,
    fontSize = 18.sp,
    fontWeight = FontWeight.Bold,
    lineHeight = 28.sp,
    letterSpacing = 0.18.sp
)

private val AppHeaderTitleTextStyle = TextStyle(
    fontFamily = GenInterfaceJPBodyFontFamily,
    fontSize = 16.sp,
    fontWeight = FontWeight.SemiBold,
    lineHeight = 24.sp
)

private val AppPageTitleTextStyle = TextStyle(
    fontFamily = GenInterfaceJPDisplayFontFamily,
    fontSize = 24.sp,
    fontWeight = FontWeight.Bold,
    lineHeight = 32.sp,
    letterSpacing = 0.24.sp
)

private val AppBodySmallTextStyle = TextStyle(
    fontFamily = GenInterfaceJPBodyFontFamily,
    fontSize = 14.sp,
    lineHeight = 20.sp
)

private val AppRowTextStyle = TextStyle(
    fontFamily = GenInterfaceJPBodyFontFamily,
    fontSize = 14.sp,
    fontWeight = FontWeight.Medium,
    lineHeight = 20.sp
)

private val AppCaptionTextStyle = TextStyle(
    fontFamily = GenInterfaceJPBodyFontFamily,
    fontSize = 12.sp,
    fontWeight = FontWeight.SemiBold,
    lineHeight = 16.sp
)

private fun Modifier.bleed(start: Dp = 0.dp, end: Dp = 0.dp): Modifier = layout { measurable, constraints ->
    val startPx = start.roundToPx()
    val endPx = end.roundToPx()
    val extra = startPx + endPx
    val placeable = measurable.measure(
        constraints.copy(
            minWidth = if (constraints.minWidth > 0) constraints.minWidth + extra else 0,
            maxWidth = if (constraints.hasBoundedWidth) constraints.maxWidth + extra else constraints.maxWidth
        )
    )
    layout((placeable.width - extra).coerceAtLeast(0), placeable.height) {
        placeable.placeRelative(-startPx, 0)
    }
}

@Composable
private fun rememberPressScale(interactionSource: MutableInteractionSource): Float {
    val pressed by interactionSource.collectIsPressedAsState()
    val reduceMotion = LocalReduceMotion.current
    val scale by animateFloatAsState(
        targetValue = if (pressed && !reduceMotion) 0.97f else 1f,
        animationSpec = if (reduceMotion) snap() else tween(durationMillis = 150),
        label = "pressScale"
    )
    return scale
}

@Composable
private fun windowWidthDp(): Dp {
    val windowInfo = LocalWindowInfo.current
    return with(LocalDensity.current) { windowInfo.containerSize.width.toDp() }
}

private fun shareCodeUrl(code: String): String {
    val baseUri = BuildConfig.PASSWORD_RESET_URL.toUri()
    return "${baseUri.scheme}://${baseUri.authority}/sharecodes/?code=$code"
}

private enum class AppButtonStyle { Primary, Secondary, Tonal, Ghost, Danger, Destructive }

@Composable
private fun AppButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: AppButtonStyle = AppButtonStyle.Primary,
    enabled: Boolean = true,
    icon: ImageVector? = null,
    iconSize: Dp = 18.dp
) {
    val colors = MaterialTheme.colorScheme
    val containerColor = when (style) {
        AppButtonStyle.Primary -> colors.primary
        AppButtonStyle.Secondary -> colors.surfaceContainer
        AppButtonStyle.Tonal -> rowActiveColor()
        AppButtonStyle.Ghost, AppButtonStyle.Danger -> Color.Transparent
        AppButtonStyle.Destructive -> colors.error
    }
    val contentColor = when (style) {
        AppButtonStyle.Primary -> colors.onPrimary
        AppButtonStyle.Secondary, AppButtonStyle.Tonal -> colors.onSurface
        AppButtonStyle.Ghost -> colors.onSurfaceVariant
        AppButtonStyle.Danger -> colors.error
        AppButtonStyle.Destructive -> Color.White
    }
    val interactionSource = remember { MutableInteractionSource() }
    val scale = rememberPressScale(interactionSource)
    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        color = containerColor,
        contentColor = contentColor,
        border = if (style == AppButtonStyle.Secondary) BorderStroke(1.dp, colors.outlineVariant) else null,
        interactionSource = interactionSource,
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .alpha(if (enabled) 1f else 0.45f)
    ) {
        Row(
            modifier = Modifier
                .heightIn(min = 44.dp)
                .padding(
                    horizontal = if (style == AppButtonStyle.Ghost || style == AppButtonStyle.Danger) 12.dp else 16.dp
                ),
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(iconSize))
            }
            Text(text, style = AppButtonTextStyle, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun AppIconButton(
    icon: ImageVector,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    iconSize: Dp = AppIconMetrics.standardActionIconSize,
    tint: Color = LocalContentColor.current,
    enabled: Boolean = true,
    size: Dp = 48.dp
) {
    val interactionSource = remember { MutableInteractionSource() }
    val scale = rememberPressScale(interactionSource)
    Box(
        modifier = modifier
            .size(size)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .clip(RoundedCornerShape(12.dp))
            .clickable(
                interactionSource = interactionSource,
                indication = ripple(),
                enabled = enabled,
                role = Role.Button,
                onClick = onClick
            )
            .then(
                if (contentDescription != null) {
                    Modifier.semantics { this.contentDescription = contentDescription }
                } else {
                    Modifier
                }
            ),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = if (enabled) tint else tint.copy(alpha = tint.alpha * 0.45f),
            modifier = Modifier.size(iconSize)
        )
    }
}

@Composable
private fun AppFieldLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = AppFieldLabelTextStyle,
        color = if (isAppDarkTheme()) AppGray.g300 else AppGray.g700,
        modifier = modifier
    )
}

@Composable
private fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    monospace: Boolean = false,
    password: Boolean = false,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default
) {
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()
    val dark = isAppDarkTheme()
    val colors = MaterialTheme.colorScheme
    val shape = RoundedCornerShape(12.dp)
    val ringColor = if (dark) AppGray.g700.copy(alpha = 0.7f) else AppGray.g300.copy(alpha = 0.7f)
    val textStyle = AppFieldTextStyle.copy(
        color = colors.onSurface,
        fontFamily = if (monospace) FontFamily.Monospace else GenInterfaceJPBodyFontFamily
    )
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        enabled = enabled,
        readOnly = readOnly,
        singleLine = true,
        textStyle = textStyle,
        keyboardOptions = if (password) keyboardOptions.copy(keyboardType = KeyboardType.Password) else keyboardOptions,
        keyboardActions = keyboardActions,
        visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
        interactionSource = interactionSource,
        cursorBrush = SolidColor(colors.onSurface),
        modifier = modifier
            .fillMaxWidth()
            .alpha(if (enabled) 1f else 0.6f)
            .drawBehind {
                if (focused && !readOnly) {
                    val ring = 3.dp.toPx()
                    drawRoundRect(
                        color = ringColor,
                        topLeft = Offset(-ring, -ring),
                        size = Size(size.width + ring * 2, size.height + ring * 2),
                        cornerRadius = CornerRadius(12.dp.toPx() + ring)
                    )
                }
            }
            .background(colors.background, shape)
            .border(1.dp, if (focused && !readOnly) colors.onSurfaceVariant else colors.outlineVariant, shape)
            .heightIn(min = 44.dp)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        decorationBox = { innerTextField ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 28.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                if (value.isEmpty() && placeholder != null) {
                    Text(
                        placeholder,
                        style = textStyle.copy(color = if (dark) AppGray.g500 else AppGray.g400),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                innerTextField()
            }
        }
    )
}

@Composable
private fun AppDialogFooter(
    start: (@Composable () -> Unit)? = null,
    content: @Composable () -> Unit
) {
    FlowRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        if (start != null) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .bleed(start = 12.dp)
            ) {
                start()
            }
        }
        content()
    }
}

@Composable
private fun AppDialog(
    onDismissRequest: () -> Unit,
    title: String,
    description: String? = null,
    footerStart: (@Composable () -> Unit)? = null,
    footer: @Composable () -> Unit,
    content: (@Composable ColumnScope.() -> Unit)? = null
) {
    Dialog(
        onDismissRequest = onDismissRequest,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceContainer,
            contentColor = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier
                .padding(16.dp)
                .widthIn(max = 416.dp)
                .fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        title,
                        style = AppDialogTitleTextStyle,
                        modifier = Modifier.semantics { heading() }
                    )
                    if (description != null) {
                        Text(
                            description,
                            style = AppBodySmallTextStyle,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                content?.invoke(this)
                AppDialogFooter(start = footerStart, content = footer)
            }
        }
    }
}

@Composable
private fun AppConfirmDialog(
    title: String,
    message: String?,
    confirmLabel: String,
    cancelLabel: String,
    destructive: Boolean,
    enabled: Boolean = true,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AppDialog(
        onDismissRequest = { if (enabled) onDismiss() },
        title = title,
        description = message,
        footer = {
            AppButton(cancelLabel, onDismiss, style = AppButtonStyle.Secondary, enabled = enabled)
            AppButton(
                confirmLabel,
                onConfirm,
                style = if (destructive) AppButtonStyle.Destructive else AppButtonStyle.Primary,
                enabled = enabled
            )
        }
    )
}

@Composable
private fun AppDialogField(label: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AppFieldLabel(label)
        content()
    }
}

@Composable
private fun AppColorPicker(
    selected: String?,
    enabled: Boolean = true,
    onSelect: (String?) -> Unit
) {
    val t = LocalTranslations.current
    val selectedRing = MaterialTheme.colorScheme.primary
    val ringGap = MaterialTheme.colorScheme.surfaceContainer
    val emptyFill = MaterialTheme.colorScheme.surfaceDim
    val emptyOutline = subtleOutlineColor()
    val swatchOutline = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        AppFieldLabel(t.t("taskList.selectColor"))
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val optionCount = TaskListBackgroundOptions.size
            val swatchSize = minOf(44.dp, (maxWidth - 4.dp * (optionCount - 1)) / optionCount)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TaskListBackgroundOptions.forEach { color ->
                    val isSelected = selected == color
                    Box(
                        modifier = Modifier
                            .size(swatchSize)
                            .clip(CircleShape)
                            .clickable(enabled = enabled, role = Role.Button) { onSelect(color) }
                            .semantics {
                                contentDescription = "${t.t("taskList.selectColor")}: ${colorLabel(t, color)}"
                                this.selected = isSelected
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(swatchSize * (32f / 44f))
                                .drawBehind {
                                    if (isSelected) {
                                        drawCircle(selectedRing, radius = size.minDimension / 2 + 4.dp.toPx())
                                        drawCircle(ringGap, radius = size.minDimension / 2 + 2.dp.toPx())
                                    }
                                }
                                .background(color?.let(::parseHexColor) ?: emptyFill, CircleShape)
                                .border(1.dp, if (color == null) emptyOutline else swatchOutline, CircleShape)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AppListDot(background: String?, modifier: Modifier = Modifier, size: Dp = 10.dp) {
    Box(
        modifier = modifier
            .size(size)
            .then(
                if (background != null) {
                    Modifier.background(parseHexColor(background), CircleShape)
                } else {
                    Modifier.border(1.5.dp, subtleOutlineColor(), CircleShape)
                }
            )
    )
}

@Composable
private fun AppSwitch(checked: Boolean, modifier: Modifier = Modifier) {
    val reduceMotion = LocalReduceMotion.current
    val dark = isAppDarkTheme()
    val colors = MaterialTheme.colorScheme
    val thumbOffset by animateDpAsState(
        targetValue = if (checked) 24.dp else 4.dp,
        animationSpec = if (reduceMotion) snap() else tween(durationMillis = 150),
        label = "switchThumb"
    )
    val trackColor = if (checked) colors.primary else if (dark) colors.surfaceContainer else AppGray.g300
    val borderColor = if (checked) colors.primary else if (dark) AppGray.g700 else AppGray.g300
    Box(
        modifier = modifier
            .size(width = 48.dp, height = 28.dp)
            .background(trackColor, CircleShape)
            .border(1.dp, borderColor, CircleShape)
            .padding(1.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Box(
            modifier = Modifier
                .offset { IntOffset(thumbOffset.roundToPx(), 0) }
                .size(20.dp)
                .shadow(1.dp, CircleShape)
                .background(if (dark) colors.background else Color.White, CircleShape)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppSheet(
    onDismissRequest: () -> Unit,
    paneTitle: String,
    content: @Composable ColumnScope.() -> Unit
) {
    val containerColor = MaterialTheme.colorScheme.surfaceContainer
    val windowInfo = LocalWindowInfo.current
    val density = LocalDensity.current
    val statusBarTop = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val maxSheetHeight = with(density) {
        minOf(704.dp, windowInfo.containerSize.height.toDp() * 0.88f, windowInfo.containerSize.height.toDp() - statusBarTop - 8.dp)
    }
    if (windowWidthDp() >= 640.dp) {
        Dialog(
            onDismissRequest = onDismissRequest,
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = containerColor,
                contentColor = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier
                    .padding(16.dp)
                    .widthIn(max = 448.dp)
                    .fillMaxWidth()
                    .semantics { this.paneTitle = paneTitle }
            ) {
                Column(
                    modifier = Modifier
                        .heightIn(max = maxSheetHeight)
                        .padding(start = 24.dp, end = 24.dp, top = 16.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    content = content
                )
            }
        }
    } else {
        ModalBottomSheet(
            onDismissRequest = onDismissRequest,
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            sheetMaxWidth = Dp.Unspecified,
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
            containerColor = containerColor,
            contentColor = MaterialTheme.colorScheme.onSurface,
            dragHandle = null,
            contentWindowInsets = { WindowInsets(0) },
            modifier = Modifier.semantics { this.paneTitle = paneTitle }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = maxSheetHeight)
                    .navigationBarsPadding()
                    .imePadding()
                    .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                content = content
            )
        }
    }
}

@Composable
private fun AppSheetHeader(title: String, onClose: () -> Unit, closeEnabled: Boolean = true) {
    val t = LocalTranslations.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 44.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            title,
            style = AppHeaderTitleTextStyle,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .weight(1f)
                .semantics { heading() }
        )
        AppButton(
            t.t("common.close"),
            onClose,
            style = AppButtonStyle.Ghost,
            enabled = closeEnabled,
            modifier = Modifier.bleed(end = 12.dp)
        )
    }
}

@Composable
private fun AppPinToggleButton(pinned: Boolean, onToggle: () -> Unit, enabled: Boolean = true) {
    val t = LocalTranslations.current
    AppButton(
        text = t.t(if (pinned) "pages.tasklist.unpinTask" else "pages.tasklist.pinTask"),
        onClick = onToggle,
        style = if (pinned) AppButtonStyle.Primary else AppButtonStyle.Tonal,
        enabled = enabled,
        icon = Icons.Default.PushPin,
        modifier = Modifier.semantics { selected = pinned }
    )
}

@Composable
private fun AppSheetCalendarSurface(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceDim)
            .padding(start = 8.dp, end = 8.dp, top = 8.dp, bottom = 12.dp)
    ) {
        content()
    }
}

private data class CalendarMonth(val year: Int, val month: Int) {
    val key: String get() = String.format(Locale.US, "%04d-%02d", year, month)

    fun plus(months: Int): CalendarMonth {
        val index = year * 12 + (month - 1) + months
        return CalendarMonth(Math.floorDiv(index, 12), Math.floorMod(index, 12) + 1)
    }

    companion object {
        fun current(): CalendarMonth {
            val calendar = Calendar.getInstance()
            return CalendarMonth(calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH) + 1)
        }

        fun fromDateKey(dateKey: String?): CalendarMonth? {
            val date = dateKey?.takeIf { it.isNotBlank() }?.let(::parseTaskInputDate) ?: return null
            val calendar = Calendar.getInstance().apply { time = date }
            return CalendarMonth(calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH) + 1)
        }
    }
}

private fun calendarWeekStart(languageTag: String): Int = when (languageTag) {
    "es", "de", "fr", "zh-CN", "id" -> Calendar.MONDAY
    "ar" -> Calendar.SATURDAY
    else -> Calendar.SUNDAY
}

private fun calendarMonthDateKeys(month: CalendarMonth, weekStart: Int): List<String> {
    val first = taskInputDateFrom(month.year, month.month, 1) ?: return emptyList()
    val calendar = Calendar.getInstance().apply { time = first }
    val leadingDays = (calendar.get(Calendar.DAY_OF_WEEK) - weekStart + 7) % 7
    val daysInMonth = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
    val totalDays = (leadingDays + daysInMonth + 6) / 7 * 7
    calendar.add(Calendar.DAY_OF_MONTH, -leadingDays)
    return List(totalDays) {
        formatTaskInputDate(calendar.time).also { calendar.add(Calendar.DAY_OF_MONTH, 1) }
    }
}

@Composable
private fun AppMonthCalendar(
    month: CalendarMonth,
    onMonthChange: (CalendarMonth) -> Unit,
    selectedDateKey: String?,
    onSelectDate: (String?) -> Unit,
    modifier: Modifier = Modifier,
    dotColorsByDate: Map<String, List<String?>> = emptyMap()
) {
    val t = LocalTranslations.current
    val languageTag = t.languageTag()
    val weekStart = calendarWeekStart(languageTag)
    val monthTitle = remember(month, languageTag) {
        val locale = localeForLanguage(languageTag)
        val pattern = DateFormat.getBestDateTimePattern(locale, "yMMMM")
        taskInputDateFrom(month.year, month.month, 1)
            ?.let { SimpleDateFormat(pattern, locale).format(it) }
            .orEmpty()
    }
    val weekdayLabels = remember(languageTag, weekStart) {
        val names = android.icu.text.DateFormatSymbols.getInstance(localeForLanguage(languageTag))
            .getWeekdays(
                android.icu.text.DateFormatSymbols.STANDALONE,
                android.icu.text.DateFormatSymbols.SHORT
            )
        List(7) { index -> names[(weekStart - 1 + index) % 7 + 1] }
    }
    val dateKeys = remember(month, weekStart) { calendarMonthDateKeys(month, weekStart) }
    val todayKey = formatTaskInputDate(Date())
    val monthPrefix = month.key

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AppIconButton(
                icon = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = t.t("app.calendarPreviousMonth"),
                onClick = { onMonthChange(month.plus(-1)) },
                iconSize = 20.dp,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                size = 44.dp,
                modifier = Modifier.clip(CircleShape)
            )
            Text(
                monthTitle,
                style = AppHeaderTitleTextStyle,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                maxLines = 1,
                modifier = Modifier
                    .weight(1f)
                    .semantics { heading() }
            )
            AppIconButton(
                icon = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = t.t("app.calendarNextMonth"),
                onClick = { onMonthChange(month.plus(1)) },
                iconSize = 20.dp,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                size = 44.dp,
                modifier = Modifier.clip(CircleShape)
            )
        }
        Spacer(Modifier.height(4.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            weekdayLabels.forEach { label ->
                Text(
                    label,
                    style = TextStyle(
                        fontFamily = GenInterfaceJPBodyFontFamily,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        lineHeight = 16.sp
                    ),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f)
                )
            }
        }
        dateKeys.chunked(7).forEach { week ->
            Spacer(Modifier.height(4.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                week.forEach { dateKey ->
                    val isOutside = !dateKey.startsWith(monthPrefix)
                    val isSelected = dateKey == selectedDateKey
                    AppCalendarDay(
                        dayNumber = dateKey.takeLast(2).toInt(),
                        isOutside = isOutside,
                        isToday = dateKey == todayKey,
                        isSelected = isSelected,
                        dots = dotColorsByDate[dateKey].orEmpty(),
                        onClick = {
                            if (isSelected) {
                                onSelectDate(null)
                            } else {
                                if (isOutside) {
                                    CalendarMonth.fromDateKey(dateKey)?.let(onMonthChange)
                                }
                                onSelectDate(dateKey)
                            }
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
private fun AppCalendarDay(
    dayNumber: Int,
    isOutside: Boolean,
    isToday: Boolean,
    isSelected: Boolean,
    dots: List<String?>,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val t = LocalTranslations.current
    val reduceMotion = LocalReduceMotion.current
    val colors = MaterialTheme.colorScheme
    val fillColor by animateColorAsState(
        targetValue = if (isSelected) colors.primary else Color.Transparent,
        animationSpec = if (reduceMotion) snap() else tween(durationMillis = 180),
        label = "calendarDayFill"
    )
    val contentColor by animateColorAsState(
        targetValue = when {
            isSelected -> colors.onPrimary
            isOutside -> subtleOutlineColor()
            else -> colors.onSurface
        },
        animationSpec = if (reduceMotion) snap() else tween(durationMillis = 180),
        label = "calendarDayContent"
    )
    val selectionScale by animateFloatAsState(
        targetValue = if (isSelected) 1f else 0.84f,
        animationSpec = if (reduceMotion) snap() else spring(dampingRatio = 0.55f, stiffness = Spring.StiffnessMedium),
        label = "calendarDayScale"
    )
    val todayOutline = subtleOutlineColor()
    val emptyDotOutline = subtleOutlineColor()
    val dayLabel = buildList {
        add("$dayNumber")
        if (isToday) add(t.t("a11y.today"))
        if (dots.isNotEmpty()) add(t.t("a11y.hasTasks"))
    }.joinToString(", ")
    Box(
        modifier = modifier.height(48.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .clickable(role = Role.Button, onClick = onClick)
                .semantics {
                    contentDescription = dayLabel
                    selected = isSelected
                }
                .then(
                    if (isToday && !isSelected) Modifier.border(1.dp, todayOutline, CircleShape) else Modifier
                ),
            contentAlignment = Alignment.Center
        ) {
            Box(
                Modifier
                    .matchParentSize()
                    .graphicsLayer {
                        scaleX = selectionScale
                        scaleY = selectionScale
                    }
                    .background(fillColor, CircleShape)
            )
            Text(
                "$dayNumber",
                style = TextStyle(
                    fontFamily = GenInterfaceJPBodyFontFamily,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    lineHeight = 20.sp
                ),
                color = contentColor,
                modifier = Modifier.padding(bottom = if (dots.isNotEmpty()) 8.dp else 0.dp)
            )
            if (dots.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    dots.forEach { hexColor ->
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .then(
                                    if (hexColor == null) {
                                        Modifier.border(1.dp, emptyDotOutline, CircleShape)
                                    } else {
                                        Modifier.background(parseHexColor(hexColor), CircleShape)
                                    }
                                )
                        )
                    }
                }
            }
        }
    }
}

private val AUTH_ERROR_KEY_MAP = mapOf(
    "auth/invalid-credential" to "auth.error.invalidCredential",
    "auth/user-not-found" to "auth.error.userNotFound",
    "auth/email-already-in-use" to "auth.error.emailAlreadyInUse",
    "auth/weak-password" to "auth.error.weakPassword",
    "auth/invalid-email" to "auth.error.invalidEmail",
    "auth/operation-not-allowed" to "auth.error.operationNotAllowed",
    "auth/too-many-requests" to "auth.error.tooManyRequests",
    "auth/requires-recent-login" to "auth.error.requiresRecentLogin",
    "auth/expired-action-code" to "auth.passwordReset.expiredCode",
    "auth/invalid-action-code" to "auth.passwordReset.invalidCode",
    "ERROR_INVALID_CREDENTIAL" to "auth.error.invalidCredential",
    "ERROR_WRONG_PASSWORD" to "auth.error.invalidCredential",
    "ERROR_USER_NOT_FOUND" to "auth.error.userNotFound",
    "ERROR_EMAIL_ALREADY_IN_USE" to "auth.error.emailAlreadyInUse",
    "ERROR_WEAK_PASSWORD" to "auth.error.weakPassword",
    "ERROR_INVALID_EMAIL" to "auth.error.invalidEmail",
    "ERROR_OPERATION_NOT_ALLOWED" to "auth.error.operationNotAllowed",
    "ERROR_TOO_MANY_REQUESTS" to "auth.error.tooManyRequests",
    "ERROR_REQUIRES_RECENT_LOGIN" to "auth.error.requiresRecentLogin",
    "ERROR_EXPIRED_ACTION_CODE" to "auth.passwordReset.expiredCode",
    "ERROR_INVALID_ACTION_CODE" to "auth.passwordReset.invalidCode"
)

private fun resolveAuthErrorMessage(
    translations: Translations,
    error: Throwable?,
    fallbackKey: String = "auth.error.general"
): String {
    if (error == null) {
        return translations.t(fallbackKey)
    }

    val errorCode = (error as? FirebaseAuthException)?.errorCode
    if (errorCode != null) {
        val translationKey = AUTH_ERROR_KEY_MAP[errorCode]
        if (translationKey != null) {
            return translations.t(translationKey)
        }
    }

    val message = error.message
    if (message != null &&
        message.contains("incorrect, malformed or has expired", ignoreCase = true)
    ) {
        return translations.t("auth.error.invalidCredential")
    }

    return message ?: translations.t(fallbackKey)
}

private fun normalizeLanguageCode(language: String): String {
    return if (Translations.isSupported(language)) language else "ja"
}

private fun resolveDeviceLanguage(context: Context): String {
    val locale = context.resources.configuration.locales[0] ?: return "ja"
    val languageTag = locale.toLanguageTag()
    val language = locale.language
    return when {
        languageTag == "zh-CN" -> "zh-CN"
        languageTag == "pt-BR" -> "pt-BR"
        language == "zh" -> "zh-CN"
        language == "pt" -> "pt-BR"
        Translations.isSupported(language) -> language
        else -> "ja"
    }
}

private fun resolveStartupLanguage(
    context: Context,
    userId: String?,
    settingsLanguage: String
): String {
    return if (userId == null) {
        resolveDeviceLanguage(context)
    } else {
        normalizeLanguageCode(settingsLanguage)
    }
}

private val EMAIL_REGEX = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

private fun isValidEmail(email: String): Boolean {
    return EMAIL_REGEX.matches(email)
}

private fun validateEmailField(translations: Translations, email: String): String? {
    return when {
        email.isBlank() -> translations.t("auth.validation.email.required")
        !isValidEmail(email) -> translations.t("auth.validation.email.invalid")
        else -> null
    }
}

private fun validatePasswordField(
    translations: Translations,
    password: String,
    requireLength: Boolean
): String? {
    return when {
        password.isEmpty() -> translations.t("auth.validation.password.required")
        requireLength && password.length < 8 -> translations.t("auth.validation.password.tooShort")
        else -> null
    }
}

private fun validateConfirmPasswordField(
    translations: Translations,
    password: String,
    confirmPassword: String
): String? {
    return when {
        confirmPassword.isEmpty() -> translations.t("auth.validation.confirmPassword.required")
        password != confirmPassword -> translations.t("auth.validation.confirmPassword.notMatch")
        else -> null
    }
}

private suspend fun signUpWithInitialData(
    email: String,
    password: String,
    language: String,
    initialTaskListName: String
) {
    val auth = Firebase.auth
    val db = Firebase.firestore
    val normalizedLanguage = normalizeLanguageCode(language)
    val userCredential = auth.createUserWithEmailAndPassword(email, password).await()
    val uid = userCredential.user?.uid ?: throw IllegalStateException("Missing user ID")
    val taskListId = db.collection("taskLists").document().id
    val now = nowMillis()
    val settingsData = mapOf(
        "theme" to "system",
        "language" to normalizedLanguage,
        "taskInsertPosition" to "top",
        "autoSort" to true,
        "startupView" to "taskList",
        "createdAt" to now,
        "updatedAt" to now
    )
    val taskListData = hashMapOf<String, Any?>(
        "id" to taskListId,
        "name" to initialTaskListName,
        "tasks" to emptyMap<String, Any>(),
        "history" to emptyList<Any>(),
        "shareCode" to null,
        "background" to null,
        "memberCount" to 1,
        "createdAt" to now,
        "updatedAt" to now
    )
    val taskListOrderData = mapOf(
        taskListId to mapOf("order" to 1.0),
        "createdAt" to now,
        "updatedAt" to now
    )

    db.batch().apply {
        set(db.collection("settings").document(uid), settingsData)
        set(db.collection("taskLists").document(taskListId), taskListData)
        set(
            db.collection("taskLists").document(taskListId)
                .collection("members").document(uid),
            mapOf("joinedAt" to now, "joinCode" to null)
        )
        set(db.collection("taskListOrder").document(uid), taskListOrderData)
    }.commit().await()
}

private suspend fun sendPasswordResetEmail(email: String, language: String) {
    val auth = Firebase.auth
    auth.setLanguageCode(normalizeLanguageCode(language))
    val actionCodeSettings = ActionCodeSettings.newBuilder()
        .setUrl(BuildConfig.PASSWORD_RESET_URL)
        .setHandleCodeInApp(true)
        .setAndroidPackageName(BuildConfig.APPLICATION_ID, false, null)
        .setLinkDomain(BuildConfig.PASSWORD_RESET_LINK_DOMAIN)
        .build()
    auth.sendPasswordResetEmail(email, actionCodeSettings).await()
}

private enum class TabletPane {
    TaskList,
    Settings,
    Calendar
}

private data class SettingsState(
    val theme: String = "system",
    val language: String = "ja",
    val taskInsertPosition: String = "top",
    val autoSort: Boolean = true,
    val startupView: String = "taskList",
    val userEmail: String = "",
    val isLoading: Boolean = true,
    val hasError: Boolean = false
)

private fun resolveSettingsState(
    record: FirestoreSettingsRecord,
    userEmail: String
): SettingsState? {
    val theme = record.theme ?: "system"
    val language = record.language ?: "ja"
    val taskInsertPosition = record.taskInsertPosition ?: "top"
    if (
        (theme != "system" && theme != "light" && theme != "dark") ||
        !Translations.isSupported(language) ||
        (taskInsertPosition != "top" && taskInsertPosition != "bottom")
    ) {
        return null
    }
    return SettingsState(
        theme = theme,
        language = language,
        taskInsertPosition = taskInsertPosition,
        autoSort = record.autoSort ?: true,
        startupView = normalizeStartupView(record.startupView),
        userEmail = userEmail,
        isLoading = false,
        hasError = false
    )
}

@Composable
private fun resolvedSettingsState(userId: String?, settingsState: SettingsState): SettingsState {
    val override = userId?.let { autoSortOverrides[it] }
    return if (override == null || override == settingsState.autoSort) {
        settingsState
    } else {
        settingsState.copy(autoSort = override)
    }
}

private class SyncListenerRetryController(
    private val scope: CoroutineScope,
    private val onRetry: () -> Unit,
    private val onError: (String, Exception) -> Unit
) {
    private var retryJob: Job? = null
    private var retryDelayMs = 1000L
    private var reportedError = false
    private var disposed = false

    fun fail(source: String, error: Exception) {
        if (disposed) return
        if (!reportedError) {
            onError(source, error)
            reportedError = true
        }
        if (retryJob?.isActive == true) return
        val delayMs = retryDelayMs
        retryDelayMs = minOf(retryDelayMs * 2, 30000L)
        retryJob = scope.launch {
            delay(delayMs)
            retryJob = null
            if (!disposed) onRetry()
        }
    }

    fun markHealthy(isFromCache: Boolean) {
        if (!isFromCache) {
            retryDelayMs = 1000L
            reportedError = false
        }
    }

    fun dispose() {
        disposed = true
        retryJob?.cancel()
        retryJob = null
    }
}

private fun <T> subscribeToOrderedTaskLists(
    userId: String,
    parseDocument: (String, FirestoreTaskListRecord) -> T,
    onPublish: (List<T>) -> Unit,
    onError: (() -> Unit)? = null
): () -> Unit {
    val db = Firebase.firestore
    var orderedTaskListIds = readCachedTaskListOrderIds(userId)
    var taskListIdsKey: String? = null
    var taskListsById = emptyMap<String, T>()
    var chunkDisposers = emptyList<() -> Unit>()
    var orderListener: ListenerRegistration? = null
    var disposed = false
    var chunkGeneration = 0
    var accessibleTaskListIds = emptyList<String>()
    var membershipTask: Job? = null
    val failedScopes = mutableSetOf<String>()
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    lateinit var membershipRetry: SyncListenerRetryController

    fun publish() {
        onPublish(orderedTaskListIds.mapNotNull { taskListsById[it] })
        if (failedScopes.isNotEmpty()) onError?.invoke()
    }

    fun subscribeToTaskLists(ids: List<String>, forceMembershipRefresh: Boolean = false) {
        val key = ids.sorted().joinToString("|")
        if (!forceMembershipRefresh && taskListIdsKey == key) { publish(); return }
        taskListIdsKey = key
        chunkGeneration += 1
        val generation = chunkGeneration
        membershipTask?.cancel()
        membershipTask = null
        chunkDisposers.forEach { it() }
        failedScopes.removeAll { it != "order" }
        accessibleTaskListIds = emptyList()
        taskListsById = emptyMap()
        chunkDisposers = emptyList()
        if (ids.isEmpty()) {
            publish()
            return
        }
        fun installTaskListChunks(taskListIds: List<String>) {
            accessibleTaskListIds = taskListIds
            chunkDisposers = taskListIds.chunked(10).map { chunk ->
                    val chunkKey = chunk.joinToString("|")
                    var listener: ListenerRegistration? = null
                    lateinit var retry: SyncListenerRetryController
                    fun install() {
                        if (disposed || generation != chunkGeneration) return
                        listener?.remove()
                        listener = db.collection("taskLists")
                            .whereIn(FieldPath.documentId(), chunk)
                            .addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
                                if (disposed || generation != chunkGeneration) return@addSnapshotListener
                                if (error != null) {
                                    listener?.remove()
                                    listener = null
                                    failedScopes.add(chunkKey)
                                    retry.fail("task_lists", error)
                                    onError?.invoke()
                                    return@addSnapshotListener
                                }
                                val next = taskListsById.filterKeys { it !in chunk }.toMutableMap()
                                snapshot?.documents?.forEach { document ->
                                    scheduleMalformedTaskCleanup(
                                        document.id, document.data ?: emptyMap(),
                                        document.metadata.isFromCache, document.metadata.hasPendingWrites()
                                    )
                                    next[document.id] = parseDocument(document.id, decodeTaskListRecord(document))
                                }
                                taskListsById = next
                                val fromCache = snapshot?.metadata?.isFromCache ?: true
                                if (!fromCache) failedScopes.remove(chunkKey)
                                retry.markHealthy(fromCache)
                                publish()
                            }
                    }
                    retry = SyncListenerRetryController(scope, ::install, ::recordSyncListenerError)
                    install()
                    val dispose: () -> Unit = { retry.dispose(); listener?.remove() }
                    dispose
            }
        }

        membershipTask = scope.launch {
            try {
                val memberIds = resolveMemberTaskListIds(db, ids, userId)
                if (disposed || generation != chunkGeneration) return@launch
                failedScopes.remove("membership")
                installTaskListChunks(memberIds)
                publish()
            } catch (error: Exception) {
                if (disposed || generation != chunkGeneration) return@launch
                if ((error as? FirebaseFirestoreException)?.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) {
                    failedScopes.remove("membership")
                    installTaskListChunks(ids)
                    publish()
                    return@launch
                }
                failedScopes.add("membership")
                membershipRetry.fail("task_list_membership", error)
                onError?.invoke()
            }
        }
    }

    lateinit var orderRetry: SyncListenerRetryController
    fun installOrderListener() {
        if (disposed) return
        orderListener?.remove()
        orderListener = db.collection("taskListOrder").document(userId)
            .addSnapshotListener { snapshot, error ->
                if (disposed) return@addSnapshotListener
                if (error != null) {
                    orderListener?.remove()
                    orderListener = null
                    failedScopes.add("order")
                    orderRetry.fail("task_list_order", error)
                    onError?.invoke()
                    return@addSnapshotListener
                }
                orderedTaskListIds = parseOrderedTaskListIds(snapshot?.data ?: emptyMap())
                writeCachedTaskListOrderIds(userId, orderedTaskListIds)
                val fromCache = snapshot?.metadata?.isFromCache ?: true
                if (!fromCache) failedScopes.remove("order")
                orderRetry.markHealthy(fromCache)
                subscribeToTaskLists(orderedTaskListIds, forceMembershipRefresh = true)
            }
    }
    orderRetry = SyncListenerRetryController(scope, ::installOrderListener, ::recordSyncListenerError)
    membershipRetry = SyncListenerRetryController(
        scope,
        { subscribeToTaskLists(orderedTaskListIds, forceMembershipRefresh = true) },
        ::recordSyncListenerError
    )
    subscribeToTaskLists(orderedTaskListIds)
    installOrderListener()
    return {
        disposed = true
        orderRetry.dispose()
        membershipRetry.dispose()
        membershipTask?.cancel()
        orderListener?.remove()
        chunkDisposers.forEach { it() }
        scope.cancel()
    }
}

@Composable
fun RootScreen(
    pendingDeepLink: PendingDeepLink?,
    onPendingDeepLinkConsumed: () -> Unit
) {
    val navController = rememberNavController()
    var isLoggedIn by remember { mutableStateOf(Firebase.auth.currentUser != null) }
    var currentUserId by remember { mutableStateOf(Firebase.auth.currentUser?.uid) }
    var authStateResolved by remember { mutableStateOf(Firebase.auth.currentUser != null) }
    var authScreen by rememberSaveable { mutableStateOf(AuthScreen.SignIn) }
    var pendingPasswordResetCode by rememberSaveable { mutableStateOf<String?>(null) }
    var pendingSharePreviewCode by rememberSaveable { mutableStateOf<String?>(null) }
    var requestedTaskListId by rememberSaveable { mutableStateOf<String?>(null) }

    DisposableEffect(Unit) {
        val listener = FirebaseAuth.AuthStateListener { auth ->
            FirebaseCrashlytics.getInstance().setUserId(auth.currentUser?.uid ?: "")
            isLoggedIn = auth.currentUser != null
            currentUserId = auth.currentUser?.uid
            authStateResolved = true
        }
        Firebase.auth.addAuthStateListener(listener)
        onDispose { Firebase.auth.removeAuthStateListener(listener) }
    }

    val settingsState = resolvedSettingsState(currentUserId, rememberSettingsState(currentUserId))
    val context = LocalContext.current
    val startupLanguage = remember(currentUserId, settingsState.language, context) {
        resolveStartupLanguage(context, currentUserId, settingsState.language)
    }
    val translations = remember(startupLanguage, context) {
        Translations.from(context, startupLanguage)
    }
    val darkTheme = when (settingsState.theme) {
        "dark" -> true
        "light" -> false
        else -> isSystemInDarkTheme()
    }
    var startupNavigationUserId by rememberSaveable { mutableStateOf<String?>(null) }

    SideEffect {
        val activity = context as? ComponentActivity ?: return@SideEffect
        val insetsController = WindowCompat.getInsetsController(
            activity.window,
            activity.window.decorView
        )
        insetsController.isAppearanceLightStatusBars = !darkTheme
        insetsController.isAppearanceLightNavigationBars = !darkTheme
    }

    LaunchedEffect(pendingDeepLink) {
        when (pendingDeepLink) {
            is PendingDeepLink.PasswordReset -> {
                pendingPasswordResetCode = pendingDeepLink.code
                authScreen = AuthScreen.Reset
            }
            is PendingDeepLink.ShareCode -> {
                pendingSharePreviewCode = pendingDeepLink.shareCode
            }
            null -> Unit
        }
        if (pendingDeepLink != null) {
            onPendingDeepLinkConsumed()
        }
    }

    LightlistTheme(darkTheme = darkTheme) {
    key(startupLanguage) {
    CompositionLocalProvider(
        LocalTranslations provides translations,
        LocalLayoutDirection provides if (startupLanguage == "ar") {
            LayoutDirection.Rtl
        } else {
            LayoutDirection.Ltr
        }
    ) {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        if (pendingPasswordResetCode != null) {
            ResetPasswordView(
                code = pendingPasswordResetCode!!,
                onDismiss = { pendingPasswordResetCode = null }
            )
        } else if (pendingSharePreviewCode != null) {
            SharedTaskListPreviewScreen(
                shareCode = pendingSharePreviewCode!!,
                userId = currentUserId,
                onDismiss = { pendingSharePreviewCode = null },
                onAdded = { taskListId ->
                    pendingSharePreviewCode = null
                    requestedTaskListId = taskListId
                }
            )
        } else {
            val isTabletLayout = isLoggedIn && maxWidth >= TABLET_MIN_WIDTH_DP.dp

            if (isTabletLayout) {
                TabletRootScreen(
                    userId = currentUserId,
                    initialSelectedTaskListId = requestedTaskListId,
                    onSelectedTaskListHandled = { requestedTaskListId = null }
                )
            } else {
                Box(Modifier.fillMaxSize()) {
                    NavHost(
                        navController,
                        startDestination = AppRoute.TaskLists.route,
                        enterTransition = {
                            if (isInitialAutoNavigation(targetState)) {
                                EnterTransition.None
                            } else {
                                slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(300))
                            }
                        },
                        exitTransition = {
                            if (isInitialAutoNavigation(targetState)) {
                                ExitTransition.None
                            } else {
                                slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(300))
                            }
                        },
                        popEnterTransition = {
                            slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(300))
                        },
                        popExitTransition = {
                            slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(300))
                        }
                    ) {
                        composable(AppRoute.TaskLists.route) { TaskListsScreen(navController, currentUserId) }
                        composable(
                            route = AppRoute.Calendar.route,
                            arguments = listOf(
                                navArgument(AppRoute.Calendar.argumentName) {
                                    type = NavType.StringType
                                    defaultValue = "false"
                                }
                            )
                        ) {
                            CalendarScreen(
                                navController = navController,
                                userId = currentUserId,
                                externalSettingsState = settingsState
                            )
                        }
                        composable(
                            route = AppRoute.TaskList.route,
                            arguments = listOf(navArgument(AppRoute.TaskList.argumentName) { type = NavType.StringType })
                        ) { backStackEntry ->
                            val initialTaskListId =
                                backStackEntry.arguments?.getString(AppRoute.TaskList.argumentName).orEmpty()
                            TaskListDetailPagerScreen(navController, currentUserId, initialTaskListId, externalSettingsState = settingsState)
                        }
                        composable(AppRoute.Settings.route) {
                            SettingsView(
                                navController = navController,
                                externalSettingsState = settingsState
                            )
                        }
                    }

                    LaunchedEffect(currentUserId, isLoggedIn, settingsState.isLoading) {
                        if (!isLoggedIn || currentUserId == null) {
                            startupNavigationUserId = null
                            return@LaunchedEffect
                        }
                        if (settingsState.isLoading || startupNavigationUserId == currentUserId) {
                            return@LaunchedEffect
                        }

                        startupNavigationUserId = currentUserId
                        navController.navigate(AppRoute.TaskLists.route) {
                            popUpTo(navController.graph.startDestinationId)
                            launchSingleTop = true
                        }
                        when (settingsState.startupView) {
                            "calendar" -> navController.navigate(AppRoute.Calendar.createRoute(initial = true))
                            "taskLists" -> Unit
                            else -> navController.navigate(AppRoute.TaskList.createRoute("__initial__"))
                        }
                    }

                    LaunchedEffect(requestedTaskListId, isLoggedIn) {
                        val taskListId = requestedTaskListId ?: return@LaunchedEffect
                        if (!isLoggedIn) {
                            return@LaunchedEffect
                        }
                        navController.navigate(AppRoute.TaskList.createRoute(taskListId)) {
                            launchSingleTop = true
                        }
                        requestedTaskListId = null
                    }
                }
            }

            if (authStateResolved && !isLoggedIn) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background)
                ) {
                    AuthView(
                        initialScreen = authScreen,
                        language = startupLanguage,
                        onScreenChange = { authScreen = it }
                    )
                }
            }

            if (!authStateResolved) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background)
                )
            }
        }
    }
}
    }
    }
}

@Composable
private fun SharedTaskListPreviewScreen(
    shareCode: String,
    userId: String?,
    onDismiss: () -> Unit,
    onAdded: (String) -> Unit
) {
    val t = LocalTranslations.current
    val previewUiState = rememberSharedTaskListPreviewState(shareCode, userId)
    val settingsState = resolvedSettingsState(userId, rememberSettingsState(userId))
    val scope = rememberCoroutineScope()
    var isJoining by remember { mutableStateOf(false) }
    var addToOrderError by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(resolveTaskListBackgroundColor(previewUiState.taskList?.background))
    ) {
        when {
            previewUiState.isLoading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            previewUiState.taskList != null -> {
                TaskListDetailContent(
                    taskList = previewUiState.taskList,
                    taskInsertPosition = settingsState.taskInsertPosition,
                    autoSort = settingsState.autoSort,
                    topInset = 56.dp,
                    allowTaskEditing = previewUiState.isAdded,
                    allowTaskListDeletion = previewUiState.isAdded,
                    allowShareCodeManagement = previewUiState.isAdded
                )
            }
            else -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        previewUiState.errorMessage ?: t.t("pages.sharecode.error"),
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal))
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            AppIconButton(
                icon = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = t.t("common.back"),
                onClick = onDismiss,
                modifier = Modifier.bleed(start = 12.dp)
            )

            if (userId != null && !previewUiState.isAdded && previewUiState.taskListId != null) {
                AppButton(
                    text = if (isJoining) t.t("common.loading") else t.t("pages.sharecode.addToOrder"),
                    onClick = {
                        scope.launch {
                            isJoining = true
                            addToOrderError = null
                            try {
                                addSharedTaskListToOrder(previewUiState.taskListId, shareCode)
                                logShareCodeJoin()
                                onAdded(previewUiState.taskListId)
                            } catch (_: Exception) {
                                addToOrderError = t.t("pages.sharecode.addToOrderError")
                            } finally {
                                isJoining = false
                            }
                        }
                    },
                    enabled = !isJoining
                )
            }
        }

        if (addToOrderError != null) {
            Text(
                addToOrderError!!,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 72.dp, start = 16.dp, end = 16.dp)
            )
        }
    }
}

@Composable
private fun <T> rememberOrderedTaskListsState(
    userId: String?,
    parseDocument: (String, FirestoreTaskListRecord) -> T
): OrderedTaskListsUiState<T> {
    var uiState by remember(userId) {
        mutableStateOf(
            OrderedTaskListsUiState<T>(
                isLoading = userId != null,
                hasError = false
            )
        )
    }

    DisposableEffect(userId) {
        if (userId == null) {
            uiState = OrderedTaskListsUiState()
            onDispose {}
        } else {
            uiState = OrderedTaskListsUiState(isLoading = true, hasError = false)
            val dispose = subscribeToOrderedTaskLists(
                userId = userId,
                parseDocument = parseDocument,
                onPublish = { taskLists ->
                    uiState = OrderedTaskListsUiState<T>(
                        taskLists = taskLists,
                        isLoading = false,
                        hasError = false
                    )
                },
                onError = {
                    uiState = uiState.copy(isLoading = false, hasError = true)
                }
            )

            onDispose { dispose() }
        }
    }

    return uiState
}

@Composable
private fun <T> rememberOrderedTaskLists(userId: String?, parseDocument: (String, FirestoreTaskListRecord) -> T): List<T> {
    return rememberOrderedTaskListsState(userId, parseDocument).taskLists
}

private data class OrderedTaskListsUiState<T>(
    val taskLists: List<T> = emptyList(),
    val isLoading: Boolean = false,
    val hasError: Boolean = false
)

@Composable
private fun rememberSettingsState(userId: String?): SettingsState {
    var uiState by remember(userId) { mutableStateOf(SettingsState(isLoading = userId != null)) }
    DisposableEffect(userId) {
        if (userId == null) {
            autoSortOverrides.clear()
            uiState = SettingsState(isLoading = false)
            onDispose {}
        } else {
            val db = Firebase.firestore
            val email = Firebase.auth.currentUser?.email ?: ""
            val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
            var disposed = false
            var retryJob: Job? = null
            var retryDelayMs = 1000L
            var reportedError = false
            var listener: ListenerRegistration? = null
            var installListener: (() -> Unit)? = null
            fun clearListener() {
                listener?.remove()
                listener = null
            }
            fun scheduleRetry(error: Exception) {
                if (disposed || retryJob?.isActive == true) return
                if (!reportedError) {
                    recordSyncListenerError("settings", error)
                    reportedError = true
                }
                uiState = SettingsState(userEmail = email, isLoading = false, hasError = true)
                val delayMs = retryDelayMs
                retryDelayMs = minOf(retryDelayMs * 2, 30000L)
                clearListener()
                retryJob = scope.launch {
                    delay(delayMs)
                    retryJob = null
                    if (!disposed) installListener?.invoke()
                }
            }
            installListener = listener@{
                if (disposed) return@listener
                clearListener()
                listener = db.collection("settings").document(userId)
                    .addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
                        if (error != null) {
                            scheduleRetry(error)
                            return@addSnapshotListener
                        }
                        val data = when {
                            snapshot == null -> null
                            !snapshot.exists() -> FirestoreSettingsRecord()
                            else -> runCatching {
                                snapshot.toObject(FirestoreSettingsRecord::class.java)
                            }.getOrNull()
                        }
                        val nextSettings = data?.let { resolveSettingsState(it, email) }
                        if (nextSettings != null) {
                            val override = autoSortOverrides[userId]
                            if (override != null && override == nextSettings.autoSort) {
                                autoSortOverrides.remove(userId)
                            }
                            uiState = nextSettings.copy(
                                autoSort = autoSortOverrides[userId] ?: nextSettings.autoSort
                            )
                        } else {
                            uiState = SettingsState(userEmail = email, isLoading = false, hasError = true)
                        }
                        if (snapshot?.metadata?.isFromCache == false &&
                            !snapshot.metadata.hasPendingWrites()
                        ) {
                            retryDelayMs = 1000L
                            reportedError = false
                        }
                    }
            }
            checkNotNull(installListener).invoke()
            onDispose {
                disposed = true
                retryJob?.cancel()
                clearListener()
                scope.cancel()
            }
        }
    }
    return uiState
}

private fun parseOrderedTaskListIds(data: Map<String, Any>): List<String> {
    return data.entries
        .mapNotNull { entry ->
            if (entry.key == "createdAt" || entry.key == "updatedAt") {
                return@mapNotNull null
            }
            val value = entry.value as? Map<*, *> ?: return@mapNotNull null
            val order = value["order"] as? Number ?: return@mapNotNull null
            entry.key to order.toDouble()
        }
        .sortedWith(compareBy<Pair<String, Double>> { it.second }.thenBy { it.first })
        .map { it.first }
}

private suspend fun resolveMemberTaskListIds(
    db: FirebaseFirestore,
    taskListIds: List<String>,
    userId: String,
    source: Source = Source.DEFAULT
): List<String> = coroutineScope {
    taskListIds.map { taskListId ->
        async {
            val membershipRef = db.collection("taskLists")
                .document(taskListId)
                .collection("members")
                .document(userId)
            val membershipSnapshot = if (source == Source.CACHE) {
                runCatching { membershipRef.get(source).await() }.getOrNull()
            } else {
                membershipRef.get(source).await()
            }
            taskListId to (membershipSnapshot?.exists() == true)
        }
    }.awaitAll()
        .filter { it.second }
        .map { it.first }
}

private fun parseTaskListSummary(taskListId: String, data: FirestoreTaskListRecord): TaskListSummary {
    val memberCount = data.memberCount?.toInt() ?: 1
    val name = data.name ?: ""
    val background = data.background

    return TaskListSummary(
        id = taskListId,
        name = name,
        remainingTaskCount = data.taskSummaries().count { !it.completed },
        memberCount = memberCount,
        background = background
    )
}

private fun isCompleteTaskData(taskId: String, value: Any?): Boolean {
    val task = value as? Map<*, *> ?: return false
    val order = task["order"] as? Number ?: return false
    return task["id"] == taskId &&
        task["text"] is String &&
        task["completed"] is Boolean &&
        task["date"] is String &&
        order.toDouble().isFinite() &&
        task["pinned"] is Boolean
}

private fun malformedTaskIds(data: Map<String, Any>): List<String> {
    val tasks = data["tasks"] as? Map<*, *> ?: return emptyList()
    return tasks.entries.mapNotNull { entry ->
        val taskId = entry.key as? String ?: return@mapNotNull null
        taskId.takeUnless { isCompleteTaskData(taskId, entry.value) }
    }.sorted()
}

private val malformedTaskCleanupKeys = mutableSetOf<String>()

private fun scheduleMalformedTaskCleanup(
    taskListId: String,
    data: Map<String, Any>,
    isFromCache: Boolean,
    hasPendingWrites: Boolean
) {
    if (isFromCache || hasPendingWrites) return
    val taskIds = malformedTaskIds(data)
    if (taskIds.isEmpty()) return
    val cleanupKey = "$taskListId:${taskIds.joinToString("|")}"
    synchronized(malformedTaskCleanupKeys) {
        if (!malformedTaskCleanupKeys.add(cleanupKey)) return
    }
    val updates = mutableMapOf<String, Any>("updatedAt" to nowMillis())
    taskIds.forEach { updates["tasks.$it"] = FieldValue.delete() }
    val releaseCleanupKey = {
        synchronized(malformedTaskCleanupKeys) {
            malformedTaskCleanupKeys.remove(cleanupKey)
        }
        Unit
    }
    TaskListMutationQueues.queueFor(taskListId).enqueue(
        onIdle = releaseCleanupKey,
        onError = { releaseCleanupKey() }
    ) {
        Firebase.firestore.collection("taskLists").document(taskListId).update(updates)
    }
}

private fun parseTaskListDetail(taskListId: String, data: FirestoreTaskListRecord): TaskListDetail {
    val name = data.name ?: ""
    val memberCount = data.memberCount?.toInt() ?: 1
    val background = data.background
    val shareCode = data.shareCode
    val history = data.history
    val tasks = data.taskSummaries()

    return TaskListDetail(
        id = taskListId,
        name = name,
        tasks = tasks,
        history = history,
        memberCount = memberCount,
        background = background,
        shareCode = shareCode
    )
}

@Composable
private fun rememberSharedTaskListPreviewState(
    shareCode: String,
    userId: String?
): SharedTaskListPreviewUiState {
    val t = LocalTranslations.current
    val db = Firebase.firestore
    var uiState by remember(shareCode) {
        mutableStateOf(SharedTaskListPreviewUiState(isLoading = true))
    }

    LaunchedEffect(shareCode) {
        val normalized = normalizedShareCode(shareCode)
        if (normalized == null) {
            uiState = SharedTaskListPreviewUiState(
                isLoading = false,
                errorMessage = t.t("pages.sharecode.notFound")
            )
            return@LaunchedEffect
        }

        uiState = SharedTaskListPreviewUiState(isLoading = true)
        try {
            val taskListId = fetchTaskListIdByShareCode(normalized)
            if (taskListId == null) {
                uiState = SharedTaskListPreviewUiState(
                    isLoading = false,
                    errorMessage = t.t("pages.sharecode.notFound")
                )
            } else {
                uiState = uiState.copy(taskListId = taskListId, isLoading = true, errorMessage = null)
                logShare()
            }
        } catch (_: Exception) {
            uiState = SharedTaskListPreviewUiState(
                isLoading = false,
                errorMessage = t.t("pages.sharecode.error")
            )
        }
    }

    DisposableEffect(uiState.taskListId) {
        val taskListId = uiState.taskListId
        if (taskListId == null) {
            onDispose {}
        } else {
            val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
            var disposed = false
            var retryJob: Job? = null
            var retryDelayMs = 1000L
            var reportedError = false
            var listener: ListenerRegistration? = null
            var installListener: (() -> Unit)? = null
            fun clearListener() {
                listener?.remove()
                listener = null
            }
            fun scheduleRetry(error: Exception) {
                if (disposed || retryJob?.isActive == true) return
                if (!reportedError) {
                    recordSyncListenerError("shared_task_list", error)
                    reportedError = true
                }
                uiState = uiState.copy(
                    taskList = null,
                    isLoading = false,
                    errorMessage = t.t("pages.sharecode.error")
                )
                val delayMs = retryDelayMs
                retryDelayMs = minOf(retryDelayMs * 2, 30000L)
                clearListener()
                retryJob = scope.launch {
                    delay(delayMs)
                    retryJob = null
                    if (!disposed) installListener?.invoke()
                }
            }
            installListener = listener@{
                if (disposed) return@listener
                clearListener()
                listener = db.collection("taskLists").document(taskListId)
                    .addSnapshotListener { snapshot, error ->
                        if (error != null) {
                            scheduleRetry(error)
                            return@addSnapshotListener
                        }
                        uiState = if (snapshot == null || !snapshot.exists()) {
                            uiState.copy(
                                taskList = null,
                                isLoading = false,
                                errorMessage = t.t("pages.sharecode.notFound")
                            )
                        } else {
                            uiState.copy(
                                taskList = parseTaskListDetail(
                                    taskListId,
                                    decodeTaskListRecord(snapshot)
                                ),
                                isLoading = false,
                                errorMessage = null
                            )
                        }
                        if (snapshot?.metadata?.isFromCache == false) {
                            retryDelayMs = 1000L
                            reportedError = false
                        }
                    }
            }
            checkNotNull(installListener).invoke()
            onDispose {
                disposed = true
                retryJob?.cancel()
                clearListener()
                scope.cancel()
            }
        }
    }

    DisposableEffect(userId, uiState.taskListId) {
        val taskListId = uiState.taskListId
        if (userId == null || taskListId == null) {
            uiState = uiState.copy(isAdded = false)
            onDispose {}
        } else {
            val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
            var disposed = false
            var retryJob: Job? = null
            var retryDelayMs = 1000L
            var reportedError = false
            var listener: ListenerRegistration? = null
            var installListener: (() -> Unit)? = null
            fun clearListener() {
                listener?.remove()
                listener = null
            }
            fun scheduleRetry(error: Exception) {
                if (disposed || retryJob?.isActive == true) return
                if (!reportedError) {
                    recordSyncListenerError("membership", error)
                    reportedError = true
                }
                val delayMs = retryDelayMs
                retryDelayMs = minOf(retryDelayMs * 2, 30000L)
                clearListener()
                retryJob = scope.launch {
                    delay(delayMs)
                    retryJob = null
                    if (!disposed) installListener?.invoke()
                }
            }
            installListener = listener@{
                if (disposed) return@listener
                clearListener()
                listener = db.collection("taskLists")
                    .document(taskListId)
                    .collection("members")
                    .document(userId)
                    .addSnapshotListener { snapshot, error ->
                        if (error != null) {
                            scheduleRetry(error)
                            return@addSnapshotListener
                        }
                        val isAdded = snapshot?.exists() == true
                        uiState = uiState.copy(isAdded = isAdded)
                        if (snapshot?.metadata?.isFromCache == false) {
                            retryDelayMs = 1000L
                            reportedError = false
                        }
                    }
            }
            checkNotNull(installListener).invoke()
            onDispose {
                disposed = true
                retryJob?.cancel()
                clearListener()
                scope.cancel()
            }
        }
    }

    return uiState
}

private fun generateRandomShareCode(): String {
    val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return (1..8)
        .map { chars[shareCodeRandom.nextInt(chars.length)] }
        .joinToString("")
}

private suspend fun generateShareCode(taskListId: String): String {
    val db = Firebase.firestore
    var attempts = 0
    while (attempts < 10) {
        attempts += 1
        val code = generateRandomShareCode()
        val shareCodeRef = db.collection("shareCodes").document(code)
        val shareCodeSnap = shareCodeRef.get().await()
        if (shareCodeSnap.exists()) continue

        val taskListRef = db.collection("taskLists").document(taskListId)
        val taskListSnap = taskListRef.get(Source.SERVER).await()
        if (!taskListSnap.exists()) throw Exception(TASK_LIST_NOT_FOUND_ERROR)

        val batch = db.batch()
        val currentShareCode = taskListSnap.getString("shareCode")
        normalizedShareCode(currentShareCode)?.let { normalizedCode ->
            batch.delete(db.collection("shareCodes").document(normalizedCode))
        }
        batch.set(shareCodeRef, mapOf("taskListId" to taskListId, "createdAt" to nowMillis()))
        batch.update(taskListRef, mapOf("shareCode" to code, "updatedAt" to nowMillis()))
        batch.commit().await()
        return code
    }
    throw Exception(SHARE_CODE_GENERATION_FAILED_ERROR)
}

private suspend fun removeShareCode(taskListId: String) {
    val db = Firebase.firestore
    val taskListRef = db.collection("taskLists").document(taskListId)
    val snap = taskListRef.get(Source.SERVER).await()
    if (!snap.exists()) throw Exception(TASK_LIST_NOT_FOUND_ERROR)
    val currentShareCode = snap.getString("shareCode")?.takeIf { it.isNotBlank() } ?: return
    val batch = db.batch()
    normalizedShareCode(currentShareCode)?.let { normalizedCode ->
        batch.delete(db.collection("shareCodes").document(normalizedCode))
    }
    batch.update(taskListRef, mapOf("shareCode" to null, "updatedAt" to nowMillis()))
    batch.commit().await()
}

private suspend fun fetchTaskListIdByShareCode(shareCode: String): String? {
    val db = Firebase.firestore
    val normalized = normalizedShareCode(shareCode) ?: return null
    val snap = db.collection("shareCodes").document(normalized).get(Source.SERVER).await()
    if (!snap.exists()) return null
    val taskListId = snap.getString("taskListId")?.takeIf { it.isNotEmpty() && !it.contains("/") } ?: return null
    val taskList = db.collection("taskLists").document(taskListId).get(Source.SERVER).await()
    return taskListId.takeIf { taskList.getString("shareCode") == normalized }
}

private suspend fun addSharedTaskListToOrder(taskListId: String, joinCode: String) {
    val uid = Firebase.auth.currentUser?.uid ?: return
    val db = Firebase.firestore
    val taskListOrderRef = db.collection("taskListOrder").document(uid)
    val taskListRef = db.collection("taskLists").document(taskListId)
    val membershipRef = taskListRef.collection("members").document(uid)
    val orderSnap = taskListOrderRef.get().await()
    val orderData = orderSnap.data ?: emptyMap()
    val membershipSnap = membershipRef.get().await()

    if (orderData.containsKey(taskListId) && membershipSnap.exists()) {
        return
    }

    val orders = orderData.entries.mapNotNull { entry ->
        if (entry.key == "createdAt" || entry.key == "updatedAt") return@mapNotNull null
        val value = entry.value as? Map<*, *> ?: return@mapNotNull null
        (value["order"] as? Number)?.toDouble()
    }
    val newOrder = if (orders.isEmpty()) 1.0 else orders.max() + 1.0

    val taskListSnap = taskListRef.get().await()
    if (!taskListSnap.exists()) throw Exception(TASK_LIST_NOT_FOUND_ERROR)

    db.batch().apply {
        set(
            taskListOrderRef,
            mapOf(
                taskListId to mapOf("order" to newOrder),
                "updatedAt" to nowMillis()
            ),
            SetOptions.merge()
        )
        if (!membershipSnap.exists()) {
            set(
                membershipRef,
                mapOf("joinedAt" to nowMillis(), "joinCode" to joinCode)
            )
            update(taskListRef, mapOf(
                "memberCount" to FieldValue.increment(1),
                "updatedAt" to nowMillis()
            ))
        }
    }.commit().await()
}

private suspend fun removeTaskListMembership(
    db: FirebaseFirestore,
    taskListOrderRef: DocumentReference,
    taskListId: String,
    taskListSnapshot: DocumentSnapshot
) {
    val taskListRef = taskListSnapshot.reference
    val uid = Firebase.auth.currentUser?.uid ?: throw Exception("Missing user ID")
    db.batch().apply {
        update(
            taskListOrderRef,
            mapOf(
                taskListId to FieldValue.delete(),
                "updatedAt" to nowMillis()
            )
        )
        delete(taskListRef.collection("members").document(uid))
        val memberCount = (taskListSnapshot.getLong("memberCount") ?: 1L).toInt()
        if (memberCount <= 1) {
            taskListSnapshot.getString("shareCode")
                ?.let(::normalizedShareCode)
                ?.let { delete(db.collection("shareCodes").document(it)) }
            delete(taskListRef)
        } else {
            update(
                taskListRef,
                mapOf(
                    "memberCount" to FieldValue.increment(-1),
                    "updatedAt" to nowMillis()
                )
            )
        }
    }.commit().await()
}

private val calendarTaskComparator = compareByDescending<CalendarTask> { it.pinned }
    .thenBy { it.dateKey.ifBlank { "9999-12-31" } }
    .thenBy { it.taskListIndex }
    .thenBy { it.taskIndex }

private fun flattenCalendarTasks(taskLists: List<TaskListDetail>): List<CalendarTask> {
    return taskLists.flatMapIndexed { taskListIndex, taskList ->
        taskList.tasks
            .filter { !it.completed }
            .mapIndexed { taskIndex, task ->
                makeCalendarTask(taskList, task, taskListIndex, taskIndex)
            }
    }.sortedWith(calendarTaskComparator)
}

private fun makeCalendarTask(
    taskList: TaskListDetail,
    task: TaskSummary,
    taskListIndex: Int,
    taskIndex: Int
): CalendarTask {
    val dateValue = task.date.takeIf { it.isNotBlank() }?.let(::parseTaskInputDate)
    return CalendarTask(
        id = "${taskList.id}:${task.id}",
        taskListId = taskList.id,
        taskListName = taskList.name,
        taskListBackground = taskList.background,
        taskId = task.id,
        text = task.text,
        completed = task.completed,
        dateKey = if (dateValue != null) task.date else "",
        dateValue = dateValue,
        pinned = task.pinned,
        order = task.order,
        taskListIndex = taskListIndex,
        taskIndex = taskIndex
    )
}

private fun remainingCountLabel(t: Translations, count: Int): String {
    val pluralKey = if (count == 1) "taskList.remainingCount_one" else "taskList.remainingCount_other"
    val vars = mapOf("count" to count.toString())
    val plural = t.t(pluralKey, vars)
    return if (plural != pluralKey) plural else t.t("taskList.remainingCount", vars)
}

private fun colorLabel(t: Translations, hex: String?): String = when (hex) {
    null -> t.t("taskList.backgroundNoneShort")
    "#F87171" -> t.t("taskList.colorRed")
    "#FBBF24" -> t.t("taskList.colorYellow")
    "#34D399" -> t.t("taskList.colorGreen")
    "#38BDF8" -> t.t("taskList.colorBlue")
    "#818CF8" -> t.t("taskList.colorIndigo")
    "#A78BFA" -> t.t("taskList.colorPurple")
    else -> t.t("taskList.colorCustom")
}

private fun localizeJoinListError(t: Translations, error: Exception): String = when (error.message) {
    TASK_LIST_NOT_FOUND_ERROR -> t.t("pages.sharecode.notFound")
    TASK_LIST_ORDER_NOT_FOUND_ERROR,
    TASK_LIST_ALREADY_ADDED_ERROR -> t.t("pages.sharecode.addToOrderError")
    else -> error.message ?: t.t("common.error")
}

private fun parseHexColor(hex: String): Color {
    return try {
        val clean = hex.trimStart('#')
        val r = clean.substring(0, 2).toInt(16) / 255f
        val g = clean.substring(2, 4).toInt(16) / 255f
        val b = clean.substring(4, 6).toInt(16) / 255f
        Color(r, g, b)
    } catch (e: Exception) {
        Color.Gray
    }
}

private fun localeForLanguage(languageTag: String): Locale {
    return when (languageTag) {
        "zh-CN" -> Locale.SIMPLIFIED_CHINESE
        "pt-BR" -> Locale.Builder().setLanguage("pt").setRegion("BR").build()
        else -> Locale.forLanguageTag(languageTag).takeIf { it.language.isNotBlank() } ?: Locale.JAPANESE
    }
}

private fun formatDateForLocale(
    dateKey: String,
    languageTag: String,
    skeleton: String
): String {
    return try {
        val locale = localeForLanguage(languageTag)
        val date = parseTaskInputDate(dateKey) ?: return dateKey
        val pattern = DateFormat.getBestDateTimePattern(locale, skeleton)
        SimpleDateFormat(pattern, locale).format(date)
    } catch (_: Exception) {
        dateKey
    }
}

private data class ParsedTaskInput(
    val text: String,
    val date: String?,
    val pinned: Boolean,
    val pinnedChanged: Boolean
)

data class TaskDatePattern(
    val regex: Regex,
    val resolveDate: (MatchResult) -> Date?
)

private val TASK_DATE_DIGIT_MAP = mapOf(
    '٠' to '0', '١' to '1', '٢' to '2', '٣' to '3', '٤' to '4',
    '٥' to '5', '٦' to '6', '٧' to '7', '٨' to '8', '٩' to '9',
    '۰' to '0', '۱' to '1', '۲' to '2', '۳' to '3', '۴' to '4',
    '۵' to '5', '۶' to '6', '۷' to '7', '۸' to '8', '۹' to '9',
    '०' to '0', '१' to '1', '२' to '2', '३' to '3', '४' to '4',
    '५' to '5', '६' to '6', '७' to '7', '८' to '8', '९' to '9',
)

private const val TASK_DATE_SPACE_OR_END = """(?:[\s\u3000]|$)"""

private fun normalizeTaskDateDigits(value: String): String =
    buildString(value.length) {
        value.forEach { append(TASK_DATE_DIGIT_MAP[it] ?: it) }
    }

private val TASK_INPUT_DATE_PATTERN = Regex("""\d{4}-\d{2}-\d{2}""")

private fun taskInputDateFormatter(
    timeZone: TimeZone = TimeZone.getDefault()
): SimpleDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
    isLenient = false
    calendar = GregorianCalendar(timeZone, Locale.ROOT).apply {
        gregorianChange = Date(Long.MIN_VALUE)
    }
}

private fun formatTaskInputDate(date: Date): String =
    taskInputDateFormatter().format(date)

private fun taskInputDateFrom(year: Int, month: Int, day: Int): Date? {
    if (year < 1) return null
    val calendar = GregorianCalendar(TimeZone.getDefault(), Locale.ROOT).apply {
        isLenient = false
        gregorianChange = Date(Long.MIN_VALUE)
        clear()
        set(year, month - 1, day, 12, 0, 0)
        set(Calendar.MILLISECOND, 0)
    }
    return try {
        calendar.time
    } catch (_: Exception) {
        null
    }
}

private fun parseTaskInputDate(value: String): Date? {
    if (!TASK_INPUT_DATE_PATTERN.matches(value)) return null
    val parts = value.split('-')
    val year = parts[0].toIntOrNull() ?: return null
    val month = parts[1].toIntOrNull() ?: return null
    val day = parts[2].toIntOrNull() ?: return null
    return taskInputDateFrom(year, month, day)
}

private fun nextTaskWeekdayOffset(targetDay: Int, currentDay: Int): Int {
    val diff = targetDay - currentDay
    return if (diff >= 0) diff else diff + 7
}

private fun makeTaskOffsetDate(offset: Int): Date {
    return Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
        add(Calendar.DAY_OF_MONTH, offset)
    }.time
}

private fun parsePinPrefix(text: String, t: Translations): Pair<String, Boolean> {
    val source = text.trim()
    if (source.isEmpty()) return source to false

    for (token in t.getPinPrefixes()) {
        if (!source.startsWith(token, ignoreCase = true)) continue
        if (source.length > token.length && !source[token.length].isWhitespace()) continue
        return source.substring(token.length).trimStart() to true
    }

    return source to false
}

private fun parseDateFromTaskInput(text: String, t: Translations): Pair<String, String?> {
    val source = text.trim()
    if (source.isEmpty()) return source to null

    val normalized = normalizeTaskDateDigits(source)
    val numericPatterns = listOf(
        TaskDatePattern(Regex("""^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$TASK_DATE_SPACE_OR_END""")) { match ->
            val year = match.groupValues[1].toInt()
            val month = match.groupValues[2].toInt()
            val day = match.groupValues[3].toInt()
            val date = taskInputDateFrom(year, month, day) ?: return@TaskDatePattern null
            val calendar = Calendar.getInstance().apply { time = date }
            if (calendar.get(Calendar.YEAR) == year && calendar.get(Calendar.MONTH) == month - 1 && calendar.get(Calendar.DAY_OF_MONTH) == day) date else null
        },
        TaskDatePattern(Regex("""^(\d{1,2})[-/.](\d{1,2})$TASK_DATE_SPACE_OR_END""")) { match ->
            val month = match.groupValues[1].toInt()
            val day = match.groupValues[2].toInt()
            val now = Calendar.getInstance()
            val currentYear = now.get(Calendar.YEAR)
            val date = taskInputDateFrom(currentYear, month, day) ?: return@TaskDatePattern null
            val today = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }.time
            if (date.before(today)) taskInputDateFrom(currentYear + 1, month, day) else date
        },
    )

    val relativePatternSets = buildList {
        add(t.getRelativePatterns())
        if (t.languageTag() != "en") {
            add(Translations.getRelativePatterns("en"))
        }
    }

    (listOf(numericPatterns) + relativePatternSets).forEach { patterns ->
        patterns.forEach { pattern ->
            val match = pattern.regex.find(normalized) ?: return@forEach
            if (match.range.first != 0) return@forEach
            val date = pattern.resolveDate(match) ?: return@forEach
            val stripped = source.substring(match.value.length).trimStart()
            return stripped to formatTaskInputDate(date)
        }
    }

    return source to null
}

private fun resolveTaskInput(text: String, t: Translations, currentTask: TaskSummary? = null): ParsedTaskInput {
    var remaining = text.trim()
    var parsedDate: String? = null
    var pinnedFromInput = false
    var parsedPin = false
    var parsedDateValue = false

    repeat(2) {
        if (!parsedPin) {
            val (pinText, matchedPin) = parsePinPrefix(remaining, t)
            if (matchedPin) {
                remaining = pinText
                pinnedFromInput = true
                parsedPin = true
                return@repeat
            }
        }
        if (!parsedDateValue) {
            val (dateText, dateValue) = parseDateFromTaskInput(remaining, t)
            if (dateValue != null) {
                remaining = dateText
                parsedDate = dateValue
                parsedDateValue = true
                return@repeat
            }
        }
    }
    return if (currentTask != null) {
        val pinned = if (pinnedFromInput) true else currentTask.pinned
        ParsedTaskInput(
            text = if (remaining.isEmpty()) currentTask.text else remaining,
            date = parsedDate ?: currentTask.date,
            pinned = pinned,
            pinnedChanged = pinned != currentTask.pinned
        )
    } else {
        ParsedTaskInput(
            text = remaining,
            date = parsedDate ?: "",
            pinned = pinnedFromInput,
            pinnedChanged = pinnedFromInput
        )
    }
}

private fun settingsThemeLabel(t: Translations, theme: String): String = when (theme) {
    "light" -> t.t("settings.theme.light")
    "dark" -> t.t("settings.theme.dark")
    else -> t.t("settings.theme.system")
}

private fun settingsTaskInsertPositionLabel(t: Translations, position: String): String = when (position) {
    "top" -> t.t("settings.taskInsertPosition.top")
    "bottom" -> t.t("settings.taskInsertPosition.bottom")
    else -> t.t("settings.taskInsertPosition.top")
}

private fun settingsStartupViewLabel(t: Translations, startupView: String): String = when (normalizeStartupView(startupView)) {
    "calendar" -> t.t("settings.startupView.calendar")
    "taskLists" -> t.t("settings.startupView.taskLists")
    else -> t.t("settings.startupView.taskList")
}

@Composable
private fun resolveTaskListBackgroundColor(background: String?): Color {
    val themeBackground = MaterialTheme.colorScheme.surfaceDim
    val color = background?.let(::parseHexColor) ?: return themeBackground
    return if (isAppDarkTheme()) lerp(themeBackground, color, 0.26f) else color
}

private fun dragAutoScrollSpeed(
    fingerInViewport: Float,
    viewportHeight: Float,
    edgeZone: Float,
    maxSpeed: Float,
    canScrollBackward: Boolean,
    canScrollForward: Boolean
): Float = when {
    fingerInViewport < edgeZone && canScrollBackward ->
        -maxSpeed * (1f - fingerInViewport.coerceAtLeast(0f) / edgeZone)
    fingerInViewport > viewportHeight - edgeZone && canScrollForward ->
        maxSpeed * (1f - (viewportHeight - fingerInViewport).coerceAtLeast(0f) / edgeZone)
    else -> 0f
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailScreenScaffold(
    title: String,
    onBack: (() -> Unit)?,
    showTopBar: Boolean = true,
    topBarHeight: androidx.compose.ui.unit.Dp = 64.dp,
    backgroundColor: Color? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val t = LocalTranslations.current
    val resolvedBackgroundColor = backgroundColor ?: MaterialTheme.colorScheme.background
    Scaffold(
        contentWindowInsets = WindowInsets(0),
        topBar = if (showTopBar) {
            {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .windowInsetsPadding(
                            WindowInsets.safeDrawing.only(
                                WindowInsetsSides.Top + WindowInsetsSides.Horizontal
                            )
                        )
                        .height(topBarHeight)
                ) {
                    if (onBack != null) {
                        AppIconButton(
                            icon = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = t.t("common.back"),
                            onClick = onBack,
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .padding(start = 4.dp)
                        )
                    }
                    Text(
                        text = title,
                        style = AppHeaderTitleTextStyle,
                        overflow = TextOverflow.Ellipsis,
                        maxLines = 1,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .align(Alignment.Center)
                            .semantics { heading() }
                            .fillMaxWidth()
                            .padding(horizontal = 56.dp)
                    )
                }
            }
        } else {
            {}
        },
        containerColor = resolvedBackgroundColor
    ) { innerPadding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .windowInsetsPadding(
                    WindowInsets.safeDrawing.only(
                        if (showTopBar) {
                            WindowInsetsSides.Bottom + WindowInsetsSides.Horizontal
                        } else {
                            WindowInsetsSides.Top + WindowInsetsSides.Bottom + WindowInsetsSides.Horizontal
                        }
                    )
                )
                .imePadding()
                .background(resolvedBackgroundColor)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
            ) {
                content()
            }
        }
    }
}


@Composable
private fun ScreenScaffold(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    val t = LocalTranslations.current
    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surfaceDim)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                modifier = Modifier
                    .widthIn(max = 544.dp)
                    .fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surfaceContainer,
                contentColor = MaterialTheme.colorScheme.onSurface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text(
                        title,
                        style = AppPageTitleTextStyle,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 24.dp)
                            .semantics { heading() }
                    )
                    content()
                }
            }
            Text(
                t.t("copyright"),
                style = TextStyle(
                    fontFamily = GenInterfaceJPBodyFontFamily,
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 24.dp)
            )
        }
    }
}

@Composable
private fun AppAlert(message: String, isError: Boolean) {
    val dark = isAppDarkTheme()
    val background = when {
        isError && dark -> Color(0x33991B1B)
        isError -> Color(0xFFFEF2F2)
        dark -> Color(0x33064E3B)
        else -> Color(0xFFECFDF5)
    }
    val border = when {
        isError && dark -> Color(0x66991B1B)
        isError -> Color(0xFFFECACA)
        dark -> Color(0x66064E3B)
        else -> Color(0xFFA7F3D0)
    }
    val content = when {
        isError && dark -> Color(0xFFFEE2E2)
        isError -> Color(0xFF7F1D1D)
        dark -> Color(0xFFD1FAE5)
        else -> Color(0xFF064E3B)
    }
    Text(
        message,
        style = AppBodySmallTextStyle,
        color = content,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(background)
            .border(1.dp, border, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp)
    )
}

@Composable
private fun AuthView(
    initialScreen: AuthScreen,
    language: String,
    onScreenChange: (AuthScreen) -> Unit
) {
    var selectedScreen by rememberSaveable { mutableStateOf(initialScreen) }
    var selectedLanguage by rememberSaveable { mutableStateOf(language) }
    var showLanguageMenu by remember { mutableStateOf(false) }

    LaunchedEffect(initialScreen) {
        selectedScreen = initialScreen
    }

    val t = LocalTranslations.current
    val context = LocalContext.current

    LaunchedEffect(language) {
        selectedLanguage = language
    }

    fun showScreen(screen: AuthScreen) {
        selectedScreen = screen
        onScreenChange(screen)
    }

    ScreenScaffold(title = t.t("title")) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
            contentAlignment = Alignment.CenterEnd
        ) {
            Box {
                Row(
                    modifier = Modifier
                        .heightIn(min = 40.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(MaterialTheme.colorScheme.surfaceContainer)
                        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(6.dp))
                        .clickable(role = Role.DropdownList) { showLanguageMenu = true }
                        .semantics { contentDescription = t.t("settings.language.title") }
                        .padding(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        supportedLanguages.firstOrNull { it.first == selectedLanguage }?.second ?: selectedLanguage,
                        style = AppBodySmallTextStyle,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Icon(
                        Icons.Default.KeyboardArrowDown,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.size(AppIconMetrics.inlineActionIconSize)
                    )
                }
                DropdownMenu(
                    expanded = showLanguageMenu,
                    onDismissRequest = { showLanguageMenu = false },
                    shape = RoundedCornerShape(12.dp),
                    containerColor = MaterialTheme.colorScheme.surfaceContainer,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.heightIn(max = 320.dp)
                ) {
                    supportedLanguages.forEach { (code, name) ->
                        DropdownMenuItem(
                            text = { Text(name, style = AppBodySmallTextStyle) },
                            trailingIcon = if (code == selectedLanguage) {
                                { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(AppIconMetrics.inlineActionIconSize)) }
                            } else {
                                null
                            },
                            onClick = {
                                selectedLanguage = code
                                t.load(context, code)
                                logSettingsLanguageChange(code)
                                showLanguageMenu = false
                            }
                        )
                    }
                }
            }
        }
        if (selectedScreen != AuthScreen.Reset) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (isAppDarkTheme()) MaterialTheme.colorScheme.surfaceContainer else MaterialTheme.colorScheme.surfaceDim)
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    AuthScreen.SignIn to t.t("auth.tabs.signin"),
                    AuthScreen.SignUp to t.t("auth.tabs.signup")
                ).forEach { (screen, label) ->
                    val isSelected = selectedScreen == screen
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 40.dp)
                            .then(
                                if (isSelected) {
                                    Modifier.shadow(1.dp, RoundedCornerShape(8.dp))
                                } else {
                                    Modifier
                                }
                            )
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSelected) MaterialTheme.colorScheme.surfaceContainer else Color.Transparent)
                            .clickable(role = Role.Tab) { showScreen(screen) }
                            .semantics { selected = isSelected },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            label,
                            style = AppButtonTextStyle,
                            color = if (isSelected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
        when (selectedScreen) {
            AuthScreen.SignIn -> SignInView(onShowReset = { showScreen(AuthScreen.Reset) })
            AuthScreen.SignUp -> SignUpView(language = selectedLanguage)
            AuthScreen.Reset -> PasswordResetRequestView(
                language = selectedLanguage,
                onBackToSignIn = { showScreen(AuthScreen.SignIn) }
            )
        }
    }
}

@Composable
private fun AuthTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    contentType: ContentType,
    password: Boolean = false,
    enabled: Boolean = true,
    error: String? = null
) {
    val t = LocalTranslations.current
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            label,
            style = AppFieldLabelTextStyle,
            color = MaterialTheme.colorScheme.onSurface
        )
        AppTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = t.t(if (password) "auth.placeholder.password" else "auth.placeholder.email"),
            enabled = enabled,
            password = password,
            keyboardOptions = KeyboardOptions(
                keyboardType = if (password) KeyboardType.Password else KeyboardType.Email
            ),
            modifier = Modifier.semantics { this.contentType = contentType }
        )
        if (error != null) {
            Text(
                error,
                style = TextStyle(
                    fontFamily = GenInterfaceJPBodyFontFamily,
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                ),
                color = MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
private fun AuthMessages(errors: List<String?>, success: String? = null) {
    errors.filterNotNull().forEach { message ->
        AppAlert(message, isError = true)
    }
    success?.let { AppAlert(it, isError = false) }
}

@Composable
private fun SignInView(onShowReset: () -> Unit) {
    val t = LocalTranslations.current
    val scope = rememberCoroutineScope()
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        AuthTextField(
            value = email,
            onValueChange = {
                email = it
                emailError = null
                errorMessage = null
            },
            label = t.t("auth.form.email"),
            contentType = ContentType.Username + ContentType.EmailAddress,
            enabled = !isLoading,
            error = emailError
        )
        AuthTextField(
            value = password,
            onValueChange = {
                password = it
                passwordError = null
                errorMessage = null
            },
            label = t.t("auth.form.password"),
            contentType = ContentType.Password,
            password = true,
            enabled = !isLoading,
            error = passwordError
        )
        AuthMessages(listOf(errorMessage))
        AppButton(
            text = if (isLoading) t.t("auth.button.signingIn") else t.t("auth.button.signin"),
            onClick = {
                emailError = validateEmailField(t, email.trim())
                passwordError = validatePasswordField(t, password, requireLength = false)
                if (emailError != null || passwordError != null) {
                    return@AppButton
                }
                isLoading = true
                errorMessage = null
                scope.launch {
                    try {
                        withTimeout(10_000) {
                            Firebase.auth.signInWithEmailAndPassword(email.trim(), password).await()
                        }
                        logLogin()
                    } catch (e: TimeoutCancellationException) {
                        recordNonFatalException("sign_in_timeout")
                        errorMessage = t.t("auth.error.general")
                    } catch (e: Exception) {
                        errorMessage = resolveAuthErrorMessage(t, e)
                    } finally {
                        isLoading = false
                    }
                }
            },
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth()
        )
        AppButton(
            text = t.t("auth.button.forgotPassword"),
            onClick = onShowReset,
            style = AppButtonStyle.Secondary,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun SignUpView(language: String) {
    val t = LocalTranslations.current
    val scope = rememberCoroutineScope()
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var confirmPasswordError by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        AuthTextField(
            value = email,
            onValueChange = {
                email = it
                emailError = null
                errorMessage = null
            },
            label = t.t("auth.form.email"),
            contentType = ContentType.NewUsername + ContentType.EmailAddress,
            enabled = !isLoading,
            error = emailError
        )
        AuthTextField(
            value = password,
            onValueChange = {
                password = it
                passwordError = null
                confirmPasswordError = null
                errorMessage = null
            },
            label = t.t("auth.form.password"),
            contentType = ContentType.NewPassword,
            password = true,
            enabled = !isLoading,
            error = passwordError
        )
        AuthTextField(
            value = confirmPassword,
            onValueChange = {
                confirmPassword = it
                confirmPasswordError = null
                errorMessage = null
            },
            label = t.t("auth.form.confirmPassword"),
            contentType = ContentType.NewPassword,
            password = true,
            enabled = !isLoading,
            error = confirmPasswordError
        )
        AuthMessages(listOf(errorMessage))
        AppButton(
            text = if (isLoading) t.t("auth.button.signingUp") else t.t("auth.button.signup"),
            onClick = {
                val trimmedEmail = email.trim()
                emailError = validateEmailField(t, trimmedEmail)
                passwordError = validatePasswordField(t, password, requireLength = true)
                confirmPasswordError = validateConfirmPasswordField(t, password, confirmPassword)
                if (emailError != null || passwordError != null || confirmPasswordError != null) {
                    return@AppButton
                }

                isLoading = true
                errorMessage = null
                scope.launch {
                    try {
                        withTimeout(10_000) {
                            signUpWithInitialData(
                                trimmedEmail,
                                password,
                                language,
                                t.t("app.initialTaskListName")
                            )
                        }
                        logSignUp()
                    } catch (e: TimeoutCancellationException) {
                        recordNonFatalException("sign_up_timeout")
                        errorMessage = t.t("auth.error.general")
                    } catch (e: Exception) {
                        errorMessage = resolveAuthErrorMessage(t, e)
                    } finally {
                        isLoading = false
                    }
                }
            },
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun PasswordResetRequestView(
    language: String,
    onBackToSignIn: () -> Unit
) {
    val t = LocalTranslations.current
    val scope = rememberCoroutineScope()
    var email by rememberSaveable { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        val sentMessage = successMessage
        if (sentMessage != null) {
            AppAlert(sentMessage, isError = false)
        } else {
            Text(
                t.t("auth.passwordReset.instruction"),
                style = AppBodySmallTextStyle,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth()
            )
            AuthTextField(
                value = email,
                onValueChange = {
                    email = it
                    emailError = null
                    errorMessage = null
                },
                label = t.t("auth.form.email"),
                contentType = ContentType.Username + ContentType.EmailAddress,
                enabled = !isLoading,
                error = emailError
            )
            AuthMessages(listOf(errorMessage))
            AppButton(
                text = if (isLoading) t.t("auth.button.sending") else t.t("auth.button.sendResetEmail"),
                onClick = {
                    val trimmedEmail = email.trim()
                    emailError = validateEmailField(t, trimmedEmail)
                    if (emailError != null) {
                        return@AppButton
                    }

                    isLoading = true
                    errorMessage = null
                    scope.launch {
                        try {
                            withTimeout(10_000) {
                                sendPasswordResetEmail(trimmedEmail, language)
                            }
                            logPasswordResetEmailSent()
                            successMessage = t.t("auth.passwordReset.success")
                        } catch (e: TimeoutCancellationException) {
                            recordNonFatalException("password_reset_timeout")
                            errorMessage = t.t("auth.error.general")
                        } catch (e: Exception) {
                            errorMessage = resolveAuthErrorMessage(t, e)
                        } finally {
                            isLoading = false
                        }
                    }
                },
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth()
            )
        }
        AppButton(
            text = t.t("auth.button.backToSignIn"),
            onClick = onBackToSignIn,
            style = AppButtonStyle.Secondary,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun ResetPasswordView(
    code: String,
    onDismiss: () -> Unit
) {
    val t = LocalTranslations.current
    val scope = rememberCoroutineScope()
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var confirmPasswordError by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    var isVerifying by remember { mutableStateOf(true) }
    var isSubmitting by remember { mutableStateOf(false) }

    LaunchedEffect(code) {
        isVerifying = true
        errorMessage = null
        try {
            Firebase.auth.verifyPasswordResetCode(code).await()
        } catch (e: Exception) {
            errorMessage = resolveAuthErrorMessage(t, e)
        } finally {
            isVerifying = false
        }
    }

    ScreenScaffold(t.t("auth.passwordReset.title")) {
        if (successMessage == null) {
            AuthTextField(
                value = password,
                onValueChange = {
                    password = it
                    passwordError = null
                    confirmPasswordError = null
                    errorMessage = null
                },
                label = t.t("auth.passwordReset.newPassword"),
                contentType = ContentType.NewPassword,
                password = true,
                enabled = !isVerifying && !isSubmitting
            )
            Spacer(Modifier.height(16.dp))
            AuthTextField(
                value = confirmPassword,
                onValueChange = {
                    confirmPassword = it
                    confirmPasswordError = null
                    errorMessage = null
                },
                label = t.t("auth.passwordReset.confirmNewPassword"),
                contentType = ContentType.NewPassword,
                password = true,
                enabled = !isVerifying && !isSubmitting
            )
        }
        Spacer(Modifier.height(16.dp))
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            AuthMessages(listOf(passwordError, confirmPasswordError, errorMessage), successMessage)
            if (isVerifying) {
                CircularProgressIndicator(
                    color = mutedTextColor(),
                    strokeWidth = 2.dp,
                    modifier = Modifier
                        .size(24.dp)
                        .align(Alignment.CenterHorizontally)
                )
            }
            AppButton(
                text = if (isSubmitting) t.t("auth.passwordReset.settingNewPassword") else t.t("auth.passwordReset.setNewPassword"),
                onClick = {
                    passwordError = validatePasswordField(t, password, requireLength = true)
                    confirmPasswordError = validateConfirmPasswordField(t, password, confirmPassword)
                    if (passwordError != null || confirmPasswordError != null) {
                        return@AppButton
                    }

                    isSubmitting = true
                    errorMessage = null
                    scope.launch {
                        try {
                            Firebase.auth.confirmPasswordReset(code, password).await()
                            successMessage = t.t("auth.passwordReset.resetSuccess")
                        } catch (e: Exception) {
                            errorMessage = resolveAuthErrorMessage(t, e)
                        } finally {
                            isSubmitting = false
                        }
                    }
                },
                enabled = !isVerifying && !isSubmitting && successMessage == null,
                modifier = Modifier.fillMaxWidth()
            )
            AppButton(
                text = t.t("common.close"),
                onClick = onDismiss,
                style = AppButtonStyle.Secondary,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CalendarScreen(
    navController: NavController? = null,
    userId: String?,
    selectedTaskListIdState: MutableState<String?>? = null,
    onOpenTaskList: (() -> Unit)? = null,
    showTopBar: Boolean = true,
    externalTaskLists: List<TaskListDetail>? = null,
    externalSettingsState: SettingsState? = null
) {
    val t = LocalTranslations.current
    val haptic = LocalHapticFeedback.current
    val reduceMotion = rememberReduceMotion()
    val settingsState = resolvedSettingsState(
        userId,
        externalSettingsState ?: rememberSettingsState(userId)
    )
    val calendarUiState = if (externalTaskLists == null) {
        rememberOrderedTaskListsState(userId, ::parseTaskListDetail)
    } else {
        null
    }
    val calendarTaskLists = externalTaskLists ?: calendarUiState?.taskLists.orEmpty()
    val hasLoadError = calendarUiState?.hasError == true
    val loadedCalendarTasks = remember(calendarTaskLists) {
        flattenCalendarTasks(calendarTaskLists)
    }
    var optimisticCalendarTasks by remember { mutableStateOf(emptyList<CalendarTask>()) }
    var pendingCalendarTasks by remember { mutableStateOf<Map<String, CalendarTask?>>(emptyMap()) }
    var calendarMutationRevisions by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var calendarMutationSequence by remember { mutableIntStateOf(0) }
    val calendarTasks = remember(loadedCalendarTasks, optimisticCalendarTasks, pendingCalendarTasks) {
        val loadedIds = loadedCalendarTasks.mapTo(mutableSetOf()) { it.id }
        val pendingIds = pendingCalendarTasks.keys
        (
            loadedCalendarTasks.filter { it.id !in pendingIds } +
                pendingCalendarTasks.values.filterNotNull() +
                optimisticCalendarTasks.filter { it.id !in loadedIds && it.id !in pendingIds }
            )
            .sortedWith(calendarTaskComparator)
    }
    var displayedMonth by remember { mutableStateOf(CalendarMonth.current()) }
    var selectedDateKey by remember { mutableStateOf<String?>(null) }
    var showAddTaskSheet by remember { mutableStateOf(false) }
    var addTaskError by remember { mutableStateOf<String?>(null) }
    var editingTask by remember { mutableStateOf<CalendarTask?>(null) }
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scope = rememberCoroutineScope()

    fun setPendingCalendarTasks(values: Map<String, CalendarTask?>): Int {
        val revision = calendarMutationSequence + 1
        calendarMutationSequence = revision
        calendarMutationRevisions = calendarMutationRevisions + values.keys.associateWith { revision }
        pendingCalendarTasks = pendingCalendarTasks + values
        return revision
    }

    fun clearPendingCalendarTasks(values: Map<String, CalendarTask?>, revision: Int) {
        val ids = values.keys.filter { calendarMutationRevisions[it] == revision }
        if (ids.isEmpty()) return
        pendingCalendarTasks = pendingCalendarTasks.filterKeys { it !in ids }
        calendarMutationRevisions = calendarMutationRevisions.filterKeys { it !in ids }
    }

    fun displayedTasks(taskList: TaskListDetail): List<TaskSummary> {
        val displayedById = calendarTasks
            .filter { it.taskListId == taskList.id }
            .associateBy { it.taskId }
        val displayedTasks = taskList.tasks.map { currentTask ->
            displayedById[currentTask.id]?.let { displayedTask ->
                currentTask.copy(
                    text = displayedTask.text,
                    completed = displayedTask.completed,
                    date = displayedTask.dateKey,
                    pinned = displayedTask.pinned
                )
            } ?: currentTask
        }
        val existingTaskIds = taskList.tasks.mapTo(mutableSetOf()) { it.id }
        val pendingOnlyTasks = displayedById.values
            .filter { it.taskId !in existingTaskIds }
            .map { pendingTask ->
                TaskSummary(
                    id = pendingTask.taskId,
                    text = pendingTask.text,
                    completed = pendingTask.completed,
                    date = pendingTask.dateKey,
                    order = pendingTask.order,
                    pinned = pendingTask.pinned
                )
            }
        return (displayedTasks + pendingOnlyTasks)
            .sortedWith(compareBy<TaskSummary> { it.order }.thenBy { it.id })
    }

    LaunchedEffect(calendarTaskLists) {
        val loadedIds = calendarTaskLists.flatMap { taskList ->
            taskList.tasks.map { task -> "${taskList.id}:${task.id}" }
        }.toSet()
        optimisticCalendarTasks = optimisticCalendarTasks.filter { it.id !in loadedIds }
    }

    val monthKey = displayedMonth.key
    val tasksInMonth = remember(calendarTasks, monthKey) {
        calendarTasks.filter { it.dateKey.isBlank() || it.dateKey.startsWith(monthKey) }
    }
    val dotColorsByDate = remember(tasksInMonth) {
        val map = mutableMapOf<String, MutableList<String?>>()
        for (task in tasksInMonth.filter { it.dateKey.isNotBlank() }) {
            val colors = map.getOrPut(task.dateKey) { mutableListOf() }
            if (!colors.contains(task.taskListBackground) && colors.size < 3) {
                colors.add(task.taskListBackground)
            }
        }
        map as Map<String, List<String?>>
    }

    val selectedDateLabel = remember(selectedDateKey, t.languageTag()) {
        selectedDateKey?.let { formatDateForLocale(it, t.languageTag(), "MMM d EEE") }.orEmpty()
    }
    var calendarListHeaderCount by remember { mutableIntStateOf(0) }

    fun selectDate(dateKey: String?) {
        if (selectedDateKey != dateKey) {
            haptic.performHapticFeedback(HapticFeedbackType.SegmentFrequentTick)
        }
        selectedDateKey = dateKey
        if (dateKey != null) {
            val targetIndex = tasksInMonth.indexOfFirst { it.dateKey == dateKey }
            if (targetIndex >= 0) {
                val itemIndex = targetIndex + calendarListHeaderCount
                val layoutInfo = listState.layoutInfo
                val itemInfo = layoutInfo.visibleItemsInfo.firstOrNull { it.index == itemIndex }
                val isFullyVisible = itemInfo != null &&
                    itemInfo.offset >= layoutInfo.viewportStartOffset &&
                    itemInfo.offset + itemInfo.size <= layoutInfo.viewportEndOffset
                if (!isFullyVisible) {
                    scope.launch {
                        listState.animateScrollToItem(itemIndex, -layoutInfo.viewportSize.height / 3)
                    }
                }
            }
        }
    }

    fun openTaskList(taskListId: String) {
        if (selectedTaskListIdState != null) {
            selectedTaskListIdState.value = taskListId
            onOpenTaskList?.invoke()
        } else {
            navController?.navigate(AppRoute.TaskList.createRoute(taskListId))
        }
    }

    fun addCalendarTask(taskListId: String, text: String, pinned: Boolean, dateKey: String) {
        val trimmed = text.trim()
        val taskListIndex = calendarTaskLists.indexOfFirst { it.id == taskListId }
        if (!hasTaskContent(trimmed, dateKey, pinned) || taskListIndex < 0) return

        val taskList = calendarTaskLists[taskListIndex]
        val parsed = resolveTaskInput(trimmed, t)
        if (!hasTaskContent(parsed.text, dateKey, pinned)) return
        val taskId = java.util.UUID.randomUUID().toString()
        val orderedTasks = taskList.tasks.sortedWith(compareBy<TaskSummary> { it.order }.thenBy { it.id })
        val nextOrder = if (settingsState.taskInsertPosition == "bottom") {
            (orderedTasks.lastOrNull()?.order ?: 0.0) + 1.0
        } else {
            (orderedTasks.firstOrNull()?.order ?: 1.0) - 1.0
        }
        val insertedTask = TaskSummary(
            id = taskId,
            text = parsed.text,
            completed = false,
            date = dateKey,
            order = nextOrder,
            pinned = pinned
        )
        val insertedTasks = if (settingsState.taskInsertPosition == "bottom") {
            orderedTasks + insertedTask
        } else {
            listOf(insertedTask) + orderedTasks
        }
        val nextTasks = normalizeTasks(insertedTasks, settingsState.autoSort)
        val insertedIndex = nextTasks.indexOfFirst { it.id == taskId }
        val dateValue = dateKey.takeIf { it.isNotBlank() }?.let(::parseTaskInputDate)

        optimisticCalendarTasks = optimisticCalendarTasks + CalendarTask(
            id = "${taskList.id}:$taskId",
            taskListId = taskList.id,
            taskListName = taskList.name,
            taskListBackground = taskList.background,
            taskId = taskId,
            text = parsed.text,
            completed = false,
            dateKey = if (dateValue != null) dateKey else "",
            dateValue = dateValue,
            pinned = pinned,
            order = nextOrder,
            taskListIndex = taskListIndex,
            taskIndex = insertedIndex
        )
        val updates = buildTaskUpdateData(orderedTasks, nextTasks) +
            mapOf("history" to buildHistory(parsed.text, taskList.history))
        addTaskError = null
        showAddTaskSheet = false
        haptic.performHapticFeedback(HapticFeedbackType.Confirm)
        logTaskAdd(hasDate = dateKey.isNotEmpty())

        TaskListMutationQueues.queueFor(taskList.id).enqueue(onError = { error ->
            recordNonFatalException("calendar_task_add", error)
            optimisticCalendarTasks = optimisticCalendarTasks.filter { it.taskId != taskId }
            addTaskError = t.t("common.error")
        }) {
            Firebase.firestore.collection("taskLists").document(taskList.id).update(updates)
        }
    }

    fun updateCalendarTask(
        task: CalendarTask,
        logFields: String,
        additionalUpdatesBuilder: ((TaskListDetail, TaskSummary) -> Map<String, Any>)? = null,
        transform: (TaskSummary) -> TaskSummary
    ) {
        val taskList = calendarTaskLists.firstOrNull { it.id == task.taskListId } ?: return
        val currentTask = displayedTasks(taskList).firstOrNull { it.id == task.taskId } ?: return
        val orderedTasks = displayedTasks(taskList).sortedWith(compareBy<TaskSummary> { it.order }.thenBy { it.id })
        val nextTasks = normalizeTasks(
            orderedTasks.map { if (it.id == task.taskId) transform(it) else it },
            settingsState.autoSort
        )
        val updates = buildTaskUpdateData(orderedTasks, nextTasks) +
            (additionalUpdatesBuilder?.invoke(taskList, currentTask) ?: emptyMap())
        val nextTask = nextTasks.firstOrNull { it.id == task.taskId }
        val pendingValue = nextTask?.let {
            if (it.completed) {
                null
            } else {
                makeCalendarTask(
                    taskList,
                    it,
                    calendarTaskLists.indexOfFirst { list -> list.id == taskList.id },
                    nextTasks.indexOf(it)
                )
            }
        }
        val pendingValues = mapOf(task.id to pendingValue)
        val mutationRevision = setPendingCalendarTasks(pendingValues)
        logTaskUpdate(fields = logFields)
        addTaskError = null
        TaskListMutationQueues.queueFor(taskList.id).enqueue(
            onIdle = { clearPendingCalendarTasks(pendingValues, mutationRevision) },
            onError = { error ->
                clearPendingCalendarTasks(pendingValues, mutationRevision)
                recordNonFatalException("calendar_task_update", error)
                addTaskError = t.t("common.error")
            }
        ) {
            Firebase.firestore.collection("taskLists").document(taskList.id).update(updates)
        }
    }

    fun completeCalendarTask(task: CalendarTask) {
        haptic.performHapticFeedback(HapticFeedbackType.ToggleOn)
        updateCalendarTask(task, "completed") { it.copy(completed = true) }
    }

    fun saveCalendarTask(task: CalendarTask, taskListId: String, text: String, pinned: Boolean, dateKey: String) {
        val trimmed = text.trim()
        val sourceTaskList = calendarTaskLists.firstOrNull { it.id == task.taskListId } ?: return
        val currentTask = displayedTasks(sourceTaskList).firstOrNull { it.id == task.taskId } ?: return
        val resolved = resolveTaskInput(trimmed, t, currentTask)
        val nextText = if (trimmed.isEmpty()) "" else resolved.text
        if (taskListId == task.taskListId || !hasTaskContent(nextText, dateKey, pinned)) {
            updateCalendarTask(
                task,
                "text,date,pinned",
                additionalUpdatesBuilder = if (nextText != currentTask.text) {
                    { taskList, old -> mapOf("history" to buildHistory(nextText, taskList.history, old.text)) }
                } else {
                    null
                }
            ) { cur ->
                cur.copy(text = nextText, date = dateKey, pinned = pinned)
            }
            return
        }

        val targetTaskList = calendarTaskLists.firstOrNull { it.id == taskListId } ?: return
        val orderedTargetTasks = displayedTasks(targetTaskList)
            .sortedWith(compareBy<TaskSummary> { it.order }.thenBy { it.id })
        val nextOrder = if (settingsState.taskInsertPosition == "bottom") {
            (orderedTargetTasks.lastOrNull()?.order ?: 0.0) + 1.0
        } else {
            (orderedTargetTasks.firstOrNull()?.order ?: 1.0) - 1.0
        }
        val movedTask = TaskSummary(
            id = task.taskId,
            text = nextText,
            completed = currentTask.completed,
            date = dateKey,
            order = nextOrder,
            pinned = pinned
        )
        val insertedTasks = if (settingsState.taskInsertPosition == "bottom") {
            orderedTargetTasks + movedTask
        } else {
            listOf(movedTask) + orderedTargetTasks
        }
        val nextTargetTasks = normalizeTasks(insertedTasks, settingsState.autoSort)
        val targetUpdates = buildTaskUpdateData(orderedTargetTasks, nextTargetTasks) +
            mapOf("history" to buildHistory(nextText, targetTaskList.history))
        val sourceUpdates = mapOf(
            "tasks.${task.taskId}" to FieldValue.delete(),
            "updatedAt" to nowMillis()
        )
        logTaskUpdate(fields = "text,date,pinned,taskList")
        val pendingValues = mapOf(
            task.id to null,
            "${targetTaskList.id}:${task.taskId}" to makeCalendarTask(
                targetTaskList,
                movedTask,
                calendarTaskLists.indexOfFirst { it.id == targetTaskList.id },
                nextTargetTasks.indexOfFirst { it.id == task.taskId }
            )
        )
        val mutationRevision = setPendingCalendarTasks(pendingValues)
        addTaskError = null
        TaskListMutationQueues.enqueueFor(
            listOf(task.taskListId, taskListId),
            onIdle = { clearPendingCalendarTasks(pendingValues, mutationRevision) },
            onError = { error ->
                clearPendingCalendarTasks(pendingValues, mutationRevision)
                recordNonFatalException("calendar_task_move", error)
                addTaskError = t.t("common.error")
            }
        ) {
            val db = Firebase.firestore
            val batch = db.batch()
            batch.update(db.collection("taskLists").document(task.taskListId), sourceUpdates)
            batch.update(db.collection("taskLists").document(taskListId), targetUpdates)
            batch.commit()
        }
    }

    val defaultTaskListId = selectedTaskListIdState?.value
        ?.takeIf { id -> calendarTaskLists.any { it.id == id } }
        ?: calendarTaskLists.firstOrNull()?.id.orEmpty()
    val calendarBlock: @Composable () -> Unit = {
        Column(modifier = Modifier.fillMaxWidth()) {
            if (hasLoadError && calendarTaskLists.isNotEmpty()) {
                Text(
                    t.t("app.loadError"),
                    color = MaterialTheme.colorScheme.error,
                    style = AppBodySmallTextStyle,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }
            AppMonthCalendar(
                month = displayedMonth,
                onMonthChange = {
                    displayedMonth = it
                    selectedDateKey = null
                },
                selectedDateKey = selectedDateKey,
                onSelectDate = { selectDate(it) },
                dotColorsByDate = dotColorsByDate
            )
            AppButton(
                text = if (selectedDateKey != null) {
                    "$selectedDateLabel · ${t.t("a11y.addTask")}"
                } else {
                    t.t("a11y.addTask")
                },
                onClick = {
                    addTaskError = null
                    showAddTaskSheet = true
                },
                enabled = calendarTaskLists.isNotEmpty(),
                icon = Icons.Default.Add,
                iconSize = AppIconMetrics.compactActionIconSize,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
            )
            addTaskError?.let { message ->
                Text(
                    message,
                    color = MaterialTheme.colorScheme.error,
                    style = AppBodySmallTextStyle,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }

    fun LazyListScope.calendarTaskItems() {
        if (tasksInMonth.isEmpty()) {
            item(key = "calendarEmpty") {
                Text(
                    if (hasLoadError) t.t("app.loadError") else t.t("app.calendarNoDatedTasks"),
                    style = AppBodySmallTextStyle,
                    color = if (hasLoadError) MaterialTheme.colorScheme.error else mutedTextColor(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp)
                )
            }
            return
        }
        itemsIndexed(tasksInMonth, key = { _, task -> task.id }) { index, task ->
            val startsUndatedGroup = task.dateKey.isBlank() &&
                (index == 0 || tasksInMonth[index - 1].dateKey.isNotBlank())
            Column(modifier = Modifier.fillMaxWidth()) {
                if (startsUndatedGroup) {
                    Text(
                        t.t("pages.tasklist.noDate"),
                        style = AppCaptionTextStyle,
                        color = mutedTextColor(),
                        modifier = Modifier
                            .padding(start = 48.dp, top = 16.dp, bottom = 4.dp)
                            .semantics { heading() }
                    )
                }
                CalendarTaskRow(
                    task = task,
                    isHighlighted = selectedDateKey == task.dateKey && task.dateKey.isNotBlank(),
                    reduceMotion = reduceMotion,
                    onSelectDate = {
                        if (task.dateKey.isNotBlank()) selectDate(task.dateKey)
                    },
                    onOpenTaskList = { openTaskList(task.taskListId) },
                    onToggleComplete = { completeCalendarTask(task) },
                    onOpenActions = { editingTask = task }
                )
            }
        }
    }

    DetailScreenScaffold(
        title = t.t("app.calendar"),
        onBack = if (navController != null) ({ navController.navigateUp() }) else null,
        showTopBar = showTopBar,
        topBarHeight = 56.dp,
        backgroundColor = MaterialTheme.colorScheme.surfaceDim
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val availableWidth = maxWidth
            val isTwoColumn = !showTopBar && availableWidth >= 720.dp
            SideEffect {
                calendarListHeaderCount = if (isTwoColumn) 0 else 1
            }
            if (showTopBar) {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp)
                ) {
                    item(key = "calendar") {
                        Column {
                            calendarBlock()
                            Spacer(Modifier.height(12.dp))
                        }
                    }
                    calendarTaskItems()
                }
            } else {
                Column(
                    modifier = Modifier
                        .widthIn(max = 1152.dp)
                        .fillMaxSize()
                        .align(Alignment.TopCenter)
                        .padding(start = 24.dp, end = 24.dp, top = 40.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .heightIn(min = 48.dp)
                            .padding(bottom = 8.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        Text(
                            t.t("app.calendar"),
                            style = AppPageTitleTextStyle,
                            modifier = Modifier.semantics { heading() }
                        )
                    }
                    if (isTwoColumn) {
                        val asideWidth = (availableWidth - 48.dp - 48.dp - 320.dp).coerceIn(288.dp, 416.dp)
                        Row(
                            modifier = Modifier.fillMaxSize(),
                            horizontalArrangement = Arrangement.spacedBy(48.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .width(asideWidth)
                                    .verticalScroll(rememberScrollState())
                            ) {
                                calendarBlock()
                            }
                            LazyColumn(
                                state = listState,
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight(),
                                contentPadding = PaddingValues(bottom = 48.dp)
                            ) {
                                calendarTaskItems()
                            }
                        }
                    } else {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(bottom = 48.dp)
                        ) {
                            item(key = "calendar") {
                                Column {
                                    calendarBlock()
                                    Spacer(Modifier.height(12.dp))
                                }
                            }
                            calendarTaskItems()
                        }
                    }
                }
            }
        }
    }

    if (showAddTaskSheet) {
        CalendarTaskSheet(
            title = t.t("a11y.addTask"),
            submitLabel = t.t("a11y.addTask"),
            taskLists = calendarTaskLists,
            initialTaskListId = defaultTaskListId,
            initialText = "",
            initialPinned = false,
            initialDateKey = selectedDateKey ?: formatTaskInputDate(Date()),
            onDismiss = { showAddTaskSheet = false },
            onSubmit = { taskListId, text, pinned, dateKey ->
                addCalendarTask(taskListId, text, pinned, dateKey)
            }
        )
    }

    editingTask?.let { task ->
        key(task.id) {
            CalendarTaskSheet(
                title = t.t("a11y.editTask"),
                isEditing = true,
                submitLabel = t.t("taskList.save"),
                taskLists = calendarTaskLists,
                initialTaskListId = task.taskListId,
                initialText = task.text,
                initialPinned = task.pinned,
                initialDateKey = task.dateKey,
                onDismiss = { editingTask = null },
                onSubmit = { taskListId, text, pinned, dateKey ->
                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                    saveCalendarTask(task, taskListId, text, pinned, dateKey)
                    editingTask = null
                }
            )
        }
    }
}

@Composable
private fun CalendarTaskSheet(
    title: String,
    isEditing: Boolean = false,
    submitLabel: String,
    taskLists: List<TaskListDetail>,
    initialTaskListId: String,
    initialText: String,
    initialPinned: Boolean,
    initialDateKey: String?,
    onDismiss: () -> Unit,
    onSubmit: (taskListId: String, text: String, pinned: Boolean, dateKey: String) -> Unit
) {
    val t = LocalTranslations.current
    var taskListId by remember {
        mutableStateOf(
            if (taskLists.any { it.id == initialTaskListId }) initialTaskListId
            else taskLists.firstOrNull()?.id.orEmpty()
        )
    }
    var text by remember { mutableStateOf(initialText) }
    var pinned by remember { mutableStateOf(initialPinned) }
    var dateKey by remember { mutableStateOf(initialDateKey?.takeIf { it.isNotBlank() }) }
    var month by remember { mutableStateOf(CalendarMonth.fromDateKey(dateKey) ?: CalendarMonth.current()) }
    var taskListMenuExpanded by remember { mutableStateOf(false) }
    val textFocusRequester = remember { FocusRequester() }
    val canSubmit = (isEditing || text.trim().isNotEmpty() || pinned || dateKey != null) && taskListId.isNotEmpty()
    val selectedTaskListName = taskLists.firstOrNull { it.id == taskListId }?.name ?: t.t("app.drawerTitle")

    fun submit() {
        if (!canSubmit) return
        onSubmit(taskListId, text.trim(), pinned, dateKey.orEmpty())
    }

    LaunchedEffect(isEditing) {
        if (!isEditing) textFocusRequester.requestFocus()
    }

    AppSheet(onDismissRequest = onDismiss, paneTitle = title) {
        AppSheetHeader(title = title, onClose = onDismiss)
        Box {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.background)
                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))
                    .clickable(role = Role.DropdownList) { taskListMenuExpanded = true }
                    .semantics { contentDescription = "${t.t("app.drawerTitle")}: $selectedTaskListName" }
                    .padding(start = 14.dp, end = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    selectedTaskListName,
                    style = AppFieldTextStyle,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    Icons.Default.KeyboardArrowDown,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                    modifier = Modifier.size(AppIconMetrics.compactActionIconSize)
                )
            }
            DropdownMenu(
                expanded = taskListMenuExpanded,
                onDismissRequest = { taskListMenuExpanded = false },
                shape = RoundedCornerShape(12.dp),
                containerColor = MaterialTheme.colorScheme.surfaceContainer,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                taskLists.forEach { taskList ->
                    DropdownMenuItem(
                        text = { Text(taskList.name, style = AppBodySmallTextStyle) },
                        leadingIcon = { AppListDot(taskList.background) },
                        trailingIcon = if (taskList.id == taskListId) {
                            { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(AppIconMetrics.inlineActionIconSize)) }
                        } else {
                            null
                        },
                        onClick = {
                            taskListId = taskList.id
                            taskListMenuExpanded = false
                        }
                    )
                }
            }
        }
        AppTextField(
            value = text,
            onValueChange = { text = it },
            placeholder = t.t("pages.tasklist.addTaskPlaceholder"),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { submit() }),
            modifier = Modifier.focusRequester(textFocusRequester)
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AppButton(
                t.t("pages.tasklist.clearDate"),
                onClick = { dateKey = null },
                style = AppButtonStyle.Ghost,
                enabled = dateKey != null,
                modifier = Modifier.bleed(start = 12.dp)
            )
            Spacer(Modifier.weight(1f))
            AppPinToggleButton(pinned = pinned, onToggle = { pinned = !pinned })
        }
        Column(
            modifier = Modifier
                .weight(1f, fill = false)
                .verticalScroll(rememberScrollState())
        ) {
            AppSheetCalendarSurface {
                AppMonthCalendar(
                    month = month,
                    onMonthChange = { month = it },
                    selectedDateKey = dateKey,
                    onSelectDate = { dateKey = it }
                )
            }
        }
        AppButton(
            submitLabel,
            onClick = { submit() },
            enabled = canSubmit,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun CalendarTaskRow(
    task: CalendarTask,
    isHighlighted: Boolean,
    reduceMotion: Boolean,
    onSelectDate: () -> Unit,
    onOpenTaskList: () -> Unit,
    onToggleComplete: () -> Unit,
    onOpenActions: () -> Unit
) {
    val t = LocalTranslations.current
    val highlightColor by animateColorAsState(
        targetValue = if (isHighlighted) MaterialTheme.colorScheme.surfaceContainer else Color.Transparent,
        animationSpec = if (reduceMotion) snap() else tween(durationMillis = 180),
        label = "calendar task highlight"
    )
    val dateLabel = remember(task.dateKey, t.languageTag()) {
        task.dateKey.takeIf { it.isNotBlank() }?.let {
            formatDateForLocale(it, t.languageTag(), "MMM d EEE")
        }
    }
    val mutedText = mutedTextColor()
    val mutedIcon = mutedIconColor()
    val metaTextStyle = TextStyle(
        fontFamily = GenInterfaceJPBodyFontFamily,
        fontSize = 12.sp,
        lineHeight = 16.sp
    )
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(highlightColor, RoundedCornerShape(12.dp))
            .padding(bottom = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 20.dp)
                .padding(start = 48.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (dateLabel != null) {
                    Text(
                        dateLabel,
                        style = metaTextStyle,
                        color = mutedText,
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .clickable(role = Role.Button, onClick = onSelectDate)
                    )
                }
                if (task.pinned) {
                    Icon(
                        Icons.Default.PushPin,
                        contentDescription = null,
                        tint = mutedText,
                        modifier = Modifier.size(AppIconMetrics.metaIconSize)
                    )
                }
            }
            Row(
                modifier = Modifier
                    .widthIn(min = 48.dp, max = 160.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .clickable(role = Role.Button, onClick = onOpenTaskList)
                    .padding(end = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.End),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AppListDot(task.taskListBackground)
                Text(
                    task.taskListName,
                    style = metaTextStyle.copy(fontWeight = FontWeight.Medium),
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .clickable(role = Role.Checkbox, onClick = onToggleComplete)
                    .semantics {
                        contentDescription = "${t.t("pages.tasklist.markComplete")}: ${task.text}"
                    }
                    .padding(top = 8.dp),
                contentAlignment = Alignment.TopCenter
            ) {
                Box(
                    Modifier
                        .size(TaskListDetailMetrics.completionDotSize)
                        .border(1.dp, if (task.completed) Color.Transparent else mutedIcon, CircleShape)
                        .background(if (task.completed) completedFillColor() else Color.Transparent, CircleShape)
                )
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 48.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .then(
                        if (dateLabel != null) {
                            Modifier.clickable(onClick = onSelectDate)
                        } else {
                            Modifier
                        }
                    )
                    .padding(top = 6.dp),
                contentAlignment = Alignment.TopStart
            ) {
                Text(
                    task.text,
                    style = TextStyle(
                        fontFamily = GenInterfaceJPBodyFontFamily,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        lineHeight = 24.sp
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                    textDecoration = if (task.completed) TextDecoration.LineThrough else TextDecoration.None
                )
            }
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(role = Role.Button, onClick = onOpenActions)
                    .semantics { contentDescription = t.t("a11y.editTask") }
                    .padding(top = 8.dp),
                contentAlignment = Alignment.TopCenter
            ) {
                Icon(
                    Icons.Outlined.Edit,
                    contentDescription = null,
                    tint = mutedIcon,
                    modifier = Modifier.size(AppIconMetrics.compactActionIconSize)
                )
            }
        }
    }
}

@Composable
private fun DragHandleIcon(modifier: Modifier = Modifier) {
    Icon(
        Icons.Default.DragIndicator,
        contentDescription = null,
        tint = mutedIconColor(),
        modifier = modifier.size(AppIconMetrics.compactActionIconSize)
    )
}

@Composable
private fun TaskListsScreen(
    navController: NavController?,
    userId: String?,
    selectedTaskListId: String? = null,
    onTaskListSelected: ((String) -> Unit)? = null,
    onOpenSettings: (() -> Unit)? = null,
    onOpenCalendar: (() -> Unit)? = null,
    calendarActive: Boolean = false,
    settingsActive: Boolean = false
) {
    val t = LocalTranslations.current
    val haptic = LocalHapticFeedback.current
    val reduceMotion = rememberReduceMotion()
    val uiState = rememberOrderedTaskListsState(userId, ::parseTaskListSummary)

    var showCreateDialog by remember { mutableStateOf(false) }
    var createName by remember { mutableStateOf("") }
    var createBackground by remember { mutableStateOf<String?>(null) }

    var draggingTaskListId by remember { mutableStateOf<String?>(null) }
    var taskListDragOffset by remember { mutableFloatStateOf(0f) }
    var dragOrderedTaskLists by remember { mutableStateOf<List<TaskListSummary>?>(null) }
    var taskListItemHeights by remember { mutableStateOf<Map<String, Float>>(emptyMap()) }
    var taskListAutoScrollSpeed by remember { mutableFloatStateOf(0f) }
    val lazyListState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    var showJoinDialog by remember { mutableStateOf(false) }
    var joinListInput by remember { mutableStateOf("") }
    var joiningList by remember { mutableStateOf(false) }
    var joinListError by remember { mutableStateOf<String?>(null) }
    var pendingTaskListOrder by remember { mutableStateOf<List<TaskListSummary>?>(null) }
    val taskListOrderMutationQueue = remember(userId) {
        TaskListMutationQueues.queueFor("taskListOrder:$userId")
    }
    var taskListOrderMutationRevision by remember(userId) { mutableIntStateOf(0) }
    var taskListDragStartIds by remember(userId) { mutableStateOf<List<String>>(emptyList()) }

    val displayTaskLists = dragOrderedTaskLists ?: pendingTaskListOrder ?: uiState.taskLists
    val density = LocalDensity.current
    val taskListSpacingPx = 0f

    fun openTaskList(taskListId: String) {
        if (onTaskListSelected != null) {
            onTaskListSelected(taskListId)
        } else {
            navController?.navigate(AppRoute.TaskList.createRoute(taskListId))
        }
    }

    fun openCalendar() {
        if (onOpenCalendar != null) {
            onOpenCalendar()
        } else {
            navController?.navigate(AppRoute.Calendar.createRoute())
        }
    }

    fun checkTaskListSwap() {
        val ordered = dragOrderedTaskLists?.toMutableList() ?: return
        val draggingId = draggingTaskListId ?: return
        val currentIdx = ordered.indexOfFirst { it.id == draggingId }.takeIf { it >= 0 } ?: return
        val currentHeight = taskListItemHeights[draggingId] ?: return

        if (currentIdx + 1 < ordered.size) {
            val nextId = ordered[currentIdx + 1].id
            val nextHeight = taskListItemHeights[nextId] ?: currentHeight
            val threshold = currentHeight / 2 + taskListSpacingPx + nextHeight / 2
            if (taskListDragOffset > threshold) {
                ordered[currentIdx] = ordered[currentIdx + 1].also { ordered[currentIdx + 1] = ordered[currentIdx] }
                dragOrderedTaskLists = ordered.toList()
                taskListDragOffset -= (nextHeight + taskListSpacingPx)
                haptic.performHapticFeedback(HapticFeedbackType.SegmentFrequentTick)
                return
            }
        }

        if (currentIdx > 0) {
            val prevId = ordered[currentIdx - 1].id
            val prevHeight = taskListItemHeights[prevId] ?: currentHeight
            val threshold = prevHeight / 2 + taskListSpacingPx + currentHeight / 2
            if (taskListDragOffset < -threshold) {
                ordered[currentIdx] = ordered[currentIdx - 1].also { ordered[currentIdx - 1] = ordered[currentIdx] }
                dragOrderedTaskLists = ordered.toList()
                taskListDragOffset += (prevHeight + taskListSpacingPx)
                haptic.performHapticFeedback(HapticFeedbackType.SegmentFrequentTick)
            }
        }
    }

    fun commitTaskListOrder(ids: List<String>) {
        val uid = Firebase.auth.currentUser?.uid ?: return
        val mutationRevision = taskListOrderMutationRevision + 1
        taskListOrderMutationRevision = mutationRevision
        logTaskListReorder()
        val updates = mutableMapOf<String, Any>("updatedAt" to nowMillis())
        ids.forEachIndexed { i, id -> updates["$id.order"] = (i + 1).toDouble() }
        val current = displayTaskLists
        pendingTaskListOrder = ids.mapNotNull { id -> current.firstOrNull { it.id == id } }
        taskListOrderMutationQueue.enqueue(
            onIdle = {
                if (taskListOrderMutationRevision == mutationRevision) pendingTaskListOrder = null
            },
            onError = { error ->
                recordNonFatalException("task_list_order_update", error)
            }
        ) {
            Firebase.firestore.collection("taskListOrder").document(uid).update(updates)
        }
    }

    fun moveTaskListBy(taskListId: String, delta: Int): Boolean {
        val ordered = displayTaskLists.toMutableList()
        val index = ordered.indexOfFirst { it.id == taskListId }
        val target = index + delta
        if (index < 0 || target < 0 || target > ordered.lastIndex) return false
        val item = ordered.removeAt(index)
        ordered.add(target, item)
        commitTaskListOrder(ordered.map { it.id })
        return true
    }

    LaunchedEffect(draggingTaskListId) {
        if (draggingTaskListId == null) return@LaunchedEffect
        while (draggingTaskListId != null) {
            if (taskListAutoScrollSpeed != 0f) {
                val scrolled = lazyListState.scrollBy(taskListAutoScrollSpeed)
                if (scrolled != 0f) {
                    taskListDragOffset += scrolled
                    taskListItemHeights = lazyListState.layoutInfo.visibleItemsInfo
                        .filter { it.key is String }
                        .associate { (it.key as String) to it.size.toFloat() }
                    checkTaskListSwap()
                }
            }
            delay(16L)
        }
    }

    val currentTaskLists by rememberUpdatedState(displayTaskLists)
    val currentCheckTaskListSwap by rememberUpdatedState(::checkTaskListSwap)
    val currentCommitTaskListOrder by rememberUpdatedState(::commitTaskListOrder)
    val currentHaptic by rememberUpdatedState(haptic)
    val currentDensity by rememberUpdatedState(density)

    val mutedText = mutedTextColor()
    val rowActive = rowActiveColor()
    val navColor = if (isAppDarkTheme()) AppGray.g300 else AppGray.g700

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .padding(start = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(R.drawable.brand_logo),
                    contentDescription = null,
                    modifier = Modifier.size(24.dp)
                )
                Text(
                    t.t("title"),
                    style = TextStyle(
                        fontFamily = GenInterfaceJPDisplayFontFamily,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 28.sp,
                        letterSpacing = 0.18.sp
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    modifier = Modifier.semantics { heading() }
                )
            }
            AppIconButton(
                icon = Icons.Outlined.Settings,
                contentDescription = t.t("settings.title"),
                onClick = {
                    if (onOpenSettings != null) {
                        onOpenSettings()
                    } else {
                        navController?.navigate(AppRoute.Settings.route)
                    }
                },
                iconSize = AppIconMetrics.headerActionIconSize,
                tint = if (settingsActive) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (settingsActive) rowActive else Color.Transparent)
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 44.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(if (calendarActive) rowActive else Color.Transparent)
                .clickable(role = Role.Button) { openCalendar() }
                .semantics { if (calendarActive) selected = true }
                .padding(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.CalendarToday,
                contentDescription = null,
                tint = if (calendarActive) MaterialTheme.colorScheme.onSurface else navColor,
                modifier = Modifier.size(AppIconMetrics.compactActionIconSize)
            )
            Text(
                t.t("app.calendar"),
                style = AppRowTextStyle.copy(
                    fontWeight = if (calendarActive) FontWeight.SemiBold else FontWeight.Medium
                ),
                color = if (calendarActive) MaterialTheme.colorScheme.onSurface else navColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        LazyColumn(
            state = lazyListState,
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            item(key = 1, contentType = "label") {
                Text(
                    t.t("app.drawerTitle"),
                    style = AppCaptionTextStyle,
                    color = mutedText,
                    modifier = Modifier
                        .padding(start = 12.dp, end = 12.dp, top = 8.dp, bottom = 4.dp)
                        .semantics { heading() }
                )
            }
            if (uiState.hasError && displayTaskLists.isNotEmpty()) {
                item(key = 2, contentType = "error") {
                    Text(
                        t.t("app.loadError"),
                        color = MaterialTheme.colorScheme.error,
                        style = AppBodySmallTextStyle,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    )
                }
            }
            when {
                uiState.isLoading -> {
                    item(key = 3, contentType = "loading") {
                        Box(Modifier.fillMaxWidth().padding(vertical = 20.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = mutedText, strokeWidth = 2.dp, modifier = Modifier.size(24.dp))
                        }
                    }
                }
                displayTaskLists.isEmpty() -> {
                    item(key = 3, contentType = "empty") {
                        Text(
                            if (uiState.hasError) t.t("app.loadError") else t.t("app.emptyState"),
                            style = AppBodySmallTextStyle,
                            color = if (uiState.hasError) MaterialTheme.colorScheme.error else mutedText,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }
                }
                else -> {
                    items(
                        items = displayTaskLists,
                        key = { it.id },
                        contentType = { "taskList" }
                    ) { taskList ->
                        val isDragged = draggingTaskListId == taskList.id
                        val isSelected = selectedTaskListId == taskList.id
                        val taskListIndex = displayTaskLists.indexOfFirst { it.id == taskList.id }
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .offset { IntOffset(0, if (isDragged) taskListDragOffset.toInt() else 0) }
                                .zIndex(if (isDragged) 1f else 0f)
                                .alpha(if (isDragged && !reduceMotion) 0.5f else 1f)
                                .graphicsLayer {
                                    scaleX = if (isDragged && !reduceMotion) 1.03f else 1f
                                    scaleY = if (isDragged && !reduceMotion) 1.03f else 1f
                                }
                                .then(if (!isDragged && !reduceMotion) Modifier.animateItem() else Modifier)
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (isSelected) rowActive else Color.Transparent),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                modifier = Modifier
                                    .weight(1f)
                                    .heightIn(min = 52.dp)
                                    .clickable(enabled = draggingTaskListId == null, role = Role.Button) {
                                        openTaskList(taskList.id)
                                    }
                                    .semantics { if (isSelected) selected = true }
                                    .padding(start = 12.dp, top = 6.dp, bottom = 6.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(Modifier.width(20.dp), contentAlignment = Alignment.Center) {
                                    AppListDot(taskList.background)
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        taskList.name,
                                        style = AppRowTextStyle.copy(
                                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium
                                        ),
                                        color = MaterialTheme.colorScheme.onSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        remainingCountLabel(t, taskList.remainingTaskCount),
                                        style = TextStyle(
                                            fontFamily = GenInterfaceJPBodyFontFamily,
                                            fontSize = 12.sp,
                                            lineHeight = 16.sp
                                        ),
                                        color = mutedText,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                            Box(
                                modifier = Modifier
                                    .width(40.dp)
                                    .height(44.dp)
                                            .pointerInput(taskList.id) {
                                                detectDragGestures(
                                                    onDragStart = { _ ->
                                                currentHaptic.performHapticFeedback(HapticFeedbackType.GestureThresholdActivate)
                                                draggingTaskListId = taskList.id
                                                taskListDragStartIds = currentTaskLists.map { it.id }
                                                dragOrderedTaskLists = currentTaskLists
                                                taskListItemHeights = lazyListState.layoutInfo.visibleItemsInfo
                                                    .filter { it.key is String }
                                                    .associate { (it.key as String) to it.size.toFloat() }
                                                taskListDragOffset = 0f
                                            },
                                            onDragEnd = {
                                                taskListAutoScrollSpeed = 0f
                                                val ordered = dragOrderedTaskLists
                                                if (ordered != null && ordered.map { it.id } != taskListDragStartIds) {
                                                    currentCommitTaskListOrder(ordered.map { it.id })
                                                }
                                                dragOrderedTaskLists = null
                                                taskListDragStartIds = emptyList()
                                                draggingTaskListId = null
                                                taskListDragOffset = 0f
                                            },
                                            onDragCancel = {
                                                taskListAutoScrollSpeed = 0f
                                                draggingTaskListId = null
                                                dragOrderedTaskLists = null
                                                taskListDragStartIds = emptyList()
                                                taskListDragOffset = 0f
                                            },
                                            onDrag = { change, dragAmount ->
                                                change.consume()
                                                taskListDragOffset += dragAmount.y
                                                currentCheckTaskListSwap()

                                                val viewportHeight = lazyListState.layoutInfo.viewportSize.height.toFloat()
                                                val edgeZone = with(currentDensity) { 80.dp.toPx() }
                                                val maxSpeed = with(currentDensity) { 8.dp.toPx() }
                                                val draggedItemInfo = lazyListState.layoutInfo.visibleItemsInfo
                                                    .firstOrNull { it.key == draggingTaskListId }
                                                val fingerInViewport = if (draggedItemInfo != null) {
                                                    draggedItemInfo.offset + draggedItemInfo.size / 2 + taskListDragOffset
                                                } else {
                                                    viewportHeight / 2
                                                }
                                                taskListAutoScrollSpeed = dragAutoScrollSpeed(
                                                    fingerInViewport,
                                                    viewportHeight,
                                                    edgeZone,
                                                    maxSpeed,
                                                    lazyListState.canScrollBackward,
                                                    lazyListState.canScrollForward
                                                )
                                            }
                                        )
                                    }
                                    .onPreviewKeyEvent { event ->
                                        if (event.type != KeyEventType.KeyDown || !event.isAltPressed) {
                                            return@onPreviewKeyEvent false
                                        }
                                        when (event.key) {
                                            Key.DirectionUp -> moveTaskListBy(taskList.id, -1)
                                            Key.DirectionDown -> moveTaskListBy(taskList.id, 1)
                                            else -> false
                                        }
                                    }
                                    .focusable()
                                    .semantics {
                                        contentDescription = t.t("app.dragHint")
                                        customActions = buildList {
                                            if (taskListIndex > 0) {
                                                add(CustomAccessibilityAction(t.t("a11y.moveUp")) { moveTaskListBy(taskList.id, -1) })
                                            }
                                            if (taskListIndex < displayTaskLists.lastIndex) {
                                                add(CustomAccessibilityAction(t.t("a11y.moveDown")) { moveTaskListBy(taskList.id, 1) })
                                            }
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                DragHandleIcon()
                            }
                        }
                    }
                }
            }
            item(key = 4, contentType = "actions") {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AppButton(
                        t.t("app.createNew"),
                        onClick = {
                            createName = ""
                            createBackground = null
                            showCreateDialog = true
                        },
                        style = AppButtonStyle.Tonal,
                        icon = Icons.Default.Add,
                        modifier = Modifier.weight(1f)
                    )
                    AppButton(
                        t.t("app.joinList"),
                        onClick = {
                            joinListInput = ""
                            joinListError = null
                            showJoinDialog = true
                        },
                        style = AppButtonStyle.Tonal,
                        icon = Icons.Default.Link,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }

    LaunchedEffect(uiState.taskLists) {
        if (onTaskListSelected == null || uiState.taskLists.isEmpty()) {
            return@LaunchedEffect
        }

        if (selectedTaskListId != null && uiState.taskLists.any { it.id == selectedTaskListId }) {
            return@LaunchedEffect
        }

        onTaskListSelected(uiState.taskLists.first().id)
    }

    fun createTaskList() {
        val trimmed = createName.trim()
        if (trimmed.isNotEmpty()) {
            val uid = Firebase.auth.currentUser?.uid ?: return
            val db = Firebase.firestore
            val taskListId = db.collection("taskLists").document().id
            val nextOrder = (uiState.taskLists.size + 1).toDouble()
            val now = nowMillis()
            val newTaskList = hashMapOf<String, Any?>(
                "id" to taskListId,
                "name" to trimmed,
                "tasks" to emptyMap<String, Any>(),
                "history" to emptyList<Any>(),
                "shareCode" to null,
                "background" to createBackground,
                "memberCount" to 1,
                "createdAt" to now,
                "updatedAt" to now
            )
            scope.launch {
                try {
                    val taskListOrderRef = db.collection("taskListOrder").document(uid)
                    val taskListOrderUpdates = mutableMapOf<String, Any>(
                        taskListId to mapOf("order" to nextOrder),
                        "updatedAt" to now
                    )
                    if (!taskListOrderRef.get().await().exists()) {
                        taskListOrderUpdates["createdAt"] = now
                    }
                    db.batch().apply {
                        set(db.collection("taskLists").document(taskListId), newTaskList)
                        set(
                            db.collection("taskLists").document(taskListId)
                                .collection("members").document(uid),
                            mapOf("joinedAt" to now, "joinCode" to null)
                        )
                        set(
                            taskListOrderRef,
                            taskListOrderUpdates,
                            SetOptions.merge()
                        )
                    }.commit().await()
                    logTaskListCreate()
                    openTaskList(taskListId)
                } catch (e: Exception) {
                    recordNonFatalException("task_list_create", e)
                }
            }
            showCreateDialog = false
        }
    }

    fun joinTaskList() {
        scope.launch {
            val code = normalizedShareCode(joinListInput)
            if (code == null) {
                joinListError = t.t("pages.sharecode.notFound")
                return@launch
            }
            joiningList = true
            joinListError = null
            try {
                val taskListId = fetchTaskListIdByShareCode(code)
                if (taskListId == null) {
                    joinListError = t.t("pages.sharecode.notFound")
                    joiningList = false
                    return@launch
                }
                if (uiState.taskLists.any { it.id == taskListId }) {
                    showJoinDialog = false
                    openTaskList(taskListId)
                    joiningList = false
                    return@launch
                }
                addSharedTaskListToOrder(taskListId, code)
                logShareCodeJoin()
                showJoinDialog = false
                openTaskList(taskListId)
            } catch (e: Exception) {
                joinListError = localizeJoinListError(t, e)
            } finally {
                joiningList = false
            }
        }
    }

    if (showCreateDialog) {
        AppDialog(
            onDismissRequest = { showCreateDialog = false },
            title = t.t("app.createTaskList"),
            footer = {
                AppButton(
                    t.t("common.cancel"),
                    onClick = { showCreateDialog = false },
                    style = AppButtonStyle.Secondary
                )
                AppButton(
                    t.t("app.create"),
                    onClick = { createTaskList() },
                    enabled = createName.trim().isNotEmpty()
                )
            }
        ) {
            Column(
                modifier = Modifier.padding(top = 20.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                AppDialogField(t.t("app.taskListName")) {
                    AppTextField(
                        value = createName,
                        onValueChange = { createName = it },
                        placeholder = t.t("app.taskListNamePlaceholder"),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { createTaskList() })
                    )
                }
                AppColorPicker(selected = createBackground) { createBackground = it }
            }
        }
    }

    if (showJoinDialog) {
        AppDialog(
            onDismissRequest = { if (!joiningList) showJoinDialog = false },
            title = t.t("app.joinListTitle"),
            description = t.t("app.joinListDescription"),
            footer = {
                AppButton(
                    t.t("common.cancel"),
                    onClick = { showJoinDialog = false },
                    style = AppButtonStyle.Secondary,
                    enabled = !joiningList
                )
                AppButton(
                    if (joiningList) t.t("app.joining") else t.t("app.join"),
                    onClick = { joinTaskList() },
                    enabled = joinListInput.trim().isNotEmpty() && !joiningList
                )
            }
        ) {
            Column(
                modifier = Modifier.padding(top = 20.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                joinListError?.let { error ->
                    Text(error, color = MaterialTheme.colorScheme.error, style = AppBodySmallTextStyle)
                }
                AppDialogField(t.t("taskList.shareCode")) {
                    AppTextField(
                        value = joinListInput,
                        onValueChange = { joinListInput = it; joinListError = null },
                        placeholder = t.t("app.shareCodePlaceholder"),
                        keyboardOptions = KeyboardOptions(
                            capitalization = KeyboardCapitalization.Characters,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(onDone = { joinTaskList() })
                    )
                }
            }
        }
    }

}

@Composable
private fun TabletRootScreen(
    userId: String?,
    initialSelectedTaskListId: String?,
    onSelectedTaskListHandled: () -> Unit
) {
    val selectedTaskListState = rememberSaveable { mutableStateOf<String?>(null) }
    var selectedPane by rememberSaveable { mutableStateOf(TabletPane.TaskList) }
    var hasAppliedStartupPane by rememberSaveable { mutableStateOf(false) }
    val settingsState = resolvedSettingsState(userId, rememberSettingsState(userId))
    val sharedTaskLists = rememberOrderedTaskLists(userId, ::parseTaskListDetail)

    LaunchedEffect(settingsState.isLoading) {
        if (hasAppliedStartupPane || settingsState.isLoading) return@LaunchedEffect
        hasAppliedStartupPane = true
        if (settingsState.startupView == "calendar") {
            selectedPane = TabletPane.Calendar
        }
    }

    LaunchedEffect(initialSelectedTaskListId) {
        val taskListId = initialSelectedTaskListId ?: return@LaunchedEffect
        selectedTaskListState.value = taskListId
        selectedPane = TabletPane.TaskList
        onSelectedTaskListHandled()
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .width(360.dp)
        ) {
            TaskListsScreen(
                navController = null,
                userId = userId,
                selectedTaskListId = selectedTaskListState.value.takeIf { selectedPane == TabletPane.TaskList },
                calendarActive = selectedPane == TabletPane.Calendar,
                settingsActive = selectedPane == TabletPane.Settings,
                onTaskListSelected = { taskListId ->
                    selectedTaskListState.value = taskListId
                    selectedPane = TabletPane.TaskList
                },
                onOpenSettings = {
                    selectedPane = TabletPane.Settings
                },
                onOpenCalendar = {
                    selectedPane = TabletPane.Calendar
                }
            )
        }

        Box(
            modifier = Modifier
                .fillMaxHeight()
                .width(1.dp)
                .background(MaterialTheme.colorScheme.outlineVariant)
        )

        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
        ) {
            if (selectedPane == TabletPane.Settings) {
                SettingsView(
                    showTopBar = false,
                    externalSettingsState = settingsState
                )
            } else if (selectedPane == TabletPane.Calendar) {
                CalendarScreen(
                    userId = userId,
                    selectedTaskListIdState = selectedTaskListState,
                    onOpenTaskList = {
                        selectedPane = TabletPane.TaskList
                    },
                    showTopBar = false,
                    externalTaskLists = sharedTaskLists,
                    externalSettingsState = settingsState
                )
            } else {
                TaskListDetailPagerScreen(
                    navController = null,
                    userId = userId,
                    selectedTaskListIdState = selectedTaskListState,
                    showTopBar = false,
                    onEmpty = { selectedTaskListState.value = null },
                    externalSettingsState = settingsState
                )
            }
        }
    }
}

@Composable
private fun TaskListDetailPagerScreen(
    navController: NavController?,
    userId: String?,
    initialTaskListId: String = "__initial__",
    selectedTaskListIdState: MutableState<String?>? = null,
    showTopBar: Boolean = true,
    onEmpty: (() -> Unit)? = if (navController != null) ({ navController.navigateUp() }) else null,
    externalSettingsState: SettingsState? = null
) {
    val t = LocalTranslations.current
    val uiState = rememberOrderedTaskListsState(userId, ::parseTaskListDetail)
    val settingsState = resolvedSettingsState(
        userId,
        externalSettingsState ?: rememberSettingsState(userId)
    )
    var internalSelectedTaskListId by rememberSaveable(initialTaskListId) {
        mutableStateOf(initialTaskListId)
    }

    val selectedTaskListId = selectedTaskListIdState?.value ?: internalSelectedTaskListId

    fun updateSelectedTaskListId(value: String?) {
        if (selectedTaskListIdState != null) {
            selectedTaskListIdState.value = value
        } else {
            internalSelectedTaskListId = value.orEmpty()
        }
    }

    fun resolveSelectedTaskListId(taskLists: List<TaskListDetail>): String? {
        if (taskLists.isEmpty()) {
            return null
        }
        if (taskLists.any { it.id == selectedTaskListId }) {
            return selectedTaskListId
        }
        return taskLists.firstOrNull { it.id == initialTaskListId }?.id ?: taskLists.first().id
    }

    LaunchedEffect(uiState.taskLists) {
        if (uiState.isLoading) {
            return@LaunchedEffect
        }
        if (uiState.taskLists.isEmpty()) {
            onEmpty?.invoke()
            return@LaunchedEffect
        }
        val resolvedTaskListId = resolveSelectedTaskListId(uiState.taskLists)
        if (resolvedTaskListId != null && resolvedTaskListId != selectedTaskListId) {
            updateSelectedTaskListId(resolvedTaskListId)
        }
    }

    val resolvedTaskListId = resolveSelectedTaskListId(uiState.taskLists)
    val selectedTaskListIndex = uiState.taskLists.indexOfFirst { it.id == resolvedTaskListId }
        .takeIf { it >= 0 }
        ?: 0
    val pagerState = rememberPagerState(initialPage = selectedTaskListIndex) {
        uiState.taskLists.size
    }
    val currentSelectedTaskListId by rememberUpdatedState(selectedTaskListId)
    val currentTaskList =
        uiState.taskLists.getOrNull(pagerState.currentPage) ?: uiState.taskLists.firstOrNull()
    val taskListBackgroundColor = resolveTaskListBackgroundColor(currentTaskList?.background)
    val showIndicator = showTopBar && uiState.taskLists.size > 1 && currentTaskList != null
    val taskPageTopInset = when {
        !showTopBar -> 40.dp
        showIndicator -> TaskListDetailMetrics.indicatorContentInset
        else -> 0.dp
    }

    LaunchedEffect(uiState.taskLists.size, selectedTaskListIndex) {
        if (uiState.taskLists.isEmpty()) {
            return@LaunchedEffect
        }
        if (pagerState.currentPage != selectedTaskListIndex) {
            pagerState.scrollToPage(selectedTaskListIndex)
        }
    }

    val pagerFocusManager = LocalFocusManager.current

    LaunchedEffect(pagerState, pagerFocusManager) {
        snapshotFlow { pagerState.isScrollInProgress }
            .collectLatest { isScrolling ->
                if (isScrolling) {
                    pagerFocusManager.clearFocus(force = true)
                }
            }
    }

    LaunchedEffect(pagerState, uiState.taskLists) {
        snapshotFlow { pagerState.settledPage }
            .collectLatest { page ->
                val taskList = uiState.taskLists.getOrNull(page) ?: return@collectLatest
                if (taskList.id != currentSelectedTaskListId) {
                    updateSelectedTaskListId(taskList.id)
                }
            }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(taskListBackgroundColor)
            .clipToBounds()
    ) {
        DetailScreenScaffold(
            title = "",
            onBack = if (navController != null) ({ navController.navigateUp() }) else null,
            showTopBar = showTopBar,
            topBarHeight = TaskListDetailMetrics.topBarHeight,
            backgroundColor = taskListBackgroundColor
        ) {
            Column(
                modifier = Modifier
                    .widthIn(max = TaskListDetailMetrics.contentMaxWidth + 32.dp)
                    .fillMaxSize()
                    .align(Alignment.CenterHorizontally)
            ) {
                when {
                    uiState.isLoading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(t.t("common.loading"), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    currentTaskList == null && uiState.hasError -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(t.t("app.loadError"), color = MaterialTheme.colorScheme.error)
                        }
                    }
                    currentTaskList == null -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(t.t("app.emptyState"), color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    else -> {
                        Box(modifier = Modifier.fillMaxSize()) {
                            HorizontalPager(
                                state = pagerState,
                                modifier = Modifier.fillMaxSize()
                            ) { page ->
                                val taskList = uiState.taskLists[page]
                                TaskListDetailContent(
                                    taskList = taskList,
                                    taskInsertPosition = settingsState.taskInsertPosition,
                                    autoSort = settingsState.autoSort,
                                    topInset = taskPageTopInset,
                                )
                            }
                            if (showIndicator) {
                                TaskListIndicator(
                                    count = uiState.taskLists.size,
                                    selectedIndex = selectedTaskListIndex,
                                    labels = uiState.taskLists.map { it.name },
                                    backgroundColor = taskListBackgroundColor,
                                    onSelect = { index ->
                                        val nextTaskList = uiState.taskLists.getOrNull(index) ?: return@TaskListIndicator
                                        updateSelectedTaskListId(nextTaskList.id)
                                    },
                                    modifier = Modifier.align(Alignment.TopCenter)
                                )
                            }
                            if (uiState.hasError) {
                                Text(
                                    t.t("app.loadError"),
                                    color = MaterialTheme.colorScheme.error,
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier
                                        .align(Alignment.TopCenter)
                                        .padding(top = if (showIndicator) 32.dp else 8.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TaskListIndicator(
    count: Int,
    selectedIndex: Int,
    labels: List<String>,
    backgroundColor: Color,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val t = LocalTranslations.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(backgroundColor),
        contentAlignment = Alignment.Center
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center
        ) {
            repeat(count) { index ->
                val isSelected = index == selectedIndex
                val positionLabel = t.t(
                    "a11y.listPosition",
                    mapOf("index" to "${index + 1}", "total" to "$count")
                )
                val dotLabel = labels.getOrNull(index)?.let { "$it, $positionLabel" } ?: positionLabel
                Box(
                    modifier = Modifier
                        .padding(horizontal = 2.dp, vertical = 4.dp)
                        .size(TaskListDetailMetrics.indicatorTouchSize)
                        .semantics {
                            contentDescription = dotLabel
                            role = Role.Button
                            selected = isSelected
                        }
                        .clickable { onSelect(index) },
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(TaskListDetailMetrics.indicatorDotSize)
                            .background(
                                MaterialTheme.colorScheme.onBackground.copy(
                                    alpha = if (isSelected) 1f else 0.4f
                                ),
                                CircleShape
                            )
                    )
                }
            }
        }
    }
}

@Composable
private fun TaskListRow(
    modifier: Modifier = Modifier,
    task: TaskSummary,
    isEditing: Boolean,
    isDragged: Boolean,
    isExiting: Boolean,
    allowTaskEditing: Boolean,
    reduceMotion: Boolean,
    taskDragOffset: Float,
    languageTag: String,
    taskTextStyle: TextStyle,
    taskDateTextStyle: TextStyle,
    editingTextFieldValue: TextFieldValue,
    onEditingTextFieldValueChange: (TextFieldValue) -> Unit,
    onTaskClick: () -> Unit,
    onToggleCompletion: () -> Unit,
    onShowActions: () -> Unit,
    onDragStart: (Offset) -> Unit,
    onDragEnd: () -> Unit,
    onDragCancel: () -> Unit,
    onDrag: (change: androidx.compose.ui.input.pointer.PointerInputChange, dragAmount: Offset) -> Unit,
    onMoveUp: (() -> Boolean)?,
    onMoveDown: (() -> Boolean)?,
    completeInlineEdit: () -> Unit,
    moveInlineCaretLeft: () -> Unit,
    moveInlineCaretRight: () -> Unit,
    onInlineEditBlur: () -> Unit
) {
    val t = LocalTranslations.current
    val focusRequester = remember { FocusRequester() }
    val currentOnDragStart by rememberUpdatedState(onDragStart)
    val currentOnDragEnd by rememberUpdatedState(onDragEnd)
    val currentOnDragCancel by rememberUpdatedState(onDragCancel)
    val currentOnDrag by rememberUpdatedState(onDrag)
    val rowModifier = if (isDragged) {
        Modifier
            .offset { IntOffset(0, taskDragOffset.toInt()) }
            .zIndex(1f)
            .alpha((if (!reduceMotion) 0.8f else 1f) * if (task.completed) COMPLETED_TASK_ALPHA else 1f)
            .then(
                if (reduceMotion) {
                    Modifier
                } else {
                    Modifier.graphicsLayer {
                        scaleX = 1.03f
                        scaleY = 1.03f
                    }
                }
            )
    } else {
        val rowAlpha by animateFloatAsState(
            targetValue = when {
                isExiting -> 0f
                task.completed -> COMPLETED_TASK_ALPHA
                else -> 1f
            },
            animationSpec = if (reduceMotion) snap() else tween(
                durationMillis = if (isExiting) 120 else 200
            ),
            label = "taskRowAlpha"
        )
        Modifier
            .alpha(rowAlpha)
    }

    val hasDate = task.date.isNotBlank()
    val mutedIcon = mutedIconColor()
    val completionFillColor by animateColorAsState(
        targetValue = if (task.completed) completedFillColor() else Color.Transparent,
        animationSpec = if (reduceMotion) snap() else tween(durationMillis = 180),
        label = "completionFillColor"
    )
    val completionBorderColor by animateColorAsState(
        targetValue = if (task.completed) Color.Transparent else mutedIcon,
        animationSpec = if (reduceMotion) snap() else tween(durationMillis = 180),
        label = "completionBorderColor"
    )
    val completionFillScale by animateFloatAsState(
        targetValue = if (task.completed) 1f else 0.4f,
        animationSpec = if (reduceMotion) {
            snap()
        } else {
            spring(dampingRatio = 0.65f, stiffness = Spring.StiffnessMedium)
        },
        label = "completionFillScale"
    )

    Row(
        modifier = modifier
            .bleed(start = TaskListDetailMetrics.rowBleed, end = TaskListDetailMetrics.rowBleed)
            .fillMaxWidth()
            .then(rowModifier)
            .padding(vertical = TaskListDetailMetrics.rowVerticalPadding),
        verticalAlignment = if (hasDate) Alignment.Bottom else Alignment.CenterVertically
    ) {
        if (allowTaskEditing) {
            Box(
                modifier = Modifier
                    .bleed(end = TaskListDetailMetrics.handleOverlap)
                    .size(TaskListDetailMetrics.controlSize)
                    .pointerInput(task.id) {
                        detectDragGestures(
                            onDragStart = { currentOnDragStart(it) },
                            onDragEnd = currentOnDragEnd,
                            onDragCancel = currentOnDragCancel,
                            onDrag = { change, dragAmount -> currentOnDrag(change, dragAmount) }
                        )
                    }
                    .onPreviewKeyEvent { event ->
                        if (event.type != KeyEventType.KeyDown || !event.isAltPressed) {
                            return@onPreviewKeyEvent false
                        }
                        when (event.key) {
                            Key.DirectionUp -> onMoveUp?.invoke() ?: false
                            Key.DirectionDown -> onMoveDown?.invoke() ?: false
                            else -> false
                        }
                    }
                    .focusable()
                    .semantics {
                        contentDescription = t.t("app.dragHint")
                        customActions = buildList {
                            onMoveUp?.let { action -> add(CustomAccessibilityAction(t.t("a11y.moveUp")) { action() }) }
                            onMoveDown?.let { action -> add(CustomAccessibilityAction(t.t("a11y.moveDown")) { action() }) }
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                DragHandleIcon()
            }
        }
        Box(
            modifier = Modifier
                .bleed(end = TaskListDetailMetrics.completionOverlap)
                .size(TaskListDetailMetrics.controlSize)
                .semantics {
                    contentDescription = if (task.completed) t.t("pages.tasklist.markIncomplete") else t.t("pages.tasklist.markComplete")
                    role = Role.Checkbox
                }
                .clickable(enabled = allowTaskEditing) { onToggleCompletion() },
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(TaskListDetailMetrics.completionDotSize)
                    .border(1.dp, completionBorderColor, CircleShape)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            scaleX = completionFillScale
                            scaleY = completionFillScale
                        }
                        .background(completionFillColor, CircleShape)
                )
            }
        }
        Column(modifier = Modifier.weight(1f)) {
            if (hasDate) {
                val displayDate = remember(task.date, languageTag) {
                    formatDateForLocale(task.date, languageTag, "MMM d EEE")
                }
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(TaskListDetailMetrics.dateRowHeight),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Text(
                        text = displayDate,
                        style = taskDateTextStyle,
                        color = mutedTextColor(),
                        modifier = Modifier.offset(y = TaskListDetailMetrics.dateOffset)
                    )
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = TaskListDetailMetrics.controlSize)
                    .then(
                        if (isEditing) {
                            Modifier
                        } else {
                            Modifier.clickable(
                                enabled = allowTaskEditing,
                                onClickLabel = t.t("a11y.editTask")
                            ) { onTaskClick() }
                        }
                    ),
                contentAlignment = Alignment.CenterStart
            ) {
                val textWeight = if (task.pinned && !task.completed) FontWeight.Bold else FontWeight.Medium
                if (isEditing) {
                    var hasFocused by remember { mutableStateOf(false) }
                    var hasCommitted by remember { mutableStateOf(false) }
                    val inlineEditKeyModifier = Modifier
                        .onPreviewKeyEvent { event ->
                            if (event.type != KeyEventType.KeyDown && event.type != KeyEventType.KeyUp) {
                                return@onPreviewKeyEvent false
                            }
                            when (event.key) {
                                Key.DirectionLeft -> {
                                    if (event.type == KeyEventType.KeyDown) {
                                        moveInlineCaretLeft()
                                    }
                                    true
                                }
                                Key.DirectionRight -> {
                                    if (event.type == KeyEventType.KeyDown) {
                                        moveInlineCaretRight()
                                    }
                                    true
                                }
                                Key.DirectionUp,
                                Key.DirectionDown -> true
                                Key.Enter,
                                Key.NumPadEnter -> {
                                    if (event.type == KeyEventType.KeyUp) {
                                        hasCommitted = true
                                        completeInlineEdit()
                                    }
                                    true
                                }
                                else -> false
                            }
                        }
                    BasicTextField(
                        value = editingTextFieldValue,
                        onValueChange = onEditingTextFieldValueChange,
                        textStyle = taskTextStyle.copy(
                            color = if (task.completed) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                            fontWeight = textWeight,
                            textDecoration = if (task.completed) TextDecoration.LineThrough else TextDecoration.None
                        ),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.onSurface),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = {
                            hasCommitted = true
                            completeInlineEdit()
                        }),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .focusRequester(focusRequester)
                            .then(inlineEditKeyModifier)
                            .onFocusChanged { state ->
                                if (state.isFocused) {
                                    hasFocused = true
                                } else if (hasFocused && !hasCommitted) {
                                    hasCommitted = true
                                    onInlineEditBlur()
                                }
                            }
                    )
                    LaunchedEffect(task.id) {
                        focusRequester.requestFocus()
                    }
                } else {
                    Text(
                        task.text,
                        style = taskTextStyle,
                        textDecoration = if (task.completed) TextDecoration.LineThrough else TextDecoration.None,
                        color = if (task.completed) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                        fontWeight = textWeight,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
        if (allowTaskEditing) {
            val actionInteractionSource = remember { MutableInteractionSource() }
            val actionScale = rememberPressScale(actionInteractionSource)
            Box(
                modifier = Modifier
                    .size(TaskListDetailMetrics.controlSize)
                    .graphicsLayer {
                        scaleX = actionScale
                        scaleY = actionScale
                    }
                    .clip(RoundedCornerShape(12.dp))
                    .clickable(
                        interactionSource = actionInteractionSource,
                        indication = ripple(),
                        role = Role.Button,
                        onClick = onShowActions
                    )
                    .semantics {
                        contentDescription = t.t(if (task.pinned) "pages.tasklist.unpinTask" else "pages.tasklist.setDate")
                    },
                contentAlignment = Alignment.Center
            ) {
                Crossfade(
                    targetState = task.pinned,
                    animationSpec = if (reduceMotion) snap() else tween(durationMillis = 200),
                    label = "trailingActionIcon"
                ) { pinned ->
                    Icon(
                        imageVector = if (pinned) Icons.Default.PushPin else Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = mutedIcon,
                        modifier = Modifier.size(AppIconMetrics.compactActionIconSize)
                    )
                }
            }
        }
    }
}

private fun taskDisplayGroup(task: TaskSummary): Int {
    return if (task.completed) 2 else if (task.pinned) 0 else 1
}

private fun hasTaskContent(text: String, date: String, pinned: Boolean): Boolean {
    return text.isNotBlank() || date.isNotEmpty() || pinned
}

private fun hasTaskContent(task: TaskSummary): Boolean {
    return hasTaskContent(task.text, task.date, task.pinned)
}

private fun canReorderTasks(first: TaskSummary, second: TaskSummary, autoSort: Boolean): Boolean {
    return !autoSort || (taskDisplayGroup(first) == taskDisplayGroup(second) && first.date == second.date)
}

private fun getDisplayOrderedTasks(tasks: List<TaskSummary>): List<TaskSummary> {
    return tasks.filter(::hasTaskContent).sortedWith(
        compareBy<TaskSummary> { taskDisplayGroup(it) }
            .thenBy { it.order }
            .thenBy { it.id }
    )
}

private fun getOrderOrderedTasks(tasks: List<TaskSummary>): List<TaskSummary> {
    return tasks.filter(::hasTaskContent).sortedWith(
        compareBy<TaskSummary> { it.order }.thenBy { it.id }
    )
}

private fun getAutoSortedTasks(tasks: List<TaskSummary>): List<TaskSummary> {
    return renumberTasks(tasks.filter(::hasTaskContent).sortedWith(
        compareBy<TaskSummary> { taskDisplayGroup(it) }
            .thenBy { if (it.date.isBlank()) "9999-12-31" else it.date }
            .thenBy { it.order }
            .thenBy { it.id }
    ))
}

private fun renumberTasks(tasks: List<TaskSummary>): List<TaskSummary> {
    return tasks.mapIndexed { index, task ->
        task.copy(order = (index + 1).toDouble())
    }
}

private fun normalizeTasks(tasks: List<TaskSummary>, autoSort: Boolean): List<TaskSummary> {
    return if (autoSort) getAutoSortedTasks(tasks) else renumberTasks(tasks.filter(::hasTaskContent))
}

private fun buildTaskUpdateData(
    previousTasks: List<TaskSummary>,
    tasks: List<TaskSummary>,
    deletedTaskIds: List<String> = emptyList()
): Map<String, Any> {
    val updates = mutableMapOf<String, Any>("updatedAt" to nowMillis())
    val previousById = previousTasks.associateBy { it.id }
    val nextTaskIds = tasks.mapTo(mutableSetOf()) { it.id }
    previousTasks.filterNot { it.id in nextTaskIds }.forEach { task ->
        updates["tasks.${task.id}"] = FieldValue.delete()
    }
    deletedTaskIds.forEach { taskId ->
        updates["tasks.$taskId"] = FieldValue.delete()
    }
    tasks.forEach { task ->
        val previous = previousById[task.id]
        if (previous == null) {
            updates["tasks.${task.id}.id"] = task.id
            updates["tasks.${task.id}.text"] = task.text
            updates["tasks.${task.id}.completed"] = task.completed
            updates["tasks.${task.id}.date"] = task.date
            updates["tasks.${task.id}.order"] = task.order
            updates["tasks.${task.id}.pinned"] = task.pinned
        } else {
            if (previous.text != task.text) updates["tasks.${task.id}.text"] = task.text
            if (previous.completed != task.completed) updates["tasks.${task.id}.completed"] = task.completed
            if (previous.date != task.date) updates["tasks.${task.id}.date"] = task.date
            if (previous.order != task.order) updates["tasks.${task.id}.order"] = task.order
            if (previous.pinned != task.pinned) updates["tasks.${task.id}.pinned"] = task.pinned
        }
    }
    return updates
}

private fun buildHistory(
    newText: String,
    history: List<String>,
    oldText: String? = null
): List<String> {
    val candidate = newText.trim()
    if (candidate.isEmpty()) return history
    val trimmedOldText = oldText?.trim()
    val result = mutableListOf<String>()
    val seen = mutableSetOf<String>()
    for (entry in listOf(candidate) + history) {
        val trimmed = entry.trim()
        if (trimmed.isEmpty()) continue
        if (trimmedOldText != null && trimmed == trimmedOldText) continue
        val normalized = trimmed.lowercase()
        if (!seen.add(normalized)) continue
        result.add(trimmed)
        if (result.size >= 300) break
    }
    return result
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TaskListDetailContent(
    taskList: TaskListDetail,
    taskInsertPosition: String = "top",
    autoSort: Boolean = true,
    topInset: androidx.compose.ui.unit.Dp = 0.dp,
    allowTaskEditing: Boolean = true,
    allowTaskListDeletion: Boolean = true,
    allowShareCodeManagement: Boolean = true
) {
    val t = LocalTranslations.current
    val haptic = LocalHapticFeedback.current
    val reduceMotion = rememberReduceMotion()
    val scope = rememberCoroutineScope()
    val db = Firebase.firestore
    var newTaskText by remember { mutableStateOf("") }
    var isNewTaskInputFocused by remember { mutableStateOf(false) }
    var editingTaskId by remember { mutableStateOf<String?>(null) }
    var editingTextFieldValue by remember { mutableStateOf(TextFieldValue("")) }
    var actionSheetState by remember { mutableStateOf<ActionSheetState?>(null) }
    var showDeleteCompletedConfirm by remember { mutableStateOf(false) }
    var draggingTaskId by remember { mutableStateOf<String?>(null) }
    var taskDragOffset by remember { mutableFloatStateOf(0f) }
    var dragOrderedTasks by remember { mutableStateOf<List<TaskSummary>?>(null) }
    var dragStartTaskIds by remember(taskList.id) { mutableStateOf<List<String>>(emptyList()) }
    var pendingDisplayedTasks by remember { mutableStateOf<List<TaskSummary>?>(null) }
    var taskMutationRevision by remember(taskList.id) { mutableIntStateOf(0) }
    var exitingTaskIds by remember(taskList.id) { mutableStateOf<Set<String>>(emptySet()) }
    var taskItemHeights by remember { mutableStateOf<Map<String, Float>>(emptyMap()) }
    var taskAutoScrollSpeed by remember { mutableFloatStateOf(0f) }
    val lazyListState = rememberLazyListState()
    var showShareDialog by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var showRemoveListConfirm by remember { mutableStateOf(false) }
    var currentShareCode by remember { mutableStateOf(normalizedShareCode(taskList.shareCode)) }
    LaunchedEffect(taskList.shareCode) {
        currentShareCode = normalizedShareCode(taskList.shareCode)
    }
    var editName by remember { mutableStateOf("") }
    var editBackground by remember { mutableStateOf<String?>(null) }
    var generatingShareCode by remember { mutableStateOf(false) }
    var removingShareCode by remember { mutableStateOf(false) }
    var removingList by remember { mutableStateOf(false) }
    var removeListError by remember { mutableStateOf<String?>(null) }
    var shareCopySuccess by remember { mutableStateOf(false) }
    var shareError by remember { mutableStateOf<String?>(null) }
    var taskMutationError by remember { mutableStateOf<String?>(null) }
    val newTaskFocusRequester = remember { FocusRequester() }

    val displayTasks = remember(taskList.tasks, dragOrderedTasks, pendingDisplayedTasks, autoSort) {
        dragOrderedTasks ?: pendingDisplayedTasks ?: if (autoSort) {
            getDisplayOrderedTasks(taskList.tasks)
        } else {
            getOrderOrderedTasks(taskList.tasks)
        }
    }
    val taskDensity = LocalDensity.current
    val taskSpacingPx = 0f
    val inputBackgroundColor = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.92f)
    val detailBodyTextStyle = MaterialTheme.typography.bodyMedium.copy(
        platformStyle = PlatformTextStyle(includeFontPadding = false),
        lineHeightStyle = LineHeightStyle(
            alignment = LineHeightStyle.Alignment.Center,
            trim = LineHeightStyle.Trim.None
        )
    )
    val titleTextStyle = TextStyle(
        fontFamily = GenInterfaceJPDisplayFontFamily,
        fontSize = 20.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 28.sp,
        letterSpacing = 0.2.sp
    )
    val inputTextStyle = detailBodyTextStyle.copy(
        fontSize = 16.sp,
        fontWeight = FontWeight.Normal,
        lineHeight = TaskListDetailMetrics.inputLineHeight
    )
    val taskTextStyle = detailBodyTextStyle.copy(
        fontSize = 16.sp,
        fontWeight = FontWeight.Medium,
        lineHeight = TaskListDetailMetrics.textLineHeight
    )
    val taskDateTextStyle = TextStyle(
        fontFamily = GenInterfaceJPBodyFontFamily,
        fontSize = 12.sp,
        fontWeight = FontWeight.Normal,
        platformStyle = PlatformTextStyle(includeFontPadding = false),
        lineHeightStyle = LineHeightStyle(
            alignment = LineHeightStyle.Alignment.Center,
            trim = LineHeightStyle.Trim.Both
        ),
        lineHeight = 12.sp
    )
    val focusManager = LocalFocusManager.current
    val density = LocalDensity.current
    val imeInsets = WindowInsets.ime
    LaunchedEffect(focusManager, imeInsets, density) {
        var wasImeVisible = imeInsets.getBottom(density) > 0
        snapshotFlow { imeInsets.getBottom(density) > 0 }
            .collectLatest { isImeVisible ->
                if (wasImeVisible && !isImeVisible) {
                    focusManager.clearFocus(force = true)
                }
                wasImeVisible = isImeVisible
            }
    }
    val viewConfiguration = LocalViewConfiguration.current
    val languageTag = t.languageTag()
    val canSort = remember(displayTasks) { displayTasks.size >= 2 }
    val hasCompletedTasks = remember(displayTasks) { displayTasks.any { it.completed } }
    var newTaskInputWidthPx by remember { mutableIntStateOf(0) }
    var newTaskInputBoundsInRoot by remember { mutableStateOf<Rect?>(null) }
    var taskListCoordinates by remember { mutableStateOf<LayoutCoordinates?>(null) }
    val currentNewTaskInputFocus = rememberUpdatedState(isNewTaskInputFocused)
    val currentNewTaskInputBounds = rememberUpdatedState(newTaskInputBoundsInRoot)
    val currentTaskListCoordinates = rememberUpdatedState(taskListCoordinates)
    val currentFocusManager = rememberUpdatedState(focusManager)
    val mutationQueue = remember(taskList.id) {
        TaskListMutationQueues.queueFor(taskList.id)
    }

    LaunchedEffect(taskList.id) {
        editingTaskId = null
        editingTextFieldValue = TextFieldValue("")
        actionSheetState = null
        showDeleteCompletedConfirm = false
        draggingTaskId = null
        taskDragOffset = 0f
        dragOrderedTasks = null
        pendingDisplayedTasks = null
        exitingTaskIds = emptySet()
        taskItemHeights = emptyMap()
        taskAutoScrollSpeed = 0f
        currentShareCode = normalizedShareCode(taskList.shareCode)
        editName = ""
        editBackground = null
        shareCopySuccess = false
        shareError = null
        taskMutationError = null
        removeListError = null
    }

    fun setPendingTasks(tasks: List<TaskSummary>) {
        pendingDisplayedTasks = tasks
    }

    fun persistTaskListUpdate(updates: Map<String, Any>) {
        val mutationRevision = taskMutationRevision + 1
        taskMutationRevision = mutationRevision
        taskMutationError = null
        val taskListDebugId = shortDebugId(taskList.id)
        logDebugSync("task update enqueue taskList=$taskListDebugId fields=${updates.keys.sorted().joinToString(",")}")
        mutationQueue.enqueue(
            onIdle = {
                if (taskMutationRevision == mutationRevision) {
                    pendingDisplayedTasks = null
                }
            },
            onError = { error ->
                logDebugSync("task update failure taskList=$taskListDebugId ${firestoreErrorDescription("task update", error)}")
                recordNonFatalException("task_update", error)
                if (taskMutationRevision == mutationRevision) {
                    pendingDisplayedTasks = null
                }
                taskMutationError = t.t("common.error")
            }
        ) {
            logDebugSync("task update start taskList=$taskListDebugId fields=${updates.size}")
            db.collection("taskLists").document(taskList.id).update(updates)
        }
    }

    fun performTaskMutation(
        buildNextTasks: (List<TaskSummary>) -> List<TaskSummary>,
        additionalUpdates: Map<String, Any> = emptyMap()
    ) {
        val previousTasks = displayTasks
        val nextTasks = normalizeTasks(buildNextTasks(previousTasks), autoSort)
        setPendingTasks(nextTasks)
        persistTaskListUpdate(buildTaskUpdateData(previousTasks, nextTasks) + additionalUpdates)
    }

    val historyOptions = remember(newTaskText, taskList.history) {
        val input = newTaskText.trim()
        if (input.length < 2) {
            emptyList()
        } else {
            val inputLower = input.lowercase()
            val seen = mutableSetOf<String>()
            buildList {
                for (candidate in taskList.history) {
                    val option = candidate.trim()
                    if (option.isEmpty()) continue
                    val optionLower = option.lowercase()
                    if (optionLower == inputLower || !optionLower.contains(inputLower) || !seen.add(optionLower)) {
                        continue
                    }
                    add(option)
                    if (size >= 20) break
                }
            }
        }
    }

    fun checkTaskSwap() {
        val ordered = dragOrderedTasks?.toMutableList() ?: return
        val draggingId = draggingTaskId ?: return
        val currentIdx = ordered.indexOfFirst { it.id == draggingId }.takeIf { it >= 0 } ?: return
        val currentHeight = taskItemHeights[draggingId] ?: return

        if (currentIdx + 1 < ordered.size) {
            val nextId = ordered[currentIdx + 1].id
            val nextHeight = taskItemHeights[nextId] ?: currentHeight
            val threshold = currentHeight / 2 + taskSpacingPx + nextHeight / 2
            if (canReorderTasks(ordered[currentIdx], ordered[currentIdx + 1], autoSort) && taskDragOffset > threshold) {
                ordered[currentIdx] = ordered[currentIdx + 1].also { ordered[currentIdx + 1] = ordered[currentIdx] }
                dragOrderedTasks = ordered.toList()
                taskDragOffset -= (nextHeight + taskSpacingPx)
                haptic.performHapticFeedback(HapticFeedbackType.SegmentFrequentTick)
                return
            }
        }

        if (currentIdx > 0) {
            val prevId = ordered[currentIdx - 1].id
            val prevHeight = taskItemHeights[prevId] ?: currentHeight
            val threshold = prevHeight / 2 + taskSpacingPx + currentHeight / 2
            if (canReorderTasks(ordered[currentIdx], ordered[currentIdx - 1], autoSort) && taskDragOffset < -threshold) {
                ordered[currentIdx] = ordered[currentIdx - 1].also { ordered[currentIdx - 1] = ordered[currentIdx] }
                dragOrderedTasks = ordered.toList()
                taskDragOffset += (prevHeight + taskSpacingPx)
                haptic.performHapticFeedback(HapticFeedbackType.SegmentFrequentTick)
            }
        }
    }

    fun commitTaskOrder(ids: List<String>) {
        val currentTasks = displayTasks
        if (ids.size != currentTasks.size || ids.toSet().size != currentTasks.size) return
        val currentTasksById = currentTasks.associateBy { it.id }
        val orderedTasks = ids.mapNotNull(currentTasksById::get)
        if (orderedTasks.size != currentTasks.size) return
        logTaskReorder()
        val normalizedTasks = renumberTasks(orderedTasks)
        setPendingTasks(normalizedTasks)
        persistTaskListUpdate(buildTaskUpdateData(currentTasks, normalizedTasks))
    }

    fun moveTaskBy(taskId: String, delta: Int): Boolean {
        val ordered = displayTasks.toMutableList()
        val index = ordered.indexOfFirst { it.id == taskId }
        val target = index + delta
        if (index < 0 || target < 0 || target > ordered.lastIndex ||
            !canReorderTasks(ordered[index], ordered[target], autoSort)
        ) return false
        val item = ordered.removeAt(index)
        ordered.add(target, item)
        commitTaskOrder(ordered.map { it.id })
        return true
    }

    fun toggleCompletion(task: TaskSummary) {
        logTaskUpdate(fields = "completed")
        haptic.performHapticFeedback(
            if (task.completed) HapticFeedbackType.ToggleOff else HapticFeedbackType.ToggleOn
        )
        performTaskMutation(
            buildNextTasks = { currentTasks ->
                currentTasks.map { current ->
                    if (current.id == task.id) current.copy(completed = !current.completed) else current
                }
            }
        )
    }

    fun commitEdit(task: TaskSummary, text: String) {
        if (editingTaskId != task.id) return
        val trimmed = text.trim()
        val resolved = resolveTaskInput(text, t, task)
        val textChanged = resolved.text != task.text
        val dateChanged = (resolved.date ?: task.date) != task.date
        val pinnedChanged = resolved.pinnedChanged
        editingTaskId = null
        if (!(trimmed.isEmpty() && !dateChanged) && (textChanged || dateChanged || pinnedChanged)) {
            val changedFields = listOfNotNull(
                if (textChanged) "text" else null,
                if (dateChanged) "date" else null,
                if (pinnedChanged) "pinned" else null,
            ).joinToString(",")
            logTaskUpdate(fields = changedFields)
            performTaskMutation(
                buildNextTasks = { currentTasks ->
                    currentTasks.map { current ->
                        if (current.id == task.id) {
                            current.copy(
                                text = resolved.text,
                                date = resolved.date ?: current.date,
                                pinned = if (pinnedChanged) true else current.pinned
                            )
                        } else current
                    }
                },
                additionalUpdates = if (textChanged) {
                    mapOf("history" to buildHistory(resolved.text, taskList.history, task.text))
                } else emptyMap()
            )
        }
    }

    fun startTaskEditing(task: TaskSummary) {
        val previousTaskId = editingTaskId
        if (previousTaskId != null && previousTaskId != task.id) {
            displayTasks.firstOrNull { it.id == previousTaskId }?.let { previousTask ->
                commitEdit(previousTask, editingTextFieldValue.text)
            }
        }
        editingTaskId = task.id
        editingTextFieldValue = TextFieldValue(
            text = task.text,
            selection = TextRange(task.text.length)
        )
    }

    fun finishTaskEditing(task: TaskSummary, focusManager: FocusManager) {
        commitEdit(task, editingTextFieldValue.text)
        focusManager.clearFocus(force = true)
    }

    fun moveInlineCaretLeft() {
        val selection = editingTextFieldValue.selection
        val next = if (selection.collapsed) {
            (selection.start - 1).coerceAtLeast(0)
        } else {
            selection.min
        }
        editingTextFieldValue = editingTextFieldValue.copy(selection = TextRange(next))
    }

    fun moveInlineCaretRight() {
        val textLength = editingTextFieldValue.text.length
        val selection = editingTextFieldValue.selection
        val next = if (selection.collapsed) {
            (selection.end + 1).coerceAtMost(textLength)
        } else {
            selection.max
        }
        editingTextFieldValue = editingTextFieldValue.copy(selection = TextRange(next))
    }

    fun commitDate(task: TaskSummary, dateStr: String) {
        logTaskUpdate(fields = "date")
        performTaskMutation(
            buildNextTasks = { currentTasks ->
                currentTasks.map { current ->
                    if (current.id == task.id) current.copy(date = dateStr) else current
                }
            }
        )
    }

    fun togglePinned(task: TaskSummary) {
        logTaskUpdate(fields = "pinned")
        haptic.performHapticFeedback(
            if (task.pinned) HapticFeedbackType.ToggleOff else HapticFeedbackType.ToggleOn
        )
        performTaskMutation(
            buildNextTasks = { currentTasks ->
                val currentTask = currentTasks.firstOrNull { it.id == task.id } ?: task
                val nextPinned = !currentTask.pinned
                currentTasks.map { current ->
                    if (current.id == task.id) current.copy(pinned = nextPinned) else current
                }
            }
        )
    }

    fun sortTasks() {
        logTaskSort()
        val sorted = getAutoSortedTasks(displayTasks)
        setPendingTasks(sorted)
        persistTaskListUpdate(buildTaskUpdateData(displayTasks, sorted))
    }

    fun deleteCompletedTasks() {
        if (exitingTaskIds.isNotEmpty()) return
        val completed = displayTasks.filter { it.completed }
        if (completed.isEmpty()) return
        logTaskDeleteCompleted(count = completed.size)
        haptic.performHapticFeedback(HapticFeedbackType.Reject)
        val previousTasks = displayTasks
        val completedIds = completed.mapTo(mutableSetOf()) { it.id }
        fun commitDeletion() {
            val remaining = previousTasks.filter { !completedIds.contains(it.id) }
            val normalizedTasks = normalizeTasks(remaining, autoSort)
            setPendingTasks(normalizedTasks)
            exitingTaskIds = emptySet()
            persistTaskListUpdate(
                buildTaskUpdateData(previousTasks, normalizedTasks, completedIds.toList())
            )
        }
        if (reduceMotion) {
            commitDeletion()
            return
        }
        exitingTaskIds = completedIds
        scope.launch {
            delay(120L)
            if (exitingTaskIds == completedIds) {
                commitDeletion()
            }
        }
    }

    fun removeTaskList() {
        if (removingList) return
        removingList = true
        removeListError = null
        scope.launch {
            try {
                val user = Firebase.auth.currentUser ?: return@launch
                val uid = user.uid
                val taskListId = taskList.id
                val taskListOrderRef = db.collection("taskListOrder").document(uid)
                val taskListRef = db.collection("taskLists").document(taskListId)
                val taskListOrderSnapshot = taskListOrderRef.get().await()
                if (!taskListOrderSnapshot.exists() || !taskListOrderSnapshot.contains(taskListId)) {
                    return@launch
                }
                val taskListSnapshot = taskListRef.get().await()
                if (!taskListSnapshot.exists()) {
                    return@launch
                }

                removeTaskListMembership(db, taskListOrderRef, taskListId, taskListSnapshot)
                showRemoveListConfirm = false
                showEditDialog = false
            } catch (_: Exception) {
                showRemoveListConfirm = false
                removeListError = t.t("common.error")
            } finally {
                removingList = false
            }
        }
    }


    fun addTask() {
        val trimmed = newTaskText.trim()
        if (trimmed.isEmpty()) return
        val parsed = resolveTaskInput(trimmed, t)
        if (!hasTaskContent(parsed.text, parsed.date.orEmpty(), parsed.pinned)) return
        logTaskAdd(hasDate = !parsed.date.isNullOrEmpty())
        haptic.performHapticFeedback(HapticFeedbackType.Confirm)
        newTaskText = ""
        val taskId = java.util.UUID.randomUUID().toString()
        val tasks = displayTasks
        val order = if (taskInsertPosition == "top")
            (tasks.firstOrNull()?.order ?: 1.0) - 1.0
        else
            (tasks.lastOrNull()?.order ?: 0.0) + 1.0
        val insertedTask = TaskSummary(
            id = taskId,
            text = parsed.text,
            completed = false,
            date = parsed.date ?: "",
            order = order,
            pinned = parsed.pinned
        )
        performTaskMutation(
            buildNextTasks = { currentTasks ->
                if (taskInsertPosition == "top") {
                    listOf(insertedTask) + currentTasks
                } else {
                    currentTasks + insertedTask
                }
            },
            additionalUpdates = mapOf("history" to buildHistory(parsed.text, taskList.history))
        )
    }
    LaunchedEffect(draggingTaskId) {
        if (draggingTaskId == null) return@LaunchedEffect
        while (draggingTaskId != null) {
            if (taskAutoScrollSpeed != 0f) {
                val scrolled = lazyListState.scrollBy(taskAutoScrollSpeed)
                if (scrolled != 0f) {
                    taskDragOffset += scrolled
                    taskItemHeights = lazyListState.layoutInfo.visibleItemsInfo
                        .filter { it.key is String }
                        .associate { (it.key as String) to it.size.toFloat() }
                    checkTaskSwap()
                }
            }
            delay(16L)
        }
    }

    LazyColumn(
        state = lazyListState,
        modifier = Modifier
            .fillMaxSize()
            .onGloballyPositioned { coordinates ->
                taskListCoordinates = coordinates
            }
            .pointerInput(Unit) {
                awaitPointerEventScope {
                    var downPosition: Offset? = null
                    var isTapCandidate = false
                    while (true) {
                        val event = awaitPointerEvent(PointerEventPass.Final)
                        val change = event.changes.firstOrNull() ?: continue
                        when {
                            change.changedToDownIgnoreConsumed() -> {
                                downPosition = change.position
                                isTapCandidate = true
                            }
                            change.changedToUpIgnoreConsumed() -> {
                                val startPosition = downPosition
                                if (startPosition != null && isTapCandidate && currentNewTaskInputFocus.value) {
                                    val tapInRoot = currentTaskListCoordinates.value?.localToRoot(change.position)
                                    val inputBounds = currentNewTaskInputBounds.value
                                    if (tapInRoot != null && (inputBounds == null || !inputBounds.contains(tapInRoot))) {
                                        currentFocusManager.value.clearFocus(force = true)
                                    }
                                }
                                downPosition = null
                                isTapCandidate = false
                            }
                            downPosition != null &&
                                (change.position - downPosition).getDistance() > viewConfiguration.touchSlop -> {
                                isTapCandidate = false
                            }
                        }
                    }
                }
            },
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = 16.dp,
            top = topInset,
            end = 16.dp,
            bottom = 16.dp
        )
    ) {
        item(key = "taskListHeader", contentType = "header") {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    taskList.name,
                    style = titleTextStyle,
                    modifier = Modifier
                        .weight(1f)
                        .semantics { heading() }
                )
                Row(
                    modifier = Modifier.bleed(end = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (allowTaskEditing) {
                        AppIconButton(
                            icon = Icons.Outlined.Edit,
                            contentDescription = t.t("taskList.editDetails"),
                            onClick = { editName = taskList.name; editBackground = taskList.background; removeListError = null; showEditDialog = true },
                            iconSize = AppIconMetrics.headerActionIconSize
                        )
                    }
                    if (allowShareCodeManagement) {
                        AppIconButton(
                            icon = Icons.Default.Share,
                            contentDescription = t.t("taskList.share"),
                            onClick = {
                                currentShareCode = normalizedShareCode(taskList.shareCode)
                                shareCopySuccess = false
                                shareError = null
                                showShareDialog = true
                            },
                            iconSize = AppIconMetrics.headerActionIconSize
                        )
                    }
                }
            }
        }
        taskMutationError?.let { message ->
            item(key = "taskMutationError", contentType = "error") {
                Text(
                    message,
                    color = MaterialTheme.colorScheme.error,
                    style = AppBodySmallTextStyle,
                    modifier = Modifier.padding(top = TaskListDetailMetrics.sectionSpacing)
                )
            }
        }
        if (allowTaskEditing) {
            item(key = "taskListInput", contentType = "input") {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = TaskListDetailMetrics.sectionSpacing)
                    .onGloballyPositioned { coordinates ->
                        newTaskInputBoundsInRoot = coordinates.boundsInRoot()
                        newTaskInputWidthPx = coordinates.size.width
                    }
            ) {
                val inputShape = RoundedCornerShape(TaskListDetailMetrics.inputCornerRadius)
                val canAddTask = newTaskText.trim().isNotEmpty()
                val addActionAlpha by animateFloatAsState(
                    targetValue = if (canAddTask) 1f else 0f,
                    animationSpec = if (reduceMotion) snap() else tween(durationMillis = 150),
                    label = "addActionAlpha"
                )
                BasicTextField(
                    value = newTaskText,
                    onValueChange = { newTaskText = it },
                    textStyle = inputTextStyle.copy(
                        color = MaterialTheme.colorScheme.onSurface
                    ),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { addTask() }),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.onSurface),
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(newTaskFocusRequester)
                        .onFocusChanged { state ->
                            isNewTaskInputFocused = state.isFocused
                        }
                        .background(inputBackgroundColor, inputShape)
                        .border(
                            width = 1.dp,
                            color = if (isNewTaskInputFocused) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.outlineVariant,
                            shape = inputShape
                        )
                        .heightIn(min = TaskListDetailMetrics.inputMinHeight)
                        .padding(
                            start = TaskListDetailMetrics.inputHorizontalPadding,
                            end = TaskListDetailMetrics.inputActionSize,
                            top = TaskListDetailMetrics.inputVerticalPadding,
                            bottom = TaskListDetailMetrics.inputVerticalPadding
                        ),
                    decorationBox = { innerTextField ->
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = TaskListDetailMetrics.inputMinHeight - (TaskListDetailMetrics.inputVerticalPadding * 2)),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            if (newTaskText.isEmpty()) {
                                Text(
                                    t.t("pages.tasklist.addTaskPlaceholder"),
                                    style = inputTextStyle,
                                    color = if (isAppDarkTheme()) AppGray.g500 else AppGray.g400,
                                    maxLines = 1
                                )
                            }
                            innerTextField()
                        }
                    }
                )
                AppIconButton(
                    icon = Icons.AutoMirrored.Filled.Send,
                    contentDescription = t.t("common.add"),
                    onClick = {
                        addTask()
                        newTaskFocusRequester.requestFocus()
                    },
                    enabled = canAddTask,
                    iconSize = AppIconMetrics.compactActionIconSize,
                    tint = MaterialTheme.colorScheme.onSurface,
                    size = TaskListDetailMetrics.inputActionSize,
                    modifier = Modifier
                        .align(Alignment.CenterEnd)
                        .padding(end = 2.dp)
                        .alpha(addActionAlpha)
                )
                DropdownMenu(
                    expanded = isNewTaskInputFocused && historyOptions.isNotEmpty(),
                    onDismissRequest = { focusManager.clearFocus(force = true) },
                    offset = DpOffset(0.dp, 4.dp),
                    properties = PopupProperties(focusable = false, dismissOnClickOutside = false),
                    shape = RoundedCornerShape(12.dp),
                    containerColor = MaterialTheme.colorScheme.surfaceContainer,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier
                        .width(with(density) { newTaskInputWidthPx.toDp() })
                        .heightIn(max = 220.dp)
                ) {
                    historyOptions.forEach { option ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = option,
                                    style = AppBodySmallTextStyle,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            },
                            onClick = {
                                newTaskText = option
                                addTask()
                                newTaskFocusRequester.requestFocus()
                            }
                        )
                    }
                }
            }
            }
        }
        if (allowTaskEditing) {
            item(key = "taskListActions", contentType = "actions") {
                val toolbarColor = mutedTextColor()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(
                            top = TaskListDetailMetrics.toolbarTopSpacing,
                            bottom = TaskListDetailMetrics.toolbarBottomSpacing
                        ),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier
                            .heightIn(min = 44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .clickable(enabled = canSort, role = Role.Button) { sortTasks() }
                            .alpha(if (canSort) 1f else 0.5f),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(Modifier.size(24.dp), contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.AutoMirrored.Filled.Sort,
                                contentDescription = null,
                                modifier = Modifier.size(AppIconMetrics.compactActionIconSize),
                                tint = toolbarColor
                            )
                        }
                        Text(
                            t.t("pages.tasklist.sort"),
                            style = AppRowTextStyle,
                            color = toolbarColor
                        )
                    }
                    Row(
                        modifier = Modifier
                            .heightIn(min = 44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .clickable(enabled = hasCompletedTasks, role = Role.Button) { showDeleteCompletedConfirm = true }
                            .alpha(if (hasCompletedTasks) 1f else 0.5f),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            t.t("pages.tasklist.deleteCompleted"),
                            style = AppRowTextStyle,
                            color = toolbarColor
                        )
                        Box(Modifier.size(24.dp), contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Outlined.Delete,
                                contentDescription = null,
                                modifier = Modifier.size(AppIconMetrics.compactActionIconSize),
                                tint = toolbarColor
                            )
                        }
                    }
                }
            }
        }
        if (displayTasks.isEmpty()) {
            item(key = "emptyState", contentType = "emptyState") {
                Text(
                    t.t("pages.tasklist.noTasks"),
                    style = AppFieldTextStyle,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                )
            }
        } else {
            itemsIndexed(
                items = displayTasks,
                key = { _, task -> task.id },
                contentType = { _, _ -> "task" }
            ) { index, task ->
                val isEditing = editingTaskId == task.id
                val isDragged = draggingTaskId == task.id
                TaskListRow(
                    modifier = if (!isDragged && !reduceMotion) {
                        Modifier.animateItem(
                            fadeInSpec = tween(durationMillis = 240),
                            placementSpec = spring(
                                dampingRatio = Spring.DampingRatioNoBouncy,
                                stiffness = Spring.StiffnessMedium
                            ),
                            fadeOutSpec = tween(durationMillis = 120)
                        )
                    } else {
                        Modifier
                    },
                    task = task,
                    isEditing = isEditing,
                    isDragged = isDragged,
                    isExiting = exitingTaskIds.contains(task.id),
                    allowTaskEditing = allowTaskEditing,
                    reduceMotion = reduceMotion,
                    taskDragOffset = taskDragOffset,
                    languageTag = languageTag,
                    taskTextStyle = taskTextStyle,
                    taskDateTextStyle = taskDateTextStyle,
                    editingTextFieldValue = editingTextFieldValue,
                    onEditingTextFieldValueChange = { editingTextFieldValue = it },
                    onTaskClick = { startTaskEditing(task) },
                    onToggleCompletion = { toggleCompletion(task) },
                    onShowActions = {
                        actionSheetState = ActionSheetState(
                            taskId = task.id
                        )
                    },
                    onDragStart = {
                        haptic.performHapticFeedback(HapticFeedbackType.GestureThresholdActivate)
                        draggingTaskId = task.id
                        dragOrderedTasks = displayTasks
                        dragStartTaskIds = displayTasks.map { it.id }
                        taskItemHeights = lazyListState.layoutInfo.visibleItemsInfo
                            .filter { info -> info.key is String }
                            .associate { (it.key as String) to it.size.toFloat() }
                        taskDragOffset = 0f
                    },
                    onDragEnd = {
                        taskAutoScrollSpeed = 0f
                        val ordered = dragOrderedTasks
                        if (ordered != null && ordered.map { it.id } != dragStartTaskIds) {
                            commitTaskOrder(ordered.map { it.id })
                        }
                        dragOrderedTasks = null
                        dragStartTaskIds = emptyList()
                        draggingTaskId = null
                        taskDragOffset = 0f
                    },
                    onDragCancel = {
                        taskAutoScrollSpeed = 0f
                        draggingTaskId = null
                        dragOrderedTasks = null
                        dragStartTaskIds = emptyList()
                        taskDragOffset = 0f
                    },
                    onMoveUp = if (
                        index > 0 && canReorderTasks(task, displayTasks[index - 1], autoSort)
                    ) ({ moveTaskBy(task.id, -1) }) else null,
                    onMoveDown = if (
                        index < displayTasks.lastIndex && canReorderTasks(task, displayTasks[index + 1], autoSort)
                    ) ({ moveTaskBy(task.id, 1) }) else null,
                    onDrag = { change, dragAmount ->
                        change.consume()
                        taskDragOffset += dragAmount.y
                        checkTaskSwap()

                        val viewportHeight = lazyListState.layoutInfo.viewportSize.height.toFloat()
                        val edgeZone = with(taskDensity) { 80.dp.toPx() }
                        val maxSpeed = with(taskDensity) { 8.dp.toPx() }
                        val draggedItemInfo = lazyListState.layoutInfo.visibleItemsInfo
                            .firstOrNull { it.key == draggingTaskId }
                        val fingerInViewport = if (draggedItemInfo != null) {
                            draggedItemInfo.offset + draggedItemInfo.size / 2 + taskDragOffset
                        } else {
                            viewportHeight / 2
                        }
                        taskAutoScrollSpeed = dragAutoScrollSpeed(
                            fingerInViewport,
                            viewportHeight,
                            edgeZone,
                            maxSpeed,
                            lazyListState.canScrollBackward,
                            lazyListState.canScrollForward
                        )
                    },
                    completeInlineEdit = { finishTaskEditing(task, focusManager) },
                    moveInlineCaretLeft = ::moveInlineCaretLeft,
                    moveInlineCaretRight = ::moveInlineCaretRight,
                    onInlineEditBlur = { commitEdit(task, editingTextFieldValue.text) }
                )
            }
        }
    }

    LaunchedEffect(shareCopySuccess) {
        if (!shareCopySuccess) return@LaunchedEffect
        delay(2_000)
        shareCopySuccess = false
    }

    if (showEditDialog) {
        AppDialog(
            onDismissRequest = {
                if (!removingList) {
                    showEditDialog = false
                }
            },
            title = t.t("taskList.editTitle"),
            footerStart = if (allowTaskListDeletion) {
                {
                    AppButton(
                        if (removingList) t.t("common.deleting") else t.t("taskList.deleteList"),
                        onClick = { showRemoveListConfirm = true },
                        style = AppButtonStyle.Danger,
                        enabled = !removingList
                    )
                }
            } else {
                null
            },
            footer = {
                AppButton(
                    t.t("common.cancel"),
                    onClick = { showEditDialog = false },
                    style = AppButtonStyle.Secondary,
                    enabled = !removingList
                )
                AppButton(
                    t.t("taskList.save"),
                    onClick = {
                        val trimmed = editName.trim()
                        if (trimmed.isNotEmpty()) {
                            val updates = mutableMapOf<String, Any?>("updatedAt" to nowMillis())
                            if (trimmed != taskList.name) updates["name"] = trimmed
                            if (editBackground != taskList.background) updates["background"] = editBackground
                            if (updates.size > 1) {
                                scope.launch {
                                    try {
                                        removeListError = null
                                        db.collection("taskLists").document(taskList.id).update(
                                            updates.toMap()
                                        ).await()
                                        showEditDialog = false
                                    } catch (e: Exception) {
                                        removeListError = t.t("common.error")
                                        recordNonFatalException("task_list_update", e)
                                    }
                                }
                            } else {
                                showEditDialog = false
                            }
                        }
                    },
                    enabled = editName.trim().isNotEmpty() && !removingList
                )
            }
        ) {
            Column(
                modifier = Modifier.padding(top = 20.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                removeListError?.let { error ->
                    Text(error, color = MaterialTheme.colorScheme.error, style = AppBodySmallTextStyle)
                }
                AppDialogField(t.t("app.taskListName")) {
                    AppTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        placeholder = t.t("app.taskListNamePlaceholder"),
                        enabled = !removingList
                    )
                }
                AppColorPicker(
                    selected = editBackground,
                    enabled = !removingList
                ) { editBackground = it }
            }
        }
    }

    if (showRemoveListConfirm) {
        AppConfirmDialog(
            title = t.t("taskList.deleteListConfirm.title"),
            message = t.t("taskList.deleteListConfirm.message"),
            confirmLabel = if (removingList) t.t("common.deleting") else t.t("auth.button.delete"),
            cancelLabel = t.t("common.cancel"),
            destructive = true,
            enabled = !removingList,
            onConfirm = { removeTaskList() },
            onDismiss = { showRemoveListConfirm = false }
        )
    }

    if (showDeleteCompletedConfirm) {
        AppConfirmDialog(
            title = t.t("pages.tasklist.deleteCompletedConfirmTitle"),
            message = null,
            confirmLabel = t.t("auth.button.delete"),
            cancelLabel = t.t("common.cancel"),
            destructive = true,
            onConfirm = {
                deleteCompletedTasks()
                showDeleteCompletedConfirm = false
            },
            onDismiss = { showDeleteCompletedConfirm = false }
        )
    }

    if (showShareDialog) {
        val clipboard = LocalClipboard.current
        val code = currentShareCode
        AppDialog(
            onDismissRequest = { showShareDialog = false },
            title = t.t("taskList.shareTitle"),
            description = t.t("taskList.shareDescription"),
            footerStart = if (code != null) {
                {
                    AppButton(
                        if (removingShareCode) t.t("common.deleting") else t.t("taskList.removeShare"),
                        onClick = {
                            scope.launch {
                                removingShareCode = true
                                shareError = null
                                try {
                                    removeShareCode(taskList.id)
                                    logShareCodeRemove()
                                    currentShareCode = null
                                } catch (e: Exception) {
                                    shareError = t.t("common.error")
                                } finally {
                                    removingShareCode = false
                                }
                            }
                        },
                        style = AppButtonStyle.Danger,
                        enabled = !removingShareCode
                    )
                }
            } else {
                null
            },
            footer = {
                AppButton(
                    t.t("common.close"),
                    onClick = { showShareDialog = false },
                    style = AppButtonStyle.Secondary
                )
                if (code == null) {
                    AppButton(
                        if (generatingShareCode) t.t("common.loading") else t.t("taskList.generateShare"),
                        onClick = {
                            scope.launch {
                                generatingShareCode = true
                                shareError = null
                                try {
                                    val generatedCode = generateShareCode(taskList.id)
                                    logShareCodeGenerate()
                                    currentShareCode = generatedCode
                                } catch (e: Exception) {
                                    shareError = t.t("common.error")
                                } finally {
                                    generatingShareCode = false
                                }
                            }
                        },
                        enabled = !generatingShareCode
                    )
                }
            }
        ) {
            shareError?.let { error ->
                Text(
                    error,
                    color = MaterialTheme.colorScheme.error,
                    style = AppBodySmallTextStyle,
                    modifier = Modifier.padding(top = 16.dp)
                )
            }
            if (code != null) {
                Column(
                    modifier = Modifier.padding(top = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AppFieldLabel(t.t("taskList.shareCode"))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        AppTextField(
                            value = code,
                            onValueChange = {},
                            readOnly = true,
                            monospace = true,
                            modifier = Modifier.weight(1f)
                        )
                        AppButton(
                            if (shareCopySuccess) t.t("common.copied") else t.t("common.copy"),
                            onClick = {
                                scope.launch {
                                    clipboard.setClipEntry(
                                        ClipEntry(ClipData.newPlainText("share_code", shareCodeUrl(code)))
                                    )
                                    shareCopySuccess = true
                                }
                            },
                            style = AppButtonStyle.Secondary
                        )
                    }
                }
            }
        }
    }

    actionSheetState?.let { actionState ->
        val task = displayTasks.firstOrNull { it.id == actionState.taskId }
        if (task == null) {
            LaunchedEffect(actionState.taskId) {
                actionSheetState = null
            }
        } else {
            key(task.id) {
                var sheetMonth by remember(task.id) {
                    mutableStateOf(CalendarMonth.fromDateKey(task.date) ?: CalendarMonth.current())
                }
                AppSheet(
                    onDismissRequest = { actionSheetState = null },
                    paneTitle = t.t("pages.tasklist.setDate")
                ) {
                    AppSheetHeader(
                        title = task.text.trim().ifEmpty { t.t("pages.tasklist.setDate") },
                        onClose = { actionSheetState = null }
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        AppButton(
                            t.t("pages.tasklist.clearDate"),
                            onClick = {
                                if (task.date.isBlank()) return@AppButton
                                commitDate(task, "")
                                actionSheetState = null
                            },
                            style = AppButtonStyle.Ghost,
                            enabled = task.date.isNotBlank(),
                            modifier = Modifier.bleed(start = 12.dp)
                        )
                        Spacer(Modifier.weight(1f))
                        AppPinToggleButton(
                            pinned = task.pinned,
                            onToggle = {
                                togglePinned(task)
                                actionSheetState = null
                            }
                        )
                    }
                    Column(
                        modifier = Modifier
                            .weight(1f, fill = false)
                            .verticalScroll(rememberScrollState())
                    ) {
                        AppSheetCalendarSurface {
                            AppMonthCalendar(
                                month = sheetMonth,
                                onMonthChange = { sheetMonth = it },
                                selectedDateKey = task.date.takeIf { it.isNotBlank() },
                                onSelectDate = { dateKey ->
                                    val nextDate = dateKey.orEmpty()
                                    if (nextDate != task.date) {
                                        commitDate(task, nextDate)
                                    }
                                    actionSheetState = null
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

private val supportedLanguages = listOf(
    "ja" to "日本語", "en" to "English", "es" to "Español",
    "de" to "Deutsch", "fr" to "Français", "ko" to "한국어",
    "zh-CN" to "中文(简体)", "hi" to "हिन्दी", "ar" to "العربية",
    "pt-BR" to "Português (Brasil)", "id" to "Bahasa Indonesia"
)

@Composable
private fun SettingsSectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Text(
            title,
            style = TextStyle(
                fontFamily = GenInterfaceJPBodyFontFamily,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                lineHeight = 20.sp
            ),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier
                .padding(bottom = 4.dp)
                .semantics { heading() }
        )
        content()
    }
}

@Composable
private fun SettingsDivider() {
    HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
}

@Composable
private fun SettingsRow(
    enabled: Boolean = true,
    onClick: (() -> Unit)? = null,
    content: @Composable RowScope.() -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .then(
                if (onClick != null) {
                    Modifier.clickable(enabled = enabled, role = Role.Button, onClick = onClick)
                } else {
                    Modifier
                }
            )
            .alpha(if (enabled) 1f else 0.6f),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        content = content
    )
}

@Composable
private fun SettingsSelectRow(
    label: String,
    value: String,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    SettingsRow(enabled = enabled, onClick = onClick) {
        Text(
            label,
            style = AppRowTextStyle,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                value,
                style = AppRowTextStyle,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Icon(
                Icons.Default.KeyboardArrowDown,
                contentDescription = null,
                modifier = Modifier.size(AppIconMetrics.compactActionIconSize),
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
            )
        }
    }
}

@Composable
private fun SettingsNavigationRow(
    label: String,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    SettingsRow(enabled = enabled, onClick = onClick) {
        Text(
            label,
            style = AppRowTextStyle,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f)
        )
        Icon(
            Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            modifier = Modifier.size(AppIconMetrics.compactActionIconSize),
            tint = mutedIconColor()
        )
    }
}

@Composable
private fun SettingsActionRow(
    label: String,
    enabled: Boolean,
    color: Color = MaterialTheme.colorScheme.onSurface,
    onClick: () -> Unit
) {
    SettingsRow(enabled = enabled, onClick = onClick) {
        Text(label, style = AppRowTextStyle, color = color)
    }
}

@Composable
private fun SettingsOptionDialog(
    title: String,
    options: List<Pair<String, String>>,
    selected: String,
    enabled: Boolean = true,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val t = LocalTranslations.current
    AppDialog(
        onDismissRequest = onDismiss,
        title = title,
        footer = {
            AppButton(t.t("common.cancel"), onDismiss, style = AppButtonStyle.Secondary)
        }
    ) {
        Column(modifier = Modifier.padding(top = 12.dp)) {
            options.forEachIndexed { index, (option, label) ->
                if (index > 0) SettingsDivider()
                SettingsRow(
                    enabled = enabled,
                    onClick = {
                        onSelect(option)
                        onDismiss()
                    }
                ) {
                    Text(
                        label,
                        style = AppRowTextStyle.copy(
                            fontWeight = if (selected == option) FontWeight.SemiBold else FontWeight.Medium
                        ),
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )
                    if (selected == option) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = t.t("common.selected"),
                            modifier = Modifier.size(AppIconMetrics.compactActionIconSize)
                        )
                    }
                }
            }
        }
    }
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun SettingsView(
    navController: NavController? = null,
    showTopBar: Boolean = true,
    externalSettingsState: SettingsState? = null
) {
    val t = LocalTranslations.current
    val context = LocalContext.current
    val userId = Firebase.auth.currentUser?.uid
    val uiState = resolvedSettingsState(
        userId,
        externalSettingsState ?: rememberSettingsState(userId)
    )
    val scope = rememberCoroutineScope()
    var showSignOutDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showThemeDialog by remember { mutableStateOf(false) }
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showPositionDialog by remember { mutableStateOf(false) }
    var showStartupViewDialog by remember { mutableStateOf(false) }
    var showEmailChangeDialog by remember { mutableStateOf(false) }
    var showBundledLicensesSheet by remember { mutableStateOf(false) }
    var newEmail by remember { mutableStateOf("") }
    var emailChangeError by remember { mutableStateOf<String?>(null) }
    var emailChangeSuccess by remember { mutableStateOf(false) }
    var isChangingEmail by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isDeletingAccount by remember { mutableStateOf(false) }
    var isSigningOut by remember { mutableStateOf(false) }
    var isUpdatingSettings by remember { mutableStateOf(false) }
    val manualLicenses = remember(context) { loadManualLicenses(context) }

    fun updateSettings(
        partial: Map<String, Any>,
        onSuccess: () -> Unit = {},
        onFailure: () -> Unit = {}
    ) {
        if (userId == null || isUpdatingSettings) return
        isUpdatingSettings = true
        errorMessage = null
        scope.launch {
            try {
                Firebase.firestore.collection("settings").document(userId)
                    .set(partial + mapOf("updatedAt" to nowMillis()), SetOptions.merge())
                    .await()
                onSuccess()
            } catch (_: Exception) {
                errorMessage = t.t("common.error")
                onFailure()
            } finally {
                isUpdatingSettings = false
            }
        }
    }

    fun updateAutoSort(enabled: Boolean) {
        val uid = userId ?: return
        if (isUpdatingSettings) return
        autoSortOverrides[uid] = enabled
        logSettingsAutoSortChange(enabled = enabled)
        updateSettings(
            mapOf("autoSort" to enabled),
            onFailure = { autoSortOverrides.remove(uid) }
        )
    }

    fun closeEmailChange() {
        showEmailChangeDialog = false
        newEmail = ""
        emailChangeError = null
        emailChangeSuccess = false
    }

    fun submitEmailChange() {
        if (isChangingEmail || newEmail.isBlank()) return
        isChangingEmail = true
        emailChangeError = null
        scope.launch {
            try {
                val user = Firebase.auth.currentUser ?: return@launch
                user.verifyBeforeUpdateEmail(newEmail).await()
                logEmailChangeRequested()
                emailChangeSuccess = true
                newEmail = ""
            } catch (e: Exception) {
                emailChangeError = resolveAuthErrorMessage(t, e)
            } finally {
                isChangingEmail = false
            }
        }
    }

    DetailScreenScaffold(
        title = t.t("settings.title"),
        onBack = if (navController != null) ({ navController.navigateUp() }) else null,
        showTopBar = showTopBar,
        topBarHeight = 56.dp,
        backgroundColor = MaterialTheme.colorScheme.surfaceDim
    ) {
        Column(
            Modifier
                .widthIn(max = 640.dp)
                .fillMaxWidth()
                .align(Alignment.CenterHorizontally)
                .verticalScroll(rememberScrollState())
                .padding(
                    start = if (showTopBar) 16.dp else 24.dp,
                    end = if (showTopBar) 16.dp else 24.dp,
                    top = if (showTopBar) 8.dp else 40.dp,
                    bottom = 40.dp
                ),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (!showTopBar) {
                Box(modifier = Modifier.heightIn(min = 48.dp), contentAlignment = Alignment.CenterStart) {
                    Text(
                        t.t("settings.title"),
                        style = AppPageTitleTextStyle,
                        modifier = Modifier.semantics { heading() }
                    )
                }
            }
            if (uiState.isLoading) {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(
                        color = mutedTextColor(),
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(24.dp)
                    )
                }
            } else {
                if (uiState.hasError) {
                    Text(
                        t.t("app.loadError"),
                        color = MaterialTheme.colorScheme.error,
                        style = AppBodySmallTextStyle
                    )
                }
                errorMessage?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = AppBodySmallTextStyle)
                }
                SettingsSectionCard(title = t.t("settings.userInfo.title")) {
                    SettingsRow {
                        Text(
                            uiState.userEmail,
                            style = AppRowTextStyle,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    SettingsDivider()
                    if (!showEmailChangeDialog) {
                        SettingsNavigationRow(label = t.t("settings.emailChange.title")) {
                            showEmailChangeDialog = true
                        }
                    } else {
                        Column(
                            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            if (emailChangeSuccess) {
                                Text(
                                    t.t("settings.emailChange.successMessage"),
                                    style = AppBodySmallTextStyle,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(MaterialTheme.colorScheme.surfaceDim)
                                        .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))
                                        .padding(horizontal = 12.dp, vertical = 8.dp)
                                )
                                AppButton(
                                    t.t("common.close"),
                                    onClick = { closeEmailChange() },
                                    style = AppButtonStyle.Ghost,
                                    modifier = Modifier.align(Alignment.CenterHorizontally)
                                )
                            } else {
                                emailChangeError?.let {
                                    Text(it, color = MaterialTheme.colorScheme.error, style = AppBodySmallTextStyle)
                                }
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    AppFieldLabel(t.t("settings.emailChange.newEmailLabel"))
                                    AppTextField(
                                        value = newEmail,
                                        onValueChange = { newEmail = it },
                                        placeholder = t.t("settings.emailChange.newEmailPlaceholder"),
                                        enabled = !isChangingEmail,
                                        keyboardOptions = KeyboardOptions(
                                            keyboardType = KeyboardType.Email,
                                            imeAction = ImeAction.Done
                                        ),
                                        keyboardActions = KeyboardActions(onDone = { submitEmailChange() }),
                                        modifier = Modifier.semantics {
                                            contentType = ContentType.NewUsername + ContentType.EmailAddress
                                        }
                                    )
                                }
                                Row(
                                    modifier = Modifier.align(Alignment.End),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    AppButton(
                                        t.t("common.cancel"),
                                        onClick = { closeEmailChange() },
                                        style = AppButtonStyle.Secondary,
                                        enabled = !isChangingEmail
                                    )
                                    AppButton(
                                        if (isChangingEmail) t.t("settings.emailChange.submitting") else t.t("settings.emailChange.submitButton"),
                                        onClick = { submitEmailChange() },
                                        enabled = !isChangingEmail && newEmail.isNotBlank()
                                    )
                                }
                            }
                        }
                    }
                }
                SettingsSectionCard(title = t.t("settings.preferences.title")) {
                    SettingsSelectRow(
                        label = t.t("settings.language.title"),
                        value = supportedLanguages.firstOrNull { it.first == uiState.language }?.second ?: uiState.language,
                        enabled = !isUpdatingSettings
                    ) { showLanguageDialog = true }
                    SettingsDivider()
                    SettingsSelectRow(
                        t.t("settings.theme.title"),
                        settingsThemeLabel(t, uiState.theme),
                        enabled = !isUpdatingSettings
                    ) { showThemeDialog = true }
                    SettingsDivider()
                    SettingsSelectRow(
                        t.t("settings.startupView.title"),
                        settingsStartupViewLabel(t, uiState.startupView),
                        enabled = !isUpdatingSettings
                    ) { showStartupViewDialog = true }
                    SettingsDivider()
                    SettingsSelectRow(
                        t.t("settings.taskInsertPosition.title"),
                        settingsTaskInsertPositionLabel(t, uiState.taskInsertPosition),
                        enabled = !isUpdatingSettings
                    ) { showPositionDialog = true }
                    SettingsDivider()
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .toggleable(
                                value = uiState.autoSort,
                                enabled = !isUpdatingSettings,
                                role = Role.Switch,
                                onValueChange = ::updateAutoSort
                            )
                            .alpha(if (isUpdatingSettings) 0.5f else 1f)
                            .padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(
                            Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            Text(
                                t.t("settings.autoSort.title"),
                                style = AppRowTextStyle,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                t.t("settings.autoSort.enable"),
                                style = TextStyle(
                                    fontFamily = GenInterfaceJPBodyFontFamily,
                                    fontSize = 12.sp,
                                    lineHeight = 16.sp
                                ),
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        AppSwitch(checked = uiState.autoSort)
                    }
                }
                SettingsSectionCard(title = t.t("settings.legal.title")) {
                    SettingsNavigationRow(label = t.t("settings.licenses.openSource")) {
                        try {
                            OssLicensesMenuActivity.setActivityTitle(t.t("settings.licenses.openSource"))
                            context.startActivity(Intent(context, OssLicensesMenuActivity::class.java))
                        } catch (e: Exception) {
                            recordNonFatalException("open_source_licenses", e)
                            errorMessage = t.t("settings.licenses.loadError")
                        }
                    }
                    SettingsDivider()
                    SettingsNavigationRow(label = t.t("settings.licenses.bundledAssets")) {
                        showBundledLicensesSheet = true
                    }
                }
                SettingsSectionCard(title = t.t("settings.actions.title")) {
                    SettingsActionRow(
                        label = if (isSigningOut) t.t("settings.signingOut") else t.t("settings.danger.signOut"),
                        enabled = !isSigningOut && !isDeletingAccount,
                        onClick = { showSignOutDialog = true }
                    )
                    SettingsDivider()
                    SettingsActionRow(
                        label = if (isDeletingAccount) t.t("settings.deletingAccount") else t.t("settings.danger.deleteAccount"),
                        enabled = !isDeletingAccount && !isSigningOut,
                        color = MaterialTheme.colorScheme.error,
                        onClick = { showDeleteDialog = true }
                    )
                }
            }
        }
    }

    if (showSignOutDialog) {
        AppConfirmDialog(
            title = t.t("auth.signOutConfirm.title"),
            message = t.t("auth.signOutConfirm.message"),
            confirmLabel = t.t("auth.button.signOut"),
            cancelLabel = t.t("auth.button.cancel"),
            destructive = false,
            onConfirm = {
                showSignOutDialog = false
                isSigningOut = true
                errorMessage = null
                scope.launch {
                    try {
                        Firebase.auth.signOut()
                        logSignOut()
                    } catch (e: Exception) {
                        errorMessage = resolveAuthErrorMessage(t, e)
                    } finally {
                        isSigningOut = false
                    }
                }
            },
            onDismiss = { showSignOutDialog = false }
        )
    }

    if (showDeleteDialog) {
        var deletePassword by remember { mutableStateOf("") }
        fun deleteAccount() {
            if (deletePassword.isEmpty() || isDeletingAccount) return
            val password = deletePassword
            deletePassword = ""
            showDeleteDialog = false
            isDeletingAccount = true
            errorMessage = null
            scope.launch {
                try {
                    val user = Firebase.auth.currentUser ?: return@launch
                    val email = user.email ?: return@launch
                    user.reauthenticate(com.google.firebase.auth.EmailAuthProvider.getCredential(email, password)).await()
                    val uid = user.uid
                    val db = Firebase.firestore
                    val taskListOrderRef = db.collection("taskListOrder").document(uid)
                    val taskListOrderSnapshot = taskListOrderRef.get().await()
                    if (taskListOrderSnapshot.exists()) {
                        val taskListIds = taskListOrderSnapshot.data
                            ?.keys
                            ?.filter { it != "createdAt" && it != "updatedAt" }
                            ?: emptyList()
                        coroutineScope {
                            taskListIds.map { taskListId ->
                                async {
                                    val taskListRef = db.collection("taskLists").document(taskListId)
                                    val snap = taskListRef.get().await()
                                    if (!snap.exists()) return@async
                                    removeTaskListMembership(
                                        db,
                                        taskListOrderRef,
                                        taskListId,
                                        snap
                                    )
                                }
                            }.awaitAll()
                        }
                    }
                    db.batch().apply {
                        delete(db.collection("settings").document(uid))
                        delete(db.collection("taskListOrder").document(uid))
                    }.commit().await()
                    user.delete().await()
                    logDeleteAccount()
                } catch (e: Exception) {
                    errorMessage = resolveAuthErrorMessage(t, e)
                } finally {
                    isDeletingAccount = false
                }
            }
        }
        AppDialog(
            onDismissRequest = { if (!isDeletingAccount) showDeleteDialog = false },
            title = t.t("auth.deleteAccountConfirm.title"),
            description = t.t("auth.deleteAccountConfirm.message"),
            footer = {
                AppButton(
                    t.t("common.cancel"),
                    onClick = { showDeleteDialog = false },
                    style = AppButtonStyle.Secondary,
                    enabled = !isDeletingAccount
                )
                AppButton(
                    if (isDeletingAccount) t.t("settings.deletingAccount") else t.t("auth.button.delete"),
                    onClick = { deleteAccount() },
                    style = AppButtonStyle.Destructive,
                    enabled = deletePassword.isNotEmpty() && !isDeletingAccount
                )
            }
        ) {
            Column(
                modifier = Modifier.padding(top = 16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                AppFieldLabel(t.t("auth.form.password"))
                AppTextField(
                    value = deletePassword,
                    onValueChange = { deletePassword = it },
                    placeholder = t.t("auth.form.password"),
                    enabled = !isDeletingAccount,
                    password = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { deleteAccount() }),
                    modifier = Modifier.semantics { contentType = ContentType.Password }
                )
            }
        }
    }

    if (showThemeDialog) {
        SettingsOptionDialog(
            title = t.t("settings.theme.title"),
            options = listOf(
                "system" to t.t("settings.theme.system"),
                "light" to t.t("settings.theme.light"),
                "dark" to t.t("settings.theme.dark")
            ),
            selected = uiState.theme,
            enabled = !isUpdatingSettings,
            onSelect = { option ->
                logSettingsThemeChange(theme = option)
                updateSettings(mapOf("theme" to option))
            },
            onDismiss = { showThemeDialog = false }
        )
    }

    if (showPositionDialog) {
        SettingsOptionDialog(
            title = t.t("settings.taskInsertPosition.title"),
            options = listOf(
                "top" to t.t("settings.taskInsertPosition.top"),
                "bottom" to t.t("settings.taskInsertPosition.bottom")
            ),
            selected = uiState.taskInsertPosition,
            enabled = !isUpdatingSettings,
            onSelect = { option ->
                logSettingsTaskInsertPositionChange(position = option)
                updateSettings(mapOf("taskInsertPosition" to option))
            },
            onDismiss = { showPositionDialog = false }
        )
    }

    if (showStartupViewDialog) {
        SettingsOptionDialog(
            title = t.t("settings.startupView.title"),
            options = listOf(
                "taskList" to t.t("settings.startupView.taskList"),
                "calendar" to t.t("settings.startupView.calendar"),
                "taskLists" to t.t("settings.startupView.taskLists")
            ),
            selected = uiState.startupView,
            enabled = !isUpdatingSettings,
            onSelect = { option ->
                logSettingsStartupViewChange(view = option)
                updateSettings(mapOf("startupView" to option))
            },
            onDismiss = { showStartupViewDialog = false }
        )
    }

    if (showLanguageDialog) {
        SettingsOptionDialog(
            title = t.t("settings.language.title"),
            options = supportedLanguages,
            selected = uiState.language,
            enabled = !isUpdatingSettings,
            onSelect = { code ->
                logSettingsLanguageChange(language = code)
                updateSettings(mapOf("language" to code))
            },
            onDismiss = { showLanguageDialog = false }
        )
    }

    if (showBundledLicensesSheet) {
        AppSheet(
            onDismissRequest = { showBundledLicensesSheet = false },
            paneTitle = t.t("settings.licenses.bundledAssets")
        ) {
            AppSheetHeader(
                title = t.t("settings.licenses.bundledAssets"),
                onClose = { showBundledLicensesSheet = false }
            )
            Column(
                modifier = Modifier
                    .weight(1f, fill = false)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (manualLicenses.isEmpty()) {
                    Text(
                        t.t("settings.licenses.loadError"),
                        color = MaterialTheme.colorScheme.error,
                        style = AppBodySmallTextStyle
                    )
                } else {
                    manualLicenses.forEachIndexed { index, license ->
                        if (index > 0) SettingsDivider()
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                license.name,
                                style = AppRowTextStyle.copy(fontWeight = FontWeight.SemiBold),
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                license.license,
                                style = AppCaptionTextStyle.copy(fontWeight = FontWeight.Normal),
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            license.source?.let { source ->
                                Text(
                                    source,
                                    style = AppCaptionTextStyle.copy(fontWeight = FontWeight.Normal),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textDecoration = TextDecoration.Underline
                                )
                            }
                            Text(
                                license.text,
                                style = AppCaptionTextStyle.copy(fontWeight = FontWeight.Normal),
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        }
    }
}
