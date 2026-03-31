import SwiftUI
import Foundation
import FirebaseAuth
import FirebaseAnalytics
import FirebaseCrashlytics
import FirebaseFirestore

@MainActor
final class Translations: ObservableObject {
    @Published private(set) var language: String = "ja"
    private var dict: [String: Any] = [:]

    private static let supported = ["ja","en","es","de","fr","ko","zh-CN","hi","ar","pt-BR","id"]

    func load(language: String) {
        let lang = Self.supported.contains(language) ? language : "ja"
        guard let url = Bundle.main.url(forResource: lang, withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            dict = [:]
            return
        }
        dict = json
        self.language = lang
    }

    func t(_ key: String, _ vars: [String: String] = [:]) -> String {
        let parts = key.split(separator: ".").map(String.init)
        var current: Any = dict
        for part in parts {
            guard let d = current as? [String: Any], let next = d[part] else { return key }
            current = next
        }
        guard var result = current as? String else { return key }
        for (k, v) in vars {
            result = result.replacingOccurrences(of: "{{\(k)}}", with: v)
        }
        return result
    }
}

private func log(_ eventName: String, _ params: [String: Any]? = nil) {
    #if DEBUG
    print("[analytics] \(eventName) \(params ?? [:])")
    #endif
    Analytics.logEvent(eventName, parameters: params)
}

func logSignUp() { log(AnalyticsEventSignUp, [AnalyticsParameterMethod: "email"]) }
func logLogin() { log(AnalyticsEventLogin, [AnalyticsParameterMethod: "email"]) }
func logSignOut() { log("app_sign_out") }
func logDeleteAccount() { log("app_delete_account") }
func logPasswordResetEmailSent() { log("app_password_reset_email_sent") }
func logEmailChangeRequested() { log("app_email_change_requested") }
func logTaskListCreate() { log("app_task_list_create") }
func logTaskListDelete() { log("app_task_list_delete") }
func logTaskListReorder() { log("app_task_list_reorder") }
func logTaskAdd(hasDate: Bool) { log("app_task_add", ["has_date": hasDate]) }
func logTaskUpdate(fields: String) { log("app_task_update", ["fields": fields]) }
func logTaskDelete() { log("app_task_delete") }
func logTaskReorder() { log("app_task_reorder") }
func logTaskSort() { log("app_task_sort") }
func logTaskDeleteCompleted(count: Int) { log("app_task_delete_completed", ["count": count]) }
func logShareCodeGenerate() { log("app_share_code_generate") }
func logShareCodeRemove() { log("app_share_code_remove") }
func logShareCodeJoin() { log("app_share_code_join") }
func logShare() { log(AnalyticsEventShare, [AnalyticsParameterMethod: "share_code", AnalyticsParameterContentType: "task_list"]) }
func logSettingsThemeChange(theme: String) { log("app_settings_theme_change", ["theme": theme]) }
func logSettingsLanguageChange(language: String) { log("app_settings_language_change", ["language": language]) }
func logSettingsTaskInsertPositionChange(position: String) { log("app_settings_task_insert_position_change", ["position": position]) }
func logSettingsAutoSortChange(enabled: Bool) { log("app_settings_auto_sort_change", ["enabled": enabled]) }

func logException(description: String, fatal: Bool) {
    log("app_exception", ["description": description, "fatal": fatal])
    let error = NSError(domain: "com.company.lightlist", code: 0, userInfo: [NSLocalizedDescriptionKey: description])
    Crashlytics.crashlytics().record(error: error)
}

enum AppRoute: Hashable {
    case taskLists
    case taskList(taskListId: String)
    case settings

    var title: String {
        switch self {
        case .taskLists:
            return "TaskLists"
        case .taskList:
            return "TaskList"
        case .settings:
            return "Settings"
        }
    }

    static var initialPath: [AppRoute] {
        [.taskList(taskListId: "__initial__")]
    }
}

private struct TaskSummary: Identifiable, Hashable {
    let id: String
    let text: String
    let completed: Bool
    let date: String
    let order: Double
}

private struct TaskListSummary: Identifiable, Hashable {
    let id: String
    let name: String
    let taskCount: Int
    let memberCount: Int
    let background: String?
}

private struct TaskListDetail: Identifiable, Hashable {
    let id: String
    let name: String
    let tasks: [TaskSummary]
    let memberCount: Int
    let background: String?
    let shareCode: String?
}

private struct CalendarTask: Identifiable {
    var id: String { "\(taskListId):\(taskId)" }
    let taskListId: String
    let taskListName: String
    let taskListBackground: String?
    let taskId: String
    let text: String
    let completed: Bool
    let date: String
    let dateValue: Date
}

private final class TaskListsViewModel: ObservableObject {
    enum Status {
        case idle
        case loading
        case ready
        case error
    }

    @Published private(set) var taskLists: [TaskListSummary] = []
    @Published private(set) var status: Status = .idle

    private let db = Firestore.firestore()
    private var taskListOrderListener: ListenerRegistration?
    private var taskListChunkListeners: [ListenerRegistration] = []
    private var currentUid: String?
    private var orderedTaskListIds: [String] = []
    private var taskListsById: [String: TaskListSummary] = [:]
    private var taskListIdsKey = ""

    func bind(uid: String?) {
        guard currentUid != uid else {
            return
        }

        reset()
        currentUid = uid

        guard let uid else {
            status = .idle
            return
        }

        status = .loading
        taskListOrderListener = db.collection("taskListOrder").document(uid).addSnapshotListener { [weak self] snapshot, error in
            guard let self else {
                return
            }

            if error != nil {
                self.status = .error
                return
            }

            let nextOrderedTaskListIds = Self.getOrderedTaskListIds(from: snapshot?.data())
            self.orderedTaskListIds = nextOrderedTaskListIds
            self.status = .ready
            self.subscribeToTaskLists(taskListIds: nextOrderedTaskListIds)
            self.publishTaskLists()
        }
    }

    func reset() {
        taskListOrderListener?.remove()
        taskListOrderListener = nil
        taskListChunkListeners.forEach { $0.remove() }
        taskListChunkListeners = []
        currentUid = nil
        orderedTaskListIds = []
        taskListsById = [:]
        taskListIdsKey = ""
        taskLists = []
        status = .idle
    }

    private func subscribeToTaskLists(taskListIds: [String]) {
        let nextKey = taskListIds.sorted().joined(separator: "|")
        if taskListIdsKey == nextKey {
            return
        }
        taskListIdsKey = nextKey

        taskListChunkListeners.forEach { $0.remove() }
        taskListChunkListeners = []
        taskListsById = taskListsById.filter { taskListIds.contains($0.key) }

        guard !taskListIds.isEmpty else {
            publishTaskLists()
            return
        }

        stride(from: 0, to: taskListIds.count, by: 10).forEach { startIndex in
            let chunk = Array(taskListIds[startIndex..<min(startIndex + 10, taskListIds.count)])
            let listener = db.collection("taskLists")
                .whereField(FieldPath.documentID(), in: chunk)
                .addSnapshotListener { [weak self] snapshot, error in
                    guard let self else {
                        return
                    }

                    if error != nil {
                        self.status = .error
                        return
                    }

                    snapshot?.documentChanges.forEach { change in
                        let taskListId = change.document.documentID
                        if change.type == .removed {
                            self.taskListsById.removeValue(forKey: taskListId)
                            return
                        }
                        self.taskListsById[taskListId] = Self.mapTaskListSummary(
                            id: taskListId,
                            data: change.document.data()
                        )
                    }

                    self.publishTaskLists()
                }
            taskListChunkListeners.append(listener)
        }
    }

    private func publishTaskLists() {
        taskLists = orderedTaskListIds.compactMap { taskListsById[$0] }
    }

    fileprivate static func getOrderedTaskListIds(from data: [String: Any]?) -> [String] {
        guard let data else {
            return []
        }

        let orderedEntries: [(taskListId: String, order: Double)] = data.compactMap { entry in
            let key = entry.key
            let value = entry.value
            guard key != "createdAt", key != "updatedAt" else {
                return nil
            }
            guard let value = value as? [String: Any] else {
                return nil
            }
            guard let order = value["order"] as? NSNumber else {
                return nil
            }
            return (taskListId: key, order: order.doubleValue)
        }

        return orderedEntries
            .sorted { $0.order < $1.order }
            .map { $0.taskListId }
    }

    private static func mapTaskListSummary(id: String, data: [String: Any]) -> TaskListSummary {
        let tasks = data["tasks"] as? [String: Any] ?? [:]
        let memberCount = (data["memberCount"] as? NSNumber)?.intValue ?? 1
        let name = (data["name"] as? String ?? "").precomposedStringWithCanonicalMapping
        let background = data["background"] as? String

        return TaskListSummary(
            id: id,
            name: name,
            taskCount: tasks.count,
            memberCount: memberCount,
            background: background
        )
    }
}

private final class TaskListDetailsViewModel: ObservableObject {
    enum Status {
        case idle
        case loading
        case ready
        case error
    }

    @Published private(set) var taskLists: [TaskListDetail] = []
    @Published private(set) var status: Status = .idle

    private let db = Firestore.firestore()
    private var taskListOrderListener: ListenerRegistration?
    private var taskListChunkListeners: [ListenerRegistration] = []
    private var currentUid: String?
    private var orderedTaskListIds: [String] = []
    private var taskListsById: [String: TaskListDetail] = [:]
    private var taskListIdsKey = ""

    func bind(uid: String?) {
        guard currentUid != uid else {
            return
        }

        reset()
        currentUid = uid

        guard let uid else {
            status = .idle
            return
        }

        status = .loading
        taskListOrderListener = db.collection("taskListOrder").document(uid).addSnapshotListener { [weak self] snapshot, error in
            guard let self else {
                return
            }

            if error != nil {
                self.status = .error
                return
            }

            let nextOrderedTaskListIds = TaskListsViewModel.getOrderedTaskListIds(from: snapshot?.data())
            self.orderedTaskListIds = nextOrderedTaskListIds
            self.status = .ready
            self.subscribeToTaskLists(taskListIds: nextOrderedTaskListIds)
            self.publishTaskLists()
        }
    }

    func reset() {
        taskListOrderListener?.remove()
        taskListOrderListener = nil
        taskListChunkListeners.forEach { $0.remove() }
        taskListChunkListeners = []
        currentUid = nil
        orderedTaskListIds = []
        taskListsById = [:]
        taskListIdsKey = ""
        taskLists = []
        status = .idle
    }

    private func subscribeToTaskLists(taskListIds: [String]) {
        let nextKey = taskListIds.sorted().joined(separator: "|")
        if taskListIdsKey == nextKey {
            return
        }
        taskListIdsKey = nextKey

        taskListChunkListeners.forEach { $0.remove() }
        taskListChunkListeners = []
        taskListsById = taskListsById.filter { taskListIds.contains($0.key) }

        guard !taskListIds.isEmpty else {
            publishTaskLists()
            return
        }

        stride(from: 0, to: taskListIds.count, by: 10).forEach { startIndex in
            let chunk = Array(taskListIds[startIndex..<min(startIndex + 10, taskListIds.count)])
            let listener = db.collection("taskLists")
                .whereField(FieldPath.documentID(), in: chunk)
                .addSnapshotListener { [weak self] snapshot, error in
                    guard let self else {
                        return
                    }

                    if error != nil {
                        self.status = .error
                        return
                    }

                    snapshot?.documentChanges.forEach { change in
                        let taskListId = change.document.documentID
                        if change.type == .removed {
                            self.taskListsById.removeValue(forKey: taskListId)
                            return
                        }
                        self.taskListsById[taskListId] = Self.mapTaskListDetail(
                            id: taskListId,
                            data: change.document.data()
                        )
                    }

                    self.publishTaskLists()
                }
            taskListChunkListeners.append(listener)
        }
    }

    private func publishTaskLists() {
        taskLists = orderedTaskListIds.compactMap { taskListsById[$0] }
    }

    fileprivate static func mapTaskListDetail(id: String, data: [String: Any]) -> TaskListDetail {
        let name = (data["name"] as? String ?? "").precomposedStringWithCanonicalMapping
        let memberCount = (data["memberCount"] as? NSNumber)?.intValue ?? 1
        let background = data["background"] as? String
        let rawTasks = data["tasks"] as? [String: Any] ?? [:]

        let tasks = rawTasks.compactMap { entry -> TaskSummary? in
            let taskId = entry.key
            guard let value = entry.value as? [String: Any] else {
                return nil
            }

            return TaskSummary(
                id: taskId,
                text: value["text"] as? String ?? "",
                completed: value["completed"] as? Bool ?? false,
                date: value["date"] as? String ?? "",
                order: (value["order"] as? NSNumber)?.doubleValue ?? 0
            )
        }
        .sorted {
            if $0.order == $1.order {
                return $0.id < $1.id
            }
            return $0.order < $1.order
        }

        let shareCode = data["shareCode"] as? String

        return TaskListDetail(
            id: id,
            name: name,
            tasks: tasks,
            memberCount: memberCount,
            background: background,
            shareCode: shareCode
        )
    }
}

private final class CalendarViewModel: ObservableObject {
    enum Status {
        case idle
        case loading
        case ready
        case error
    }

    @Published private(set) var taskLists: [TaskListDetail] = []
    @Published private(set) var status: Status = .idle

    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    var calendarTasks: [CalendarTask] {
        taskLists
            .flatMap { taskList in
                taskList.tasks
                    .filter { !$0.completed && !$0.date.isEmpty }
                    .compactMap { task -> CalendarTask? in
                        guard let dateValue = Self.isoFormatter.date(from: task.date) else { return nil }
                        return CalendarTask(
                            taskListId: taskList.id,
                            taskListName: taskList.name,
                            taskListBackground: taskList.background,
                            taskId: task.id,
                            text: task.text,
                            completed: task.completed,
                            date: task.date,
                            dateValue: dateValue
                        )
                    }
            }
            .sorted { $0.dateValue < $1.dateValue }
    }

