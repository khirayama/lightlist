package com.example.lightlist

import android.content.Context
import android.os.Bundle
import android.text.format.DateFormat
import android.util.Log
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.foundation.isSystemInDarkTheme
import com.example.lightlist.ui.theme.LightlistTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import com.google.firebase.firestore.FieldPath
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.firestore
import kotlinx.coroutines.flow.collectLatest
import androidx.compose.foundation.border
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Switch
import androidx.compose.material3.TextButton
import androidx.compose.runtime.rememberCoroutineScope
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.focus.FocusManager
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.TextRange
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.ui.platform.LocalFocusManager
import java.util.Calendar
import java.util.TimeZone
import java.text.SimpleDateFormat
import java.util.Locale
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.zIndex
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.input.pointer.pointerInput
import com.google.firebase.firestore.FieldValue
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.key
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.analytics
import com.google.firebase.crashlytics.FirebaseCrashlytics
import java.text.DateFormatSymbols
import org.json.JSONObject

class Translations {
    private var dict: JSONObject = JSONObject()
    private var currentLanguage = "ja"

    companion object {
        private val supported = listOf("ja","en","es","de","fr","ko","zh-CN","hi","ar","pt-BR","id")
    }

    fun load(context: Context, language: String) {
        val lang = if (supported.contains(language)) language else "ja"
        currentLanguage = lang
        try {
            val json = context.assets.open("locales/$lang.json").bufferedReader().readText()
            dict = JSONObject(json)
        } catch (_: Exception) {
            dict = JSONObject()
        }
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
}

private fun log(eventName: String, params: Bundle? = null) {
    if (BuildConfig.DEBUG) {
        val map = params?.let { bundle ->
            bundle.keySet().associateWith { bundle.get(it) }
        } ?: emptyMap<String, Any?>()
        Log.d("analytics", "$eventName $map")
    }
    Firebase.analytics.logEvent(eventName, params)
}

private fun log(eventName: String, block: Bundle.() -> Unit) {
    log(eventName, Bundle().apply(block))
}

fun logSignUp() = log(FirebaseAnalytics.Event.SIGN_UP) { putString(FirebaseAnalytics.Param.METHOD, "email") }
fun logLogin() = log(FirebaseAnalytics.Event.LOGIN) { putString(FirebaseAnalytics.Param.METHOD, "email") }
fun logSignOut() = log("app_sign_out")
fun logDeleteAccount() = log("app_delete_account")
fun logPasswordResetEmailSent() = log("app_password_reset_email_sent")
fun logEmailChangeRequested() = log("app_email_change_requested")
fun logTaskListCreate() = log("app_task_list_create")
fun logTaskListDelete() = log("app_task_list_delete")
fun logTaskListReorder() = log("app_task_list_reorder")
fun logTaskAdd(hasDate: Boolean) = log("app_task_add") { putBoolean("has_date", hasDate) }
fun logTaskUpdate(fields: String) = log("app_task_update") { putString("fields", fields) }
fun logTaskDelete() = log("app_task_delete")
fun logTaskReorder() = log("app_task_reorder")
fun logTaskSort() = log("app_task_sort")
fun logTaskDeleteCompleted(count: Int) = log("app_task_delete_completed") { putInt("count", count) }
fun logShareCodeGenerate() = log("app_share_code_generate")
fun logShareCodeRemove() = log("app_share_code_remove")
fun logShareCodeJoin() = log("app_share_code_join")
fun logShare() = log(FirebaseAnalytics.Event.SHARE) {
    putString(FirebaseAnalytics.Param.METHOD, "share_code")
    putString(FirebaseAnalytics.Param.CONTENT_TYPE, "task_list")
}
fun logSettingsThemeChange(theme: String) = log("app_settings_theme_change") { putString("theme", theme) }
fun logSettingsLanguageChange(language: String) = log("app_settings_language_change") { putString("language", language) }
fun logSettingsTaskInsertPositionChange(position: String) = log("app_settings_task_insert_position_change") { putString("position", position) }
fun logSettingsAutoSortChange(enabled: Boolean) = log("app_settings_auto_sort_change") { putBoolean("enabled", enabled) }

fun logException(description: String, fatal: Boolean) {
    log("app_exception") { putString("description", description); putBoolean("fatal", fatal) }
    FirebaseCrashlytics.getInstance().recordException(RuntimeException(description))
}

val LocalTranslations = compositionLocalOf { Translations() }

sealed class AppRoute(val route: String, val title: String) {
    data object TaskLists : AppRoute("TaskLists", "TaskLists")
    data object Settings : AppRoute("Settings", "Settings")
    data object TaskList : AppRoute("TaskList/{taskListId}", "TaskList") {
        const val argumentName = "taskListId"

