import SwiftUI
import Foundation
import Security
import FirebaseAppCheck
import FirebaseAuth
import FirebaseAnalytics
import FirebaseCore
import FirebaseCrashlytics
import FirebaseFirestore

private let authSignInTimeoutSeconds: TimeInterval = 10
private let shareCodeCharacters = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

private func generateRandomShareCode() throws -> String {
    var bytes = [UInt8](repeating: 0, count: 8)
    let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    guard status == errSecSuccess else {
        throw NSError(domain: "com.lightlist", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "共有コードの生成に失敗しました"])
    }
    return String(bytes.map { shareCodeCharacters[Int($0) % shareCodeCharacters.count] })
}

enum PendingDeepLink: Equatable {
    case passwordReset(code: String)
    case shareCode(String)
}

private func parseDeepLink(_ url: URL) -> PendingDeepLink? {
    let scheme = url.scheme?.lowercased()
    let host = url.host?.lowercased()
    let pathComponents = url.pathComponents.filter { $0 != "/" }

    if scheme == "lightlist" {
        if host == "password-reset" {
            guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                  let code = components.queryItems?.first(where: { $0.name == "oobCode" })?.value,
                  !code.isEmpty else {
                return nil
            }
            return .passwordReset(code: code)
        }

        if host == "sharecodes",
           let shareCode = pathComponents.first,
           !shareCode.isEmpty {
            return .shareCode(shareCode.uppercased())
        }
    }

    if (scheme == "https" || scheme == "http"),
       host == "lightlist.com",
       pathComponents.count >= 2,
       pathComponents[0].lowercased() == "sharecodes" {
        return .shareCode(pathComponents[1].uppercased())
    }

    return nil
}

private enum AppTypography {
    static func body() -> Font {
        .custom("GenInterfaceJP-Regular", size: 17, relativeTo: .body)
    }

    static func bodyMedium() -> Font {
        .custom("GenInterfaceJP-Medium", size: 17, relativeTo: .body)
    }

    static func subheadline() -> Font {
        .custom("GenInterfaceJP-Regular", size: 15, relativeTo: .subheadline)
    }

    static func subheadlineMedium() -> Font {
        .custom("GenInterfaceJP-Medium", size: 15, relativeTo: .subheadline)
    }

    static func caption() -> Font {
        .custom("GenInterfaceJP-Regular", size: 12, relativeTo: .caption)
    }

    static func captionSemibold() -> Font {
        .custom("GenInterfaceJP-SemiBold", size: 12, relativeTo: .caption)
    }

    static func title() -> Font {
        .custom("GenInterfaceJPDisplay-Bold", size: 28, relativeTo: .title)
    }

    static func headline() -> Font {
        .custom("GenInterfaceJPDisplay-Bold", size: 17, relativeTo: .headline)
    }
}

@MainActor
final class Translations: ObservableObject {
    @Published private(set) var language: String = "ja"
    private var dict: [String: Any] = [:]

    private static let supported = ["ja","en","es","de","fr","ko","zh-CN","hi","ar","pt-BR","id"]
    private static var allLocales: [String: Any]?

    private static func loadAllLocales() -> [String: Any] {
        if let allLocales {
            return allLocales
        }
        guard let url = Bundle.main.url(forResource: "locales", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            allLocales = [:]
            return [:]
        }
        allLocales = json
        return json
    }

    func load(language: String) {
        let lang = Self.supported.contains(language) ? language : "ja"
        guard let locale = Self.loadAllLocales()[lang] as? [String: Any] else {
            dict = [:]
            return
        }
        dict = locale
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

    func getRawDict() -> [String: Any] {
        return dict
    }

    fileprivate func getRelativePatterns() -> [TaskDatePattern] {
        return Self.getRelativePatterns(from: dict)
    }

    fileprivate static func getRelativePatterns(for language: String) -> [TaskDatePattern] {
        let lang = supported.contains(language) ? language : "ja"
        guard let locale = loadAllLocales()[lang] as? [String: Any] else {
            return []
        }
        return getRelativePatterns(from: locale)
    }

    private static func getRelativePatterns(from dict: [String: Any]) -> [TaskDatePattern] {
        let datePatterns = dict["datePatterns"] as? [String: Any]
        let relative = datePatterns?["relative"] as? [[String: Any]] ?? []
        let weekdays = datePatterns?["weekdays"] as? [String: Int] ?? [:]
        
        return relative.compactMap { p in
            guard let pattern = p["pattern"] as? String else { return nil }
            let optionsStr = p["options"] as? String ?? ""
            var options: NSRegularExpression.Options = []
            if optionsStr.contains("i") { options.insert(.caseInsensitive) }
            
            return TaskDatePattern(pattern: pattern, options: options) { groups in
                if let offset = p["offset"] as? Int {
                    return makeTaskOffsetDate(offset)
                }
                if let groupIndex = p["offsetGroup"] as? Int, groups.indices.contains(groupIndex), let offset = Int(groups[groupIndex]) {
                    return makeTaskOffsetDate(offset)
                }
                if let groupIndex = p["weekdayGroup"] as? Int, groups.indices.contains(groupIndex) {
                    let key = groups[groupIndex]
                    return resolveWeekdayDate(key: key, weekdays: weekdays)
                }
                return nil
            }
        }
    }

    private static func resolveWeekdayDate(key: String, weekdays: [String: Int]) -> Date? {
        let target = weekdays[key] ?? weekdays.first { $0.key.lowercased() == key.lowercased() }?.value
        guard let target else { return nil }
        let current = Calendar.current.component(.weekday, from: Date())
        return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target + 1, currentDay: current))
    }
}

private func log(_ eventName: String, _ params: [String: Any]? = nil) {
    #if DEBUG
    print("[analytics] \(eventName) \(params ?? [:])")
    #endif
    Analytics.logEvent(eventName, parameters: params)
}

private func nowMillis() -> Int64 {
    Int64(Date().timeIntervalSince1970 * 1000)
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
    case calendar

    var title: String {
        switch self {
        case .taskLists:
            return "TaskLists"
        case .taskList:
            return "TaskList"
        case .settings:
            return "Settings"
        case .calendar:
            return "Calendar"
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
    let pinned: Bool

    func updating(
        text: String? = nil,
        completed: Bool? = nil,
        date: String? = nil,
        order: Double? = nil,
        pinned: Bool? = nil
    ) -> TaskSummary {
        TaskSummary(
            id: id,
            text: text ?? self.text,
            completed: completed ?? self.completed,
            date: date ?? self.date,
            order: order ?? self.order,
            pinned: pinned ?? self.pinned
        )
    }
}

private struct ActionSheetState: Identifiable, Equatable {
    let taskId: String

    var id: String { taskId }
}

private struct TaskListSummary: Identifiable, Hashable {
    let id: String
    let name: String
    let taskCount: Int
    let memberCount: Int
    let background: String?
}

private struct ManualLicense: Decodable, Identifiable {
    let id: String
    let name: String
    let license: String
    let source: String?
    let text: String
}

private struct GeneratedLicense: Identifiable {
    let id: String
    let title: String
    let text: String
}

private func loadManualLicenses() -> [ManualLicense] {
    guard let url = Bundle.main.url(forResource: "manual-licenses", withExtension: "json"),
          let data = try? Data(contentsOf: url),
          let licenses = try? JSONDecoder().decode([ManualLicense].self, from: data) else {
        return []
    }
    return licenses
}

private func loadGeneratedLicenses() -> [GeneratedLicense] {
    guard let url = Bundle.main.url(forResource: "Acknowledgements", withExtension: "plist", subdirectory: "Acknowledgements"),
          let data = try? Data(contentsOf: url),
          let plist = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any],
          let specifiers = plist["PreferenceSpecifiers"] as? [[String: Any]] else {
        return []
    }
    return specifiers.compactMap { item in
        guard let title = item["Title"] as? String,
              let text = item["FooterText"] as? String else {
            return nil
        }
        return GeneratedLicense(id: title, title: title, text: text)
    }
}

private struct TaskListDetail: Identifiable, Hashable {
    let id: String
    let name: String
    let tasks: [TaskSummary]
    let history: [String]
    let memberCount: Int
    let background: String?
    let shareCode: String?
}

@MainActor
private final class TaskListMutationQueue {
    private var tail: Task<Void, Never>?
    private var pendingCount = 0

    func enqueue(
        _ operation: @escaping @Sendable () async throws -> Void,
        onError: @escaping @MainActor () -> Void = {},
        onIdle: @escaping @MainActor () -> Void = {}
    ) {
        pendingCount += 1
        let previous = tail
        let next = Task {
            _ = await previous?.result
            do {
                try await operation()
            } catch {
                await onError()
            }
            self.pendingCount -= 1
            if self.pendingCount == 0 {
                onIdle()
            }
        }
        tail = next
    }
}

@MainActor
private enum TaskListMutationQueues {
    private static var queues: [String: TaskListMutationQueue] = [:]

    static func queue(for taskListId: String) -> TaskListMutationQueue {
        if let queue = queues[taskListId] {
            return queue
        }
        let queue = TaskListMutationQueue()
        queues[taskListId] = queue
        return queue
    }
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

private enum LoadStatus {
    case idle
    case loading
    case ready
    case error
}

private func orderedTaskListIds(from data: [String: Any]?) -> [String] {
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

private func taskListIdChunks(_ taskListIds: [String]) -> [[String]] {
    stride(from: 0, to: taskListIds.count, by: 10).map { startIndex in
        Array(taskListIds[startIndex..<min(startIndex + 10, taskListIds.count)])
    }
}

private func removeListeners(_ listeners: inout [ListenerRegistration]) {
    listeners.forEach { $0.remove() }
    listeners = []
}

private func mapTaskListSummary(id: String, data: [String: Any]) -> TaskListSummary {
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

private func mapTaskListDetail(id: String, data: [String: Any]) -> TaskListDetail {
    let name = (data["name"] as? String ?? "").precomposedStringWithCanonicalMapping
    let memberCount = (data["memberCount"] as? NSNumber)?.intValue ?? 1
    let background = data["background"] as? String
    let history = (data["history"] as? [String] ?? []).map {
        $0.precomposedStringWithCanonicalMapping
    }
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
            order: (value["order"] as? NSNumber)?.doubleValue ?? 0,
            pinned: value["pinned"] as? Bool ?? false
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
        history: history,
        memberCount: memberCount,
        background: background,
        shareCode: shareCode
    )
}

private class OrderedTaskListViewModel<Item>: ObservableObject {
    @Published private(set) var taskLists: [Item] = []
    @Published private(set) var status: LoadStatus = .idle

    private let db = Firestore.firestore()
    private let mapper: (String, [String: Any]) -> Item
    private var taskListOrderListener: ListenerRegistration?
    private var taskListChunkListeners: [ListenerRegistration] = []
    private var currentUid: String?
    private var orderedIds: [String] = []
    private var taskListsById: [String: Item] = [:]
    private var taskListIdsKey = ""

    init(mapper: @escaping (String, [String: Any]) -> Item) {
        self.mapper = mapper
    }

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

            self.orderedIds = orderedTaskListIds(from: snapshot?.data())
            self.status = .ready
            self.subscribeToTaskLists(taskListIds: self.orderedIds)
            self.publishTaskLists()
        }
    }

    deinit {
        taskListOrderListener?.remove()
        taskListChunkListeners.forEach { $0.remove() }
    }

    func reset() {
        taskListOrderListener?.remove()
        taskListOrderListener = nil
        removeListeners(&taskListChunkListeners)
        currentUid = nil
        orderedIds = []
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

        removeListeners(&taskListChunkListeners)
        taskListsById = taskListsById.filter { taskListIds.contains($0.key) }

        guard !taskListIds.isEmpty else {
            publishTaskLists()
            return
        }

        taskListIdChunks(taskListIds).forEach { chunk in
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

                    chunk.forEach { taskListId in
                        self.taskListsById.removeValue(forKey: taskListId)
                    }
                    snapshot?.documents.forEach { document in
                        self.taskListsById[document.documentID] = self.mapper(
                            document.documentID,
                            document.data()
                        )
                    }

                    self.publishTaskLists()
                }
            taskListChunkListeners.append(listener)
        }
    }

    private func publishTaskLists() {
        taskLists = orderedIds.compactMap { taskListsById[$0] }
    }
}