    private let db = Firestore.firestore()
    private var taskListOrderListener: ListenerRegistration?
    private var taskListChunkListeners: [ListenerRegistration] = []
    private var currentUid: String?
    private var orderedTaskListIds: [String] = []
    private var taskListsById: [String: TaskListDetail] = [:]
    private var taskListIdsKey = ""

    func bind(uid: String?) {
        guard currentUid != uid else { return }
        reset()
        currentUid = uid
        guard let uid else { status = .idle; return }
        status = .loading
        taskListOrderListener = db.collection("taskListOrder").document(uid).addSnapshotListener { [weak self] snapshot, error in
            guard let self else { return }
            if error != nil { self.status = .error; return }
            let nextOrderedTaskListIds = TaskListsViewModel.getOrderedTaskListIds(from: snapshot?.data())
            self.orderedTaskListIds = nextOrderedTaskListIds
            self.status = .ready
            self.subscribeToTaskLists(taskListIds: nextOrderedTaskListIds)
            self.publishTaskLists()
        }
    }

    func reset() {
        taskListOrderListener?.remove()
        taskListOrderListener = nil
        taskListChunkListeners.forEach { $0.remove() }
        taskListChunkListeners = []
        currentUid = nil
        orderedTaskListIds = []
        taskListsById = [:]
        taskListIdsKey = ""
        taskLists = []
        status = .idle
    }

    private func subscribeToTaskLists(taskListIds: [String]) {
        let nextKey = taskListIds.sorted().joined(separator: "|")
        if taskListIdsKey == nextKey { return }
        taskListIdsKey = nextKey
        taskListChunkListeners.forEach { $0.remove() }
        taskListChunkListeners = []
        taskListsById = taskListsById.filter { taskListIds.contains($0.key) }
        guard !taskListIds.isEmpty else { publishTaskLists(); return }
        stride(from: 0, to: taskListIds.count, by: 10).forEach { startIndex in
            let chunk = Array(taskListIds[startIndex..<min(startIndex + 10, taskListIds.count)])
            let listener = db.collection("taskLists")
                .whereField(FieldPath.documentID(), in: chunk)
                .addSnapshotListener { [weak self] snapshot, error in
                    guard let self else { return }
                    if error != nil { self.status = .error; return }
                    snapshot?.documentChanges.forEach { change in
                        let taskListId = change.document.documentID
                        if change.type == .removed {
                            self.taskListsById.removeValue(forKey: taskListId)
                            return
                        }
                        self.taskListsById[taskListId] = TaskListDetailsViewModel.mapTaskListDetail(
                            id: taskListId,
                            data: change.document.data()
                        )
                    }
                    self.publishTaskLists()
                }
            taskListChunkListeners.append(listener)
        }
    }

    private func publishTaskLists() {
        taskLists = orderedTaskListIds.compactMap { taskListsById[$0] }
    }
}

@MainActor
private func resolvePasswordResetErrorMessage(translations: Translations, error: Error) -> String {
    let authError = AuthErrorCode(rawValue: (error as NSError).code)
    switch authError {
    case .expiredActionCode:
        return translations.t("auth.passwordReset.expiredCode")
    case .invalidActionCode:
        return translations.t("auth.passwordReset.invalidCode")
    default:
        return error.localizedDescription
    }
}

private let initialTaskListNameByLanguage: [String: String] = [
    "ja": "📒個人",
    "en": "📒PERSONAL",
    "es": "📒PERSONAL",
    "de": "📒PERSÖNLICH",
    "fr": "📒PERSONNEL",
    "ko": "📒개인",
    "zh-CN": "📒个人",
    "hi": "📒व्यक्तिगत",
    "ar": "📒شخصية",
    "pt-BR": "📒PESSOAL",
    "id": "📒PRIBADI",
]

private enum AuthScreen: Int, CaseIterable, Identifiable {
    case signIn
    case signUp
    case reset

    var id: Int { rawValue }
}

private func normalizeLanguageCode(_ language: String) -> String {
    supportedLanguages.first(where: { $0.code == language })?.code ?? "ja"
}

private func passwordResetURLString() -> String {
    (Bundle.main.object(forInfoDictionaryKey: "PASSWORD_RESET_URL") as? String)
        ?? "https://lightlist.com/password_reset"
}

private func isValidEmail(_ email: String) -> Bool {
    let pattern = #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#
    return email.range(of: pattern, options: .regularExpression) != nil
}

@MainActor
private func resolveAuthErrorMessage(translations: Translations, error: Error) -> String {
    let authError = AuthErrorCode(rawValue: (error as NSError).code)
    switch authError {
    case .wrongPassword, .invalidCredential:
        return translations.t("auth.error.invalidCredential")
    case .userNotFound:
        return translations.t("auth.error.userNotFound")
    case .emailAlreadyInUse:
        return translations.t("auth.error.emailAlreadyInUse")
    case .weakPassword:
        return translations.t("auth.error.weakPassword")
    case .invalidEmail:
        return translations.t("auth.error.invalidEmail")
    case .operationNotAllowed:
        return translations.t("auth.error.operationNotAllowed")
    case .tooManyRequests:
        return translations.t("auth.error.tooManyRequests")
    case .requiresRecentLogin:
        return translations.t("auth.error.requiresRecentLogin")
    default:
        return error.localizedDescription
    }
}

struct ContentView: View {
    private enum RegularPane {
        case taskList
        case settings
    }

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var path = AppRoute.initialPath
    @State private var theme: String = "system"
    @State private var settingsListener: ListenerRegistration?
    @State private var authHandle: AuthStateDidChangeListenerHandle?
    @State private var selectedTaskListId: String? = "__initial__"
    @State private var selectedRegularPane: RegularPane = .taskList
    @State private var splitVisibility: NavigationSplitViewVisibility = .all
    @State private var preferredCompactColumn: NavigationSplitViewColumn = .sidebar
    @State private var pendingPasswordResetCode: String?
    @State private var pendingShareCode: String?
    @StateObject private var translations = Translations()
    @Binding private var pendingDeepLink: PendingDeepLink?

    init(pendingDeepLink: Binding<PendingDeepLink?> = .constant(nil)) {
        _pendingDeepLink = pendingDeepLink
    }

    private var colorScheme: ColorScheme? {
        switch theme {
        case "light": return .light
        case "dark": return .dark
        default: return nil
        }
    }

