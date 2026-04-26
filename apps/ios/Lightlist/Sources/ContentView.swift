import SwiftUI
import Foundation
import FirebaseAppCheck
import FirebaseAuth
import FirebaseAnalytics
import FirebaseCore
import FirebaseCrashlytics
import FirebaseFirestore

enum PendingDeepLink: Equatable {
    case passwordReset(code: String)
    case shareCode(String)
}

private final class LightlistAppCheckProviderFactory: NSObject, AppCheckProviderFactory {
    func createProvider(with app: FirebaseApp) -> AppCheckProvider? {
        #if targetEnvironment(simulator)
        return AppCheckDebugProvider(app: app)
        #elseif DEBUG
        return AppCheckDebugProvider(app: app)
        #else
        if #available(iOS 14.0, *), !ProcessInfo.processInfo.isiOSAppOnMac {
            return AppAttestProvider(app: app)
        }
        return DeviceCheckProvider(app: app)
        #endif
    }
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

@MainActor
final class Translations: ObservableObject {
    @Published private(set) var language: String = "ja"
    private var dict: [String: Any] = [:]

    private static let supported = ["ja","en","es","de","fr","ko","zh-CN","hi","ar","pt-BR","id"]

    func load(language: String) {
        let lang = Self.supported.contains(language) ? language : "ja"
        guard let url = Bundle.main.url(forResource: "locales", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let locale = json[lang] as? [String: Any]
        else {
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
    let pinned: Bool
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

                    snapshot?.documentChanges.forEach { change in
                        let taskListId = change.document.documentID
                        if change.type == .removed {
                            self.taskListsById.removeValue(forKey: taskListId)
                            return
                        }
                        self.taskListsById[taskListId] = self.mapper(
                            taskListId,
                            change.document.data()
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
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
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

private func taskRelativePatterns(language: String) -> [TaskDatePattern] {
    switch normalizeLanguageCode(language) {
    case "en":
        return [
            .init(pattern: #"^today\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^tomorrow\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^day after tomorrow\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^in\s+(\d+)\s+days?\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(\d+)\s+days?\s+later\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(mon|tue|wed|thu|fri|sat|sun)(?:day)?\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in
                let map = ["sun": 1, "mon": 2, "tue": 3, "wed": 4, "thu": 5, "fri": 6, "sat": 7]
                guard let target = map[groups[1].lowercased()] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    case "es":
        return [
            .init(pattern: #"^hoy\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^mañana\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^pasado\s+mañana\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^(?:en|dentro\s+de)\s+(\d+)\s+d[ií]as?\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[áa]bado|domingo|lun|mar|mi[eé]|jue|vie|s[áa]b|dom)\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in
                let map = ["domingo": 1, "dom": 1, "lunes": 2, "lun": 2, "martes": 3, "mar": 3, "miércoles": 4, "miercoles": 4, "mié": 4, "mie": 4, "jueves": 5, "jue": 5, "viernes": 6, "vie": 6, "sábado": 7, "sabado": 7, "sáb": 7, "sab": 7]
                guard let target = map[groups[1].lowercased()] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    case "de":
        return [
            .init(pattern: #"^heute\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^morgen\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^übermorgen\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^in\s+(\d+)\s+tagen?\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so)\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in
                let map = ["sonntag": 1, "so": 1, "montag": 2, "mo": 2, "dienstag": 3, "di": 3, "mittwoch": 4, "mi": 4, "donnerstag": 5, "do": 5, "freitag": 6, "fr": 6, "samstag": 7, "sa": 7]
                guard let target = map[groups[1].lowercased()] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    case "fr":
        return [
            .init(pattern: #"^aujourd(?:'|’)hui\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^demain\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^apr[eè]s[- ]demain\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^dans\s+(\d+)\s+jours?\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim)\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in
                let map = ["dimanche": 1, "dim": 1, "lundi": 2, "lun": 2, "mardi": 3, "mar": 3, "mercredi": 4, "mer": 4, "jeudi": 5, "jeu": 5, "vendredi": 6, "ven": 6, "samedi": 7, "sam": 7]
                guard let target = map[groups[1].lowercased()] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    case "ko":
        return [
            .init(pattern: #"^오늘\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^내일\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^모레\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^(\d+)\s*일\s*후\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(월요일|화요일|수요일|목요일|금요일|토요일|일요일|월|화|수|목|금|토|일)\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in
                let map = ["일요일": 1, "일": 1, "월요일": 2, "월": 2, "화요일": 3, "화": 3, "수요일": 4, "수": 4, "목요일": 5, "목": 5, "금요일": 6, "금": 6, "토요일": 7, "토": 7]
                guard let target = map[groups[1]] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    case "zh-CN":
        return [
            .init(pattern: #"^今天\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^明天\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^后天\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^(\d+)\s*天后\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(星期[一二三四五六日天]|周[一二三四五六日天])\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in
                let map = ["星期日": 1, "星期天": 1, "周日": 1, "周天": 1, "星期一": 2, "周一": 2, "星期二": 3, "周二": 3, "星期三": 4, "周三": 4, "星期四": 5, "周四": 5, "星期五": 6, "周五": 6, "星期六": 7, "周六": 7]
                guard let target = map[groups[1]] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    case "hi":
        return [
            .init(pattern: #"^आज\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^कल\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^परसों\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^(\d+)\s*दिन\s*बाद\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार)\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in
                let map = ["रविवार": 1, "सोमवार": 2, "मंगलवार": 3, "बुधवार": 4, "गुरुवार": 5, "शुक्रवार": 6, "शनिवार": 7]
                guard let target = map[groups[1]] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    case "ar":
        return [
            .init(pattern: #"^اليوم\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^غد(?:ا|ًا)?\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^بعد\s+غد\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^بعد\s+(\d+)\s+أيام?\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(الاثنين|الإثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد)\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in
                let map = ["الأحد": 1, "الاثنين": 2, "الإثنين": 2, "الثلاثاء": 3, "الأربعاء": 4, "الخميس": 5, "الجمعة": 6, "السبت": 7]
                guard let target = map[groups[1]] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    case "pt-BR":
        return [
            .init(pattern: #"^hoje\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^amanh[ãa]\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^depois\s+de\s+amanh[ãa]\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^em\s+(\d+)\s+dias?\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo|seg|ter|qua|qui|sex|s[áa]b|dom)\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in
                let map = ["domingo": 1, "dom": 1, "segunda": 2, "segunda-feira": 2, "seg": 2, "terça": 3, "terca": 3, "terça-feira": 3, "terca-feira": 3, "ter": 3, "quarta": 4, "quarta-feira": 4, "qua": 4, "quinta": 5, "quinta-feira": 5, "qui": 5, "sexta": 6, "sexta-feira": 6, "sex": 6, "sábado": 7, "sabado": 7, "sáb": 7, "sab": 7]
                guard let target = map[groups[1].lowercased()] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    case "id":
        return [
            .init(pattern: #"^hari\s+ini\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^besok\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^lusa\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^dalam\s+(\d+)\s+hari\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\#(taskDateSpaceOrEndPattern)"#, options: [.caseInsensitive]) { groups in
                let map = ["minggu": 1, "senin": 2, "selasa": 3, "rabu": 4, "kamis": 5, "jumat": 6, "jum'at": 6, "sabtu": 7]
                guard let target = map[groups[1].lowercased()] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    default:
        return [
            .init(pattern: #"^今日\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(0) },
            .init(pattern: #"^明日\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(1) },
            .init(pattern: #"^明後日\#(taskDateSpaceOrEndPattern)"#, options: []) { _ in makeTaskOffsetDate(2) },
            .init(pattern: #"^(\d+)日後(?:に)?\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in Int(groups[1]).flatMap(makeTaskOffsetDate) },
            .init(pattern: #"^([月火水木金土日])曜?\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in
                let map = ["日": 1, "月": 2, "火": 3, "水": 4, "木": 5, "金": 6, "土": 7]
                guard let target = map[groups[1]] else { return nil }
                let current = Calendar.current.component(.weekday, from: Date())
                return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target, currentDay: current))
            },
        ]
    }
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

private func localizedPinPrefixes(language: String) -> [String] {
    let localized: [String]
    switch normalizeLanguageCode(language) {
    case "en":
        localized = ["pin", "pinned"]
    case "es":
        localized = ["fijar"]
    case "de":
        localized = ["anheften"]
    case "fr":
        localized = ["epingler", "épingler"]
    case "ko":
        localized = ["고정"]
    case "zh-CN":
        localized = ["置顶"]
    case "hi":
        localized = ["पिन"]
    case "ar":
        localized = ["تثبيت"]
    case "pt-BR":
        localized = ["fixar"]
    case "id":
        localized = ["sematkan"]
    default:
        localized = ["ピン"]
    }
    return Array(Set(["pin", "pinned"] + localized)).sorted { $0.count > $1.count }
}

private func parsePinPrefix(_ text: String, language: String) -> (text: String, pinnedFromInput: Bool) {
    let source = text.trimmingCharacters(in: .whitespacesAndNewlines)
    if source.isEmpty {
        return (source, false)
    }

    for token in localizedPinPrefixes(language: language) {
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

private func parseDateFromTaskInput(_ text: String, language: String) -> (text: String, date: String?) {
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

    var relativePatternSets = [taskRelativePatterns(language: language)]
    if normalizeLanguageCode(language) != "en" {
        relativePatternSets.append(taskRelativePatterns(language: "en"))
    }

    for patterns in relativePatternSets {
        if let resolved = resolveTaskDate(from: normalized, patterns: patterns) {
            let stripped = (source as NSString).substring(from: resolved.matchedLength).trimmingCharacters(in: .whitespacesAndNewlines)
            return (stripped, formatTaskInputDate(resolved.date))
        }
    }

    return (source, nil)
}

private func resolveTaskInput(_ text: String, language: String, currentTask: TaskSummary? = nil) -> ParsedTaskInput {
    var remaining = text.trimmingCharacters(in: .whitespacesAndNewlines)
    var parsedDate: String?
    var pinnedFromInput = false
    var parsedPin = false
    var parsedDateValue = false

    for _ in 0..<2 {
        if !parsedPin {
            let pinParsed = parsePinPrefix(remaining, language: language)
            if pinParsed.pinnedFromInput {
                remaining = pinParsed.text
                pinnedFromInput = true
                parsedPin = true
                continue
            }
        }
        if !parsedDateValue {
            let dateParsed = parseDateFromTaskInput(remaining, language: language)
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
            TaskListsView(path: $path, pendingShareCode: $pendingShareCode)
                .navigationDestination(for: AppRoute.self) { route in
                    switch route {
                    case .taskLists:
                        TaskListsView(path: $path, pendingShareCode: $pendingShareCode)
                    case .taskList(let taskListId):
                        TaskListDetailPagerView(initialTaskListId: taskListId)
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
                    RegularTaskListDetailPagerView(selectedTaskListId: $selectedTaskListId)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
        }
    }

    private func startListening() {
        authHandle = Auth.auth().addStateDidChangeListener { _, user in
            Task { @MainActor in
                settingsListener?.remove()
                guard let uid = user?.uid else {
                    theme = "system"
                    Task { translations.load(language: "ja") }
                    return
                }
                settingsListener = Firestore.firestore()
                    .collection("settings").document(uid)
                    .addSnapshotListener { snapshot, _ in
                        Task { @MainActor in
                            theme = snapshot?.data()?["theme"] as? String ?? "system"
                            let language = snapshot?.data()?["language"] as? String ?? "ja"
                            Task { translations.load(language: language) }
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
    static let dragHandleDotSize: CGFloat = 4.5
    static let dragHandleDotSpacing: CGFloat = 3
    static let listColorDotSize: CGFloat = 16
    static let calendarTaskColorDotSize: CGFloat = 10
}

private enum TaskListDetailMetrics {
    static let headerIconButtonSize: CGFloat = 28
    static let headerIconSize: CGFloat = AppIconMetrics.compactActionIconSize
    static let headerActionSpacing: CGFloat = 10
    static let inputCornerRadius: CGFloat = 14
    static let inputHorizontalPadding: CGFloat = 14
    static let inputVerticalPadding: CGFloat = 10
    static let inputBorderWidth: CGFloat = 1
    static let actionRowTopPadding: CGFloat = 2
    static let actionIconSize: CGFloat = AppIconMetrics.inlineActionIconSize
    static let addActionIconSize: CGFloat = AppIconMetrics.compactActionIconSize
    static let taskRowSpacing: CGFloat = 8
    static let taskRowVerticalPadding: CGFloat = 8
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
                        .font(.subheadline.weight(.medium))
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
        Auth.auth().signIn(withEmail: trimmedEmail, password: password) { result, error in
            Task { @MainActor in
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
            HStack(spacing: AppIconMetrics.dragHandleDotSpacing) {
                Circle().frame(width: AppIconMetrics.dragHandleDotSize, height: AppIconMetrics.dragHandleDotSize)
                Circle().frame(width: AppIconMetrics.dragHandleDotSize, height: AppIconMetrics.dragHandleDotSize)
            }
            HStack(spacing: AppIconMetrics.dragHandleDotSpacing) {
                Circle().frame(width: AppIconMetrics.dragHandleDotSize, height: AppIconMetrics.dragHandleDotSize)
                Circle().frame(width: AppIconMetrics.dragHandleDotSize, height: AppIconMetrics.dragHandleDotSize)
            }
            HStack(spacing: AppIconMetrics.dragHandleDotSpacing) {
                Circle().frame(width: AppIconMetrics.dragHandleDotSize, height: AppIconMetrics.dragHandleDotSize)
                Circle().frame(width: AppIconMetrics.dragHandleDotSize, height: AppIconMetrics.dragHandleDotSize)
            }
        }
    }
}

private struct TaskListsView: View {
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isLoggedIn = Auth.auth().currentUser != nil
    @State private var authStateHandle: AuthStateDidChangeListenerHandle?
    @StateObject private var viewModel = OrderedTaskListViewModel<TaskListSummary>(mapper: mapTaskListSummary)
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
                    showCalendarSheet = true
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "calendar")
                            .font(.system(size: AppIconMetrics.inlineActionIconSize, weight: .medium))
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
                                        .frame(width: AppIconMetrics.listColorDotSize, height: AppIconMetrics.listColorDotSize)
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
                Task { @MainActor in
                    isLoggedIn = user != nil
                    viewModel.bind(uid: user?.uid)
                    calendarViewModel.bind(uid: user?.uid)
                }
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

private struct TaskListDetailPagerView: View {
    @EnvironmentObject var translations: Translations
    let initialTaskListId: String
    @Environment(\.dismiss) private var dismiss
    @State private var authStateHandle: AuthStateDidChangeListenerHandle?
    @State private var selectedTaskListId: String
    @StateObject private var viewModel = OrderedTaskListViewModel<TaskListDetail>(mapper: mapTaskListDetail)
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
                Task { @MainActor in
                    viewModel.bind(uid: user?.uid)
                    settingsViewModel.bind(uid: user?.uid)
                }
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

private struct RegularTaskListDetailPagerView: View {
    @EnvironmentObject var translations: Translations
    @Binding var selectedTaskListId: String?
    @State private var authStateHandle: AuthStateDidChangeListenerHandle?
    @StateObject private var viewModel = OrderedTaskListViewModel<TaskListDetail>(mapper: mapTaskListDetail)
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
                Task { @MainActor in
                    viewModel.bind(uid: user?.uid)
                    settingsViewModel.bind(uid: user?.uid)
                }
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
    private let completedTaskOpacity = 0.64
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
        dragOrderedTasks ?? getDisplayOrderedTasks(taskList.tasks)
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

    private func formatDateDisplay(_ dateStr: String) -> String {
        guard let date = Self.isoFormatter.date(from: dateStr) else { return dateStr }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: localeIdentifier(for: translations.language))
        formatter.setLocalizedDateFormatFromTemplate("MMMEd")
        return formatter.string(from: date)
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
                TaskSummary(
                    id: task.id,
                    text: task.text,
                    completed: task.completed,
                    date: task.date,
                    order: Double(index + 1),
                    pinned: task.pinned
                )
            }
    }

    private func renumberTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
        tasks.enumerated().map { index, task in
            TaskSummary(
                id: task.id,
                text: task.text,
                completed: task.completed,
                date: task.date,
                order: Double(index + 1),
                pinned: task.pinned
            )
        }
    }

    private func buildTaskUpdateData(_ tasks: [TaskSummary], deletedTaskIds: [String] = []) -> [String: Any] {
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
            updates["tasks.\(task.id).pinned"] = task.pinned
        }
        return updates
    }

    private func normalizedTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
        autoSort ? getAutoSortedTasks(tasks) : renumberTasks(tasks)
    }

    private func updateTaskList(_ updates: [String: Any]) {
        db.collection("taskLists").document(taskList.id).updateData(updates)
    }

    private func persistTasks(_ tasks: [TaskSummary], deletedTaskIds: [String] = []) {
        updateTaskList(buildTaskUpdateData(normalizedTasks(tasks), deletedTaskIds: deletedTaskIds))
    }

    private func deleteTaskList() {
        guard !removingList, let user = Auth.auth().currentUser else { return }
        removingList = true
        let uid = user.uid
        let now = Int64(Date().timeIntervalSince1970 * 1000)

        Task {
            do {
                _ = try await db.runTransaction { transaction, errorPointer in
                    let taskListOrderRef = self.db.collection("taskListOrder").document(uid)
                    let taskListRef = self.db.collection("taskLists").document(taskList.id)
                    let orderSnapshot: DocumentSnapshot
                    let taskListSnapshot: DocumentSnapshot

                    do {
                        orderSnapshot = try transaction.getDocument(taskListOrderRef)
                        taskListSnapshot = try transaction.getDocument(taskListRef)
                    } catch {
                        errorPointer?.pointee = error as NSError
                        return nil
                    }

                    if orderSnapshot.exists {
                        transaction.updateData([
                            taskList.id: FieldValue.delete(),
                            "updatedAt": now,
                        ], forDocument: taskListOrderRef)
                    }

                    guard taskListSnapshot.exists else {
                        return nil
                    }

                    let currentMemberCount = (taskListSnapshot.data()?["memberCount"] as? NSNumber)?.intValue ?? 1
                    let nextMemberCount = currentMemberCount - 1
                    if nextMemberCount <= 0 {
                        if let currentCode = taskListSnapshot.data()?["shareCode"] as? String,
                           !currentCode.isEmpty {
                            transaction.deleteDocument(self.db.collection("shareCodes").document(currentCode))
                        }
                        transaction.deleteDocument(taskListRef)
                    } else {
                        transaction.updateData([
                            "memberCount": nextMemberCount,
                            "updatedAt": now,
                        ], forDocument: taskListRef)
                    }
                    return nil
                }

                await MainActor.run {
                    logTaskListDelete()
                    showDeleteListAlert = false
                    showEditSheet = false
                    removingList = false
                }
            } catch {
                await MainActor.run {
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
    @State private var showDeleteListAlert = false
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
                                .font(.system(size: TaskListDetailMetrics.addActionIconSize, weight: .semibold))
                                .foregroundStyle(.primary)
                                .frame(width: 24, height: 24)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("タスクを追加")
                    }
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
                        HStack(alignment: .taskRowContentCenter, spacing: TaskListDetailMetrics.taskRowSpacing) {
                            DragHandleIcon()
                                .foregroundStyle(.secondary)
                                .frame(width: TaskListDetailMetrics.dragTouchWidth, height: TaskListDetailMetrics.dragTouchHeight)
                                .alignmentGuide(.taskRowContentCenter) { dimensions in
                                    dimensions[VerticalAlignment.center]
                                }
                                .contentShape(Rectangle())
                                .accessibilityLabel(translations.t("app.dragHint"))
                                .gesture(
                                    DragGesture(minimumDistance: 2, coordinateSpace: .named("taskList"))
                                        .onChanged { value in
                                            if draggingTaskId == nil {
                                                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                                draggingTaskId = task.id
                                                dragOrderedTasks = displayTasks
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
                                            let originalTaskIds = getDisplayOrderedTasks(taskList.tasks).map(\.id)
                                            if let ordered = dragOrderedTasks,
                                               ordered.map(\.id) != originalTaskIds {
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
                            .alignmentGuide(.taskRowContentCenter) { dimensions in
                                dimensions[VerticalAlignment.center]
                            }
                            .accessibilityLabel(task.completed ? "完了済み、タップで未完了にする" : "未完了、タップで完了にする")

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
                                        .accessibilityLabel("タスクを編集: \(task.text)")
                                    }
                                }
                                .frame(maxWidth: .infinity, minHeight: TaskListDetailMetrics.taskContentHeight, alignment: .leading)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .alignmentGuide(.taskRowContentCenter) { dimensions in
                                dimensions[.bottom] - (TaskListDetailMetrics.taskContentHeight / 2)
                            }

                            Button {
                                openDatePicker(task)
                            } label: {
                                Image(systemName: task.pinned ? "pin.fill" : "calendar")
                                    .font(.system(size: TaskListDetailMetrics.trailingDateIconSize, weight: .medium))
                                .foregroundStyle(task.pinned ? Color.accentColor : Color.secondary)
                                .frame(width: TaskListDetailMetrics.trailingDateButtonWidth, height: TaskListDetailMetrics.trailingDateButtonHeight)
                            }
                            .buttonStyle(.plain)
                            .alignmentGuide(.taskRowContentCenter) { dimensions in
                                dimensions[VerticalAlignment.center]
                            }
                            .accessibilityLabel(translations.t("pages.tasklist.setDate"))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, TaskListDetailMetrics.taskRowVerticalPadding)
                        .offset(y: draggingTaskId == task.id ? taskDragOffset : 0)
                        .zIndex(draggingTaskId == task.id ? 1 : 0)
                        .opacity((draggingTaskId == task.id ? 0.8 : 1.0) * (task.completed ? completedTaskOpacity : 1.0))
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
                    VStack(spacing: 12) {
                        DatePicker("", selection: $datePickerDate, displayedComponents: .date)
                            .datePickerStyle(.graphical)
                            .padding(.horizontal)
                            .padding(.top, 8)
                        HStack(spacing: 12) {
                            Button(translations.t("pages.tasklist.clearDate")) {
                                commitDate(task, dateStr: "")
                            }
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .buttonStyle(.bordered)

                            Button {
                                togglePinned(task)
                            } label: {
                                Label(
                                    translations.t(task.pinned ? "pages.tasklist.unpinTask" : "pages.tasklist.pinTask"),
                                    systemImage: task.pinned ? "pin.slash" : "pin"
                                )
                                .frame(maxWidth: .infinity, minHeight: 44)
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 16)
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
                .presentationDetents([.large])
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
                    order: current.order,
                    pinned: current.pinned
                )
            }
            persistTasks(updatedTasks)
            return
        }

        updateTaskList([
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
        let resolved = resolveTaskInput(editingText, language: translations.language, currentTask: task)
        let textChanged = resolved.text != task.text
        let dateChanged = resolved.date != task.date
        let pinnedChanged = resolved.pinnedFromInput && !task.pinned
        editingTaskId = nil
        guard !(trimmed.isEmpty && !dateChanged), textChanged || dateChanged || pinnedChanged else { return }
        let changedFields = [textChanged ? "text" : nil, dateChanged ? "date" : nil, pinnedChanged ? "pinned" : nil]
            .compactMap { $0 }
            .joined(separator: ",")
        logTaskUpdate(fields: changedFields)
        if autoSort {
            let updatedTasks = taskList.tasks.map { current in
                TaskSummary(
                    id: current.id,
                    text: current.id == task.id ? resolved.text : current.text,
                    completed: current.completed,
                    date: current.id == task.id ? resolved.date ?? current.date : current.date,
                    order: current.order,
                    pinned: current.id == task.id && resolved.pinnedFromInput ? true : current.pinned
                )
            }
            persistTasks(updatedTasks)
            return
        }

        var updates: [String: Any] = [
            "tasks.\(task.id).text": resolved.text,
            "tasks.\(task.id).date": resolved.date ?? task.date,
            "updatedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ]
        if pinnedChanged {
            updates["tasks.\(task.id).pinned"] = true
        }
        updateTaskList(updates)
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
                    order: current.order,
                    pinned: current.pinned
                )
            }
            persistTasks(updatedTasks)
            datePickerTaskId = nil
            return
        }

        updateTaskList([
            "tasks.\(task.id).date": dateStr,
            "updatedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ])
        datePickerTaskId = nil
    }

    private func togglePinned(_ task: TaskSummary) {
        logTaskUpdate(fields: "pinned")
        let nextPinned = !task.pinned
        if autoSort {
            let updatedTasks = taskList.tasks.map { current in
                TaskSummary(
                    id: current.id,
                    text: current.text,
                    completed: current.completed,
                    date: current.date,
                    order: current.order,
                    pinned: current.id == task.id ? nextPinned : current.pinned
                )
            }
            persistTasks(updatedTasks)
            return
        }

        if task.pinned && !nextPinned && !task.completed {
            let updatedTasks = taskList.tasks.map { current in
                TaskSummary(
                    id: current.id,
                    text: current.text,
                    completed: current.completed,
                    date: current.date,
                    order: current.order,
                    pinned: current.id == task.id ? false : current.pinned
                )
            }
            let reorderedTasks = [
                updatedTasks.filter { taskDisplayGroup($0) == 0 },
                updatedTasks.filter { $0.id == task.id },
                updatedTasks.filter { taskDisplayGroup($0) == 1 && $0.id != task.id },
                updatedTasks.filter { taskDisplayGroup($0) == 2 }
            ].flatMap { $0 }
            updateTaskList(buildTaskUpdateData(renumberTasks(reorderedTasks)))
            return
        }

        updateTaskList([
            "tasks.\(task.id).pinned": nextPinned,
            "updatedAt": Int64(Date().timeIntervalSince1970 * 1000)
        ])
    }

    private func addTask() {
        let trimmed = newTaskText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let parsed = resolveTaskInput(trimmed, language: translations.language)
        logTaskAdd(hasDate: !(parsed.date ?? "").isEmpty)
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
                text: parsed.text,
                completed: false,
                date: parsed.date ?? "",
                order: order,
                pinned: parsed.pinnedFromInput
            )
            var reorderedTasks = taskList.tasks
            let insertIndex = taskInsertPosition == "top" ? 0 : reorderedTasks.count
            reorderedTasks.insert(insertedTask, at: insertIndex)
            persistTasks(reorderedTasks)
            return
        }

        updateTaskList([
            "tasks.\(taskId).id": taskId,
            "tasks.\(taskId).text": parsed.text,
            "tasks.\(taskId).completed": false,
            "tasks.\(taskId).date": parsed.date ?? "",
            "tasks.\(taskId).order": order,
            "tasks.\(taskId).pinned": parsed.pinnedFromInput,
            "updatedAt": now
        ])
    }

    private func handleSortTasks() {
        logTaskSort()
        let sorted = taskList.tasks.sorted { a, b in
            let aGroup = taskDisplayGroup(a)
            let bGroup = taskDisplayGroup(b)
            if aGroup != bGroup { return aGroup < bGroup }
            let aEmpty = a.date.isEmpty, bEmpty = b.date.isEmpty
            if aEmpty != bEmpty { return bEmpty }
            if !aEmpty && !bEmpty && a.date != b.date { return a.date < b.date }
            return a.order < b.order
        }
        var updates: [String: Any] = ["updatedAt": Int64(Date().timeIntervalSince1970 * 1000)]
        for (i, task) in sorted.enumerated() {
            updates["tasks.\(task.id).order"] = Double(i + 1)
        }
        updateTaskList(updates)
    }

    private func confirmDeleteCompleted() {
        let completed = taskList.tasks.filter { $0.completed }
        logTaskDeleteCompleted(count: completed.count)
        let remaining = taskList.tasks.filter { !$0.completed }
        persistTasks(remaining, deletedTaskIds: completed.map(\.id))
    }

    private func persistTaskOrder(_ ids: [String]) {
        logTaskReorder()
        var updates: [String: Any] = ["updatedAt": Int64(Date().timeIntervalSince1970 * 1000)]
        for (i, id) in ids.enumerated() {
            updates["tasks.\(id).order"] = Double(i + 1)
        }
        updateTaskList(updates)
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
    let onDismiss: () -> Void
    let onAdded: (String) -> Void

    @StateObject private var viewModel = SharedTaskListPreviewViewModel()
    @StateObject private var settingsViewModel = SettingsViewModel()
    @State private var authStateHandle: AuthStateDidChangeListenerHandle?
    @State private var currentUid = Auth.auth().currentUser?.uid
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
                    taskInsertPosition: settingsViewModel.settings?.taskInsertPosition ?? "bottom",
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

                if currentUid != nil, !viewModel.isAdded, viewModel.taskList != nil {
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
                    .font(.subheadline)
                    .padding(.top, 72)
                    .padding(.horizontal, 16)
            }
        }
        .onAppear {
            authStateHandle = Auth.auth().addStateDidChangeListener { _, user in
                Task { @MainActor in
                    currentUid = user?.uid
                    settingsViewModel.bind(uid: user?.uid)
                    viewModel.bind(shareCode: shareCode, uid: user?.uid, translations: translations)
                }
            }
        }
        .onDisappear {
            if let handle = authStateHandle {
                Auth.auth().removeStateDidChangeListener(handle)
            }
            settingsViewModel.reset()
            viewModel.reset()
        }
        .onChange(of: translations.language) { _, _ in
            viewModel.bind(shareCode: shareCode, uid: currentUid, translations: translations)
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
                Task { @MainActor in
                    viewModel.bind(uid: user?.uid)
                }
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
                        .frame(width: AppIconMetrics.calendarTaskColorDotSize, height: AppIconMetrics.calendarTaskColorDotSize)
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
                        .font(.system(size: AppIconMetrics.inlineActionIconSize, weight: .semibold))
                        .padding(8)
                }
                .accessibilityLabel(translations.t("app.calendarPreviousMonth"))
                Spacer()
                Text(monthTitle)
                    .font(.headline)
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
                    Spacer()
                    Text(translations.t("app.calendarNoDatedTasks"))
                        .foregroundStyle(.secondary)
                        .font(.subheadline)
                    Spacer()
                } else if visibleTasks.isEmpty {
                    Spacer()
                    Text(translations.t("app.calendarNoTasksOnSelectedDate"))
                        .foregroundStyle(.secondary)
                        .font(.subheadline)
                    Spacer()
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

@main
struct LightlistApp: App {
    @State private var pendingDeepLink: PendingDeepLink?

    init() {
        AppCheck.setAppCheckProviderFactory(LightlistAppCheckProviderFactory())
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

struct RootView_Previews: PreviewProvider {
    static var previews: some View {
        RootView()
    }
}