        fun createRoute(taskListId: String): String = "TaskList/$taskListId"
    }
}

sealed class PendingDeepLink {
    data class PasswordReset(val code: String) : PendingDeepLink()
    data class ShareCode(val shareCode: String) : PendingDeepLink()
}

private enum class AuthScreen {
    SignIn,
    SignUp,
    Reset
}

private data class TaskSummary(
    val id: String,
    val text: String,
    val completed: Boolean,
    val date: String,
    val order: Double
)

private data class TaskListSummary(
    val id: String,
    val name: String,
    val taskCount: Int,
    val memberCount: Int,
    val background: String?
)

private data class TaskListDetail(
    val id: String,
    val name: String,
    val tasks: List<TaskSummary>,
    val memberCount: Int,
    val background: String? = null,
    val shareCode: String? = null
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
    val dateValue: java.util.Date
)

private const val TASK_LIST_NOT_FOUND_ERROR = "TASK_LIST_NOT_FOUND"
private const val SHARE_CODE_GENERATION_FAILED_ERROR = "SHARE_CODE_GENERATION_FAILED"
private const val TASK_LIST_ORDER_NOT_FOUND_ERROR = "TASK_LIST_ORDER_NOT_FOUND"
private const val TASK_LIST_ALREADY_ADDED_ERROR = "TASK_LIST_ALREADY_ADDED"
private const val TABLET_MIN_WIDTH_DP = 840
private object TaskListDetailMetrics {
    val topBarHeight = 48.dp
    val indicatorTopOffset = 4.dp
    val indicatorContentInset = 42.dp
    val indicatorTouchSize = 24.dp
    val indicatorDotSize = 7.dp
    val headerActionIconButtonSize = 28.dp
    val headerActionIconSize = 16.dp
    val headerActionSpacing = 10.dp
    val inputCornerRadius = 14.dp
    val inputHorizontalPadding = 14.dp
    val inputVerticalPadding = 10.dp
    val inputActionSpacing = 8.dp
    val addActionIconButtonSize = 32.dp
    val addActionIconSize = 16.dp
    val actionRowVerticalPadding = 2.dp
    val actionControlVerticalPadding = 2.dp
    val sectionBottomSpacing = 14.dp
    val actionsBottomSpacing = 8.dp
    val taskRowSpacing = 4.dp
    val taskRowVerticalPadding = 6.dp
    val taskContentHeight = 48.dp
    val taskDateTopInset = (-3).dp
    val dragHandleTopPadding = 0.dp
    val dragHandleEndPadding = 0.dp
    val dragHandleTouchWidth = 16.dp
    val completionTopPadding = 1.dp
    val completionEndPadding = 0.dp
    val completionTouchWidth = 26.dp
    val completionDotSize = 18.dp
    val taskTextStartPadding = 3.dp
    val trailingDateButtonWidth = 22.dp
    val trailingDateIconSize = 17.dp
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

private val INITIAL_TASK_LIST_NAME_BY_LANGUAGE = mapOf(
    "ja" to "\uD83D\uDCD2個人",
    "en" to "\uD83D\uDCD2PERSONAL",
    "es" to "\uD83D\uDCD2PERSONAL",
    "de" to "\uD83D\uDCD2PERSÖNLICH",
    "fr" to "\uD83D\uDCD2PERSONNEL",
    "ko" to "\uD83D\uDCD2개인",
    "zh-CN" to "\uD83D\uDCD2个人",
    "hi" to "\uD83D\uDCD2व्यक्तिगत",
    "ar" to "\uD83D\uDCD2شخصية",
    "pt-BR" to "\uD83D\uDCD2PESSOAL",
    "id" to "\uD83D\uDCD2PRIBADI"
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
    return if (
        listOf("ja", "en", "es", "de", "fr", "ko", "zh-CN", "hi", "ar", "pt-BR", "id")
            .contains(language)
    ) {
        language
    } else {
        "ja"
    }
}

private fun isValidEmail(email: String): Boolean {
    return Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").matches(email)
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

private suspend fun signUpWithInitialData(email: String, password: String, language: String) {
    val auth = Firebase.auth
    val db = Firebase.firestore
    val normalizedLanguage = normalizeLanguageCode(language)
    val userCredential = auth.createUserWithEmailAndPassword(email, password).await()
    val uid = userCredential.user?.uid ?: throw IllegalStateException("Missing user ID")
    val now = System.currentTimeMillis()
    val taskListId = db.collection("taskLists").document().id
    val settingsData = mapOf(
        "theme" to "system",
        "language" to normalizedLanguage,
        "taskInsertPosition" to "top",
        "autoSort" to false,
        "createdAt" to now,
        "updatedAt" to now
    )
    val taskListData = hashMapOf<String, Any?>(
        "id" to taskListId,
        "name" to (INITIAL_TASK_LIST_NAME_BY_LANGUAGE[normalizedLanguage]
            ?: INITIAL_TASK_LIST_NAME_BY_LANGUAGE.getValue("ja")),
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
        .setHandleCodeInApp(false)
        .build()
    auth.sendPasswordResetEmail(email, actionCodeSettings).await()
}

private enum class TabletPane {
    TaskList,
    Settings
}

private data class TaskListsUiState(
    val taskLists: List<TaskListSummary> = emptyList(),
    val isLoading: Boolean = false,
    val hasError: Boolean = false
)

private data class TaskListDetailsUiState(
    val taskLists: List<TaskListDetail> = emptyList(),
    val isLoading: Boolean = false,
    val hasError: Boolean = false
)

private data class SettingsUiState(
    val theme: String = "system",
    val language: String = "ja",
    val taskInsertPosition: String = "bottom",
    val autoSort: Boolean = false,
    val userEmail: String = "",
    val isLoading: Boolean = true
)

@Composable
fun ContentView(
    pendingDeepLink: PendingDeepLink?,
    onPendingDeepLinkConsumed: () -> Unit
) {
    val navController = rememberNavController()
    var isLoggedIn by remember { mutableStateOf(Firebase.auth.currentUser != null) }
    var currentUserId by remember { mutableStateOf(Firebase.auth.currentUser?.uid) }
    var authScreen by rememberSaveable { mutableStateOf(AuthScreen.SignIn) }
    var pendingPasswordResetCode by rememberSaveable { mutableStateOf<String?>(null) }
    var pendingShareCode by rememberSaveable { mutableStateOf<String?>(null) }
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

    val settingsState = rememberSettingsUiState(currentUserId)
    val context = LocalContext.current
    val translations = remember { Translations() }
    LaunchedEffect(settingsState.language) {
        translations.load(context, settingsState.language)
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
                pendingShareCode = pendingDeepLink.shareCode
            }
            null -> Unit
        }
        if (pendingDeepLink != null) {
            onPendingDeepLinkConsumed()
        }
    }

    LaunchedEffect(isLoggedIn, pendingShareCode) {
        if (!isLoggedIn) {
            return@LaunchedEffect
        }

        val normalized = pendingShareCode?.trim()?.uppercase()?.takeIf { it.isNotEmpty() }
            ?: return@LaunchedEffect
        pendingShareCode = null

        try {
            val taskListId = fetchTaskListIdByShareCode(normalized) ?: return@LaunchedEffect
            try {
                addSharedTaskListToOrder(taskListId)
                logShareCodeJoin()
            } catch (_: Exception) {
            }
            requestedTaskListId = taskListId
        } catch (_: Exception) {
        }
    }

    LightlistTheme(darkTheme = darkTheme) {
    key(settingsState.language) {
    CompositionLocalProvider(LocalTranslations provides translations) {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        if (pendingPasswordResetCode != null) {
            ResetPasswordView(
                code = pendingPasswordResetCode!!,
                onDismiss = { pendingPasswordResetCode = null }
            )
        } else {
            val isTabletLayout = isLoggedIn && maxWidth >= TABLET_MIN_WIDTH_DP.dp

            if (isTabletLayout) {
                TabletContentView(
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
                            slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(300))
                        },
                        exitTransition = {
                            slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(300))
                        },
                        popEnterTransition = {
                            slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(300))
                        },
                        popExitTransition = {
                            slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(300))
                        }
                    ) {
                        composable(AppRoute.TaskLists.route) { TaskListsView(navController, currentUserId) }
                        composable(
                            route = AppRoute.TaskList.route,
                            arguments = listOf(navArgument(AppRoute.TaskList.argumentName) { type = NavType.StringType })
                        ) { backStackEntry ->
                            val initialTaskListId =
                                backStackEntry.arguments?.getString(AppRoute.TaskList.argumentName).orEmpty()
                            TaskListView(navController, currentUserId, initialTaskListId)
                        }
                        composable(AppRoute.Settings.route) { SettingsView(navController = navController) }
                    }

                    LaunchedEffect(isLoggedIn) {
                        if (isLoggedIn && navController.currentDestination?.route == AppRoute.TaskLists.route) {
                            navController.navigate(AppRoute.TaskList.createRoute("__initial__"))
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
                        language = settingsState.language,
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
private fun rememberTaskListsUiState(userId: String?): TaskListsUiState {
    var uiState by remember(userId) {
        mutableStateOf(
            TaskListsUiState(
                isLoading = userId != null,
                hasError = false
            )
        )
    }

    DisposableEffect(userId) {
        if (userId == null) {
            uiState = TaskListsUiState()
            onDispose {}
        } else {
            val db = Firebase.firestore
            var orderedTaskListIds = emptyList<String>()
            var taskListIdsKey = ""
            var taskListsById = emptyMap<String, TaskListSummary>()
            var taskListChunkListeners = emptyList<ListenerRegistration>()

            fun publish() {
                uiState = TaskListsUiState(
                    taskLists = orderedTaskListIds.mapNotNull { taskListsById[it] },
                    isLoading = false,
                    hasError = false
                )
            }

            fun subscribeToTaskLists(taskListIds: List<String>) {
                val nextKey = taskListIds.sorted().joinToString("|")
                if (taskListIdsKey == nextKey) {
                    publish()
                    return
                }
                taskListIdsKey = nextKey
                taskListChunkListeners.forEach { it.remove() }
                taskListChunkListeners = emptyList()
                taskListsById = taskListsById.filterKeys { taskListIds.contains(it) }

                if (taskListIds.isEmpty()) {
                    publish()
                    return
                }

                val listeners = mutableListOf<ListenerRegistration>()
                taskListIds.chunked(10).forEach { chunk ->
                    val listener = db.collection("taskLists")
                        .whereIn(FieldPath.documentId(), chunk)
                        .addSnapshotListener { snapshot, error ->
                            if (error != null) {
                                uiState = uiState.copy(isLoading = false, hasError = true)
                                return@addSnapshotListener
                            }

                            val nextTaskListsById = taskListsById.toMutableMap()
                            snapshot?.documentChanges?.forEach { change ->
                                val taskListId = change.document.id
                                if (change.type.name == "REMOVED") {
                                    nextTaskListsById.remove(taskListId)
                                } else {
                                    nextTaskListsById[taskListId] =
                                        parseTaskListSummary(taskListId, change.document.data)
                                }
                            }
                            taskListsById = nextTaskListsById
                            publish()
                        }
                    listeners += listener
                }
                taskListChunkListeners = listeners
            }

            uiState = TaskListsUiState(isLoading = true, hasError = false)
            val taskListOrderListener = db.collection("taskListOrder")
                .document(userId)
                .addSnapshotListener { snapshot, error ->
                    if (error != null) {
                        uiState = TaskListsUiState(isLoading = false, hasError = true)
                        return@addSnapshotListener
                    }

                    orderedTaskListIds = parseOrderedTaskListIds(snapshot?.data ?: emptyMap<String, Any>())
                    subscribeToTaskLists(orderedTaskListIds)
                }

            onDispose {
                taskListOrderListener.remove()
                taskListChunkListeners.forEach { it.remove() }
            }
        }
    }

    return uiState
}

@Composable
private fun rememberTaskListDetailsUiState(userId: String?): TaskListDetailsUiState {
    var uiState by remember(userId) {
        mutableStateOf(
            TaskListDetailsUiState(
                isLoading = userId != null,
                hasError = false
            )
        )
    }

    DisposableEffect(userId) {
        if (userId == null) {
            uiState = TaskListDetailsUiState()
            onDispose {}
        } else {
            val db = Firebase.firestore
            var orderedTaskListIds = emptyList<String>()
            var taskListIdsKey = ""
            var taskListsById = emptyMap<String, TaskListDetail>()
            var taskListChunkListeners = emptyList<ListenerRegistration>()

            fun publish() {
                uiState = TaskListDetailsUiState(
                    taskLists = orderedTaskListIds.mapNotNull { taskListsById[it] },
                    isLoading = false,
                    hasError = false
                )
            }

            fun subscribeToTaskLists(taskListIds: List<String>) {
                val nextKey = taskListIds.sorted().joinToString("|")
                if (taskListIdsKey == nextKey) {
                    publish()
                    return
                }
                taskListIdsKey = nextKey
                taskListChunkListeners.forEach { it.remove() }
                taskListChunkListeners = emptyList()
                taskListsById = taskListsById.filterKeys { taskListIds.contains(it) }

                if (taskListIds.isEmpty()) {
                    publish()
                    return
                }

                val listeners = mutableListOf<ListenerRegistration>()
                taskListIds.chunked(10).forEach { chunk ->
                    val listener = db.collection("taskLists")
                        .whereIn(FieldPath.documentId(), chunk)
                        .addSnapshotListener { snapshot, error ->
                            if (error != null) {
                                uiState = uiState.copy(isLoading = false, hasError = true)
                                return@addSnapshotListener
                            }

                            val nextTaskListsById = taskListsById.toMutableMap()
                            snapshot?.documentChanges?.forEach { change ->
                                val taskListId = change.document.id
                                if (change.type.name == "REMOVED") {
                                    nextTaskListsById.remove(taskListId)
                                } else {
                                    nextTaskListsById[taskListId] =
                                        parseTaskListDetail(taskListId, change.document.data)
                                }
                            }
                            taskListsById = nextTaskListsById
                            publish()
                        }
                    listeners += listener
                }
                taskListChunkListeners = listeners
            }

            uiState = TaskListDetailsUiState(isLoading = true, hasError = false)
            val taskListOrderListener = db.collection("taskListOrder")
                .document(userId)
                .addSnapshotListener { snapshot, error ->
                    if (error != null) {
                        uiState = TaskListDetailsUiState(isLoading = false, hasError = true)
                        return@addSnapshotListener
                    }

                    orderedTaskListIds = parseOrderedTaskListIds(snapshot?.data ?: emptyMap<String, Any>())
                    subscribeToTaskLists(orderedTaskListIds)
                }

            onDispose {
                taskListOrderListener.remove()
                taskListChunkListeners.forEach { it.remove() }
            }
        }
    }

    return uiState
}

@Composable
private fun rememberCalendarTaskLists(userId: String?): List<TaskListDetail> {
    var taskLists by remember(userId) { mutableStateOf(emptyList<TaskListDetail>()) }

    DisposableEffect(userId) {
        if (userId == null) {
            taskLists = emptyList()
            onDispose {}
        } else {
            val db = Firebase.firestore
            var orderedTaskListIds = emptyList<String>()
            var taskListIdsKey = ""
            var taskListsById = emptyMap<String, TaskListDetail>()
            var taskListChunkListeners = emptyList<ListenerRegistration>()

            fun publish() {
                taskLists = orderedTaskListIds.mapNotNull { taskListsById[it] }
            }

            fun subscribeToTaskLists(taskListIds: List<String>) {
                val nextKey = taskListIds.sorted().joinToString("|")
                if (taskListIdsKey == nextKey) { publish(); return }
                taskListIdsKey = nextKey
                taskListChunkListeners.forEach { it.remove() }
                taskListChunkListeners = emptyList()
                taskListsById = taskListsById.filterKeys { taskListIds.contains(it) }
                if (taskListIds.isEmpty()) { publish(); return }
                val listeners = mutableListOf<ListenerRegistration>()
                taskListIds.chunked(10).forEach { chunk ->
                    val listener = db.collection("taskLists")
                        .whereIn(FieldPath.documentId(), chunk)
                        .addSnapshotListener { snapshot, error ->
                            if (error != null) return@addSnapshotListener
                            val next = taskListsById.toMutableMap()
                            snapshot?.documentChanges?.forEach { change ->
                                val id = change.document.id
                                if (change.type.name == "REMOVED") {
                                    next.remove(id)
                                } else {
                                    next[id] = parseTaskListDetail(id, change.document.data)
                                }
                            }
                            taskListsById = next
                            publish()
                        }
                    listeners += listener
                }
                taskListChunkListeners = listeners
            }

            val taskListOrderListener = db.collection("taskListOrder")
                .document(userId)
                .addSnapshotListener { snapshot, error ->
                    if (error != null) return@addSnapshotListener
                    orderedTaskListIds = parseOrderedTaskListIds(snapshot?.data ?: emptyMap())
                    subscribeToTaskLists(orderedTaskListIds)
                }

            onDispose {
                taskListOrderListener.remove()
                taskListChunkListeners.forEach { it.remove() }
            }
        }
    }

    return taskLists
}

@Composable
private fun rememberSettingsUiState(userId: String?): SettingsUiState {
    var uiState by remember(userId) { mutableStateOf(SettingsUiState(isLoading = userId != null)) }
    DisposableEffect(userId) {
        if (userId == null) {
            uiState = SettingsUiState(isLoading = false)
            onDispose {}
        } else {
            val db = Firebase.firestore
            val email = Firebase.auth.currentUser?.email ?: ""
            val listener = db.collection("settings").document(userId)
                .addSnapshotListener { snapshot, _ ->
                    val data = snapshot?.data ?: return@addSnapshotListener
                    uiState = SettingsUiState(
                        theme = data["theme"] as? String ?: "system",
                        language = data["language"] as? String ?: "ja",
                        taskInsertPosition = data["taskInsertPosition"] as? String ?: "bottom",
                        autoSort = data["autoSort"] as? Boolean ?: false,
                        userEmail = email,
                        isLoading = false
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
        .sortedBy { it.second }
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
        taskCount = tasks.size,
        memberCount = memberCount,
        background = background
    )
}

private fun parseTaskListDetail(taskListId: String, data: Map<String, Any>): TaskListDetail {
    val name = data["name"] as? String ?: ""
    val memberCount = (data["memberCount"] as? Number)?.toInt() ?: 1
    val background = data["background"] as? String
    val shareCode = data["shareCode"] as? String
    val tasks = parseTasks(data["tasks"] as? Map<*, *> ?: emptyMap<String, Any>())

    return TaskListDetail(
        id = taskListId,
        name = name,
        tasks = tasks,
        memberCount = memberCount,
        background = background,
        shareCode = shareCode
    )
}

private fun parseTasks(rawTasks: Map<*, *>): List<TaskSummary> {
    return rawTasks.entries.mapNotNull { entry ->
        val taskId = entry.key as? String ?: return@mapNotNull null
        val value = entry.value as? Map<*, *> ?: return@mapNotNull null
        TaskSummary(
            id = taskId,
            text = value["text"] as? String ?: "",
            completed = value["completed"] as? Boolean ?: false,
            date = value["date"] as? String ?: "",
            order = (value["order"] as? Number)?.toDouble() ?: 0.0
        )
    }.sortedWith(compareBy<TaskSummary> { it.order }.thenBy { it.id })
}

private suspend fun generateShareCode(taskListId: String): String {
    val db = Firebase.firestore
    val chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    repeat(10) {
        val code = (1..8).map { chars.random() }.joinToString("")
        val result = db.runTransaction { transaction ->
            val shareCodeRef = db.collection("shareCodes").document(code)
            val shareCodeSnap = transaction.get(shareCodeRef)
            if (shareCodeSnap.exists()) return@runTransaction null

            val taskListRef = db.collection("taskLists").document(taskListId)
            val taskListSnap = transaction.get(taskListRef)
            if (!taskListSnap.exists()) throw Exception(TASK_LIST_NOT_FOUND_ERROR)

            val currentShareCode = taskListSnap.getString("shareCode")
            if (currentShareCode != null) {
                transaction.delete(db.collection("shareCodes").document(currentShareCode))
            }

            val now = System.currentTimeMillis()
            transaction.set(shareCodeRef, mapOf("taskListId" to taskListId, "createdAt" to now))
            transaction.update(taskListRef, mapOf("shareCode" to code, "updatedAt" to now))
            code
        }.await()
        if (result != null) return result
    }
    throw Exception(SHARE_CODE_GENERATION_FAILED_ERROR)
}

private suspend fun removeShareCode(taskListId: String) {
    val db = Firebase.firestore
    db.runTransaction { transaction ->
        val taskListRef = db.collection("taskLists").document(taskListId)
        val snap = transaction.get(taskListRef)
        if (!snap.exists()) throw Exception(TASK_LIST_NOT_FOUND_ERROR)
        val currentShareCode = snap.getString("shareCode")
        if (currentShareCode != null) {
            transaction.delete(db.collection("shareCodes").document(currentShareCode))
        }
        val now = System.currentTimeMillis()
        transaction.update(taskListRef, mapOf("shareCode" to null, "updatedAt" to now))
    }.await()
}

private suspend fun fetchTaskListIdByShareCode(shareCode: String): String? {
    val db = Firebase.firestore
    val normalized = shareCode.trim().uppercase()
    if (normalized.isEmpty()) return null
    val snap = db.collection("shareCodes").document(normalized).get().await()
    if (!snap.exists()) return null
    return snap.getString("taskListId")
}

private suspend fun addSharedTaskListToOrder(taskListId: String) {
    val uid = Firebase.auth.currentUser?.uid ?: return
    val db = Firebase.firestore
    db.runTransaction { transaction ->
        val taskListOrderRef = db.collection("taskListOrder").document(uid)
        val orderSnap = transaction.get(taskListOrderRef)
        if (!orderSnap.exists()) throw Exception(TASK_LIST_ORDER_NOT_FOUND_ERROR)
        val orderData = orderSnap.data ?: throw Exception(TASK_LIST_ORDER_NOT_FOUND_ERROR)

        if (orderData.containsKey(taskListId)) {
            throw Exception(TASK_LIST_ALREADY_ADDED_ERROR)
        }

        val orders = orderData.entries.mapNotNull { entry ->
            if (entry.key == "createdAt" || entry.key == "updatedAt") return@mapNotNull null
            val value = entry.value as? Map<*, *> ?: return@mapNotNull null
            (value["order"] as? Number)?.toDouble()
        }
        val newOrder = if (orders.isEmpty()) 1.0 else orders.max() + 1.0

        val taskListRef = db.collection("taskLists").document(taskListId)
        val taskListSnap = transaction.get(taskListRef)
        if (!taskListSnap.exists()) throw Exception(TASK_LIST_NOT_FOUND_ERROR)
        val currentMemberCount = (taskListSnap.data?.get("memberCount") as? Number)?.toInt() ?: 1
        val now = System.currentTimeMillis()
        transaction.set(taskListOrderRef, mapOf(taskListId to mapOf("order" to newOrder), "updatedAt" to now), SetOptions.merge())
        transaction.update(taskListRef, mapOf("memberCount" to (currentMemberCount + 1), "updatedAt" to now))
    }.await()
}

private fun flattenCalendarTasks(taskLists: List<TaskListDetail>): List<CalendarTask> {
    val isoFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    return taskLists.flatMap { taskList ->
        taskList.tasks
            .filter { !it.completed && it.date.isNotBlank() }
            .mapNotNull { task ->
                val dateValue = try { isoFormat.parse(task.date) } catch (e: Exception) { null }
                    ?: return@mapNotNull null
                CalendarTask(
                    id = "${taskList.id}:${task.id}",
                    taskListId = taskList.id,
                    taskListName = taskList.name,
                    taskListBackground = taskList.background,
                    taskId = task.id,
                    text = task.text,
                    completed = task.completed,
                    dateKey = task.date,
                    dateValue = dateValue
                )
            }
    }.sortedBy { it.dateValue }
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
        val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.parse(dateKey) ?: return dateKey
        val pattern = DateFormat.getBestDateTimePattern(locale, skeleton)
        SimpleDateFormat(pattern, locale).format(date)
    } catch (_: Exception) {
        dateKey
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

@Composable
private fun resolveTaskListBackgroundColor(background: String?): Color {
    return background?.let(::parseHexColor) ?: MaterialTheme.colorScheme.background
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScreenScaffold(
    title: String,
    onBack: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp, vertical = 24.dp)
    ) {
        Surface(
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxWidth()
                .widthIn(max = 480.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
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
                                modifier = Modifier.size(22.dp)
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

    LaunchedEffect(initialScreen) {
        selectedScreen = initialScreen
    }

    val t = LocalTranslations.current

    ScreenScaffold(
        title = when (selectedScreen) {
            AuthScreen.SignIn -> t.t("auth.button.signin")
            AuthScreen.SignUp -> t.t("auth.button.signup")
            AuthScreen.Reset -> t.t("auth.passwordReset.title")
        }
    ) {
        TabRow(selectedTabIndex = selectedScreen.ordinal, modifier = Modifier.fillMaxWidth()) {
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
                language = language,
                onShowSignIn = {
                    selectedScreen = AuthScreen.SignIn
                    onScreenChange(AuthScreen.SignIn)
                }
            )
            AuthScreen.Reset -> PasswordResetRequestView(
                language = language,
                onBackToSignIn = {
                    selectedScreen = AuthScreen.SignIn
                    onScreenChange(AuthScreen.SignIn)
                }
            )
        }
    }
}

@Composable
private fun SignInView(onShowReset: () -> Unit) {
    val t = LocalTranslations.current
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    OutlinedTextField(
        value = email,
        onValueChange = {
            email = it
            emailError = null
            errorMessage = null
        },
        label = { Text(t.t("auth.form.email")) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )
    Spacer(Modifier.height(8.dp))
    OutlinedTextField(
        value = password,
        onValueChange = {
            password = it
            passwordError = null
            errorMessage = null
        },
        label = { Text(t.t("auth.form.password")) },
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )
    emailError?.let {
        Spacer(Modifier.height(8.dp))
        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth())
    }
    passwordError?.let {
        Spacer(Modifier.height(8.dp))
        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth())
    }
    errorMessage?.let {
        Spacer(Modifier.height(8.dp))
        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth())
    }
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
            Firebase.auth.signInWithEmailAndPassword(email.trim(), password)
                .addOnSuccessListener {
                    isLoading = false
                    logLogin()
                }
                .addOnFailureListener { e ->
                    isLoading = false
                    errorMessage = resolveAuthErrorMessage(t, e)
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

    OutlinedTextField(
        value = email,
        onValueChange = {
            email = it
            emailError = null
            errorMessage = null
        },
        label = { Text(t.t("auth.form.email")) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )
    Spacer(Modifier.height(8.dp))
    OutlinedTextField(
        value = password,
        onValueChange = {
            password = it
            passwordError = null
            confirmPasswordError = null
            errorMessage = null
        },
        label = { Text(t.t("auth.form.password")) },
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )
    Spacer(Modifier.height(8.dp))
    OutlinedTextField(
        value = confirmPassword,
        onValueChange = {
            confirmPassword = it
            confirmPasswordError = null
            errorMessage = null
        },
        label = { Text(t.t("auth.form.confirmPassword")) },
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )
    listOf(emailError, passwordError, confirmPasswordError, errorMessage).filterNotNull().forEach { message ->
        Spacer(Modifier.height(8.dp))
        Text(message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth())
    }
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
                    signUpWithInitialData(trimmedEmail, password, language)
                    logSignUp()
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
    OutlinedTextField(
        value = email,
        onValueChange = {
            email = it
            emailError = null
            errorMessage = null
            successMessage = null
        },
        label = { Text(t.t("auth.form.email")) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        singleLine = true,
        modifier = Modifier.fillMaxWidth()
    )
    listOf(emailError, errorMessage).filterNotNull().forEach { message ->
        Spacer(Modifier.height(8.dp))
        Text(message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth())
    }
    successMessage?.let {
        Spacer(Modifier.height(8.dp))
        Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth())
    }
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
                    sendPasswordResetEmail(trimmedEmail, language)
                    logPasswordResetEmailSent()
                    successMessage = t.t("auth.passwordReset.success")
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
            OutlinedTextField(
                value = password,
                onValueChange = {
                    password = it
                    passwordError = null
                    confirmPasswordError = null
                    errorMessage = null
                },
                label = { Text(t.t("auth.passwordReset.newPassword")) },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isVerifying && !isSubmitting
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = confirmPassword,
                onValueChange = {
                    confirmPassword = it
                    confirmPasswordError = null
                    errorMessage = null
                },
                label = { Text(t.t("auth.passwordReset.confirmNewPassword")) },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isVerifying && !isSubmitting
            )
        }
        listOf(passwordError, confirmPasswordError, errorMessage).filterNotNull().forEach { message ->
            Spacer(Modifier.height(8.dp))
            Text(message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth())
        }
        successMessage?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth())
        }
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
    onTap: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .aspectRatio(1f)
            .clickable(onClick = onTap),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(40.dp)
                .background(
                    if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
                    CircleShape
                )
                .then(
                    if (isToday && !isSelected)
                        Modifier.border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                    else Modifier
                )
        ) {
            Text(
                "$dayNum",
                style = MaterialTheme.typography.bodyMedium,
                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
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
    val todayKey = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(java.util.Date())

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
private fun CalendarTaskRow(task: CalendarTask, isHighlighted: Boolean, onClick: () -> Unit) {
    val t = LocalTranslations.current
    val dateLabel = remember(task.dateKey, t.languageTag()) {
        formatDateForLocale(task.dateKey, t.languageTag(), "MMM d EEE")
    }
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(if (isHighlighted) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent)
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Top
        ) {
            Text(
                dateLabel,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.width(80.dp)
            )
            Row(
                modifier = Modifier.width(90.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
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
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
            }
            Text(
                task.text,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.weight(1f),
                maxLines = 2,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                textDecoration = if (task.completed) TextDecoration.LineThrough else TextDecoration.None
            )
        }
        HorizontalDivider(modifier = Modifier.padding(start = 16.dp))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CalendarBottomSheet(
    calendarTasks: List<CalendarTask>,
    onDismiss: () -> Unit
) {
    val t = LocalTranslations.current
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
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scope = rememberCoroutineScope()

    val monthKey = remember(displayedMonth) {
        SimpleDateFormat("yyyy-MM", Locale.US).format(displayedMonth)
    }
    val tasksInMonth = remember(calendarTasks, monthKey) {
        calendarTasks.filter { it.dateKey.startsWith(monthKey) }
    }
    val dotColorsByDate = remember(tasksInMonth) {
        val map = mutableMapOf<String, MutableList<String?>>()
        for (task in tasksInMonth) {
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

    fun selectDate(dateKey: String?) {
        selectedDateKey = dateKey
        if (dateKey != null) {
            val targetIndex = tasksInMonth.indexOfFirst { it.dateKey == dateKey }
            if (targetIndex >= 0) {
                scope.launch { listState.animateScrollToItem(targetIndex) }
            }
        }
    }

    ModalBottomSheet(
        modifier = Modifier.fillMaxHeight(),
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        dragHandle = null
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.96f)
                .padding(bottom = 24.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .windowInsetsPadding(
                        WindowInsets.safeDrawing.only(
                            WindowInsetsSides.Top + WindowInsetsSides.Horizontal
                        )
                    )
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.align(Alignment.CenterStart)
                ) {
                    TextButton(
                        onClick = onDismiss,
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(t.t("common.close"))
                    }
                }

                Text(
                    text = t.t("app.calendar"),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.align(Alignment.Center)
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = {
                    displayedMonth = Calendar.getInstance().apply {
                        time = displayedMonth
                        add(Calendar.MONTH, -1)
                        set(Calendar.DAY_OF_MONTH, 1)
                    }.time
                    selectDate(null)
                }) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                        contentDescription = t.t("app.calendarPreviousMonth")
                    )
                }
                Text(monthTitle, style = MaterialTheme.typography.titleLarge)
                IconButton(onClick = {
                    displayedMonth = Calendar.getInstance().apply {
                        time = displayedMonth
                        add(Calendar.MONTH, 1)
                        set(Calendar.DAY_OF_MONTH, 1)
                    }.time
                    selectDate(null)
                }) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = t.t("app.calendarNextMonth")
                    )
                }
            }

            CalendarGrid(
                month = displayedMonth,
                selectedDateKey = selectedDateKey,
                dotColorsByDate = dotColorsByDate,
                onSelectDate = { dateKey ->
                    selectDate(if (selectedDateKey == dateKey) null else dateKey)
                }
            )

            HorizontalDivider()

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                if (tasksInMonth.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(t.t("app.calendarNoDatedTasks"), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(tasksInMonth, key = { it.id }) { task ->
                            CalendarTaskRow(
                                task = task,
                                isHighlighted = selectedDateKey == task.dateKey,
                                onClick = { selectDate(task.dateKey) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DragHandleIcon(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        repeat(3) {
            Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                repeat(2) {
                    Box(
                        Modifier
                            .size(3.dp)
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
private fun TaskListsView(
    navController: NavController?,
    userId: String?,
    selectedTaskListId: String? = null,
    onTaskListSelected: ((String) -> Unit)? = null,
    onOpenSettings: (() -> Unit)? = null
) {
    val t = LocalTranslations.current
    val context = LocalContext.current
    val reduceMotion = remember {
        android.provider.Settings.Global.getFloat(
            context.contentResolver,
            android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
            1f
        ) == 0f
    }
    val uiState = rememberTaskListsUiState(userId)
    val calendarTaskLists = rememberCalendarTaskLists(userId)
    var showCalendarSheet by remember { mutableStateOf(false) }
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

    val displayTaskLists = dragOrderedTaskLists ?: uiState.taskLists
    val density = LocalDensity.current
    val taskListSpacingPx = with(density) { 24.dp.toPx() }

    fun openTaskList(taskListId: String) {
        if (onTaskListSelected != null) {
            onTaskListSelected(taskListId)
        } else {
            navController?.navigate(AppRoute.TaskList.createRoute(taskListId))
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
            }
        }
    }

    fun persistTaskListOrder(ids: List<String>) {
        val uid = Firebase.auth.currentUser?.uid ?: return
        logTaskListReorder()
        val updates = mutableMapOf<String, Any>("updatedAt" to System.currentTimeMillis())
        ids.forEachIndexed { i, id -> updates["$id.order"] = (i + 1).toDouble() }
        scope.launch {
            try { Firebase.firestore.collection("taskListOrder").document(uid).update(updates).await() } catch (_: Exception) {}
        }
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
                    tint = MaterialTheme.colorScheme.onBackground
                )
            }
        }

        OutlinedButton(
            onClick = { showCalendarSheet = true },
            modifier = Modifier
                .fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
        ) {
            Icon(
                Icons.Filled.CalendarToday,
                contentDescription = t.t("app.calendar"),
                modifier = Modifier.size(20.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(t.t("app.calendarCheckButton"))
        }

        Spacer(Modifier.height(24.dp))

        when {
            uiState.isLoading -> {
                Box(Modifier.fillMaxWidth().padding(vertical = 20.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            uiState.hasError -> {
                Text(
                    t.t("app.loadError"),
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier
                )
            }
            uiState.taskLists.isEmpty() -> {
                Text(
                    t.t("app.emptyState"),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                    items(displayTaskLists, key = { it.id }) { taskList ->
                        val isDragged = draggingTaskListId == taskList.id
                        val isSelected = selectedTaskListId == taskList.id
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
                            DragHandleIcon(
                                modifier = Modifier.pointerInput(taskList.id) {
                                    detectDragGestures(
                                        onDragStart = { _ ->
                                            draggingTaskListId = taskList.id
                                            dragOrderedTaskLists = uiState.taskLists
                                            taskListItemHeights = lazyListState.layoutInfo.visibleItemsInfo
                                                .filter { it.key is String }
                                                .associate { (it.key as String) to it.size.toFloat() }
                                            taskListDragOffset = 0f
                                        },
                                        onDragEnd = {
                                            taskListAutoScrollSpeed = 0f
                                            val ordered = dragOrderedTaskLists
                                            if (ordered != null && ordered.map { it.id } != uiState.taskLists.map { it.id }) {
                                                persistTaskListOrder(ordered.map { it.id })
                                            }
                                            draggingTaskListId = null
                                            dragOrderedTaskLists = null
                                            taskListDragOffset = 0f
                                        },
                                        onDragCancel = {
                                            taskListAutoScrollSpeed = 0f
                                            draggingTaskListId = null
                                            dragOrderedTaskLists = null
                                            taskListDragOffset = 0f
                                        },
                                        onDrag = { change, dragAmount ->
                                            change.consume()
                                            taskListDragOffset += dragAmount.y
                                            checkTaskListSwap()

                                            val viewportHeight = lazyListState.layoutInfo.viewportSize.height.toFloat()
                                            val edgeZone = with(density) { 80.dp.toPx() }
                                            val maxSpeed = with(density) { 8.dp.toPx() }
                                            val draggedItemInfo = lazyListState.layoutInfo.visibleItemsInfo
                                                .firstOrNull { it.key == draggingTaskListId }
                                            val fingerInViewport = if (draggedItemInfo != null) {
                                                (draggedItemInfo.offset + draggedItemInfo.size / 2 + taskListDragOffset).toFloat()
                                            } else {
                                                viewportHeight / 2
                                            }
                                            taskListAutoScrollSpeed = when {
                                                fingerInViewport < edgeZone && lazyListState.canScrollBackward -> {
                                                    val ratio = 1f - fingerInViewport.coerceAtLeast(0f) / edgeZone
                                                    -maxSpeed * ratio
                                                }
                                                fingerInViewport > viewportHeight - edgeZone && lazyListState.canScrollForward -> {
                                                    val ratio = 1f - (viewportHeight - fingerInViewport).coerceAtLeast(0f) / edgeZone
                                                    maxSpeed * ratio
                                                }
                                                else -> 0f
                                            }
                                        }
                                    )
                                }
                            )

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

        if (uiState.taskLists.isEmpty() || uiState.isLoading || uiState.hasError) {
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
        val colorOptions = listOf(null, "#F87171", "#FBBF24", "#34D399", "#38BDF8", "#818CF8", "#A78BFA")
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
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(t.t("taskList.selectColor"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            colorOptions.forEach { color ->
                                val isSelected = createBackground == color
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .background(
                                            if (color != null) parseHexColor(color) else MaterialTheme.colorScheme.surface,
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
                                        .clickable { createBackground = color }
                                )
                            }
                        }
                    }
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
                            val now = System.currentTimeMillis()
                            val newOrder = (uiState.taskLists.size + 1).toDouble()
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
                                db.batch().apply {
                                    set(db.collection("taskLists").document(taskListId), newTaskList)
                                    set(
                                        db.collection("taskListOrder").document(uid),
                                        mapOf(
                                            taskListId to mapOf("order" to newOrder),
                                            "updatedAt" to now
                                        ),
                                        SetOptions.merge()
                                    )
                                }.commit().await()
                                logTaskListCreate()
                                openTaskList(taskListId)
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
                            val code = joinListInput.trim().uppercase()
                            if (code.isEmpty()) return@launch
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

    if (showCalendarSheet) {
        CalendarBottomSheet(
            calendarTasks = flattenCalendarTasks(calendarTaskLists),
            onDismiss = { showCalendarSheet = false }
        )
    }
}

@Composable
private fun TabletContentView(
    userId: String?,
    initialSelectedTaskListId: String?,
    onSelectedTaskListHandled: () -> Unit
) {
    val selectedTaskListState = rememberSaveable { mutableStateOf<String?>(null) }
    var selectedPane by rememberSaveable { mutableStateOf(TabletPane.TaskList) }

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
            TaskListsView(
                navController = null,
                userId = userId,
                selectedTaskListId = selectedTaskListState.value,
                onTaskListSelected = { taskListId ->
                    selectedTaskListState.value = taskListId
                    selectedPane = TabletPane.TaskList
                },
                onOpenSettings = {
                    selectedPane = TabletPane.Settings
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
            } else {
                TaskListView(
                    navController = null,
                    userId = userId,
                    selectedTaskListIdState = selectedTaskListState,
                    showTopBar = false,
                    onEmpty = { selectedTaskListState.value = null }
                )
            }
        }
    }
}

@Composable
private fun TaskListView(
    navController: NavController?,
    userId: String?,
    initialTaskListId: String = "__initial__",
    selectedTaskListIdState: MutableState<String?>? = null,
    showTopBar: Boolean = true,
    onEmpty: (() -> Unit)? = if (navController != null) ({ navController.navigateUp() }) else null
) {
    val t = LocalTranslations.current
    val uiState = rememberTaskListDetailsUiState(userId)
    val settingsUiState = rememberSettingsUiState(userId)
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

    LaunchedEffect(uiState.taskLists) {
        if (uiState.isLoading) {
            return@LaunchedEffect
        }
        if (uiState.taskLists.isEmpty()) {
            onEmpty?.invoke()
            return@LaunchedEffect
        }
        if (uiState.taskLists.none { it.id == selectedTaskListId }) {
            val fallbackId = uiState.taskLists
                .firstOrNull { it.id == initialTaskListId }
                ?.id
                ?: uiState.taskLists.first().id
            updateSelectedTaskListId(fallbackId)
        }
    }

    val selectedTaskListIndex = uiState.taskLists.indexOfFirst { it.id == selectedTaskListId }
        .takeIf { it >= 0 }
        ?: 0
    val pagerState = rememberPagerState(initialPage = selectedTaskListIndex) {
        uiState.taskLists.size
    }
    val currentTaskList =
        uiState.taskLists.getOrNull(pagerState.currentPage) ?: uiState.taskLists.firstOrNull()
    val taskListBackgroundColor = resolveTaskListBackgroundColor(currentTaskList?.background)

    LaunchedEffect(uiState.taskLists.size, selectedTaskListIndex) {
        if (uiState.taskLists.isEmpty()) {
            return@LaunchedEffect
        }
        if (pagerState.currentPage != selectedTaskListIndex) {
            pagerState.scrollToPage(selectedTaskListIndex)
        }
    }

    LaunchedEffect(pagerState, uiState.taskLists) {
        snapshotFlow { pagerState.settledPage }
            .collectLatest { page ->
                val taskList = uiState.taskLists.getOrNull(page) ?: return@collectLatest
                if (taskList.id != selectedTaskListId) {
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
                    uiState.hasError -> {
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
                        if (uiState.taskLists.size > 1) {
                            Box(modifier = Modifier.fillMaxSize()) {
                                HorizontalPager(
                                    state = pagerState,
                                    modifier = Modifier.fillMaxSize()
                                ) { page ->
                                    val taskList = uiState.taskLists[page]
                                    TaskListDetailPage(
                                        taskList = taskList,
                                        taskInsertPosition = settingsUiState.taskInsertPosition,
                                        autoSort = settingsUiState.autoSort,
                                        topInset = TaskListDetailMetrics.indicatorContentInset
                                    )
                                }
                                TaskListIndicator(
                                    count = uiState.taskLists.size,
                                    selectedIndex = selectedTaskListIndex,
                                    onSelect = { index ->
                                        val nextTaskList = uiState.taskLists.getOrNull(index) ?: return@TaskListIndicator
                                        updateSelectedTaskListId(nextTaskList.id)
                                    },
                                    modifier = Modifier
                                        .align(Alignment.TopCenter)
                                        .padding(top = TaskListDetailMetrics.indicatorTopOffset)
                                )
                            }
                        } else {
                            HorizontalPager(
                                state = pagerState,
                                modifier = Modifier.fillMaxSize()
                            ) { page ->
                                val taskList = uiState.taskLists[page]
                                TaskListDetailPage(
                                    taskList = taskList,
                                    taskInsertPosition = settingsUiState.taskInsertPosition,
                                    autoSort = settingsUiState.autoSort,
                                    topInset = 0.dp
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
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center
    ) {
        repeat(count) { index ->
            val isSelected = index == selectedIndex
            Box(
                modifier = Modifier
                    .padding(horizontal = 2.dp, vertical = 4.dp)
                    .size(TaskListDetailMetrics.indicatorTouchSize)
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TaskListDetailPage(
    taskList: TaskListDetail,
    taskInsertPosition: String = "bottom",
    autoSort: Boolean = false,
    topInset: androidx.compose.ui.unit.Dp = 0.dp
) {
    val t = LocalTranslations.current
    val context = LocalContext.current
    val reduceMotion = remember {
        android.provider.Settings.Global.getFloat(
            context.contentResolver,
            android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
            1f
        ) == 0f
    }
    val scope = rememberCoroutineScope()
    val db = Firebase.firestore
    var newTaskText by remember { mutableStateOf("") }
    var editingTaskId by remember { mutableStateOf<String?>(null) }
    var editingTextFieldValue by remember { mutableStateOf(TextFieldValue("")) }
    var showDatePickerForTaskId by remember { mutableStateOf<String?>(null) }
    var showDeleteCompletedConfirm by remember { mutableStateOf(false) }
    var draggingTaskId by remember { mutableStateOf<String?>(null) }
    var taskDragOffset by remember { mutableFloatStateOf(0f) }
    var dragOrderedTasks by remember { mutableStateOf<List<TaskSummary>?>(null) }
    var taskItemHeights by remember { mutableStateOf<Map<String, Float>>(emptyMap()) }
    var taskAutoScrollSpeed by remember { mutableFloatStateOf(0f) }
    val lazyListState = rememberLazyListState()
    var showShareDialog by remember { mutableStateOf(false) }
    var currentShareCode by remember { mutableStateOf(taskList.shareCode) }
    var generatingShareCode by remember { mutableStateOf(false) }
    var removingShareCode by remember { mutableStateOf(false) }
    var shareCopySuccess by remember { mutableStateOf(false) }
    var shareError by remember { mutableStateOf<String?>(null) }

    val displayTasks = dragOrderedTasks ?: taskList.tasks
    val taskDensity = LocalDensity.current
    val taskSpacingPx = with(taskDensity) { TaskListDetailMetrics.taskRowSpacing.toPx() }
    val chromeColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.82f)
    val inputBackgroundColor = MaterialTheme.colorScheme.surface
    val titleTextStyle = MaterialTheme.typography.titleLarge.copy(
        fontSize = 20.sp,
        fontWeight = FontWeight.Bold
    )
    val inputTextStyle = MaterialTheme.typography.bodyMedium.copy(
        fontSize = 16.sp,
        fontWeight = FontWeight.Medium
    )
    val actionTextStyle = MaterialTheme.typography.bodySmall.copy(
        fontSize = 15.sp,
        fontWeight = FontWeight.SemiBold
    )
    val taskContentHeightPx = with(taskDensity) { TaskListDetailMetrics.taskContentHeight.roundToPx() }
    val taskTextStyle = MaterialTheme.typography.bodyMedium.copy(
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold
    )
    val taskDateTextStyle = MaterialTheme.typography.labelSmall.copy(
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium
    )
    val focusManager = LocalFocusManager.current

    fun autoSortedTasks(tasks: List<TaskSummary>): List<TaskSummary> {
        return tasks
            .sortedWith(
                compareBy<TaskSummary> { it.completed }
                    .thenBy { if (it.date.isBlank()) "9999-12-31" else it.date }
                    .thenBy { it.order }
            )
            .mapIndexed { index, task ->
                task.copy(order = (index + 1).toDouble())
            }
    }

    fun renumberedTasks(tasks: List<TaskSummary>): List<TaskSummary> {
        return tasks.mapIndexed { index, task ->
            task.copy(order = (index + 1).toDouble())
        }
    }

    fun taskUpdates(
        tasks: List<TaskSummary>,
        deletedTaskIds: List<String> = emptyList()
    ): Map<String, Any> {
        val updates = mutableMapOf<String, Any>("updatedAt" to System.currentTimeMillis())
        deletedTaskIds.forEach { taskId ->
            updates["tasks.$taskId"] = FieldValue.delete()
        }
        tasks.forEach { task ->
            updates["tasks.${task.id}.id"] = task.id
            updates["tasks.${task.id}.text"] = task.text
            updates["tasks.${task.id}.completed"] = task.completed
            updates["tasks.${task.id}.date"] = task.date
            updates["tasks.${task.id}.order"] = task.order
        }
        return updates
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
            if (taskDragOffset > threshold) {
                ordered[currentIdx] = ordered[currentIdx + 1].also { ordered[currentIdx + 1] = ordered[currentIdx] }
                dragOrderedTasks = ordered.toList()
                taskDragOffset -= (nextHeight + taskSpacingPx)
                return
            }
        }

        if (currentIdx > 0) {
            val prevId = ordered[currentIdx - 1].id
            val prevHeight = taskItemHeights[prevId] ?: currentHeight
            val threshold = prevHeight / 2 + taskSpacingPx + currentHeight / 2
            if (taskDragOffset < -threshold) {
                ordered[currentIdx] = ordered[currentIdx - 1].also { ordered[currentIdx - 1] = ordered[currentIdx] }
                dragOrderedTasks = ordered.toList()
                taskDragOffset += (prevHeight + taskSpacingPx)
            }
        }
    }

    fun persistTaskOrder(ids: List<String>) {
        logTaskReorder()
        val updates = mutableMapOf<String, Any>("updatedAt" to System.currentTimeMillis())
        ids.forEachIndexed { i, id -> updates["tasks.$id.order"] = (i + 1).toDouble() }
        scope.launch { try { db.collection("taskLists").document(taskList.id).update(updates).await() } catch (_: Exception) {} }
    }

    fun toggleCompletion(task: TaskSummary) {
        logTaskUpdate(fields = "completed")
        if (autoSort) {
            val updatedTasks = taskList.tasks.map { current ->
                if (current.id == task.id) current.copy(completed = !current.completed) else current
            }
            scope.launch {
                try {
                    db.collection("taskLists").document(taskList.id)
                        .update(taskUpdates(autoSortedTasks(updatedTasks)))
                        .await()
                } catch (_: Exception) {}
            }
            return
        }

        scope.launch {
            try {
                db.collection("taskLists").document(taskList.id).update(
                    mapOf(
                        "tasks.${task.id}.completed" to !task.completed,
                        "updatedAt" to System.currentTimeMillis()
                    )
                ).await()
            } catch (_: Exception) {}
        }
    }

    fun commitEdit(task: TaskSummary, text: String) {
        val trimmed = text.trim()
        editingTaskId = null
        if (trimmed.isNotEmpty() && trimmed != task.text) {
            logTaskUpdate(fields = "text")
            if (autoSort) {
                val updatedTasks = taskList.tasks.map { current ->
                    if (current.id == task.id) current.copy(text = trimmed) else current
                }
                scope.launch {
                    try {
                        db.collection("taskLists").document(taskList.id)
                            .update(taskUpdates(autoSortedTasks(updatedTasks)))
                            .await()
                    } catch (_: Exception) {}
                }
                return
            }

            scope.launch {
                try {
                    db.collection("taskLists").document(taskList.id).update(
                        mapOf(
                            "tasks.${task.id}.text" to trimmed,
                            "updatedAt" to System.currentTimeMillis()
                        )
                    ).await()
                } catch (_: Exception) {}
            }
        }
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
        showDatePickerForTaskId = null
        if (autoSort) {
            val updatedTasks = taskList.tasks.map { current ->
                if (current.id == task.id) current.copy(date = dateStr) else current
            }
            scope.launch {
                try {
                    db.collection("taskLists").document(taskList.id)
                        .update(taskUpdates(autoSortedTasks(updatedTasks)))
                        .await()
                } catch (_: Exception) {}
            }
            return
        }

        scope.launch {
            try {
                db.collection("taskLists").document(taskList.id).update(
                    mapOf(
                        "tasks.${task.id}.date" to dateStr,
                        "updatedAt" to System.currentTimeMillis()
                    )
                ).await()
            } catch (_: Exception) {}
        }
    }

    fun sortTasks() {
        logTaskSort()
        val sorted = taskList.tasks.sortedWith(
            compareBy<TaskSummary> { it.completed }
                .thenBy { it.date.isEmpty() }
                .thenBy { if (it.date.isEmpty()) "" else it.date }
                .thenBy { it.order }
        )
        val updates = mutableMapOf<String, Any>("updatedAt" to System.currentTimeMillis())
        sorted.forEachIndexed { i, task -> updates["tasks.${task.id}.order"] = (i + 1).toDouble() }
        scope.launch { try { db.collection("taskLists").document(taskList.id).update(updates).await() } catch (_: Exception) {} }
    }

    fun deleteCompletedTasks() {
        val completed = taskList.tasks.filter { it.completed }
        logTaskDeleteCompleted(count = completed.size)
        val remaining = taskList.tasks.filter { !it.completed }
        val updates = taskUpdates(
            tasks = if (autoSort) autoSortedTasks(remaining) else renumberedTasks(remaining),
            deletedTaskIds = completed.map { it.id }
        )
        scope.launch { try { db.collection("taskLists").document(taskList.id).update(updates).await() } catch (_: Exception) {} }
    }


    fun addTask() {
        val trimmed = newTaskText.trim()
        if (trimmed.isEmpty()) return
        logTaskAdd(hasDate = false)
        newTaskText = ""
        val taskId = java.util.UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        val tasks = taskList.tasks
        val order = if (taskInsertPosition == "top")
            (tasks.firstOrNull()?.order ?: 1.0) - 1.0
        else
            (tasks.lastOrNull()?.order ?: 0.0) + 1.0
        if (autoSort) {
            val insertedTask = TaskSummary(
                id = taskId,
                text = trimmed,
                completed = false,
                date = "",
                order = order
            )
            val insertIndex = if (taskInsertPosition == "top") 0 else taskList.tasks.size
            val reorderedTasks = taskList.tasks.toMutableList().apply {
                add(insertIndex, insertedTask)
            }
            scope.launch {
                try {
                    db.collection("taskLists").document(taskList.id)
                        .update(taskUpdates(autoSortedTasks(reorderedTasks)))
                        .await()
                } catch (_: Exception) {}
            }
            return
        }

        scope.launch {
            try {
                db.collection("taskLists").document(taskList.id).update(
                    mapOf(
                        "tasks.$taskId.id" to taskId,
                        "tasks.$taskId.text" to trimmed,
                        "tasks.$taskId.completed" to false,
                        "tasks.$taskId.date" to "",
                        "tasks.$taskId.order" to order,
                        "updatedAt" to now
                    )
                ).await()
            } catch (_: Exception) {}
        }
    }

    var showEditDialog by remember { mutableStateOf(false) }
    var editName by remember { mutableStateOf("") }
    var editBackground by remember { mutableStateOf<String?>(null) }

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
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = 16.dp,
            top = topInset,
            end = 16.dp,
            bottom = 16.dp
        )
    ) {
        item(key = "taskListHeader") {
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
                    modifier = Modifier.weight(1f)
                )
                IconButton(
                    onClick = { editName = taskList.name; editBackground = taskList.background; showEditDialog = true },
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
                        currentShareCode = taskList.shareCode
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
        item(key = "taskListInput") {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = TaskListDetailMetrics.sectionBottomSpacing),
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
                        .background(inputBackgroundColor, RoundedCornerShape(TaskListDetailMetrics.inputCornerRadius))
                        .border(
                            width = 1.dp,
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.8f),
                            shape = RoundedCornerShape(TaskListDetailMetrics.inputCornerRadius)
                        )
                        .padding(
                            horizontal = TaskListDetailMetrics.inputHorizontalPadding,
                            vertical = TaskListDetailMetrics.inputVerticalPadding
                        ),
                    decorationBox = { innerTextField ->
                        Box(
                            modifier = Modifier.fillMaxWidth(),
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
                if (newTaskText.trim().isNotEmpty()) {
                    Spacer(Modifier.width(TaskListDetailMetrics.inputActionSpacing))
                    IconButton(
                        onClick = { addTask() },
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
        item(key = "taskListActions") {
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
                            .clickable(enabled = taskList.tasks.size >= 2) { sortTasks() }
                            .padding(vertical = TaskListDetailMetrics.actionControlVerticalPadding),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.FilterList,
                            contentDescription = t.t("pages.tasklist.sort"),
                            modifier = Modifier.size(14.dp),
                            tint = if (taskList.tasks.size >= 2) chromeColor else chromeColor.copy(alpha = 0.45f)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            t.t("pages.tasklist.sort"),
                            style = actionTextStyle,
                            color = if (taskList.tasks.size >= 2) chromeColor else chromeColor.copy(alpha = 0.45f)
                        )
                    }
                    Row(
                        modifier = Modifier
                            .clickable(enabled = taskList.tasks.any { it.completed }) { showDeleteCompletedConfirm = true }
                            .padding(vertical = TaskListDetailMetrics.actionControlVerticalPadding),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val deleteEnabled = taskList.tasks.any { it.completed }
                        Text(
                            t.t("pages.tasklist.deleteCompleted"),
                            style = actionTextStyle,
                            color = if (deleteEnabled) chromeColor else chromeColor.copy(alpha = 0.45f)
                        )
                        Spacer(Modifier.width(4.dp))
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = t.t("pages.tasklist.deleteCompleted"),
                            modifier = Modifier.size(14.dp),
                            tint = if (deleteEnabled) chromeColor else chromeColor.copy(alpha = 0.45f)
                        )
                    }
                }
            }
        }
        if (taskList.tasks.isEmpty()) {
            item(key = "emptyState") {
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
            itemsIndexed(displayTasks, key = { _, task -> task.id }) { index, task ->
                    val isEditing = editingTaskId == task.id
                    val focusRequester = remember { FocusRequester() }
                    val isDragged = draggingTaskId == task.id
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(
                                top = if (index == 0) 0.dp else TaskListDetailMetrics.taskRowSpacing,
                                bottom = TaskListDetailMetrics.taskRowVerticalPadding
                            )
                            .offset { IntOffset(0, if (isDragged) taskDragOffset.toInt() else 0) }
                            .zIndex(if (isDragged) 1f else 0f)
                            .alpha(if (isDragged && !reduceMotion) 0.8f else 1f)
                            .graphicsLayer {
                                scaleX = if (isDragged && !reduceMotion) 1.03f else 1f
                                scaleY = if (isDragged && !reduceMotion) 1.03f else 1f
                            }
                            .then(if (!isDragged && !reduceMotion) Modifier.animateItem() else Modifier),
                    ) {
                            Box(
                                modifier = Modifier
                                    .alignBy { it.measuredHeight / 2 }
                                    .padding(
                                        top = TaskListDetailMetrics.dragHandleTopPadding,
                                        end = TaskListDetailMetrics.dragHandleEndPadding
                                    )
                                    .width(TaskListDetailMetrics.dragHandleTouchWidth)
                                    .height(48.dp)
                                    .pointerInput(task.id) {
                                        detectDragGestures(
                                            onDragStart = { _ ->
                                                draggingTaskId = task.id
                                                dragOrderedTasks = taskList.tasks
                                                taskItemHeights = lazyListState.layoutInfo.visibleItemsInfo
                                                    .filter { it.key is String }
                                                    .associate { (it.key as String) to it.size.toFloat() }
                                                taskDragOffset = 0f
                                            },
                                            onDragEnd = {
                                                taskAutoScrollSpeed = 0f
                                                val ordered = dragOrderedTasks
                                                if (ordered != null && ordered.map { it.id } != taskList.tasks.map { it.id }) {
                                                    persistTaskOrder(ordered.map { it.id })
                                                }
                                                draggingTaskId = null
                                                dragOrderedTasks = null
                                                taskDragOffset = 0f
                                            },
                                            onDragCancel = {
                                                taskAutoScrollSpeed = 0f
                                                draggingTaskId = null
                                                dragOrderedTasks = null
                                                taskDragOffset = 0f
                                            },
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
                                                    (draggedItemInfo.offset + draggedItemInfo.size / 2 + taskDragOffset).toFloat()
                                                } else {
                                                    viewportHeight / 2
                                                }
                                                taskAutoScrollSpeed = when {
                                                    fingerInViewport < edgeZone && lazyListState.canScrollBackward -> {
                                                        val ratio = 1f - fingerInViewport.coerceAtLeast(0f) / edgeZone
                                                        -maxSpeed * ratio
                                                    }
                                                    fingerInViewport > viewportHeight - edgeZone && lazyListState.canScrollForward -> {
                                                        val ratio = 1f - (viewportHeight - fingerInViewport).coerceAtLeast(0f) / edgeZone
                                                        maxSpeed * ratio
                                                    }
                                                    else -> 0f
                                                }
                                            }
                                        )
                                    },
                                contentAlignment = Alignment.CenterStart
                            ) {
                                DragHandleIcon(modifier = Modifier.offset(x = 0.dp))
                            }
                            Box(
                                modifier = Modifier
                                    .alignBy { it.measuredHeight / 2 }
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
                                    .clickable { toggleCompletion(task) },
                                contentAlignment = Alignment.Center
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(TaskListDetailMetrics.completionDotSize)
                                        .border(
                                            width = if (task.completed) 0.dp else 1.5.dp,
                                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.9f),
                                            shape = CircleShape
                                        )
                                        .background(
                                            if (task.completed) MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)
                                            else Color.Transparent,
                                            CircleShape
                                        )
                                        .offset(x = (-3).dp)
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .alignBy { it.measuredHeight / 2 }
                                    .fillMaxWidth()
                                    .heightIn(min = TaskListDetailMetrics.taskContentHeight),
                                contentAlignment = Alignment.CenterStart
                            ) {
                                if (task.date.isNotBlank()) {
                                    val displayDate = remember(task.date, t.languageTag()) {
                                        formatDateForLocale(task.date, t.languageTag(), "MMM d EEE")
                                    }
                                    Text(
                                        text = displayDate,
                                        style = taskDateTextStyle,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier
                                            .align(Alignment.TopStart)
                                            .offset(y = TaskListDetailMetrics.taskDateTopInset)
                                    )
                                }
                                if (isEditing) {
                                    var hasFocused by remember { mutableStateOf(false) }
                                    var hasCommitted by remember { mutableStateOf(false) }
                                    fun completeInlineEdit() {
                                        if (hasCommitted) {
                                            return
                                        }
                                        hasCommitted = true
                                        finishTaskEditing(task, focusManager)
                                    }
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
                                                        completeInlineEdit()
                                                    }
                                                    true
                                                }
                                                else -> false
                                            }
                                        }
                                    BasicTextField(
                                        value = editingTextFieldValue,
                                        onValueChange = { editingTextFieldValue = it },
                                        textStyle = taskTextStyle.copy(
                                            color = MaterialTheme.colorScheme.onSurface
                                        ),
                                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                                        keyboardActions = KeyboardActions(onDone = {
                                            completeInlineEdit()
                                        }),
                                        singleLine = true,
                                        modifier = Modifier
                                            .align(Alignment.CenterStart)
                                            .fillMaxWidth()
                                            .padding(start = TaskListDetailMetrics.taskTextStartPadding)
                                            .focusRequester(focusRequester)
                                            .then(inlineEditKeyModifier)
                                            .onFocusChanged { state ->
                                                if (state.isFocused) {
                                                    hasFocused = true
                                                } else if (hasFocused && !hasCommitted) {
                                                    hasCommitted = true
                                                    commitEdit(task, editingTextFieldValue.text)
                                                }
                                            }
                                    )
                                    LaunchedEffect(Unit) {
                                        focusRequester.requestFocus()
                                    }
                                } else {
                                    Text(
                                        task.text,
                                        style = taskTextStyle,
                                        textDecoration = if (task.completed) TextDecoration.LineThrough else TextDecoration.None,
                                        color = if (task.completed) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier
                                            .align(Alignment.CenterStart)
                                            .padding(start = TaskListDetailMetrics.taskTextStartPadding)
                                            .clickable {
                                                editingTaskId = task.id
                                                editingTextFieldValue = TextFieldValue(
                                                    text = task.text,
                                                    selection = TextRange(task.text.length)
                                                )
                                            }
                                    )
                                }
                            }
                            IconButton(
                                onClick = { showDatePickerForTaskId = task.id },
                                modifier = Modifier
                                    .alignBy { it.measuredHeight / 2 }
                                    .width(TaskListDetailMetrics.trailingDateButtonWidth)
                                    .height(48.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CalendarToday,
                                    contentDescription = t.t("pages.tasklist.setDate"),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                                    modifier = Modifier
                                        .size(TaskListDetailMetrics.trailingDateIconSize)
                                        .offset(x = 2.dp)
                                )
                            }
                        }
            }
        }
    }

    if (showEditDialog) {
        val colorOptions = listOf(null, "#F87171", "#FBBF24", "#34D399", "#38BDF8", "#818CF8", "#A78BFA")
        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            title = { Text(t.t("taskList.editTitle")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    OutlinedTextField(
                        value = editName,
                        onValueChange = { editName = it },
                        label = { Text(t.t("app.taskListName")) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(t.t("taskList.selectColor"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            colorOptions.forEach { color ->
                                val isSelected = editBackground == color
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .background(
                                            if (color != null) parseHexColor(color) else MaterialTheme.colorScheme.surface,
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
                                        .clickable { editBackground = color }
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val trimmed = editName.trim()
                        if (trimmed.isNotEmpty()) {
                            val updates = mutableMapOf<String, Any?>("updatedAt" to System.currentTimeMillis())
                            if (trimmed != taskList.name) updates["name"] = trimmed
                            if (editBackground != taskList.background) updates["background"] = editBackground
                            if (updates.size > 1) {
                                scope.launch {
                                    try {
                                        db.collection("taskLists").document(taskList.id).update(
                                            updates.toMap()
                                        ).await()
                                    } catch (_: Exception) {}
                                }
                            }
                            showEditDialog = false
                        }
                    },
                    enabled = editName.trim().isNotEmpty()
                ) { Text(t.t("taskList.save")) }
            },
            dismissButton = {
                TextButton(onClick = { showEditDialog = false }) { Text(t.t("common.cancel")) }
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
        val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current
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
                                    clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(code))
                                    shareCopySuccess = true
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

    if (showDatePickerForTaskId != null) {
        val task = taskList.tasks.firstOrNull { it.id == showDatePickerForTaskId }
        if (task != null) {
            val initialMillis = if (task.date.isNotBlank()) {
                try {
                    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }.parse(task.date)?.time ?: System.currentTimeMillis()
                } catch (e: Exception) {
                    System.currentTimeMillis()
                }
            } else {
                System.currentTimeMillis()
            }
            val datePickerState = rememberDatePickerState(initialSelectedDateMillis = initialMillis)
            DatePickerDialog(
                onDismissRequest = { showDatePickerForTaskId = null },
                confirmButton = {
                    TextButton(onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
                            cal.timeInMillis = millis
                            val dateStr = String.format(
                                Locale.US, "%04d-%02d-%02d",
                                cal.get(Calendar.YEAR),
                                cal.get(Calendar.MONTH) + 1,
                                cal.get(Calendar.DAY_OF_MONTH)
                            )
                            commitDate(task, dateStr)
                        } ?: run { showDatePickerForTaskId = null }
                    }) { Text(t.t("common.ok")) }
                },
                dismissButton = {
                    Row {
                        TextButton(
                            onClick = { commitDate(task, "") },
                            colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                        ) { Text(t.t("pages.tasklist.clearDate")) }
                        TextButton(onClick = { showDatePickerForTaskId = null }) {
                            Text(t.t("common.cancel"))
                        }
                    }
                }
            ) {
                DatePicker(state = datePickerState)
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
    Column {
        Text(
            title,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 6.dp)
        )
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(16.dp), content = content)
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
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun SettingsView(
    navController: NavController? = null,
    showTopBar: Boolean = true
) {
    val t = LocalTranslations.current
    val userId = Firebase.auth.currentUser?.uid
    val uiState = rememberSettingsUiState(userId)
    val scope = rememberCoroutineScope()
    var showSignOutDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showThemeDialog by remember { mutableStateOf(false) }
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showPositionDialog by remember { mutableStateOf(false) }
    var showEmailChangeDialog by remember { mutableStateOf(false) }
    var newEmail by remember { mutableStateOf("") }
    var emailChangeError by remember { mutableStateOf<String?>(null) }
    var emailChangeSuccess by remember { mutableStateOf(false) }
    var isChangingEmail by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isDeletingAccount by remember { mutableStateOf(false) }
    var isSigningOut by remember { mutableStateOf(false) }

    fun updateSettings(partial: Map<String, Any>) {
        if (userId == null) return
        Firebase.firestore.collection("settings").document(userId)
            .set(partial + mapOf("updatedAt" to System.currentTimeMillis()), SetOptions.merge())
    }

    DetailScreenScaffold(
        title = t.t("settings.title"),
        onBack = if (navController != null) ({ navController.navigateUp() }) else null,
        showTopBar = showTopBar
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
                SettingsSectionCard(title = t.t("settings.preferences.title")) {
                    SettingsSelectRow(
                        label = t.t("settings.language.title"),
                        value = supportedLanguages.firstOrNull { it.first == uiState.language }?.second ?: uiState.language
                    ) { showLanguageDialog = true }
                    HorizontalDivider()
                    SettingsSelectRow(t.t("settings.theme.title"), settingsThemeLabel(t, uiState.theme)) { showThemeDialog = true }
                    HorizontalDivider()
                    SettingsSelectRow(
                        t.t("settings.taskInsertPosition.title"),
                        settingsTaskInsertPositionLabel(t, uiState.taskInsertPosition)
                    ) { showPositionDialog = true }
                    HorizontalDivider()
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(t.t("settings.autoSort.enable"))
                        Switch(
                            checked = uiState.autoSort,
                            onCheckedChange = { logSettingsAutoSortChange(enabled = it); updateSettings(mapOf("autoSort" to it)) }
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
                SettingsSectionCard(title = t.t("settings.userInfo.title")) {
                    Text(uiState.userEmail)
                    TextButton(onClick = { showEmailChangeDialog = true }) { Text(t.t("settings.emailChange.title")) }
                }
                Spacer(Modifier.height(16.dp))
                SettingsSectionCard(title = t.t("settings.actions.title")) {
                    OutlinedButton(
                        onClick = { showSignOutDialog = true },
                        enabled = !isSigningOut,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(if (isSigningOut) t.t("common.loading") else t.t("auth.button.signOut"))
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { showDeleteDialog = true },
                        enabled = !isDeletingAccount,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                    ) {
                        Text(if (isDeletingAccount) t.t("common.loading") else t.t("settings.danger.deleteAccount"))
                    }
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
                            val taskListOrderSnapshot = db.collection("taskListOrder").document(uid).get().await()
                            if (taskListOrderSnapshot.exists()) {
                                val taskListIds = taskListOrderSnapshot.data
                                    ?.keys
                                    ?.filter { it != "createdAt" && it != "updatedAt" }
                                    ?: emptyList()
                                taskListIds.forEach { taskListId ->
                                    try {
                                        val taskListRef = db.collection("taskLists").document(taskListId)
                                        val snap = taskListRef.get().await()
                                        val memberCount = (snap.data?.get("memberCount") as? Number)?.toInt() ?: 1
                                        if (memberCount <= 1) {
                                            taskListRef.delete().await()
                                        } else {
                                            taskListRef.update("memberCount", memberCount - 1).await()
                                        }
                                    } catch (_: Exception) {}
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
        AlertDialog(
            onDismissRequest = { showThemeDialog = false },
            title = { Text(t.t("settings.theme.title")) },
            text = {
                Column {
                    listOf(
                        "system" to t.t("settings.theme.system"),
                        "light" to t.t("settings.theme.light"),
                        "dark" to t.t("settings.theme.dark")
                    ).forEach { (option, label) ->
                        Row(
                            Modifier.fillMaxWidth().clickable {
                                logSettingsThemeChange(theme = option)
                                updateSettings(mapOf("theme" to option))
                                showThemeDialog = false
                            }.padding(vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(label, Modifier.weight(1f))
                            if (uiState.theme == option) {
                                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = t.t("common.selected"))
                            }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { showThemeDialog = false }) { Text(t.t("common.cancel")) } }
        )
    }

    if (showPositionDialog) {
        AlertDialog(
            onDismissRequest = { showPositionDialog = false },
            title = { Text(t.t("settings.taskInsertPosition.title")) },
            text = {
                Column {
                    listOf(
                        "top" to t.t("settings.taskInsertPosition.top"),
                        "bottom" to t.t("settings.taskInsertPosition.bottom")
                    ).forEach { (option, label) ->
                        Row(
                            Modifier.fillMaxWidth().clickable {
                                logSettingsTaskInsertPositionChange(position = option)
                                updateSettings(mapOf("taskInsertPosition" to option))
                                showPositionDialog = false
                            }.padding(vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(label, Modifier.weight(1f))
                            if (uiState.taskInsertPosition == option) {
                                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = t.t("common.selected"))
                            }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { showPositionDialog = false }) { Text(t.t("common.cancel")) } }
        )
    }

    if (showLanguageDialog) {
        AlertDialog(
            onDismissRequest = { showLanguageDialog = false },
            title = { Text(t.t("settings.language.title")) },
            text = {
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    supportedLanguages.forEach { (code, name) ->
                        Row(
                            Modifier.fillMaxWidth().clickable {
                                logSettingsLanguageChange(language = code)
                                updateSettings(mapOf("language" to code))
                                showLanguageDialog = false
                            }.padding(vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(name, Modifier.weight(1f))
                            if (uiState.language == code) {
                                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = t.t("common.selected"))
                            }
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { showLanguageDialog = false }) { Text(t.t("common.cancel")) } }
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
                        singleLine = true
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
}
