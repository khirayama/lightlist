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
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkHorizontally
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
import androidx.compose.material.icons.filled.Language
import androidx.compose.material3.Button
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Text
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.Switch
import androidx.compose.material3.TextButton
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
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
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FilterList
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
import com.google.android.gms.oss.licenses.v2.OssLicensesMenuActivity
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.analytics
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.crashlytics.FirebaseCrashlytics
import java.text.DateFormatSymbols

import org.json.JSONObject

private const val COMPLETED_TASK_ALPHA = 0.55f
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

    MaterialTheme(
        colorScheme = colorScheme,
        typography = LightlistTypography,
        content = content,
    )
}

@Composable
private fun rememberReduceMotion(): Boolean {
    val context = LocalContext.current
    return remember {
        android.provider.Settings.Global.getFloat(
            context.contentResolver,
            android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
            1f
        ) == 0f
    }
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
        db.collection("settings").document(uid).get(Source.CACHE)
        db.collection("taskListOrder").document(uid).get(Source.CACHE)
            .addOnSuccessListener { snapshot ->
                val orderedTaskListIds = parseOrderedTaskListIds(snapshot.data ?: emptyMap())
                orderedTaskListIds.chunked(10).forEach { chunk ->
                    db.collection("taskLists")
                        .whereIn(FieldPath.documentId(), chunk)
                        .get(Source.CACHE)
                }
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
    private var pendingDeepLink by mutableStateOf(parseDeepLink(intent))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        FirebaseApp.initializeApp(this)
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(appCheckProviderFactory())
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

private class TaskListMutationQueue(
    private val scope: CoroutineScope
) {
    private var tail: Job? = null
    private var pendingCount = 0

    fun enqueue(
        onIdle: () -> Unit = {},
        onError: (Exception) -> Unit = {},
        block: suspend () -> Unit
    ) {
        pendingCount += 1
        val previous = tail
        tail = scope.launch {
            try {
                previous?.join()
                block()
            } catch (error: Exception) {
                onError(error)
            } finally {
                withContext(Dispatchers.Main) {
                    pendingCount -= 1
                    if (pendingCount == 0) {
                        onIdle()
                    }
                }
            }
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
}

private data class ActionSheetState(
    val taskId: String
)

private data class TaskListSummary(
    val id: String,
    val name: String,
    val taskCount: Int,
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
    val leadingButtonIconSize = 22.dp
    val compactActionIconSize = 20.dp
    val inlineActionIconSize = 18.dp
    val dragHandleDotSize = 4.dp
    val dragHandleDotSpacing = 2.5.dp
}
private object TaskListDetailMetrics {
    val topBarHeight = 48.dp
    val indicatorContentInset = 42.dp
    val indicatorTouchSize = 24.dp
    val indicatorDotSize = 8.dp
    val headerActionIconButtonSize = 40.dp
    val headerActionIconSize = AppIconMetrics.standardActionIconSize
    val headerActionSpacing = 0.dp
    val headerActionsEndOffset = 11.dp
    val inputCornerRadius = 14.dp
    val inputHorizontalPadding = 14.dp
    val inputVerticalPadding = 10.dp
    val inputMinHeight = 44.dp
    val inputActionSpacing = 8.dp
    val addActionIconButtonSize = 40.dp
    val addActionIconSize = AppIconMetrics.standardActionIconSize
    val actionRowVerticalPadding = 4.dp
    val actionControlVerticalPadding = 4.dp
    val actionControlIconSize = 22.dp
    val actionControlIconSpacing = 6.dp
    val sectionBottomSpacing = 14.dp
    val actionsBottomSpacing = 24.dp
    val taskRowSpacing = 3.dp
    val taskRowVerticalPadding = 4.dp
    val taskContentHeight = 48.dp
    val taskTextTopPadding = 13.dp
    val taskDateTopInset = (-3).dp
    val dragHandleTopPadding = 0.dp
    val dragHandleEndPadding = 0.dp
    val dragHandleTouchWidth = 22.dp
    val completionTopPadding = 1.dp
    val completionEndPadding = 2.dp
    val completionTouchWidth = 28.dp
    val completionDotSize = 20.dp
    val taskTextStartPadding = 6.dp
    val trailingDateButtonWidth = 24.dp
    val trailingDateIconSize = AppIconMetrics.standardActionIconSize
    val trailingActionEndOffset = 3.dp
    val textLineHeight = 22.sp
    val dateLineHeight = 16.sp
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
        "autoSort" to false,
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
    val autoSort: Boolean = false,
    val startupView: String = "taskList",
    val userEmail: String = "",
    val isLoading: Boolean = true,
    val hasError: Boolean = false
)

private fun removeTaskListListeners(listeners: List<ListenerRegistration>) {
    listeners.forEach { it.remove() }
}

private fun <T> subscribeToOrderedTaskLists(
    userId: String,
    parseDocument: (String, Map<String, Any>) -> T,
    onPublish: (List<T>) -> Unit,
    onError: (() -> Unit)? = null
): () -> Unit {
    val db = Firebase.firestore
    var orderedTaskListIds = emptyList<String>()
    var taskListIdsKey = ""
    var taskListsById = emptyMap<String, T>()
    var taskListChunkListeners = emptyList<ListenerRegistration>()

    fun publish() {
        logDebugSync(
            "publish user=${shortDebugId(userId)} order=${orderedTaskListIds.size} loaded=${taskListsById.size}"
        )
        onPublish(orderedTaskListIds.mapNotNull { taskListsById[it] })
    }

    fun subscribeToTaskLists(taskListIds: List<String>) {
        val nextKey = taskListIds.sorted().joinToString("|")
        if (taskListIdsKey == nextKey) {
            logDebugSync("reuse taskList listeners count=${taskListIds.size}")
            publish()
            return
        }
        taskListIdsKey = nextKey
        logDebugSync("subscribe taskLists count=${taskListIds.size}")
        removeTaskListListeners(taskListChunkListeners)
        taskListChunkListeners = emptyList()
        taskListsById = taskListsById.filterKeys { taskListIds.contains(it) }

        if (taskListIds.isEmpty()) {
            publish()
            return
        }

        taskListChunkListeners = taskListIds.chunked(10).map { chunk ->
            db.collection("taskLists")
                .whereIn(FieldPath.documentId(), chunk)
                .addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
                    if (error != null) {
                        logDebugSync("taskLists listener error=${firestoreErrorDescription("taskLists listen", error)}")
                        onError?.invoke()
                        return@addSnapshotListener
                    }

                    logDebugSync(
                        "taskLists snapshot chunk=${chunk.size} docs=${snapshot?.documents?.size ?: 0} changes=${snapshot?.documentChanges?.size ?: 0} cache=${snapshot?.metadata?.isFromCache} pending=${snapshot?.metadata?.hasPendingWrites()}"
                    )
                    val nextTaskListsById = taskListsById
                        .filterKeys { it !in chunk }
                        .toMutableMap()
                    snapshot?.documents?.forEach { document ->
                        val data = document.data ?: return@forEach
                        scheduleMalformedTaskCleanup(
                            taskListId = document.id,
                            data = data,
                            isFromCache = document.metadata.isFromCache,
                            hasPendingWrites = document.metadata.hasPendingWrites()
                        )
                        nextTaskListsById[document.id] =
                            parseDocument(document.id, data)
                    }
                    taskListsById = nextTaskListsById
                    publish()
                }
        }
    }

    val taskListOrderListener = db.collection("taskListOrder")
        .document(userId)
        .addSnapshotListener { snapshot, error ->
            if (error != null) {
                logDebugSync("taskListOrder listener error=${firestoreErrorDescription("taskListOrder listen", error)}")
                onError?.invoke()
                return@addSnapshotListener
            }

            logDebugSync(
                "taskListOrder snapshot exists=${snapshot?.exists()} cache=${snapshot?.metadata?.isFromCache} pending=${snapshot?.metadata?.hasPendingWrites()}"
            )
            orderedTaskListIds = parseOrderedTaskListIds(snapshot?.data ?: emptyMap<String, Any>())
            subscribeToTaskLists(orderedTaskListIds)
        }

    return {
        taskListOrderListener.remove()
        removeTaskListListeners(taskListChunkListeners)
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
    var authScreen by rememberSaveable { mutableStateOf(AuthScreen.SignIn) }
    var pendingPasswordResetCode by rememberSaveable { mutableStateOf<String?>(null) }
    var pendingSharePreviewCode by rememberSaveable { mutableStateOf<String?>(null) }
    var requestedTaskListId by rememberSaveable { mutableStateOf<String?>(null) }

    DisposableEffect(Unit) {
        val listener = FirebaseAuth.AuthStateListener { auth ->
            isLoggedIn = auth.currentUser != null
            currentUserId = auth.currentUser?.uid
            com.google.firebase.crashlytics.FirebaseCrashlytics.getInstance().setUserId(auth.currentUser?.uid ?: "")
        }
        Firebase.auth.addAuthStateListener(listener)
        onDispose { Firebase.auth.removeAuthStateListener(listener) }
    }

    val settingsState = rememberSettingsState(currentUserId)
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
    CompositionLocalProvider(LocalTranslations provides translations) {
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
                        composable(AppRoute.Settings.route) { SettingsView(navController = navController) }
                    }

                    LaunchedEffect(isLoggedIn, settingsState.isLoading) {
                        if (!isLoggedIn || settingsState.isLoading) return@LaunchedEffect
                        if (navController.currentDestination?.route != AppRoute.TaskLists.route) return@LaunchedEffect
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

            if (!isLoggedIn) {
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
    val settingsState = rememberSettingsState(userId)
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
                    allowTaskListDeletion = false
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
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = t.t("common.back"),
                        modifier = Modifier.size(AppIconMetrics.leadingButtonIconSize)
                    )
                }
            }

            if (userId != null && !previewUiState.isAdded && previewUiState.taskListId != null) {
                Button(
                    onClick = {
                        scope.launch {
                            isJoining = true
                            addToOrderError = null
                            try {
                                addSharedTaskListToOrder(previewUiState.taskListId)
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
                ) {
                    Text(if (isJoining) t.t("common.loading") else t.t("pages.sharecode.addToOrder"))
                }
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
    parseDocument: (String, Map<String, Any>) -> T
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
private fun <T> rememberOrderedTaskLists(userId: String?, parseDocument: (String, Map<String, Any>) -> T): List<T> {
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
            uiState = SettingsState(isLoading = false)
            onDispose {}
        } else {
            val db = Firebase.firestore
            val email = Firebase.auth.currentUser?.email ?: ""
            val listener = db.collection("settings").document(userId)
                .addSnapshotListener { snapshot, error ->
                    if (error != null) {
                        uiState = SettingsState(userEmail = email, isLoading = false, hasError = true)
                        return@addSnapshotListener
                    }
                    val data = snapshot?.data ?: emptyMap()
                    uiState = SettingsState(
                        theme = data["theme"] as? String ?: "system",
                        language = data["language"] as? String ?: "ja",
                        taskInsertPosition = data["taskInsertPosition"] as? String ?: "top",
                        autoSort = data["autoSort"] as? Boolean ?: false,
                        startupView = normalizeStartupView(data["startupView"] as? String),
                        userEmail = email,
                        isLoading = false,
                        hasError = false
                    )
                }
            onDispose { listener.remove() }
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

private fun parseTaskListSummary(taskListId: String, data: Map<String, Any>): TaskListSummary {
    val tasks = data["tasks"] as? Map<*, *> ?: emptyMap<String, Any>()
    val memberCount = (data["memberCount"] as? Number)?.toInt() ?: 1
    val name = data["name"] as? String ?: ""
    val background = data["background"] as? String

    return TaskListSummary(
        id = taskListId,
        name = name,
        taskCount = parseTasks(tasks).size,
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
        Firebase.firestore.collection("taskLists").document(taskListId).update(updates).await()
    }
}

private fun parseTaskListDetail(taskListId: String, data: Map<String, Any>): TaskListDetail {
    val name = data["name"] as? String ?: ""
    val memberCount = (data["memberCount"] as? Number)?.toInt() ?: 1
    val background = data["background"] as? String
    val shareCode = data["shareCode"] as? String
    val history = (data["history"] as? List<*>)?.mapNotNull { it as? String } ?: emptyList()
    val tasks = parseTasks(data["tasks"] as? Map<*, *> ?: emptyMap<String, Any>())

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
            val listener = db.collection("taskLists").document(taskListId)
                .addSnapshotListener { snapshot, error ->
                    uiState = if (error != null) {
                        uiState.copy(
                            taskList = null,
                            isLoading = false,
                            errorMessage = t.t("pages.sharecode.error")
                        )
                    } else {
                        val data = snapshot?.data
                        if (data == null) {
                            uiState.copy(
                                taskList = null,
                                isLoading = false,
                                errorMessage = t.t("pages.sharecode.notFound")
                            )
                        } else {
                            uiState.copy(
                                taskList = parseTaskListDetail(taskListId, data),
                                isLoading = false,
                                errorMessage = null
                            )
                        }
                    }
                }
            onDispose { listener.remove() }
        }
    }

    DisposableEffect(userId, uiState.taskListId) {
        val taskListId = uiState.taskListId
        if (userId == null || taskListId == null) {
            uiState = uiState.copy(isAdded = false)
            onDispose {}
        } else {
            val listener = db.collection("taskListOrder").document(userId)
                .addSnapshotListener { snapshot, _ ->
                    val isAdded = snapshot?.data
                        ?.let(::parseOrderedTaskListIds)
                        ?.contains(taskListId)
                        ?: false
                    uiState = uiState.copy(isAdded = isAdded)
                }
            onDispose { listener.remove() }
        }
    }

    return uiState
}

private fun parseTasks(rawTasks: Map<*, *>): List<TaskSummary> {
    return rawTasks.entries.mapNotNull { entry ->
        val taskId = entry.key as? String ?: return@mapNotNull null
        val value = entry.value as? Map<*, *> ?: return@mapNotNull null
        if (!isCompleteTaskData(taskId, value)) return@mapNotNull null
        val text = value["text"] as? String ?: ""
        val date = value["date"] as? String ?: ""
        val pinned = value["pinned"] as? Boolean ?: false
        if (!hasTaskContent(text, date, pinned)) return@mapNotNull null
        TaskSummary(
            id = taskId,
            text = text,
            completed = value["completed"] as? Boolean ?: false,
            date = date,
            order = (value["order"] as? Number)?.toDouble() ?: 0.0,
            pinned = pinned
        )
    }.sortedWith(compareBy<TaskSummary> { it.order }.thenBy { it.id })
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
        val taskListSnap = taskListRef.get().await()
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
    val snap = taskListRef.get().await()
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
    val snap = db.collection("shareCodes").document(normalized).get().await()
    if (!snap.exists()) return null
    return snap.getString("taskListId")
}

private suspend fun addSharedTaskListToOrder(taskListId: String) {
    val uid = Firebase.auth.currentUser?.uid ?: return
    val db = Firebase.firestore
    val taskListOrderRef = db.collection("taskListOrder").document(uid)
    val taskListRef = db.collection("taskLists").document(taskListId)
    val orderSnap = taskListOrderRef.get().await()
    val orderData = orderSnap.data ?: emptyMap()

    if (orderData.containsKey(taskListId)) {
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
        update(taskListRef, mapOf(
            "memberCount" to FieldValue.increment(1),
            "updatedAt" to nowMillis()
        ))
    }.commit().await()
}

private suspend fun removeTaskListMembership(
    db: FirebaseFirestore,
    taskListOrderRef: DocumentReference,
    taskListId: String,
    taskListSnapshot: DocumentSnapshot
) {
    val taskListRef = taskListSnapshot.reference
    db.batch().apply {
        update(
            taskListOrderRef,
            mapOf(
                taskListId to FieldValue.delete(),
                "updatedAt" to nowMillis()
            )
        )
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
    val isoFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    return taskLists.flatMapIndexed { taskListIndex, taskList ->
        taskList.tasks
            .filter { !it.completed }
            .mapIndexed { taskIndex, task ->
                val dateValue = task.date.takeIf { it.isNotBlank() }?.let {
                    try { isoFormat.parse(it) } catch (e: Exception) { null }
                }
                CalendarTask(
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
                    taskListIndex = taskListIndex,
                    taskIndex = taskIndex
                )
            }
    }.sortedWith(calendarTaskComparator)
}

private fun taskCountLabel(t: Translations, count: Int): String {
    val key = if (count == 1) "taskList.taskCount_one" else "taskList.taskCount_other"
    return t.t(key, mapOf("count" to count.toString()))
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
        val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(dateKey) ?: return dateKey
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

private fun formatTaskInputDate(date: Date): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(date)

private fun taskInputDateFrom(year: Int, month: Int, day: Int): Date? {
    val calendar = Calendar.getInstance()
    calendar.isLenient = false
    calendar.set(Calendar.YEAR, year)
    calendar.set(Calendar.MONTH, month - 1)
    calendar.set(Calendar.DAY_OF_MONTH, day)
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return try {
        calendar.time
    } catch (_: Exception) {
        null
    }
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
    else -> t.t("settings.taskInsertPosition.bottom")
}

private fun settingsStartupViewLabel(t: Translations, startupView: String): String = when (normalizeStartupView(startupView)) {
    "calendar" -> t.t("settings.startupView.calendar")
    "taskLists" -> t.t("settings.startupView.taskLists")
    else -> t.t("settings.startupView.taskList")
}

@Composable
private fun resolveTaskListBackgroundColor(background: String?): Color {
    return background?.let(::parseHexColor) ?: MaterialTheme.colorScheme.background
}

@Composable
private fun TaskListColorPicker(
    selected: String?,
    enabled: Boolean = true,
    onSelect: (String?) -> Unit
) {
    val t = LocalTranslations.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            t.t("taskList.selectColor"),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TaskListBackgroundOptions.forEach { color ->
                val isSelected = selected == color
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(
                            color?.let(::parseHexColor) ?: MaterialTheme.colorScheme.surface,
                            CircleShape
                        )
                        .then(
                            if (isSelected) Modifier.border(2.5.dp, MaterialTheme.colorScheme.primary, CircleShape)
                            else if (color == null) Modifier.border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                            else Modifier
                        )
                        .semantics {
                            contentDescription = colorLabel(t, color)
                            role = Role.Button
                        }
                        .clickable(enabled = enabled) { onSelect(color) }
                )
            }
        }
    }
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
private fun ScreenScaffold(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 480.dp),
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surfaceContainerLow,
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                tonalElevation = 0.dp,
                shadowElevation = 0.dp
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(24.dp))
                    content()
                }
            }
        }
    }
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
                        IconButton(
                            onClick = onBack,
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .size(48.dp)
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = t.t("common.back"),
                                modifier = Modifier.size(AppIconMetrics.standardActionIconSize)
                            )
                        }
                    }
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge,
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
                        WindowInsetsSides.Bottom + WindowInsetsSides.Horizontal
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

    ScreenScaffold(
        title = when (selectedScreen) {
            AuthScreen.SignIn -> t.t("auth.button.signin")
            AuthScreen.SignUp -> t.t("auth.button.signup")
            AuthScreen.Reset -> t.t("auth.passwordReset.title")
        }
    ) {
        Box(Modifier.fillMaxWidth()) {
            TextButton(
                onClick = { showLanguageMenu = true },
                modifier = Modifier.align(Alignment.CenterEnd)
            ) {
                Icon(Icons.Default.Language, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text(supportedLanguages.firstOrNull { it.first == selectedLanguage }?.second ?: selectedLanguage)
            }
            DropdownMenu(
                expanded = showLanguageMenu,
                onDismissRequest = { showLanguageMenu = false },
                modifier = Modifier.heightIn(max = 320.dp)
            ) {
                supportedLanguages.forEach { (code, name) ->
                    DropdownMenuItem(
                        text = { Text(name) },
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
        Spacer(Modifier.height(8.dp))
        PrimaryTabRow(selectedTabIndex = selectedScreen.ordinal, modifier = Modifier.fillMaxWidth()) {
            listOf(
                AuthScreen.SignIn to t.t("auth.tabs.signin"),
                AuthScreen.SignUp to t.t("auth.tabs.signup"),
                AuthScreen.Reset to t.t("auth.passwordReset.title")
            ).forEachIndexed { index, (screen, title) ->
                Tab(
                    selected = selectedScreen.ordinal == index,
                    onClick = {
                        selectedScreen = screen
                        onScreenChange(screen)
                    },
                    text = { Text(title) }
                )
            }
        }
        Spacer(Modifier.height(24.dp))
        when (selectedScreen) {
            AuthScreen.SignIn -> SignInView(
                onShowReset = {
                    selectedScreen = AuthScreen.Reset
                    onScreenChange(AuthScreen.Reset)
                }
            )
            AuthScreen.SignUp -> SignUpView(
                language = selectedLanguage,
                onShowSignIn = {
                    selectedScreen = AuthScreen.SignIn
                    onScreenChange(AuthScreen.SignIn)
                }
            )
            AuthScreen.Reset -> PasswordResetRequestView(
                language = selectedLanguage,
                onBackToSignIn = {
                    selectedScreen = AuthScreen.SignIn
                    onScreenChange(AuthScreen.SignIn)
                }
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
    enabled: Boolean = true
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(
            keyboardType = if (password) KeyboardType.Password else KeyboardType.Email
        ),
        singleLine = true,
        modifier = Modifier.fillMaxWidth().semantics {
            this.contentType = contentType
        },
        enabled = enabled
    )
}

@Composable
private fun AuthMessages(errors: List<String?>, success: String? = null) {
    errors.filterNotNull().forEach { message ->
        Spacer(Modifier.height(8.dp))
        Text(
            message,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.fillMaxWidth()
        )
    }
    success?.let {
        Spacer(Modifier.height(8.dp))
        Text(
            it,
            color = MaterialTheme.colorScheme.primary,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.fillMaxWidth()
        )
    }
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

    AuthTextField(
        value = email,
        onValueChange = {
            email = it
            emailError = null
            errorMessage = null
        },
        label = t.t("auth.form.email"),
        contentType = ContentType.Username + ContentType.EmailAddress
    )
    Spacer(Modifier.height(8.dp))
    AuthTextField(
        value = password,
        onValueChange = {
            password = it
            passwordError = null
            errorMessage = null
        },
        label = t.t("auth.form.password"),
        contentType = ContentType.Password,
        password = true
    )
    AuthMessages(listOf(emailError, passwordError, errorMessage))
    Spacer(Modifier.height(16.dp))
    Button(
        onClick = {
            emailError = validateEmailField(t, email.trim())
            passwordError = validatePasswordField(t, password, requireLength = false)
            if (emailError != null || passwordError != null) {
                return@Button
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
    ) {
        Text(if (isLoading) t.t("auth.button.signingIn") else t.t("auth.button.signin"))
    }
    Spacer(Modifier.height(8.dp))
    TextButton(
        onClick = onShowReset,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(t.t("auth.button.forgotPassword"))
    }
}

@Composable
private fun SignUpView(
    language: String,
    onShowSignIn: () -> Unit
) {
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

    AuthTextField(
        value = email,
        onValueChange = {
            email = it
            emailError = null
            errorMessage = null
        },
        label = t.t("auth.form.email"),
        contentType = ContentType.NewUsername + ContentType.EmailAddress
    )
    Spacer(Modifier.height(8.dp))
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
        password = true
    )
    Spacer(Modifier.height(8.dp))
    AuthTextField(
        value = confirmPassword,
        onValueChange = {
            confirmPassword = it
            confirmPasswordError = null
            errorMessage = null
        },
        label = t.t("auth.form.confirmPassword"),
        contentType = ContentType.NewPassword,
        password = true
    )
    AuthMessages(listOf(emailError, passwordError, confirmPasswordError, errorMessage))
    Spacer(Modifier.height(16.dp))
    Button(
        onClick = {
            val trimmedEmail = email.trim()
            emailError = validateEmailField(t, trimmedEmail)
            passwordError = validatePasswordField(t, password, requireLength = true)
            confirmPasswordError = validateConfirmPasswordField(t, password, confirmPassword)
            if (emailError != null || passwordError != null || confirmPasswordError != null) {
                return@Button
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
    ) {
        Text(if (isLoading) t.t("auth.button.signingUp") else t.t("auth.button.signup"))
    }
    Spacer(Modifier.height(8.dp))
    TextButton(onClick = onShowSignIn, modifier = Modifier.fillMaxWidth()) {
        Text(t.t("auth.button.backToSignIn"))
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

    Text(
        t.t("auth.passwordReset.instruction"),
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.fillMaxWidth()
    )
    Spacer(Modifier.height(12.dp))
    AuthTextField(
        value = email,
        onValueChange = {
            email = it
            emailError = null
            errorMessage = null
            successMessage = null
        },
        label = t.t("auth.form.email"),
        contentType = ContentType.Username + ContentType.EmailAddress
    )
    AuthMessages(listOf(emailError, errorMessage), successMessage)
    Spacer(Modifier.height(16.dp))
    Button(
        onClick = {
            val trimmedEmail = email.trim()
            emailError = validateEmailField(t, trimmedEmail)
            if (emailError != null) {
                return@Button
            }

            isLoading = true
            errorMessage = null
            successMessage = null
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
    ) {
        Text(if (isLoading) t.t("auth.button.sending") else t.t("auth.button.sendResetEmail"))
    }
    Spacer(Modifier.height(8.dp))
    TextButton(onClick = onBackToSignIn, modifier = Modifier.fillMaxWidth()) {
        Text(t.t("auth.button.backToSignIn"))
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
            Spacer(Modifier.height(8.dp))
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
        AuthMessages(listOf(passwordError, confirmPasswordError, errorMessage), successMessage)
        if (isVerifying) {
            Spacer(Modifier.height(8.dp))
            CircularProgressIndicator()
        }
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {
                passwordError = validatePasswordField(t, password, requireLength = true)
                confirmPasswordError = validateConfirmPasswordField(t, password, confirmPassword)
                if (passwordError != null || confirmPasswordError != null) {
                    return@Button
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
        ) {
            Text(if (isSubmitting) t.t("auth.passwordReset.settingNewPassword") else t.t("auth.passwordReset.setNewPassword"))
        }
        Spacer(Modifier.height(8.dp))
        TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
            Text(t.t("common.close"))
        }
    }
}

@Composable
private fun CalendarDayCell(
    dayNum: Int,
    isToday: Boolean,
    isSelected: Boolean,
    dots: List<String?>,
    reduceMotion: Boolean,
    onTap: () -> Unit,
    modifier: Modifier = Modifier
) {
    val t = LocalTranslations.current
    val selectionFillColor by animateColorAsState(
        targetValue = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
        animationSpec = if (reduceMotion) snap() else tween(durationMillis = 180),
        label = "calendar selection fill"
    )
    val selectionContentColor by animateColorAsState(
        targetValue = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
        animationSpec = if (reduceMotion) snap() else tween(durationMillis = 180),
        label = "calendar selection content"
    )
    val selectionScale by animateFloatAsState(
        targetValue = if (isSelected) 1f else 0.82f,
        animationSpec = if (reduceMotion) snap() else spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "calendar selection scale"
    )
    val dayLabel = buildList {
        add("$dayNum")
        if (isToday) add(t.t("a11y.today"))
        if (dots.isNotEmpty()) add(t.t("a11y.hasTasks"))
    }.joinToString(", ")
    Column(
        modifier = modifier
            .height(48.dp)
            .semantics {
                contentDescription = dayLabel
                role = Role.Button
                selected = isSelected
            }
            .clickable(onClick = onTap),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(40.dp)
                .then(
                    if (isToday && !isSelected)
                        Modifier.border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                    else Modifier
                )
        ) {
            Box(
                Modifier
                    .matchParentSize()
                    .graphicsLayer {
                        scaleX = selectionScale
                        scaleY = selectionScale
                    }
                    .background(selectionFillColor, CircleShape)
            )
            Text(
                "$dayNum",
                style = MaterialTheme.typography.bodyMedium,
                color = selectionContentColor
            )
        }
        if (dots.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.height(8.dp)) {
                dots.take(3).forEach { hexColor ->
                    Box(
                        modifier = Modifier
                            .size(4.dp)
                            .then(
                                if (hexColor == null) {
                                    Modifier.border(
                                        width = 1.dp,
                                        color = MaterialTheme.colorScheme.outline,
                                        shape = CircleShape
                                    )
                                } else {
                                    Modifier.background(parseHexColor(hexColor), CircleShape)
                                }
                            )
                    )
                }
            }
        } else {
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun CalendarGrid(
    month: java.util.Date,
    selectedDateKey: String?,
    dotColorsByDate: Map<String, List<String?>>,
    reduceMotion: Boolean,
    onSelectDate: (String) -> Unit
) {
    val t = LocalTranslations.current
    val cal = Calendar.getInstance().apply { time = month }
    val year = cal.get(Calendar.YEAR)
    val monthNum = cal.get(Calendar.MONTH)
    val firstDayOfWeek = Calendar.getInstance().apply {
        set(year, monthNum, 1)
    }.get(Calendar.DAY_OF_WEEK) - 1
    val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
    val todayKey = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(java.util.Date())

    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
        val weekDays = remember(t.languageTag()) {
            DateFormatSymbols(localeForLanguage(t.languageTag())).shortWeekdays
                .drop(1)
                .map { it.trimEnd('.') }
        }
        Row(modifier = Modifier.fillMaxWidth()) {
            weekDays.forEach { label ->
                Text(
                    label,
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }
        Spacer(Modifier.height(4.dp))
        val totalCells = firstDayOfWeek + daysInMonth
        val rows = (totalCells + 6) / 7
        repeat(rows) { rowIndex ->
            Row(modifier = Modifier.fillMaxWidth()) {
                repeat(7) { colIndex ->
                    val cellIndex = rowIndex * 7 + colIndex
                    val dayNum = cellIndex - firstDayOfWeek + 1
                    if (dayNum in 1..daysInMonth) {
                        val dateKey = String.format(Locale.US, "%04d-%02d-%02d", year, monthNum + 1, dayNum)
                        CalendarDayCell(
                            dayNum = dayNum,
                            isToday = dateKey == todayKey,
                            isSelected = selectedDateKey == dateKey,
                            dots = dotColorsByDate[dateKey] ?: emptyList(),
                            reduceMotion = reduceMotion,
                            onTap = { onSelectDate(dateKey) },
                            modifier = Modifier.weight(1f)
                        )
                    } else {
                        Box(modifier = Modifier.weight(1f))
                    }
                }
            }
            Spacer(Modifier.height(2.dp))
        }
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
        targetValue = if (isHighlighted) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent,
        animationSpec = if (reduceMotion) snap() else tween(durationMillis = 180),
        label = "calendar task highlight"
    )
    val dateLabel = remember(task.dateKey, t.languageTag()) {
        task.dateKey.takeIf { it.isNotBlank() }?.let {
            formatDateForLocale(it, t.languageTag(), "MMM d EEE")
        }
    }
    val markCompleteLabel = t.t("pages.tasklist.markComplete")
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(highlightColor)
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
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(onClick = onSelectDate)
                    .padding(start = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (dateLabel != null) {
                    Text(
                        dateLabel,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    Text(
                        t.t("pages.tasklist.noDate"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                    )
                }
                if (task.pinned) {
                    Icon(
                        Icons.Default.PushPin,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            Row(
                modifier = Modifier
                    .widthIn(min = 48.dp, max = 132.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(onClick = onOpenTaskList)
                    .padding(start = 4.dp, end = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(16.dp)
                        .then(
                            if (task.taskListBackground == null) {
                                Modifier.border(
                                    width = 1.dp,
                                    color = MaterialTheme.colorScheme.outline,
                                    shape = CircleShape
                                )
                            } else {
                                Modifier.background(parseHexColor(task.taskListBackground), CircleShape)
                            }
                        )
                )
                Text(
                    task.taskListName,
                    style = MaterialTheme.typography.labelMedium,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onToggleComplete)
                    .semantics {
                        contentDescription = markCompleteLabel
                        role = Role.Button
                    }
                    .padding(top = 8.dp),
                contentAlignment = Alignment.TopCenter
            ) {
                Box(
                    Modifier
                        .size(TaskListDetailMetrics.completionDotSize)
                        .border(
                            width = 1.5.dp,
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.9f),
                            shape = CircleShape
                        )
                )
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(onClick = onSelectDate),
                contentAlignment = Alignment.TopStart
            ) {
                Text(
                    task.text,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(start = 2.dp, top = 6.dp),
                    maxLines = 2,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    textDecoration = if (task.completed) TextDecoration.LineThrough else TextDecoration.None
                )
            }
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onOpenActions)
                    .semantics {
                        contentDescription = t.t("a11y.editTask")
                        role = Role.Button
                    }
                    .padding(top = 6.dp),
                contentAlignment = Alignment.TopCenter
            ) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(AppIconMetrics.inlineActionIconSize)
                )
            }
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
    val settingsState = externalSettingsState ?: rememberSettingsState(userId)
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
    val calendarTasks = remember(loadedCalendarTasks, optimisticCalendarTasks) {
        val loadedIds = loadedCalendarTasks.mapTo(mutableSetOf()) { it.id }
        (loadedCalendarTasks + optimisticCalendarTasks.filter { it.id !in loadedIds })
            .sortedWith(calendarTaskComparator)
    }
    var displayedMonth by remember {
        mutableStateOf(
            Calendar.getInstance().apply {
                set(Calendar.DAY_OF_MONTH, 1)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }.time
        )
    }
    var selectedDateKey by remember { mutableStateOf<String?>(null) }
    var showAddTaskSheet by remember { mutableStateOf(false) }
    var addTaskError by remember { mutableStateOf<String?>(null) }
    var editingTask by remember { mutableStateOf<CalendarTask?>(null) }
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scope = rememberCoroutineScope()

    LaunchedEffect(calendarTaskLists) {
        val loadedIds = calendarTaskLists.flatMap { taskList ->
            taskList.tasks.map { task -> "${taskList.id}:${task.id}" }
        }.toSet()
        optimisticCalendarTasks = optimisticCalendarTasks.filter { it.id !in loadedIds }
    }

    val monthKey = remember(displayedMonth) {
        SimpleDateFormat("yyyy-MM", Locale.US).format(displayedMonth)
    }
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

    val monthTitle = remember(displayedMonth, t.languageTag()) {
        val locale = localeForLanguage(t.languageTag())
        val pattern = DateFormat.getBestDateTimePattern(locale, "yMMMM")
        SimpleDateFormat(pattern, locale).format(displayedMonth)
    }
    val selectedDateLabel = remember(selectedDateKey, t.languageTag()) {
        selectedDateKey?.let { formatDateForLocale(it, t.languageTag(), "yMMM d EEE") }.orEmpty()
    }

    fun selectDate(dateKey: String?) {
        if (selectedDateKey != dateKey) {
            haptic.performHapticFeedback(HapticFeedbackType.SegmentFrequentTick)
        }
        selectedDateKey = dateKey
        if (dateKey != null) {
            val targetIndex = tasksInMonth.indexOfFirst { it.dateKey == dateKey }
            if (targetIndex >= 0) {
                scope.launch { listState.animateScrollToItem(targetIndex) }
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
        val nextTasks = reconcileTasks(insertedTasks, settingsState.autoSort)
        val insertedIndex = nextTasks.indexOfFirst { it.id == taskId }
        val dateValue = dateKey.takeIf { it.isNotBlank() }?.let {
            try {
                SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(it)
            } catch (_: Exception) {
                null
            }
        }

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
            Firebase.firestore.collection("taskLists").document(taskList.id).update(updates).await()
        }
    }

    fun updateCalendarTask(
        task: CalendarTask,
        logFields: String,
        additionalUpdatesBuilder: ((TaskListDetail, TaskSummary) -> Map<String, Any>)? = null,
        transform: (TaskSummary) -> TaskSummary
    ) {
        val taskList = calendarTaskLists.firstOrNull { it.id == task.taskListId } ?: return
        val currentTask = taskList.tasks.firstOrNull { it.id == task.taskId } ?: return
        val orderedTasks = taskList.tasks.sortedWith(compareBy<TaskSummary> { it.order }.thenBy { it.id })
        val nextTasks = reconcileTasks(
            orderedTasks.map { if (it.id == task.taskId) transform(it) else it },
            settingsState.autoSort
        )
        val updates = buildTaskUpdateData(orderedTasks, nextTasks) +
            (additionalUpdatesBuilder?.invoke(taskList, currentTask) ?: emptyMap())
        logTaskUpdate(fields = logFields)
        addTaskError = null
        TaskListMutationQueues.queueFor(taskList.id).enqueue(onError = { error ->
            recordNonFatalException("calendar_task_update", error)
            addTaskError = t.t("common.error")
        }) {
            Firebase.firestore.collection("taskLists").document(taskList.id).update(updates).await()
        }
    }

    fun completeCalendarTask(task: CalendarTask) {
        haptic.performHapticFeedback(HapticFeedbackType.ToggleOn)
        updateCalendarTask(task, "completed") { it.copy(completed = true) }
    }

    fun saveCalendarTask(task: CalendarTask, taskListId: String, text: String, pinned: Boolean, dateKey: String) {
        val trimmed = text.trim()
        if (!hasTaskContent(trimmed, dateKey, pinned)) return
        val sourceTaskList = calendarTaskLists.firstOrNull { it.id == task.taskListId } ?: return
        val currentTask = sourceTaskList.tasks.firstOrNull { it.id == task.taskId } ?: return
        val resolved = resolveTaskInput(trimmed, t, currentTask)
        val nextText = if (trimmed.isEmpty()) "" else resolved.text
        if (taskListId == task.taskListId) {
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
        val orderedTargetTasks = targetTaskList.tasks.sortedWith(compareBy<TaskSummary> { it.order }.thenBy { it.id })
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
        val nextTargetTasks = reconcileTasks(insertedTasks, settingsState.autoSort)
        val targetUpdates = buildTaskUpdateData(orderedTargetTasks, nextTargetTasks) +
            mapOf("history" to buildHistory(nextText, targetTaskList.history))
        val sourceUpdates = mapOf(
            "tasks.${task.taskId}" to FieldValue.delete(),
            "updatedAt" to nowMillis()
        )
        logTaskUpdate(fields = "text,date,pinned,taskList")
        addTaskError = null
        TaskListMutationQueues.queueFor(task.taskListId).enqueue(onError = { error ->
            recordNonFatalException("calendar_task_move", error)
            addTaskError = t.t("common.error")
        }) {
            val db = Firebase.firestore
            val batch = db.batch()
            batch.update(db.collection("taskLists").document(task.taskListId), sourceUpdates)
            batch.update(db.collection("taskLists").document(taskListId), targetUpdates)
            batch.commit().await()
        }
    }

    DetailScreenScaffold(
        title = t.t("app.calendar"),
        onBack = if (navController != null) ({ navController.navigateUp() }) else null,
        showTopBar = showTopBar,
        topBarHeight = 56.dp,
        backgroundColor = MaterialTheme.colorScheme.surfaceDim
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight()
                .widthIn(max = 960.dp)
                .align(Alignment.CenterHorizontally)
                .padding(top = 2.dp)
                .padding(bottom = 8.dp)
        ) {
            if (hasLoadError && calendarTaskLists.isNotEmpty()) {
                Text(
                    t.t("app.loadError"),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 8.dp)
                )
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 2.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = {
                    displayedMonth = Calendar.getInstance().apply {
                        time = displayedMonth
                        add(Calendar.MONTH, -1)
                        set(Calendar.DAY_OF_MONTH, 1)
                    }.time
                    selectedDateKey = null
                }) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                        contentDescription = t.t("app.calendarPreviousMonth"),
                        modifier = Modifier.size(AppIconMetrics.standardActionIconSize)
                    )
                }
                Text(monthTitle, style = MaterialTheme.typography.titleLarge)
                IconButton(onClick = {
                    displayedMonth = Calendar.getInstance().apply {
                        time = displayedMonth
                        add(Calendar.MONTH, 1)
                        set(Calendar.DAY_OF_MONTH, 1)
                    }.time
                    selectedDateKey = null
                }) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = t.t("app.calendarNextMonth"),
                        modifier = Modifier.size(AppIconMetrics.standardActionIconSize)
                    )
                }
            }

            CalendarGrid(
                month = displayedMonth,
                selectedDateKey = selectedDateKey,
                dotColorsByDate = dotColorsByDate,
                reduceMotion = reduceMotion,
                onSelectDate = { dateKey ->
                    selectDate(if (selectedDateKey == dateKey) null else dateKey)
                }
            )

            if (selectedDateKey != null) {
                Button(
                    onClick = {
                        addTaskError = null
                        showAddTaskSheet = true
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                        .height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("$selectedDateLabel · ${t.t("a11y.addTask")}")
                }
            }

            if (addTaskError != null) {
                Text(
                    addTaskError.orEmpty(),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
            }

            Spacer(Modifier.height(4.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(horizontal = 8.dp)
            ) {
                if (tasksInMonth.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            if (hasLoadError) t.t("app.loadError") else t.t("app.calendarNoDatedTasks"),
                            color = if (hasLoadError) MaterialTheme.colorScheme.error
                            else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(tasksInMonth, key = { it.id }) { task ->
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
            }
        }
    }

    if (showAddTaskSheet && selectedDateKey != null) {
        CalendarTaskSheet(
            title = t.t("a11y.addTask"),
            submitLabel = t.t("a11y.addTask"),
            taskLists = calendarTaskLists,
            initialTaskListId = calendarTaskLists.firstOrNull()?.id.orEmpty(),
            initialText = "",
            initialPinned = false,
            initialDateKey = selectedDateKey,
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CalendarTaskSheet(
    title: String,
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
    var taskListMenuExpanded by remember { mutableStateOf(false) }
    val initialSelectedMillis = remember(initialDateKey) {
        initialDateKey?.takeIf { it.isNotBlank() }?.let { date ->
            runCatching {
                SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.parse(date)?.time
            }.getOrNull()
        }
    }
    val datePickerState = rememberDatePickerState(initialSelectedDateMillis = initialSelectedMillis)
    val pinnedLabel = t.t(if (pinned) "pages.tasklist.unpinTask" else "pages.tasklist.pinTask")

    fun submit() {
        val trimmed = text.trim()
        val dateKey = datePickerState.selectedDateMillis?.let { millis ->
            SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.format(Date(millis))
        }.orEmpty()
        if (!hasTaskContent(trimmed, dateKey, pinned) || taskListId.isEmpty()) return
        onSubmit(taskListId, trimmed, pinned, dateKey)
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        contentWindowInsets = { WindowInsets(0) },
        modifier = Modifier.semantics {
            paneTitle = title
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 640.dp)
                .navigationBarsPadding()
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .weight(1f, fill = false)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                TextButton(
                    onClick = onDismiss,
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                ) {
                    Text(t.t("common.close"))
                }
            }

            Box {
                OutlinedButton(
                    onClick = { taskListMenuExpanded = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(TaskListDetailMetrics.inputCornerRadius),
                    contentPadding = PaddingValues(horizontal = 14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            taskLists.firstOrNull { it.id == taskListId }?.name
                                ?: t.t("app.drawerTitle"),
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                        Icon(
                            Icons.Default.KeyboardArrowDown,
                            contentDescription = null,
                            modifier = Modifier.size(AppIconMetrics.inlineActionIconSize)
                        )
                    }
                }
                DropdownMenu(
                    expanded = taskListMenuExpanded,
                    onDismissRequest = { taskListMenuExpanded = false }
                ) {
                    taskLists.forEach { taskList ->
                        DropdownMenuItem(
                            text = { Text(taskList.name) },
                            onClick = {
                                taskListId = taskList.id
                                taskListMenuExpanded = false
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                placeholder = { Text(t.t("pages.tasklist.addTaskPlaceholder")) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { submit() }),
                shape = RoundedCornerShape(TaskListDetailMetrics.inputCornerRadius),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TextButton(
                    onClick = { datePickerState.selectedDateMillis = null },
                    modifier = Modifier.height(48.dp),
                    enabled = datePickerState.selectedDateMillis != null
                ) {
                    Text(t.t("pages.tasklist.clearDate"))
                }
                Spacer(Modifier.weight(1f))
                Surface(
                    onClick = { pinned = !pinned },
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceDim,
                    modifier = Modifier.semantics {
                        contentDescription = pinnedLabel
                        role = Role.Switch
                    }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.PushPin, contentDescription = null)
                        Text(pinnedLabel)
                        Switch(checked = pinned, onCheckedChange = null)
                    }
                }
            }

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceDim,
                modifier = Modifier.fillMaxWidth()
            ) {
                DatePicker(
                    state = datePickerState,
                    modifier = Modifier.fillMaxWidth(),
                    title = null,
                    headline = null,
                    showModeToggle = false
                )
            }

            }

            Button(
                onClick = { submit() },
                enabled = (
                    text.trim().isNotEmpty() || pinned || datePickerState.selectedDateMillis != null
                ) && taskListId.isNotEmpty(),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Text(submitLabel)
            }
        }
    }
}

@Composable
private fun DragHandleIcon(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(AppIconMetrics.dragHandleDotSpacing)
    ) {
        repeat(3) {
            Row(horizontalArrangement = Arrangement.spacedBy(AppIconMetrics.dragHandleDotSpacing)) {
                repeat(2) {
                    Box(
                        Modifier
                            .size(AppIconMetrics.dragHandleDotSize)
                            .background(
                                MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                CircleShape
                            )
                    )
                }
            }
        }
    }
}

@Composable
private fun TaskListsScreen(
    navController: NavController?,
    userId: String?,
    selectedTaskListId: String? = null,
    onTaskListSelected: ((String) -> Unit)? = null,
    onOpenSettings: (() -> Unit)? = null,
    onOpenCalendar: (() -> Unit)? = null
) {
    val t = LocalTranslations.current
    val haptic = LocalHapticFeedback.current
    val reduceMotion = rememberReduceMotion()
    val uiState = rememberOrderedTaskListsState(userId, ::parseTaskListSummary)
    val userEmail = Firebase.auth.currentUser?.email ?: ""

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
    val displayedUserEmail = userEmail.ifBlank { t.t("app.drawerNoEmail") }
    var pendingTaskListOrder by remember { mutableStateOf<List<TaskListSummary>?>(null) }
    val taskListOrderMutationQueue = remember(userId) {
        TaskListMutationQueues.queueFor("taskListOrder:$userId")
    }
    var taskListOrderMutationRevision by remember(userId) { mutableIntStateOf(0) }
    var taskListDragStartIds by remember(userId) { mutableStateOf<List<String>>(emptyList()) }

    val displayTaskLists = dragOrderedTaskLists ?: pendingTaskListOrder ?: uiState.taskLists
    val density = LocalDensity.current
    val taskListSpacingPx = with(density) { 24.dp.toPx() }

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
        taskListOrderMutationQueue.enqueue {
            try {
                Firebase.firestore.collection("taskListOrder").document(uid).update(updates).await()
                if (taskListOrderMutationRevision == mutationRevision) {
                    pendingTaskListOrder = null
                }
            } catch (e: Exception) {
                recordNonFatalException("task_list_order_update", e)
                if (taskListOrderMutationRevision == mutationRevision) {
                    pendingTaskListOrder = null
                }
            }
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .windowInsetsPadding(
                WindowInsets.safeDrawing.only(
                    WindowInsetsSides.Top + WindowInsetsSides.Horizontal
                )
            )
            .padding(horizontal = 16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp, bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                displayedUserEmail,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.weight(1f),
                maxLines = 1
            )
            IconButton(
                onClick = {
                    if (onOpenSettings != null) {
                        onOpenSettings()
                    } else {
                        navController?.navigate(AppRoute.Settings.route)
                    }
                }
            ) {
                Icon(
                    Icons.Outlined.Settings,
                    contentDescription = t.t("settings.title"),
                    modifier = Modifier.size(AppIconMetrics.standardActionIconSize),
                    tint = MaterialTheme.colorScheme.onBackground
                )
            }
        }

        OutlinedButton(
            onClick = { openCalendar() },
            modifier = Modifier
                .fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Icon(
                Icons.Filled.CalendarToday,
                contentDescription = t.t("app.calendar"),
                modifier = Modifier.size(AppIconMetrics.leadingButtonIconSize)
            )
            Spacer(Modifier.width(8.dp))
            Text(t.t("app.calendarCheckButton"))
        }

        Spacer(Modifier.height(24.dp))

        if (uiState.hasError && displayTaskLists.isNotEmpty()) {
            Text(
                t.t("app.loadError"),
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }

        when {
            uiState.isLoading -> {
                Box(Modifier.fillMaxWidth().padding(vertical = 20.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            displayTaskLists.isEmpty() -> {
                Text(
                    if (uiState.hasError) t.t("app.loadError") else t.t("app.emptyState"),
                    color = if (uiState.hasError) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                )
            }
            else -> {
                LazyColumn(
                    state = lazyListState,
                    modifier = Modifier
                        .weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
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
                                .clickable(enabled = draggingTaskListId == null) {
                                    openTaskList(taskList.id)
                                }
                                .offset { IntOffset(0, if (isDragged) taskListDragOffset.toInt() else 0) }
                                .zIndex(if (isDragged) 1f else 0f)
                                .alpha(if (isDragged && !reduceMotion) 0.8f else 1f)
                                .graphicsLayer {
                                    scaleX = if (isDragged && !reduceMotion) 1.03f else 1f
                                    scaleY = if (isDragged && !reduceMotion) 1.03f else 1f
                                }
                                .then(if (!isDragged && !reduceMotion) Modifier.animateItem() else Modifier)
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent,
                                    RoundedCornerShape(10.dp)
                                )
                                .padding(horizontal = 8.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .width(TaskListDetailMetrics.dragHandleTouchWidth)
                                    .height(48.dp)
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

                            Box(
                                Modifier
                                    .size(14.dp)
                                    .background(
                                        if (taskList.background != null) parseHexColor(taskList.background)
                                        else MaterialTheme.colorScheme.outlineVariant,
                                        CircleShape
                                    )
                                    .then(
                                        if (taskList.background == null)
                                            Modifier.border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                                        else Modifier
                                    )
                            )

                            Column {
                                Text(
                                    taskList.name,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onBackground
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    taskCountLabel(t, taskList.taskCount),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }

        if (displayTaskLists.isEmpty() || uiState.isLoading) {
            Spacer(Modifier.weight(1f))
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Button(
                onClick = {
                    createName = ""
                    createBackground = null
                    showCreateDialog = true
                },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(t.t("app.createNew"), fontWeight = FontWeight.Medium)
            }
            OutlinedButton(
                onClick = {
                    joinListInput = ""
                    joinListError = null
                    showJoinDialog = true
                },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Text(t.t("app.joinList"), fontWeight = FontWeight.Medium)
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

    if (showCreateDialog) {
        AlertDialog(
            onDismissRequest = { showCreateDialog = false },
            title = { Text(t.t("app.createTaskList")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    OutlinedTextField(
                        value = createName,
                        onValueChange = { createName = it },
                        label = { Text(t.t("app.taskListName")) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    TaskListColorPicker(selected = createBackground) { createBackground = it }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val trimmed = createName.trim()
                        if (trimmed.isNotEmpty()) {
                            val uid = Firebase.auth.currentUser?.uid ?: return@TextButton
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
                    },
                    enabled = createName.trim().isNotEmpty()
                ) { Text(t.t("app.create")) }
            },
            dismissButton = {
                TextButton(onClick = { showCreateDialog = false }) { Text(t.t("common.cancel")) }
            }
        )
    }

    if (showJoinDialog) {
        AlertDialog(
            onDismissRequest = { if (!joiningList) showJoinDialog = false },
            title = { Text(t.t("app.joinListTitle")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        t.t("app.joinListDescription"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (joinListError != null) {
                        Text(
                            joinListError!!,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    OutlinedTextField(
                        value = joinListInput,
                        onValueChange = { joinListInput = it; joinListError = null },
                        label = { Text(t.t("taskList.shareCode")) },
                        placeholder = { Text(t.t("app.shareCodePlaceholder")) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
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
                                addSharedTaskListToOrder(taskListId)
                                logShareCodeJoin()
                                showJoinDialog = false
                                openTaskList(taskListId)
                            } catch (e: Exception) {
                                joinListError = localizeJoinListError(t, e)
                            } finally {
                                joiningList = false
                            }
                        }
                    },
                    enabled = joinListInput.trim().isNotEmpty() && !joiningList
                ) { Text(if (joiningList) t.t("app.joining") else t.t("app.join")) }
            },
            dismissButton = {
                TextButton(
                    onClick = { showJoinDialog = false },
                    enabled = !joiningList
                ) { Text(t.t("common.cancel")) }
            }
        )
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
    val settingsState = rememberSettingsState(userId)
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
                selectedTaskListId = selectedTaskListState.value,
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
                SettingsView(showTopBar = false)
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
    val settingsState = externalSettingsState ?: rememberSettingsState(userId)
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
    var focusedNewTaskListId by remember { mutableStateOf<String?>(null) }
    var shouldMoveNewTaskFocusOnPageSettle by remember { mutableStateOf(false) }
    val currentSelectedTaskListId by rememberUpdatedState(selectedTaskListId)
    val currentFocusedNewTaskListId = rememberUpdatedState(focusedNewTaskListId)
    val currentTaskList =
        uiState.taskLists.getOrNull(pagerState.currentPage) ?: uiState.taskLists.firstOrNull()
    val taskListBackgroundColor = resolveTaskListBackgroundColor(currentTaskList?.background)
    val showIndicator = uiState.taskLists.size > 1 && currentTaskList != null
    val taskPageTopInset =
        if (showIndicator) TaskListDetailMetrics.indicatorContentInset else 0.dp

    LaunchedEffect(uiState.taskLists.size, selectedTaskListIndex) {
        if (uiState.taskLists.isEmpty()) {
            return@LaunchedEffect
        }
        if (pagerState.currentPage != selectedTaskListIndex) {
            pagerState.scrollToPage(selectedTaskListIndex)
        }
    }

    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.isScrollInProgress }
            .collectLatest { isScrolling ->
                if (isScrolling) {
                    shouldMoveNewTaskFocusOnPageSettle =
                        currentFocusedNewTaskListId.value == currentSelectedTaskListId
                }
            }
    }

    LaunchedEffect(pagerState, uiState.taskLists) {
        snapshotFlow { pagerState.settledPage }
            .collectLatest { page ->
                val taskList = uiState.taskLists.getOrNull(page) ?: return@collectLatest
                val shouldMoveNewTaskFocus =
                    shouldMoveNewTaskFocusOnPageSettle ||
                        currentFocusedNewTaskListId.value == currentSelectedTaskListId
                if (shouldMoveNewTaskFocus) {
                    focusedNewTaskListId = taskList.id
                }
                shouldMoveNewTaskFocusOnPageSettle = false
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
                    .fillMaxSize()
                    .widthIn(max = 768.dp)
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
                                    shouldFocusNewTaskInput = focusedNewTaskListId == taskList.id,
                                    onNewTaskInputFocusChange = { isFocused ->
                                        if (isFocused) {
                                            focusedNewTaskListId = taskList.id
                                        } else if (focusedNewTaskListId == taskList.id) {
                                            focusedNewTaskListId = null
                                        }
                                    }
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
    index: Int,
    isEditing: Boolean,
    isDragged: Boolean,
    isExiting: Boolean,
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

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(
                top = if (index == 0) 0.dp else TaskListDetailMetrics.taskRowSpacing,
                bottom = TaskListDetailMetrics.taskRowVerticalPadding
            )
            .then(rowModifier),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .padding(
                    top = TaskListDetailMetrics.dragHandleTopPadding,
                    end = TaskListDetailMetrics.dragHandleEndPadding
                )
                .width(TaskListDetailMetrics.dragHandleTouchWidth)
                .height(48.dp)
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
        Box(
            modifier = Modifier
                .padding(
                    top = TaskListDetailMetrics.completionTopPadding,
                    end = TaskListDetailMetrics.completionEndPadding
                )
                .width(TaskListDetailMetrics.completionTouchWidth)
                .height(48.dp)
                .semantics {
                    contentDescription = if (task.completed) t.t("pages.tasklist.markIncomplete") else t.t("pages.tasklist.markComplete")
                    role = Role.Checkbox
                }
                .clickable { onToggleCompletion() },
            contentAlignment = Alignment.Center
        ) {
            val completionFillColor by animateColorAsState(
                targetValue = if (task.completed) MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)
                else Color.Transparent,
                animationSpec = if (reduceMotion) snap() else tween(durationMillis = 180),
                label = "completionFillColor"
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
            Box(
                modifier = Modifier
                    .size(TaskListDetailMetrics.completionDotSize)
                    .border(
                        width = if (task.completed) 0.dp else 1.5.dp,
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.9f),
                        shape = CircleShape
                    )
                    .offset(x = (-3).dp),
                contentAlignment = Alignment.Center
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
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .heightIn(min = TaskListDetailMetrics.taskContentHeight)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = TaskListDetailMetrics.taskContentHeight)
            ) {
                if (task.date.isNotBlank()) {
                    val displayDate = remember(task.date, languageTag) {
                        formatDateForLocale(task.date, languageTag, "MMM d EEE")
                    }
                    Text(
                        text = displayDate,
                        style = taskDateTextStyle,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier
                            .padding(start = TaskListDetailMetrics.taskTextStartPadding)
                            .offset(y = TaskListDetailMetrics.taskDateTopInset)
                    )
                }
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
                        textStyle = taskTextStyle.copy(color = MaterialTheme.colorScheme.onSurface),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = {
                            hasCommitted = true
                            completeInlineEdit()
                        }),
                        singleLine = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(
                                start = TaskListDetailMetrics.taskTextStartPadding,
                                top = TaskListDetailMetrics.taskTextTopPadding
                            )
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
                        fontWeight = if (task.pinned && !task.completed) FontWeight.Bold else FontWeight.SemiBold,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(
                                start = TaskListDetailMetrics.taskTextStartPadding,
                                top = TaskListDetailMetrics.taskTextTopPadding
                            )
                            .clickable(onClickLabel = t.t("a11y.editTask")) { onTaskClick() }
                    )
                }
            }
        }
        IconButton(
            onClick = onShowActions,
            modifier = Modifier
                .width(TaskListDetailMetrics.trailingDateButtonWidth)
                .height(48.dp)
                .offset(x = TaskListDetailMetrics.trailingActionEndOffset)
        ) {
            Crossfade(
                targetState = task.pinned,
                animationSpec = if (reduceMotion) snap() else tween(durationMillis = 200),
                label = "trailingActionIcon"
            ) { pinned ->
                Icon(
                    imageVector = if (pinned) Icons.Default.PushPin else Icons.Default.CalendarToday,
                    contentDescription = t.t(if (pinned) "pages.tasklist.unpinTask" else "pages.tasklist.setDate"),
                    tint = if (pinned) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                    modifier = Modifier
                        .size(TaskListDetailMetrics.trailingDateIconSize)
                )
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
    return taskDisplayGroup(first) == taskDisplayGroup(second) &&
        (!autoSort || first.date == second.date)
}

private fun getDisplayOrderedTasks(tasks: List<TaskSummary>): List<TaskSummary> {
    return tasks.filter(::hasTaskContent).sortedWith(
        compareBy<TaskSummary> { taskDisplayGroup(it) }
            .thenBy { it.order }
            .thenBy { it.id }
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

private fun reconcileTasks(tasks: List<TaskSummary>, autoSort: Boolean): List<TaskSummary> {
    val validTasks = tasks.filter(::hasTaskContent)
    return if (autoSort) {
        getAutoSortedTasks(validTasks)
    } else {
        renumberTasks(validTasks.sortedBy(::taskDisplayGroup))
    }
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
    autoSort: Boolean = false,
    topInset: androidx.compose.ui.unit.Dp = 0.dp,
    shouldFocusNewTaskInput: Boolean = false,
    onNewTaskInputFocusChange: (Boolean) -> Unit = {},
    allowTaskListDeletion: Boolean = true
) {
    val t = LocalTranslations.current
    val haptic = LocalHapticFeedback.current
    val reduceMotion = rememberReduceMotion()
    val scope = rememberCoroutineScope()
    val db = Firebase.firestore
    var newTaskText by remember { mutableStateOf("") }
    var isNewTaskInputFocused by remember { mutableStateOf(false) }
    var hasNewTaskInputFocus by remember(taskList.id) { mutableStateOf(false) }
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

    LaunchedEffect(shouldFocusNewTaskInput) {
        if (shouldFocusNewTaskInput) {
            newTaskFocusRequester.requestFocus()
        }
    }

    val displayTasks = remember(taskList.tasks, dragOrderedTasks, pendingDisplayedTasks, autoSort) {
        dragOrderedTasks ?: pendingDisplayedTasks ?: getDisplayOrderedTasks(taskList.tasks)
    }
    val taskDensity = LocalDensity.current
    val taskSpacingPx = with(taskDensity) { TaskListDetailMetrics.taskRowSpacing.toPx() }
    val chromeColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.82f)
    val inputBackgroundColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f)
    val detailBodyTextStyle = MaterialTheme.typography.bodyMedium.copy(
        platformStyle = PlatformTextStyle(includeFontPadding = false),
        lineHeightStyle = LineHeightStyle(
            alignment = LineHeightStyle.Alignment.Center,
            trim = LineHeightStyle.Trim.None
        )
    )
    val titleTextStyle = MaterialTheme.typography.titleLarge.copy(
        fontSize = 20.sp,
        fontWeight = FontWeight.Bold
    )
    val inputTextStyle = detailBodyTextStyle.copy(
        fontSize = 16.sp,
        fontWeight = FontWeight.Medium,
        lineHeight = TaskListDetailMetrics.textLineHeight
    )
    val actionTextStyle = MaterialTheme.typography.bodySmall.copy(
        fontSize = 15.sp,
        fontWeight = FontWeight.SemiBold
    )
    val taskContentHeightPx = with(taskDensity) { TaskListDetailMetrics.taskContentHeight.roundToPx() }
    val taskTextStyle = detailBodyTextStyle.copy(
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        lineHeight = TaskListDetailMetrics.textLineHeight
    )
    val taskDateTextStyle = MaterialTheme.typography.labelSmall.copy(
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        platformStyle = PlatformTextStyle(includeFontPadding = false),
        lineHeightStyle = LineHeightStyle(
            alignment = LineHeightStyle.Alignment.Center,
            trim = LineHeightStyle.Trim.None
        ),
        lineHeight = TaskListDetailMetrics.dateLineHeight
    )
    val focusManager = LocalFocusManager.current
    val viewConfiguration = LocalViewConfiguration.current
    val density = LocalDensity.current
    val languageTag = t.languageTag()
    val canSort = remember(displayTasks) { displayTasks.size >= 2 }
    val hasCompletedTasks = remember(displayTasks) { displayTasks.any { it.completed } }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
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
            db.collection("taskLists").document(taskList.id).update(updates).await()
            logDebugSync("task update success taskList=$taskListDebugId")
        }
    }

    fun performTaskMutation(
        buildNextTasks: (List<TaskSummary>) -> List<TaskSummary>,
        additionalUpdates: Map<String, Any> = emptyMap()
    ) {
        val previousTasks = displayTasks
        val nextTasks = reconcileTasks(buildNextTasks(previousTasks), autoSort)
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
                val updatedTasks = currentTasks.map { current ->
                    if (current.id == task.id) current.copy(pinned = nextPinned) else current
                }
                if (currentTask.pinned && !nextPinned && !currentTask.completed && !autoSort) {
                    updatedTasks.filter { taskDisplayGroup(it) == 0 } +
                        updatedTasks.filter { it.id == task.id } +
                        updatedTasks.filter { taskDisplayGroup(it) == 1 && it.id != task.id } +
                        updatedTasks.filter { taskDisplayGroup(it) == 2 }
                } else {
                    updatedTasks
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
                    .padding(bottom = TaskListDetailMetrics.sectionBottomSpacing),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    taskList.name,
                    style = titleTextStyle,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .weight(1f)
                        .semantics { heading() }
                )
                Row(
                    modifier = Modifier.offset(x = TaskListDetailMetrics.headerActionsEndOffset),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = { editName = taskList.name; editBackground = taskList.background; removeListError = null; showEditDialog = true },
                        modifier = Modifier.size(TaskListDetailMetrics.headerActionIconButtonSize)
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = t.t("taskList.editTitle"),
                            modifier = Modifier.size(TaskListDetailMetrics.headerActionIconSize)
                        )
                    }
                    Spacer(Modifier.width(TaskListDetailMetrics.headerActionSpacing))
                    IconButton(
                        onClick = {
                            currentShareCode = normalizedShareCode(taskList.shareCode)
                            shareCopySuccess = false
                            shareError = null
                            showShareDialog = true
                        },
                        modifier = Modifier.size(TaskListDetailMetrics.headerActionIconButtonSize)
                    ) {
                        Icon(
                            Icons.Default.Share,
                            contentDescription = t.t("taskList.share"),
                            modifier = Modifier.size(TaskListDetailMetrics.headerActionIconSize)
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
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(bottom = TaskListDetailMetrics.sectionBottomSpacing)
                )
            }
        }
        item(key = "taskListInput", contentType = "input") {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .onGloballyPositioned { coordinates ->
                        newTaskInputBoundsInRoot = coordinates.boundsInRoot()
                    }
                    .padding(bottom = TaskListDetailMetrics.sectionBottomSpacing),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .onGloballyPositioned { coordinates ->
                            newTaskInputWidthPx = coordinates.size.width
                        },
                    verticalAlignment = Alignment.CenterVertically
                ) {
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
                            .weight(1f)
                            .focusRequester(newTaskFocusRequester)
                            .onFocusChanged { state ->
                                isNewTaskInputFocused = state.isFocused
                                if (state.isFocused) {
                                    hasNewTaskInputFocus = true
                                    onNewTaskInputFocusChange(true)
                                } else if (hasNewTaskInputFocus) {
                                    hasNewTaskInputFocus = false
                                    onNewTaskInputFocusChange(false)
                                }
                            }
                            .heightIn(min = TaskListDetailMetrics.inputMinHeight)
                            .background(inputBackgroundColor, RoundedCornerShape(TaskListDetailMetrics.inputCornerRadius))
                            .border(
                                width = 1.dp,
                                color = MaterialTheme.colorScheme.outlineVariant,
                                shape = RoundedCornerShape(TaskListDetailMetrics.inputCornerRadius)
                            )
                            .padding(
                                horizontal = TaskListDetailMetrics.inputHorizontalPadding,
                                vertical = TaskListDetailMetrics.inputVerticalPadding
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
                                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f)
                                    )
                                }
                                innerTextField()
                            }
                        }
                    )
                    AnimatedVisibility(
                        visible = newTaskText.trim().isNotEmpty(),
                        enter = if (reduceMotion) {
                            EnterTransition.None
                        } else {
                            fadeIn(animationSpec = tween(durationMillis = 180)) +
                                expandHorizontally(
                                    expandFrom = Alignment.Start,
                                    animationSpec = tween(durationMillis = 240)
                                )
                        },
                        exit = if (reduceMotion) {
                            ExitTransition.None
                        } else {
                            fadeOut(animationSpec = tween(durationMillis = 120)) +
                                shrinkHorizontally(
                                    shrinkTowards = Alignment.Start,
                                    animationSpec = tween(durationMillis = 180)
                                )
                        }
                    ) {
                        Box(modifier = Modifier.padding(start = TaskListDetailMetrics.inputActionSpacing)) {
                            IconButton(
                                onClick = {
                                    addTask()
                                    newTaskFocusRequester.requestFocus()
                                },
                                enabled = newTaskText.trim().isNotEmpty(),
                                modifier = Modifier.size(TaskListDetailMetrics.addActionIconButtonSize)
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                    contentDescription = t.t("common.add"),
                                    modifier = Modifier.size(TaskListDetailMetrics.addActionIconSize)
                                )
                            }
                        }
                    }
                }
                DropdownMenu(
                    expanded = isNewTaskInputFocused && historyOptions.isNotEmpty(),
                    onDismissRequest = { focusManager.clearFocus(force = true) },
                    offset = DpOffset(0.dp, 4.dp),
                    properties = PopupProperties(focusable = false, dismissOnClickOutside = false),
                    modifier = Modifier
                        .width(with(density) { newTaskInputWidthPx.toDp() })
                        .heightIn(max = 220.dp)
                ) {
                    historyOptions.forEachIndexed { index, option ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = option,
                                    style = inputTextStyle,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            },
                            onClick = {
                                newTaskText = option
                                addTask()
                                newTaskFocusRequester.requestFocus()
                            }
                        )
                        if (index != historyOptions.lastIndex) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                        }
                    }
                }
            }
        }
        item(key = "taskListActions", contentType = "actions") {
            Column(modifier = Modifier.padding(bottom = TaskListDetailMetrics.actionsBottomSpacing)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = TaskListDetailMetrics.actionRowVerticalPadding),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier
                            .clickable(enabled = canSort) { sortTasks() }
                            .padding(vertical = TaskListDetailMetrics.actionControlVerticalPadding),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.FilterList,
                            contentDescription = t.t("pages.tasklist.sort"),
                            modifier = Modifier.size(TaskListDetailMetrics.actionControlIconSize),
                            tint = if (canSort) chromeColor else chromeColor.copy(alpha = 0.45f)
                        )
                        Spacer(Modifier.width(TaskListDetailMetrics.actionControlIconSpacing))
                        Text(
                            t.t("pages.tasklist.sort"),
                            style = actionTextStyle,
                            color = if (canSort) chromeColor else chromeColor.copy(alpha = 0.45f)
                        )
                    }
                    Row(
                        modifier = Modifier
                            .clickable(enabled = hasCompletedTasks) { showDeleteCompletedConfirm = true }
                            .padding(vertical = TaskListDetailMetrics.actionControlVerticalPadding),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val deleteEnabled = hasCompletedTasks
                        Text(
                            t.t("pages.tasklist.deleteCompleted"),
                            style = actionTextStyle,
                            color = if (deleteEnabled) chromeColor else chromeColor.copy(alpha = 0.45f)
                        )
                        Spacer(Modifier.width(TaskListDetailMetrics.actionControlIconSpacing))
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = t.t("pages.tasklist.deleteCompleted"),
                            modifier = Modifier.size(TaskListDetailMetrics.actionControlIconSize).offset(x = 2.dp),
                            tint = if (deleteEnabled) chromeColor else chromeColor.copy(alpha = 0.45f)
                        )
                    }
                }
            }
        }
        if (displayTasks.isEmpty()) {
            item(key = "emptyState", contentType = "emptyState") {
                Box(
                    modifier = Modifier
                        .fillParentMaxHeight()
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(t.t("pages.tasklist.noTasks"), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
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
                    index = index,
                    isEditing = isEditing,
                    isDragged = isDragged,
                    isExiting = exitingTaskIds.contains(task.id),
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
        AlertDialog(
            onDismissRequest = {
                if (!removingList) {
                    showEditDialog = false
                }
            },
            title = { Text(t.t("taskList.editTitle")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    removeListError?.let { error ->
                        Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        label = { Text(t.t("app.taskListName")) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !removingList
                    )
                    TaskListColorPicker(
                        selected = editBackground,
                        enabled = !removingList
                    ) { editBackground = it }
                    if (allowTaskListDeletion) {
                        Button(
                            onClick = { showRemoveListConfirm = true },
                            enabled = !removingList,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.error,
                                contentColor = MaterialTheme.colorScheme.onError
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(if (removingList) t.t("common.deleting") else t.t("taskList.deleteList"))
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
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
                            }
                            if (updates.size <= 1) {
                                showEditDialog = false
                            }
                        }
                    },
                    enabled = editName.trim().isNotEmpty() && !removingList
                ) { Text(t.t("taskList.save")) }
            },
            dismissButton = {
                TextButton(
                    onClick = { showEditDialog = false },
                    enabled = !removingList
                ) { Text(t.t("common.cancel")) }
            }
        )
    }

    if (showRemoveListConfirm) {
        AlertDialog(
            onDismissRequest = {
                if (!removingList) {
                    showRemoveListConfirm = false
                }
            },
            title = { Text(t.t("taskList.deleteListConfirm.title")) },
            text = { Text(t.t("taskList.deleteListConfirm.message")) },
            confirmButton = {
                TextButton(
                    onClick = { removeTaskList() },
                    enabled = !removingList
                ) {
                    Text(
                        if (removingList) t.t("common.deleting") else t.t("auth.button.delete"),
                        color = MaterialTheme.colorScheme.error
                    )
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showRemoveListConfirm = false },
                    enabled = !removingList
                ) { Text(t.t("common.cancel")) }
            }
        )
    }

    if (showDeleteCompletedConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteCompletedConfirm = false },
            title = { Text(t.t("pages.tasklist.deleteCompletedConfirmTitle")) },
            confirmButton = {
                TextButton(onClick = { deleteCompletedTasks(); showDeleteCompletedConfirm = false }) {
                    Text(t.t("auth.button.delete"), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteCompletedConfirm = false }) { Text(t.t("common.cancel")) }
            }
        )
    }

    if (showShareDialog) {
        val clipboard = LocalClipboard.current
        AlertDialog(
            onDismissRequest = { showShareDialog = false },
            title = { Text(t.t("taskList.shareTitle")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    val err = shareError
                    if (err != null) {
                        Text(
                            err,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }

                    val code = currentShareCode
                    if (code != null) {
                        Text(
                            t.t("taskList.shareCode"),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    code,
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
                                )
                                TextButton(onClick = {
                                    scope.launch {
                                        clipboard.setClipEntry(
                                            ClipEntry(ClipData.newPlainText("share_code", code))
                                        )
                                        shareCopySuccess = true
                                    }
                                }) {
                                    Text(if (shareCopySuccess) t.t("common.copied") else t.t("common.copy"))
                                }
                            }
                        }
                        TextButton(
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
                            enabled = !removingShareCode,
                            colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                        ) {
                            Text(if (removingShareCode) t.t("common.deleting") else t.t("taskList.removeShare"))
                        }
                    } else {
                        Text(
                            t.t("taskList.shareDescription"),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Button(
                            onClick = {
                                scope.launch {
                                    generatingShareCode = true
                                    shareError = null
                                    try {
                                        val code = generateShareCode(taskList.id)
                                        logShareCodeGenerate()
                                        currentShareCode = code
                                    } catch (e: Exception) {
                                        shareError = t.t("common.error")
                                    } finally {
                                        generatingShareCode = false
                                    }
                                }
                            },
                            enabled = !generatingShareCode,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(if (generatingShareCode) t.t("common.loading") else t.t("taskList.generateShare"))
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showShareDialog = false }) { Text(t.t("common.close")) }
            }
        )
    }

    actionSheetState?.let { actionState ->
        val task = displayTasks.firstOrNull { it.id == actionState.taskId }
        if (task == null) {
            LaunchedEffect(actionState.taskId) {
                actionSheetState = null
            }
        } else {
            key(task.id) {
                val initialSelectedMillis = remember(task.date) {
                    task.date.takeIf { it.isNotBlank() }?.let { date ->
                        runCatching {
                            SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                                timeZone = TimeZone.getTimeZone("UTC")
                            }.parse(date)?.time
                        }.getOrNull()
                    }
                }
                val datePickerState = rememberDatePickerState(
                    initialSelectedDateMillis = initialSelectedMillis
                )
                var ignoreInitialSelection by remember(task.id) { mutableStateOf(true) }
                val pinnedLabel = t.t(if (task.pinned) "pages.tasklist.unpinTask" else "pages.tasklist.pinTask")
                LaunchedEffect(datePickerState.selectedDateMillis) {
                    val millis = datePickerState.selectedDateMillis ?: return@LaunchedEffect
                    if (ignoreInitialSelection) {
                        ignoreInitialSelection = false
                        if (initialSelectedMillis == millis) return@LaunchedEffect
                    }
                    val nextDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }.format(Date(millis))
                    if (nextDate == task.date) return@LaunchedEffect
                    commitDate(task, nextDate)
                    actionSheetState = null
                }
                ModalBottomSheet(
                    onDismissRequest = { actionSheetState = null },
                    sheetState = sheetState,
                    sheetMaxWidth = Dp.Unspecified,
                    modifier = Modifier.semantics {
                        paneTitle = t.t("pages.tasklist.setDate")
                    }
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 640.dp)
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp)
                            .padding(bottom = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(onClick = { actionSheetState = null }) {
                                Text(t.t("common.close"))
                            }
                        }
                        Surface(
                            onClick = {
                                togglePinned(task)
                                actionSheetState = null
                            },
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceDim,
                            modifier = Modifier
                                .fillMaxWidth()
                                .semantics {
                                    contentDescription = pinnedLabel
                                    role = Role.Switch
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.PushPin, contentDescription = null)
                                    Text(pinnedLabel)
                                }
                                Switch(checked = task.pinned, onCheckedChange = null)
                            }
                        }
                        TextButton(
                            onClick = {
                                if (task.date.isBlank()) return@TextButton
                                commitDate(task, "")
                                actionSheetState = null
                            },
                            modifier = Modifier.height(48.dp),
                            enabled = task.date.isNotBlank()
                        ) {
                            Text(t.t("pages.tasklist.clearDate"))
                        }
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceDim,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            DatePicker(
                                state = datePickerState,
                                modifier = Modifier.fillMaxWidth(),
                                title = null,
                                headline = null,
                                showModeToggle = false
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
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            content()
        }
    }
}

@Composable
private fun SettingsSelectRow(label: String, value: String, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(value, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                modifier = Modifier.size(AppIconMetrics.standardActionIconSize),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun SettingsActionRow(
    label: String,
    enabled: Boolean,
    color: Color = MaterialTheme.colorScheme.onSurface,
    onClick: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(enabled = enabled, onClick = onClick)
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = color)
    }
}

@Composable
private fun SettingsOptionDialog(
    title: String,
    options: List<Pair<String, String>>,
    selected: String,
    scrollable: Boolean = false,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val t = LocalTranslations.current
    val scrollState = rememberScrollState()
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(if (scrollable) Modifier.verticalScroll(scrollState) else Modifier) {
                options.forEach { (option, label) ->
                    Row(
                        Modifier.fillMaxWidth().clickable {
                            onSelect(option)
                            onDismiss()
                        }.padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(label, Modifier.weight(1f))
                        if (selected == option) {
                            Icon(
                                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                contentDescription = t.t("common.selected"),
                                modifier = Modifier.size(AppIconMetrics.standardActionIconSize)
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text(t.t("common.cancel")) }
        }
    )
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun SettingsView(
    navController: NavController? = null,
    showTopBar: Boolean = true
) {
    val t = LocalTranslations.current
    val context = LocalContext.current
    val userId = Firebase.auth.currentUser?.uid
    val uiState = rememberSettingsState(userId)
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
    val manualLicenses = remember(context) { loadManualLicenses(context) }

    fun updateSettings(partial: Map<String, Any>) {
        if (userId == null) return
        Firebase.firestore.collection("settings").document(userId)
            .set(partial + mapOf("updatedAt" to nowMillis()), SetOptions.merge())
    }

    DetailScreenScaffold(
        title = t.t("settings.title"),
        onBack = if (navController != null) ({ navController.navigateUp() }) else null,
        showTopBar = showTopBar,
        backgroundColor = MaterialTheme.colorScheme.surfaceDim
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .widthIn(max = 768.dp)
                .align(Alignment.CenterHorizontally)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 24.dp)
        ) {
            if (uiState.isLoading) {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                if (uiState.hasError) {
                    Text(
                        t.t("app.loadError"),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
                SettingsSectionCard(title = t.t("settings.userInfo.title")) {
                    Text(
                        uiState.userEmail,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
                    )
                    HorizontalDivider()
                    SettingsSelectRow(label = t.t("settings.emailChange.title"), value = "") {
                        showEmailChangeDialog = true
                    }
                }
                Spacer(Modifier.height(16.dp))
                SettingsSectionCard(title = t.t("settings.preferences.title")) {
                    SettingsSelectRow(
                        label = t.t("settings.language.title"),
                        value = supportedLanguages.firstOrNull { it.first == uiState.language }?.second ?: uiState.language
                    ) { showLanguageDialog = true }
                    HorizontalDivider()
                    SettingsSelectRow(t.t("settings.theme.title"), settingsThemeLabel(t, uiState.theme)) { showThemeDialog = true }
                    HorizontalDivider()
                    SettingsSelectRow(
                        t.t("settings.startupView.title"),
                        settingsStartupViewLabel(t, uiState.startupView)
                    ) { showStartupViewDialog = true }
                    HorizontalDivider()
                    SettingsSelectRow(
                        t.t("settings.taskInsertPosition.title"),
                        settingsTaskInsertPositionLabel(t, uiState.taskInsertPosition)
                    ) { showPositionDialog = true }
                    HorizontalDivider()
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(
                            Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            Text(t.t("settings.autoSort.title"))
                            Text(
                                t.t("settings.autoSort.enable"),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = uiState.autoSort,
                            onCheckedChange = { logSettingsAutoSortChange(enabled = it); updateSettings(mapOf("autoSort" to it)) }
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
                SettingsSectionCard(title = t.t("settings.legal.title")) {
                    SettingsSelectRow(
                        label = t.t("settings.licenses.openSource"),
                        value = ""
                    ) {
                        try {
                            OssLicensesMenuActivity.setActivityTitle(t.t("settings.licenses.openSource"))
                            context.startActivity(Intent(context, OssLicensesMenuActivity::class.java))
                        } catch (e: Exception) {
                            recordNonFatalException("open_source_licenses", e)
                            errorMessage = t.t("settings.licenses.loadError")
                        }
                    }
                    HorizontalDivider()
                    SettingsSelectRow(
                        label = t.t("settings.licenses.bundledAssets"),
                        value = ""
                    ) { showBundledLicensesSheet = true }
                }
                Spacer(Modifier.height(16.dp))
                SettingsSectionCard(title = t.t("settings.actions.title")) {
                    SettingsActionRow(
                        label = if (isSigningOut) t.t("settings.signingOut") else t.t("settings.danger.signOut"),
                        enabled = !isSigningOut,
                        onClick = { showSignOutDialog = true }
                    )
                    HorizontalDivider()
                    SettingsActionRow(
                        label = if (isDeletingAccount) t.t("settings.deletingAccount") else t.t("settings.danger.deleteAccount"),
                        enabled = !isDeletingAccount,
                        color = MaterialTheme.colorScheme.error,
                        onClick = { showDeleteDialog = true }
                    )
                }
                errorMessage?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }

    if (showSignOutDialog) {
        AlertDialog(
            onDismissRequest = { showSignOutDialog = false },
            title = { Text(t.t("auth.button.signOut")) },
            text = { Text(t.t("auth.signOutConfirm.message")) },
            confirmButton = {
                TextButton(onClick = {
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
                }) { Text(t.t("auth.button.signOut")) }
            },
            dismissButton = { TextButton(onClick = { showSignOutDialog = false }) { Text(t.t("common.cancel")) } }
        )
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(t.t("settings.danger.deleteAccount")) },
            text = { Text(t.t("auth.deleteAccountConfirm.message")) },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteDialog = false
                    isDeletingAccount = true
                    errorMessage = null
                    scope.launch {
                        try {
                            val user = Firebase.auth.currentUser ?: return@launch
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
                }) { Text(t.t("auth.button.delete"), color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { showDeleteDialog = false }) { Text(t.t("common.cancel")) } }
        )
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
            scrollable = true,
            onSelect = { code ->
                logSettingsLanguageChange(language = code)
                updateSettings(mapOf("language" to code))
            },
            onDismiss = { showLanguageDialog = false }
        )
    }

    if (showEmailChangeDialog) {
        AlertDialog(
            onDismissRequest = { showEmailChangeDialog = false },
            title = { Text(t.t("settings.emailChange.title")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = newEmail,
                        onValueChange = { newEmail = it },
                        label = { Text(t.t("settings.emailChange.newEmailLabel")) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().semantics {
                            contentType = ContentType.NewUsername + ContentType.EmailAddress
                        }
                    )
                    emailChangeError?.let {
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                    if (emailChangeSuccess) {
                        Text(t.t("settings.emailChange.successMessage"), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
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
                    },
                    enabled = !isChangingEmail && newEmail.isNotBlank()
                ) { Text(if (isChangingEmail) "..." else t.t("settings.emailChange.submitButton")) }
            },
            dismissButton = {
                TextButton(onClick = {
                    showEmailChangeDialog = false
                    newEmail = ""
                    emailChangeError = null
                    emailChangeSuccess = false
                }) { Text(t.t("common.cancel")) }
            }
        )
    }

    if (showBundledLicensesSheet) {
        ModalBottomSheet(
            onDismissRequest = { showBundledLicensesSheet = false }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    t.t("settings.licenses.bundledAssets"),
                    style = MaterialTheme.typography.titleMedium
                )
                if (manualLicenses.isEmpty()) {
                    Text(
                        t.t("settings.licenses.loadError"),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                } else {
                    manualLicenses.forEachIndexed { index, license ->
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(license.name, style = MaterialTheme.typography.titleSmall)
                            Text(
                                license.license,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            license.source?.let { source ->
                                Text(
                                    source,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                            Text(
                                license.text,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        if (index != manualLicenses.lastIndex) {
                            HorizontalDivider()
                        }
                    }
                }
                TextButton(
                    onClick = { showBundledLicensesSheet = false },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(t.t("common.close"))
                }
            }
        }
    }
}