    public var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                regularRoot
            } else {
                compactRoot
            }
        }
        .preferredColorScheme(colorScheme)
        .onAppear { startListening() }
        .onDisappear { stopListening() }
        .onChange(of: pendingDeepLink, initial: true) { _, deepLink in
            handlePendingDeepLink(deepLink)
        }
        .fullScreenCover(
            isPresented: Binding(
                get: { pendingPasswordResetCode != nil },
                set: { presented in
                    if !presented {
                        pendingPasswordResetCode = nil
                    }
                }
            )
        ) {
            if let pendingPasswordResetCode {
                NavigationStack {
                    PasswordResetView(
                        code: pendingPasswordResetCode,
                        onDismiss: { self.pendingPasswordResetCode = nil }
                    )
                }
                .environmentObject(translations)
            }
        }
        .environmentObject(translations)
    }

    private var compactRoot: some View {
        NavigationStack(path: $path) {
            TaskListsView(path: $path, pendingShareCode: $pendingShareCode)
                .navigationDestination(for: AppRoute.self) { route in
                    switch route {
                    case .taskLists:
                        TaskListsView(path: $path, pendingShareCode: $pendingShareCode)
                    case .taskList(let taskListId):
                        TaskListView(initialTaskListId: taskListId)
                    case .settings:
                        SettingsView()
                    }
                }
        }
    }

    private var regularRoot: some View {
        NavigationSplitView(
            columnVisibility: $splitVisibility,
            preferredCompactColumn: $preferredCompactColumn
        ) {
            TaskListsView(
                path: $path,
                pendingShareCode: $pendingShareCode,
                selectedTaskListId: selectedTaskListId,
                onSelectTaskList: { taskListId in
                    selectedTaskListId = taskListId
                    selectedRegularPane = .taskList
                },
                onOpenSettings: {
                    selectedRegularPane = .settings
                }
            )
            .navigationSplitViewColumnWidth(min: 360, ideal: 360, max: 360)
        } detail: {
            ZStack {
                Color(.systemBackground)
                if selectedRegularPane == .settings {
                    SettingsView()
                } else {
                    RegularTaskListView(selectedTaskListId: $selectedTaskListId)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
        }
    }

    private func startListening() {
        authHandle = Auth.auth().addStateDidChangeListener { _, user in
            settingsListener?.remove()
            guard let uid = user?.uid else {
                theme = "system"
                Task { translations.load(language: "ja") }
                return
            }
            settingsListener = Firestore.firestore()
                .collection("settings").document(uid)
                .addSnapshotListener { snapshot, _ in
                    theme = snapshot?.data()?["theme"] as? String ?? "system"
                    let language = snapshot?.data()?["language"] as? String ?? "ja"
                    Task { translations.load(language: language) }
                }
        }
    }

    private func stopListening() {
        settingsListener?.remove()
        if let handle = authHandle { Auth.auth().removeStateDidChangeListener(handle) }
    }

    private func handlePendingDeepLink(_ deepLink: PendingDeepLink?) {
        guard let deepLink else {
            return
        }

        switch deepLink {
        case .passwordReset(let code):
            pendingPasswordResetCode = code
        case .shareCode(let shareCode):
            pendingShareCode = shareCode
            selectedRegularPane = .taskList
        }

        pendingDeepLink = nil
    }
}

private enum TaskListTopChromeMetrics {
    static let compactBackRowHeight: CGFloat = 34
    static let compactIndicatorTopSpacing: CGFloat = 4
    static let compactBottomSpacing: CGFloat = 10
    static let regularTopSpacing: CGFloat = 8
    static let regularBottomSpacing: CGFloat = 10
    static let horizontalPadding: CGFloat = 6
}

private enum TaskListDetailMetrics {
    static let headerIconButtonSize: CGFloat = 28
    static let headerIconSize: CGFloat = 16
    static let headerActionSpacing: CGFloat = 10
    static let inputCornerRadius: CGFloat = 14
    static let inputHorizontalPadding: CGFloat = 14
    static let inputVerticalPadding: CGFloat = 10
    static let inputBorderWidth: CGFloat = 1
    static let actionRowTopPadding: CGFloat = 2
    static let actionIconSize: CGFloat = 13
    static let taskRowSpacing: CGFloat = 8
    static let taskRowVerticalPadding: CGFloat = 8
    static let dragTouchHeight: CGFloat = 44
    static let dragTouchWidth: CGFloat = 20
    static let completionTouchHeight: CGFloat = 44
    static let completionTouchWidth: CGFloat = 26
    static let completionDotSize: CGFloat = 18
    static let trailingDateButtonWidth: CGFloat = 28
    static let trailingDateButtonHeight: CGFloat = 44
    static let trailingDateIconSize: CGFloat = 17
    static let titleBottomPadding: CGFloat = 2
    static let contentHorizontalPadding: CGFloat = 16
    static let contentBottomPadding: CGFloat = 8
}

private struct ScreenScaffold<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            VStack {
                Spacer(minLength: 0)

                VStack(spacing: 24) {
                    Text(title)
                        .font(.title.weight(.semibold))

                    content()
                }
                .frame(maxWidth: 480)
                .padding(24)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(Color(.separator), lineWidth: 1)
                )

                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, 16)
            .padding(.vertical, 24)
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct TaskListIndicatorRow: View {
    let taskLists: [TaskListDetail]
    let selectedIndex: Int
    let onSelect: (String) -> Void

    var body: some View {
        HStack(spacing: 4) {
            ForEach(Array(taskLists.enumerated()), id: \.element.id) { index, taskList in
                Button {
                    onSelect(taskList.id)
                } label: {
                    Circle()
                        .fill(Color.primary.opacity(index == selectedIndex ? 1 : 0.4))
                        .frame(width: 8, height: 8)
                        .frame(width: 24, height: 24)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(taskList.name)、\(taskLists.count)件中\(index + 1)件目")
            }
        }
    }
}

private struct TaskListTopChrome: View {
    @EnvironmentObject var translations: Translations
    let showBackButton: Bool
    let taskLists: [TaskListDetail]
    let selectedIndex: Int
    let onSelect: (String) -> Void
    let onBack: (() -> Void)?

    var body: some View {
        VStack(spacing: 0) {
            if showBackButton {
                VStack(spacing: 0) {
                    HStack {
                        if let onBack {
                            Button(action: onBack) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 22, weight: .semibold))
                                    .foregroundStyle(.primary)
                                    .frame(width: 32, height: 32)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(translations.t("common.back"))
                        }

                        Spacer()
                    }
                    .frame(height: TaskListTopChromeMetrics.compactBackRowHeight)
                    .padding(.horizontal, TaskListTopChromeMetrics.horizontalPadding)

                    if taskLists.count > 1 {
                        TaskListIndicatorRow(
                            taskLists: taskLists,
                            selectedIndex: selectedIndex,
                            onSelect: onSelect
                        )
                        .padding(.top, TaskListTopChromeMetrics.compactIndicatorTopSpacing)
                    }
                }

                Spacer()
                    .frame(height: TaskListTopChromeMetrics.compactBottomSpacing)
            } else if taskLists.count > 1 {
                TaskListIndicatorRow(
                    taskLists: taskLists,
                    selectedIndex: selectedIndex,
                    onSelect: onSelect
                )
                .padding(.top, TaskListTopChromeMetrics.regularTopSpacing)

                Spacer()
                    .frame(height: TaskListTopChromeMetrics.regularBottomSpacing)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

private struct AuthView: View {
    let language: String
    @EnvironmentObject var translations: Translations
    @State private var selectedScreen: AuthScreen = .signIn

    var body: some View {
        ScreenScaffold(title: title) {
            VStack(spacing: 16) {
                Picker("", selection: $selectedScreen) {
                    Text(translations.t("auth.tabs.signin")).tag(AuthScreen.signIn)
                    Text(translations.t("auth.tabs.signup")).tag(AuthScreen.signUp)
                    Text(translations.t("auth.passwordReset.title")).tag(AuthScreen.reset)
                }
                .pickerStyle(.segmented)

                switch selectedScreen {
                case .signIn:
                    SignInView {
                        selectedScreen = .reset
                    }
                case .signUp:
                    SignUpView(language: language) {
                        selectedScreen = .signIn
                    }
                case .reset:
                    PasswordResetRequestView(language: language) {
                        selectedScreen = .signIn
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
    }

    private var title: String {
        switch selectedScreen {
        case .signIn:
            return translations.t("auth.button.signin")
        case .signUp:
            return translations.t("auth.button.signup")
        case .reset:
            return translations.t("auth.passwordReset.title")
        }
    }
}

private struct SignInView: View {
    let onShowReset: () -> Void
    @EnvironmentObject var translations: Translations
    @State private var email = ""
    @State private var password = ""
    @State private var emailError: String?
    @State private var passwordError: String?
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 16) {
            TextField(translations.t("auth.form.email"), text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: .infinity)

            SecureField(translations.t("auth.form.password"), text: $password)
                .textContentType(.password)
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: .infinity)

            ForEach([emailError, passwordError, errorMessage].compactMap { $0 }, id: \.self) { message in
                Text(message)
                    .foregroundStyle(.red)
                    .font(.caption)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(isLoading ? translations.t("auth.button.signingIn") : translations.t("auth.button.signin")) {
                signIn()
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
            .frame(maxWidth: .infinity)

            Button(translations.t("auth.button.forgotPassword")) {
                onShowReset()
            }
            .buttonStyle(.bordered)
            .frame(maxWidth: .infinity)
        }
    }

    private func signIn() {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        emailError = trimmedEmail.isEmpty
            ? translations.t("auth.validation.email.required")
            : (!isValidEmail(trimmedEmail) ? translations.t("auth.validation.email.invalid") : nil)
        passwordError = password.isEmpty ? translations.t("auth.validation.password.required") : nil
        guard emailError == nil, passwordError == nil else {
            return
        }

        isLoading = true
        errorMessage = nil
        Auth.auth().signIn(withEmail: trimmedEmail, password: password) { _, error in
            isLoading = false
            if let error {
                errorMessage = resolveAuthErrorMessage(translations: translations, error: error)
            } else {
                logLogin()
            }
        }
    }
}

private struct SignUpView: View {
    let language: String
    let onBackToSignIn: () -> Void
    @EnvironmentObject var translations: Translations
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var emailError: String?
    @State private var passwordError: String?
    @State private var confirmPasswordError: String?
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 16) {
            TextField(translations.t("auth.form.email"), text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: .infinity)

            SecureField(translations.t("auth.form.password"), text: $password)
                .textContentType(.newPassword)
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: .infinity)

            SecureField(translations.t("auth.form.confirmPassword"), text: $confirmPassword)
                .textContentType(.newPassword)
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: .infinity)

            ForEach([emailError, passwordError, confirmPasswordError, errorMessage].compactMap { $0 }, id: \.self) { message in
                Text(message)
                    .foregroundStyle(.red)
                    .font(.caption)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(isLoading ? translations.t("auth.button.signingUp") : translations.t("auth.button.signup")) {
                signUp()
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
            .frame(maxWidth: .infinity)

            Button(translations.t("auth.button.backToSignIn")) {
                onBackToSignIn()
            }
            .buttonStyle(.bordered)
            .frame(maxWidth: .infinity)
        }
    }

    private func signUp() {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        emailError = trimmedEmail.isEmpty
            ? translations.t("auth.validation.email.required")
            : (!isValidEmail(trimmedEmail) ? translations.t("auth.validation.email.invalid") : nil)
        passwordError = password.isEmpty
            ? translations.t("auth.validation.password.required")
            : (password.count < 8 ? translations.t("auth.validation.password.tooShort") : nil)
        confirmPasswordError = confirmPassword.isEmpty
            ? translations.t("auth.validation.confirmPassword.required")
            : (password != confirmPassword ? translations.t("auth.validation.confirmPassword.notMatch") : nil)
        guard emailError == nil, passwordError == nil, confirmPasswordError == nil else {
            return
        }

        isLoading = true
        errorMessage = nil
        let normalizedLanguage = normalizeLanguageCode(language)
        let auth = Auth.auth()
        let db = Firestore.firestore()
        auth.createUser(withEmail: trimmedEmail, password: password) { result, error in
            if let error {
                isLoading = false
                errorMessage = resolveAuthErrorMessage(translations: translations, error: error)
                return
            }

            guard let uid = result?.user.uid else {
                isLoading = false
                errorMessage = translations.t("auth.error.general")
                return
            }

            let now = Date().timeIntervalSince1970 * 1000
            let taskListId = db.collection("taskLists").document().documentID
            let batch = db.batch()
            batch.setData([
                "theme": "system",
                "language": normalizedLanguage,
                "taskInsertPosition": "top",
                "autoSort": false,
                "createdAt": now,
                "updatedAt": now,
            ], forDocument: db.collection("settings").document(uid))
            batch.setData([
                "id": taskListId,
                "name": initialTaskListNameByLanguage[normalizedLanguage] ?? initialTaskListNameByLanguage["ja"] ?? "📒個人",
                "tasks": [:],
                "history": [],
                "shareCode": NSNull(),
                "background": NSNull(),
                "memberCount": 1,
                "createdAt": now,
                "updatedAt": now,
            ], forDocument: db.collection("taskLists").document(taskListId))
            batch.setData([
                taskListId: ["order": 1.0],
                "createdAt": now,
                "updatedAt": now,
            ], forDocument: db.collection("taskListOrder").document(uid))
            batch.commit { commitError in
                isLoading = false
                if let commitError {
                    errorMessage = resolveAuthErrorMessage(translations: translations, error: commitError)
                } else {
                    logSignUp()
                }
            }
        }
    }
}

private struct PasswordResetRequestView: View {
    let language: String
    let onBackToSignIn: () -> Void
    @EnvironmentObject var translations: Translations
    @State private var email = ""
    @State private var emailError: String?
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 16) {
            Text(translations.t("auth.passwordReset.instruction"))
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            TextField(translations.t("auth.form.email"), text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: .infinity)

            ForEach([emailError, errorMessage].compactMap { $0 }, id: \.self) { message in
                Text(message)
                    .foregroundStyle(.red)
                    .font(.caption)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if let successMessage {
                Text(successMessage)
                    .foregroundStyle(.green)
                    .font(.caption)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(isLoading ? translations.t("auth.button.sending") : translations.t("auth.button.sendResetEmail")) {
                sendResetEmail()
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
            .frame(maxWidth: .infinity)

            Button(translations.t("auth.button.backToSignIn")) {
                onBackToSignIn()
            }
            .buttonStyle(.bordered)
            .frame(maxWidth: .infinity)
        }
    }

    private func sendResetEmail() {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        emailError = trimmedEmail.isEmpty
            ? translations.t("auth.validation.email.required")
            : (!isValidEmail(trimmedEmail) ? translations.t("auth.validation.email.invalid") : nil)
        guard emailError == nil else {
            return
        }

        isLoading = true
        errorMessage = nil
        successMessage = nil
        let auth = Auth.auth()
        auth.languageCode = normalizeLanguageCode(language)
        let actionCodeSettings = ActionCodeSettings()
        actionCodeSettings.url = URL(string: passwordResetURLString())
        actionCodeSettings.handleCodeInApp = false
        auth.sendPasswordReset(withEmail: trimmedEmail, actionCodeSettings: actionCodeSettings) { error in
            isLoading = false
            if let error {
                errorMessage = resolveAuthErrorMessage(translations: translations, error: error)
            } else {
                logPasswordResetEmailSent()
                successMessage = translations.t("auth.passwordReset.success")
            }
        }
    }
}

private struct PasswordResetView: View {
    let code: String
    let onDismiss: () -> Void
    @EnvironmentObject var translations: Translations
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var isVerifying = true
    @State private var isSubmitting = false

    private var isFormDisabled: Bool {
        isVerifying || isSubmitting || newPassword.isEmpty || confirmPassword.isEmpty
    }

    var body: some View {
        ScreenScaffold(title: translations.t("auth.passwordReset.title")) {
            VStack(spacing: 16) {
                if let successMessage {
                    Text(successMessage)
                        .foregroundStyle(.green)
                        .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    SecureField(translations.t("auth.passwordReset.newPassword"), text: $newPassword)
                        .textContentType(.newPassword)
                        .textFieldStyle(.roundedBorder)
                        .frame(maxWidth: .infinity)

                    SecureField(translations.t("auth.passwordReset.confirmNewPassword"), text: $confirmPassword)
                        .textContentType(.newPassword)
                        .textFieldStyle(.roundedBorder)
                        .frame(maxWidth: .infinity)
                }

                if let errorMessage {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .font(.caption)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if isVerifying {
                    ProgressView()
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button(isSubmitting ? translations.t("auth.passwordReset.settingNewPassword") : translations.t("auth.passwordReset.setNewPassword")) {
                    submit()
                }
                .buttonStyle(.borderedProminent)
                .disabled(successMessage != nil || isFormDisabled)
                .frame(maxWidth: .infinity)

                Button(translations.t("common.close")) {
                    onDismiss()
                }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity)
        }
        .onAppear(perform: verifyCode)
    }

    private func verifyCode() {
        isVerifying = true
        errorMessage = nil
        Auth.auth().verifyPasswordResetCode(code) { _, error in
            isVerifying = false
            if let error {
                errorMessage = resolvePasswordResetErrorMessage(translations: translations, error: error)
            }
        }
    }

    private func submit() {
        guard !newPassword.isEmpty else {
            errorMessage = translations.t("auth.validation.password.required")
            return
        }

        guard newPassword.count >= 8 else {
            errorMessage = translations.t("auth.validation.password.tooShort")
            return
        }

        guard !confirmPassword.isEmpty else {
            errorMessage = translations.t("auth.validation.confirmPassword.required")
            return
        }

        guard newPassword == confirmPassword else {
            errorMessage = translations.t("auth.validation.confirmPassword.notMatch")
            return
        }

        isSubmitting = true
        errorMessage = nil
        Auth.auth().confirmPasswordReset(withCode: code, newPassword: newPassword) { error in
            isSubmitting = false
            if let error {
                errorMessage = resolvePasswordResetErrorMessage(translations: translations, error: error)
                return
            }

            successMessage = translations.t("auth.passwordReset.resetSuccess")
        }
    }
}

private struct DragHandleIcon: View {
    var body: some View {
        VStack(spacing: 3) {
            HStack(spacing: 3) {
                Circle().frame(width: 4, height: 4)
                Circle().frame(width: 4, height: 4)
            }
            HStack(spacing: 3) {
                Circle().frame(width: 4, height: 4)
                Circle().frame(width: 4, height: 4)
            }
            HStack(spacing: 3) {
                Circle().frame(width: 4, height: 4)
                Circle().frame(width: 4, height: 4)
            }
        }
    }
}

private struct TaskListsView: View {
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isLoggedIn = Auth.auth().currentUser != nil
    @State private var authStateHandle: AuthStateDidChangeListenerHandle?
    @StateObject private var viewModel = TaskListsViewModel()
    @StateObject private var calendarViewModel = CalendarViewModel()
    @State private var showCalendarSheet = false
    @State private var draggingTaskListId: String? = nil
    @State private var dragOffset: CGFloat = 0
    @State private var dragStartLocationY: CGFloat? = nil
    @State private var dragOrderedTaskLists: [TaskListSummary]? = nil
    @State private var taskListItemHeights: [String: CGFloat] = [:]
    @State private var autoScrollSpeed: CGFloat = 0
    @State private var autoScrollTimer: Timer? = nil
    @State private var scrollViewRef: UIScrollView? = nil
    @State private var showCreateSheet = false
    @State private var createName = ""
    @State private var createBackground: String? = nil
    @State private var showJoinSheet = false
    @State private var joinListInput = ""
    @State private var joiningList = false
    @State private var joinListError: String? = nil
    @Binding var path: [AppRoute]
    @Binding var pendingShareCode: String?
    var selectedTaskListId: String? = nil
    var onSelectTaskList: ((String) -> Void)? = nil
    var onOpenSettings: (() -> Void)? = nil

    private var displayTaskLists: [TaskListSummary] {
        dragOrderedTaskLists ?? viewModel.taskLists
    }

    private func checkTaskListSwap() -> CGFloat {
        guard var ordered = dragOrderedTaskLists,
              let draggingId = draggingTaskListId,
              let currentIdx = ordered.firstIndex(where: { $0.id == draggingId }),
              let currentHeight = taskListItemHeights[draggingId] else { return 0 }

        let spacing: CGFloat = 24

        if currentIdx + 1 < ordered.count {
            let nextId = ordered[currentIdx + 1].id
            let nextHeight = taskListItemHeights[nextId] ?? currentHeight
            let threshold = currentHeight / 2 + spacing + nextHeight / 2
            if dragOffset > threshold {
                ordered.swapAt(currentIdx, currentIdx + 1)
                dragOrderedTaskLists = ordered
                let correction = -(nextHeight + spacing)
                dragOffset += correction
                return correction
            }
        }

        if currentIdx > 0 {
            let prevId = ordered[currentIdx - 1].id
            let prevHeight = taskListItemHeights[prevId] ?? currentHeight
            let threshold = prevHeight / 2 + spacing + currentHeight / 2
            if dragOffset < -threshold {
                ordered.swapAt(currentIdx - 1, currentIdx)
                dragOrderedTaskLists = ordered
                let correction = prevHeight + spacing
                dragOffset += correction
                return correction
            }
        }

        return 0
    }

    private func updateAutoScroll(fingerY: CGFloat) {
        guard let sv = scrollViewRef else { return }
        let viewportHeight = sv.bounds.height
        let edgeZone: CGFloat = 80
        let maxSpeed: CGFloat = 8

        let fingerInViewport = fingerY

        if fingerInViewport < edgeZone {
            let ratio = 1.0 - max(0, fingerInViewport) / edgeZone
            autoScrollSpeed = -maxSpeed * ratio
        } else if fingerInViewport > viewportHeight - edgeZone {
            let ratio = 1.0 - max(0, viewportHeight - fingerInViewport) / edgeZone
            autoScrollSpeed = maxSpeed * ratio
        } else {
            autoScrollSpeed = 0
        }

        if autoScrollSpeed != 0 && autoScrollTimer == nil {
            autoScrollTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [self] _ in
                guard let sv = self.scrollViewRef, self.draggingTaskListId != nil else {
                    self.stopAutoScroll()
                    return
                }
                let oldOffset = sv.contentOffset.y
                let maxOffset = max(0, sv.contentSize.height - sv.bounds.height)
                let newOffset = min(max(0, oldOffset + self.autoScrollSpeed), maxOffset)
                sv.setContentOffset(CGPoint(x: 0, y: newOffset), animated: false)
                let scrolledBy = sv.contentOffset.y - oldOffset
                if scrolledBy != 0 {
                    self.dragOffset += scrolledBy
                    self.dragStartLocationY = (self.dragStartLocationY ?? 0) - scrolledBy
                    let correction = self.checkTaskListSwap()
                    if correction != 0 {
                        UISelectionFeedbackGenerator().selectionChanged()
                        self.dragStartLocationY = (self.dragStartLocationY ?? 0) - correction
                    }
                }
            }
        } else if autoScrollSpeed == 0 {
            stopAutoScroll()
        }
    }

    private func stopAutoScroll() {
        autoScrollTimer?.invalidate()
        autoScrollTimer = nil
        autoScrollSpeed = 0
    }

    private var userEmail: String {
        Auth.auth().currentUser?.email ?? ""
    }

    private var displayedUserEmail: String {
        userEmail.isEmpty ? translations.t("drawerNoEmail") : userEmail
    }

    private func openTaskList(_ taskListId: String) {
        if let onSelectTaskList {
            onSelectTaskList(taskListId)
        } else {
            path.append(AppRoute.taskList(taskListId: taskListId))
        }
    }

    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                HStack {
                    Text(displayedUserEmail)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    Spacer()

                    if let onOpenSettings {
                        Button(action: onOpenSettings) {
                            Image(systemName: "gearshape")
                                .font(.title3)
                                .foregroundStyle(.primary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(translations.t("settings.title"))
                    } else {
                        NavigationLink(value: AppRoute.settings) {
                            Image(systemName: "gearshape")
                                .font(.title3)
                                .foregroundStyle(.primary)
                        }
                        .accessibilityLabel(translations.t("settings.title"))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 16)

                Button {
                    showCalendarSheet = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "calendar")
                            .font(.body)
                        Text(translations.t("app.calendarCheckButton"))
                            .font(.body)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .contentShape(Rectangle())
                    .overlay(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .stroke(Color(.separator), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 16)
                .padding(.bottom, 16)

                if viewModel.status == .loading {
                    VStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                } else if viewModel.status == .error {
                    Text(translations.t("app.loadError"))
                        .foregroundStyle(.red)
                        .font(.subheadline)
                        .padding(.horizontal, 16)
                } else if viewModel.taskLists.isEmpty {
                    Text(translations.t("app.emptyState"))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 16)
                } else {
                    ScrollView {
                        VStack(spacing: 4) {
                            ScrollViewAccessor(scrollView: $scrollViewRef)
                                .frame(width: 0, height: 0)
                            ForEach(displayTaskLists) { taskList in
                                let isSelected = selectedTaskListId == taskList.id
                                HStack(spacing: 16) {
                                    DragHandleIcon()
                                        .foregroundStyle(Color(.secondaryLabel))
                                        .frame(minWidth: 44, minHeight: 44)
                                        .contentShape(Rectangle())
                                        .accessibilityLabel(translations.t("app.dragHint"))
                                        .gesture(
                                            DragGesture(minimumDistance: 2, coordinateSpace: .named("taskListList"))
                                                .onChanged { value in
                                                    if draggingTaskListId == nil {
                                                        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                                        draggingTaskListId = taskList.id
                                                        dragOrderedTaskLists = viewModel.taskLists
                                                        dragStartLocationY = value.location.y
                                                    }
                                                    guard let startY = dragStartLocationY else { return }
                                                    dragOffset = value.location.y - startY
                                                    let correction = checkTaskListSwap()
                                                    if correction != 0 {
                                                        UISelectionFeedbackGenerator().selectionChanged()
                                                        dragStartLocationY = startY - correction
                                                    }
                                                    updateAutoScroll(fingerY: value.location.y)
                                                }
                                                .onEnded { _ in
                                                    stopAutoScroll()
                                                    if let ordered = dragOrderedTaskLists,
                                                       ordered.map(\.id) != viewModel.taskLists.map(\.id) {
                                                        persistTaskListOrder(ordered.map(\.id))
                                                    }
                                                    withAnimation(reduceMotion ? .none : .easeInOut(duration: 0.15)) {
                                                        dragOffset = 0
                                                    }
                                                    dragStartLocationY = nil
                                                    draggingTaskListId = nil
                                                    dragOrderedTaskLists = nil
                                                }
                                        )

                                    Circle()
                                        .fill(taskList.background.flatMap { Color(hex: $0) } ?? Color(.systemGray4))
                                        .frame(width: 14, height: 14)
                                        .overlay(
                                            Circle()
                                                .stroke(Color(.separator), lineWidth: taskList.background == nil ? 1 : 0)
                                        )
                                        .accessibilityHidden(true)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(taskList.name)
                                            .font(.body.weight(.medium))
                                            .foregroundStyle(.primary)
                                        Text(translations.t("taskList.taskCount", ["count": "\(taskList.taskCount)"]))
                                            .font(.subheadline)
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()
                                }
                                .contentShape(Rectangle())
                                .accessibilityElement(children: .combine)
                                .accessibilityLabel("\(taskList.name)、\(taskList.taskCount)個のタスク")
                                .onTapGesture {
                                    if draggingTaskListId == nil {
                                        openTaskList(taskList.id)
                                    }
                                }
                                .offset(y: draggingTaskListId == taskList.id ? dragOffset : 0)
                                .zIndex(draggingTaskListId == taskList.id ? 1 : 0)
                                .opacity(draggingTaskListId == taskList.id ? 0.8 : 1.0)
                                .scaleEffect(draggingTaskListId == taskList.id ? 1.03 : 1.0)
                                .animation(draggingTaskListId == taskList.id || reduceMotion ? nil : .easeInOut(duration: 0.2),
                                           value: displayTaskLists.map(\.id))
                                .background(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .fill(isSelected ? Color(.secondarySystemFill) : Color.clear)
                                )
                                .background(GeometryReader { geo in
                                    Color.clear.preference(
                                        key: TaskListRowFrameKey.self,
                                        value: [taskList.id: geo.size.height]
                                    )
                                })
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .coordinateSpace(name: "taskListList")
                    .onPreferenceChange(TaskListRowFrameKey.self) { heights in
                        if taskListItemHeights != heights {
                            taskListItemHeights = heights
                        }
                    }
                }

                Spacer()

                HStack(spacing: 12) {
                    Button {
                        createName = ""
                        createBackground = nil
                        showCreateSheet = true
                    } label: {
                        Text(translations.t("app.createNew"))
                            .font(.body.weight(.medium))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.accentColor)
                            .foregroundStyle(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    Button {
                        joinListInput = ""
                        joinListError = nil
                        showJoinSheet = true
                    } label: {
                        Text(translations.t("app.joinList"))
                            .font(.body.weight(.medium))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 24, style: .continuous)
                                    .stroke(Color(.separator), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            authStateHandle = Auth.auth().addStateDidChangeListener { _, user in
                isLoggedIn = user != nil
                viewModel.bind(uid: user?.uid)
                calendarViewModel.bind(uid: user?.uid)
            }
        }
        .onDisappear {
            if let handle = authStateHandle {
                Auth.auth().removeStateDidChangeListener(handle)
            }
            viewModel.reset()
            calendarViewModel.reset()
        }
        .onChange(of: viewModel.taskLists) { _, taskLists in
            guard let onSelectTaskList else {
                return
            }

            guard !taskLists.isEmpty else {
                return
            }

            if let selectedTaskListId, taskLists.contains(where: { $0.id == selectedTaskListId }) {
                return
            }

            onSelectTaskList(taskLists[0].id)
        }
        .onChange(of: pendingShareCode, initial: true) { _, shareCode in
            consumePendingShareCode(shareCode)
        }
        .onChange(of: isLoggedIn) { _, nextIsLoggedIn in
            if nextIsLoggedIn {
                consumePendingShareCode(pendingShareCode)
            }
        }
        .sheet(isPresented: $showCalendarSheet) {
            NavigationStack {
                CalendarSheetView(calendarTasks: calendarViewModel.calendarTasks)
                    .navigationTitle(translations.t("app.calendar"))
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button(translations.t("common.close")) { showCalendarSheet = false }
                        }
                    }
            }
            .presentationDetents([.large])
        }
        .sheet(isPresented: $showCreateSheet) {
            NavigationStack {
                let colorOptions: [String?] = [nil, "#F87171", "#FBBF24", "#34D399", "#38BDF8", "#818CF8", "#A78BFA"]
                VStack(spacing: 24) {
                    TextField(translations.t("app.taskListName"), text: $createName)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text(translations.t("taskList.selectColor"))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal)

                        HStack(spacing: 12) {
                            ForEach(colorOptions.indices, id: \.self) { i in
                                let c = colorOptions[i]
                                let isSelected = createBackground == c
                                Button { createBackground = c } label: {
                                    Circle()
                                        .fill(c.flatMap { Color(hex: $0) } ?? Color(.systemBackground))
                                        .frame(width: 44, height: 44)
                                        .overlay(
                                            Circle().stroke(Color(.separator), lineWidth: c == nil ? 1 : 0)
                                        )
                                        .overlay(
                                            Circle().stroke(Color.accentColor, lineWidth: isSelected ? 2.5 : 0).padding(-3)
                                        )
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(colorLabel(c))
                            }
                        }
                        .padding(.horizontal)
                    }

                    Spacer()
                }
                .padding(.top, 24)
                .navigationTitle(translations.t("app.createTaskList"))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(translations.t("common.cancel")) { showCreateSheet = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button(translations.t("app.create")) {
                            let trimmed = createName.trimmingCharacters(in: .whitespaces)
                            if !trimmed.isEmpty {
                                createTaskList(name: trimmed, background: createBackground)
                            }
                        }
                        .disabled(createName.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
            .presentationDetents([.medium])
        }
        .fullScreenCover(
            isPresented: Binding(
                get: { !isLoggedIn },
                set: { presented in
                    if !presented {
                        isLoggedIn = true
                    }
                }
            )
        ) {
            NavigationStack {
                AuthView(language: translations.language)
            }
            .environmentObject(translations)
        }
        .sheet(isPresented: $showJoinSheet) {
            NavigationStack {
                VStack(spacing: 16) {
                    Text(translations.t("app.joinListDescription"))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    if let error = joinListError {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.subheadline)
                    }

                    TextField(translations.t("app.shareCodePlaceholder"), text: $joinListInput)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.characters)
                        .disableAutocorrection(true)

                    Spacer()
                }
                .padding()
                .navigationTitle(translations.t("app.joinListTitle"))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(translations.t("common.cancel")) { showJoinSheet = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button(joiningList ? translations.t("app.joining") : translations.t("app.join")) {
                            Task {
                                let code = joinListInput.trimmingCharacters(in: .whitespaces).uppercased()
                                guard !code.isEmpty else { return }
                                joiningList = true
                                joinListError = nil
                                do {
                                    guard let taskListId = try await fetchTaskListIdByShareCode(code) else {
                                        joinListError = translations.t("pages.sharecode.notFound")
                                        joiningList = false
                                        return
                                    }
                                    if viewModel.taskLists.contains(where: { $0.id == taskListId }) {
                                        showJoinSheet = false
                                        openTaskList(taskListId)
                                        joiningList = false
                                        return
                                    }
                                    try await addSharedTaskListToOrder(taskListId: taskListId)
                                    logShareCodeJoin()
                                    showJoinSheet = false
                                    openTaskList(taskListId)
                                } catch {
                                    joinListError = error.localizedDescription
                                }
                                joiningList = false
                            }
                        }
                        .disabled(joinListInput.trimmingCharacters(in: .whitespaces).isEmpty || joiningList)
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }

    private func persistTaskListOrder(_ ids: [String]) {
        logTaskListReorder()
        guard let uid = Auth.auth().currentUser?.uid else { return }
        var updates: [String: Any] = ["updatedAt": Int64(Date().timeIntervalSince1970 * 1000)]
        for (i, id) in ids.enumerated() {
            updates["\(id).order"] = Double(i + 1)
        }
        Firestore.firestore().collection("taskListOrder").document(uid).updateData(updates)
    }

    private func createTaskList(name: String, background: String?) {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        let db = Firestore.firestore()
        let taskListId = db.collection("taskLists").document().documentID
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let newOrder = Double(viewModel.taskLists.count + 1)

        var newTaskList: [String: Any] = [
            "id": taskListId,
            "name": name,
            "tasks": [String: Any](),
            "history": [Any](),
            "shareCode": NSNull(),
            "memberCount": 1,
            "createdAt": now,
            "updatedAt": now,
        ]
        if let background {
            newTaskList["background"] = background
        } else {
            newTaskList["background"] = NSNull()
        }

        let batch = db.batch()
        batch.setData(newTaskList, forDocument: db.collection("taskLists").document(taskListId))
        batch.setData([
            "\(taskListId)": ["order": newOrder],
            "updatedAt": now,
        ] as [String: Any], forDocument: db.collection("taskListOrder").document(uid), merge: true)

        batch.commit { error in
            if error == nil {
                logTaskListCreate()
                showCreateSheet = false
                openTaskList(taskListId)
            }
        }
    }

    private func consumePendingShareCode(_ shareCode: String?) {
        guard isLoggedIn, let shareCode else {
            return
        }

        let normalized = shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !normalized.isEmpty else {
            pendingShareCode = nil
            return
        }

        pendingShareCode = nil
        Task {
            do {
                guard let taskListId = try await fetchTaskListIdByShareCode(normalized) else {
                    joinListInput = normalized
                    joinListError = translations.t("pages.sharecode.notFound")
                    showJoinSheet = true
                    return
                }
                if !viewModel.taskLists.contains(where: { $0.id == taskListId }) {
                    try await addSharedTaskListToOrder(taskListId: taskListId)
                    logShareCodeJoin()
                }
                showJoinSheet = false
                joinListError = nil
                openTaskList(taskListId)
            } catch {
                joinListInput = normalized
                joinListError = error.localizedDescription
                showJoinSheet = true
            }
        }
    }
}

private struct TaskListView: View {
    @EnvironmentObject var translations: Translations
    let initialTaskListId: String
    @Environment(\.dismiss) private var dismiss
    @State private var authStateHandle: AuthStateDidChangeListenerHandle?
    @State private var selectedTaskListId: String
    @StateObject private var viewModel = TaskListDetailsViewModel()
    @StateObject private var settingsViewModel = SettingsViewModel()

    init(initialTaskListId: String) {
        self.initialTaskListId = initialTaskListId
        _selectedTaskListId = State(initialValue: initialTaskListId)
    }

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.status == .loading {
                VStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else if viewModel.status == .error {
                VStack {
                    Spacer()
                    Text(translations.t("app.loadError"))
                        .foregroundStyle(.red)
                    Spacer()
                }
            } else if viewModel.taskLists.isEmpty {
                VStack {
                    Spacer()
                    Text(translations.t("pages.tasklist.noTasks"))
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            } else {
                taskListPager
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(resolveTaskListBackgroundColor(currentTaskList?.background).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .safeAreaInset(edge: .top, spacing: 0) {
            TaskListTopChrome(
                showBackButton: true,
                taskLists: viewModel.taskLists,
                selectedIndex: selectedTaskListIndex,
                onSelect: { selectedTaskListId = $0 },
                onBack: { dismiss() }
            )
        }
        .onAppear {
            authStateHandle = Auth.auth().addStateDidChangeListener { _, user in
                viewModel.bind(uid: user?.uid)
                settingsViewModel.bind(uid: user?.uid)
            }
        }
        .onDisappear {
            if let handle = authStateHandle {
                Auth.auth().removeStateDidChangeListener(handle)
            }
            viewModel.reset()
            settingsViewModel.reset()
        }
        .onChange(of: viewModel.taskLists) { _, taskLists in
            guard !taskLists.isEmpty else {
                dismiss()
                return
            }

            if taskLists.contains(where: { $0.id == selectedTaskListId }) {
                return
            }

            if let initialTaskList = taskLists.first(where: { $0.id == initialTaskListId }) {
                selectedTaskListId = initialTaskList.id
            } else if let firstTaskList = taskLists.first {
                selectedTaskListId = firstTaskList.id
            }
        }
    }

    private var currentTaskList: TaskListDetail? {
        viewModel.taskLists.first(where: { $0.id == selectedTaskListId }) ?? viewModel.taskLists.first
    }

    private var selectedTaskListIndex: Int {
        max(0, viewModel.taskLists.firstIndex(where: { $0.id == selectedTaskListId }) ?? 0)
    }

    private var taskListPager: some View {
        VStack(spacing: 0) {
            TabView(selection: $selectedTaskListId) {
                ForEach(viewModel.taskLists) { taskList in
                    TaskListDetailPage(
                        taskList: taskList,
                        taskInsertPosition: settingsViewModel.settings?.taskInsertPosition ?? "bottom",
                        autoSort: settingsViewModel.settings?.autoSort ?? false
                    )
                    .tag(taskList.id)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
        .padding(.bottom, 16)
        .background(resolveTaskListBackgroundColor(currentTaskList?.background))
    }
}

private struct RegularTaskListView: View {
    @EnvironmentObject var translations: Translations
    @Binding var selectedTaskListId: String?
    @State private var authStateHandle: AuthStateDidChangeListenerHandle?
    @StateObject private var viewModel = TaskListDetailsViewModel()
    @StateObject private var settingsViewModel = SettingsViewModel()

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.status == .loading {
                VStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else if viewModel.status == .error {
                VStack {
                    Spacer()
                    Text(translations.t("app.loadError"))
                        .foregroundStyle(.red)
                    Spacer()
                }
            } else if viewModel.taskLists.isEmpty {
                VStack {
                    Spacer()
                    Text(translations.t("app.emptyState"))
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            } else {
                taskListPager
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(resolveTaskListBackgroundColor(currentTaskList?.background))
        .safeAreaInset(edge: .top, spacing: 0) {
            TaskListTopChrome(
                showBackButton: false,
                taskLists: viewModel.taskLists,
                selectedIndex: selectedTaskListIndex,
                onSelect: { selectedTaskListId = $0 },
                onBack: nil
            )
        }
        .onAppear {
            authStateHandle = Auth.auth().addStateDidChangeListener { _, user in
                viewModel.bind(uid: user?.uid)
                settingsViewModel.bind(uid: user?.uid)
            }
        }
        .onDisappear {
            if let handle = authStateHandle {
                Auth.auth().removeStateDidChangeListener(handle)
            }
            viewModel.reset()
            settingsViewModel.reset()
        }
        .onChange(of: viewModel.taskLists) { _, taskLists in
            guard !taskLists.isEmpty else {
                selectedTaskListId = nil
                return
            }

            if let selectedTaskListId, taskLists.contains(where: { $0.id == selectedTaskListId }) {
                return
            }

            selectedTaskListId = taskLists[0].id
        }
    }

    private var currentTaskList: TaskListDetail? {
        guard let currentId = resolvedTaskListId else {
            return viewModel.taskLists.first
        }
        return viewModel.taskLists.first(where: { $0.id == currentId }) ?? viewModel.taskLists.first
    }

    private var resolvedTaskListId: String? {
        if let selectedTaskListId, viewModel.taskLists.contains(where: { $0.id == selectedTaskListId }) {
            return selectedTaskListId
        }
        return viewModel.taskLists.first?.id
    }

    private var selectedTaskListIndex: Int {
        guard let resolvedTaskListId else {
            return 0
        }
        return max(0, viewModel.taskLists.firstIndex(where: { $0.id == resolvedTaskListId }) ?? 0)
    }

    private var taskListPager: some View {
        VStack(spacing: 0) {
            TabView(
                selection: Binding(
                    get: { resolvedTaskListId ?? "" },
                    set: { selectedTaskListId = $0 }
                )
            ) {
                ForEach(viewModel.taskLists) { taskList in
                    TaskListDetailPage(
                        taskList: taskList,
                        taskInsertPosition: settingsViewModel.settings?.taskInsertPosition ?? "bottom",
                        autoSort: settingsViewModel.settings?.autoSort ?? false
                    )
                    .tag(taskList.id)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
        .padding(.bottom, 16)
        .background(resolveTaskListBackgroundColor(currentTaskList?.background))
    }
}

private struct ScrollViewAccessor: UIViewRepresentable {
    @Binding var scrollView: UIScrollView?

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.isUserInteractionEnabled = false
        view.frame = .zero
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        DispatchQueue.main.async {
            if self.scrollView == nil {
                var current = uiView.superview
                while let view = current {
                    if let sv = view as? UIScrollView {
                        self.scrollView = sv
                        return
                    }
                    current = view.superview
                }
            }
        }
    }
}

private struct RowFrameKey: PreferenceKey {
    static var defaultValue: [String: CGFloat] = [:]
    static func reduce(value: inout [String: CGFloat], nextValue: () -> [String: CGFloat]) {
        value.merge(nextValue()) { $1 }
    }
}

private struct TaskListRowFrameKey: PreferenceKey {
    static var defaultValue: [String: CGFloat] = [:]
    static func reduce(value: inout [String: CGFloat], nextValue: () -> [String: CGFloat]) {
        value.merge(nextValue()) { $1 }
    }
}

private struct TaskListDetailPage: View {
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let taskList: TaskListDetail
    let taskInsertPosition: String
    let autoSort: Bool
    @State private var newTaskText = ""
    @State private var editingTaskId: String? = nil
    @State private var editingText: String = ""
    @State private var datePickerTaskId: String? = nil
    @State private var datePickerDate: Date = Date()
    @State private var showDeleteCompletedAlert = false
    @State private var draggingTaskId: String? = nil
    @State private var taskDragOffset: CGFloat = 0
    @State private var taskDragStartLocationY: CGFloat? = nil
    @State private var dragOrderedTasks: [TaskSummary]? = nil
    @State private var taskItemHeights: [String: CGFloat] = [:]
    @State private var taskAutoScrollSpeed: CGFloat = 0
    @State private var taskAutoScrollTimer: Timer? = nil
    @State private var taskScrollViewRef: UIScrollView? = nil
    @FocusState private var isNewTaskFocused: Bool
    @FocusState private var isTextFieldFocused: Bool
    private let db = Firestore.firestore()

    private var displayTasks: [TaskSummary] {
        dragOrderedTasks ?? taskList.tasks
    }

    private func checkTaskSwap() -> CGFloat {
        guard var ordered = dragOrderedTasks,
              let draggingId = draggingTaskId,
              let currentIdx = ordered.firstIndex(where: { $0.id == draggingId }),
              let currentHeight = taskItemHeights[draggingId] else { return 0 }

        let spacing: CGFloat = 12

        if currentIdx + 1 < ordered.count {
            let nextId = ordered[currentIdx + 1].id
            let nextHeight = taskItemHeights[nextId] ?? currentHeight
            let threshold = currentHeight / 2 + spacing + nextHeight / 2
            if taskDragOffset > threshold {
                ordered.swapAt(currentIdx, currentIdx + 1)
                dragOrderedTasks = ordered
                let correction = -(nextHeight + spacing)
                taskDragOffset += correction
                return correction
            }
        }

        if currentIdx > 0 {
            let prevId = ordered[currentIdx - 1].id
            let prevHeight = taskItemHeights[prevId] ?? currentHeight
            let threshold = prevHeight / 2 + spacing + currentHeight / 2
            if taskDragOffset < -threshold {
                ordered.swapAt(currentIdx - 1, currentIdx)
                dragOrderedTasks = ordered
                let correction = prevHeight + spacing
                taskDragOffset += correction
                return correction
            }
        }

        return 0
    }

    private func updateTaskAutoScroll(fingerY: CGFloat) {
        guard let sv = taskScrollViewRef else { return }
        let viewportHeight = sv.bounds.height
        let edgeZone: CGFloat = 80
        let maxSpeed: CGFloat = 8

        let fingerInViewport = fingerY

        if fingerInViewport < edgeZone {
            let ratio = 1.0 - max(0, fingerInViewport) / edgeZone
            taskAutoScrollSpeed = -maxSpeed * ratio
        } else if fingerInViewport > viewportHeight - edgeZone {
            let ratio = 1.0 - max(0, viewportHeight - fingerInViewport) / edgeZone
            taskAutoScrollSpeed = maxSpeed * ratio
        } else {
            taskAutoScrollSpeed = 0
        }

        if taskAutoScrollSpeed != 0 && taskAutoScrollTimer == nil {
            taskAutoScrollTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [self] _ in
                guard let sv = self.taskScrollViewRef, self.draggingTaskId != nil else {
                    self.stopTaskAutoScroll()
                    return
                }
                let oldOffset = sv.contentOffset.y
                let maxOffset = max(0, sv.contentSize.height - sv.bounds.height)
                let newOffset = min(max(0, oldOffset + self.taskAutoScrollSpeed), maxOffset)
                sv.setContentOffset(CGPoint(x: 0, y: newOffset), animated: false)
                let scrolledBy = sv.contentOffset.y - oldOffset
                if scrolledBy != 0 {
                    self.taskDragOffset += scrolledBy
                    self.taskDragStartLocationY = (self.taskDragStartLocationY ?? 0) - scrolledBy
                    let correction = self.checkTaskSwap()
                    if correction != 0 {
                        UISelectionFeedbackGenerator().selectionChanged()
                        self.taskDragStartLocationY = (self.taskDragStartLocationY ?? 0) - correction
                    }
                }
            }
        } else if taskAutoScrollSpeed == 0 {
            stopTaskAutoScroll()
        }
    }

    private func stopTaskAutoScroll() {
        taskAutoScrollTimer?.invalidate()
        taskAutoScrollTimer = nil
        taskAutoScrollSpeed = 0
    }

    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ja_JP")
        f.dateFormat = "M月d日(E)"
        return f
    }()

    private func formatDateDisplay(_ dateStr: String) -> String {
        guard let date = Self.isoFormatter.date(from: dateStr) else { return dateStr }
        return Self.displayFormatter.string(from: date)
    }

    private func autoSortedTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
        tasks
            .sorted { lhs, rhs in
                if lhs.completed != rhs.completed {
                    return !lhs.completed && rhs.completed
                }

                let lhsDate = lhs.date.isEmpty ? "9999-12-31" : lhs.date
                let rhsDate = rhs.date.isEmpty ? "9999-12-31" : rhs.date
                if lhsDate != rhsDate {
                    return lhsDate < rhsDate
                }

                return lhs.order < rhs.order
            }
            .enumerated()
            .map { index, task in
                TaskSummary(
                    id: task.id,
                    text: task.text,
                    completed: task.completed,
                    date: task.date,
                    order: Double(index + 1)
                )
            }
    }

    private func renumberedTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
        tasks.enumerated().map { index, task in
            TaskSummary(
                id: task.id,
                text: task.text,
                completed: task.completed,
                date: task.date,
                order: Double(index + 1)
            )
        }
    }

    private func taskUpdates(_ tasks: [TaskSummary], deletedTaskIds: [String] = []) -> [String: Any] {
        var updates: [String: Any] = ["updatedAt": Int64(Date().timeIntervalSince1970 * 1000)]
        for taskId in deletedTaskIds {
            updates["tasks.\(taskId)"] = FieldValue.delete()
        }
        for task in tasks {
            updates["tasks.\(task.id).id"] = task.id
            updates["tasks.\(task.id).text"] = task.text
            updates["tasks.\(task.id).completed"] = task.completed
            updates["tasks.\(task.id).date"] = task.date
            updates["tasks.\(task.id).order"] = task.order
        }
        return updates
    }

    @State private var showEditSheet = false
    @State private var editName = ""
    @State private var editBackground: String? = nil
    @State private var showShareSheet = false
    @State private var currentShareCode: String? = nil
    @State private var generatingShareCode = false
    @State private var removingShareCode = false
    @State private var shareCopySuccess = false
    @State private var shareError: String? = nil

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                ScrollViewAccessor(scrollView: $taskScrollViewRef)
                    .frame(width: 0, height: 0)

                HStack {
                    Text(taskList.name)
                        .font(.system(size: 20, weight: .bold))
                        .padding(.bottom, TaskListDetailMetrics.titleBottomPadding)
                    Spacer()
                    Button { editName = taskList.name; editBackground = taskList.background; showEditSheet = true } label: {
                        Image(systemName: "pencil")
                            .font(.system(size: TaskListDetailMetrics.headerIconSize, weight: .semibold))
                            .frame(width: TaskListDetailMetrics.headerIconButtonSize, height: TaskListDetailMetrics.headerIconButtonSize)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(translations.t("taskList.editTitle"))
                    Button {
                        currentShareCode = taskList.shareCode
                        shareCopySuccess = false
                        shareError = nil
                        showShareSheet = true
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: TaskListDetailMetrics.headerIconSize, weight: .semibold))
                            .frame(width: TaskListDetailMetrics.headerIconButtonSize, height: TaskListDetailMetrics.headerIconButtonSize)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(translations.t("taskList.shareTitle"))
                    .padding(.leading, TaskListDetailMetrics.headerActionSpacing)
                }

                HStack(spacing: 8) {
                    TextField(translations.t("pages.tasklist.addTaskPlaceholder"), text: $newTaskText)
                        .focused($isNewTaskFocused)
                        .onSubmit { addTask() }
                        .padding(.horizontal, TaskListDetailMetrics.inputHorizontalPadding)
                        .padding(.vertical, TaskListDetailMetrics.inputVerticalPadding)
                        .background(Color(.systemBackground).opacity(0.92))
                        .clipShape(RoundedRectangle(cornerRadius: TaskListDetailMetrics.inputCornerRadius, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: TaskListDetailMetrics.inputCornerRadius, style: .continuous)
                                .stroke(Color(.separator).opacity(0.45), lineWidth: TaskListDetailMetrics.inputBorderWidth)
                        )

                    if !newTaskText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        Button { addTask() } label: {
                            Image(systemName: "chevron.right")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(.primary)
                                .frame(width: 24, height: 24)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("タスクを追加")
                    }
                }

                HStack {
                    Button { handleSortTasks() } label: {
                        Label(translations.t("pages.tasklist.sort"), systemImage: "line.3.horizontal.decrease")
                            .font(.system(size: 15, weight: .semibold))
                    }
                    .disabled(taskList.tasks.count < 2)
                    Spacer()
                    Button { UINotificationFeedbackGenerator().notificationOccurred(.warning); showDeleteCompletedAlert = true } label: {
                        HStack(spacing: 4) {
                            Text(translations.t("pages.tasklist.deleteCompleted"))
                                .font(.system(size: 15, weight: .semibold))
                            Image(systemName: "trash")
                                .font(.system(size: TaskListDetailMetrics.actionIconSize, weight: .semibold))
                        }
                    }
                    .disabled(taskList.tasks.allSatisfy { !$0.completed })
                }
                .foregroundStyle(.secondary)
                .padding(.top, TaskListDetailMetrics.actionRowTopPadding)

                if taskList.tasks.isEmpty {
                    Text(translations.t("pages.tasklist.noTasks"))
                        .frame(maxWidth: .infinity, minHeight: 200)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(displayTasks) { task in
                        HStack(alignment: .top, spacing: TaskListDetailMetrics.taskRowSpacing) {
                            DragHandleIcon()
                                .foregroundStyle(.secondary)
                                .frame(width: TaskListDetailMetrics.dragTouchWidth, height: TaskListDetailMetrics.dragTouchHeight)
                                .contentShape(Rectangle())
                                .accessibilityLabel(translations.t("app.dragHint"))
                                .padding(.top, 1)
                                .gesture(
                                    DragGesture(minimumDistance: 2, coordinateSpace: .named("taskList"))
                                        .onChanged { value in
                                            if draggingTaskId == nil {
                                                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                                draggingTaskId = task.id
                                                dragOrderedTasks = taskList.tasks
                                                taskDragStartLocationY = value.location.y
                                            }
                                            guard let startY = taskDragStartLocationY else { return }
                                            taskDragOffset = value.location.y - startY
                                            let correction = checkTaskSwap()
                                            if correction != 0 {
                                                UISelectionFeedbackGenerator().selectionChanged()
                                                taskDragStartLocationY = startY - correction
                                            }
                                            updateTaskAutoScroll(fingerY: value.location.y)
                                        }
                                        .onEnded { _ in
                                            stopTaskAutoScroll()
                                            if let ordered = dragOrderedTasks,
                                               ordered.map(\.id) != taskList.tasks.map(\.id) {
                                                persistTaskOrder(ordered.map(\.id))
                                            }
                                            withAnimation(reduceMotion ? .none : .easeInOut(duration: 0.15)) {
                                                taskDragOffset = 0
                                            }
                                            taskDragStartLocationY = nil
                                            draggingTaskId = nil
                                            dragOrderedTasks = nil
                                        }
                                )

                            Button {
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                toggleCompletion(task)
                            } label: {
                                ZStack {
                                    Circle()
                                        .stroke(Color.secondary.opacity(task.completed ? 0.12 : 0.35), lineWidth: task.completed ? 0 : 1.5)
                                        .background(
                                            Circle()
                                                .fill(task.completed ? Color.secondary.opacity(0.28) : Color.clear)
                                        )
                                        .frame(width: TaskListDetailMetrics.completionDotSize, height: TaskListDetailMetrics.completionDotSize)
                                }
                                .frame(width: TaskListDetailMetrics.completionTouchWidth, height: TaskListDetailMetrics.completionTouchHeight)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(task.completed ? "完了済み、タップで未完了にする" : "未完了、タップで完了にする")
                            .padding(.top, 1)

                            VStack(alignment: .leading, spacing: 4) {
                                if !task.date.isEmpty {
                                    Text(formatDateDisplay(task.date))
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundStyle(.secondary)
                                }

                                if editingTaskId == task.id {
                                    TextField("", text: $editingText)
                                        .focused($isTextFieldFocused)
                                        .onSubmit { commitEdit(task) }
                                        .font(.system(size: 16, weight: .semibold))
                                } else {
                                    Button { startEdit(task) } label: {
                                        Text(task.text)
                                            .font(.system(size: 16, weight: .semibold))
                                            .strikethrough(task.completed)
                                            .foregroundStyle(task.completed ? .secondary : .primary)
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel("タスクを編集: \(task.text)")
                                }
                            }

                            Spacer(minLength: 0)

                            Button {
                                openDatePicker(task)
                            } label: {
                                Image(systemName: "calendar")
                                    .font(.system(size: TaskListDetailMetrics.trailingDateIconSize, weight: .medium))
                                    .foregroundStyle(.secondary)
                                    .frame(width: TaskListDetailMetrics.trailingDateButtonWidth, height: TaskListDetailMetrics.trailingDateButtonHeight)
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel(translations.t("pages.tasklist.setDate"))
                            .padding(.top, 1)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, TaskListDetailMetrics.taskRowVerticalPadding)
                        .offset(y: draggingTaskId == task.id ? taskDragOffset : 0)
                        .zIndex(draggingTaskId == task.id ? 1 : 0)
                        .opacity(draggingTaskId == task.id ? 0.8 : 1.0)
                        .scaleEffect(draggingTaskId == task.id ? 1.03 : 1.0)
                        .animation(draggingTaskId == task.id || reduceMotion ? nil : .easeInOut(duration: 0.2),
                                   value: displayTasks.map(\.id))
                        .background(GeometryReader { geo in
                            Color.clear.preference(
                                key: RowFrameKey.self,
                                value: [task.id: geo.size.height]
                            )
                        })
                    }
                }
            }
            .frame(maxWidth: 768, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .top)
            .padding(.horizontal, TaskListDetailMetrics.contentHorizontalPadding)
            .padding(.bottom, TaskListDetailMetrics.contentBottomPadding)
        }
        .coordinateSpace(name: "taskList")
        .onPreferenceChange(RowFrameKey.self) { heights in
            if taskItemHeights != heights {
                taskItemHeights = heights
            }
        }
        .onChange(of: isTextFieldFocused) { _, focused in
            guard !focused,
                  let taskId = editingTaskId,
                  let task = taskList.tasks.first(where: { $0.id == taskId }) else { return }
            commitEdit(task)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .alert(translations.t("pages.tasklist.deleteCompletedConfirmTitle"), isPresented: $showDeleteCompletedAlert) {
            Button(translations.t("auth.button.delete"), role: .destructive) { confirmDeleteCompleted() }
            Button(translations.t("common.cancel"), role: .cancel) {}
        }
        .sheet(isPresented: $showEditSheet) {
            NavigationStack {
                let colorOptions: [String?] = [nil, "#F87171", "#FBBF24", "#34D399", "#38BDF8", "#818CF8", "#A78BFA"]
                VStack(spacing: 24) {
                    TextField(translations.t("app.taskListName"), text: $editName)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text(translations.t("taskList.selectColor"))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal)

                        HStack(spacing: 12) {
                            ForEach(colorOptions.indices, id: \.self) { i in
                                let c = colorOptions[i]
                                let isSelected = editBackground == c
                                Button { editBackground = c } label: {
                                    Circle()
                                        .fill(c.flatMap { Color(hex: $0) } ?? Color(.systemBackground))
                                        .frame(width: 44, height: 44)
                                        .overlay(
                                            Circle().stroke(Color(.separator), lineWidth: c == nil ? 1 : 0)
                                        )
                                        .overlay(
                                            Circle().stroke(Color.accentColor, lineWidth: isSelected ? 2.5 : 0).padding(-3)
                                        )
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(colorLabel(c))
                            }
                        }
                        .padding(.horizontal)
                    }

                    Spacer()
                }
                .padding(.top, 24)
                .navigationTitle(translations.t("taskList.editTitle"))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(translations.t("common.cancel")) { showEditSheet = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button(translations.t("taskList.save")) {
                            let trimmed = editName.trimmingCharacters(in: .whitespaces)
                            if !trimmed.isEmpty {
                                var updates: [String: Any] = ["updatedAt": Date().timeIntervalSince1970 * 1000]
                                if trimmed != taskList.name {
                                    updates["name"] = trimmed
                                }
                                if editBackground != taskList.background {
                                    updates["background"] = editBackground as Any
                                }
                                if updates.count > 1 {
                                    db.collection("taskLists").document(taskList.id).updateData(updates)
                                }
                                showEditSheet = false
                            }
                        }
                        .disabled(editName.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
            .presentationDetents([.medium])
        }
        .sheet(isPresented: Binding(
            get: { datePickerTaskId != nil },
            set: { if !$0 { datePickerTaskId = nil } }
        )) {
            if let taskId = datePickerTaskId,
               let task = taskList.tasks.first(where: { $0.id == taskId }) {
                NavigationStack {
                    VStack {
                        DatePicker("", selection: $datePickerDate, displayedComponents: .date)
                            .datePickerStyle(.graphical)
                            .padding()
                        Button(translations.t("pages.tasklist.clearDate")) {
                            commitDate(task, dateStr: "")
                        }
                        .foregroundStyle(.red)
                        .padding(.bottom)
                    }
                    .navigationTitle(translations.t("pages.tasklist.setDate"))
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button(translations.t("common.cancel")) { datePickerTaskId = nil }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button(translations.t("common.done")) {
                                commitDate(task, dateStr: Self.isoFormatter.string(from: datePickerDate))
                            }
                        }
                    }
                }
                .presentationDetents([.medium, .large])
            }
        }
        .sheet(isPresented: $showShareSheet) {
            NavigationStack {
                VStack(spacing: 16) {
                    if let error = shareError {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.subheadline)
                    }

                    if let code = currentShareCode {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(translations.t("taskList.shareCode"))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            HStack {
                                Text(code)
                                    .font(.title2.monospaced())
                                Spacer()
                                Button(shareCopySuccess ? translations.t("common.copied") : translations.t("common.copy")) {
                                    UIPasteboard.general.string = code
                                    shareCopySuccess = true
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                        shareCopySuccess = false
                                    }
                                }
                            }
                        }
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                        Button(role: .destructive) {
                            Task {
                                removingShareCode = true
                                shareError = nil
                                do {
                                    try await removeShareCode(taskListId: taskList.id)
                                    logShareCodeRemove()
                                    currentShareCode = nil
                                } catch {
                                    shareError = translations.t("common.error")
                                }
                                removingShareCode = false
                            }
                        } label: {
                            Text(removingShareCode ? translations.t("common.deleting") : translations.t("taskList.removeShare"))
                                .frame(maxWidth: .infinity)
                        }
                        .disabled(removingShareCode)
                    } else {
                        Text(translations.t("taskList.shareDescription"))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        Button {
                            Task {
                                generatingShareCode = true
                                shareError = nil
                                do {
                                    let code = try await generateShareCode(taskListId: taskList.id)
                                    logShareCodeGenerate()
                                    currentShareCode = code
                                } catch {
                                    shareError = translations.t("common.error")
                                }
                                generatingShareCode = false
                            }
                        } label: {
                            Text(generatingShareCode ? translations.t("common.loading") : translations.t("taskList.generateShare"))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(generatingShareCode)
                    }

                    Spacer()
                }
                .padding()
                .navigationTitle(translations.t("taskList.shareTitle"))
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(translations.t("common.close")) { showShareSheet = false }
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }

    private func toggleCompletion(_ task: TaskSummary) {
        logTaskUpdate(fields: "completed")
        if autoSort {
            let updatedTasks = taskList.tasks.map { current in
                TaskSummary(
                    id: current.id,
                    text: current.text,
                    completed: current.id == task.id ? !current.completed : current.completed,
                    date: current.date,
                    order: current.order
                )
            }
            db.collection("taskLists").document(taskList.id).updateData(taskUpdates(autoSortedTasks(updatedTasks)))
            return
        }

        db.collection("taskLists").document(taskList.id).updateData([
            "tasks.\(task.id).completed": !task.completed,
            "updatedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ])
    }

    private func startEdit(_ task: TaskSummary) {
        editingTaskId = task.id
        editingText = task.text
        isTextFieldFocused = true
    }

    private func commitEdit(_ task: TaskSummary) {
        guard editingTaskId == task.id else { return }
        let trimmed = editingText.trimmingCharacters(in: .whitespaces)
        editingTaskId = nil
        guard !trimmed.isEmpty, trimmed != task.text else { return }
        logTaskUpdate(fields: "text")
        if autoSort {
            let updatedTasks = taskList.tasks.map { current in
                TaskSummary(
                    id: current.id,
                    text: current.id == task.id ? trimmed : current.text,
                    completed: current.completed,
                    date: current.date,
                    order: current.order
                )
            }
            db.collection("taskLists").document(taskList.id).updateData(taskUpdates(autoSortedTasks(updatedTasks)))
            return
        }

        db.collection("taskLists").document(taskList.id).updateData([
            "tasks.\(task.id).text": trimmed,
            "updatedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ])
    }

    private func openDatePicker(_ task: TaskSummary) {
        datePickerDate = Self.isoFormatter.date(from: task.date) ?? Date()
        datePickerTaskId = task.id
    }

    private func commitDate(_ task: TaskSummary, dateStr: String) {
        logTaskUpdate(fields: "date")
        if autoSort {
            let updatedTasks = taskList.tasks.map { current in
                TaskSummary(
                    id: current.id,
                    text: current.text,
                    completed: current.completed,
                    date: current.id == task.id ? dateStr : current.date,
                    order: current.order
                )
            }
            db.collection("taskLists").document(taskList.id).updateData(taskUpdates(autoSortedTasks(updatedTasks)))
            datePickerTaskId = nil
            return
        }

        db.collection("taskLists").document(taskList.id).updateData([
            "tasks.\(task.id).date": dateStr,
            "updatedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ])
        datePickerTaskId = nil
    }

    private func addTask() {
        let trimmed = newTaskText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        logTaskAdd(hasDate: false)
        newTaskText = ""
        isNewTaskFocused = true
        let taskId = UUID().uuidString
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let tasks = taskList.tasks
        let order: Double = taskInsertPosition == "top"
            ? (tasks.first?.order ?? 1.0) - 1.0
            : (tasks.last?.order ?? 0.0) + 1.0
        if autoSort {
            let insertedTask = TaskSummary(
                id: taskId,
                text: trimmed,
                completed: false,
                date: "",
                order: order
            )
            var reorderedTasks = taskList.tasks
            let insertIndex = taskInsertPosition == "top" ? 0 : reorderedTasks.count
            reorderedTasks.insert(insertedTask, at: insertIndex)
            db.collection("taskLists").document(taskList.id).updateData(taskUpdates(autoSortedTasks(reorderedTasks)))
            return
        }

        db.collection("taskLists").document(taskList.id).updateData([
            "tasks.\(taskId).id": taskId,
            "tasks.\(taskId).text": trimmed,
            "tasks.\(taskId).completed": false,
            "tasks.\(taskId).date": "",
            "tasks.\(taskId).order": order,
            "updatedAt": now
        ])
    }

    private func handleSortTasks() {
        logTaskSort()
        let sorted = taskList.tasks.sorted { a, b in
            if a.completed != b.completed { return !a.completed }
            let aEmpty = a.date.isEmpty, bEmpty = b.date.isEmpty
            if aEmpty != bEmpty { return bEmpty }
            if !aEmpty && !bEmpty && a.date != b.date { return a.date < b.date }
            return a.order < b.order
        }
        var updates: [String: Any] = ["updatedAt": Int64(Date().timeIntervalSince1970 * 1000)]
        for (i, task) in sorted.enumerated() {
            updates["tasks.\(task.id).order"] = Double(i + 1)
        }
        db.collection("taskLists").document(taskList.id).updateData(updates)
    }

    private func confirmDeleteCompleted() {
        let completed = taskList.tasks.filter { $0.completed }
        logTaskDeleteCompleted(count: completed.count)
        let remaining = taskList.tasks.filter { !$0.completed }
        let normalizedRemainingTasks = autoSort ? autoSortedTasks(remaining) : renumberedTasks(remaining)
        db.collection("taskLists").document(taskList.id).updateData(
            taskUpdates(normalizedRemainingTasks, deletedTaskIds: completed.map(\.id))
        )
    }

    private func persistTaskOrder(_ ids: [String]) {
        logTaskReorder()
        var updates: [String: Any] = ["updatedAt": Int64(Date().timeIntervalSince1970 * 1000)]
        for (i, id) in ids.enumerated() {
            updates["tasks.\(id).order"] = Double(i + 1)
        }
        db.collection("taskLists").document(taskList.id).updateData(updates)
    }

    private func generateShareCode(taskListId: String) async throws -> String {
        let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        for _ in 0..<10 {
            let code = String((0..<8).map { _ in chars.randomElement()! })
            let result: String? = try await db.runTransaction { transaction, errorPointer in
                let shareCodeRef = self.db.collection("shareCodes").document(code)
                do {
                    let shareCodeSnap = try transaction.getDocument(shareCodeRef)
                    if shareCodeSnap.exists { return nil }

                    let taskListRef = self.db.collection("taskLists").document(taskListId)
                    let taskListSnap = try transaction.getDocument(taskListRef)
                    guard taskListSnap.exists else {
                        let err = NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Task list not found"])
                        errorPointer?.pointee = err
                        return nil
                    }

                    if let currentCode = taskListSnap.data()?["shareCode"] as? String {
                        transaction.deleteDocument(self.db.collection("shareCodes").document(currentCode))
                    }

                    let now = Int64(Date().timeIntervalSince1970 * 1000)
                    transaction.setData(["taskListId": taskListId, "createdAt": now], forDocument: shareCodeRef)
                    transaction.updateData(["shareCode": code, "updatedAt": now], forDocument: taskListRef)
                    return code
                } catch let err as NSError {
                    errorPointer?.pointee = err
                    return nil
                }
            } as? String
            if let result { return result }
        }
        throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "共有コードの生成に失敗しました"])
    }

    private func removeShareCode(taskListId: String) async throws {
        let _: Any? = try await db.runTransaction { transaction, errorPointer in
            do {
                let taskListRef = self.db.collection("taskLists").document(taskListId)
                let snap = try transaction.getDocument(taskListRef)
                guard snap.exists else {
                    let err = NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Task list not found"])
                    errorPointer?.pointee = err
                    return nil
                }
                if let currentCode = snap.data()?["shareCode"] as? String {
                    transaction.deleteDocument(self.db.collection("shareCodes").document(currentCode))
                }
                let now = Int64(Date().timeIntervalSince1970 * 1000)
                transaction.updateData(["shareCode": NSNull(), "updatedAt": now], forDocument: taskListRef)
                return nil
            } catch let err as NSError {
                errorPointer?.pointee = err
                return nil
            }
        }
    }
}

private func fetchTaskListIdByShareCode(_ shareCode: String) async throws -> String? {
    let db = Firestore.firestore()
    let normalized = shareCode.trimmingCharacters(in: .whitespaces).uppercased()
    guard !normalized.isEmpty else { return nil }
    let snap = try await db.collection("shareCodes").document(normalized).getDocument()
    guard snap.exists, let data = snap.data() else { return nil }
    return data["taskListId"] as? String
}

private func addSharedTaskListToOrder(taskListId: String) async throws {
    guard let uid = Auth.auth().currentUser?.uid else { return }
    let db = Firestore.firestore()
    let _: Any? = try await db.runTransaction { transaction, errorPointer in
        do {
            let taskListOrderRef = db.collection("taskListOrder").document(uid)
            let orderSnap = try transaction.getDocument(taskListOrderRef)
            guard orderSnap.exists, let orderData = orderSnap.data() else {
                let err = NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "TaskListOrder not found"])
                errorPointer?.pointee = err
                return nil
            }
            if orderData[taskListId] != nil {
                let err = NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "このリストは既に追加されています"])
                errorPointer?.pointee = err
                return nil
            }
            let orders = orderData.compactMap { entry -> Double? in
                guard entry.key != "createdAt", entry.key != "updatedAt",
                      let val = entry.value as? [String: Any],
                      let order = (val["order"] as? NSNumber)?.doubleValue else { return nil }
                return order
            }
            let newOrder = orders.max().map { $0 + 1.0 } ?? 1.0

            let taskListRef = db.collection("taskLists").document(taskListId)
            let taskListSnap = try transaction.getDocument(taskListRef)
            guard taskListSnap.exists, let taskListData = taskListSnap.data() else {
                let err = NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Task list not found"])
                errorPointer?.pointee = err
                return nil
            }
            let currentMemberCount = (taskListData["memberCount"] as? NSNumber)?.intValue ?? 1
            let now = Int64(Date().timeIntervalSince1970 * 1000)
            transaction.setData([taskListId: ["order": newOrder], "updatedAt": now] as [String: Any],
                               forDocument: taskListOrderRef, merge: true)
            transaction.updateData(["memberCount": currentMemberCount + 1, "updatedAt": now],
                                  forDocument: taskListRef)
            return nil
        } catch let err as NSError {
            errorPointer?.pointee = err
            return nil
        }
    }
}

private final class SettingsViewModel: ObservableObject {
    struct UserSettings {
        var theme: String = "system"
        var language: String = "ja"
        var taskInsertPosition: String = "bottom"
        var autoSort: Bool = false
    }

    @Published var settings: UserSettings? = nil
    @Published var userEmail: String = ""

    private let db = Firestore.firestore()
    private var settingsListener: ListenerRegistration?
    private var currentUid: String?

    func bind(uid: String?) {
        guard currentUid != uid else { return }
        reset()
        currentUid = uid
        guard let uid else { return }
        userEmail = Auth.auth().currentUser?.email ?? ""
        settingsListener = db.collection("settings").document(uid)
            .addSnapshotListener { [weak self] snapshot, _ in
                guard let self, let data = snapshot?.data() else { return }
                self.settings = UserSettings(
                    theme: data["theme"] as? String ?? "system",
                    language: data["language"] as? String ?? "ja",
                    taskInsertPosition: data["taskInsertPosition"] as? String ?? "bottom",
                    autoSort: data["autoSort"] as? Bool ?? false
                )
            }
    }

    func reset() {
        settingsListener?.remove()
        settingsListener = nil
        currentUid = nil
        settings = nil
    }

    func updateSettings(_ partial: [String: Any]) {
        guard let uid = currentUid else { return }
        var data = partial
        data["updatedAt"] = Date().timeIntervalSince1970 * 1000
        db.collection("settings").document(uid).setData(data, merge: true)
    }

    func signOut() throws {
        try Auth.auth().signOut()
    }

    func deleteAccount(onSuccess: @escaping () -> Void, onError: @escaping (String) -> Void) {
        guard let user = Auth.auth().currentUser else { return }
        let uid = user.uid
        db.collection("taskListOrder").document(uid).getDocument { [weak self] snapshot, error in
            guard let self else { return }
            if let error {
                onError(error.localizedDescription)
                return
            }
            let taskListIds = (snapshot?.data() ?? [:]).keys
                .filter { $0 != "createdAt" && $0 != "updatedAt" }
            let group = DispatchGroup()
            for taskListId in taskListIds {
                group.enter()
                let ref = self.db.collection("taskLists").document(taskListId)
                ref.getDocument { snap, _ in
                    let memberCount = (snap?.data()?["memberCount"] as? NSNumber)?.intValue ?? 1
                    if memberCount <= 1 {
                        ref.delete { _ in group.leave() }
                    } else {
                        ref.updateData(["memberCount": memberCount - 1]) { _ in group.leave() }
                    }
                }
            }
            group.notify(queue: .main) { [weak self] in
                guard let self else { return }
                let batch = self.db.batch()
                batch.deleteDocument(self.db.collection("settings").document(uid))
                batch.deleteDocument(self.db.collection("taskListOrder").document(uid))
                batch.commit { error in
                    if let error {
                        onError(error.localizedDescription)
                        return
                    }
                    user.delete { error in
                        if let error {
                            onError(error.localizedDescription)
                        } else {
                            onSuccess()
                        }
                    }
                }
            }
        }
    }

    func sendEmailChangeVerification(newEmail: String, completion: @escaping (Error?) -> Void) {
        Auth.auth().currentUser?.sendEmailVerification(beforeUpdatingEmail: newEmail, completion: completion)
    }
}

private let supportedLanguages: [(code: String, name: String)] = [
    ("ja", "日本語"), ("en", "English"), ("es", "Español"),
    ("de", "Deutsch"), ("fr", "Français"), ("ko", "한국어"),
    ("zh-CN", "中文(简体)"), ("hi", "हिन्दी"), ("ar", "العربية"),
    ("pt-BR", "Português (Brasil)"), ("id", "Bahasa Indonesia")
]

private struct SettingsView: View {
    @EnvironmentObject var translations: Translations
    @StateObject private var viewModel = SettingsViewModel()
    @State private var authStateHandle: AuthStateDidChangeListenerHandle?
    @State private var showSignOutAlert = false
    @State private var showDeleteAlert = false
    @State private var showThemePicker = false
    @State private var showLanguagePicker = false
    @State private var showPositionPicker = false
    @State private var showEmailChangeForm = false
    @State private var newEmail = ""
    @State private var emailChangeError: String? = nil
    @State private var emailChangeSuccess = false
    @State private var isChangingEmail = false
    @State private var errorMessage: String? = nil
    @State private var isDeletingAccount = false
    @State private var isSigningOut = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let settings = viewModel.settings {
                    settingsCard(title: translations.t("settings.preferences.title")) {
                        settingsRow(label: translations.t("settings.language.title"), value: displayName(for: settings.language)) {
                            showLanguagePicker = true
                        }
                        Divider()
                        settingsRow(label: translations.t("settings.theme.title"), value: settings.theme) {
                            showThemePicker = true
                        }
                        Divider()
                        settingsRow(label: translations.t("settings.taskInsertPosition.title"), value: settings.taskInsertPosition) {
                            showPositionPicker = true
                        }
                        Divider()
                        Toggle(translations.t("settings.autoSort.enable"), isOn: Binding(
                            get: { settings.autoSort },
                            set: { logSettingsAutoSortChange(enabled: $0); viewModel.updateSettings(["autoSort": $0]) }
                        ))
                        .padding(.vertical, 4)
                    }
                    settingsCard(title: translations.t("settings.userInfo.title")) {
                        Text(viewModel.userEmail)
                            .foregroundStyle(.primary)
                        Divider()
                        Button(translations.t("settings.emailChange.title")) { showEmailChangeForm = true }
                    }
                    settingsCard(title: translations.t("settings.actions.title")) {
                        Button(isSigningOut ? "..." : translations.t("auth.button.signOut")) {
                            showSignOutAlert = true
                        }
                        .disabled(isSigningOut)
                        Divider()
                        Button(isDeletingAccount ? "..." : translations.t("auth.deleteAccountConfirm.title")) {
                            showDeleteAlert = true
                        }
                        .foregroundStyle(.red)
                        .disabled(isDeletingAccount)
                    }
                    if let errorMessage {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                } else {
                    ProgressView()
                }
            }
            .frame(maxWidth: 768)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .padding(.vertical, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .navigationTitle(AppRoute.settings.title)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            authStateHandle = Auth.auth().addStateDidChangeListener { _, user in
                viewModel.bind(uid: user?.uid)
            }
        }
        .onDisappear {
            if let handle = authStateHandle {
                Auth.auth().removeStateDidChangeListener(handle)
            }
            viewModel.reset()
        }
        .alert(translations.t("auth.button.signOut"), isPresented: $showSignOutAlert) {
            Button(translations.t("common.cancel"), role: .cancel) {}
            Button(translations.t("auth.button.signOut"), role: .destructive) {
                isSigningOut = true
                try? viewModel.signOut()
                logSignOut()
                isSigningOut = false
            }
        } message: {
            Text(translations.t("auth.signOutConfirm.message"))
        }
        .alert(translations.t("auth.deleteAccountConfirm.title"), isPresented: $showDeleteAlert) {
            Button(translations.t("common.cancel"), role: .cancel) {}
            Button(translations.t("auth.button.delete"), role: .destructive) {
                isDeletingAccount = true
                errorMessage = nil
                viewModel.deleteAccount(
                    onSuccess: { logDeleteAccount(); isDeletingAccount = false },
                    onError: { err in
                        isDeletingAccount = false
                        errorMessage = err
                    }
                )
            }
        } message: {
            Text(translations.t("auth.deleteAccountConfirm.message"))
        }
        .confirmationDialog(translations.t("settings.theme.title"), isPresented: $showThemePicker, titleVisibility: .visible) {
            Button(translations.t("settings.theme.system")) { logSettingsThemeChange(theme: "system"); viewModel.updateSettings(["theme": "system"]) }
            Button(translations.t("settings.theme.light")) { logSettingsThemeChange(theme: "light"); viewModel.updateSettings(["theme": "light"]) }
            Button(translations.t("settings.theme.dark")) { logSettingsThemeChange(theme: "dark"); viewModel.updateSettings(["theme": "dark"]) }
            Button(translations.t("common.cancel"), role: .cancel) {}
        }
        .confirmationDialog(translations.t("settings.taskInsertPosition.title"), isPresented: $showPositionPicker, titleVisibility: .visible) {
            Button(translations.t("settings.taskInsertPosition.top")) { logSettingsTaskInsertPositionChange(position: "top"); viewModel.updateSettings(["taskInsertPosition": "top"]) }
            Button(translations.t("settings.taskInsertPosition.bottom")) { logSettingsTaskInsertPositionChange(position: "bottom"); viewModel.updateSettings(["taskInsertPosition": "bottom"]) }
            Button(translations.t("common.cancel"), role: .cancel) {}
        }
        .sheet(isPresented: $showLanguagePicker) {
            languagePickerSheet
        }
        .sheet(isPresented: $showEmailChangeForm) {
            emailChangeSheet
        }
    }

    private func displayName(for code: String) -> String {
        supportedLanguages.first { $0.code == code }?.name ?? code
    }

    private func settingsCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 4)
                .padding(.bottom, 6)
            VStack(spacing: 0) {
                content()
            }
            .padding(16)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .frame(maxWidth: 480)
        .frame(maxWidth: .infinity)
    }

    private func settingsRow(label: String, value: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(label).foregroundStyle(.primary)
                Spacer()
                Text(value).foregroundStyle(.secondary)
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var languagePickerSheet: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(supportedLanguages.indices, id: \.self) { i in
                        Button {
                            logSettingsLanguageChange(language: supportedLanguages[i].code)
                            viewModel.updateSettings(["language": supportedLanguages[i].code])
                            showLanguagePicker = false
                        } label: {
                            HStack {
                                Text(supportedLanguages[i].name).foregroundStyle(.primary)
                                Spacer()
                                if viewModel.settings?.language == supportedLanguages[i].code {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(Color.accentColor)
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 14)
                        }
                        Divider()
                            .padding(.leading, 20)
                    }
                }
            }
            .navigationTitle(translations.t("settings.language.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(translations.t("common.cancel")) { showLanguagePicker = false }
                }
            }
        }
    }

    @ViewBuilder
    private var emailChangeSheet: some View {
        NavigationStack {
            VStack(spacing: 16) {
                TextField(translations.t("settings.emailChange.newEmailLabel"), text: $newEmail)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .textFieldStyle(.roundedBorder)
                if let error = emailChangeError {
                    Text(error).foregroundStyle(.red).font(.caption)
                }
                if emailChangeSuccess {
                    Text(translations.t("settings.emailChange.successMessage")).foregroundStyle(.green).font(.caption)
                }
                Button(isChangingEmail ? "..." : translations.t("settings.emailChange.submitButton")) {
                    isChangingEmail = true
                    emailChangeError = nil
                    viewModel.sendEmailChangeVerification(newEmail: newEmail) { error in
                        isChangingEmail = false
                        if let error {
                            emailChangeError = error.localizedDescription
                        } else {
                            logEmailChangeRequested()
                            emailChangeSuccess = true
                        }
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isChangingEmail || newEmail.isEmpty)
                Spacer()
            }
            .padding()
            .navigationTitle(translations.t("settings.emailChange.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(translations.t("common.cancel")) {
                        showEmailChangeForm = false
                        newEmail = ""
                        emailChangeError = nil
                        emailChangeSuccess = false
                    }
                }
            }
        }
    }
}

private extension Color {
    init?(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        guard Scanner(string: hex).scanHexInt64(&int), hex.count == 6 else { return nil }
        self.init(
            red: Double((int >> 16) & 0xFF) / 255,
            green: Double((int >> 8) & 0xFF) / 255,
            blue: Double(int & 0xFF) / 255
        )
    }
}

private func resolveTaskListBackgroundColor(_ background: String?) -> Color {
    background.flatMap { Color(hex: $0) } ?? Color(.systemBackground)
}

private struct CalendarDayCell: View {
    let day: Date
    let isToday: Bool
    let isSelected: Bool
    let dots: [Color]
    let onTap: () -> Void

    private static let cal = Calendar.current

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 2) {
                Text("\(Self.cal.component(.day, from: day))")
                    .font(.subheadline)
                    .foregroundStyle(isSelected ? Color.white : Color.primary)
                    .frame(width: 44, height: 44)
                    .background(
                        Group {
                            if isSelected {
                                Circle().fill(Color.accentColor)
                            } else if isToday {
                                Circle().stroke(Color.primary, lineWidth: 1)
                            } else {
                                Circle().fill(Color.clear)
                            }
                        }
                    )

                if dots.isEmpty {
                    Color.clear.frame(height: 6)
                } else {
                    HStack(spacing: 2) {
                        ForEach(Array(dots.prefix(3).enumerated()), id: \.offset) { _, color in
                            Circle().fill(color).frame(width: 4, height: 4)
                        }
                    }
                    .frame(height: 6)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(Self.cal.component(.day, from: day))日\(isToday ? "、今日" : "")\(dots.isEmpty ? "" : "、タスクあり")")
    }
}

private struct CalendarTaskRow: View {
    let task: CalendarTask
    let isHighlighted: Bool

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEE, MMM d"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 8) {
                Text(Self.displayFormatter.string(from: task.dateValue))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(width: 80, alignment: .leading)

                HStack(spacing: 4) {
                    Circle()
                        .fill(task.taskListBackground.flatMap { Color(hex: $0) } ?? Color.accentColor)
                        .frame(width: 8, height: 8)
                    Text(task.taskListName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                .frame(width: 90, alignment: .leading)

                Text(task.text)
                    .font(.body)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(isHighlighted ? Color(.secondarySystemBackground) : Color.clear)

            Divider().padding(.leading, 16)
        }
    }
}

private struct CalendarSheetView: View {
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let calendarTasks: [CalendarTask]

    @State private var displayedMonth: Date = {
        let cal = Calendar.current
        return cal.date(from: cal.dateComponents([.year, .month], from: Date()))!
    }()
    @State private var selectedDate: Date?

    private static let cal = Calendar.current

    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    private static let monthTitleFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMMM yyyy"
        return f
    }()

    private var currentMonthKey: String {
        let c = Self.cal.dateComponents([.year, .month], from: displayedMonth)
        guard let year = c.year, let month = c.month else { return "" }
        return String(format: "%04d-%02d", year, month)
    }

    private var tasksInMonth: [CalendarTask] {
        calendarTasks.filter { $0.date.hasPrefix(currentMonthKey) }
    }

    private var dotColorsByDate: [String: [Color]] {
        var result: [String: [Color]] = [:]
        for task in tasksInMonth {
            var colors = result[task.date] ?? []
            let color = task.taskListBackground.flatMap { Color(hex: $0) } ?? Color.accentColor
            if !colors.contains(color) && colors.count < 3 {
                colors.append(color)
            }
            result[task.date] = colors
        }
        return result
    }

    private func makeDays() -> [Date?] {
        let cal = Self.cal
        guard let firstDay = cal.date(from: cal.dateComponents([.year, .month], from: displayedMonth)),
              let range = cal.range(of: .day, in: .month, for: firstDay) else { return [] }
        let firstWeekday = cal.component(.weekday, from: firstDay) - 1
        var days: [Date?] = Array(repeating: nil, count: firstWeekday)
        for i in 0..<range.count {
            days.append(cal.date(byAdding: .day, value: i, to: firstDay))
        }
        return days
    }

    private func dateKey(_ date: Date) -> String {
        let c = Self.cal.dateComponents([.year, .month, .day], from: date)
        guard let year = c.year, let month = c.month, let day = c.day else { return "" }
        return String(format: "%04d-%02d-%02d", year, month, day)
    }

    private func shiftMonth(by offset: Int) {
        if let next = Self.cal.date(byAdding: .month, value: offset, to: displayedMonth) {
            displayedMonth = next
            selectedDate = nil
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { shiftMonth(by: -1) } label: {
                    Image(systemName: "chevron.left")
                        .font(.body.weight(.semibold))
                        .padding(8)
                }
                .accessibilityLabel("前の月")
                Spacer()
                Text(Self.monthTitleFormatter.string(from: displayedMonth))
                    .font(.headline)
                Spacer()
                Button { shiftMonth(by: 1) } label: {
                    Image(systemName: "chevron.right")
                        .font(.body.weight(.semibold))
                        .padding(8)
                }
                .accessibilityLabel("次の月")
            }
            .padding(.horizontal, 8)
            .padding(.top, 8)

            let columns = Array(repeating: GridItem(.flexible()), count: 7)
            let days = makeDays()

            VStack(spacing: 4) {
                LazyVGrid(columns: columns, spacing: 0) {
                    ForEach(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], id: \.self) { d in
                        Text(d)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 4)
                    }
                }

                LazyVGrid(columns: columns, spacing: 2) {
                    ForEach(Array(days.enumerated()), id: \.offset) { _, day in
                        if let day {
                            let key = dateKey(day)
                            CalendarDayCell(
                                day: day,
                                isToday: Self.cal.isDateInToday(day),
                                isSelected: selectedDate.map { Self.cal.isDate($0, inSameDayAs: day) } ?? false,
                                dots: dotColorsByDate[key] ?? [],
                                onTap: { selectedDate = selectedDate.map { Self.cal.isDate($0, inSameDayAs: day) } ?? false ? nil : day }
                            )
                        } else {
                            Color.clear.aspectRatio(1, contentMode: .fit)
                        }
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)

            Divider()

            if tasksInMonth.isEmpty {
                Spacer()
                Text(translations.t("app.calendarNoDatedTasks"))
                    .foregroundStyle(.secondary)
                    .font(.subheadline)
                Spacer()
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(tasksInMonth) { task in
                                CalendarTaskRow(
                                    task: task,
                                    isHighlighted: selectedDate.map { dateKey($0) == task.date } ?? false
                                )
                                .id(task.id)
                            }
                        }
                    }
                    .onChange(of: selectedDate) { _, date in
                        guard let date else { return }
                        let key = dateKey(date)
                        if let first = tasksInMonth.first(where: { $0.date == key }) {
                            withAnimation(reduceMotion ? .none : .default) {
                                proxy.scrollTo(first.id, anchor: .top)
                            }
                        }
                    }
                }
            }
        }
    }
}

private func colorLabel(_ hex: String?) -> String {
    switch hex {
    case nil: return "色なし"
    case "#F87171": return "赤"
    case "#FBBF24": return "黄"
    case "#34D399": return "緑"
    case "#38BDF8": return "青"
    case "#818CF8": return "インディゴ"
    case "#A78BFA": return "紫"
    default: return "カスタム色"
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