private final class CalendarViewModel: OrderedTaskListViewModel<TaskListDetail> {
    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    init() {
        super.init(mapper: mapTaskListDetail)
    }

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

private func localeIdentifier(for language: String) -> String {
    switch normalizeLanguageCode(language) {
    case "en":
        return "en_US"
    case "es":
        return "es_ES"
    case "de":
        return "de_DE"
    case "fr":
        return "fr_FR"
    case "ko":
        return "ko_KR"
    case "zh-CN":
        return "zh_CN"
    case "hi":
        return "hi_IN"
    case "ar":
        return "ar"
    case "pt-BR":
        return "pt_BR"
    case "id":
        return "id_ID"
    default:
        return "ja_JP"
    }
}

private struct ParsedTaskInput {
    let text: String
    let date: String?
    let pinnedFromInput: Bool
}

private struct TaskDatePattern {
    let pattern: String
    let options: NSRegularExpression.Options
    let resolveDate: ([String]) -> Date?
}

private let taskDateSpaceOrEndPattern = #"(?:[\s　]|$)"#

private let taskDateDigitMap: [Character: Character] = [
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
    "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
]

private func normalizeTaskDateDigits(_ value: String) -> String {
    String(value.map { taskDateDigitMap[$0] ?? $0 })
}

private func formatTaskInputDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
}

private func taskInputDateFrom(year: Int, month: Int, day: Int) -> Date? {
    var components = DateComponents()
    components.year = year
    components.month = month
    components.day = day
    return Calendar.current.date(from: components)
}

private func nextTaskWeekdayOffset(targetDay: Int, currentDay: Int) -> Int {
    let diff = targetDay - currentDay
    return diff >= 0 ? diff : diff + 7
}

private func makeTaskOffsetDate(_ offset: Int) -> Date? {
    Calendar.current.date(byAdding: .day, value: offset, to: Date())
}

private func resolveTaskDate(from source: String, patterns: [TaskDatePattern]) -> (date: Date, matchedLength: Int)? {
    let nsSource = source as NSString
    for pattern in patterns {
        guard let regex = try? NSRegularExpression(pattern: pattern.pattern, options: pattern.options) else { continue }
        let range = NSRange(location: 0, length: nsSource.length)
        guard let match = regex.firstMatch(in: source, options: [], range: range), match.range.location == 0 else { continue }
        var groups: [String] = []
        for index in 0..<match.numberOfRanges {
            let groupRange = match.range(at: index)
            groups.append(groupRange.location == NSNotFound ? "" : nsSource.substring(with: groupRange))
        }
        if let date = pattern.resolveDate(groups) {
            return (date, match.range.length)
        }
    }
    return nil
}

@MainActor
private func localizedPinPrefixes(translations: Translations) -> [String] {
    let bundle = translations.getRawDict()
    let localized = bundle["pinPrefixes"] as? [String] ?? []
    return Array(Set(["pin", "pinned"] + localized)).sorted { $0.count > $1.count }
}

@MainActor
private func parsePinPrefix(_ text: String, translations: Translations) -> (text: String, pinnedFromInput: Bool) {
    let source = text.trimmingCharacters(in: .whitespacesAndNewlines)
    if source.isEmpty {
        return (source, false)
    }

    for token in localizedPinPrefixes(translations: translations) {
        guard source.count >= token.count else { continue }
        let endIndex = source.index(source.startIndex, offsetBy: token.count)
        let candidate = String(source[..<endIndex])
        guard candidate.compare(token, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame else { continue }
        if endIndex < source.endIndex, !source[endIndex].isWhitespace {
            continue
        }
        return (String(source[endIndex...]).trimmingCharacters(in: .whitespacesAndNewlines), true)
    }

    return (source, false)
}

@MainActor
private func parseDateFromTaskInput(_ text: String, translations: Translations) -> (text: String, date: String?) {
    let source = text.trimmingCharacters(in: .whitespacesAndNewlines)
    if source.isEmpty {
        return (source, nil)
    }

    let normalized = normalizeTaskDateDigits(source)
    let numericPatterns: [TaskDatePattern] = [
        .init(pattern: #"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in
            guard let year = Int(groups[1]), let month = Int(groups[2]), let day = Int(groups[3]) else { return nil }
            guard let date = taskInputDateFrom(year: year, month: month, day: day) else { return nil }
            let components = Calendar.current.dateComponents([.year, .month, .day], from: date)
            return components.year == year && components.month == month && components.day == day ? date : nil
        },
        .init(pattern: #"^(\d{1,2})[-/.](\d{1,2})\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in
            guard let month = Int(groups[1]), let day = Int(groups[2]) else { return nil }
            let currentYear = Calendar.current.component(.year, from: Date())
            guard let date = taskInputDateFrom(year: currentYear, month: month, day: day) else { return nil }
            let components = Calendar.current.dateComponents([.month, .day], from: date)
            guard components.month == month && components.day == day else { return nil }
            let today = Calendar.current.startOfDay(for: Date())
            if date < today {
                return taskInputDateFrom(year: currentYear + 1, month: month, day: day)
            }
            return date
        },
    ]

    if let resolved = resolveTaskDate(from: normalized, patterns: numericPatterns) {
        let stripped = (source as NSString).substring(from: resolved.matchedLength).trimmingCharacters(in: .whitespacesAndNewlines)
        return (stripped, formatTaskInputDate(resolved.date))
    }

    var relativePatternSets = [translations.getRelativePatterns()]
    if translations.language != "en" {
        relativePatternSets.append(Translations.getRelativePatterns(for: "en"))
    }

    for patterns in relativePatternSets {
        if let resolved = resolveTaskDate(from: normalized, patterns: patterns) {
            let stripped = (source as NSString).substring(from: resolved.matchedLength).trimmingCharacters(in: .whitespacesAndNewlines)
            return (stripped, formatTaskInputDate(resolved.date))
        }
    }

    return (source, nil)
}

@MainActor
private func resolveTaskInput(_ text: String, translations: Translations, currentTask: TaskSummary? = nil) -> ParsedTaskInput {
    var remaining = text.trimmingCharacters(in: .whitespacesAndNewlines)
    var parsedDate: String?
    var pinnedFromInput = false
    var parsedPin = false
    var parsedDateValue = false

    for _ in 0..<2 {
        if !parsedPin {
            let pinParsed = parsePinPrefix(remaining, translations: translations)
            if pinParsed.pinnedFromInput {
                remaining = pinParsed.text
                pinnedFromInput = true
                parsedPin = true
                continue
            }
        }
        if !parsedDateValue {
            let dateParsed = parseDateFromTaskInput(remaining, translations: translations)
            if dateParsed.date != nil {
                remaining = dateParsed.text
                parsedDate = dateParsed.date
                parsedDateValue = true
                continue
            }
        }
        break
    }

    if let currentTask {
        return ParsedTaskInput(
            text: remaining.isEmpty ? currentTask.text : remaining,
            date: parsedDate ?? currentTask.date,
            pinnedFromInput: pinnedFromInput
        )
    }
    return ParsedTaskInput(text: remaining, date: parsedDate ?? "", pinnedFromInput: pinnedFromInput)
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

struct RootView: View {
    private enum RegularPane {
        case taskList
        case settings
        case calendar
    }

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var path = AppRoute.initialPath
    @State private var theme: String = "system"
    @State private var isLoggedIn = Auth.auth().currentUser != nil
    @State private var currentUserId = Auth.auth().currentUser?.uid
    @State private var settingsListener: ListenerRegistration?
    @State private var authHandle: AuthStateDidChangeListenerHandle?
    @State private var selectedTaskListId: String? = "__initial__"
    @State private var selectedRegularPane: RegularPane = .taskList
    @State private var splitVisibility: NavigationSplitViewVisibility = .all
    @State private var preferredCompactColumn: NavigationSplitViewColumn = .sidebar
    @State private var pendingPasswordResetCode: String?
    @State private var pendingSharePreviewCode: String?
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
        .font(AppTypography.body())
        .preferredColorScheme(colorScheme)
        .onAppear { startListening() }
        .onDisappear { stopListening() }
        .onChange(of: pendingDeepLink, initial: true) { _, deepLink in
            handlePendingDeepLink(deepLink)
        }
        .fullScreenCover(
            isPresented: Binding(
                get: {
                    !isLoggedIn &&
                    pendingPasswordResetCode == nil &&
                    pendingSharePreviewCode == nil
                },
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
        .fullScreenCover(
            isPresented: Binding(
                get: { pendingSharePreviewCode != nil },
                set: { presented in
                    if !presented {
                        pendingSharePreviewCode = nil
                    }
                }
            )
        ) {
            if let pendingSharePreviewCode {
                NavigationStack {
                    SharedTaskListPreviewView(
                        shareCode: pendingSharePreviewCode,
                        currentUserId: currentUserId,
                        onDismiss: { self.pendingSharePreviewCode = nil },
                        onAdded: { taskListId in
                            self.pendingSharePreviewCode = nil
                            if horizontalSizeClass == .regular {
                                selectedTaskListId = taskListId
                                selectedRegularPane = .taskList
                            } else {
                                path = AppRoute.initialPath
                                path.append(.taskList(taskListId: taskListId))
                            }
                        }
                    )
                }
                .environmentObject(translations)
            }
        }
        .environmentObject(translations)
    }

    private var compactRoot: some View {
        NavigationStack(path: $path) {
            TaskListsView(
                path: $path,
                pendingShareCode: $pendingShareCode,
                isLoggedIn: isLoggedIn,
                currentUserId: currentUserId
            )
                .navigationDestination(for: AppRoute.self) { route in
                    switch route {
                    case .taskLists:
                        TaskListsView(
                            path: $path,
                            pendingShareCode: $pendingShareCode,
                            isLoggedIn: isLoggedIn,
                            currentUserId: currentUserId
                        )
                    case .taskList(let taskListId):
                        TaskListDetailPagerView(initialTaskListId: taskListId, currentUserId: currentUserId)
                    case .settings:
                        SettingsView(currentUserId: currentUserId)
                    case .calendar:
                        CalendarScreenView(currentUserId: currentUserId)
                            .navigationTitle(translations.t("app.calendar"))
                            .navigationBarTitleDisplayMode(.inline)
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
                isLoggedIn: isLoggedIn,
                currentUserId: currentUserId,
                selectedTaskListId: selectedTaskListId,
                onSelectTaskList: { taskListId in
                    selectedTaskListId = taskListId
                    selectedRegularPane = .taskList
                },
                onOpenSettings: {
                    selectedRegularPane = .settings
                },
                onOpenCalendar: {
                    selectedRegularPane = .calendar
                }
            )
            .navigationSplitViewColumnWidth(min: 360, ideal: 360, max: 360)
        } detail: {
            ZStack {
                Color(.systemBackground)
                if selectedRegularPane == .settings {
                    SettingsView(currentUserId: currentUserId)
                } else if selectedRegularPane == .calendar {
                    CalendarScreenView(currentUserId: currentUserId)
                } else {
                    RegularTaskListDetailPagerView(
                        selectedTaskListId: $selectedTaskListId,
                        currentUserId: currentUserId
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
        }
    }

    private func startListening() {
        authHandle = Auth.auth().addStateDidChangeListener { _, user in
            Task { @MainActor in
                isLoggedIn = user != nil
                currentUserId = user?.uid
                settingsListener?.remove()
                guard let uid = user?.uid else {
                    theme = "system"
                    translations.load(language: "ja")
                    return
                }
                settingsListener = Firestore.firestore()
                    .collection("settings").document(uid)
                    .addSnapshotListener { snapshot, _ in
                        Task { @MainActor in
                            theme = snapshot?.data()?["theme"] as? String ?? "system"
                            let language = snapshot?.data()?["language"] as? String ?? "ja"
                            translations.load(language: language)
                        }
                    }
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
            pendingSharePreviewCode = shareCode
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

private extension VerticalAlignment {
    private enum TaskRowContentCenter: AlignmentID {
        static func defaultValue(in dimensions: ViewDimensions) -> CGFloat {
            dimensions[VerticalAlignment.center]
        }
    }

    static let taskRowContentCenter = VerticalAlignment(TaskRowContentCenter.self)
}

private enum AppIconMetrics {
    static let standardActionIconSize: CGFloat = 22
    static let navigationIconSize: CGFloat = 22
    static let compactActionIconSize: CGFloat = 20
    static let inlineActionIconSize: CGFloat = 18
    static let dragHandleDotSize: CGFloat = 4
    static let dragHandleDotSpacing: CGFloat = 3
    static let listColorDotSize: CGFloat = 16
    static let calendarTaskColorDotSize: CGFloat = 10
}

private enum TaskListDetailMetrics {
    static let headerIconButtonSize: CGFloat = 28
    static let headerIconSize: CGFloat = AppIconMetrics.compactActionIconSize
    static let inputCornerRadius: CGFloat = 14
    static let inputHorizontalPadding: CGFloat = 14
    static let inputVerticalPadding: CGFloat = 10
    static let inputBorderWidth: CGFloat = 1
    static let actionRowTopPadding: CGFloat = 2
    static let actionIconSize: CGFloat = AppIconMetrics.inlineActionIconSize
    static let addActionIconSize: CGFloat = AppIconMetrics.compactActionIconSize
    static let taskRowSpacing: CGFloat = 8
    static let taskRowVerticalPadding: CGFloat = 6
    static let taskContentHeight: CGFloat = 44
    static let taskDateBottomSpacing: CGFloat = -2
    static let dragTouchHeight: CGFloat = 44
    static let dragTouchWidth: CGFloat = 20
    static let completionTouchHeight: CGFloat = 44
    static let completionTouchWidth: CGFloat = 26
    static let completionDotSize: CGFloat = 20
    static let trailingDateButtonWidth: CGFloat = 48
    static let trailingDateButtonHeight: CGFloat = 48
    static let trailingDateIconSize: CGFloat = AppIconMetrics.compactActionIconSize
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
                        .font(AppTypography.title())

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
    @EnvironmentObject var translations: Translations
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
                .accessibilityLabel("\(taskList.name)、\(translations.t("a11y.listPosition", ["index": "\(index + 1)", "total": "\(taskLists.count)"]))")
                .accessibilityAddTraits(index == selectedIndex ? [.isSelected] : [])
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
                                    .font(.system(size: AppIconMetrics.navigationIconSize, weight: .semibold))
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
    @State private var selectedLanguage = "ja"

    var body: some View {
        ScreenScaffold(title: title) {
            VStack(spacing: 16) {
                HStack {
                    Spacer()
                    Menu {
                        ForEach(supportedLanguages.indices, id: \.self) { index in
                            let option = supportedLanguages[index]
                            Button {
                                let normalized = normalizeLanguageCode(option.code)
                                selectedLanguage = normalized
                                logSettingsLanguageChange(language: normalized)
                                translations.load(language: normalized)
                            } label: {
                                if selectedLanguage == option.code {
                                    Label(option.name, systemImage: "checkmark")
                                } else {
                                    Text(option.name)
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "globe")
                            Text(supportedLanguages.first(where: { $0.code == selectedLanguage })?.name ?? selectedLanguage)
                        }
                        .font(AppTypography.subheadlineMedium())
                    }
                    .accessibilityLabel(translations.t("settings.language.title"))
                }

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
                    SignUpView(language: selectedLanguage) {
                        selectedScreen = .signIn
                    }
                case .reset:
                    PasswordResetRequestView(language: selectedLanguage) {
                        selectedScreen = .signIn
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
        .onAppear {
            selectedLanguage = normalizeLanguageCode(language)
        }
        .onChange(of: language) { _, newLanguage in
            selectedLanguage = normalizeLanguageCode(newLanguage)
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
                    .font(AppTypography.caption())
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
        var didComplete = false

        let timeoutTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: UInt64(authSignInTimeoutSeconds * 1_000_000_000))
            guard !Task.isCancelled, !didComplete else { return }
            didComplete = true
            isLoading = false
            logException(description: "iOS sign in timed out", fatal: false)
            errorMessage = translations.t("auth.error.general")
        }

        Auth.auth().signIn(withEmail: trimmedEmail, password: password) { result, error in
            Task { @MainActor in
                guard !didComplete else { return }
                didComplete = true
                timeoutTask.cancel()
                isLoading = false
                if let error {
                    errorMessage = resolveAuthErrorMessage(translations: translations, error: error)
                } else if result == nil {
                    errorMessage = translations.t("auth.error.general")
                } else {
                    logLogin()
                }
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
                    .font(AppTypography.caption())
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
            Task { @MainActor in
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

                let now = nowMillis()
                let taskListId = db.collection("taskLists").document().documentID
                let batch = db.batch()
                batch.setData([
                    "theme": "system",
                    "language": normalizedLanguage,
                    "taskInsertPosition": "top",
                    "autoSort": false,
                    "createdAt": nowMillis(),
                    "updatedAt": nowMillis(),
                ], forDocument: db.collection("settings").document(uid))
                batch.setData([
                    "id": taskListId,
                    "name": initialTaskListNameByLanguage[normalizedLanguage] ?? initialTaskListNameByLanguage["ja"] ?? "📒個人",
                    "tasks": [:],
                    "history": [],
                    "shareCode": NSNull(),
                    "background": NSNull(),
                    "memberCount": 1,
                    "createdAt": nowMillis(),
                    "updatedAt": nowMillis(),
                ], forDocument: db.collection("taskLists").document(taskListId))
                batch.setData([
                    taskListId: ["order": 1.0],
                    "createdAt": now,
                    "updatedAt": now,
                ], forDocument: db.collection("taskListOrder").document(uid))
                batch.commit { commitError in
                    Task { @MainActor in
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
                .font(AppTypography.subheadline())
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
                    .font(AppTypography.caption())
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if let successMessage {
                Text(successMessage)
                    .foregroundStyle(.green)
                    .font(AppTypography.caption())
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
            Task { @MainActor in
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
                        .font(AppTypography.caption())
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
            Task { @MainActor in
                isVerifying = false
                if let error {
                    errorMessage = resolvePasswordResetErrorMessage(translations: translations, error: error)
                }
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
            Task { @MainActor in
                isSubmitting = false
                if let error {
                    errorMessage = resolvePasswordResetErrorMessage(translations: translations, error: error)
                    return
                }

                successMessage = translations.t("auth.passwordReset.resetSuccess")
            }
        }
    }
}

private struct DragHandleIcon: View {
    var body: some View {
        VStack(spacing: AppIconMetrics.dragHandleDotSpacing) {
            ForEach(0..<3, id: \.self) { _ in
                HStack(spacing: AppIconMetrics.dragHandleDotSpacing) {
                    ForEach(0..<2, id: \.self) { _ in
                        Circle().frame(width: AppIconMetrics.dragHandleDotSize, height: AppIconMetrics.dragHandleDotSize)
                    }
                }
            }
        }
    }
}

private final class DragAutoScroller {
    static let edgeZone: CGFloat = 80
    static let maxSpeed: CGFloat = 8
    private static let frameInterval = 1.0 / 60.0

    private var timer: Timer?
    private var speed: CGFloat = 0

    func update(
        fingerY: CGFloat,
        scrollView: UIScrollView?,
        isActive: @escaping () -> Bool,
        onScroll: @escaping (CGFloat) -> Void
    ) {
        guard let scrollView else { return }
        let viewportHeight = scrollView.bounds.height

        if fingerY < Self.edgeZone {
            speed = -Self.maxSpeed * (1.0 - max(0, fingerY) / Self.edgeZone)
        } else if fingerY > viewportHeight - Self.edgeZone {
            speed = Self.maxSpeed * (1.0 - max(0, viewportHeight - fingerY) / Self.edgeZone)
        } else {
            speed = 0
        }

        if speed != 0 && timer == nil {
            timer = Timer.scheduledTimer(withTimeInterval: Self.frameInterval, repeats: true) { [weak self, weak scrollView] _ in
                guard let self, let scrollView, isActive() else {
                    self?.stop()
                    return
                }
                let oldOffset = scrollView.contentOffset.y
                let maxOffset = max(0, scrollView.contentSize.height - scrollView.bounds.height)
                let newOffset = min(max(0, oldOffset + self.speed), maxOffset)
                scrollView.setContentOffset(CGPoint(x: 0, y: newOffset), animated: false)
                let scrolledBy = scrollView.contentOffset.y - oldOffset
                if scrolledBy != 0 {
                    onScroll(scrolledBy)
                }
            }
        } else if speed == 0 {
            stop()
        }
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        speed = 0
    }
}

private struct TaskListsView: View {
    @Binding var path: [AppRoute]
    @Binding var pendingShareCode: String?
    let isLoggedIn: Bool
    let currentUserId: String?
    let selectedTaskListId: String?
    let onSelectTaskList: ((String) -> Void)?
    let onOpenSettings: (() -> Void)?
    let onOpenCalendar: (() -> Void)?
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @StateObject private var viewModel = OrderedTaskListViewModel<TaskListSummary>(mapper: mapTaskListSummary)
    @State private var draggingTaskListId: String? = nil
    @State private var dragOffset: CGFloat = 0
    @State private var dragStartLocationY: CGFloat? = nil
    @State private var dragOrderedTaskLists: [TaskListSummary]? = nil
    @State private var pendingTaskListOrder: [TaskListSummary]? = nil
    @State private var taskListItemHeights: [String: CGFloat] = [:]
    @State private var autoScroller = DragAutoScroller()
    @State private var scrollViewRef: UIScrollView? = nil
    @State private var showCreateSheet = false
    @State private var createName = ""
    @State private var createBackground: String? = nil
    @State private var showJoinSheet = false
    @State private var joinListInput = ""
    @State private var joiningList = false
    @State private var joinListError: String? = nil

    init(
        path: Binding<[AppRoute]>,
        pendingShareCode: Binding<String?>,
        isLoggedIn: Bool,
        currentUserId: String?,
        selectedTaskListId: String? = nil,
        onSelectTaskList: ((String) -> Void)? = nil,
        onOpenSettings: (() -> Void)? = nil,
        onOpenCalendar: (() -> Void)? = nil
    ) {
        _path = path
        _pendingShareCode = pendingShareCode
        self.isLoggedIn = isLoggedIn
        self.currentUserId = currentUserId
        self.selectedTaskListId = selectedTaskListId
        self.onSelectTaskList = onSelectTaskList
        self.onOpenSettings = onOpenSettings
        self.onOpenCalendar = onOpenCalendar
    }

    private var displayTaskLists: [TaskListSummary] {
        dragOrderedTaskLists ?? pendingTaskListOrder ?? viewModel.taskLists
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
        autoScroller.update(
            fingerY: fingerY,
            scrollView: scrollViewRef,
            isActive: { self.draggingTaskListId != nil },
            onScroll: { scrolledBy in
                self.dragOffset += scrolledBy
                self.dragStartLocationY = (self.dragStartLocationY ?? 0) - scrolledBy
                let correction = self.checkTaskListSwap()
                if correction != 0 {
                    UISelectionFeedbackGenerator().selectionChanged()
                    self.dragStartLocationY = (self.dragStartLocationY ?? 0) - correction
                }
            }
        )
    }

    private func stopAutoScroll() {
        autoScroller.stop()
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

    private func openCalendar() {
        if let onOpenCalendar {
            onOpenCalendar()
        } else {
            path.append(AppRoute.calendar)
        }
    }

    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                HStack {
                    Text(displayedUserEmail)
                        .font(AppTypography.subheadline())
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    Spacer()

                    if let onOpenSettings {
                        Button(action: onOpenSettings) {
                            Image(systemName: "gearshape")
                                .font(.system(size: AppIconMetrics.standardActionIconSize, weight: .semibold))
                                .foregroundStyle(.primary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(translations.t("settings.title"))
                    } else {
                        NavigationLink(value: AppRoute.settings) {
                            Image(systemName: "gearshape")
                                .font(.system(size: AppIconMetrics.standardActionIconSize, weight: .semibold))
                                .foregroundStyle(.primary)
                        }
                        .accessibilityLabel(translations.t("settings.title"))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 16)

                Button {
                    openCalendar()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "calendar")
                            .font(.system(size: AppIconMetrics.inlineActionIconSize, weight: .medium))
                        Text(translations.t("app.calendarCheckButton"))
                            .font(AppTypography.body())
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
                        .font(AppTypography.subheadline())
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
                                        .accessibilityAction(named: Text(translations.t("a11y.moveUp"))) { moveTaskList(taskList, by: -1) }
                                        .accessibilityAction(named: Text(translations.t("a11y.moveDown"))) { moveTaskList(taskList, by: 1) }
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
                                                    dragOrderedTaskLists = nil
                                                    withAnimation(reduceMotion ? .none : .easeInOut(duration: 0.15)) {
                                                        dragOffset = 0
                                                    }
                                                    dragStartLocationY = nil
                                                    draggingTaskListId = nil
                                                }
                                        )

                                    Circle()
                                        .fill(taskList.background.flatMap { Color(hex: $0) } ?? Color(.systemGray4))
                                        .frame(width: AppIconMetrics.listColorDotSize, height: AppIconMetrics.listColorDotSize)
                                        .overlay(
                                            Circle()
                                                .stroke(Color(.separator), lineWidth: taskList.background == nil ? 1 : 0)
                                        )
                                        .accessibilityHidden(true)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(taskList.name)
                                            .font(AppTypography.bodyMedium())
                                            .foregroundStyle(.primary)
                                        Text(translations.t("taskList.taskCount", ["count": "\(taskList.taskCount)"]))
                                            .font(AppTypography.subheadline())
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()
                                }
                                .contentShape(Rectangle())
                                .accessibilityElement(children: .combine)
                                .accessibilityLabel("\(taskList.name)、\(translations.t("taskList.taskCount", ["count": "\(taskList.taskCount)"]))")
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
                            .font(AppTypography.bodyMedium())
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.primary)
                            .foregroundStyle(Color(.systemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    }
                    .buttonStyle(.plain)

                    Button {
                        joinListInput = ""
                        joinListError = nil
                        showJoinSheet = true
                    } label: {
                        Text(translations.t("app.joinList"))
                            .font(AppTypography.bodyMedium())
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
            viewModel.bind(uid: currentUserId)
        }
        .onChange(of: currentUserId) { _, nextUid in
            viewModel.bind(uid: nextUid)
        }
        .onChange(of: viewModel.taskLists) { _, taskLists in
            if let pendingTaskListOrder, pendingTaskListOrder.map(\.id) == taskLists.map(\.id) {
                self.pendingTaskListOrder = nil
            }
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
        .sheet(isPresented: $showCreateSheet) {
            NavigationStack {
                let colorOptions: [String?] = [nil, "#F87171", "#FBBF24", "#34D399", "#38BDF8", "#818CF8", "#A78BFA"]
                VStack(spacing: 24) {
                    TextField(translations.t("app.taskListName"), text: $createName)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text(translations.t("taskList.selectColor"))
                            .font(AppTypography.subheadline())
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
                                            Circle().stroke(Color.primary, lineWidth: isSelected ? 2.5 : 0).padding(-3)
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
        .sheet(isPresented: $showJoinSheet) {
            NavigationStack {
                VStack(spacing: 16) {
                    Text(translations.t("app.joinListDescription"))
                        .font(AppTypography.subheadline())
                        .foregroundStyle(.secondary)

                    if let error = joinListError {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(AppTypography.subheadline())
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

    private func moveTaskList(_ taskList: TaskListSummary, by delta: Int) {
        var ordered = displayTaskLists
        guard let index = ordered.firstIndex(where: { $0.id == taskList.id }) else { return }
        let target = index + delta
        guard target >= 0 && target < ordered.count else { return }
        ordered.swapAt(index, target)
        dragOrderedTaskLists = ordered
        persistTaskListOrder(ordered.map(\.id))
        dragOrderedTaskLists = nil
    }

    private func persistTaskListOrder(_ ids: [String]) {
        logTaskListReorder()
        guard let uid = Auth.auth().currentUser?.uid else { return }
        var updates: [String: Any] = ["updatedAt": nowMillis()]
        for (i, id) in ids.enumerated() {
            updates["\(id).order"] = Double(i + 1)
        }
        pendingTaskListOrder = displayTaskLists
        Firestore.firestore().collection("taskListOrder").document(uid).updateData(updates) { _ in
            Task { @MainActor in
                pendingTaskListOrder = nil
            }
        }
    }

    private func createTaskList(name: String, background: String?) {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        let db = Firestore.firestore()
        let taskListId = db.collection("taskLists").document().documentID
        let newOrder = Double(viewModel.taskLists.count + 1)

        var newTaskList: [String: Any] = [
            "id": taskListId,
            "name": name,
            "tasks": [String: Any](),
            "history": [Any](),
            "shareCode": NSNull(),
            "memberCount": 1,
            "createdAt": nowMillis(),
            "updatedAt": nowMillis(),
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
            "updatedAt": nowMillis(),
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

private struct DetailPagerContent: View {
    @Binding var selectedTaskListId: String
    let taskLists: [TaskListDetail]
    let taskInsertPosition: String
    let autoSort: Bool
    let showBackButton: Bool
    let onBack: (() -> Void)?
    let ignoresSafeAreaBackground: Bool

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $selectedTaskListId) {
                ForEach(taskLists) { taskList in
                    TaskListDetailPage(
                        taskList: taskList,
                        taskInsertPosition: taskInsertPosition,
                        autoSort: autoSort
                    )
                    .tag(taskList.id)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.bottom, 16)
        .background(backgroundView)
        .safeAreaInset(edge: .top, spacing: 0) {
            TaskListTopChrome(
                showBackButton: showBackButton,
                taskLists: taskLists,
                selectedIndex: selectedTaskListIndex,
                onSelect: { selectedTaskListId = $0 },
                onBack: onBack
            )
        }
    }

    @ViewBuilder
    private var backgroundView: some View {
        let background = resolveTaskListBackgroundColor(currentTaskList?.background)
        if ignoresSafeAreaBackground {
            background.ignoresSafeArea()
        } else {
            background
        }
    }

    private var currentTaskList: TaskListDetail? {
        taskLists.first(where: { $0.id == selectedTaskListId }) ?? taskLists.first
    }

    private var selectedTaskListIndex: Int {
        max(0, taskLists.firstIndex(where: { $0.id == selectedTaskListId }) ?? 0)
    }
}

private struct TaskListDetailPagerView: View {
    let initialTaskListId: String
    let currentUserId: String?
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var translations: Translations
    @State private var selectedTaskListId: String
    @StateObject private var viewModel = OrderedTaskListViewModel<TaskListDetail>(mapper: mapTaskListDetail)
    @StateObject private var settingsViewModel = SettingsViewModel()

    init(initialTaskListId: String, currentUserId: String?) {
        self.initialTaskListId = initialTaskListId
        self.currentUserId = currentUserId
        _selectedTaskListId = State(initialValue: initialTaskListId)
    }

    var body: some View {
        Group {
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
                DetailPagerContent(
                    selectedTaskListId: $selectedTaskListId,
                    taskLists: viewModel.taskLists,
                    taskInsertPosition: settingsViewModel.settings?.taskInsertPosition ?? "top",
                    autoSort: settingsViewModel.settings?.autoSort ?? false,
                    showBackButton: true,
                    onBack: { dismiss() },
                    ignoresSafeAreaBackground: true
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            viewModel.bind(uid: currentUserId)
            settingsViewModel.bind(uid: currentUserId)
        }
        .onChange(of: currentUserId) { _, nextUid in
            viewModel.bind(uid: nextUid)
            settingsViewModel.bind(uid: nextUid)
        }
        .onDisappear {
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

            selectedTaskListId = taskLists.first(where: { $0.id == initialTaskListId })?.id ?? taskLists[0].id
        }
    }
}

private struct RegularTaskListDetailPagerView: View {
    @EnvironmentObject var translations: Translations
    @Binding var selectedTaskListId: String?
    let currentUserId: String?
    @StateObject private var viewModel = OrderedTaskListViewModel<TaskListDetail>(mapper: mapTaskListDetail)
    @StateObject private var settingsViewModel = SettingsViewModel()

    var body: some View {
        Group {
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
                DetailPagerContent(
                    selectedTaskListId: Binding(
                        get: { resolvedTaskListId },
                        set: { selectedTaskListId = $0 }
                    ),
                    taskLists: viewModel.taskLists,
                    taskInsertPosition: settingsViewModel.settings?.taskInsertPosition ?? "top",
                    autoSort: settingsViewModel.settings?.autoSort ?? false,
                    showBackButton: false,
                    onBack: nil,
                    ignoresSafeAreaBackground: false
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            viewModel.bind(uid: currentUserId)
            settingsViewModel.bind(uid: currentUserId)
        }
        .onChange(of: currentUserId) { _, nextUid in
            viewModel.bind(uid: nextUid)
            settingsViewModel.bind(uid: nextUid)
        }
        .onDisappear {
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

    private var resolvedTaskListId: String {
        if let selectedTaskListId, viewModel.taskLists.contains(where: { $0.id == selectedTaskListId }) {
            return selectedTaskListId
        }
        return viewModel.taskLists.first?.id ?? ""
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
    private let completedTaskOpacity = 0.64
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let taskList: TaskListDetail
    let taskInsertPosition: String
    let autoSort: Bool
    @State private var newTaskText = ""
    @State private var editingTaskId: String? = nil
    @State private var editingText: String = ""
    @State private var actionSheetState: ActionSheetState? = nil
    @State private var showDeleteCompletedAlert = false
    @State private var draggingTaskId: String? = nil
    @State private var taskDragOffset: CGFloat = 0
    @State private var taskDragStartLocationY: CGFloat? = nil
    @State private var dragOrderedTasks: [TaskSummary]? = nil
    @State private var pendingDisplayTasks: [TaskSummary]? = nil
    @State private var taskItemHeights: [String: CGFloat] = [:]
    @State private var taskAutoScroller = DragAutoScroller()
    @State private var taskScrollViewRef: UIScrollView? = nil
    private var mutationQueue: TaskListMutationQueue {
        TaskListMutationQueues.queue(for: taskList.id)
    }
    @FocusState private var isNewTaskFocused: Bool
    @FocusState private var isTextFieldFocused: Bool
    private let db = Firestore.firestore()

    private var displayTasks: [TaskSummary] {
        dragOrderedTasks ?? pendingDisplayTasks ?? getDisplayOrderedTasks(taskList.tasks)
    }

    private func taskDisplayGroup(_ task: TaskSummary) -> Int {
        if task.completed { return 2 }
        return task.pinned ? 0 : 1
    }

    private func getDisplayOrderedTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
        tasks.sorted { lhs, rhs in
            let lhsGroup = taskDisplayGroup(lhs)
            let rhsGroup = taskDisplayGroup(rhs)
            if lhsGroup != rhsGroup { return lhsGroup < rhsGroup }
            return lhs.order < rhs.order
        }
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
            if taskDisplayGroup(ordered[currentIdx]) == taskDisplayGroup(ordered[currentIdx + 1]),
               taskDragOffset > threshold {
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
            if taskDisplayGroup(ordered[currentIdx]) == taskDisplayGroup(ordered[currentIdx - 1]),
               taskDragOffset < -threshold {
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
        taskAutoScroller.update(
            fingerY: fingerY,
            scrollView: taskScrollViewRef,
            isActive: { self.draggingTaskId != nil },
            onScroll: { scrolledBy in
                self.taskDragOffset += scrolledBy
                self.taskDragStartLocationY = (self.taskDragStartLocationY ?? 0) - scrolledBy
                let correction = self.checkTaskSwap()
                if correction != 0 {
                    UISelectionFeedbackGenerator().selectionChanged()
                    self.taskDragStartLocationY = (self.taskDragStartLocationY ?? 0) - correction
                }
            }
        )
    }

    private func handleTaskDragChanged(task: TaskSummary, displayTasks: [TaskSummary], fingerY: CGFloat) {
        if draggingTaskId == nil {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            draggingTaskId = task.id
            dragOrderedTasks = displayTasks
            taskDragStartLocationY = fingerY
        }
        guard let startY = taskDragStartLocationY else { return }
        taskDragOffset = fingerY - startY
        let correction = checkTaskSwap()
        if correction != 0 {
            UISelectionFeedbackGenerator().selectionChanged()
            taskDragStartLocationY = startY - correction
        }
        updateTaskAutoScroll(fingerY: fingerY)
    }

    private func stopTaskAutoScroll() {
        taskAutoScroller.stop()
    }

    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private func formatDateDisplay(_ dateStr: String) -> String {
        guard let date = Self.isoFormatter.date(from: dateStr) else { return dateStr }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: localeIdentifier(for: translations.language))
        formatter.setLocalizedDateFormatFromTemplate("MMMEd")
        return formatter.string(from: date)
    }

    @ViewBuilder
    private func completionButton(_ task: TaskSummary) -> some View {
        let strokeOpacity = task.completed ? 0.12 : 0.35
        let strokeWidth = task.completed ? 0.0 : 1.5
        let fillColor = task.completed ? Color.secondary.opacity(0.28) : Color.clear
        let accessibilityLabel = translations.t(task.completed ? "pages.tasklist.markIncomplete" : "pages.tasklist.markComplete")

        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            toggleCompletion(task)
        } label: {
            ZStack {
                Circle()
                    .stroke(Color.secondary.opacity(strokeOpacity), lineWidth: strokeWidth)
                    .background(
                        Circle()
                            .fill(fillColor)
                            .scaleEffect(task.completed ? 1.0 : 0.4)
                    )
                    .frame(width: TaskListDetailMetrics.completionDotSize, height: TaskListDetailMetrics.completionDotSize)
            }
            .frame(width: TaskListDetailMetrics.completionTouchWidth, height: TaskListDetailMetrics.completionTouchHeight)
            .animation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.65), value: task.completed)
        }
        .buttonStyle(.plain)
        .alignmentGuide(.taskRowContentCenter) { dimensions in
            dimensions[VerticalAlignment.center]
        }
        .accessibilityLabel(accessibilityLabel)
    }

    @ViewBuilder
    private func colorOptionButton(color: String?, isSelected: Bool, action: @escaping () -> Void) -> some View {
        let fillColor = color.flatMap { Color(hex: $0) } ?? Color(.systemBackground)
        let outlineWidth = color == nil ? 1.0 : 0.0
        let selectedWidth = isSelected ? 2.5 : 0.0

        Button(action: action) {
            Circle()
                .fill(fillColor)
                .frame(width: 44, height: 44)
                .overlay(
                    Circle().stroke(Color(.separator), lineWidth: outlineWidth)
                )
                .overlay(
                    Circle().stroke(Color.primary, lineWidth: selectedWidth).padding(-3)
                )
        }
    }

    private func getAutoSortedTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
        tasks
            .sorted { lhs, rhs in
                let lhsGroup = taskDisplayGroup(lhs)
                let rhsGroup = taskDisplayGroup(rhs)
                if lhsGroup != rhsGroup {
                    return lhsGroup < rhsGroup
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
                task.updating(order: Double(index + 1))
            }
    }

    private func renumberTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
        tasks.enumerated().map { index, task in
            task.updating(order: Double(index + 1))
        }
    }

    private func buildTaskUpdateData(previousTasks: [TaskSummary], tasks: [TaskSummary], deletedTaskIds: [String] = []) -> [String: Any] {
        var updates: [String: Any] = ["updatedAt": nowMillis()]
        let previousById = Dictionary(uniqueKeysWithValues: previousTasks.map { ($0.id, $0) })
        for taskId in deletedTaskIds {
            updates["tasks.\(taskId)"] = FieldValue.delete()
        }
        for task in tasks {
            guard let previous = previousById[task.id] else {
                updates["tasks.\(task.id).id"] = task.id
                updates["tasks.\(task.id).text"] = task.text
                updates["tasks.\(task.id).completed"] = task.completed
                updates["tasks.\(task.id).date"] = task.date
                updates["tasks.\(task.id).order"] = task.order
                updates["tasks.\(task.id).pinned"] = task.pinned
                continue
            }
            if previous.text != task.text { updates["tasks.\(task.id).text"] = task.text }
            if previous.completed != task.completed { updates["tasks.\(task.id).completed"] = task.completed }
            if previous.date != task.date { updates["tasks.\(task.id).date"] = task.date }
            if previous.order != task.order { updates["tasks.\(task.id).order"] = task.order }
            if previous.pinned != task.pinned { updates["tasks.\(task.id).pinned"] = task.pinned }
        }
        return updates
    }

    private func buildHistory(newText: String, oldText: String? = nil) -> [String] {
        let candidate = newText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !candidate.isEmpty else { return taskList.history }
        let trimmedOldText = oldText?.trimmingCharacters(in: .whitespacesAndNewlines)
        var result: [String] = []
        var seen = Set<String>()

        for entry in [candidate] + taskList.history {
            let trimmed = entry.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty { continue }
            if let trimmedOldText, trimmed == trimmedOldText { continue }
            let normalized = trimmed.lowercased()
            if seen.contains(normalized) { continue }
            seen.insert(normalized)
            result.append(trimmed)
            if result.count >= 300 { break }
        }

        return result
    }

    private func normalizedTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
        autoSort ? getAutoSortedTasks(tasks) : renumberTasks(tasks)
    }

    private func reconciledTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
        getDisplayOrderedTasks(normalizedTasks(tasks))
    }

    private func setPendingTasks(_ tasks: [TaskSummary]) {
        withAnimation(reduceMotion ? .none : .easeInOut(duration: 0.22)) {
            pendingDisplayTasks = tasks
        }
    }

    private func updateTaskList(_ updates: [String: Any]) {
        mutationQueue.enqueue({
            try await db.collection("taskLists").document(taskList.id).updateData(updates)
        }, onError: {
            pendingDisplayTasks = nil
        }, onIdle: {
            pendingDisplayTasks = nil
        })
    }

    private func persistTasks(_ tasks: [TaskSummary], deletedTaskIds: [String] = [], previousTasks: [TaskSummary]? = nil) {
        let previousTasks = previousTasks ?? displayTasks
        let normalized = normalizedTasks(tasks)
        setPendingTasks(normalized)
        updateTaskList(buildTaskUpdateData(previousTasks: previousTasks, tasks: normalized, deletedTaskIds: deletedTaskIds))
    }

    private func performTaskMutation(
        buildNextTasks: ([TaskSummary]) -> [TaskSummary],
        persist: ([TaskSummary], [TaskSummary]) -> Void
    ) {
        let previousTasks = displayTasks
        let nextTasks = reconciledTasks(buildNextTasks(previousTasks))
        setPendingTasks(nextTasks)
        persist(previousTasks, nextTasks)
    }

    private func deleteTaskList() {
        guard !removingList, let user = Auth.auth().currentUser else { return }
        removingList = true
        removeListError = nil
        let uid = user.uid
        Task {
            do {
                let taskListOrderRef = self.db.collection("taskListOrder").document(uid)
                let taskListRef = self.db.collection("taskLists").document(taskList.id)
                let orderSnapshot = try await taskListOrderRef.getDocument()
                let taskListSnapshot = try await taskListRef.getDocument()
                guard orderSnapshot.exists,
                      let orderData = orderSnapshot.data(),
                      orderData[taskList.id] != nil else {
                    await MainActor.run {
                        removingList = false
                    }
                    return
                }
                guard taskListSnapshot.exists else {
                    await MainActor.run {
                        removingList = false
                    }
                    return
                }

                let batch = db.batch()
                batch.setData([
                    taskList.id: FieldValue.delete(),
                    "updatedAt": nowMillis(),
                ], forDocument: taskListOrderRef, merge: true)

                let currentMemberCount = (taskListSnapshot.data()?["memberCount"] as? NSNumber)?.intValue ?? 1
                if currentMemberCount <= 1 {
                    if let currentCode = taskListSnapshot.data()?["shareCode"] as? String,
                       !currentCode.isEmpty {
                        batch.deleteDocument(self.db.collection("shareCodes").document(currentCode))
                    }
                    batch.deleteDocument(taskListRef)
                } else {
                    batch.updateData([
                        "memberCount": FieldValue.increment(Int64(-1)),
                        "updatedAt": nowMillis(),
                    ], forDocument: taskListRef)
                }
                try await batch.commit()

                await MainActor.run {
                    logTaskListDelete()
                    showDeleteListAlert = false
                    showEditSheet = false
                    removingList = false
                }
            } catch {
                await MainActor.run {
                    removeListError = translations.t("common.error")
                    removingList = false
                }
            }
        }
    }

    @State private var showEditSheet = false
    @State private var editName = ""
    @State private var editBackground: String? = nil
    @State private var showShareSheet = false
    @State private var currentShareCode: String? = nil
    @State private var generatingShareCode = false
    @State private var removingShareCode = false
    @State private var removingList = false
    @State private var removeListError: String? = nil
    @State private var showDeleteListAlert = false
    @State private var shareCopySuccess = false
    @State private var shareError: String? = nil
    @State private var isHistoryPopoverPresented = false

    private var historyOptions: [String] {
        let input = newTaskText.trimmingCharacters(in: .whitespacesAndNewlines)
        if input.count < 2 { return [] }
        let inputLower = input.lowercased()
        var seen = Set<String>()
        var options: [String] = []
        for candidate in taskList.history {
            let option = candidate.trimmingCharacters(in: .whitespacesAndNewlines)
            if option.isEmpty { continue }
            let optionLower = option.lowercased()
            if optionLower == inputLower || !optionLower.contains(inputLower) || seen.contains(optionLower) {
                continue
            }
            seen.insert(optionLower)
            options.append(option)
            if options.count >= 20 { break }
        }
        return options
    }

    private func syncHistoryPopover() {
        isHistoryPopoverPresented = isNewTaskFocused && !historyOptions.isEmpty
    }

    private func taskRow(_ task: TaskSummary, displayTasks: [TaskSummary]) -> some View {
        HStack(alignment: .taskRowContentCenter, spacing: TaskListDetailMetrics.taskRowSpacing) {
            DragHandleIcon()
                .foregroundStyle(.secondary)
                .frame(width: TaskListDetailMetrics.dragTouchWidth, height: TaskListDetailMetrics.dragTouchHeight)
                .alignmentGuide(.taskRowContentCenter) { dimensions in
                    dimensions[VerticalAlignment.center]
                }
                .contentShape(Rectangle())
                .accessibilityLabel(translations.t("app.dragHint"))
                .accessibilityAction(named: Text(translations.t("a11y.moveUp"))) { moveTask(task, by: -1) }
                .accessibilityAction(named: Text(translations.t("a11y.moveDown"))) { moveTask(task, by: 1) }
                .gesture(
                    DragGesture(minimumDistance: 2, coordinateSpace: .named("taskList"))
                        .onChanged { value in
                            handleTaskDragChanged(task: task, displayTasks: displayTasks, fingerY: value.location.y)
                        }
                        .onEnded { _ in
                            stopTaskAutoScroll()
                            let originalTaskIds = getDisplayOrderedTasks(taskList.tasks).map(\.id)
                            if let ordered = dragOrderedTasks,
                               ordered.map(\.id) != originalTaskIds {
                                persistTaskOrder(ordered.map(\.id))
                            }
                            dragOrderedTasks = nil
                            withAnimation(reduceMotion ? .none : .easeInOut(duration: 0.15)) {
                                taskDragOffset = 0
                            }
                            taskDragStartLocationY = nil
                            draggingTaskId = nil
                        }
                )

            completionButton(task)

            VStack(alignment: .leading, spacing: 0) {
                if !task.date.isEmpty {
                    Text(formatDateDisplay(task.date))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                        .padding(.bottom, TaskListDetailMetrics.taskDateBottomSpacing)
                }

                Group {
                    if editingTaskId == task.id {
                        TextField("", text: $editingText)
                            .focused($isTextFieldFocused)
                            .onSubmit { commitEdit(task) }
                            .font(.system(size: 16, weight: .semibold))
                    } else {
                        Button { startEdit(task) } label: {
                            Text(task.text)
                                .font(.system(size: 16, weight: task.pinned && !task.completed ? .bold : .semibold))
                                .strikethrough(task.completed)
                                .foregroundStyle(task.completed ? .secondary : .primary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("\(translations.t("a11y.editTask")): \(task.text)")
                    }
                }
                .frame(maxWidth: .infinity, minHeight: TaskListDetailMetrics.taskContentHeight, alignment: .leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .alignmentGuide(.taskRowContentCenter) { dimensions in
                dimensions[.bottom] - (TaskListDetailMetrics.taskContentHeight / 2)
            }

            Button {
                openTaskActionSheet(task)
            } label: {
                Image(systemName: task.pinned ? "pin.fill" : "calendar")
                    .font(.system(size: TaskListDetailMetrics.trailingDateIconSize, weight: .medium))
                .foregroundStyle(task.pinned ? Color.primary : Color.secondary)
                .contentTransition(reduceMotion ? .identity : .symbolEffect(.replace))
                .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: task.pinned)
                .frame(width: TaskListDetailMetrics.trailingDateButtonWidth, height: TaskListDetailMetrics.trailingDateButtonHeight)
            }
            .buttonStyle(.plain)
            .alignmentGuide(.taskRowContentCenter) { dimensions in
                dimensions[VerticalAlignment.center]
            }
            .accessibilityLabel(task.pinned ? translations.t("pages.tasklist.unpinTask") : translations.t("pages.tasklist.setDate"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, TaskListDetailMetrics.taskRowVerticalPadding)
        .offset(y: draggingTaskId == task.id ? taskDragOffset : 0)
        .zIndex(draggingTaskId == task.id ? 1 : 0)
        .opacity((draggingTaskId == task.id ? 0.8 : 1.0) * (task.completed ? completedTaskOpacity : 1.0))
        .scaleEffect(draggingTaskId == task.id ? 1.03 : 1.0)
        .animation(draggingTaskId == task.id || reduceMotion ? nil : .easeInOut(duration: 0.2),
                   value: displayTasks.map(\.id))
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: task.completed)
        .transition(reduceMotion ? .identity : .asymmetric(
            insertion: .opacity.combined(with: .move(edge: .top)),
            removal: .opacity
        ))
        .background(GeometryReader { geo in
            Color.clear.preference(
                key: RowFrameKey.self,
                value: [task.id: geo.size.height]
            )
        })
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                ScrollViewAccessor(scrollView: $taskScrollViewRef)
                    .frame(width: 0, height: 0)

                HStack {
                    Text(taskList.name)
                        .font(.system(size: 20, weight: .bold))
                        .padding(.bottom, TaskListDetailMetrics.titleBottomPadding)
                        .accessibilityAddTraits(.isHeader)
                    Spacer()
                    Button { editName = taskList.name; editBackground = taskList.background; removeListError = nil; showEditSheet = true } label: {
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
                            .frame(width: TaskListDetailMetrics.trailingDateButtonWidth, height: TaskListDetailMetrics.headerIconButtonSize)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(translations.t("taskList.shareTitle"))
                }

                VStack(alignment: .leading, spacing: 0) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            TextField(translations.t("pages.tasklist.addTaskPlaceholder"), text: $newTaskText)
                                .focused($isNewTaskFocused)
                                .onSubmit { addTask() }
                                .onChange(of: isNewTaskFocused) { _, _ in
                                    syncHistoryPopover()
                                }
                                .onChange(of: newTaskText) { _, _ in
                                    syncHistoryPopover()
                                }
                                .padding(.horizontal, TaskListDetailMetrics.inputHorizontalPadding)
                                .padding(.vertical, TaskListDetailMetrics.inputVerticalPadding)
                                .background(Color(.systemBackground).opacity(0.92))
                                .clipShape(RoundedRectangle(cornerRadius: TaskListDetailMetrics.inputCornerRadius, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: TaskListDetailMetrics.inputCornerRadius, style: .continuous)
                                        .stroke(Color(.separator).opacity(0.45), lineWidth: TaskListDetailMetrics.inputBorderWidth)
                                )
                                .popover(isPresented: $isHistoryPopoverPresented) {
                                    ScrollView {
                                        VStack(spacing: 0) {
                                            ForEach(historyOptions, id: \.self) { option in
                                                Button {
                                                    newTaskText = option
                                                    isHistoryPopoverPresented = false
                                                    addTask()
                                                } label: {
                                                    HStack {
                                                        Text(option)
                                                            .font(.system(size: 15))
                                                            .foregroundStyle(.primary)
                                                        Spacer()
                                                    }
                                                    .padding(.horizontal, 12)
                                                    .padding(.vertical, 10)
                                                    .contentShape(Rectangle())
                                                }
                                                .buttonStyle(.plain)
                                                if option != historyOptions.last {
                                                    Divider()
                                                }
                                            }
                                        }
                                    }
                                    .frame(minWidth: 280, maxWidth: 420, maxHeight: 220, alignment: .topLeading)
                                    .presentationCompactAdaptation(.popover)
                                }

                            if !newTaskText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                Button { addTask() } label: {
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: TaskListDetailMetrics.addActionIconSize, weight: .semibold))
                                        .foregroundStyle(.primary)
                                        .frame(width: 24, height: 24)
                                }
                                .buttonStyle(.plain)
                                .transition(.scale(scale: 0.6).combined(with: .opacity))
                                .accessibilityLabel(translations.t("a11y.addTask"))
                            }
                        }
                        .animation(reduceMotion ? nil : .spring(response: 0.25, dampingFraction: 0.8),
                                   value: newTaskText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }

                    HStack {
                        Button { handleSortTasks() } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "line.3.horizontal.decrease")
                                    .font(.system(size: TaskListDetailMetrics.actionIconSize, weight: .semibold))
                                Text(translations.t("pages.tasklist.sort"))
                                    .font(.system(size: 15, weight: .semibold))
                            }
                        }
                        .disabled(taskList.tasks.count < 2)
                        Spacer()
                        Button { UINotificationFeedbackGenerator().notificationOccurred(.warning); showDeleteCompletedAlert = true } label: {
                            HStack(spacing: 0) {
                                Text(translations.t("pages.tasklist.deleteCompleted"))
                                    .font(.system(size: 15, weight: .semibold))
                                Image(systemName: "trash")
                                    .font(.system(size: TaskListDetailMetrics.actionIconSize, weight: .semibold))
                                    .frame(width: TaskListDetailMetrics.trailingDateButtonWidth)
                            }
                        }
                        .disabled(taskList.tasks.allSatisfy { !$0.completed })
                    }
                    .foregroundStyle(.secondary)
                    .padding(.top, TaskListDetailMetrics.actionRowTopPadding)
                }

                if displayTasks.isEmpty {
                    Text(translations.t("pages.tasklist.noTasks"))
                        .frame(maxWidth: .infinity, minHeight: 200)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(displayTasks) { task in
                        taskRow(task, displayTasks: displayTasks)
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
        .onChange(of: taskList.tasks) { _, tasks in
            if let pendingDisplayTasks, pendingDisplayTasks == reconciledTasks(tasks) {
                self.pendingDisplayTasks = nil
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .alert(translations.t("pages.tasklist.deleteCompletedConfirmTitle"), isPresented: $showDeleteCompletedAlert) {
            Button(translations.t("auth.button.delete"), role: .destructive) { confirmDeleteCompleted() }
            Button(translations.t("common.cancel"), role: .cancel) {}
        }
        .alert(translations.t("taskList.deleteListConfirm.title"), isPresented: $showDeleteListAlert) {
            Button(removingList ? translations.t("common.deleting") : translations.t("auth.button.delete"), role: .destructive) {
                deleteTaskList()
            }
            .disabled(removingList)
            Button(translations.t("common.cancel"), role: .cancel) {}
        } message: {
            Text(translations.t("taskList.deleteListConfirm.message"))
        }
        .sheet(isPresented: $showEditSheet) {
            editSheet
        }
        .sheet(item: $actionSheetState) { actionState in
            taskActionSheet(actionState)
        }
        .sheet(isPresented: $showShareSheet) {
            shareSheet
        }
    }

    @ViewBuilder
    private var editSheet: some View {
        NavigationStack {
            let colorOptions: [String?] = [nil, "#F87171", "#FBBF24", "#34D399", "#38BDF8", "#818CF8", "#A78BFA"]
            VStack(spacing: 24) {
                TextField(translations.t("app.taskListName"), text: $editName)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal)

                VStack(alignment: .leading, spacing: 8) {
                    Text(translations.t("taskList.selectColor"))
                        .font(AppTypography.subheadline())
                        .foregroundStyle(.secondary)
                        .padding(.horizontal)

                    HStack(spacing: 12) {
                        ForEach(colorOptions.indices, id: \.self) { i in
                            let c = colorOptions[i]
                            let isSelected = editBackground == c
                            colorOptionButton(color: c, isSelected: isSelected) { editBackground = c }
                            .buttonStyle(.plain)
                            .accessibilityLabel(colorLabel(c))
                        }
                    }
                    .padding(.horizontal)
                }

                Spacer()

                if let removeListError {
                    Text(removeListError)
                        .font(AppTypography.subheadline())
                        .foregroundStyle(.red)
                        .padding(.horizontal)
                }

                Button(role: .destructive) {
                    showDeleteListAlert = true
                } label: {
                    Text(removingList ? translations.t("common.deleting") : translations.t("taskList.deleteList"))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(removingList)
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
                            var updates: [String: Any] = ["updatedAt": nowMillis()]
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

    @ViewBuilder
    private func taskActionSheet(_ actionState: ActionSheetState) -> some View {
        if let task = taskList.tasks.first(where: { $0.id == actionState.taskId }) {
            VStack(spacing: 16) {
                Button {
                    togglePinned(task)
                    actionSheetState = nil
                } label: {
                    HStack {
                        Label(
                            translations.t(task.pinned ? "pages.tasklist.unpinTask" : "pages.tasklist.pinTask"),
                            systemImage: task.pinned ? "pin.slash" : "pin"
                        )
                        Spacer()
                        Image(systemName: task.pinned ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(task.pinned ? Color.primary : .secondary)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .padding(.horizontal, 2)
                }
                .buttonStyle(.bordered)
                .padding(.horizontal)
                Button(translations.t("pages.tasklist.clearDate")) {
                    commitDate(task, dateStr: "")
                    actionSheetState = nil
                }
                .foregroundStyle(.red)
                .frame(maxWidth: .infinity, minHeight: 44)
                .buttonStyle(.bordered)
                .padding(.horizontal)
                DatePicker("", selection: Binding(
                    get: { Self.isoFormatter.date(from: task.date) ?? Date() },
                    set: {
                        commitDate(task, dateStr: Self.isoFormatter.string(from: $0))
                        actionSheetState = nil
                    }
                ), displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .padding(.horizontal)
                    .padding(.bottom, 16)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .accessibilityLabel(translations.t("pages.tasklist.setDate"))
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }

    @ViewBuilder
    private var shareSheet: some View {
        NavigationStack {
            VStack(spacing: 16) {
                if let error = shareError {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(AppTypography.subheadline())
                }

                if let code = currentShareCode {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(translations.t("taskList.shareCode"))
                            .font(AppTypography.subheadline())
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
                        .font(AppTypography.subheadline())
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

    private func toggleCompletion(_ task: TaskSummary) {
        logTaskUpdate(fields: "completed")
        performTaskMutation(
            buildNextTasks: { currentTasks in
                currentTasks.map { current in
                    current.id == task.id ? current.updating(completed: !task.completed) : current
                }
            },
            persist: { previousTasks, nextTasks in
                persistTasks(nextTasks, previousTasks: previousTasks)
            }
        )
    }

    private func startEdit(_ task: TaskSummary) {
        editingTaskId = task.id
        editingText = task.text
        isTextFieldFocused = true
    }

    private func commitEdit(_ task: TaskSummary) {
        guard editingTaskId == task.id else { return }
        let trimmed = editingText.trimmingCharacters(in: .whitespaces)
        let resolved = resolveTaskInput(editingText, translations: translations, currentTask: task)
        let textChanged = resolved.text != task.text
        let dateChanged = resolved.date != task.date
        let pinnedChanged = resolved.pinnedFromInput && !task.pinned
        editingTaskId = nil
        guard !(trimmed.isEmpty && !dateChanged), textChanged || dateChanged || pinnedChanged else { return }
        let changedFields = [textChanged ? "text" : nil, dateChanged ? "date" : nil, pinnedChanged ? "pinned" : nil]
            .compactMap { $0 }
            .joined(separator: ",")
        logTaskUpdate(fields: changedFields)
        performTaskMutation(
            buildNextTasks: { currentTasks in
                currentTasks.map { current in
                    current.id == task.id
                        ? current.updating(
                            text: resolved.text,
                            date: resolved.date,
                            pinned: pinnedChanged ? true : nil
                        )
                        : current
                }
            },
            persist: { previousTasks, nextTasks in
                let normalized = normalizedTasks(nextTasks)
                setPendingTasks(normalized)
                var updates = buildTaskUpdateData(previousTasks: previousTasks, tasks: normalized)
                if textChanged {
                    updates["history"] = buildHistory(newText: resolved.text, oldText: task.text)
                }
                updateTaskList(updates)
            }
        )
    }

    private func openTaskActionSheet(_ task: TaskSummary) {
        actionSheetState = ActionSheetState(
            taskId: task.id
        )
    }

    private func commitDate(_ task: TaskSummary, dateStr: String) {
        logTaskUpdate(fields: "date")
        performTaskMutation(
            buildNextTasks: { currentTasks in
                currentTasks.map { current in
                    current.id == task.id ? current.updating(date: dateStr) : current
                }
            },
            persist: { previousTasks, nextTasks in
                persistTasks(nextTasks, previousTasks: previousTasks)
            }
        )
    }

    private func togglePinned(_ task: TaskSummary) {
        logTaskUpdate(fields: "pinned")
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        let nextPinned = !task.pinned
        performTaskMutation(
            buildNextTasks: { currentTasks in
                let updatedTasks = currentTasks.map { current in
                    current.id == task.id ? current.updating(pinned: nextPinned) : current
                }
                if task.pinned && !nextPinned && !task.completed && !autoSort {
                    return [
                        updatedTasks.filter { taskDisplayGroup($0) == 0 },
                        updatedTasks.filter { $0.id == task.id },
                        updatedTasks.filter { taskDisplayGroup($0) == 1 && $0.id != task.id },
                        updatedTasks.filter { taskDisplayGroup($0) == 2 }
                    ].flatMap { $0 }
                }
                return updatedTasks
            },
            persist: { previousTasks, nextTasks in
                persistTasks(nextTasks, previousTasks: previousTasks)
            }
        )
    }

    private func addTask() {
        let trimmed = newTaskText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let parsed = resolveTaskInput(trimmed, translations: translations)
        logTaskAdd(hasDate: !(parsed.date ?? "").isEmpty)
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        newTaskText = ""
        isNewTaskFocused = true
        let taskId = UUID().uuidString
        let tasks = taskList.tasks
        let order: Double = taskInsertPosition == "top"
            ? (tasks.first?.order ?? 1.0) - 1.0
            : (tasks.last?.order ?? 0.0) + 1.0
        let insertedTask = TaskSummary(
            id: taskId,
            text: parsed.text,
            completed: false,
            date: parsed.date ?? "",
            order: order,
            pinned: parsed.pinnedFromInput
        )
        performTaskMutation(
            buildNextTasks: { currentTasks in
                taskInsertPosition == "top"
                    ? [insertedTask] + currentTasks
                    : currentTasks + [insertedTask]
            },
            persist: { previousTasks, nextTasks in
                let normalized = normalizedTasks(nextTasks)
                setPendingTasks(normalized)
                var updates = buildTaskUpdateData(previousTasks: previousTasks, tasks: normalized)
                updates["history"] = buildHistory(newText: parsed.text)
                updateTaskList(updates)
            }
        )
    }

    private func handleSortTasks() {
        logTaskSort()
        let sorted = getAutoSortedTasks(getDisplayOrderedTasks(taskList.tasks))
        setPendingTasks(sorted)
        updateTaskList(buildTaskUpdateData(previousTasks: displayTasks, tasks: sorted))
    }

    private func confirmDeleteCompleted() {
        let completed = taskList.tasks.filter { $0.completed }
        logTaskDeleteCompleted(count: completed.count)
        let remaining = taskList.tasks.filter { !$0.completed }
        persistTasks(remaining, deletedTaskIds: completed.map(\.id), previousTasks: displayTasks)
    }

    private func moveTask(_ task: TaskSummary, by delta: Int) {
        var ordered = displayTasks
        guard let index = ordered.firstIndex(where: { $0.id == task.id }) else { return }
        let target = index + delta
        guard target >= 0 && target < ordered.count else { return }
        ordered.swapAt(index, target)
        persistTaskOrder(ordered.map(\.id))
    }

    private func persistTaskOrder(_ ids: [String]) {
        logTaskReorder()
        let orderedTasks = ids.compactMap { id in displayTasks.first(where: { $0.id == id }) }
        let normalizedTasks = renumberTasks(orderedTasks)
        setPendingTasks(normalizedTasks)
        updateTaskList(buildTaskUpdateData(previousTasks: displayTasks, tasks: normalizedTasks))
    }

    private func generateShareCode(taskListId: String) async throws -> String {
        for _ in 0..<10 {
            let code = try generateRandomShareCode()
            let shareCodeRef = db.collection("shareCodes").document(code)
            let shareCodeSnap = try await shareCodeRef.getDocument()
            if shareCodeSnap.exists { continue }

            let taskListRef = db.collection("taskLists").document(taskListId)
            let taskListSnap = try await taskListRef.getDocument()
            guard taskListSnap.exists else {
                throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Task list not found"])
            }

            let batch = db.batch()
            if let currentCode = taskListSnap.data()?["shareCode"] as? String, !currentCode.isEmpty {
                let normalizedCode = currentCode.trimmingCharacters(in: .whitespaces).uppercased()
                batch.deleteDocument(db.collection("shareCodes").document(normalizedCode))
            }
            batch.setData(["taskListId": taskListId, "createdAt": nowMillis()], forDocument: shareCodeRef)
            batch.updateData(["shareCode": code, "updatedAt": nowMillis()], forDocument: taskListRef)
            try await batch.commit()
            return code
        }
        throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "共有コードの生成に失敗しました"])
    }

    private func removeShareCode(taskListId: String) async throws {
        let taskListRef = db.collection("taskLists").document(taskListId)
        let snap = try await taskListRef.getDocument()
        guard snap.exists else {
            throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Task list not found"])
        }
        guard let currentCode = snap.data()?["shareCode"] as? String, !currentCode.isEmpty else { return }
        let normalizedCode = currentCode.trimmingCharacters(in: .whitespaces).uppercased()
        let batch = db.batch()
        batch.deleteDocument(db.collection("shareCodes").document(normalizedCode))
        batch.updateData(["shareCode": NSNull(), "updatedAt": nowMillis()], forDocument: taskListRef)
        try await batch.commit()
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
    let batch = db.batch()
    let taskListOrderRef = db.collection("taskListOrder").document(uid)
    let taskListRef = db.collection("taskLists").document(taskListId)
    let orderSnap = try await taskListOrderRef.getDocument()
    let orderData = orderSnap.data() ?? [:]
    if orderData[taskListId] != nil {
        return
    }
    let orders = orderData.compactMap { entry -> Double? in
        guard entry.key != "createdAt", entry.key != "updatedAt",
              let val = entry.value as? [String: Any],
              let order = (val["order"] as? NSNumber)?.doubleValue else { return nil }
        return order
    }
    let newOrder = orders.max().map { $0 + 1.0 } ?? 1.0

    let taskListSnap = try await taskListRef.getDocument()
    guard taskListSnap.exists, taskListSnap.data() != nil else {
        throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Task list not found"])
    }
    batch.setData([taskListId: ["order": newOrder], "updatedAt": nowMillis()] as [String: Any],
                  forDocument: taskListOrderRef, merge: true)
    batch.updateData(["memberCount": FieldValue.increment(Int64(1)), "updatedAt": nowMillis()],
                     forDocument: taskListRef)
    try await batch.commit()
}

@MainActor
private final class SharedTaskListPreviewViewModel: ObservableObject {
    @Published private(set) var taskList: TaskListDetail?
    @Published private(set) var isLoading = false
    @Published private(set) var isJoining = false
    @Published private(set) var isAdded = false
    @Published private(set) var errorMessage: String?

    private let db = Firestore.firestore()
    private var taskListListener: ListenerRegistration?
    private var orderListener: ListenerRegistration?
    private var currentTaskListId: String?

    func bind(shareCode: String, uid: String?, translations: Translations) {
        let normalizedCode = shareCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !normalizedCode.isEmpty else {
            taskList = nil
            errorMessage = translations.t("pages.sharecode.notFound")
            isLoading = false
            isAdded = false
            return
        }

        isLoading = true
        errorMessage = nil
        updateOrderSubscription(uid: uid, taskListId: currentTaskListId)

        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                guard let taskListId = try await fetchTaskListIdByShareCode(normalizedCode) else {
                    self.resetTaskListListener()
                    self.currentTaskListId = nil
                    self.taskList = nil
                    self.isAdded = false
                    self.errorMessage = translations.t("pages.sharecode.notFound")
                    self.isLoading = false
                    self.updateOrderSubscription(uid: uid, taskListId: nil)
                    return
                }

                self.subscribeToTaskList(taskListId: taskListId, translations: translations)
                self.updateOrderSubscription(uid: uid, taskListId: taskListId)
                logShare()
            } catch {
                self.resetTaskListListener()
                self.currentTaskListId = nil
                self.taskList = nil
                self.isAdded = false
                self.errorMessage = translations.t("pages.sharecode.error")
                self.isLoading = false
                self.updateOrderSubscription(uid: uid, taskListId: nil)
            }
        }
    }

    func reset() {
        resetTaskListListener()
        resetOrderListener()
        currentTaskListId = nil
        taskList = nil
        isLoading = false
        isJoining = false
        isAdded = false
        errorMessage = nil
    }

    func joinCurrentTaskList() async throws -> String {
        guard let taskListId = currentTaskListId else {
            throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Task list not found"])
        }

        await MainActor.run {
            isJoining = true
            errorMessage = nil
        }

        do {
            try await addSharedTaskListToOrder(taskListId: taskListId)
            await MainActor.run {
                isAdded = true
                isJoining = false
            }
            logShareCodeJoin()
            return taskListId
        } catch {
            await MainActor.run {
                isJoining = false
            }
            throw error
        }
    }

    private func subscribeToTaskList(taskListId: String, translations: Translations) {
        guard currentTaskListId != taskListId else {
            return
        }

        resetTaskListListener()
        currentTaskListId = taskListId
        taskListListener = db.collection("taskLists").document(taskListId).addSnapshotListener { [weak self] snapshot, error in
            guard let self else { return }

            Task { @MainActor in
                if error != nil {
                    self.taskList = nil
                    self.errorMessage = translations.t("pages.sharecode.error")
                    self.isLoading = false
                    return
                }

                guard let data = snapshot?.data() else {
                    self.taskList = nil
                    self.errorMessage = translations.t("pages.sharecode.notFound")
                    self.isLoading = false
                    return
                }

                self.taskList = mapTaskListDetail(id: taskListId, data: data)
                self.errorMessage = nil
                self.isLoading = false
            }
        }
    }

    private func updateOrderSubscription(uid: String?, taskListId: String?) {
        resetOrderListener()

        guard let uid, let taskListId else {
            isAdded = false
            return
        }

        orderListener = db.collection("taskListOrder").document(uid).addSnapshotListener { [weak self] snapshot, _ in
            guard let self else { return }
            Task { @MainActor in
                self.isAdded = orderedTaskListIds(from: snapshot?.data()).contains(taskListId)
            }
        }
    }

    private func resetTaskListListener() {
        taskListListener?.remove()
        taskListListener = nil
    }

    private func resetOrderListener() {
        orderListener?.remove()
        orderListener = nil
    }
}

private struct SharedTaskListPreviewView: View {
    @EnvironmentObject var translations: Translations
    let shareCode: String
    let currentUserId: String?
    let onDismiss: () -> Void
    let onAdded: (String) -> Void

    @StateObject private var viewModel = SharedTaskListPreviewViewModel()
    @StateObject private var settingsViewModel = SettingsViewModel()
    @State private var addToOrderError: String?

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading {
                VStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
            } else if let taskList = viewModel.taskList {
                TaskListDetailPage(
                    taskList: taskList,
                    taskInsertPosition: settingsViewModel.settings?.taskInsertPosition ?? "top",
                    autoSort: settingsViewModel.settings?.autoSort ?? false
                )
            } else {
                VStack {
                    Spacer()
                    Text(viewModel.errorMessage ?? translations.t("pages.sharecode.error"))
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                    Spacer()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(resolveTaskListBackgroundColor(viewModel.taskList?.background).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .safeAreaInset(edge: .top, spacing: 0) {
            HStack(spacing: 12) {
                Button(action: onDismiss) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: AppIconMetrics.navigationIconSize, weight: .semibold))
                        .foregroundStyle(.primary)
                        .frame(width: 32, height: 32)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(translations.t("common.back"))

                Spacer()

                if currentUserId != nil, !viewModel.isAdded, viewModel.taskList != nil {
                    Button(viewModel.isJoining ? translations.t("common.loading") : translations.t("pages.sharecode.addToOrder")) {
                        Task {
                            do {
                                addToOrderError = nil
                                let taskListId = try await viewModel.joinCurrentTaskList()
                                onAdded(taskListId)
                            } catch {
                                addToOrderError = translations.t("pages.sharecode.addToOrderError")
                            }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(viewModel.isJoining)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(.systemBackground).opacity(0.92))
        }
        .overlay(alignment: .top) {
            if let addToOrderError {
                Text(addToOrderError)
                    .foregroundStyle(.red)
                    .font(AppTypography.subheadline())
                    .padding(.top, 72)
                    .padding(.horizontal, 16)
            }
        }
        .onAppear {
            settingsViewModel.bind(uid: currentUserId)
            viewModel.bind(shareCode: shareCode, uid: currentUserId, translations: translations)
        }
        .onChange(of: currentUserId) { _, nextUid in
            settingsViewModel.bind(uid: nextUid)
            viewModel.bind(shareCode: shareCode, uid: nextUid, translations: translations)
        }
        .onDisappear {
            settingsViewModel.reset()
            viewModel.reset()
        }
        .onChange(of: translations.language) { _, _ in
            viewModel.bind(shareCode: shareCode, uid: currentUserId, translations: translations)
        }
    }
}

private final class SettingsViewModel: ObservableObject {
    struct Settings {
        var theme: String = "system"
        var language: String = "ja"
        var taskInsertPosition: String = "top"
        var autoSort: Bool = false
    }

    @Published var settings: Settings? = nil
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
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, error == nil else { return }
                let data = snapshot?.data() ?? [:]
                self.settings = Settings(
                    theme: data["theme"] as? String ?? "system",
                    language: data["language"] as? String ?? "ja",
                    taskInsertPosition: data["taskInsertPosition"] as? String ?? "top",
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
        data["updatedAt"] = nowMillis()
        db.collection("settings").document(uid).setData(data, merge: true)
    }

    func signOut() throws {
        try Auth.auth().signOut()
    }

    func deleteAccount(onSuccess: @escaping () -> Void, onError: @escaping (String) -> Void) {
        guard let user = Auth.auth().currentUser else { return }
        let uid = user.uid
        Task { @MainActor [db] in
            do {
                let orderSnapshot = try await db.collection("taskListOrder").document(uid).getDocument()
                let taskListIds = (orderSnapshot.data() ?? [:]).keys
                    .filter { $0 != "createdAt" && $0 != "updatedAt" }
                for taskListId in taskListIds {
                    let taskListRef = db.collection("taskLists").document(taskListId)
                    let taskListSnapshot = try await taskListRef.getDocument()
                    guard taskListSnapshot.exists else { continue }
                    let memberCount = (taskListSnapshot.data()?["memberCount"] as? NSNumber)?.intValue ?? 1
                    if memberCount <= 1 {
                        let batch = db.batch()
                        if let shareCode = taskListSnapshot.data()?["shareCode"] as? String,
                           !shareCode.isEmpty {
                            let normalizedCode = shareCode.trimmingCharacters(in: .whitespaces).uppercased()
                            batch.deleteDocument(db.collection("shareCodes").document(normalizedCode))
                        }
                        batch.deleteDocument(taskListRef)
                        try await batch.commit()
                    } else {
                        try await taskListRef.updateData([
                            "memberCount": FieldValue.increment(Int64(-1)),
                            "updatedAt": nowMillis(),
                        ])
                    }
                }
                let batch = db.batch()
                batch.deleteDocument(db.collection("settings").document(uid))
                batch.deleteDocument(db.collection("taskListOrder").document(uid))
                try await batch.commit()
                try await user.delete()
                onSuccess()
            } catch {
                onError(error.localizedDescription)
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
    let currentUserId: String?
    @StateObject private var viewModel = SettingsViewModel()
    @State private var showSignOutAlert = false
    @State private var showDeleteAlert = false
    @State private var showThemePicker = false
    @State private var showLanguagePicker = false
    @State private var showPositionPicker = false
    @State private var showEmailChangeForm = false
    @State private var showLicensesSheet = false
    @State private var newEmail = ""
    @State private var emailChangeError: String? = nil
    @State private var emailChangeSuccess = false
    @State private var isChangingEmail = false
    @State private var errorMessage: String? = nil
    @State private var isDeletingAccount = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let settings = viewModel.settings {
                    settingsCard(title: translations.t("settings.preferences.title")) {
                        settingsRow(label: translations.t("settings.language.title"), value: displayName(for: settings.language)) {
                            showLanguagePicker = true
                        }
                        Divider()
                        settingsRow(label: translations.t("settings.theme.title"), value: themeLabel(for: settings.theme)) {
                            showThemePicker = true
                        }
                        Divider()
                        settingsRow(label: translations.t("settings.taskInsertPosition.title"), value: taskInsertPositionLabel(for: settings.taskInsertPosition)) {
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
                    settingsCard(title: translations.t("settings.legal.title")) {
                        settingsRow(label: translations.t("settings.licenses.openSource"), value: "") {
                            showLicensesSheet = true
                        }
                    }
                    settingsCard(title: translations.t("settings.actions.title")) {
                        Button(translations.t("auth.button.signOut")) {
                            showSignOutAlert = true
                        }
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
                            .font(AppTypography.caption())
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
            viewModel.bind(uid: currentUserId)
        }
        .onChange(of: currentUserId) { _, nextUid in
            viewModel.bind(uid: nextUid)
        }
        .onDisappear {
            viewModel.reset()
        }
        .alert(translations.t("auth.button.signOut"), isPresented: $showSignOutAlert) {
            Button(translations.t("common.cancel"), role: .cancel) {}
            Button(translations.t("auth.button.signOut"), role: .destructive) {
                try? viewModel.signOut()
                logSignOut()
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
        .sheet(isPresented: $showLicensesSheet) {
            licensesSheet
        }
    }

    private func displayName(for code: String) -> String {
        supportedLanguages.first { $0.code == code }?.name ?? code
    }

    private func themeLabel(for theme: String) -> String {
        switch theme {
        case "light": return translations.t("settings.theme.light")
        case "dark": return translations.t("settings.theme.dark")
        default: return translations.t("settings.theme.system")
        }
    }

    private func taskInsertPositionLabel(for position: String) -> String {
        position == "bottom"
            ? translations.t("settings.taskInsertPosition.bottom")
            : translations.t("settings.taskInsertPosition.top")
    }

    private func settingsCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(AppTypography.captionSemibold())
                .foregroundStyle(.secondary)
                .padding(.horizontal, 4)
                .padding(.bottom, 6)
                .accessibilityAddTraits(.isHeader)
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
                    .font(.system(size: AppIconMetrics.inlineActionIconSize, weight: .semibold))
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
                                        .font(.system(size: AppIconMetrics.inlineActionIconSize, weight: .semibold))
                                        .foregroundStyle(Color.primary)
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
                    Text(error).foregroundStyle(.red).font(AppTypography.caption())
                }
                if emailChangeSuccess {
                    Text(translations.t("settings.emailChange.successMessage")).foregroundStyle(.green).font(AppTypography.caption())
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

    @ViewBuilder
    private var licensesSheet: some View {
        NavigationStack {
            LicensesView()
                .environmentObject(translations)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(translations.t("common.close")) { showLicensesSheet = false }
                    }
                }
        }
    }
}

private struct LicensesView: View {
    @EnvironmentObject var translations: Translations
    private let generatedLicenses = loadGeneratedLicenses()
    private let manualLicenses = loadManualLicenses()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if generatedLicenses.isEmpty {
                    Text(translations.t("settings.licenses.loadError"))
                        .foregroundStyle(.red)
                        .font(AppTypography.caption())
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(translations.t("settings.licenses.openSource"))
                            .font(AppTypography.captionSemibold())
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 4)

                        ForEach(generatedLicenses) { license in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(license.title)
                                    .font(AppTypography.bodyMedium())
                                    .foregroundStyle(.primary)
                                Text(license.text)
                                    .font(AppTypography.caption())
                                    .foregroundStyle(.primary)
                                    .textSelection(.enabled)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(16)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text(translations.t("settings.licenses.bundledAssets"))
                        .font(AppTypography.captionSemibold())
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 4)

                    ForEach(manualLicenses) { license in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(license.name)
                                .font(AppTypography.bodyMedium())
                                .foregroundStyle(.primary)
                            Text(license.license)
                                .font(AppTypography.caption())
                                .foregroundStyle(.secondary)
                            if let source = license.source,
                               let url = URL(string: source) {
                                Link(source, destination: url)
                                    .font(AppTypography.caption())
                            }
                            Text(license.text)
                                .font(AppTypography.caption())
                                .foregroundStyle(.primary)
                                .textSelection(.enabled)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                }
            }
            .frame(maxWidth: 768)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .padding(.vertical, 24)
        }
        .navigationTitle(translations.t("settings.licenses.title"))
        .navigationBarTitleDisplayMode(.inline)
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
    @EnvironmentObject var translations: Translations
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
                    .font(AppTypography.subheadline())
                    .foregroundStyle(isSelected ? Color(.systemBackground) : Color.primary)
                    .frame(width: 44, height: 44)
                    .background(
                        Group {
                            if isSelected {
                                Circle().fill(Color.primary)
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
        .accessibilityLabel(dayAccessibilityLabel)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private var dayAccessibilityLabel: String {
        var parts = ["\(Self.cal.component(.day, from: day))"]
        if isToday { parts.append(translations.t("a11y.today")) }
        if !dots.isEmpty { parts.append(translations.t("a11y.hasTasks")) }
        return parts.joined(separator: ", ")
    }
}

private struct CalendarTaskRow: View {
    @EnvironmentObject var translations: Translations
    let task: CalendarTask
    let isHighlighted: Bool

    private var dateLabel: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: localeIdentifier(for: translations.language))
        formatter.setLocalizedDateFormatFromTemplate("MMMEd")
        return formatter.string(from: task.dateValue)
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 8) {
                Text(dateLabel)
                    .font(AppTypography.caption())
                    .foregroundStyle(.secondary)
                    .frame(width: 80, alignment: .leading)

                HStack(spacing: 4) {
                    Circle()
                        .fill(task.taskListBackground.flatMap { Color(hex: $0) } ?? Color(.separator))
                        .frame(width: AppIconMetrics.calendarTaskColorDotSize, height: AppIconMetrics.calendarTaskColorDotSize)
                    Text(task.taskListName)
                        .font(AppTypography.caption())
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                .frame(width: 90, alignment: .leading)

                Text(task.text)
                    .font(AppTypography.body())
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

private struct CalendarScreenView: View {
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let currentUserId: String?
    @StateObject private var viewModel = CalendarViewModel()

    private var calendarTasks: [CalendarTask] { viewModel.calendarTasks }

    @State private var displayedMonth: Date = {
        let cal = Calendar.current
        return cal.date(from: cal.dateComponents([.year, .month], from: Date()))!
    }()
    @State private var selectedDate: Date?

    private static let cal = Calendar.current

    private var currentMonthKey: String {
        let c = Self.cal.dateComponents([.year, .month], from: displayedMonth)
        guard let year = c.year, let month = c.month else { return "" }
        return String(format: "%04d-%02d", year, month)
    }

    private var locale: Locale {
        Locale(identifier: localeIdentifier(for: translations.language))
    }

    private var weekdaySymbols: [String] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = locale
        return calendar.shortStandaloneWeekdaySymbols
    }

    private var monthTitle: String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.setLocalizedDateFormatFromTemplate("yMMMM")
        return formatter.string(from: displayedMonth)
    }

    private var visibleTasks: [CalendarTask] {
        guard let selectedDate else {
            return tasksInMonth
        }
        let key = dateKey(selectedDate)
        return tasksInMonth.filter { $0.date == key }
    }

    private var tasksInMonth: [CalendarTask] {
        calendarTasks.filter { $0.date.hasPrefix(currentMonthKey) }
    }

    private var dotColorsByDate: [String: [Color]] {
        var result: [String: [Color]] = [:]
        for task in tasksInMonth {
            var colors = result[task.date] ?? []
            let color = task.taskListBackground.flatMap { Color(hex: $0) } ?? Color(.separator)
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
        calendarContent
            .onAppear { viewModel.bind(uid: currentUserId) }
            .onChange(of: currentUserId) { _, nextUid in
                viewModel.bind(uid: nextUid)
            }
    }

    private var calendarContent: some View {
        VStack(spacing: 0) {
            HStack {
                Button { shiftMonth(by: -1) } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: AppIconMetrics.inlineActionIconSize, weight: .semibold))
                        .padding(8)
                }
                .accessibilityLabel(translations.t("app.calendarPreviousMonth"))
                Spacer()
                Text(monthTitle)
                    .font(AppTypography.headline())
                Spacer()
                Button { shiftMonth(by: 1) } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: AppIconMetrics.inlineActionIconSize, weight: .semibold))
                        .padding(8)
                }
                .accessibilityLabel(translations.t("app.calendarNextMonth"))
            }
            .padding(.horizontal, 8)
            .padding(.top, 8)

            let columns = Array(repeating: GridItem(.flexible()), count: 7)
            let days = makeDays()

            VStack(spacing: 4) {
                LazyVGrid(columns: columns, spacing: 0) {
                    ForEach(weekdaySymbols, id: \.self) { d in
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
                VStack {
                    Spacer()
                    Text(translations.t("app.calendarNoDatedTasks"))
                        .foregroundStyle(.secondary)
                        .font(AppTypography.subheadline())
                    Spacer()
                }
            } else if visibleTasks.isEmpty {
                VStack {
                    Spacer()
                    Text(translations.t("app.calendarNoTasksOnSelectedDate"))
                        .foregroundStyle(.secondary)
                        .font(AppTypography.subheadline())
                    Spacer()
                }
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(visibleTasks) { task in
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
                        if let first = visibleTasks.first(where: { $0.date == key }) {
                            withAnimation(reduceMotion ? .none : .default) {
                                proxy.scrollTo(first.id, anchor: UnitPoint.top)
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

private final class LightlistAppCheckProviderFactory: NSObject, AppCheckProviderFactory {
    func createProvider(with app: FirebaseApp) -> AppCheckProvider? {
        AppAttestProvider(app: app)
    }
}

@main
struct LightlistApp: App {
    @State private var pendingDeepLink: PendingDeepLink?

    init() {
        #if DEBUG
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        #else
        AppCheck.setAppCheckProviderFactory(LightlistAppCheckProviderFactory())
        #endif
        FirebaseApp.configure()
        _ = Auth.auth().addStateDidChangeListener { _, user in
            Crashlytics.crashlytics().setUserID(user?.uid ?? "")
        }
        NSSetUncaughtExceptionHandler { exception in
            logException(description: "\(exception.name.rawValue): \(exception.reason ?? "")", fatal: true)
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView(pendingDeepLink: $pendingDeepLink)
                .onOpenURL { url in
                    pendingDeepLink = parseDeepLink(url)
                }
        }
    }
}
