import SwiftUI
import Foundation
import Security
@preconcurrency import FirebaseAuth
import FirebaseAnalytics
import FirebaseCore
import FirebaseCrashlytics
@preconcurrency import FirebaseFirestore
import os

private let authSignInTimeoutSeconds: TimeInterval = 10
private let shareCodeCharacters = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
private let shareCodePattern = #"^[A-Z0-9]{8}$"#

private func normalizedShareCode(_ rawValue: String) -> String? {
    let shareCode = rawValue.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    guard shareCode.range(of: shareCodePattern, options: .regularExpression) != nil else {
        return nil
    }
    return shareCode
}

private func passwordResetCode(from rawValue: String?) -> String? {
    guard let rawValue else {
        return nil
    }
    let code = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !code.isEmpty, code.utf8.count <= 2048 else {
        return nil
    }
    return code
}

private func generateRandomShareCode() throws -> String {
    let characterCount = shareCodeCharacters.count
    let largestAcceptableByte = UInt8.max - (UInt8.max % UInt8(characterCount))
    var result = ""
    result.reserveCapacity(8)

    while result.count < 8 {
        var byte: UInt8 = 0
        let status = SecRandomCopyBytes(kSecRandomDefault, 1, &byte)
        guard status == errSecSuccess else {
            throw NSError(domain: "com.lightlist", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "共有コードの生成に失敗しました"])
        }
        guard byte < largestAcceptableByte else { continue }
        result.append(shareCodeCharacters[Int(byte) % characterCount])
    }
    return result
}

enum PendingDeepLink: Equatable {
    case passwordReset(code: String)
    case shareCode(String)
}

private func parseDeepLink(_ url: URL) -> PendingDeepLink? {
    let scheme = url.scheme?.lowercased()
    let host = url.host?.lowercased()
    let pathComponents = url.pathComponents.filter { $0 != "/" }
    let queryItems = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems

    if scheme == "lightlist" {
        if host == "password-reset", pathComponents.isEmpty {
            guard let code = passwordResetCode(from: queryItems?.first(where: { $0.name == "oobCode" })?.value) else {
                return nil
            }
            return .passwordReset(code: code)
        }

        if host == "sharecodes", pathComponents.count == 1,
           let shareCode = normalizedShareCode(pathComponents[0]) {
            return .shareCode(shareCode)
        }
    }

    if scheme == "https", host == "lightlist.com", (url.port == nil || url.port == 443) {
        if pathComponents.count == 1,
           pathComponents[0].lowercased() == "sharecodes",
           let shareCode = normalizedShareCode(queryItems?.first(where: { $0.name == "code" })?.value ?? "") {
            return .shareCode(shareCode)
        }

        if pathComponents.count == 2,
           pathComponents[0].lowercased() == "sharecodes",
           let shareCode = normalizedShareCode(pathComponents[1]) {
            return .shareCode(shareCode)
        }

        if pathComponents.count == 1,
           pathComponents[0].lowercased() == "password_reset",
           let code = passwordResetCode(from: queryItems?.first(where: { $0.name == "oobCode" })?.value) {
            return .passwordReset(code: code)
        }
    }

    return nil
}

nonisolated private func dynamicColor(
    _ light: UInt32,
    _ dark: UInt32,
    lightOpacity: CGFloat = 1,
    darkOpacity: CGFloat = 1
) -> Color {
    Color(UIColor { traits in
        let isDark = traits.userInterfaceStyle == .dark
        let hex = isDark ? dark : light
        return UIColor(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: isDark ? darkOpacity : lightOpacity
        )
    })
}

private enum AppPalette {
    static let pageBackground = Color("AppPalettePageBackground")
    static let cardSurface = Color("AppPaletteCardSurface")
    static let mutedText = Color("AppPaletteMutedText")
    static let primary = dynamicColor(0x111827, 0xF9FAFB)
    static let onPrimary = dynamicColor(0xF9FAFB, 0x111827)
    static let border = dynamicColor(0xD1D5DB, 0x374151)
    static let fieldBackground = dynamicColor(0xFFFFFF, 0x030712)
    static let fieldLabel = dynamicColor(0x374151, 0xD1D5DB)
    static let placeholder = dynamicColor(0x9CA3AF, 0x6B7280)
    static let subtleIcon = dynamicColor(0x111827, 0xF9FAFB, lightOpacity: 0.42, darkOpacity: 0.45)
    static let subtleText = dynamicColor(0x111827, 0xF9FAFB, lightOpacity: 0.64, darkOpacity: 0.68)
    static let rowHover = dynamicColor(0x111827, 0xF9FAFB, lightOpacity: 0.05, darkOpacity: 0.06)
    static let rowActive = dynamicColor(0x111827, 0xF9FAFB, lightOpacity: 0.07, darkOpacity: 0.10)
    static let todayRing = dynamicColor(0x9CA3AF, 0x6B7280)
    static let outsideDay = dynamicColor(0x9CA3AF, 0x6B7280)
    static let danger = dynamicColor(0xDC2626, 0xEF4444)
}

private enum AppMetrics {
    static let controlHeight: CGFloat = 44
    static let controlCornerRadius: CGFloat = 12
    static let cardCornerRadius: CGFloat = 12
    static let sheetCalendarCornerRadius: CGFloat = 16
    static let headerHeight: CGFloat = 56
    static let headerHorizontalPadding: CGFloat = 6
    static let pageHorizontalPadding: CGFloat = 16
    static let regularPageHorizontalPadding: CGFloat = 24
    static let regularPageTopPadding: CGFloat = 40
    static let settingsMaxWidth: CGFloat = 640
    static let taskColumnMaxWidth: CGFloat = 672
    static let authCardMaxWidth: CGFloat = 576
    static let listDotSize: CGFloat = 10
}

private enum AppTypography {
    static func body() -> Font {
        .custom("GenInterfaceJP-Regular", size: 17, relativeTo: .body)
    }

    static func bodyMedium() -> Font {
        .custom("GenInterfaceJP-Medium", size: 17, relativeTo: .body)
    }

    static func bodyBold() -> Font {
        .custom("GenInterfaceJP-Bold", size: 17, relativeTo: .body)
    }

    static func subheadline() -> Font {
        .custom("GenInterfaceJP-Regular", size: 15, relativeTo: .subheadline)
    }

    static func subheadlineMedium() -> Font {
        .custom("GenInterfaceJP-Medium", size: 15, relativeTo: .subheadline)
    }

    static func subheadlineSemibold() -> Font {
        .custom("GenInterfaceJP-SemiBold", size: 15, relativeTo: .subheadline)
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

    static func sectionTitle() -> Font {
        .custom("GenInterfaceJPDisplay-Bold", size: 20, relativeTo: .title3)
    }

    static func headline() -> Font {
        .custom("GenInterfaceJPDisplay-Bold", size: 17, relativeTo: .headline)
    }

    static func captionMedium() -> Font {
        .custom("GenInterfaceJP-Medium", size: 12, relativeTo: .caption)
    }

    static func footnoteSemibold() -> Font {
        .custom("GenInterfaceJP-SemiBold", size: 13, relativeTo: .footnote)
    }

    static func bodySemibold() -> Font {
        .custom("GenInterfaceJP-SemiBold", size: 17, relativeTo: .body)
    }

    static func dialogTitle() -> Font {
        .custom("GenInterfaceJP-SemiBold", size: 18, relativeTo: .headline)
    }

    static func pageTitle() -> Font {
        .custom("GenInterfaceJPDisplay-Bold", size: 26, relativeTo: .title)
    }

    static func brand() -> Font {
        .custom("GenInterfaceJPDisplay-Bold", size: 19, relativeTo: .title3)
    }
}

private enum AppButtonVariant {
    case primary
    case secondary
    case tonal
    case ghost
    case danger
}

private struct AppButtonStyle: ButtonStyle {
    let variant: AppButtonVariant
    var fullWidth = false
    var cornerRadius: CGFloat = AppMetrics.controlCornerRadius
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        return configuration.label
            .font(AppTypography.subheadlineSemibold())
            .lineLimit(1)
            .padding(.horizontal, variant == .ghost || variant == .danger ? 12 : 16)
            .frame(maxWidth: fullWidth ? .infinity : nil, minHeight: AppMetrics.controlHeight)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor(isPressed: configuration.isPressed), in: shape)
            .overlay {
                if variant == .secondary {
                    shape.strokeBorder(AppPalette.border, lineWidth: 1)
                }
            }
            .contentShape(shape)
            .opacity(isEnabled ? 1 : 0.45)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: configuration.isPressed)
    }

    private var foregroundColor: Color {
        switch variant {
        case .primary: return AppPalette.onPrimary
        case .secondary, .tonal: return .primary
        case .ghost: return AppPalette.mutedText
        case .danger: return AppPalette.danger
        }
    }

    private func backgroundColor(isPressed: Bool) -> Color {
        switch variant {
        case .primary: return AppPalette.primary.opacity(isPressed ? 0.88 : 1)
        case .secondary: return isPressed ? AppPalette.pageBackground : AppPalette.cardSurface
        case .tonal: return isPressed ? AppPalette.rowActive.opacity(1.6) : AppPalette.rowActive
        case .ghost, .danger: return isPressed ? AppPalette.rowHover : .clear
        }
    }
}

private struct AppIconButtonStyle: ButtonStyle {
    var size: CGFloat = AppMetrics.controlHeight
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: size, height: size)
            .contentShape(Rectangle())
            .opacity(isEnabled ? 1 : 0.45)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.94 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

private struct AppFieldModifier: ViewModifier {
    var monospaced = false

    func body(content: Content) -> some View {
        content
            .font(monospaced ? .system(.body, design: .monospaced) : AppTypography.body())
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, minHeight: AppMetrics.controlHeight, alignment: .leading)
            .background(AppPalette.fieldBackground, in: RoundedRectangle(cornerRadius: AppMetrics.controlCornerRadius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: AppMetrics.controlCornerRadius, style: .continuous)
                    .strokeBorder(AppPalette.border, lineWidth: 1)
            }
    }
}

private extension View {
    func appField(monospaced: Bool = false) -> some View {
        modifier(AppFieldModifier(monospaced: monospaced))
    }
}

private struct AppFormField<Content: View>: View {
    let label: String
    var error: String? = nil
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(AppTypography.subheadlineMedium())
                .foregroundStyle(AppPalette.fieldLabel)
            content()
            if let error {
                Text(error)
                    .font(AppTypography.caption())
                    .foregroundStyle(AppPalette.danger)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private enum AppAlertVariant {
    case error
    case success
}

private struct AppAlert: View {
    let message: String
    var variant: AppAlertVariant = .error

    var body: some View {
        Text(message)
            .font(AppTypography.subheadline())
            .foregroundStyle(foregroundColor)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(backgroundColor, in: RoundedRectangle(cornerRadius: AppMetrics.controlCornerRadius, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: AppMetrics.controlCornerRadius, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: 1)
            }
            .accessibilityAddTraits(.updatesFrequently)
    }

    private var foregroundColor: Color {
        variant == .error ? dynamicColor(0x7F1D1D, 0xFEE2E2) : dynamicColor(0x064E3B, 0xD1FAE5)
    }

    private var backgroundColor: Color {
        variant == .error
            ? dynamicColor(0xFEF2F2, 0x7F1D1D, darkOpacity: 0.2)
            : dynamicColor(0xECFDF5, 0x064E3B, darkOpacity: 0.2)
    }

    private var borderColor: Color {
        variant == .error
            ? dynamicColor(0xFECACA, 0x7F1D1D, darkOpacity: 0.4)
            : dynamicColor(0xA7F3D0, 0x064E3B, darkOpacity: 0.4)
    }
}

private struct AppDialog<Content: View, Leading: View, Trailing: View>: View {
    let title: String
    var description: String? = nil
    @ViewBuilder let content: () -> Content
    @ViewBuilder let footerLeading: () -> Leading
    @ViewBuilder let footerTrailing: () -> Trailing

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(AppTypography.dialogTitle())
                    .foregroundStyle(.primary)
                    .accessibilityAddTraits(.isHeader)
                if let description {
                    Text(description)
                        .font(AppTypography.subheadline())
                        .foregroundStyle(AppPalette.mutedText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            content()
                .padding(.top, 20)
            HStack(spacing: 8) {
                footerLeading()
                    .padding(.leading, -12)
                Spacer(minLength: 8)
                footerTrailing()
            }
            .padding(.top, 24)
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .modifier(FittedSheetModifier())
    }
}

private struct FittedSheetModifier: ViewModifier {
    @State private var contentHeight: CGFloat = 320

    func body(content: Content) -> some View {
        content
            .fixedSize(horizontal: false, vertical: true)
            .onGeometryChange(for: CGFloat.self) { proxy in
                proxy.size.height
            } action: { height in
                contentHeight = height
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .background(AppPalette.cardSurface.ignoresSafeArea())
            .presentationDetents([.height(contentHeight)])
            .presentationBackground(AppPalette.cardSurface)
            .presentationCornerRadius(28)
            .modifier(FittedPresentationSizing())
    }
}

private struct TaskToolbarButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppTypography.subheadlineMedium())
            .foregroundStyle(configuration.isPressed ? Color.primary : AppPalette.subtleText)
            .frame(minHeight: AppMetrics.controlHeight)
            .contentShape(Rectangle())
            .opacity(isEnabled ? 1 : 0.5)
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

private func shareCodeURLString(_ code: String) -> String {
    "https://lightlist.com/sharecodes/?code=\(code)"
}

private struct FittedPresentationSizing: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content.presentationSizing(.form.fitted(horizontal: false, vertical: true))
        } else {
            content
        }
    }
}

private struct AppActionSheetHeader: View {
    @EnvironmentObject var translations: Translations
    let title: String
    var closeDisabled = false
    let onClose: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Text(title)
                .font(AppTypography.bodySemibold())
                .lineLimit(1)
                .accessibilityAddTraits(.isHeader)
            Spacer(minLength: 0)
            Button(translations.t("common.close"), action: onClose)
                .buttonStyle(AppButtonStyle(variant: .ghost))
                .disabled(closeDisabled)
                .padding(.trailing, -12)
        }
        .frame(minHeight: AppMetrics.controlHeight)
    }
}

private struct AppNavigationHeader: View {
    @EnvironmentObject var translations: Translations
    var title: String? = nil
    let onBack: () -> Void

    var body: some View {
        ZStack {
            if let title {
                Text(title)
                    .font(AppTypography.bodySemibold())
                    .lineLimit(1)
                    .padding(.horizontal, 56)
                    .accessibilityAddTraits(.isHeader)
            }
            HStack(spacing: 0) {
                Button(action: onBack) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: AppIconMetrics.navigationIconSize, weight: .semibold))
                        .flipsForRightToLeftLayoutDirection(true)
                        .foregroundStyle(.primary)
                }
                .buttonStyle(AppIconButtonStyle())
                .accessibilityLabel(translations.t("common.back"))
                Spacer(minLength: 0)
            }
            .padding(.horizontal, AppMetrics.headerHorizontalPadding)
        }
        .frame(maxWidth: .infinity, minHeight: AppMetrics.headerHeight)
    }
}

private struct AppPageTitle: View {
    let title: String

    var body: some View {
        Text(title)
            .font(AppTypography.pageTitle())
            .foregroundStyle(.primary)
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
    }
}

private struct BrandLogoShape: Shape {
    func path(in rect: CGRect) -> Path {
        let scale = min(rect.width, rect.height) / 1024
        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * scale, y: rect.minY + y * scale)
        }
        var path = Path()
        path.move(to: point(744, 272))
        path.addCurve(to: point(836, 503), control1: point(810, 332), control2: point(842, 416))
        path.addCurve(to: point(688, 749), control1: point(830, 596), control2: point(776, 686))
        path.addCurve(to: point(375, 804), control1: point(595, 816), control2: point(474, 840))
        path.addCurve(to: point(192, 601), control1: point(285, 772), control2: point(217, 695))
        path.addCurve(to: point(248, 338), control1: point(168, 512), control2: point(187, 415))
        path.addCurve(to: point(517, 204), control1: point(310, 260), control2: point(411, 211))
        path.addCurve(to: point(744, 272), control1: point(606, 198), control2: point(687, 221))
        path.closeSubpath()
        return path
    }
}

private struct BrandLogo: View {
    var size: CGFloat = 24

    var body: some View {
        BrandLogoShape()
            .fill(
                LinearGradient(
                    stops: [
                        .init(color: Color(red: 0.949, green: 0.949, blue: 0.949), location: 0),
                        .init(color: Color(red: 0.741, green: 0.741, blue: 0.741), location: 0.45),
                        .init(color: Color(red: 0.373, green: 0.373, blue: 0.373), location: 1),
                    ],
                    startPoint: UnitPoint(x: 220.0 / 1024, y: 180.0 / 1024),
                    endPoint: UnitPoint(x: 790.0 / 1024, y: 850.0 / 1024)
                )
            )
            .frame(width: size, height: size)
            .accessibilityHidden(true)
    }
}

private struct ListColorDot: View {
    let background: String?
    var size: CGFloat = AppMetrics.listDotSize

    var body: some View {
        Group {
            if let background, let color = Color(hex: background) {
                Circle().fill(color)
            } else {
                Circle().strokeBorder(AppPalette.todayRing, lineWidth: 1.5)
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

@MainActor
final class Translations: ObservableObject {
    @Published private(set) var language: String = "ja"
    private var dict: [String: Any] = [:]

    private static let supported = ["ja","en","es","de","fr","ko","zh-CN","hi","ar","pt-BR","id"]
    private static var allLocales: [String: Any]?

    init() {
        load(language: UserDefaults.standard.string(forKey: cachedLanguageKey) ?? resolveDeviceLanguage())
    }

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
        let current = currentGregorianCalendar().component(.weekday, from: Date())
        return makeTaskOffsetDate(nextTaskWeekdayOffset(targetDay: target + 1, currentDay: current))
    }
}

private let appLogger = Logger(subsystem: "com.lightlist.app", category: "runtime")

private func log(_ eventName: String, _ params: [String: Any]? = nil) {
    #if DEBUG
    appLogger.debug("analytics event: \(eventName, privacy: .public)")
    #endif
    Analytics.logEvent(eventName, parameters: params)
}

private func syncErrorCategory(_ error: Error) -> String {
    "code_\((error as NSError).code)"
}

private func logSyncListenerError(source: String, error: Error) {
    let category = syncErrorCategory(error)
    log("app_sync_listener_error", ["source": source, "error_category": category])
    let crashError = NSError(domain: "com.lightlist.sync.\(source)", code: (error as NSError).code, userInfo: nil)
    Crashlytics.crashlytics().record(error: crashError)
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
func logSettingsStartupViewChange(view: String) { log("app_settings_startup_view_change", ["view": view]) }

func logException(operation: String, errorCategory: String? = nil) {
    var params: [String: Any] = ["operation": operation]
    if let errorCategory {
        params["error_category"] = errorCategory
    }
    log("app_exception", params)
    let error = NSError(domain: "com.lightlist.\(operation)", code: 0, userInfo: nil)
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

    static func startupPath(startupView: String?) -> [AppRoute] {
        switch normalizedStartupView(startupView) {
        case "calendar":
            return [.calendar]
        case "taskLists":
            return []
        default:
            return initialPath
        }
    }
}

private enum RootPresentation: Identifiable {
    case auth
    case passwordReset(String)
    case sharePreview(String)

    var id: String {
        switch self {
        case .auth:
            return "auth"
        case .passwordReset(let code):
            return "passwordReset:\(code)"
        case .sharePreview(let code):
            return "sharePreview:\(code)"
        }
    }
}

func normalizedStartupView(_ value: String?) -> String {
    guard let value, value == "calendar" || value == "taskLists" else { return "taskList" }
    return value
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

private func stringValue(_ value: Any?) -> String? {
    if let value = value as? String {
        return value
    }
    if let value = value as? NSString {
        return value as String
    }
    return nil
}

private func stringAnyDictionary(_ value: Any?) -> [String: Any]? {
    if let value = value as? [String: Any] {
        return value
    }
    guard let value = value as? NSDictionary else { return nil }
    var result: [String: Any] = [:]
    for (key, item) in value {
        guard let key = stringValue(key) else { return nil }
        result[key] = item
    }
    return result
}

private func stringArray(_ value: Any?) -> [String]? {
    if let value = value as? [String] {
        return value
    }
    guard let value = value as? NSArray else { return nil }
    var result: [String] = []
    for item in value {
        guard let item = stringValue(item) else { return nil }
        result.append(item)
    }
    return result
}

private struct FirestoreTaskRecord: Codable {
    let id: String?
    let text: String?
    let completed: Bool?
    let date: String?
    let order: Double?
    let pinned: Bool?

    init(data: [String: Any]) {
        id = stringValue(data["id"])
        text = stringValue(data["text"])
        completed = data["completed"] as? Bool
        date = stringValue(data["date"])
        order = (data["order"] as? NSNumber)?.doubleValue
        pinned = data["pinned"] as? Bool
    }

    nonisolated func taskSummary(taskId: String) -> TaskSummary? {
        guard id == taskId,
              let text,
              let completed,
              let date,
              let order,
              order.isFinite,
              let pinned else {
            return nil
        }
        let normalizedDate = date.isEmpty || parseTaskInputDate(date) != nil ? date : ""
        guard hasTaskContent(text: text, date: normalizedDate, pinned: pinned) else { return nil }
        return TaskSummary(
            id: taskId,
            text: text,
            completed: completed,
            date: normalizedDate,
            order: order,
            pinned: pinned
        )
    }
}

private struct FirestoreTaskListRecord: Codable {
    let name: String?
    let tasks: [String: FirestoreTaskRecord]?
    let history: [String]?
    let memberCount: Int?
    let background: String?
    let shareCode: String?

    init(data: [String: Any]) {
        name = stringValue(data["name"])
        tasks = stringAnyDictionary(data["tasks"])?.compactMapValues { value in
            guard let task = stringAnyDictionary(value) else { return nil }
            return FirestoreTaskRecord(data: task)
        }
        history = stringArray(data["history"])
        memberCount = (data["memberCount"] as? NSNumber)?.intValue
        background = stringValue(data["background"])
        shareCode = stringValue(data["shareCode"])
    }

    nonisolated func taskSummaries() -> [TaskSummary] {
        (tasks ?? [:]).compactMap { taskId, task in
            task.taskSummary(taskId: taskId)
        }
        .sorted {
            $0.order == $1.order ? $0.id < $1.id : $0.order < $1.order
        }
    }
}

private struct FirestoreSettingsRecord: Codable {
    let theme: String?
    let language: String?
    let taskInsertPosition: String?
    let autoSort: Bool?
    let startupView: String?
}

private func isOptionalStringValue(_ value: Any?) -> Bool {
    value == nil || value is NSNull || stringValue(value) != nil
}

private func isOptionalNumberValue(_ value: Any?) -> Bool {
    guard let value else { return true }
    guard value is NSNull || value is NSNumber else { return false }
    guard let number = value as? NSNumber, !(value is NSNull) else { return true }
    return String(cString: number.objCType) != "c"
}

private func isValidTaskListRecordData(_ data: [String: Any]) -> Bool {
    let nameValid = isOptionalStringValue(data["name"])
    let tasksValid = data["tasks"].map { $0 is NSNull || stringAnyDictionary($0) != nil } ?? true
    let historyValid = data["history"].map { $0 is NSNull || stringArray($0) != nil } ?? true
    let memberCountValid = isOptionalNumberValue(data["memberCount"])
    let backgroundValid = isOptionalStringValue(data["background"])
    let shareCodeValid = isOptionalStringValue(data["shareCode"])
    return nameValid && tasksValid && historyValid && memberCountValid && backgroundValid && shareCodeValid
}

private func decodeTaskListRecord(from document: DocumentSnapshot) -> FirestoreTaskListRecord? {
    guard document.exists,
          let data = document.data(),
          isValidTaskListRecordData(data) else { return nil }
    return FirestoreTaskListRecord(data: data)
}

private func decodeSettingsRecord(from snapshot: DocumentSnapshot?) -> FirestoreSettingsRecord? {
    guard let snapshot else { return nil }
    guard snapshot.exists else {
        return FirestoreSettingsRecord(
            theme: nil,
            language: nil,
            taskInsertPosition: nil,
            autoSort: nil,
            startupView: nil
        )
    }
    return try? snapshot.data(as: FirestoreSettingsRecord.self)
}

private func taskDisplayGroup(_ task: TaskSummary) -> Int {
    if task.completed { return 2 }
    return task.pinned ? 0 : 1
}

nonisolated private func hasTaskContent(text: String, date: String, pinned: Bool) -> Bool {
    !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !date.isEmpty || pinned
}

nonisolated private func hasTaskContent(_ task: TaskSummary) -> Bool {
    hasTaskContent(text: task.text, date: task.date, pinned: task.pinned)
}

private func canReorderTasks(_ first: TaskSummary, _ second: TaskSummary, autoSort: Bool) -> Bool {
    !autoSort || (taskDisplayGroup(first) == taskDisplayGroup(second) && first.date == second.date)
}

private func getDisplayOrderedTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
    tasks.filter(hasTaskContent).sorted { lhs, rhs in
        let lhsGroup = taskDisplayGroup(lhs)
        let rhsGroup = taskDisplayGroup(rhs)
        if lhsGroup != rhsGroup { return lhsGroup < rhsGroup }
        return lhs.order == rhs.order ? lhs.id < rhs.id : lhs.order < rhs.order
    }
}

private func getOrderOrderedTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
    tasks.filter(hasTaskContent).sorted {
        $0.order == $1.order ? $0.id < $1.id : $0.order < $1.order
    }
}

private func getAutoSortedTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
    renumberTasks(tasks.filter(hasTaskContent).sorted { lhs, rhs in
        let lhsGroup = taskDisplayGroup(lhs)
        let rhsGroup = taskDisplayGroup(rhs)
        if lhsGroup != rhsGroup { return lhsGroup < rhsGroup }
        let lhsDate = lhs.date.isEmpty ? "9999-12-31" : lhs.date
        let rhsDate = rhs.date.isEmpty ? "9999-12-31" : rhs.date
        if lhsDate != rhsDate { return lhsDate < rhsDate }
        return lhs.order == rhs.order ? lhs.id < rhs.id : lhs.order < rhs.order
    })
}

private func renumberTasks(_ tasks: [TaskSummary]) -> [TaskSummary] {
    tasks.enumerated().map { index, task in
        task.updating(order: Double(index + 1))
    }
}

private func normalizeTasks(_ tasks: [TaskSummary], autoSort: Bool) -> [TaskSummary] {
    autoSort ? getAutoSortedTasks(tasks) : renumberTasks(tasks.filter(hasTaskContent))
}

private func buildTaskUpdateData(
    previousTasks: [TaskSummary],
    tasks: [TaskSummary],
    deletedTaskIds: [String] = []
) -> [String: Any] {
    var updates: [String: Any] = ["updatedAt": nowMillis()]
    let previousById = Dictionary(uniqueKeysWithValues: previousTasks.map { ($0.id, $0) })
    let nextTaskIds = Set(tasks.map(\.id))
    for task in previousTasks where !nextTaskIds.contains(task.id) {
        updates["tasks.\(task.id)"] = FieldValue.delete()
    }
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

private func buildHistory(
    newText: String,
    history: [String],
    oldText: String? = nil,
    normalizeWhenEmpty: Bool = false
) -> [String] {
    let candidate = newText.trimmingCharacters(in: .whitespacesAndNewlines)
    if candidate.isEmpty && !normalizeWhenEmpty { return history }
    let trimmedOldText = oldText?.trimmingCharacters(in: .whitespacesAndNewlines)
    var result: [String] = []
    var seen = Set<String>()
    for entry in (candidate.isEmpty ? history : [candidate] + history) {
        let trimmed = entry.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { continue }
        if let trimmedOldText, trimmed == trimmedOldText { continue }
        let normalized = trimmed.lowercased()
        if !seen.insert(normalized).inserted { continue }
        result.append(trimmed)
        if result.count >= 300 { break }
    }
    return result
}

private struct ActionSheetState: Identifiable, Equatable {
    let taskId: String

    var id: String { taskId }
}

private struct TaskListSummary: Identifiable, Hashable {
    let id: String
    let name: String
    let remainingTaskCount: Int
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
    private var pendingCount = 0
    private var idleHandlers: [@MainActor () -> Void] = []

    func enqueue(
        _ operation: (@escaping @Sendable (Error?) -> Void) -> Void,
        onError: @escaping @MainActor @Sendable () -> Void = {},
        onIdle: @escaping @MainActor @Sendable () -> Void = {}
    ) {
        pendingCount += 1
        idleHandlers.append(onIdle)
        operation { error in
            Task { @MainActor in
                if error != nil { onError() }
                self.pendingCount -= 1
                if self.pendingCount == 0 {
                    let handlers = self.idleHandlers
                    self.idleHandlers = []
                    handlers.forEach { $0() }
                }
            }
        }
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

    static func enqueue(
        for taskListIds: [String],
        _ operation: (@escaping @Sendable (Error?) -> Void) -> Void,
        onError: @escaping @MainActor @Sendable () -> Void = {},
        onIdle: @escaping @MainActor @Sendable () -> Void = {}
    ) {
        let ids = Array(Set(taskListIds)).sorted()
        func submit(_ index: Int, completion: @escaping @Sendable (Error?) -> Void) {
            guard index < ids.count else {
                operation(completion)
                return
            }
            queue(for: ids[index]).enqueue({ finished in
                submit(index + 1) { error in
                    finished(error)
                    completion(error)
                }
            }, onError: { if index == 0 { onError() } }, onIdle: { if index == 0 { onIdle() } })
        }
        submit(0) { _ in }
    }

    static func remove(for taskListId: String) {
        queues.removeValue(forKey: taskListId)
    }
}

private func removeTaskListMembership(
    db: Firestore,
    taskListOrderRef: DocumentReference,
    taskListId: String,
    taskListSnapshot: DocumentSnapshot,
    shareCodeDocumentId: String?
) async throws {
    let taskListRef = taskListSnapshot.reference
    guard let uid = Auth.auth().currentUser?.uid else {
        throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Missing user ID"])
    }
    let batch = db.batch()
    batch.updateData([
        taskListId: FieldValue.delete(),
        "updatedAt": nowMillis(),
    ], forDocument: taskListOrderRef)
    batch.deleteDocument(taskListRef.collection("members").document(uid))
    guard let record = decodeTaskListRecord(from: taskListSnapshot),
          let memberCount = record.memberCount,
          memberCount >= 1 else {
        throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Task list data is invalid"])
    }
    if memberCount <= 1 {
        if let shareCodeDocumentId {
            batch.deleteDocument(db.collection("shareCodes").document(shareCodeDocumentId))
        }
        batch.deleteDocument(taskListRef)
    } else {
        batch.updateData([
            "memberCount": FieldValue.increment(Int64(-1)),
            "updatedAt": nowMillis(),
        ], forDocument: taskListRef)
    }
    try await batch.commit()
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
    let dateValue: Date?
    let pinned: Bool
    let taskListIndex: Int
    let taskIndex: Int
}

private let cachedThemeKey = "lightlist.theme"
private let cachedLanguageKey = "lightlist.language"
let cachedStartupViewKey = "lightlist.startupView"

@MainActor
private final class AutoSortOverrideStore: ObservableObject {
    static let shared = AutoSortOverrideStore()

    @Published private var values: [String: Bool] = [:]

    func value(for uid: String?, fallback: Bool) -> Bool {
        guard let uid else { return fallback }
        return values[uid] ?? fallback
    }

    func set(_ value: Bool, for uid: String) {
        values[uid] = value
    }

    func clear(for uid: String) {
        values.removeValue(forKey: uid)
    }

    func clearAll() {
        values.removeAll()
    }
}

private func taskListOrderCacheKey(uid: String) -> String {
    "lightlist.taskListOrder.\(uid)"
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
        guard !key.isEmpty, !key.contains("/") else {
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
        .sorted {
            $0.order == $1.order ? $0.taskListId < $1.taskListId : $0.order < $1.order
        }
        .map { $0.taskListId }
}

private func taskListIdChunks(_ taskListIds: [String]) -> [[String]] {
    stride(from: 0, to: taskListIds.count, by: 10).map { startIndex in
        Array(taskListIds[startIndex..<min(startIndex + 10, taskListIds.count)])
    }
}

private func resolveMemberTaskListIds(
    db: Firestore,
    taskListIds: [String],
    uid: String
) async throws -> [String] {
    var memberTaskListIds: [String] = []
    for taskListId in taskListIds {
        let snapshot = try await db.collection("taskLists")
            .document(taskListId)
            .collection("members")
            .document(uid)
            .getDocument()
        if snapshot.exists {
            memberTaskListIds.append(taskListId)
        }
    }
    return memberTaskListIds
}

private func isCompleteTaskData(taskId: String, value: Any) -> Bool {
    guard let task = value as? [String: Any],
          task["id"] as? String == taskId,
          task["text"] is String,
          task["completed"] is Bool,
          task["date"] is String,
          let order = task["order"] as? NSNumber,
          order.doubleValue.isFinite,
          task["pinned"] is Bool else { return false }
    return true
}

private func malformedTaskIds(from data: [String: Any]) -> [String] {
    let tasks = data["tasks"] as? [String: Any] ?? [:]
    return tasks.compactMap { taskId, value in
        isCompleteTaskData(taskId: taskId, value: value) ? nil : taskId
    }.sorted()
}

@MainActor private var malformedTaskCleanupKeys: Set<String> = []

@MainActor
private func scheduleMalformedTaskCleanup(
    taskListId: String,
    data: [String: Any],
    isFromCache: Bool,
    hasPendingWrites: Bool
) {
    guard !isFromCache, !hasPendingWrites else { return }
    let taskIds = malformedTaskIds(from: data)
    guard !taskIds.isEmpty else { return }
    let cleanupKey = "\(taskListId):\(taskIds.joined(separator: "|"))"
    guard malformedTaskCleanupKeys.insert(cleanupKey).inserted else { return }
    var updates: [String: Any] = ["updatedAt": nowMillis()]
    taskIds.forEach { updates["tasks.\($0)"] = FieldValue.delete() }
    TaskListMutationQueues.queue(for: taskListId).enqueue({ completion in
        Firestore.firestore().collection("taskLists").document(taskListId).updateData(updates, completion: completion)
    }, onError: {
        malformedTaskCleanupKeys.remove(cleanupKey)
    }, onIdle: {
        malformedTaskCleanupKeys.remove(cleanupKey)
    })
}

nonisolated private func mapTaskListSummary(id: String, data: FirestoreTaskListRecord) -> TaskListSummary {
    let memberCount = data.memberCount ?? 1
    let name = (data.name ?? "").precomposedStringWithCanonicalMapping
    let background = data.background

    return TaskListSummary(
        id: id,
        name: name,
        remainingTaskCount: data.taskSummaries().filter { !$0.completed }.count,
        memberCount: memberCount,
        background: background
    )
}

nonisolated private func mapTaskListDetail(id: String, data: FirestoreTaskListRecord) -> TaskListDetail {
    let name = (data.name ?? "").precomposedStringWithCanonicalMapping
    let memberCount = data.memberCount ?? 1
    let background = data.background
    let history = (data.history ?? []).map {
        $0.precomposedStringWithCanonicalMapping
    }
    let tasks = data.taskSummaries()

    return TaskListDetail(
        id: id,
        name: name,
        tasks: tasks,
        history: history,
        memberCount: memberCount,
        background: background,
        shareCode: data.shareCode
    )
}

@MainActor private class OrderedTaskListViewModel<Item>: ObservableObject {
    @Published private(set) var taskLists: [Item] = []
    @Published private(set) var status: LoadStatus = .idle
    private let db = Firestore.firestore()
    private let mapper: (String, FirestoreTaskListRecord) -> Item
    private var taskListOrderListener: ListenerRegistration?
    private var chunkListeners: [String: ListenerRegistration] = [:]
    private var membershipTask: Task<Void, Never>?
    private var retryTasks: [String: Task<Void, Never>] = [:]
    private var retryDelays: [String: UInt64] = [:]
    private var failedScopes: Set<String> = []
    private var currentUid: String?
    private var orderedIds: [String] = []
    private var accessibleIds: [String] = []
    private var taskListsById: [String: Item] = [:]
    private var taskListIdsKey: String?
    private var listenerGeneration = 0
    private var chunkGeneration = 0
    private var loadedChunks: Set<String> = []

    init(mapper: @escaping (String, FirestoreTaskListRecord) -> Item) {
        self.mapper = mapper
    }

    func bind(uid: String?) {
        guard currentUid != uid else { return }
        reset()
        currentUid = uid
        guard let uid else { return }
        status = .loading
        orderedIds = UserDefaults.standard.stringArray(forKey: taskListOrderCacheKey(uid: uid)) ?? []
        subscribeToTaskLists(taskListIds: orderedIds)
        installOrderListener(uid: uid)
    }

    deinit {
        membershipTask?.cancel()
        retryTasks.values.forEach { $0.cancel() }
        taskListOrderListener?.remove()
        chunkListeners.values.forEach { $0.remove() }
    }

    func reset() {
        membershipTask?.cancel()
        membershipTask = nil
        retryTasks.values.forEach { $0.cancel() }
        retryTasks = [:]
        retryDelays = [:]
        failedScopes = []
        listenerGeneration += 1
        chunkGeneration += 1
        loadedChunks = []
        taskListOrderListener?.remove()
        taskListOrderListener = nil
        chunkListeners.values.forEach { $0.remove() }
        chunkListeners = [:]
        currentUid = nil
        orderedIds = []
        accessibleIds = []
        taskListsById = [:]
        taskListIdsKey = nil
        taskLists = []
        status = .idle
    }

    private func scheduleRetry(key: String, source: String, error: Error, install: @escaping @MainActor () -> Void) {
        if failedScopes.insert(key).inserted { logSyncListenerError(source: source, error: error) }
        guard retryTasks[key] == nil else { return }
        let delay = retryDelays[key] ?? 1_000_000_000
        retryDelays[key] = min(delay * 2, 30_000_000_000)
        retryTasks[key] = Task { [weak self] in
            do { try await Task.sleep(nanoseconds: delay) } catch { return }
            guard let self, !Task.isCancelled else { return }
            self.retryTasks.removeValue(forKey: key)
            install()
        }
    }

    private func markHealthy(key: String, isFromCache: Bool) {
        if !isFromCache {
            retryDelays.removeValue(forKey: key)
            failedScopes.remove(key)
        }
    }

    private func installOrderListener(uid: String) {
        taskListOrderListener?.remove()
        let generation = listenerGeneration
        taskListOrderListener = db.collection("taskListOrder").document(uid).addSnapshotListener { [weak self] snapshot, error in
            guard let self, generation == self.listenerGeneration else { return }
            if let error {
                self.taskListOrderListener?.remove()
                self.taskListOrderListener = nil
                self.scheduleRetry(key: "order", source: "task_list_order", error: error) { [weak self] in
                    self?.installOrderListener(uid: uid)
                }
                self.publishTaskLists()
                return
            }
            self.orderedIds = orderedTaskListIds(from: snapshot?.data())
            UserDefaults.standard.set(self.orderedIds, forKey: taskListOrderCacheKey(uid: uid))
            self.markHealthy(key: "order", isFromCache: snapshot?.metadata.isFromCache ?? true)
            self.subscribeToTaskLists(taskListIds: self.orderedIds, forceMembershipRefresh: true)
        }
    }

    private func subscribeToTaskLists(
        taskListIds: [String],
        forceMembershipRefresh: Bool = false
    ) {
        let key = taskListIds.sorted().joined(separator: "|")
        guard forceMembershipRefresh || taskListIdsKey != key else { return }
        taskListIdsKey = key
        chunkGeneration += 1
        let generation = chunkGeneration
        membershipTask?.cancel()
        membershipTask = nil
        chunkListeners.values.forEach { $0.remove() }
        chunkListeners = [:]
        for retryKey in Array(retryTasks.keys) where retryKey != "order" {
            retryTasks.removeValue(forKey: retryKey)?.cancel()
        }
        retryDelays = retryDelays.filter { $0.key == "order" }
        failedScopes = failedScopes.filter { $0 == "order" }
        accessibleIds = []
        loadedChunks = []
        taskListsById = [:]
        guard !taskListIds.isEmpty, let uid = currentUid else {
            status = .ready
            publishTaskLists()
            return
        }
        status = .loading
        func installTaskListChunks(_ ids: [String]) {
            accessibleIds = ids
            taskListIdChunks(ids).forEach {
                    self.installChunk($0, generation: generation)
            }
        }

        membershipTask = Task { [weak self] in
            guard let self else { return }
            do {
                let memberTaskListIds = try await resolveMemberTaskListIds(
                    db: self.db,
                    taskListIds: taskListIds,
                    uid: uid
                )
                guard !Task.isCancelled, generation == self.chunkGeneration else { return }
                self.failedScopes.remove("membership")
                installTaskListChunks(memberTaskListIds)
                self.publishTaskLists()
            } catch {
                guard !Task.isCancelled, generation == self.chunkGeneration else { return }
                let nsError = error as NSError
                if nsError.code == 7 {
                    self.failedScopes.remove("membership")
                    installTaskListChunks(taskListIds)
                    self.publishTaskLists()
                    return
                }
                self.scheduleRetry(key: "membership", source: "task_list_membership", error: error) { [weak self] in
                    self?.subscribeToTaskLists(taskListIds: taskListIds, forceMembershipRefresh: true)
                }
                self.publishTaskLists()
            }
        }
    }

    private func installChunk(_ chunk: [String], generation: Int) {
        guard generation == chunkGeneration else { return }
        let key = chunk.joined(separator: "|")
        chunkListeners[key]?.remove()
        chunkListeners[key] = db.collection("taskLists")
            .whereField(FieldPath.documentID(), in: chunk)
            .addSnapshotListener(includeMetadataChanges: true) { [weak self] snapshot, error in
                guard let self, generation == self.chunkGeneration else { return }
                if let error {
                    self.chunkListeners.removeValue(forKey: key)?.remove()
                    self.scheduleRetry(key: key, source: "task_lists", error: error) { [weak self] in
                        self?.installChunk(chunk, generation: generation)
                    }
                    self.publishTaskLists()
                    return
                }
                chunk.forEach { self.taskListsById.removeValue(forKey: $0) }
                snapshot?.documents.forEach { document in
                    scheduleMalformedTaskCleanup(
                        taskListId: document.documentID,
                        data: document.data(),
                        isFromCache: document.metadata.isFromCache,
                        hasPendingWrites: document.metadata.hasPendingWrites
                    )
                    if let record = decodeTaskListRecord(from: document) {
                        self.taskListsById[document.documentID] = self.mapper(document.documentID, record)
                    }
                }
                self.loadedChunks.insert(key)
                self.markHealthy(key: key, isFromCache: snapshot?.metadata.isFromCache ?? true)
                self.publishTaskLists()
            }
    }

    private func publishTaskLists() {
        taskLists = orderedIds.compactMap { taskListsById[$0] }
        let chunkCount = taskListIdChunks(accessibleIds).count
        let orderFailed = failedScopes.contains("order")
        let membershipFailed = failedScopes.contains("membership")
        let chunkFailed = failedScopes.contains(where: { $0 != "order" })
        let chunksFailedBeforeFirstSnapshot = chunkFailed && loadedChunks.isEmpty && !accessibleIds.isEmpty
        let noTaskListLoaded = !accessibleIds.isEmpty && loadedChunks.count == chunkCount && taskLists.isEmpty
        if orderFailed || membershipFailed || chunksFailedBeforeFirstSnapshot || noTaskListLoaded {
            status = .error
        } else if accessibleIds.isEmpty || !taskLists.isEmpty || loadedChunks.count == chunkCount {
            status = .ready
        }
    }
}

private final class CalendarViewModel: OrderedTaskListViewModel<TaskListDetail> {

    @Published private(set) var calendarError: String?
    private let db = Firestore.firestore()
    private var pendingTaskArrays: [String: [TaskSummary]] = [:]
    private var pendingTaskArrayRevisions: [String: Int] = [:]
    private var pendingHistories: [String: [String]] = [:]
    private var pendingHistoryRevisions: [String: Int] = [:]
    private var mutationRevision = 0
    private var failedMutationRevisions: Set<Int> = []

    init() {
        super.init(mapper: mapTaskListDetail)
    }

    override func reset() {
        super.reset()
        pendingTaskArrays = [:]
        pendingTaskArrayRevisions = [:]
        pendingHistories = [:]
        pendingHistoryRevisions = [:]
        failedMutationRevisions = []
        calendarError = nil
    }

    func clearError() {
        calendarError = nil
    }

    private func displayedTasks(for taskList: TaskListDetail) -> [TaskSummary] {
        (pendingTaskArrays[taskList.id] ?? taskList.tasks).sorted {
            $0.order == $1.order ? $0.id < $1.id : $0.order < $1.order
        }
    }

    private func displayedHistory(for taskList: TaskListDetail) -> [String] {
        pendingHistories[taskList.id] ?? taskList.history
    }

    private func makeCalendarTask(
        taskList: TaskListDetail,
        task: TaskSummary,
        taskListIndex: Int,
        taskIndex: Int
    ) -> CalendarTask {
        CalendarTask(
            taskListId: taskList.id,
            taskListName: taskList.name,
            taskListBackground: taskList.background,
            taskId: task.id,
            text: task.text,
            completed: task.completed,
            date: task.date,
            dateValue: task.date.isEmpty ? nil : parseTaskInputDate(task.date),
            pinned: task.pinned,
            taskListIndex: taskListIndex,
            taskIndex: taskIndex
        )
    }

    var calendarTasks: [CalendarTask] {
        taskLists.enumerated().flatMap { taskListEntry in
            let taskListIndex = taskListEntry.offset
            let taskList = taskListEntry.element
            return displayedTasks(for: taskList).enumerated().filter { !$0.element.completed }.map { taskEntry in
                makeCalendarTask(
                    taskList: taskList,
                    task: taskEntry.element,
                    taskListIndex: taskListIndex,
                    taskIndex: taskEntry.offset
                )
            }
        }
        .sorted {
            if $0.pinned != $1.pinned { return $0.pinned && !$1.pinned }
            let leftDate = $0.date.isEmpty ? "9999-12-31" : $0.date
            let rightDate = $1.date.isEmpty ? "9999-12-31" : $1.date
            if leftDate != rightDate { return leftDate < rightDate }
            if $0.taskListIndex != $1.taskListIndex { return $0.taskListIndex < $1.taskListIndex }
            if $0.taskIndex != $1.taskIndex { return $0.taskIndex < $1.taskIndex }
            return $0.id < $1.id
        }
    }

    private func beginPending(
        _ taskLists: [String: [TaskSummary]],
        histories: [String: [String]]
    ) -> (revisions: [String: Int], historyRevisions: [String: Int], operationRevision: Int) {
        mutationRevision += 1
        let operationRevision = mutationRevision
        var revisions: [String: Int] = [:]
        for (taskListId, tasks) in taskLists {
            pendingTaskArrayRevisions[taskListId] = operationRevision
            pendingTaskArrays[taskListId] = tasks
            revisions[taskListId] = operationRevision
        }
        var historyRevisions: [String: Int] = [:]
        for (taskListId, history) in histories {
            pendingHistoryRevisions[taskListId] = operationRevision
            pendingHistories[taskListId] = history
            historyRevisions[taskListId] = operationRevision
        }
        for taskListId in taskLists.keys where historyRevisions[taskListId] == nil {
            guard let history = pendingHistories[taskListId] else { continue }
            pendingHistoryRevisions[taskListId] = operationRevision
            pendingHistories[taskListId] = history
            historyRevisions[taskListId] = operationRevision
        }
        calendarError = nil
        return (revisions, historyRevisions, operationRevision)
    }

    private func finishPending(_ revisions: [String: Int], histories: [String: Int]) {
        for (taskListId, revision) in revisions where pendingTaskArrayRevisions[taskListId] == revision {
            pendingTaskArrayRevisions.removeValue(forKey: taskListId)
            pendingTaskArrays.removeValue(forKey: taskListId)
        }
        for (taskListId, revision) in histories where pendingHistoryRevisions[taskListId] == revision {
            pendingHistoryRevisions.removeValue(forKey: taskListId)
            pendingHistories.removeValue(forKey: taskListId)
        }
    }

    private func enqueueMutation(
        taskLists nextTaskLists: [String: [TaskSummary]],
        histories nextHistories: [String: [String]] = [:],
        translations: Translations,
        operation: @escaping (@escaping @Sendable (Error?) -> Void) -> Void,
        onSuccess: @escaping @MainActor @Sendable () -> Void = {},
        onFailure: @escaping @MainActor @Sendable () -> Void = {}
    ) {
        let pending = beginPending(nextTaskLists, histories: nextHistories)
        TaskListMutationQueues.enqueue(
            for: Array(nextTaskLists.keys),
            operation,
            onError: { [weak self] in
                guard let self else { return }
                self.failedMutationRevisions.insert(pending.operationRevision)
                self.finishPending(pending.revisions, histories: pending.historyRevisions)
                self.calendarError = translations.t("common.error")
                onFailure()
            },
            onIdle: { [weak self] in
                guard let self else { return }
                self.finishPending(pending.revisions, histories: pending.historyRevisions)
                if self.failedMutationRevisions.remove(pending.operationRevision) == nil {
                    onSuccess()
                }
            }
        )
    }

    func addTask(
        taskListId: String,
        rawText: String,
        dateStr: String,
        pinned: Bool,
        taskInsertPosition: String,
        autoSort: Bool,
        translations: Translations,
        onSuccess: @escaping @MainActor @Sendable () -> Void = {},
        onFailure: @escaping @MainActor @Sendable () -> Void = {}
    ) {
        let trimmed = rawText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard hasTaskContent(text: trimmed, date: dateStr, pinned: pinned),
              let taskListIndex = taskLists.firstIndex(where: { $0.id == taskListId }) else {
            calendarError = translations.t("common.error")
            onFailure()
            return
        }

        let taskList = taskLists[taskListIndex]
        let parsed = resolveTaskInput(trimmed, translations: translations)
        guard hasTaskContent(text: parsed.text, date: dateStr, pinned: pinned) else {
            calendarError = translations.t("common.error")
            onFailure()
            return
        }
        let taskId = UUID().uuidString
        let orderedTasks = displayedTasks(for: taskList)
        let nextOrder = taskInsertPosition == "bottom"
            ? (orderedTasks.last?.order ?? 0) + 1
            : (orderedTasks.first?.order ?? 1) - 1
        let insertedTask = TaskSummary(
            id: taskId,
            text: parsed.text,
            completed: false,
            date: dateStr,
            order: nextOrder,
            pinned: pinned
        )
        let insertedTasks = taskInsertPosition == "bottom"
            ? orderedTasks + [insertedTask]
            : [insertedTask] + orderedTasks
        let nextTasks = normalizeTasks(insertedTasks, autoSort: autoSort)
        let nextHistory = buildHistory(
            newText: parsed.text,
            history: displayedHistory(for: taskList),
            normalizeWhenEmpty: true
        )
        var updates = buildTaskUpdateData(previousTasks: orderedTasks, tasks: nextTasks)
        updates["history"] = nextHistory
        enqueueMutation(
            taskLists: [taskList.id: nextTasks],
            histories: [taskList.id: nextHistory],
            translations: translations,
            operation: { [db] completion in
                db.collection("taskLists").document(taskList.id).updateData(updates, completion: completion)
            },
            onSuccess: onSuccess,
            onFailure: onFailure
        )
        logTaskAdd(hasDate: !dateStr.isEmpty)
    }

    func saveTask(
        _ task: CalendarTask,
        taskListId: String,
        rawText: String,
        pinned: Bool,
        dateStr: String,
        taskInsertPosition: String,
        autoSort: Bool,
        translations: Translations,
        onSuccess: @escaping @MainActor @Sendable () -> Void = {},
        onFailure: @escaping @MainActor @Sendable () -> Void = {}
    ) {
        let trimmed = rawText.trimmingCharacters(in: .whitespacesAndNewlines)
        if taskListId != task.taskListId && hasTaskContent(text: trimmed, date: dateStr, pinned: pinned) {
            moveTask(
                task,
                toTaskListId: taskListId,
                rawText: trimmed,
                pinned: pinned,
                dateStr: dateStr,
                taskInsertPosition: taskInsertPosition,
                autoSort: autoSort,
                translations: translations,
                onSuccess: onSuccess,
                onFailure: onFailure
            )
            return
        }
        logTaskUpdate(fields: "text,date,pinned")
        mutateTask(taskListId: task.taskListId, taskId: task.taskId, autoSort: autoSort, translations: translations, onSuccess: onSuccess, onFailure: onFailure) { current, taskList in
            let resolved = resolveTaskInput(trimmed, translations: translations, currentTask: current)
                let nextText = trimmed.isEmpty ? "" : resolved.text
            var additionalUpdates: [String: Any] = [:]
            if nextText != current.text {
                additionalUpdates["history"] = buildHistory(
                    newText: nextText,
                    history: displayedHistory(for: taskList),
                    oldText: current.text
                )
            }
            return (current.updating(text: nextText, date: dateStr, pinned: pinned), additionalUpdates)
        }
    }

    private func moveTask(
        _ task: CalendarTask,
        toTaskListId targetTaskListId: String,
        rawText: String,
        pinned: Bool,
        dateStr: String,
        taskInsertPosition: String,
        autoSort: Bool,
        translations: Translations,
        onSuccess: @escaping @MainActor @Sendable () -> Void = {},
        onFailure: @escaping @MainActor @Sendable () -> Void = {}
    ) {
        guard let sourceTaskList = taskLists.first(where: { $0.id == task.taskListId }),
              let targetTaskList = taskLists.first(where: { $0.id == targetTaskListId }) else {
            calendarError = translations.t("common.error")
            onFailure()
            return
        }
        let sourceTasks = displayedTasks(for: sourceTaskList)
        let targetTasks = displayedTasks(for: targetTaskList)
        guard let currentTask = sourceTasks.first(where: { $0.id == task.taskId }) else {
            calendarError = translations.t("common.error")
            onFailure()
            return
        }
        let resolved = resolveTaskInput(rawText, translations: translations, currentTask: currentTask)
        let nextText = rawText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "" : resolved.text
        let nextOrder = taskInsertPosition == "bottom"
            ? (targetTasks.last?.order ?? 0) + 1
            : (targetTasks.first?.order ?? 1) - 1
        let movedTask = TaskSummary(
            id: task.taskId,
            text: nextText,
            completed: currentTask.completed,
            date: dateStr,
            order: nextOrder,
            pinned: pinned
        )
        let nextSourceTasks = normalizeTasks(sourceTasks.filter { $0.id != task.taskId }, autoSort: autoSort)
        let insertedTasks = taskInsertPosition == "bottom"
            ? targetTasks + [movedTask]
            : [movedTask] + targetTasks
        let nextTargetTasks = normalizeTasks(insertedTasks, autoSort: autoSort)
        var sourceUpdates = buildTaskUpdateData(previousTasks: sourceTasks, tasks: nextSourceTasks)
        var targetUpdates = buildTaskUpdateData(previousTasks: targetTasks, tasks: nextTargetTasks)
        let targetHistory = buildHistory(
            newText: nextText,
            history: displayedHistory(for: targetTaskList),
            normalizeWhenEmpty: true
        )
        targetUpdates["history"] = targetHistory
        sourceUpdates["updatedAt"] = nowMillis()
        let sourceTaskListId = task.taskListId
        logTaskUpdate(fields: "text,date,pinned,taskList")
        enqueueMutation(
            taskLists: [sourceTaskListId: nextSourceTasks, targetTaskListId: nextTargetTasks],
            histories: [targetTaskListId: targetHistory],
            translations: translations,
            operation: { [db] completion in
                let batch = db.batch()
                batch.updateData(sourceUpdates, forDocument: db.collection("taskLists").document(sourceTaskListId))
                batch.updateData(targetUpdates, forDocument: db.collection("taskLists").document(targetTaskListId))
                batch.commit(completion: completion)
            },
            onSuccess: onSuccess,
            onFailure: onFailure
        )
    }

    func completeTask(_ task: CalendarTask, autoSort: Bool, translations: Translations) {
        logTaskUpdate(fields: "completed")
        mutateTask(taskListId: task.taskListId, taskId: task.taskId, autoSort: autoSort, translations: translations) { current, _ in
            (current.updating(completed: true), [:])
        }
    }

    private func mutateTask(
        taskListId: String,
        taskId: String,
        autoSort: Bool,
        translations: Translations,
        onSuccess: @escaping @MainActor @Sendable () -> Void = {},
        onFailure: @escaping @MainActor @Sendable () -> Void = {},
        transform: (TaskSummary, TaskListDetail) -> (TaskSummary, [String: Any])?
    ) {
        guard let taskList = taskLists.first(where: { $0.id == taskListId }) else {
            calendarError = translations.t("common.error")
            onFailure()
            return
        }
        let orderedTasks = displayedTasks(for: taskList)
        guard let currentTask = orderedTasks.first(where: { $0.id == taskId }),
              let (nextTask, additionalUpdates) = transform(currentTask, taskList) else {
            calendarError = translations.t("common.error")
            onFailure()
            return
        }
        let updatedTasks = orderedTasks.map { $0.id == taskId ? nextTask : $0 }
        let nextTasks = normalizeTasks(updatedTasks, autoSort: autoSort)
        var updates = buildTaskUpdateData(previousTasks: orderedTasks, tasks: nextTasks)
        additionalUpdates.forEach { updates[$0.key] = $0.value }
        let nextHistory = additionalUpdates["history"] as? [String]
        enqueueMutation(
            taskLists: [taskListId: nextTasks],
            histories: nextHistory.map { [taskListId: $0] } ?? [:],
            translations: translations,
            operation: { [db] completion in
                db.collection("taskLists").document(taskListId).updateData(updates, completion: completion)
            },
            onSuccess: onSuccess,
            onFailure: onFailure
        )
    }
}

@MainActor
private func resolvePasswordResetErrorMessage(translations: Translations, error: Error) -> String {
    let nsError = error as NSError
    guard nsError.domain == "FIRAuthErrorDomain" else {
        return error.localizedDescription
    }
    let authError = AuthErrorCode(rawValue: nsError.code)
    switch authError {
    case .expiredActionCode:
        return translations.t("auth.passwordReset.expiredCode")
    case .invalidActionCode:
        return translations.t("auth.passwordReset.invalidCode")
    default:
        return error.localizedDescription
    }
}

private enum AuthScreen: Int, CaseIterable, Identifiable {
    case signIn
    case signUp
    case reset

    var id: Int { rawValue }
}

private func normalizeLanguageCode(_ language: String) -> String {
    supportedLanguages.first(where: { $0.code == language })?.code ?? "ja"
}

private func resolveDeviceLanguage() -> String {
    let identifier = Locale.preferredLanguages.first ?? "ja"
    let primary = identifier.split(separator: "-").first.map { $0.lowercased() } ?? "ja"
    switch primary {
    case "zh":
        return "zh-CN"
    case "pt":
        return "pt-BR"
    case "ja", "en", "es", "de", "fr", "ko", "hi", "ar", "id":
        return primary
    default:
        return "ja"
    }
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
    let pinned: Bool
    let pinnedChanged: Bool
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

nonisolated private func currentGregorianCalendar(locale: Locale? = nil) -> Calendar {
    var calendar = Calendar(identifier: .gregorian)
    calendar.locale = locale
    calendar.timeZone = .autoupdatingCurrent
    return calendar
}

nonisolated private func makeISODateFormatter() -> DateFormatter {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.calendar = currentGregorianCalendar()
    f.timeZone = .autoupdatingCurrent
    f.isLenient = false
    f.dateFormat = "yyyy-MM-dd"
    return f
}

nonisolated private func formatTaskInputDate(_ date: Date) -> String {
    makeISODateFormatter().string(from: date)
}

private let taskListColorOptions: [String?] = [nil, "#F87171", "#FBBF24", "#34D399", "#38BDF8", "#818CF8", "#A78BFA"]

@MainActor private let lightImpactGenerator = UIImpactFeedbackGenerator(style: .light)
@MainActor private let mediumImpactGenerator = UIImpactFeedbackGenerator(style: .medium)
@MainActor private let selectionFeedbackGenerator = UISelectionFeedbackGenerator()
@MainActor private let notificationFeedbackGenerator = UINotificationFeedbackGenerator()

@MainActor private func triggerLightImpact() {
    lightImpactGenerator.impactOccurred()
    lightImpactGenerator.prepare()
}

@MainActor private func triggerMediumImpact() {
    mediumImpactGenerator.impactOccurred()
    mediumImpactGenerator.prepare()
}

@MainActor private func triggerSelectionFeedback() {
    selectionFeedbackGenerator.selectionChanged()
    selectionFeedbackGenerator.prepare()
}

@MainActor private func triggerWarningFeedback() {
    notificationFeedbackGenerator.notificationOccurred(.warning)
    notificationFeedbackGenerator.prepare()
}

nonisolated private func taskInputDateFrom(year: Int, month: Int, day: Int) -> Date? {
    guard year >= 1 else { return nil }
    var components = DateComponents()
    components.year = year
    components.month = month
    components.day = day
    components.hour = 12
    let calendar = currentGregorianCalendar()
    guard let date = calendar.date(from: components) else { return nil }
    let resolved = calendar.dateComponents([.year, .month, .day], from: date)
    guard resolved.year == year, resolved.month == month, resolved.day == day else { return nil }
    return date
}

nonisolated private func parseTaskInputDate(_ value: String) -> Date? {
    let parts = value.split(separator: "-", omittingEmptySubsequences: false)
    guard parts.count == 3,
          parts[0].count == 4,
          parts[1].count == 2,
          parts[2].count == 2,
          let year = Int(parts[0]),
          let month = Int(parts[1]),
          let day = Int(parts[2]),
          let date = taskInputDateFrom(year: year, month: month, day: day),
          formatTaskInputDate(date) == value else { return nil }
    return date
}

private func nextTaskWeekdayOffset(targetDay: Int, currentDay: Int) -> Int {
    let diff = targetDay - currentDay
    return diff >= 0 ? diff : diff + 7
}

private func makeTaskOffsetDate(_ offset: Int) -> Date? {
    currentGregorianCalendar().date(byAdding: .day, value: offset, to: Date())
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
    let calendar = currentGregorianCalendar()
    let numericPatterns: [TaskDatePattern] = [
        .init(pattern: #"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in
            guard let year = Int(groups[1]), let month = Int(groups[2]), let day = Int(groups[3]) else { return nil }
            guard let date = taskInputDateFrom(year: year, month: month, day: day) else { return nil }
            let components = calendar.dateComponents([.year, .month, .day], from: date)
            return components.year == year && components.month == month && components.day == day ? date : nil
        },
        .init(pattern: #"^(\d{1,2})[-/.](\d{1,2})\#(taskDateSpaceOrEndPattern)"#, options: []) { groups in
            guard let month = Int(groups[1]), let day = Int(groups[2]) else { return nil }
            let currentYear = calendar.component(.year, from: Date())
            guard let date = taskInputDateFrom(year: currentYear, month: month, day: day) else { return nil }
            let components = calendar.dateComponents([.month, .day], from: date)
            guard components.month == month && components.day == day else { return nil }
            let today = calendar.startOfDay(for: Date())
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
        let pinned = pinnedFromInput ? true : currentTask.pinned
        return ParsedTaskInput(
            text: remaining.isEmpty ? currentTask.text : remaining,
            date: parsedDate ?? currentTask.date,
            pinned: pinned,
            pinnedChanged: pinned != currentTask.pinned
        )
    }
    return ParsedTaskInput(
        text: remaining,
        date: parsedDate ?? "",
        pinned: pinnedFromInput,
        pinnedChanged: pinnedFromInput
    )
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
    let nsError = error as NSError
    guard nsError.domain == "FIRAuthErrorDomain" else {
        return error.localizedDescription
    }
    let authError = AuthErrorCode(rawValue: nsError.code)
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
    @State private var path = AppRoute.startupPath(
        startupView: UserDefaults.standard.string(forKey: cachedStartupViewKey)
    )
    @State private var theme: String = UserDefaults.standard.string(forKey: cachedThemeKey) ?? "system"
    @State private var isLoggedIn = Auth.auth().currentUser != nil
    @State private var currentUserId = Auth.auth().currentUser?.uid
    @State private var settingsListener: ListenerRegistration?
    @State private var settingsRetryTask: Task<Void, Never>?
    @State private var settingsRetryDelayNanoseconds: UInt64 = 1_000_000_000
    @State private var settingsRetryReportedError = false
    @State private var authHandle: AuthStateDidChangeListenerHandle?
    @State private var selectedTaskListId: String? = "__initial__"
    @State private var selectedRegularPane: RegularPane =
        normalizedStartupView(UserDefaults.standard.string(forKey: cachedStartupViewKey)) == "calendar"
            ? .calendar
            : .taskList
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

    private var locale: Locale {
        Locale(identifier: localeIdentifier(for: translations.language))
    }

    private var calendar: Calendar {
        currentGregorianCalendar(locale: locale)
    }

    private var layoutDirection: LayoutDirection {
        translations.language == "ar" ? .rightToLeft : .leftToRight
    }

    private var presentedScreen: RootPresentation? {
        if let pendingPasswordResetCode {
            return .passwordReset(pendingPasswordResetCode)
        }
        if let pendingSharePreviewCode {
            return .sharePreview(pendingSharePreviewCode)
        }
        return isLoggedIn ? nil : .auth
    }

    private var presentedScreenBinding: Binding<RootPresentation?> {
        Binding(
            get: { presentedScreen },
            set: { presented in
                guard presented == nil else { return }
                pendingPasswordResetCode = nil
                pendingSharePreviewCode = nil
            }
        )
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
        .environment(\.locale, locale)
        .environment(\.calendar, calendar)
        .environment(\.layoutDirection, layoutDirection)
        .onAppear { startListening() }
        .onDisappear { stopListening() }
        .onChange(of: pendingDeepLink, initial: true) { _, deepLink in
            handlePendingDeepLink(deepLink)
        }
        .onChange(of: horizontalSizeClass) { _, nextSizeClass in
            syncNavigation(for: nextSizeClass)
        }
        .fullScreenCover(item: presentedScreenBinding) { screen in
            switch screen {
            case .auth:
                NavigationStack {
                    AuthView(language: translations.language)
                }
                .environmentObject(translations)
            case .passwordReset(let code):
                NavigationStack {
                    PasswordResetView(
                        code: code,
                        onDismiss: { self.pendingPasswordResetCode = nil }
                    )
                }
                .environmentObject(translations)
            case .sharePreview(let code):
                NavigationStack {
                    SharedTaskListPreviewView(
                        shareCode: code,
                        currentUserId: currentUserId,
                        onDismiss: { self.pendingSharePreviewCode = nil },
                        onAdded: { taskListId in
                            self.pendingSharePreviewCode = nil
                            openTaskListFromExternalFlow(taskListId)
                        }
                    )
                }
                .environmentObject(translations)
            }
        }
        .environmentObject(translations)
    }

    private func syncNavigation(for sizeClass: UserInterfaceSizeClass?) {
        if sizeClass == .regular {
            switch path.last {
            case .settings:
                selectedRegularPane = .settings
            case .calendar:
                selectedRegularPane = .calendar
            case .taskList(let taskListId):
                if taskListId != "__initial__" {
                    selectedTaskListId = taskListId
                }
                selectedRegularPane = .taskList
            case .taskLists, nil:
                break
            }
            return
        }

        switch selectedRegularPane {
        case .settings:
            path = [.settings]
        case .calendar:
            path = [.calendar]
        case .taskList:
            if let selectedTaskListId, selectedTaskListId != "__initial__" {
                if path.last == .taskList(taskListId: selectedTaskListId) {
                    return
                }
                if path.last == .calendar {
                    path.append(.taskList(taskListId: selectedTaskListId))
                } else {
                    path = [.taskList(taskListId: selectedTaskListId)]
                }
            } else {
                path = AppRoute.initialPath
            }
        }
    }

    private func openTaskListFromExternalFlow(_ taskListId: String) {
        if horizontalSizeClass == .regular {
            selectedTaskListId = taskListId
            selectedRegularPane = .taskList
        } else {
            path = [.taskList(taskListId: taskListId)]
        }
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
                        CalendarScreenView(
                            currentUserId: currentUserId,
                            onOpenTaskList: { taskListId in
                                path.append(AppRoute.taskList(taskListId: taskListId))
                            }
                        )
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
                selectedTaskListId: selectedRegularPane == .taskList ? selectedTaskListId : nil,
                isCalendarActive: selectedRegularPane == .calendar,
                isSettingsActive: selectedRegularPane == .settings,
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
                AppPalette.pageBackground
                    .ignoresSafeArea()
                if selectedRegularPane == .settings {
                    NavigationStack {
                        SettingsView(currentUserId: currentUserId, showsBackButton: false)
                    }
                } else if selectedRegularPane == .calendar {
                    CalendarScreenView(
                        currentUserId: currentUserId,
                        showsBackButton: false,
                        defaultTaskListId: selectedTaskListId,
                        onOpenTaskList: { taskListId in
                            selectedTaskListId = taskListId
                            selectedRegularPane = .taskList
                        }
                    )
                } else {
                    RegularTaskListDetailPagerView(
                        selectedTaskListId: $selectedTaskListId,
                        currentUserId: currentUserId
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func startListening() {
        guard authHandle == nil else { return }
        authHandle = Auth.auth().addStateDidChangeListener { _, user in
            Task { @MainActor in
                isLoggedIn = user != nil
                currentUserId = user?.uid
                settingsRetryTask?.cancel()
                settingsRetryTask = nil
                settingsRetryDelayNanoseconds = 1_000_000_000
                settingsRetryReportedError = false
                settingsListener?.remove()
                guard let uid = user?.uid else {
                    AutoSortOverrideStore.shared.clearAll()
                    theme = "system"
                    UserDefaults.standard.removeObject(forKey: cachedThemeKey)
                    UserDefaults.standard.removeObject(forKey: cachedLanguageKey)
                    UserDefaults.standard.removeObject(forKey: cachedStartupViewKey)
                    translations.load(language: resolveDeviceLanguage())
                    return
                }
                installSettingsListener(uid: uid)
            }
        }
    }

    private func stopListening() {
        settingsRetryTask?.cancel()
        settingsRetryTask = nil
        settingsListener?.remove()
        if let handle = authHandle {
            Auth.auth().removeStateDidChangeListener(handle)
            authHandle = nil
        }
    }

    private func installSettingsListener(uid: String) {
        settingsListener?.remove()
        settingsListener = Firestore.firestore()
            .collection("settings").document(uid)
            .addSnapshotListener(includeMetadataChanges: true) { snapshot, error in
                Task { @MainActor in
                    guard currentUserId == uid else { return }
                    if let error {
                        scheduleSettingsRetry(uid: uid, error: error)
                        return
                    }
                    guard let data = decodeSettingsRecord(from: snapshot) else {
                        theme = "system"
                        translations.load(language: "ja")
                        return
                    }
                    let nextTheme = data.theme ?? "system"
                    let language = data.language ?? "ja"
                    let startupView = normalizedStartupView(data.startupView)
                    theme = nextTheme
                    if snapshot?.metadata.isFromCache == false,
                       snapshot?.metadata.hasPendingWrites == false {
                        UserDefaults.standard.set(nextTheme, forKey: cachedThemeKey)
                        UserDefaults.standard.set(language, forKey: cachedLanguageKey)
                        UserDefaults.standard.set(startupView, forKey: cachedStartupViewKey)
                    }
                    translations.load(language: language)
                    if snapshot?.metadata.isFromCache == false,
                       snapshot?.metadata.hasPendingWrites == false {
                        settingsRetryDelayNanoseconds = 1_000_000_000
                        settingsRetryReportedError = false
                    }
                }
            }
    }

    private func scheduleSettingsRetry(uid: String, error: Error) {
        if !settingsRetryReportedError {
            logSyncListenerError(source: "settings", error: error)
            settingsRetryReportedError = true
        }
        guard settingsRetryTask == nil else { return }
        let delay = settingsRetryDelayNanoseconds
        settingsRetryDelayNanoseconds = min(settingsRetryDelayNanoseconds * 2, 30_000_000_000)
        settingsRetryTask = Task { @MainActor in
            do {
                try await Task.sleep(nanoseconds: delay)
            } catch {
                return
            }
            settingsRetryTask = nil
            guard currentUserId == uid else { return }
            installSettingsListener(uid: uid)
        }
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
    static let compactBackRowHeight: CGFloat = 48
    static let indicatorRowHeight: CGFloat = 32
    static let indicatorHitHeight: CGFloat = 44
    static let indicatorPitch: CGFloat = 26
    static let indicatorDotSize: CGFloat = 8
    static let compactBottomSpacing: CGFloat = 8
    static let regularTopSpacing: CGFloat = 40
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
}

private enum TaskListDetailMetrics {
    static let headerIconButtonSize: CGFloat = 48
    static let headerIconSize: CGFloat = AppIconMetrics.standardActionIconSize
    static let headerMinHeight: CGFloat = 48
    static let sectionSpacing: CGFloat = 16
    static let edgeActionOverhang: CGFloat = 12
    static let inputCornerRadius: CGFloat = 14
    static let inputHorizontalPadding: CGFloat = 14
    static let inputVerticalPadding: CGFloat = 10
    static let inputBorderWidth: CGFloat = 1
    static let inputBackgroundOpacity: CGFloat = 0.92
    static let addActionIconSize: CGFloat = AppIconMetrics.compactActionIconSize
    static let toolbarIconSlot: CGFloat = 24
    static let toolbarIconSize: CGFloat = 18
    static let toolbarTopOverlap: CGFloat = -4
    static let toolbarBottomOverlap: CGFloat = -8
    static let taskRowSpacing: CGFloat = 0
    static let taskRowGap: CGFloat = 0
    static let taskRowVerticalPadding: CGFloat = 2
    nonisolated static let taskContentHeight: CGFloat = 48
    static let taskDateBottomSpacing: CGFloat = -2
    static let dragTouchHeight: CGFloat = 48
    static let dragTouchWidth: CGFloat = 24
    static let completionTouchHeight: CGFloat = 48
    static let completionTouchWidth: CGFloat = 32
    static let completionDotSize: CGFloat = 20
    static let trailingDateButtonWidth: CGFloat = 48
    static let trailingDateButtonHeight: CGFloat = 48
    static let trailingDateIconSize: CGFloat = AppIconMetrics.compactActionIconSize
    static let contentHorizontalPadding: CGFloat = 16
    static let contentBottomPadding: CGFloat = 40
}

private struct ScreenScaffold<Content: View>: View {
    @EnvironmentObject var translations: Translations
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        ZStack {
            AppPalette.pageBackground
                .ignoresSafeArea()

            GeometryReader { proxy in
                ScrollView {
                    VStack(spacing: 24) {
                        VStack(spacing: 24) {
                            Text(title)
                                .font(AppTypography.pageTitle())
                                .multilineTextAlignment(.center)
                                .accessibilityAddTraits(.isHeader)

                            content()
                        }
                        .padding(24)
                        .frame(maxWidth: AppMetrics.authCardMaxWidth)
                        .background(AppPalette.cardSurface, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 24, style: .continuous)
                                .strokeBorder(AppPalette.border, lineWidth: 1)
                        )

                        Text(translations.t("copyright"))
                            .font(AppTypography.caption())
                            .foregroundStyle(AppPalette.mutedText)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: max(0, proxy.size.height - 80))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 40)
                }
                .scrollDismissesKeyboard(.interactively)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct AuthTextField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var error: String? = nil
    var isSecure = false
    var contentType: UITextContentType? = nil
    var disabled = false

    var body: some View {
        AppFormField(label: label, error: error) {
            Group {
                if isSecure {
                    SecureField("", text: $text, prompt: Text(placeholder).foregroundStyle(AppPalette.placeholder))
                } else {
                    TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(AppPalette.placeholder))
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                }
            }
            .textContentType(contentType)
            .disabled(disabled)
            .appField()
        }
    }
}

private let authButtonCornerRadius: CGFloat = 8

private struct TaskListIndicatorRow: View {
    @EnvironmentObject var translations: Translations
    let taskLists: [TaskListDetail]
    let selectedIndex: Int
    let onSelect: (String) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(taskLists.enumerated()), id: \.element.id) { index, taskList in
                Button {
                    onSelect(taskList.id)
                } label: {
                    Circle()
                        .fill(AppPalette.primary.opacity(index == selectedIndex ? 1 : 0.4))
                        .frame(width: TaskListTopChromeMetrics.indicatorDotSize, height: TaskListTopChromeMetrics.indicatorDotSize)
                        .scaleEffect(index == selectedIndex ? 1.1 : 1)
                        .frame(width: TaskListTopChromeMetrics.indicatorPitch, height: TaskListTopChromeMetrics.indicatorHitHeight)
                        .contentShape(Rectangle())
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
                HStack(spacing: 0) {
                    if let onBack {
                        Button(action: onBack) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: AppIconMetrics.navigationIconSize, weight: .semibold))
                                .flipsForRightToLeftLayoutDirection(true)
                                .foregroundStyle(.primary)
                        }
                        .buttonStyle(AppIconButtonStyle())
                        .accessibilityLabel(translations.t("common.back"))
                    }
                    Spacer(minLength: 0)
                }
                .frame(height: TaskListTopChromeMetrics.compactBackRowHeight)
                .padding(.horizontal, TaskListTopChromeMetrics.horizontalPadding)

                TaskListIndicatorRow(
                    taskLists: taskLists,
                    selectedIndex: selectedIndex,
                    onSelect: onSelect
                )
                .frame(height: TaskListTopChromeMetrics.indicatorRowHeight)
                .opacity(taskLists.count > 1 ? 1 : 0)
                .accessibilityHidden(taskLists.count <= 1)

                Spacer()
                    .frame(height: TaskListTopChromeMetrics.compactBottomSpacing)
            } else {
                Spacer()
                    .frame(height: TaskListTopChromeMetrics.regularTopSpacing)
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
    @State private var email = ""

    var body: some View {
        ScreenScaffold(title: translations.t("title")) {
            VStack(spacing: 24) {
                HStack {
                    Spacer()
                    Menu {
                        Picker(translations.t("settings.language.title"), selection: Binding(
                            get: { selectedLanguage },
                            set: { code in
                                let normalized = normalizeLanguageCode(code)
                                selectedLanguage = normalized
                                logSettingsLanguageChange(language: normalized)
                                translations.load(language: normalized)
                            }
                        )) {
                            ForEach(supportedLanguages.indices, id: \.self) { index in
                                Text(supportedLanguages[index].name).tag(supportedLanguages[index].code)
                            }
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Text(supportedLanguages.first(where: { $0.code == selectedLanguage })?.name ?? selectedLanguage)
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(AppPalette.subtleIcon)
                        }
                        .font(AppTypography.subheadline())
                        .foregroundStyle(.primary)
                        .padding(.horizontal, 12)
                        .frame(minHeight: 36)
                        .background(AppPalette.cardSurface, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .strokeBorder(AppPalette.border, lineWidth: 1)
                        )
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                    }
                    .accessibilityLabel(translations.t("settings.language.title"))
                }

                if selectedScreen != .reset {
                    HStack(spacing: 8) {
                        authTab(.signIn, label: translations.t("auth.tabs.signin"))
                        authTab(.signUp, label: translations.t("auth.tabs.signup"))
                    }
                    .padding(4)
                    .background(AppPalette.pageBackground, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                switch selectedScreen {
                case .signIn:
                    SignInView(email: $email) {
                        selectedScreen = .reset
                    }
                case .signUp:
                    SignUpView(language: selectedLanguage, email: $email)
                case .reset:
                    PasswordResetRequestView(language: selectedLanguage, email: $email) {
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

    private func authTab(_ screen: AuthScreen, label: String) -> some View {
        let isActive = selectedScreen == screen
        return Button {
            selectedScreen = screen
        } label: {
            Text(label)
                .font(AppTypography.subheadlineSemibold())
                .foregroundStyle(isActive ? Color.primary : AppPalette.mutedText)
                .frame(maxWidth: .infinity, minHeight: 40)
                .background(
                    isActive ? AppPalette.cardSurface : Color.clear,
                    in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                )
                .shadow(color: .black.opacity(isActive ? 0.05 : 0), radius: 1, y: 1)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? [.isSelected] : [])
    }
}

private struct SignInView: View {
    @Binding var email: String
    let onShowReset: () -> Void
    @EnvironmentObject var translations: Translations
    @State private var password = ""
    @State private var emailError: String?
    @State private var passwordError: String?
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 16) {
            AuthTextField(
                label: translations.t("auth.form.email"),
                placeholder: translations.t("auth.placeholder.email"),
                text: $email,
                error: emailError,
                contentType: .emailAddress,
                disabled: isLoading
            )

            AuthTextField(
                label: translations.t("auth.form.password"),
                placeholder: translations.t("auth.placeholder.password"),
                text: $password,
                error: passwordError,
                isSecure: true,
                contentType: .password,
                disabled: isLoading
            )

            if let errorMessage {
                AppAlert(message: errorMessage)
            }

            Button(isLoading ? translations.t("auth.button.signingIn") : translations.t("auth.button.signin")) {
                signIn()
            }
            .buttonStyle(AppButtonStyle(variant: .primary, fullWidth: true, cornerRadius: authButtonCornerRadius))
            .disabled(isLoading)

            Button(translations.t("auth.button.forgotPassword")) {
                onShowReset()
            }
            .buttonStyle(AppButtonStyle(variant: .secondary, fullWidth: true, cornerRadius: authButtonCornerRadius))
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
            logException(operation: "auth_sign_in", errorCategory: "timeout")
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
    @Binding var email: String
    @EnvironmentObject var translations: Translations
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var emailError: String?
    @State private var passwordError: String?
    @State private var confirmPasswordError: String?
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 16) {
            AuthTextField(
                label: translations.t("auth.form.email"),
                placeholder: translations.t("auth.placeholder.email"),
                text: $email,
                error: emailError,
                contentType: .emailAddress,
                disabled: isLoading
            )

            AuthTextField(
                label: translations.t("auth.form.password"),
                placeholder: translations.t("auth.placeholder.password"),
                text: $password,
                error: passwordError,
                isSecure: true,
                contentType: .newPassword,
                disabled: isLoading
            )

            AuthTextField(
                label: translations.t("auth.form.confirmPassword"),
                placeholder: translations.t("auth.placeholder.password"),
                text: $confirmPassword,
                error: confirmPasswordError,
                isSecure: true,
                contentType: .newPassword,
                disabled: isLoading
            )

            if let errorMessage {
                AppAlert(message: errorMessage)
            }

            Button(isLoading ? translations.t("auth.button.signingUp") : translations.t("auth.button.signup")) {
                signUp()
            }
            .buttonStyle(AppButtonStyle(variant: .primary, fullWidth: true, cornerRadius: authButtonCornerRadius))
            .disabled(isLoading)
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
        var didComplete = false
        let normalizedLanguage = normalizeLanguageCode(language)
        let auth = Auth.auth()
        let db = Firestore.firestore()

        let timeoutTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: UInt64(authSignInTimeoutSeconds * 1_000_000_000))
            guard !Task.isCancelled, !didComplete else { return }
            didComplete = true
            isLoading = false
            logException(operation: "auth_sign_up", errorCategory: "timeout")
            errorMessage = translations.t("auth.error.general")
        }

        auth.createUser(withEmail: trimmedEmail, password: password) { result, error in
            Task { @MainActor in
                guard !didComplete else { return }

                if let error {
                    didComplete = true
                    timeoutTask.cancel()
                    isLoading = false
                    errorMessage = resolveAuthErrorMessage(translations: translations, error: error)
                    return
                }

                guard let uid = result?.user.uid else {
                    didComplete = true
                    timeoutTask.cancel()
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
                    "autoSort": true,
                    "startupView": "taskList",
                    "createdAt": now,
                    "updatedAt": now,
                ], forDocument: db.collection("settings").document(uid))
                batch.setData([
                    "id": taskListId,
                    "name": translations.t("app.initialTaskListName"),
                    "tasks": [:],
                    "history": [],
                    "shareCode": NSNull(),
                    "background": NSNull(),
                    "memberCount": 1,
                    "createdAt": now,
                    "updatedAt": now,
                ], forDocument: db.collection("taskLists").document(taskListId))
                batch.setData([
                    "joinedAt": now,
                    "joinCode": NSNull(),
                ], forDocument: db.collection("taskLists").document(taskListId).collection("members").document(uid))
                batch.setData([
                    taskListId: ["order": 1.0],
                    "createdAt": now,
                    "updatedAt": now,
                ], forDocument: db.collection("taskListOrder").document(uid))
                do {
                    try await batch.commit()
                    guard !didComplete else { return }
                    didComplete = true
                    timeoutTask.cancel()
                    isLoading = false
                    logSignUp()
                } catch {
                    guard !didComplete else { return }
                    didComplete = true
                    timeoutTask.cancel()
                    isLoading = false
                    errorMessage = resolveAuthErrorMessage(translations: translations, error: error)
                }
            }
        }
    }
}

private struct PasswordResetRequestView: View {
    let language: String
    @Binding var email: String
    let onBackToSignIn: () -> Void
    @EnvironmentObject var translations: Translations
    @State private var emailError: String?
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 16) {
            if let successMessage {
                AppAlert(message: successMessage, variant: .success)
            } else {
                Text(translations.t("auth.passwordReset.instruction"))
                    .font(AppTypography.subheadline())
                    .foregroundStyle(AppPalette.mutedText)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)

                AuthTextField(
                    label: translations.t("auth.form.email"),
                    placeholder: translations.t("auth.placeholder.email"),
                    text: $email,
                    error: emailError,
                    contentType: .emailAddress,
                    disabled: isLoading
                )

                if let errorMessage {
                    AppAlert(message: errorMessage)
                }

                Button(isLoading ? translations.t("auth.button.sending") : translations.t("auth.button.sendResetEmail")) {
                    sendResetEmail()
                }
                .buttonStyle(AppButtonStyle(variant: .primary, fullWidth: true, cornerRadius: authButtonCornerRadius))
                .disabled(isLoading)
            }

            Button(translations.t("auth.button.backToSignIn")) {
                onBackToSignIn()
            }
            .buttonStyle(AppButtonStyle(variant: .secondary, fullWidth: true, cornerRadius: authButtonCornerRadius))
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
                    AppAlert(message: successMessage, variant: .success)
                } else {
                    AuthTextField(
                        label: translations.t("auth.passwordReset.newPassword"),
                        placeholder: translations.t("auth.placeholder.password"),
                        text: $newPassword,
                        isSecure: true,
                        contentType: .newPassword,
                        disabled: isVerifying || isSubmitting
                    )

                    AuthTextField(
                        label: translations.t("auth.passwordReset.confirmNewPassword"),
                        placeholder: translations.t("auth.placeholder.password"),
                        text: $confirmPassword,
                        isSecure: true,
                        contentType: .newPassword,
                        disabled: isVerifying || isSubmitting
                    )
                }

                if let errorMessage {
                    AppAlert(message: errorMessage)
                }

                if isVerifying {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                }

                if successMessage == nil {
                    Button(isSubmitting ? translations.t("auth.passwordReset.settingNewPassword") : translations.t("auth.passwordReset.setNewPassword")) {
                        submit()
                    }
                    .buttonStyle(AppButtonStyle(variant: .primary, fullWidth: true, cornerRadius: authButtonCornerRadius))
                    .disabled(isFormDisabled)
                }

                Button(translations.t("common.close")) {
                    onDismiss()
                }
                .buttonStyle(AppButtonStyle(variant: .secondary, fullWidth: true, cornerRadius: authButtonCornerRadius))
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

@MainActor
private final class DragAutoScroller {
    static let edgeZone: CGFloat = 80
    static let maxSpeed: CGFloat = 8
    private static let frameInterval = 1.0 / 60.0

    private var timer: Timer?
    private var speed: CGFloat = 0

    func update(
        fingerY: CGFloat,
        scrollView: UIScrollView?,
        isActive: @escaping @MainActor @Sendable () -> Bool,
        onScroll: @escaping @MainActor @Sendable (CGFloat) -> Void
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
            let nextTimer = Timer(timeInterval: Self.frameInterval, repeats: true) { [weak self, weak scrollView] _ in
                MainActor.assumeIsolated {
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
            }
            RunLoop.main.add(nextTimer, forMode: .common)
            timer = nextTimer
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

private struct TaskListColorPicker: View {
    @EnvironmentObject var translations: Translations
    let selected: String?
    let onSelect: (String?) -> Void

    var body: some View {
        HStack(spacing: 4) {
            ForEach(taskListColorOptions.indices, id: \.self) { index in
                let color = taskListColorOptions[index]
                let isSelected = selected == color
                Button { onSelect(color) } label: {
                    Circle()
                        .fill(color.flatMap { Color(hex: $0) } ?? AppPalette.pageBackground)
                        .overlay(
                            Circle().strokeBorder(
                                color == nil ? AppPalette.todayRing : Color.black.opacity(0.08),
                                lineWidth: 1
                            )
                        )
                        .frame(width: 32, height: 32)
                        .padding(4)
                        .overlay(
                            Circle()
                                .strokeBorder(AppPalette.primary, lineWidth: 2)
                                .opacity(isSelected ? 1 : 0)
                        )
                        .frame(width: 44, height: 44)
                        .contentShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(colorLabel(color, translations: translations))
                .accessibilityAddTraits(isSelected ? [.isSelected] : [])
            }
        }
    }
}

private struct TaskListsView: View {
    @Binding var path: [AppRoute]
    @Binding var pendingShareCode: String?
    let isLoggedIn: Bool
    let currentUserId: String?
    let selectedTaskListId: String?
    let isCalendarActive: Bool
    let isSettingsActive: Bool
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
    @State private var dragStartTaskListIds: [String] = []
    @State private var pendingTaskListOrder: [TaskListSummary]? = nil
    @State private var taskListOrderMutationRevision = 0
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
        isCalendarActive: Bool = false,
        isSettingsActive: Bool = false,
        onSelectTaskList: ((String) -> Void)? = nil,
        onOpenSettings: (() -> Void)? = nil,
        onOpenCalendar: (() -> Void)? = nil
    ) {
        _path = path
        _pendingShareCode = pendingShareCode
        self.isLoggedIn = isLoggedIn
        self.currentUserId = currentUserId
        self.selectedTaskListId = selectedTaskListId
        self.isCalendarActive = isCalendarActive
        self.isSettingsActive = isSettingsActive
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

        let spacing: CGFloat = 0

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
                    triggerSelectionFeedback()
                    self.dragStartLocationY = (self.dragStartLocationY ?? 0) - correction
                }
            }
        )
    }

    private func stopAutoScroll() {
        autoScroller.stop()
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
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    HStack(spacing: 10) {
                        BrandLogo(size: 24)
                        Text(translations.t("title"))
                            .font(AppTypography.brand())
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                    }
                    .padding(.leading, 12)
                    .accessibilityElement(children: .combine)
                    .accessibilityAddTraits(.isHeader)

                    Spacer(minLength: 0)

                    Group {
                        if let onOpenSettings {
                            Button(action: onOpenSettings) {
                                settingsIcon
                            }
                        } else {
                            NavigationLink(value: AppRoute.settings) {
                                settingsIcon
                            }
                        }
                    }
                    .buttonStyle(AppIconButtonStyle(size: 48))
                    .background(
                        isSettingsActive ? AppPalette.rowActive : Color.clear,
                        in: RoundedRectangle(cornerRadius: AppMetrics.controlCornerRadius, style: .continuous)
                    )
                    .accessibilityLabel(translations.t("settings.title"))
                    .accessibilityAddTraits(isSettingsActive ? [.isSelected] : [])
                }
                .frame(minHeight: 48)

                Button {
                    openCalendar()
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "calendar")
                            .font(.system(size: 17, weight: .medium))
                            .frame(width: 20)
                        Text(translations.t("app.calendar"))
                            .font(isCalendarActive ? AppTypography.subheadlineSemibold() : AppTypography.subheadlineMedium())
                            .lineLimit(1)
                    }
                    .foregroundStyle(isCalendarActive ? Color.primary : AppPalette.fieldLabel)
                    .padding(.horizontal, 12)
                    .frame(maxWidth: .infinity, minHeight: AppMetrics.controlHeight, alignment: .leading)
                    .background(
                        isCalendarActive ? AppPalette.rowActive : Color.clear,
                        in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                    )
                    .contentShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isCalendarActive ? [.isSelected] : [])

                VStack(alignment: .leading, spacing: 0) {
                    Text(translations.t("app.drawerTitle"))
                        .font(AppTypography.captionSemibold())
                        .foregroundStyle(AppPalette.subtleText)
                        .padding(.horizontal, 12)
                        .padding(.top, 8)
                        .padding(.bottom, 4)
                        .accessibilityAddTraits(.isHeader)

                    if viewModel.status == .loading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 96)
                    } else if viewModel.status == .error {
                        AppAlert(message: translations.t("app.loadError"))
                    } else if viewModel.taskLists.isEmpty {
                        Text(translations.t("app.emptyState"))
                            .font(AppTypography.subheadline())
                            .foregroundStyle(AppPalette.subtleText)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                    } else {
                        VStack(spacing: 0) {
                            ScrollViewAccessor(scrollView: $scrollViewRef)
                                .frame(width: 0, height: 0)
                            ForEach(displayTaskLists) { taskList in
                                taskListRow(taskList)
                            }
                        }
                        .coordinateSpace(name: "taskListList")
                        .onPreferenceChange(TaskListRowFrameKey.self) { heights in
                            if taskListItemHeights != heights {
                                taskListItemHeights = heights
                            }
                        }
                    }

                    HStack(spacing: 8) {
                        Button {
                            createName = ""
                            createBackground = nil
                            showCreateSheet = true
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "plus")
                                    .font(.system(size: 15, weight: .semibold))
                                Text(translations.t("app.createNew"))
                            }
                        }
                        .buttonStyle(AppButtonStyle(variant: .tonal, fullWidth: true))

                        Button {
                            joinListInput = ""
                            joinListError = nil
                            showJoinSheet = true
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "link")
                                    .font(.system(size: 15, weight: .semibold))
                                Text(translations.t("app.joinList"))
                            }
                        }
                        .buttonStyle(AppButtonStyle(variant: .tonal, fullWidth: true))
                    }
                    .padding(.top, 12)
                }
            }
            .padding(16)
        }
        .scrollBounceBehavior(.basedOnSize)
        .background(AppPalette.cardSurface.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            viewModel.bind(uid: currentUserId)
        }
        .onChange(of: currentUserId) { _, nextUid in
            viewModel.bind(uid: nextUid)
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

            if isCalendarActive || isSettingsActive {
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
            AppDialog(title: translations.t("app.createTaskList")) {
                VStack(alignment: .leading, spacing: 20) {
                    AppFormField(label: translations.t("app.taskListName")) {
                        TextField(
                            "",
                            text: $createName,
                            prompt: Text(translations.t("app.taskListNamePlaceholder")).foregroundStyle(AppPalette.placeholder)
                        )
                        .submitLabel(.done)
                        .onSubmit(submitCreateTaskList)
                        .appField()
                    }
                    AppFormField(label: translations.t("taskList.selectColor")) {
                        TaskListColorPicker(selected: createBackground) { createBackground = $0 }
                    }
                }
            } footerLeading: {
                EmptyView()
            } footerTrailing: {
                Button(translations.t("app.cancel")) { showCreateSheet = false }
                    .buttonStyle(AppButtonStyle(variant: .secondary))
                Button(translations.t("app.create")) { submitCreateTaskList() }
                    .buttonStyle(AppButtonStyle(variant: .primary))
                    .disabled(createName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .sheet(isPresented: $showJoinSheet) {
            AppDialog(
                title: translations.t("app.joinListTitle"),
                description: translations.t("app.joinListDescription")
            ) {
                VStack(alignment: .leading, spacing: 20) {
                    if let error = joinListError {
                        AppAlert(message: error)
                    }
                    AppFormField(label: translations.t("taskList.shareCode")) {
                        TextField(
                            "",
                            text: $joinListInput,
                            prompt: Text(translations.t("app.shareCodePlaceholder")).foregroundStyle(AppPalette.placeholder)
                        )
                        .textInputAutocapitalization(.characters)
                        .disableAutocorrection(true)
                        .submitLabel(.join)
                        .onSubmit(submitJoinList)
                        .appField()
                    }
                }
            } footerLeading: {
                EmptyView()
            } footerTrailing: {
                Button(translations.t("app.cancel")) { showJoinSheet = false }
                    .buttonStyle(AppButtonStyle(variant: .secondary))
                    .disabled(joiningList)
                Button(joiningList ? translations.t("app.joining") : translations.t("app.join")) { submitJoinList() }
                    .buttonStyle(AppButtonStyle(variant: .primary))
                    .disabled(joinListInput.trimmingCharacters(in: .whitespaces).isEmpty || joiningList)
            }
        }
    }

    private var settingsIcon: some View {
        Image(systemName: "gearshape")
            .font(.system(size: AppIconMetrics.standardActionIconSize, weight: .medium))
            .foregroundStyle(isSettingsActive ? Color.primary : AppPalette.mutedText)
    }

    private func taskListRow(_ taskList: TaskListSummary) -> some View {
        let isSelected = selectedTaskListId == taskList.id
        let countLabel = translations.t("taskList.remainingCount", ["count": "\(taskList.remainingTaskCount)"])
        return HStack(spacing: 0) {
            Button {
                if draggingTaskListId == nil {
                    openTaskList(taskList.id)
                }
            } label: {
                HStack(spacing: 12) {
                    ListColorDot(background: taskList.background)
                        .frame(width: 20)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(taskList.name)
                            .font(isSelected ? AppTypography.subheadlineSemibold() : AppTypography.subheadlineMedium())
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                        Text(countLabel)
                            .font(AppTypography.caption())
                            .foregroundStyle(AppPalette.subtleText)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.leading, 12)
                .padding(.vertical, 6)
                .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(taskList.name)、\(countLabel)")
            .accessibilityAddTraits(isSelected ? [.isSelected] : [])

            DragHandleIcon()
                .foregroundStyle(AppPalette.subtleIcon)
                .frame(width: 40, height: 44)
                .contentShape(Rectangle())
                .accessibilityLabel(translations.t("app.dragHint"))
                .accessibilityActions {
                    if displayTaskLists.first?.id != taskList.id {
                        Button(translations.t("a11y.moveUp")) { moveTaskList(taskList, by: -1) }
                    }
                    if displayTaskLists.last?.id != taskList.id {
                        Button(translations.t("a11y.moveDown")) { moveTaskList(taskList, by: 1) }
                    }
                }
                .focusable()
                .onKeyPress(keys: [.upArrow, .downArrow]) { press in
                    guard press.modifiers.contains(.option) else { return .ignored }
                    moveTaskList(taskList, by: press.key == .upArrow ? -1 : 1)
                    return .handled
                }
                .gesture(
                    DragGesture(minimumDistance: 2, coordinateSpace: .named("taskListList"))
                        .onChanged { value in
                            if draggingTaskListId == nil {
                                triggerMediumImpact()
                                draggingTaskListId = taskList.id
                                let currentTaskLists = displayTaskLists
                                dragStartTaskListIds = currentTaskLists.map(\.id)
                                dragOrderedTaskLists = currentTaskLists
                                dragStartLocationY = value.location.y
                            }
                            guard let startY = dragStartLocationY else { return }
                            dragOffset = value.location.y - startY
                            let correction = checkTaskListSwap()
                            if correction != 0 {
                                triggerSelectionFeedback()
                                dragStartLocationY = startY - correction
                            }
                            updateAutoScroll(fingerY: value.location.y)
                        }
                        .onEnded { _ in
                            stopAutoScroll()
                            if let ordered = dragOrderedTaskLists,
                               ordered.map(\.id) != dragStartTaskListIds {
                                persistTaskListOrder(ordered.map(\.id))
                            }
                            dragOrderedTaskLists = nil
                            dragStartTaskListIds = []
                            withAnimation(reduceMotion ? .none : .easeInOut(duration: 0.15)) {
                                dragOffset = 0
                            }
                            dragStartLocationY = nil
                            draggingTaskListId = nil
                        }
                )
        }
        .background(
            isSelected ? AppPalette.rowActive : Color.clear,
            in: RoundedRectangle(cornerRadius: 10, style: .continuous)
        )
        .offset(y: draggingTaskListId == taskList.id ? dragOffset : 0)
        .zIndex(draggingTaskListId == taskList.id ? 1 : 0)
        .opacity(draggingTaskListId == taskList.id ? 0.8 : 1.0)
        .scaleEffect(draggingTaskListId == taskList.id ? 1.03 : 1.0)
        .animation(draggingTaskListId == taskList.id || reduceMotion ? nil : .spring(response: 0.22, dampingFraction: 0.86),
                   value: displayTaskLists.map(\.id))
        .background(GeometryReader { geo in
            Color.clear.preference(
                key: TaskListRowFrameKey.self,
                value: [taskList.id: geo.size.height]
            )
        })
    }

    private func submitCreateTaskList() {
        let trimmed = createName.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty {
            createTaskList(name: trimmed, background: createBackground)
        }
    }

    private func submitJoinList() {
        guard !joiningList, !joinListInput.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        Task {
            guard let code = normalizedShareCode(joinListInput) else {
                joinListError = translations.t("pages.sharecode.notFound")
                return
            }
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
                try await addSharedTaskListToOrder(taskListId: taskListId, joinCode: code)
                logShareCodeJoin()
                showJoinSheet = false
                openTaskList(taskListId)
            } catch {
                joinListError = error.localizedDescription
            }
            joiningList = false
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
        taskListOrderMutationRevision += 1
        let mutationRevision = taskListOrderMutationRevision
        var updateFields: [String: Any] = ["updatedAt": nowMillis()]
        for (i, id) in ids.enumerated() {
            updateFields["\(id).order"] = Double(i + 1)
        }
        let updates = updateFields
        pendingTaskListOrder = displayTaskLists
        TaskListMutationQueues.queue(for: "taskListOrder:\(uid)").enqueue({ completion in
            Firestore.firestore().collection("taskListOrder").document(uid).updateData(updates, completion: completion)
        }, onError: {
            if taskListOrderMutationRevision == mutationRevision {
                pendingTaskListOrder = nil
            }
        }, onIdle: {
            if taskListOrderMutationRevision == mutationRevision {
                pendingTaskListOrder = nil
            }
        })
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
            "joinedAt": nowMillis(),
            "joinCode": NSNull(),
        ], forDocument: db.collection("taskLists").document(taskListId).collection("members").document(uid))
        batch.setData([
            "\(taskListId)": ["order": newOrder],
            "updatedAt": nowMillis(),
        ] as [String: Any], forDocument: db.collection("taskListOrder").document(uid), merge: true)

        batch.commit { error in
            Task { @MainActor in
                if error == nil {
                    logTaskListCreate()
                    showCreateSheet = false
                    openTaskList(taskListId)
                }
            }
        }
    }

    private func consumePendingShareCode(_ shareCode: String?) {
        guard isLoggedIn, let shareCode else {
            return
        }

        guard let normalized = normalizedShareCode(shareCode) else {
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
                    try await addSharedTaskListToOrder(taskListId: taskListId, joinCode: normalized)
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
    @FocusState private var focusedNewTaskListId: String?
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
                        autoSort: autoSort,
                        focusedNewTaskListId: $focusedNewTaskListId
                    )
                    .tag(taskList.id)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .onChange(of: selectedTaskListId) { previousTaskListId, nextTaskListId in
                if focusedNewTaskListId == previousTaskListId {
                    focusedNewTaskListId = nextTaskListId
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .safeAreaInset(edge: .top, spacing: 0) {
            TaskListTopChrome(
                showBackButton: showBackButton,
                taskLists: taskLists,
                selectedIndex: selectedTaskListIndex,
                onSelect: { selectedTaskListId = $0 },
                onBack: onBack
            )
        }
        .background(backgroundView)
    }

    @ViewBuilder
    private var backgroundView: some View {
        let background = resolveTaskListBackgroundColor(currentTaskList?.background)
        if ignoresSafeAreaBackground {
            background.ignoresSafeArea()
        } else {
            background.ignoresSafeArea(edges: .vertical)
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
    @ObservedObject private var autoSortOverrides = AutoSortOverrideStore.shared

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
                    AppAlert(message: translations.t("app.loadError"))
                        .padding(.horizontal, 16)
                    Spacer()
                }
            } else if viewModel.taskLists.isEmpty {
                VStack {
                    Spacer()
                    Text(translations.t("pages.tasklist.noTasks"))
                        .foregroundStyle(AppPalette.mutedText)
                    Spacer()
                }
            } else {
                DetailPagerContent(
                    selectedTaskListId: $selectedTaskListId,
                    taskLists: viewModel.taskLists,
                    taskInsertPosition: settingsViewModel.settings?.taskInsertPosition ?? "top",
                    autoSort: autoSortOverrides.value(
                        for: currentUserId,
                        fallback: settingsViewModel.settings?.autoSort ?? true
                    ),
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
    @ObservedObject private var autoSortOverrides = AutoSortOverrideStore.shared

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
                    AppAlert(message: translations.t("app.loadError"))
                        .padding(.horizontal, 16)
                    Spacer()
                }
            } else if viewModel.taskLists.isEmpty {
                VStack {
                    Spacer()
                    Text(translations.t("app.emptyState"))
                        .foregroundStyle(AppPalette.mutedText)
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
                    autoSort: autoSortOverrides.value(
                        for: currentUserId,
                        fallback: settingsViewModel.settings?.autoSort ?? true
                    ),
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
    static let defaultValue: [String: CGFloat] = [:]
    static func reduce(value: inout [String: CGFloat], nextValue: () -> [String: CGFloat]) {
        value.merge(nextValue()) { $1 }
    }
}

private struct TaskListRowFrameKey: PreferenceKey {
    static let defaultValue: [String: CGFloat] = [:]
    static func reduce(value: inout [String: CGFloat], nextValue: () -> [String: CGFloat]) {
        value.merge(nextValue()) { $1 }
    }
}

private struct TaskListDetailPage: View {
    private let completedTaskOpacity = 0.55
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let taskList: TaskListDetail
    let taskInsertPosition: String
    let autoSort: Bool
    let allowsTaskEditing: Bool
    let allowsTaskListDeletion: Bool
    let allowsShareCodeManagement: Bool
    @FocusState.Binding var focusedNewTaskListId: String?
    @State private var newTaskText = ""
    @State private var editingTaskId: String? = nil
    @State private var editingText: String = ""
    @State private var actionSheetState: ActionSheetState? = nil
    @State private var showDeleteCompletedAlert = false
    @State private var draggingTaskId: String? = nil
    @State private var taskDragOffset: CGFloat = 0
    @State private var taskDragStartLocationY: CGFloat? = nil
    @State private var dragOrderedTasks: [TaskSummary]? = nil
    @State private var dragStartTaskIds: [String] = []
    @State private var pendingDisplayTasks: [TaskSummary]? = nil
    @State private var pendingHistory: [String]? = nil
    @State private var taskMutationRevision = 0
    @State private var taskMutationErrorRevision: Int?
    @State private var taskMutationError: String?
    @State private var isTaskMutationSaving = false
    @State private var exitingTaskIds: Set<String> = []
    @State private var taskItemHeights: [String: CGFloat] = [:]
    @State private var taskAutoScroller = DragAutoScroller()
    @State private var taskScrollViewRef: UIScrollView? = nil
    private var mutationQueue: TaskListMutationQueue {
        TaskListMutationQueues.queue(for: taskList.id)
    }
    @FocusState private var isTextFieldFocused: Bool
    private let db = Firestore.firestore()

    init(
        taskList: TaskListDetail,
        taskInsertPosition: String,
        autoSort: Bool,
        focusedNewTaskListId: FocusState<String?>.Binding,
        allowsTaskEditing: Bool = true,
        allowsTaskListDeletion: Bool = true,
        allowsShareCodeManagement: Bool = true
    ) {
        self.taskList = taskList
        self.taskInsertPosition = taskInsertPosition
        self.autoSort = autoSort
        self.allowsTaskEditing = allowsTaskEditing
        self.allowsTaskListDeletion = allowsTaskListDeletion
        self.allowsShareCodeManagement = allowsShareCodeManagement
        self._focusedNewTaskListId = focusedNewTaskListId
    }

    private var isNewTaskFocused: Bool {
        focusedNewTaskListId == taskList.id
    }

    private func dismissNewTaskInputFocus() {
        if isNewTaskFocused {
            focusedNewTaskListId = nil
        }
    }

    private var displayTasks: [TaskSummary] {
        if let dragOrderedTasks { return dragOrderedTasks }
        if let pendingDisplayTasks { return pendingDisplayTasks }
        return autoSort ? getDisplayOrderedTasks(taskList.tasks) : getOrderOrderedTasks(taskList.tasks)
    }

    private var displayHistory: [String] {
        pendingHistory ?? taskList.history
    }

    private func checkTaskSwap() -> CGFloat {
        guard var ordered = dragOrderedTasks,
              let draggingId = draggingTaskId,
              let currentIdx = ordered.firstIndex(where: { $0.id == draggingId }),
              let currentHeight = taskItemHeights[draggingId] else { return 0 }

        let spacing = TaskListDetailMetrics.taskRowGap

        if currentIdx + 1 < ordered.count {
            let nextId = ordered[currentIdx + 1].id
            let nextHeight = taskItemHeights[nextId] ?? currentHeight
            let threshold = currentHeight / 2 + spacing + nextHeight / 2
            if canReorderTasks(ordered[currentIdx], ordered[currentIdx + 1], autoSort: autoSort),
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
            if canReorderTasks(ordered[currentIdx], ordered[currentIdx - 1], autoSort: autoSort),
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
                    triggerSelectionFeedback()
                    self.taskDragStartLocationY = (self.taskDragStartLocationY ?? 0) - correction
                }
            }
        )
    }

    private func handleTaskDragChanged(task: TaskSummary, displayTasks: [TaskSummary], fingerY: CGFloat) {
        if draggingTaskId == nil {
            triggerMediumImpact()
            draggingTaskId = task.id
            dragOrderedTasks = displayTasks
            dragStartTaskIds = displayTasks.map(\.id)
            taskDragStartLocationY = fingerY
        }
        guard let startY = taskDragStartLocationY else { return }
        taskDragOffset = fingerY - startY
        let correction = checkTaskSwap()
        if correction != 0 {
            triggerSelectionFeedback()
            taskDragStartLocationY = startY - correction
        }
        updateTaskAutoScroll(fingerY: fingerY)
    }

    private func stopTaskAutoScroll() {
        taskAutoScroller.stop()
    }

    @MainActor private static var dateDisplayFormatters: [String: DateFormatter] = [:]

    private static func dateDisplayFormatter(for language: String) -> DateFormatter {
        let identifier = localeIdentifier(for: language)
        if let formatter = dateDisplayFormatters[identifier] {
            return formatter
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: identifier)
        formatter.calendar = currentGregorianCalendar(locale: formatter.locale)
        formatter.timeZone = .autoupdatingCurrent
        formatter.setLocalizedDateFormatFromTemplate("MMMEd")
        dateDisplayFormatters[identifier] = formatter
        return formatter
    }

    private func formatDateDisplay(_ dateStr: String) -> String {
        guard let date = parseTaskInputDate(dateStr) else { return dateStr }
        return Self.dateDisplayFormatter(for: translations.language).string(from: date)
    }

    @ViewBuilder
    private func completionButton(_ task: TaskSummary) -> some View {
        let strokeWidth = task.completed ? 0.0 : 1.0
        let fillColor = task.completed ? AppPalette.border : Color.clear
        let accessibilityLabel = translations.t(task.completed ? "pages.tasklist.markIncomplete" : "pages.tasklist.markComplete")

        Button {
            triggerLightImpact()
            toggleCompletion(task)
        } label: {
            ZStack {
                Circle()
                    .strokeBorder(AppPalette.subtleIcon, lineWidth: strokeWidth)
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
        .disabled(!allowsTaskEditing)
        .alignmentGuide(.taskRowContentCenter) { dimensions in
            dimensions[VerticalAlignment.center]
        }
        .accessibilityLabel(accessibilityLabel)
    }

    private func setPendingTasks(_ tasks: [TaskSummary]) {
        withAnimation(reduceMotion ? .none : .spring(response: 0.24, dampingFraction: 0.86)) {
            pendingDisplayTasks = tasks
        }
    }

    private func updateTaskList(_ updates: [String: Any], onSuccess: @escaping () -> Void = {}) {
        taskMutationRevision += 1
        let mutationRevision = taskMutationRevision
        taskMutationErrorRevision = nil
        taskMutationError = nil
        isTaskMutationSaving = true
        if let history = updates["history"] as? [String] {
            pendingHistory = history
        }
        mutationQueue.enqueue({ completion in
            db.collection("taskLists").document(taskList.id).updateData(updates, completion: completion)
        }, onError: {
            if taskMutationRevision == mutationRevision {
                pendingDisplayTasks = nil
                pendingHistory = nil
                taskMutationErrorRevision = mutationRevision
                taskMutationError = translations.t("common.error")
                isTaskMutationSaving = false
            }
        }, onIdle: {
            if taskMutationRevision == mutationRevision {
                pendingDisplayTasks = nil
                pendingHistory = nil
                isTaskMutationSaving = false
                if taskMutationErrorRevision != mutationRevision {
                    onSuccess()
                }
            }
        })
    }

    private func performTaskMutation(
        buildNextTasks: ([TaskSummary]) -> [TaskSummary],
        additionalUpdates: [String: Any] = [:],
        onSuccess: @escaping @MainActor @Sendable () -> Void = {}
    ) {
        let previousTasks = displayTasks
        let nextTasks = normalizeTasks(buildNextTasks(previousTasks), autoSort: autoSort)
        setPendingTasks(nextTasks)
        var updates = buildTaskUpdateData(previousTasks: previousTasks, tasks: nextTasks)
        additionalUpdates.forEach { updates[$0.key] = $0.value }
        updateTaskList(updates, onSuccess: onSuccess)
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
                let orderSnapshot = try await taskListOrderRef.getDocument(source: .server)
                let taskListSnapshot = try await taskListRef.getDocument(source: .server)
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

                try await removeTaskListMembership(
                    db: db,
                    taskListOrderRef: taskListOrderRef,
                    taskListId: taskList.id,
                    taskListSnapshot: taskListSnapshot,
                    shareCodeDocumentId: (taskListSnapshot.data()?["shareCode"] as? String)
                        .flatMap(normalizedShareCode)
                )

                await MainActor.run {
                    TaskListMutationQueues.remove(for: taskList.id)
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
        for candidate in displayHistory {
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
                .foregroundStyle(AppPalette.subtleIcon)
                .frame(width: TaskListDetailMetrics.dragTouchWidth, height: TaskListDetailMetrics.dragTouchHeight)
                .alignmentGuide(.taskRowContentCenter) { dimensions in
                    dimensions[VerticalAlignment.center]
                }
                .contentShape(Rectangle())
                .accessibilityLabel(translations.t("app.dragHint"))
                .accessibilityActions {
                    if allowsTaskEditing {
                        if let index = displayTasks.firstIndex(where: { $0.id == task.id }),
                           index > 0,
                           canReorderTasks(task, displayTasks[index - 1], autoSort: autoSort) {
                            Button(translations.t("a11y.moveUp")) { moveTask(task, by: -1) }
                        }
                        if let index = displayTasks.firstIndex(where: { $0.id == task.id }),
                           index + 1 < displayTasks.count,
                           canReorderTasks(task, displayTasks[index + 1], autoSort: autoSort) {
                            Button(translations.t("a11y.moveDown")) { moveTask(task, by: 1) }
                        }
                    }
                }
                .focusable()
                .disabled(!allowsTaskEditing)
                .onKeyPress(keys: [.upArrow, .downArrow]) { press in
                    guard press.modifiers.contains(.option) else { return .ignored }
                    moveTask(task, by: press.key == .upArrow ? -1 : 1)
                    return .handled
                }
                .gesture(
                    DragGesture(minimumDistance: 2, coordinateSpace: .named("taskList"))
                        .onChanged { value in
                            handleTaskDragChanged(task: task, displayTasks: displayTasks, fingerY: value.location.y)
                        }
                        .onEnded { _ in
                            stopTaskAutoScroll()
                            if let ordered = dragOrderedTasks,
                               ordered.map(\.id) != dragStartTaskIds {
                                persistTaskOrder(ordered.map(\.id))
                            }
                            dragOrderedTasks = nil
                            dragStartTaskIds = []
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
                        .font(AppTypography.caption())
                        .foregroundStyle(AppPalette.subtleText)
                        .padding(.bottom, TaskListDetailMetrics.taskDateBottomSpacing)
                }

                Group {
                    if editingTaskId == task.id {
                        TextField("", text: $editingText)
                            .focused($isTextFieldFocused)
                            .onSubmit { commitEdit(task) }
                            .font(AppTypography.bodyMedium())
                    } else {
                        Button { startEdit(task) } label: {
                            Text(task.text)
                                .font(task.pinned && !task.completed ? AppTypography.bodyBold() : AppTypography.bodyMedium())
                                .strikethrough(task.completed)
                                .foregroundStyle(task.completed ? AppPalette.mutedText : Color.primary)
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.plain)
                        .disabled(!allowsTaskEditing)
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
                .foregroundStyle(task.pinned ? Color.primary : AppPalette.subtleIcon)
                .contentTransition(reduceMotion ? .identity : .symbolEffect(.replace))
                .animation(reduceMotion ? nil : .easeInOut(duration: 0.2), value: task.pinned)
                .frame(width: TaskListDetailMetrics.trailingDateButtonWidth, height: TaskListDetailMetrics.trailingDateButtonHeight)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(!allowsTaskEditing)
            .padding(.trailing, -TaskListDetailMetrics.edgeActionOverhang)
            .alignmentGuide(.taskRowContentCenter) { dimensions in
                dimensions[VerticalAlignment.center]
            }
            .accessibilityLabel(task.pinned ? translations.t("pages.tasklist.unpinTask") : translations.t("pages.tasklist.setDate"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, TaskListDetailMetrics.taskRowVerticalPadding)
        .offset(y: draggingTaskId == task.id ? taskDragOffset : 0)
        .zIndex(draggingTaskId == task.id ? 1 : 0)
        .opacity(
            (draggingTaskId == task.id ? 0.8 : 1.0)
                * (task.completed ? completedTaskOpacity : 1.0)
                * (exitingTaskIds.contains(task.id) ? 0 : 1)
        )
        .scaleEffect(draggingTaskId == task.id ? 1.03 : 1.0)
        .animation(draggingTaskId == task.id || reduceMotion ? nil : .spring(response: 0.22, dampingFraction: 0.86),
                   value: displayTasks.map(\.id))
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.18), value: task.completed)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: exitingTaskIds.contains(task.id))
        .transition(reduceMotion ? .identity : .asymmetric(
            insertion: .opacity.combined(with: .move(edge: .top)),
            removal: .opacity.animation(.easeOut(duration: 0.12))
        ))
        .background(GeometryReader { geo in
            Color.clear.preference(
                key: RowFrameKey.self,
                value: [task.id: geo.size.height]
            )
        })
        .simultaneousGesture(
            TapGesture().onEnded {
                dismissNewTaskInputFocus()
            }
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ScrollViewAccessor(scrollView: $taskScrollViewRef)
                    .frame(width: 0, height: 0)

                VStack(alignment: .leading, spacing: TaskListDetailMetrics.sectionSpacing) {
                    HStack(spacing: 12) {
                        Text(taskList.name)
                            .font(AppTypography.sectionTitle())
                            .fixedSize(horizontal: false, vertical: true)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .accessibilityAddTraits(.isHeader)
                        HStack(spacing: 0) {
                            if allowsTaskEditing {
                                Button { editName = taskList.name; editBackground = taskList.background; removeListError = nil; showEditSheet = true } label: {
                                    Image(systemName: "pencil")
                                        .font(.system(size: TaskListDetailMetrics.headerIconSize, weight: .medium))
                                        .foregroundStyle(.primary)
                                }
                                .buttonStyle(AppIconButtonStyle(size: TaskListDetailMetrics.headerIconButtonSize))
                                .accessibilityLabel(translations.t("taskList.editDetails"))
                            }
                            if allowsShareCodeManagement {
                                Button {
                                    currentShareCode = taskList.shareCode.flatMap(normalizedShareCode)
                                    shareCopySuccess = false
                                    shareError = nil
                                    showShareSheet = true
                                } label: {
                                    Image(systemName: "square.and.arrow.up")
                                        .font(.system(size: TaskListDetailMetrics.headerIconSize, weight: .medium))
                                        .foregroundStyle(.primary)
                                }
                                .buttonStyle(AppIconButtonStyle(size: TaskListDetailMetrics.headerIconButtonSize))
                                .accessibilityLabel(translations.t("taskList.share"))
                            }
                        }
                        .padding(.trailing, -TaskListDetailMetrics.edgeActionOverhang)
                    }
                    .frame(minHeight: TaskListDetailMetrics.headerMinHeight)
                    .simultaneousGesture(
                        TapGesture().onEnded {
                            dismissNewTaskInputFocus()
                        }
                    )

                    if let taskMutationError, actionSheetState == nil {
                        AppAlert(message: taskMutationError)
                    }

                    if allowsTaskEditing {
                        newTaskInput

                        taskToolbar
                            .padding(.top, TaskListDetailMetrics.toolbarTopOverlap)
                            .padding(.bottom, TaskListDetailMetrics.toolbarBottomOverlap)
                            .simultaneousGesture(
                                TapGesture().onEnded {
                                    dismissNewTaskInputFocus()
                                }
                            )
                    }
                }
                .padding(.bottom, TaskListDetailMetrics.sectionSpacing)

                if displayTasks.isEmpty {
                    Text(translations.t("pages.tasklist.noTasks"))
                        .font(AppTypography.body())
                        .foregroundStyle(AppPalette.mutedText)
                } else {
                    VStack(spacing: TaskListDetailMetrics.taskRowGap) {
                        ForEach(displayTasks) { task in
                            taskRow(task, displayTasks: displayTasks)
                        }
                    }
                }
            }
            .frame(maxWidth: AppMetrics.taskColumnMaxWidth, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .top)
            .padding(.horizontal, TaskListDetailMetrics.contentHorizontalPadding)
            .padding(.bottom, TaskListDetailMetrics.contentBottomPadding)
        }
        .coordinateSpace(name: "taskList")
        .background(
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture {
                    dismissNewTaskInputFocus()
                }
        )
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
        .focusEffectDisabled()
        .alert(translations.t("pages.tasklist.deleteCompletedConfirmTitle"), isPresented: $showDeleteCompletedAlert) {
            Button(translations.t("auth.button.delete"), role: .destructive) { confirmDeleteCompleted() }
            Button(translations.t("common.cancel"), role: .cancel) {}
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

    private var trimmedNewTaskText: String {
        newTaskText.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var newTaskInput: some View {
        TextField(
            "",
            text: $newTaskText,
            prompt: Text(translations.t("pages.tasklist.addTaskPlaceholder")).foregroundStyle(AppPalette.placeholder)
        )
        .focused($focusedNewTaskListId, equals: taskList.id)
        .onSubmit { addTask() }
        .onChange(of: focusedNewTaskListId) { _, _ in
            syncHistoryPopover()
        }
        .onChange(of: newTaskText) { _, _ in
            syncHistoryPopover()
        }
        .font(AppTypography.body())
        .padding(.leading, TaskListDetailMetrics.inputHorizontalPadding)
        .padding(.trailing, AppMetrics.controlHeight + 4)
        .padding(.vertical, TaskListDetailMetrics.inputVerticalPadding)
        .frame(minHeight: AppMetrics.controlHeight)
        .background(
            AppPalette.cardSurface.opacity(TaskListDetailMetrics.inputBackgroundOpacity),
            in: RoundedRectangle(cornerRadius: TaskListDetailMetrics.inputCornerRadius, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: TaskListDetailMetrics.inputCornerRadius, style: .continuous)
                .strokeBorder(AppPalette.border, lineWidth: TaskListDetailMetrics.inputBorderWidth)
        )
        .overlay(alignment: .trailing) {
            Button { addTask() } label: {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: TaskListDetailMetrics.addActionIconSize - 2, weight: .medium))
                    .rotationEffect(.degrees(45))
                    .flipsForRightToLeftLayoutDirection(true)
                    .foregroundStyle(.primary)
            }
            .buttonStyle(AppIconButtonStyle())
            .padding(.trailing, 2)
            .opacity(trimmedNewTaskText.isEmpty ? 0 : 1)
            .disabled(trimmedNewTaskText.isEmpty)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: trimmedNewTaskText.isEmpty)
            .accessibilityLabel(translations.t("common.add"))
            .accessibilityHidden(trimmedNewTaskText.isEmpty)
        }
        .popover(isPresented: $isHistoryPopoverPresented) {
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(historyOptions, id: \.self) { option in
                        Button {
                            newTaskText = option
                            isHistoryPopoverPresented = false
                            addTask()
                        } label: {
                            Text(option)
                                .font(AppTypography.subheadline())
                                .foregroundStyle(.primary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(4)
            }
            .frame(minWidth: 280, maxWidth: 420, maxHeight: 220, alignment: .topLeading)
            .presentationCompactAdaptation(.popover)
        }
    }

    private var taskToolbar: some View {
        HStack(spacing: 8) {
            Button { handleSortTasks() } label: {
                HStack(spacing: 6) {
                    Image(systemName: "line.3.horizontal.decrease")
                        .font(.system(size: TaskListDetailMetrics.toolbarIconSize, weight: .medium))
                        .frame(width: TaskListDetailMetrics.toolbarIconSlot, height: TaskListDetailMetrics.toolbarIconSlot)
                    Text(translations.t("pages.tasklist.sort"))
                }
            }
            .buttonStyle(TaskToolbarButtonStyle())
            .disabled(displayTasks.count < 2)

            Spacer(minLength: 8)

            Button {
                triggerWarningFeedback()
                showDeleteCompletedAlert = true
            } label: {
                HStack(spacing: 6) {
                    Text(translations.t("pages.tasklist.deleteCompleted"))
                    Image(systemName: "trash")
                        .font(.system(size: TaskListDetailMetrics.toolbarIconSize, weight: .medium))
                        .frame(width: TaskListDetailMetrics.toolbarIconSlot, height: TaskListDetailMetrics.toolbarIconSlot)
                }
            }
            .buttonStyle(TaskToolbarButtonStyle())
            .disabled(displayTasks.allSatisfy { !$0.completed })
        }
    }

    private func saveTaskListDetails() {
        let trimmed = editName.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        var updates: [String: Any] = ["updatedAt": nowMillis()]
        if trimmed != taskList.name {
            updates["name"] = trimmed
        }
        if editBackground != taskList.background {
            updates["background"] = editBackground as Any
        }
        guard updates.count > 1 else {
            showEditSheet = false
            return
        }
        removeListError = nil
        mutationQueue.enqueue({ completion in
            db.collection("taskLists").document(taskList.id).updateData(updates, completion: completion)
        }, onError: {
            removeListError = translations.t("common.error")
            logException(operation: "task_list_update", errorCategory: "write_failed")
        }, onIdle: {
            if removeListError == nil {
                showEditSheet = false
            }
        })
    }

    private var editSheet: some View {
        AppDialog(title: translations.t("taskList.editTitle")) {
            VStack(alignment: .leading, spacing: 20) {
                if let removeListError {
                    AppAlert(message: removeListError)
                }
                AppFormField(label: translations.t("app.taskListName")) {
                    TextField(
                        "",
                        text: $editName,
                        prompt: Text(translations.t("app.taskListNamePlaceholder")).foregroundStyle(AppPalette.placeholder)
                    )
                    .submitLabel(.done)
                    .onSubmit(saveTaskListDetails)
                    .appField()
                }
                AppFormField(label: translations.t("taskList.selectColor")) {
                    TaskListColorPicker(selected: editBackground) { editBackground = $0 }
                }
            }
        } footerLeading: {
            if allowsTaskListDeletion {
                Button(removingList ? translations.t("common.deleting") : translations.t("taskList.deleteList")) {
                    showDeleteListAlert = true
                }
                .buttonStyle(AppButtonStyle(variant: .danger))
                .disabled(removingList)
            }
        } footerTrailing: {
            Button(translations.t("common.cancel")) { showEditSheet = false }
                .buttonStyle(AppButtonStyle(variant: .secondary))
            Button(translations.t("taskList.save")) { saveTaskListDetails() }
                .buttonStyle(AppButtonStyle(variant: .primary))
                .disabled(editName.trimmingCharacters(in: .whitespaces).isEmpty || removingList)
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
    }

    @ViewBuilder
    private func taskActionSheet(_ actionState: ActionSheetState) -> some View {
        if let task = displayTasks.first(where: { $0.id == actionState.taskId }) {
            let trimmedText = task.text.trimmingCharacters(in: .whitespacesAndNewlines)
            VStack(alignment: .leading, spacing: 12) {
                AppActionSheetHeader(title: trimmedText.isEmpty ? translations.t("pages.tasklist.setDate") : trimmedText) {
                    actionSheetState = nil
                }
                if let taskMutationError {
                    AppAlert(message: taskMutationError)
                }
                HStack(spacing: 8) {
                    Button(translations.t("pages.tasklist.clearDate")) {
                        commitDate(task, dateStr: "") { actionSheetState = nil }
                    }
                    .buttonStyle(AppButtonStyle(variant: .ghost))
                    .disabled(task.date.isEmpty)
                    .padding(.leading, -12)

                    Spacer(minLength: 8)

                    PinToggleButton(pinned: task.pinned) {
                        togglePinned(task) { actionSheetState = nil }
                    }
                }
                SheetCalendar(selectedDate: parseTaskInputDate(task.date)) { date in
                    commitDate(task, dateStr: date.map { formatTaskInputDate($0) } ?? "") { actionSheetState = nil }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 24)
            .modifier(FittedSheetModifier())
            .accessibilityElement(children: .contain)
            .accessibilityLabel(translations.t("pages.tasklist.setDate"))
        }
    }

    private var shareSheet: some View {
        AppDialog(
            title: translations.t("taskList.shareTitle"),
            description: translations.t("taskList.shareDescription")
        ) {
            if shareError != nil || currentShareCode != nil {
            VStack(alignment: .leading, spacing: 20) {
                if let shareError {
                    AppAlert(message: shareError)
                }
                if let code = currentShareCode {
                    AppFormField(label: translations.t("taskList.shareCode")) {
                        HStack(spacing: 8) {
                            Text(code)
                                .textSelection(.enabled)
                                .appField(monospaced: true)
                            Button(shareCopySuccess ? translations.t("common.copied") : translations.t("common.copy")) {
                                UIPasteboard.general.string = shareCodeURLString(code)
                                shareCopySuccess = true
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                                    shareCopySuccess = false
                                }
                            }
                            .buttonStyle(AppButtonStyle(variant: .secondary))
                        }
                    }
                }
            }
            }
        } footerLeading: {
            if currentShareCode != nil {
                Button(removingShareCode ? translations.t("common.deleting") : translations.t("taskList.removeShare")) {
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
                }
                .buttonStyle(AppButtonStyle(variant: .danger))
                .disabled(removingShareCode)
            }
        } footerTrailing: {
            Button(translations.t("common.close")) { showShareSheet = false }
                .buttonStyle(AppButtonStyle(variant: .secondary))
            if currentShareCode == nil {
                Button(generatingShareCode ? translations.t("common.loading") : translations.t("taskList.generateShare")) {
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
                }
                .buttonStyle(AppButtonStyle(variant: .primary))
                .disabled(generatingShareCode)
            }
        }
    }

    private func toggleCompletion(_ task: TaskSummary) {
        logTaskUpdate(fields: "completed")
        performTaskMutation(
            buildNextTasks: { currentTasks in
                currentTasks.map { current in
                    current.id == task.id ? current.updating(completed: !current.completed) : current
                }
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
        let pinnedChanged = resolved.pinnedChanged
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
            additionalUpdates: textChanged
                ? ["history": buildHistory(
                    newText: resolved.text,
                    history: displayHistory,
                    oldText: task.text
                )]
                : [:]
        )
    }

    private func openTaskActionSheet(_ task: TaskSummary) {
        actionSheetState = ActionSheetState(
            taskId: task.id
        )
    }

    private func commitDate(_ task: TaskSummary, dateStr: String, onSuccess: @escaping @MainActor @Sendable () -> Void = {}) {
        logTaskUpdate(fields: "date")
        performTaskMutation(
            buildNextTasks: { currentTasks in
                currentTasks.map { current in
                    current.id == task.id ? current.updating(date: dateStr) : current
                }
            },
            onSuccess: onSuccess
        )
    }

    private func togglePinned(_ task: TaskSummary, onSuccess: @escaping @MainActor @Sendable () -> Void = {}) {
        logTaskUpdate(fields: "pinned")
        triggerLightImpact()
        let currentPinned = displayTasks.first(where: { $0.id == task.id })?.pinned ?? task.pinned
        let nextPinned = !currentPinned
        performTaskMutation(
            buildNextTasks: { currentTasks in
                currentTasks.map { current in
                    current.id == task.id ? current.updating(pinned: nextPinned) : current
                }
            },
            onSuccess: onSuccess
        )
    }

    private func addTask() {
        let trimmed = newTaskText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let parsed = resolveTaskInput(trimmed, translations: translations)
        guard hasTaskContent(text: parsed.text, date: parsed.date ?? "", pinned: parsed.pinned) else { return }
        logTaskAdd(hasDate: !(parsed.date ?? "").isEmpty)
        triggerLightImpact()
        newTaskText = ""
        focusedNewTaskListId = taskList.id
        let taskId = UUID().uuidString
        let currentTasks = displayTasks
        let order: Double = taskInsertPosition == "top"
            ? (currentTasks.first?.order ?? 1.0) - 1.0
            : (currentTasks.last?.order ?? 0.0) + 1.0
        let insertedTask = TaskSummary(
            id: taskId,
            text: parsed.text,
            completed: false,
            date: parsed.date ?? "",
            order: order,
            pinned: parsed.pinned
        )
        performTaskMutation(
            buildNextTasks: { currentTasks in
                taskInsertPosition == "top"
                    ? [insertedTask] + currentTasks
                    : currentTasks + [insertedTask]
            },
            additionalUpdates: ["history": buildHistory(
                newText: parsed.text,
                history: displayHistory
            )]
        )
    }

    private func handleSortTasks() {
        logTaskSort()
        let sorted = getAutoSortedTasks(displayTasks)
        setPendingTasks(sorted)
        updateTaskList(buildTaskUpdateData(previousTasks: displayTasks, tasks: sorted))
    }

    private func confirmDeleteCompleted() {
        guard exitingTaskIds.isEmpty else { return }
        let completed = displayTasks.filter { $0.completed }
        guard !completed.isEmpty else { return }
        logTaskDeleteCompleted(count: completed.count)
        let completedIds = Set(completed.map(\.id))
        if reduceMotion {
            commitDeleteCompleted(completedIds)
            return
        }
        withAnimation(.easeOut(duration: 0.12)) {
            exitingTaskIds = completedIds
        }
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 120_000_000)
            guard exitingTaskIds == completedIds else { return }
            commitDeleteCompleted(completedIds)
        }
    }

    private func commitDeleteCompleted(_ completedIds: Set<String>) {
        let previousTasks = displayTasks
        let remaining = previousTasks.filter { !completedIds.contains($0.id) }
        let normalized = normalizeTasks(remaining, autoSort: autoSort)
        setPendingTasks(normalized)
        exitingTaskIds = []
        updateTaskList(buildTaskUpdateData(
            previousTasks: previousTasks,
            tasks: normalized,
            deletedTaskIds: Array(completedIds)
        ))
    }

    private func moveTask(_ task: TaskSummary, by delta: Int) {
        var ordered = displayTasks
        guard let index = ordered.firstIndex(where: { $0.id == task.id }) else { return }
        let target = index + delta
        guard target >= 0,
              target < ordered.count,
              canReorderTasks(task, ordered[target], autoSort: autoSort) else { return }
        ordered.swapAt(index, target)
        persistTaskOrder(ordered.map(\.id))
    }

    private func persistTaskOrder(_ ids: [String]) {
        let currentTasks = displayTasks
        guard ids.count == currentTasks.count,
              Set(ids).count == currentTasks.count else { return }
        let currentTasksById = Dictionary(uniqueKeysWithValues: currentTasks.map { ($0.id, $0) })
        let orderedTasks = ids.compactMap { currentTasksById[$0] }
        guard orderedTasks.count == currentTasks.count else { return }
        logTaskReorder()
        let normalizedTasks = renumberTasks(orderedTasks)
        setPendingTasks(normalizedTasks)
        updateTaskList(buildTaskUpdateData(previousTasks: currentTasks, tasks: normalizedTasks))
    }

    private func generateShareCode(taskListId: String) async throws -> String {
        for _ in 0..<10 {
            let code = try generateRandomShareCode()
            let shareCodeRef = db.collection("shareCodes").document(code)
            let shareCodeSnap = try await shareCodeRef.getDocument()
            if shareCodeSnap.exists { continue }

            let taskListRef = db.collection("taskLists").document(taskListId)
            let taskListSnap = try await taskListRef.getDocument(source: .server)
            guard taskListSnap.exists else {
                throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Task list not found"])
            }

            let batch = db.batch()
            if let currentCode = taskListSnap.data()?["shareCode"] as? String,
               let normalizedCode = normalizedShareCode(currentCode) {
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
        let snap = try await taskListRef.getDocument(source: .server)
        guard snap.exists else {
            throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Task list not found"])
        }
        guard let currentCode = snap.data()?["shareCode"] as? String, !currentCode.isEmpty else { return }
        let batch = db.batch()
        if let normalizedCode = normalizedShareCode(currentCode) {
            batch.deleteDocument(db.collection("shareCodes").document(normalizedCode))
        }
        batch.updateData(["shareCode": NSNull(), "updatedAt": nowMillis()], forDocument: taskListRef)
        try await batch.commit()
    }
}

private func fetchTaskListIdByShareCode(_ shareCode: String) async throws -> String? {
    let db = Firestore.firestore()
    guard let normalized = normalizedShareCode(shareCode) else { return nil }
    let snap = try await db.collection("shareCodes").document(normalized).getDocument(source: .server)
    guard snap.exists, let data = snap.data() else { return nil }
    guard let taskListId = data["taskListId"] as? String, !taskListId.isEmpty, !taskListId.contains("/") else { return nil }
    let taskList = try await db.collection("taskLists").document(taskListId).getDocument(source: .server)
    return taskList.data()?["shareCode"] as? String == normalized ? taskListId : nil
}

private func addSharedTaskListToOrder(taskListId: String, joinCode: String) async throws {
    guard let uid = Auth.auth().currentUser?.uid else { return }
    let db = Firestore.firestore()
    let batch = db.batch()
    let taskListOrderRef = db.collection("taskListOrder").document(uid)
    let taskListRef = db.collection("taskLists").document(taskListId)
    let membershipRef = taskListRef.collection("members").document(uid)
    let orderSnap = try await taskListOrderRef.getDocument()
    let orderData = orderSnap.data() ?? [:]
    let membershipSnap = try await membershipRef.getDocument()
    if orderData[taskListId] != nil, membershipSnap.exists {
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
    if !membershipSnap.exists {
        batch.setData([
            "joinedAt": nowMillis(),
            "joinCode": joinCode,
        ], forDocument: membershipRef)
        batch.updateData(["memberCount": FieldValue.increment(Int64(1)), "updatedAt": nowMillis()],
                         forDocument: taskListRef)
    }
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
    private var currentShareCode: String?
    private var taskListRetryTask: Task<Void, Never>?
    private var orderRetryTask: Task<Void, Never>?
    private var taskListRetryDelayNanoseconds: UInt64 = 1_000_000_000
    private var orderRetryDelayNanoseconds: UInt64 = 1_000_000_000
    private var taskListRetryReportedError = false
    private var orderRetryReportedError = false
    private var bindTask: Task<Void, Never>?

    func bind(shareCode: String, uid: String?, translations: Translations) {
        bindTask?.cancel()
        bindTask = nil
        guard let normalizedCode = normalizedShareCode(shareCode) else {
            taskList = nil
            errorMessage = translations.t("pages.sharecode.notFound")
            isLoading = false
            isAdded = false
            return
        }

        isLoading = true
        errorMessage = nil
        updateOrderSubscription(uid: uid, taskListId: currentTaskListId)

        bindTask = Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                try Task.checkCancellation()
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
                try Task.checkCancellation()

                self.subscribeToTaskList(taskListId: taskListId, translations: translations)
                self.currentShareCode = normalizedCode
                self.updateOrderSubscription(uid: uid, taskListId: taskListId)
                logShare()
            } catch is CancellationError {
                return
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
        bindTask?.cancel()
        bindTask = nil
        resetTaskListListener()
        resetOrderListener()
        currentTaskListId = nil
        currentShareCode = nil
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
            guard let currentShareCode else {
                throw NSError(domain: "com.lightlist", code: -1, userInfo: [NSLocalizedDescriptionKey: "Missing share code"])
            }
            try await addSharedTaskListToOrder(taskListId: taskListId, joinCode: currentShareCode)
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
        installTaskListListener(taskListId: taskListId, translations: translations)
    }

    private func installTaskListListener(taskListId: String, translations: Translations) {
        taskListListener?.remove()
        taskListListener = db.collection("taskLists").document(taskListId).addSnapshotListener { [weak self] snapshot, error in
            guard let self else { return }

            Task { @MainActor in
                guard self.currentTaskListId == taskListId else { return }
                if let error {
                    self.taskList = nil
                    self.errorMessage = translations.t("pages.sharecode.error")
                    self.isLoading = false
                    self.scheduleTaskListRetry(taskListId: taskListId, translations: translations, error: error)
                    return
                }

                guard let snapshot, snapshot.exists else {
                    self.taskList = nil
                    self.errorMessage = translations.t("pages.sharecode.notFound")
                    self.isLoading = false
                    return
                }

                guard let record = decodeTaskListRecord(from: snapshot) else {
                    self.taskList = nil
                    self.errorMessage = translations.t("pages.sharecode.error")
                    self.isLoading = false
                    return
                }
                self.taskList = mapTaskListDetail(id: taskListId, data: record)
                self.errorMessage = nil
                self.isLoading = false
                if !snapshot.metadata.isFromCache {
                    self.taskListRetryDelayNanoseconds = 1_000_000_000
                    self.taskListRetryReportedError = false
                }
            }
        }
    }

    private func scheduleTaskListRetry(taskListId: String, translations: Translations, error: Error) {
        guard currentTaskListId == taskListId else { return }
        if !taskListRetryReportedError {
            logSyncListenerError(source: "shared_task_list", error: error)
            taskListRetryReportedError = true
        }
        guard taskListRetryTask == nil else { return }
        let delay = taskListRetryDelayNanoseconds
        taskListRetryDelayNanoseconds = min(taskListRetryDelayNanoseconds * 2, 30_000_000_000)
        taskListRetryTask = Task { @MainActor [weak self] in
            do {
                try await Task.sleep(nanoseconds: delay)
            } catch {
                return
            }
            guard let self, self.currentTaskListId == taskListId else { return }
            self.taskListRetryTask = nil
            self.installTaskListListener(taskListId: taskListId, translations: translations)
        }
    }

    private func updateOrderSubscription(uid: String?, taskListId: String?) {
        resetOrderListener()

        guard let uid, let taskListId else {
            isAdded = false
            return
        }

        installOrderListener(uid: uid, taskListId: taskListId)
    }

    private func installOrderListener(uid: String, taskListId: String) {
        orderListener?.remove()
        orderListener = db.collection("taskLists")
            .document(taskListId)
            .collection("members")
            .document(uid)
            .addSnapshotListener { [weak self] snapshot, error in
            guard let self else { return }
            Task { @MainActor in
                if let error {
                    self.scheduleOrderRetry(uid: uid, taskListId: taskListId, error: error)
                    return
                }
                self.isAdded = snapshot?.exists == true
                if snapshot?.metadata.isFromCache == false {
                    self.orderRetryDelayNanoseconds = 1_000_000_000
                    self.orderRetryReportedError = false
                }
            }
        }
    }

    private func scheduleOrderRetry(uid: String, taskListId: String, error: Error) {
        guard currentTaskListId == taskListId else { return }
        if !orderRetryReportedError {
            logSyncListenerError(source: "membership", error: error)
            orderRetryReportedError = true
        }
        guard orderRetryTask == nil else { return }
        let delay = orderRetryDelayNanoseconds
        orderRetryDelayNanoseconds = min(orderRetryDelayNanoseconds * 2, 30_000_000_000)
        orderRetryTask = Task { @MainActor [weak self] in
            do {
                try await Task.sleep(nanoseconds: delay)
            } catch {
                return
            }
            guard let self, self.currentTaskListId == taskListId else { return }
            self.orderRetryTask = nil
            self.installOrderListener(uid: uid, taskListId: taskListId)
        }
    }

    private func resetTaskListListener() {
        taskListRetryTask?.cancel()
        taskListRetryTask = nil
        taskListRetryDelayNanoseconds = 1_000_000_000
        taskListRetryReportedError = false
        taskListListener?.remove()
        taskListListener = nil
    }

    private func resetOrderListener() {
        orderRetryTask?.cancel()
        orderRetryTask = nil
        orderRetryDelayNanoseconds = 1_000_000_000
        orderRetryReportedError = false
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
    @ObservedObject private var autoSortOverrides = AutoSortOverrideStore.shared
    @State private var addToOrderError: String?
    @FocusState private var focusedNewTaskListId: String?

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
                    autoSort: autoSortOverrides.value(
                        for: currentUserId,
                        fallback: settingsViewModel.settings?.autoSort ?? true
                    ),
                    focusedNewTaskListId: $focusedNewTaskListId,
                    allowsTaskEditing: viewModel.isAdded,
                    allowsTaskListDeletion: viewModel.isAdded,
                    allowsShareCodeManagement: viewModel.isAdded
                )
            } else {
                VStack {
                    Spacer()
                    AppAlert(message: viewModel.errorMessage ?? translations.t("pages.sharecode.error"))
                        .padding(.horizontal, 16)
                    Spacer()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(resolveTaskListBackgroundColor(viewModel.taskList?.background).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .safeAreaInset(edge: .top, spacing: 0) {
            VStack(spacing: 0) {
                HStack(spacing: 12) {
                    Button(action: onDismiss) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: AppIconMetrics.navigationIconSize, weight: .semibold))
                            .flipsForRightToLeftLayoutDirection(true)
                            .foregroundStyle(.primary)
                    }
                    .buttonStyle(AppIconButtonStyle())
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
                        .buttonStyle(AppButtonStyle(variant: .primary))
                        .disabled(viewModel.isJoining)
                    }
                }
                .padding(.leading, AppMetrics.headerHorizontalPadding)
                .padding(.trailing, 16)
                .frame(minHeight: AppMetrics.headerHeight)
                .background(AppPalette.cardSurface)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(AppPalette.border).frame(height: 1)
                }

                if let addToOrderError {
                    AppAlert(message: addToOrderError)
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                }
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

@MainActor
private final class SettingsViewModel: ObservableObject {
    struct Settings {
        var theme: String = "system"
        var language: String = "ja"
        var taskInsertPosition: String = "top"
        var autoSort: Bool = true
        var startupView: String = "taskList"
    }

    @Published private(set) var settings: Settings? = nil
    @Published var userEmail: String = ""
    @Published private(set) var isLoading = true
    @Published private(set) var hasError = false
    @Published private(set) var isUpdating = false
    @Published private(set) var hasUpdateError = false

    private let db = Firestore.firestore()
    private var settingsListener: ListenerRegistration?
    private var currentUid: String?
    private var retryTask: Task<Void, Never>?
    private var retryDelayNanoseconds: UInt64 = 1_000_000_000
    private var reportedListenerError = false
    private let autoSortOverrides = AutoSortOverrideStore.shared
    private var pendingSettings: Settings?
    private var settingsMutationRevision = 0

    private func resolveSettings(_ record: FirestoreSettingsRecord) -> Settings? {
        let theme = record.theme ?? "system"
        let language = record.language ?? "ja"
        let taskInsertPosition = record.taskInsertPosition ?? "top"
        guard theme == "system" || theme == "light" || theme == "dark",
              supportedLanguages.contains(where: { $0.code == language }),
              taskInsertPosition == "top" || taskInsertPosition == "bottom" else {
            return nil
        }
        return Settings(
            theme: theme,
            language: language,
            taskInsertPosition: taskInsertPosition,
            autoSort: record.autoSort ?? true,
            startupView: normalizedStartupView(record.startupView)
        )
    }

    func bind(uid: String?) {
        guard currentUid != uid else { return }
        reset()
        currentUid = uid
        guard let uid else {
            isLoading = false
            return
        }
        userEmail = Auth.auth().currentUser?.email ?? ""
        isLoading = true
        hasError = false
        hasUpdateError = false
        installSettingsListener(uid: uid)
    }

    func reset() {
        retryTask?.cancel()
        retryTask = nil
        settingsListener?.remove()
        settingsListener = nil
        currentUid = nil
        settings = nil
        pendingSettings = nil
        settingsMutationRevision = 0
        isLoading = false
        hasError = false
        isUpdating = false
        hasUpdateError = false
    }

    private func installSettingsListener(uid: String) {
        settingsListener?.remove()
        settingsListener = db.collection("settings").document(uid)
            .addSnapshotListener(includeMetadataChanges: true) { [weak self] snapshot, error in
                guard let self else { return }
                if let error {
                    self.isLoading = false
                    self.hasError = true
                    self.scheduleListenerRetry(error: error)
                    return
                }
                guard let data = decodeSettingsRecord(from: snapshot),
                      let settings = self.resolveSettings(data) else {
                    self.settings = nil
                    self.isLoading = false
                    self.hasError = true
                    return
                }
                if autoSortOverrides.value(for: uid, fallback: settings.autoSort) == settings.autoSort {
                    autoSortOverrides.clear(for: uid)
                }
                self.settings = self.pendingSettings ?? settings
                self.isLoading = false
                self.hasError = false
                if snapshot?.metadata.isFromCache == false,
                   snapshot?.metadata.hasPendingWrites == false {
                    self.retryDelayNanoseconds = 1_000_000_000
                    self.reportedListenerError = false
                }
            }
    }

    private func scheduleListenerRetry(error: Error) {
        if !reportedListenerError {
            logSyncListenerError(source: "settings", error: error)
            reportedListenerError = true
        }
        guard retryTask == nil else { return }
        let delay = retryDelayNanoseconds
        retryDelayNanoseconds = min(retryDelayNanoseconds * 2, 30_000_000_000)
        retryTask = Task { [weak self] in
            do {
                try await Task.sleep(nanoseconds: delay)
            } catch {
                return
            }
            guard let self, !Task.isCancelled, let uid = self.currentUid else {
                return
            }
            self.retryTask = nil
            self.installSettingsListener(uid: uid)
        }
    }

    func updateSettings(
        _ partial: [String: Any],
        onSuccess: (@MainActor @Sendable () -> Void)? = nil,
        onFailure: (@MainActor @Sendable () -> Void)? = nil
    ) {
        guard let uid = currentUid, !isUpdating, let previousSettings = settings else { return }
        var optimisticSettings = previousSettings
        if let theme = partial["theme"] as? String,
           theme == "system" || theme == "light" || theme == "dark" {
            optimisticSettings.theme = theme
        }
        if let language = partial["language"] as? String,
           supportedLanguages.contains(where: { $0.code == language }) {
            optimisticSettings.language = language
        }
        if let position = partial["taskInsertPosition"] as? String,
           position == "top" || position == "bottom" {
            optimisticSettings.taskInsertPosition = position
        }
        if let autoSort = partial["autoSort"] as? Bool {
            optimisticSettings.autoSort = autoSort
        }
        if let startupView = partial["startupView"] as? String {
            optimisticSettings.startupView = normalizedStartupView(startupView)
        }
        settingsMutationRevision += 1
        let mutationRevision = settingsMutationRevision
        pendingSettings = optimisticSettings
        settings = optimisticSettings
        var data = partial
        data["updatedAt"] = nowMillis()
        isUpdating = true
        hasUpdateError = false
        db.collection("settings").document(uid).setData(data, merge: true) { [weak self] error in
            Task { @MainActor in
                guard let self, self.currentUid == uid else { return }
                self.isUpdating = false
                if error != nil {
                    if self.settingsMutationRevision == mutationRevision {
                        self.pendingSettings = nil
                        self.settings = previousSettings
                    }
                    self.hasUpdateError = true
                    onFailure?()
                } else {
                    if self.settingsMutationRevision == mutationRevision {
                        self.pendingSettings = nil
                    }
                    onSuccess?()
                }
            }
        }
    }

    func signOut() throws {
        try Auth.auth().signOut()
    }

    func deleteAccount(password: String, onSuccess: @escaping () -> Void, onError: @escaping (Error) -> Void) {
        guard let user = Auth.auth().currentUser else { return }
        let uid = user.uid
        Task { @MainActor [db] in
            do {
                guard let email = user.email, !password.isEmpty else {
                    throw NSError(domain: "com.lightlist", code: -1)
                }
                try await user.reauthenticate(with: EmailAuthProvider.credential(withEmail: email, password: password))
                let taskListOrderRef = db.collection("taskListOrder").document(uid)
                let orderSnapshot = try await taskListOrderRef.getDocument(source: .server)
                let taskListIds = orderedTaskListIds(from: orderSnapshot.data())
                for taskListId in taskListIds {
                    let taskListRef = db.collection("taskLists").document(taskListId)
                    let taskListSnapshot = try await taskListRef.getDocument(source: .server)
                    guard taskListSnapshot.exists else { continue }
                    try await removeTaskListMembership(
                        db: db,
                        taskListOrderRef: taskListOrderRef,
                        taskListId: taskListId,
                        taskListSnapshot: taskListSnapshot,
                        shareCodeDocumentId: (taskListSnapshot.data()?["shareCode"] as? String)
                            .flatMap(normalizedShareCode)
                    )
                }
                let batch = db.batch()
                batch.deleteDocument(db.collection("settings").document(uid))
                batch.deleteDocument(db.collection("taskListOrder").document(uid))
                try await batch.commit()
                try await user.delete()
                onSuccess()
            } catch {
                onError(error)
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

private struct SettingsCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(AppTypography.footnoteSemibold())
                .foregroundStyle(AppPalette.mutedText)
                .padding(.bottom, 4)
                .accessibilityAddTraits(.isHeader)
            content()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppPalette.cardSurface, in: RoundedRectangle(cornerRadius: AppMetrics.cardCornerRadius, style: .continuous))
    }
}

private struct SettingsDivider: View {
    var body: some View {
        Rectangle()
            .fill(AppPalette.border)
            .frame(height: 1)
    }
}

private struct SettingsPage<Content: View>: View {
    @Environment(\.dismiss) private var dismiss
    let title: String
    let showsBackButton: Bool
    @ViewBuilder let content: () -> Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if !showsBackButton {
                    AppPageTitle(title: title)
                }
                content()
            }
            .frame(maxWidth: AppMetrics.settingsMaxWidth)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, showsBackButton ? AppMetrics.pageHorizontalPadding : AppMetrics.regularPageHorizontalPadding)
            .padding(.top, showsBackButton ? 8 : AppMetrics.regularPageTopPadding)
            .padding(.bottom, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(AppPalette.pageBackground.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .safeAreaInset(edge: .top, spacing: 0) {
            if showsBackButton {
                AppNavigationHeader(title: title) { dismiss() }
                    .background(AppPalette.pageBackground)
            }
        }
    }
}

private struct SettingsView: View {
    @EnvironmentObject var translations: Translations
    let currentUserId: String?
    var showsBackButton = true
    @StateObject private var viewModel = SettingsViewModel()
    @ObservedObject private var autoSortOverrides = AutoSortOverrideStore.shared
    @State private var showSignOutAlert = false
    @State private var showDeleteAlert = false
    @State private var deletePassword = ""
    @State private var showEmailChangeForm = false
    @State private var showLicenses = false
    @State private var newEmail = ""
    @State private var emailChangeError: String? = nil
    @State private var emailChangeSuccess = false
    @State private var isChangingEmail = false
    @State private var errorMessage: String? = nil
    @State private var isDeletingAccount = false
    @State private var isSigningOut = false

    private var actionsDisabled: Bool {
        isSigningOut || isDeletingAccount
    }

    var body: some View {
        SettingsPage(title: translations.t("settings.title"), showsBackButton: showsBackButton) {
            if let errorMessage {
                AppAlert(message: errorMessage)
            }
            if viewModel.hasUpdateError {
                AppAlert(message: translations.t("common.error"))
            }
            if viewModel.isLoading && viewModel.settings == nil {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 120)
            } else if let settings = viewModel.settings {
                if viewModel.hasError {
                    AppAlert(message: translations.t("app.loadError"))
                }
                SettingsCard(title: translations.t("settings.userInfo.title")) {
                    Text(viewModel.userEmail)
                        .font(AppTypography.subheadlineMedium())
                        .foregroundStyle(.primary)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                    SettingsDivider()
                    if showEmailChangeForm {
                        emailChangeForm
                    } else {
                        navigationRow(label: translations.t("settings.emailChange.title"), disabled: actionsDisabled) {
                            showEmailChangeForm = true
                        }
                    }
                }
                SettingsCard(title: translations.t("settings.preferences.title")) {
                    selectRow(
                        label: translations.t("settings.language.title"),
                        value: settings.language,
                        options: supportedLanguages.map { ($0.code, $0.name) }
                    ) { language in
                        logSettingsLanguageChange(language: language)
                        viewModel.updateSettings(["language": language])
                    }
                    SettingsDivider()
                    selectRow(
                        label: translations.t("settings.theme.title"),
                        value: settings.theme,
                        options: [
                            ("system", translations.t("settings.theme.system")),
                            ("light", translations.t("settings.theme.light")),
                            ("dark", translations.t("settings.theme.dark")),
                        ]
                    ) { theme in
                        logSettingsThemeChange(theme: theme)
                        viewModel.updateSettings(["theme": theme])
                    }
                    SettingsDivider()
                    selectRow(
                        label: translations.t("settings.startupView.title"),
                        value: normalizedStartupView(settings.startupView),
                        options: [
                            ("taskList", translations.t("settings.startupView.taskList")),
                            ("calendar", translations.t("settings.startupView.calendar")),
                            ("taskLists", translations.t("settings.startupView.taskLists")),
                        ]
                    ) { startupView in
                        logSettingsStartupViewChange(view: startupView)
                        updateStartupView(startupView)
                    }
                    SettingsDivider()
                    selectRow(
                        label: translations.t("settings.taskInsertPosition.title"),
                        value: settings.taskInsertPosition == "bottom" ? "bottom" : "top",
                        options: [
                            ("top", translations.t("settings.taskInsertPosition.top")),
                            ("bottom", translations.t("settings.taskInsertPosition.bottom")),
                        ]
                    ) { position in
                        logSettingsTaskInsertPositionChange(position: position)
                        viewModel.updateSettings(["taskInsertPosition": position])
                    }
                    SettingsDivider()
                    Toggle(isOn: Binding(
                        get: { autoSortOverrides.value(for: currentUserId, fallback: settings.autoSort) },
                        set: { enabled in
                            guard let uid = currentUserId, !viewModel.isUpdating else { return }
                            autoSortOverrides.set(enabled, for: uid)
                            logSettingsAutoSortChange(enabled: enabled)
                            viewModel.updateSettings(
                                ["autoSort": enabled],
                                onFailure: {
                                    autoSortOverrides.clear(for: uid)
                                }
                            )
                        }
                    )) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(translations.t("settings.autoSort.title"))
                                .font(AppTypography.subheadlineMedium())
                                .foregroundStyle(.primary)
                            Text(translations.t("settings.autoSort.enable"))
                                .font(AppTypography.caption())
                                .foregroundStyle(AppPalette.mutedText)
                        }
                    }
                    .tint(AppPalette.primary)
                    .disabled(viewModel.isUpdating)
                    .padding(.vertical, 12)
                }
                SettingsCard(title: translations.t("settings.legal.title")) {
                    navigationRow(label: translations.t("settings.licenses.openSource")) {
                        showLicenses = true
                    }
                    SettingsDivider()
                    navigationRow(label: translations.t("settings.licenses.bundledAssets")) {
                        showLicenses = true
                    }
                }
                SettingsCard(title: translations.t("settings.actions.title")) {
                    actionRow(
                        label: isSigningOut ? translations.t("settings.signingOut") : translations.t("settings.danger.signOut"),
                        disabled: actionsDisabled
                    ) {
                        showSignOutAlert = true
                    }
                    SettingsDivider()
                    actionRow(
                        label: isDeletingAccount ? translations.t("settings.deletingAccount") : translations.t("settings.danger.deleteAccount"),
                        color: AppPalette.danger,
                        disabled: actionsDisabled
                    ) {
                        showDeleteAlert = true
                    }
                }
            } else {
                AppAlert(message: translations.t("app.loadError"))
            }
        }
        .navigationDestination(isPresented: $showLicenses) {
            LicensesView(showsBackButton: true)
        }
        .onAppear {
            viewModel.bind(uid: currentUserId)
        }
        .onChange(of: currentUserId) { _, nextUid in
            viewModel.bind(uid: nextUid)
            isSigningOut = false
        }
        .onDisappear {
            if !showLicenses {
                viewModel.reset()
            }
        }
        .alert(translations.t("auth.button.signOut"), isPresented: $showSignOutAlert) {
            Button(translations.t("common.cancel"), role: .cancel) {}
            Button(translations.t("auth.button.signOut"), role: .destructive) {
                isSigningOut = true
                errorMessage = nil
                do {
                    try viewModel.signOut()
                    logSignOut()
                } catch {
                    isSigningOut = false
                    errorMessage = resolveAuthErrorMessage(translations: translations, error: error)
                }
            }
        } message: {
            Text(translations.t("auth.signOutConfirm.message"))
        }
        .alert(translations.t("auth.deleteAccountConfirm.title"), isPresented: $showDeleteAlert) {
            SecureField(translations.t("auth.form.password"), text: $deletePassword)
                .textContentType(.password)
            Button(translations.t("common.cancel"), role: .cancel) { deletePassword = "" }
            Button(translations.t("auth.button.delete"), role: .destructive) {
                isDeletingAccount = true
                errorMessage = nil
                let password = deletePassword
                deletePassword = ""
                viewModel.deleteAccount(
                    password: password,
                    onSuccess: { logDeleteAccount(); isDeletingAccount = false },
                    onError: { err in
                        isDeletingAccount = false
                        errorMessage = resolveAuthErrorMessage(translations: translations, error: err)
                    }
                )
            }
            .disabled(deletePassword.isEmpty || isDeletingAccount)
        } message: {
            Text(translations.t("auth.deleteAccountConfirm.message"))
        }
    }

    private var emailChangeForm: some View {
        VStack(alignment: .leading, spacing: 12) {
            if emailChangeSuccess {
                AppAlert(message: translations.t("settings.emailChange.successMessage"), variant: .success)
                Button(translations.t("common.close")) { closeEmailChangeForm() }
                    .buttonStyle(AppButtonStyle(variant: .ghost))
                    .frame(maxWidth: .infinity)
            } else {
                if let emailChangeError {
                    AppAlert(message: emailChangeError)
                }
                AppFormField(label: translations.t("settings.emailChange.newEmailLabel")) {
                    TextField(
                        "",
                        text: $newEmail,
                        prompt: Text(translations.t("settings.emailChange.newEmailPlaceholder")).foregroundStyle(AppPalette.placeholder)
                    )
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .disableAutocorrection(true)
                    .disabled(isChangingEmail)
                    .appField()
                }
                HStack(spacing: 8) {
                    Spacer(minLength: 0)
                    Button(translations.t("common.cancel")) { closeEmailChangeForm() }
                        .buttonStyle(AppButtonStyle(variant: .secondary))
                        .disabled(isChangingEmail)
                    Button(isChangingEmail ? translations.t("settings.emailChange.submitting") : translations.t("settings.emailChange.submitButton")) {
                        submitEmailChange()
                    }
                    .buttonStyle(AppButtonStyle(variant: .primary))
                    .disabled(isChangingEmail || newEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
        .padding(.top, 4)
        .padding(.bottom, 12)
    }

    private func closeEmailChangeForm() {
        showEmailChangeForm = false
        newEmail = ""
        emailChangeError = nil
        emailChangeSuccess = false
    }

    private func submitEmailChange() {
        isChangingEmail = true
        emailChangeError = nil
        let trimmedEmail = newEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard isValidEmail(trimmedEmail) else {
            isChangingEmail = false
            emailChangeError = translations.t("auth.validation.email.invalid")
            return
        }
        newEmail = trimmedEmail
        viewModel.sendEmailChangeVerification(newEmail: trimmedEmail) { error in
            isChangingEmail = false
            if let error {
                emailChangeError = error.localizedDescription
            } else {
                logEmailChangeRequested()
                emailChangeSuccess = true
            }
        }
    }

    private func updateStartupView(_ startupView: String) {
        let previousStartupView = UserDefaults.standard.string(forKey: cachedStartupViewKey)
        UserDefaults.standard.set(startupView, forKey: cachedStartupViewKey)
        viewModel.updateSettings(
            ["startupView": startupView],
            onFailure: {
                if let previousStartupView {
                    UserDefaults.standard.set(previousStartupView, forKey: cachedStartupViewKey)
                } else {
                    UserDefaults.standard.removeObject(forKey: cachedStartupViewKey)
                }
            }
        )
    }

    private func selectRow(
        label: String,
        value: String,
        options: [(String, String)],
        onChange: @escaping (String) -> Void
    ) -> some View {
        Menu {
            Picker(label, selection: Binding(
                get: { value },
                set: { next in
                    if next != value { onChange(next) }
                }
            )) {
                ForEach(options, id: \.0) { option in
                    Text(option.1).tag(option.0)
                }
            }
        } label: {
            HStack(spacing: 16) {
                Text(label)
                    .foregroundStyle(.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                HStack(spacing: 8) {
                    Text(options.first(where: { $0.0 == value })?.1 ?? value)
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(AppPalette.subtleIcon)
                }
            }
            .font(AppTypography.subheadlineMedium())
            .frame(minHeight: 48)
            .contentShape(Rectangle())
        }
        .disabled(viewModel.isUpdating)
        .opacity(viewModel.isUpdating ? 0.5 : 1)
    }

    private func navigationRow(
        label: String,
        disabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Text(label)
                    .foregroundStyle(.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "chevron.right")
                    .font(.system(size: 15, weight: .semibold))
                    .flipsForRightToLeftLayoutDirection(true)
                    .foregroundStyle(AppPalette.subtleIcon)
            }
            .font(AppTypography.subheadlineMedium())
            .frame(minHeight: 48)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.6 : 1)
    }

    private func actionRow(
        label: String,
        color: Color = .primary,
        disabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(label)
                .font(AppTypography.subheadlineMedium())
                .foregroundStyle(color)
                .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.6 : 1)
    }
}

private struct LicenseCardRow: View {
    let title: String
    let subtitle: String?
    let source: String?
    let text: String
    @State private var isExpanded = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button {
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(AppTypography.subheadlineSemibold())
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.leading)
                        if let subtitle, !subtitle.isEmpty {
                            Text(subtitle)
                                .font(AppTypography.caption())
                                .foregroundStyle(AppPalette.mutedText)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 15, weight: .semibold))
                        .flipsForRightToLeftLayoutDirection(true)
                        .foregroundStyle(AppPalette.subtleIcon)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                        .padding(.top, 2)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(isExpanded ? [.isSelected] : [])

            if isExpanded {
                if let source, let url = URL(string: source) {
                    Link(source, destination: url)
                        .font(AppTypography.caption())
                        .foregroundStyle(AppPalette.mutedText)
                        .underline()
                }
                Text(text)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.primary)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(AppPalette.pageBackground, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
        }
        .padding(.vertical, 12)
    }
}

private struct LicensesView: View {
    @EnvironmentObject var translations: Translations
    var showsBackButton = true
    private static let cachedGeneratedLicenses = loadGeneratedLicenses()
    private static let cachedManualLicenses = loadManualLicenses()

    var body: some View {
        SettingsPage(title: translations.t("settings.licenses.title"), showsBackButton: showsBackButton) {
            if Self.cachedGeneratedLicenses.isEmpty {
                AppAlert(message: translations.t("settings.licenses.loadError"))
            } else {
                SettingsCard(title: translations.t("settings.licenses.openSource")) {
                    ForEach(Array(Self.cachedGeneratedLicenses.enumerated()), id: \.element.id) { index, license in
                        if index > 0 {
                            SettingsDivider()
                        }
                        LicenseCardRow(title: license.title, subtitle: nil, source: nil, text: license.text)
                    }
                }
            }
            SettingsCard(title: translations.t("settings.licenses.bundledAssets")) {
                ForEach(Array(Self.cachedManualLicenses.enumerated()), id: \.element.id) { index, license in
                    if index > 0 {
                        SettingsDivider()
                    }
                    LicenseCardRow(title: license.name, subtitle: license.license, source: license.source, text: license.text)
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

private enum TaskListBackgroundTheme {
    nonisolated static let lightBase: UInt32 = 0xF9FAFB
    nonisolated static let darkBase: UInt32 = 0x030712
    nonisolated static let darkColorStrength: Double = 0.26
}

nonisolated private func parseHexRGB(_ hex: String) -> UInt32? {
    let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    guard cleaned.count == 6, let value = UInt32(cleaned, radix: 16) else { return nil }
    return value
}

nonisolated private func mixInOklab(_ color: UInt32, _ base: UInt32, strength: Double) -> UIColor {
    func toLinear(_ channel: Double) -> Double {
        channel <= 0.04045 ? channel / 12.92 : pow((channel + 0.055) / 1.055, 2.4)
    }
    func toSRGB(_ channel: Double) -> Double {
        let clamped = min(max(channel, 0), 1)
        return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * pow(clamped, 1 / 2.4) - 0.055
    }
    func oklab(_ hex: UInt32) -> (Double, Double, Double) {
        let r = toLinear(Double((hex >> 16) & 0xFF) / 255)
        let g = toLinear(Double((hex >> 8) & 0xFF) / 255)
        let b = toLinear(Double(hex & 0xFF) / 255)
        let l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
        let m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
        let s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
        return (
            0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
        )
    }
    let c = oklab(color)
    let d = oklab(base)
    let L = c.0 * strength + d.0 * (1 - strength)
    let A = c.1 * strength + d.1 * (1 - strength)
    let B = c.2 * strength + d.2 * (1 - strength)
    let l = pow(L + 0.3963377774 * A + 0.2158037573 * B, 3)
    let m = pow(L - 0.1055613458 * A - 0.0638541728 * B, 3)
    let s = pow(L - 0.0894841775 * A - 1.2914855480 * B, 3)
    return UIColor(
        red: toSRGB(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        green: toSRGB(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        blue: toSRGB(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
        alpha: 1
    )
}

private func resolveTaskListBackgroundColor(_ background: String?) -> Color {
    guard let background, let hex = parseHexRGB(background) else {
        return dynamicColor(TaskListBackgroundTheme.lightBase, TaskListBackgroundTheme.darkBase)
    }
    return Color(UIColor { traits in
        if traits.userInterfaceStyle == .dark {
            return mixInOklab(hex, TaskListBackgroundTheme.darkBase, strength: TaskListBackgroundTheme.darkColorStrength)
        }
        return mixInOklab(hex, hex, strength: 1)
    })
}

private struct CalendarDayCell: View {
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let calendar: Calendar
    let day: Date
    let isToday: Bool
    let isSelected: Bool
    let isOutside: Bool
    let dots: [String?]
    let onTap: () -> Void

    var body: some View {
        Button {
            triggerSelectionFeedback()
            onTap()
        } label: {
            ZStack {
                Circle()
                    .fill(AppPalette.primary)
                    .scaleEffect(isSelected ? 1 : 0.82)
                    .opacity(isSelected ? 1 : 0)
                Circle()
                    .strokeBorder(AppPalette.todayRing, lineWidth: 1)
                    .opacity(isToday && !isSelected ? 1 : 0)
                Text("\(calendar.component(.day, from: day))")
                    .font(AppTypography.subheadlineMedium())
                    .foregroundStyle(dayForeground)
                    .padding(.bottom, dots.isEmpty ? 0 : 8)
                if !dots.isEmpty {
                    HStack(spacing: 2) {
                        ForEach(Array(dots.prefix(3).enumerated()), id: \.offset) { _, hexColor in
                            if let hexColor, let color = Color(hex: hexColor) {
                                Circle().fill(color).frame(width: 6, height: 6)
                            } else {
                                Circle()
                                    .strokeBorder(AppPalette.todayRing, lineWidth: 1)
                                    .frame(width: 6, height: 6)
                            }
                        }
                    }
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .padding(.bottom, 4)
                }
            }
            .frame(width: MonthCalendarMetrics.dayCircleSize, height: MonthCalendarMetrics.dayCircleSize)
            .animation(
                reduceMotion ? nil : .spring(response: 0.24, dampingFraction: 0.72),
                value: isSelected
            )
            .frame(maxWidth: .infinity, minHeight: MonthCalendarMetrics.dayCellHeight)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(dayAccessibilityLabel)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private var dayForeground: Color {
        if isSelected { return AppPalette.onPrimary }
        return isOutside ? AppPalette.outsideDay : .primary
    }

    private var dayAccessibilityLabel: String {
        var parts = ["\(calendar.component(.day, from: day))"]
        if isToday { parts.append(translations.t("a11y.today")) }
        if !dots.isEmpty { parts.append(translations.t("a11y.hasTasks")) }
        return parts.joined(separator: ", ")
    }
}

private enum MonthCalendarMetrics {
    static let dayCircleSize: CGFloat = 40
    static let dayCellHeight: CGFloat = 48
    static let weekSpacing: CGFloat = 4
    static let navButtonSize: CGFloat = 44
}

private struct MonthCalendarView: View {
    @EnvironmentObject var translations: Translations
    @Binding var displayedMonth: Date
    let selectedDate: Date?
    var dotsByDateKey: [String: [String?]] = [:]
    let onSelect: (Date?) -> Void
    var onMonthChange: ((Date) -> Void)? = nil

    @MainActor private static var monthTitleFormatters: [String: DateFormatter] = [:]

    private var locale: Locale {
        Locale(identifier: localeIdentifier(for: translations.language))
    }

    private var calendar: Calendar {
        currentGregorianCalendar(locale: locale)
    }

    private var monthTitle: String {
        let identifier = localeIdentifier(for: translations.language)
        let formatter: DateFormatter
        if let cached = Self.monthTitleFormatters[identifier] {
            formatter = cached
        } else {
            let f = DateFormatter()
            f.locale = locale
            f.calendar = calendar
            f.timeZone = .autoupdatingCurrent
            f.setLocalizedDateFormatFromTemplate("yMMMM")
            Self.monthTitleFormatters[identifier] = f
            formatter = f
        }
        return formatter.string(from: displayedMonth)
    }

    private var weekdaySymbols: [String] {
        let symbols = calendar.shortStandaloneWeekdaySymbols
        guard !symbols.isEmpty else { return [] }
        let firstIndex = (calendar.firstWeekday - 1) % symbols.count
        return Array(symbols[firstIndex...]) + Array(symbols[..<firstIndex])
    }

    private var weeks: [[Date]] {
        let cal = calendar
        guard let firstDay = cal.date(from: cal.dateComponents([.year, .month], from: displayedMonth)),
              let range = cal.range(of: .day, in: .month, for: firstDay) else { return [] }
        let leading = (cal.component(.weekday, from: firstDay) - cal.firstWeekday + 7) % 7
        let total = Int((Double(leading + range.count) / 7).rounded(.up)) * 7
        guard let start = cal.date(byAdding: .day, value: -leading, to: firstDay) else { return [] }
        let days = (0..<total).compactMap { cal.date(byAdding: .day, value: $0, to: start) }
        return stride(from: 0, to: days.count, by: 7).map { Array(days[$0..<min($0 + 7, days.count)]) }
    }

    private func dateKey(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        guard let year = c.year, let month = c.month, let day = c.day else { return "" }
        return String(format: "%04d-%02d-%02d", year, month, day)
    }

    private func shiftMonth(by offset: Int) {
        guard let next = calendar.date(byAdding: .month, value: offset, to: displayedMonth) else { return }
        displayedMonth = next
        onMonthChange?(next)
    }

    var body: some View {
        let cal = calendar
        VStack(spacing: MonthCalendarMetrics.weekSpacing) {
            HStack(spacing: 0) {
                monthNavButton(systemName: "chevron.left", label: translations.t("app.calendarPreviousMonth")) {
                    shiftMonth(by: -1)
                }
                Text(monthTitle)
                    .font(AppTypography.bodySemibold())
                    .frame(maxWidth: .infinity)
                    .accessibilityAddTraits(.isHeader)
                monthNavButton(systemName: "chevron.right", label: translations.t("app.calendarNextMonth")) {
                    shiftMonth(by: 1)
                }
            }
            .frame(height: MonthCalendarMetrics.navButtonSize)

            HStack(spacing: 0) {
                ForEach(Array(weekdaySymbols.enumerated()), id: \.offset) { _, symbol in
                    Text(symbol)
                        .font(AppTypography.captionMedium())
                        .foregroundStyle(AppPalette.mutedText)
                        .frame(maxWidth: .infinity)
                }
            }
            .accessibilityHidden(true)

            ForEach(Array(weeks.enumerated()), id: \.offset) { _, week in
                HStack(spacing: 0) {
                    ForEach(week, id: \.self) { day in
                        let isOutside = !cal.isDate(day, equalTo: displayedMonth, toGranularity: .month)
                        let isSelected = selectedDate.map { cal.isDate($0, inSameDayAs: day) } ?? false
                        CalendarDayCell(
                            calendar: cal,
                            day: day,
                            isToday: cal.isDateInToday(day),
                            isSelected: isSelected,
                            isOutside: isOutside,
                            dots: isOutside ? [] : (dotsByDateKey[dateKey(day)] ?? []),
                            onTap: { onSelect(isSelected ? nil : day) }
                        )
                    }
                }
            }
        }
    }

    private func monthNavButton(systemName: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 17, weight: .semibold))
                .flipsForRightToLeftLayoutDirection(true)
                .foregroundStyle(AppPalette.mutedText)
        }
        .buttonStyle(AppIconButtonStyle(size: MonthCalendarMetrics.navButtonSize))
        .accessibilityLabel(label)
    }
}

private struct SheetCalendar: View {
    let selectedDate: Date?
    let onSelect: (Date?) -> Void
    @State private var displayedMonth: Date

    init(selectedDate: Date?, onSelect: @escaping (Date?) -> Void) {
        self.selectedDate = selectedDate
        self.onSelect = onSelect
        let cal = currentGregorianCalendar()
        let base = selectedDate ?? Date()
        _displayedMonth = State(initialValue: cal.date(from: cal.dateComponents([.year, .month], from: base)) ?? base)
    }

    var body: some View {
        MonthCalendarView(
            displayedMonth: $displayedMonth,
            selectedDate: selectedDate,
            onSelect: onSelect
        )
        .padding(.horizontal, 8)
        .padding(.top, 8)
        .padding(.bottom, 12)
        .background(AppPalette.pageBackground, in: RoundedRectangle(cornerRadius: AppMetrics.sheetCalendarCornerRadius, style: .continuous))
    }
}

private struct PinToggleButton: View {
    @EnvironmentObject var translations: Translations
    let pinned: Bool
    var disabled = false
    let onToggle: () -> Void

    var body: some View {
        Button {
            triggerLightImpact()
            onToggle()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: pinned ? "pin.fill" : "pin")
                    .font(.system(size: AppIconMetrics.inlineActionIconSize, weight: .medium))
                Text(translations.t(pinned ? "pages.tasklist.unpinTask" : "pages.tasklist.pinTask"))
            }
            .font(AppTypography.subheadlineSemibold())
            .padding(.horizontal, 16)
            .frame(minHeight: AppMetrics.controlHeight)
            .foregroundStyle(pinned ? AppPalette.onPrimary : Color.primary)
            .background(
                pinned ? AppPalette.primary : AppPalette.rowActive,
                in: RoundedRectangle(cornerRadius: AppMetrics.controlCornerRadius, style: .continuous)
            )
            .contentShape(RoundedRectangle(cornerRadius: AppMetrics.controlCornerRadius, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.45 : 1)
        .accessibilityAddTraits(pinned ? [.isSelected] : [])
    }
}

private enum CalendarTaskRowMetrics {
    static let sideColumnWidth: CGFloat = 48
    static let metaHeight: CGFloat = 20
    static let contentMinHeight: CGFloat = 48
    static let controlTopPadding: CGFloat = 8
    static let textTopPadding: CGFloat = 8
    static let listMetaMaxWidth: CGFloat = 160
    static let listMetaTrailingPadding: CGFloat = 14
    static let rowBottomPadding: CGFloat = 4
}

@MainActor private var calendarTaskDateFormatters: [String: DateFormatter] = [:]

@MainActor private func calendarTaskDateLabel(_ date: Date, language: String) -> String {
    let identifier = localeIdentifier(for: language)
    if let cached = calendarTaskDateFormatters[identifier] {
        return cached.string(from: date)
    }
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: identifier)
    formatter.calendar = currentGregorianCalendar(locale: formatter.locale)
    formatter.timeZone = .autoupdatingCurrent
    formatter.setLocalizedDateFormatFromTemplate("MMMEd")
    calendarTaskDateFormatters[identifier] = formatter
    return formatter.string(from: date)
}

private struct CalendarTaskRow: View {
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let task: CalendarTask
    let isHighlighted: Bool
    let onSelectDate: () -> Void
    let onOpenTaskList: () -> Void
    let onToggleComplete: () -> Void
    let onOpenActions: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .center, spacing: 0) {
                HStack(spacing: 4) {
                    if let dateValue = task.dateValue {
                        Button {
                            triggerSelectionFeedback()
                            onSelectDate()
                        } label: {
                            Text(calendarTaskDateLabel(dateValue, language: translations.language))
                                .font(AppTypography.caption())
                                .foregroundStyle(AppPalette.subtleText)
                        }
                        .buttonStyle(.plain)
                    }
                    if task.pinned {
                        Image(systemName: "pin.fill")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(AppPalette.subtleText)
                            .accessibilityLabel(translations.t("pages.tasklist.unpinTask"))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Button(action: onOpenTaskList) {
                    HStack(spacing: 6) {
                        ListColorDot(background: task.taskListBackground)
                        Text(task.taskListName)
                            .font(AppTypography.captionMedium())
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                    }
                    .frame(minHeight: CalendarTaskRowMetrics.metaHeight)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(task.taskListName)
                .frame(
                    minWidth: CalendarTaskRowMetrics.sideColumnWidth,
                    maxWidth: CalendarTaskRowMetrics.listMetaMaxWidth,
                    alignment: .trailing
                )
                .padding(.trailing, CalendarTaskRowMetrics.listMetaTrailingPadding)
            }
            .frame(minHeight: CalendarTaskRowMetrics.metaHeight)
            .padding(.leading, CalendarTaskRowMetrics.sideColumnWidth)

            HStack(alignment: .top, spacing: 0) {
                Button {
                    triggerLightImpact()
                    onToggleComplete()
                } label: {
                    Circle()
                        .strokeBorder(AppPalette.subtleIcon, lineWidth: 1)
                        .frame(width: TaskListDetailMetrics.completionDotSize, height: TaskListDetailMetrics.completionDotSize)
                        .padding(.top, CalendarTaskRowMetrics.controlTopPadding)
                        .frame(
                            width: CalendarTaskRowMetrics.sideColumnWidth,
                            height: CalendarTaskRowMetrics.contentMinHeight,
                            alignment: .top
                        )
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(translations.t("pages.tasklist.markComplete")): \(task.text)")

                Group {
                    if task.dateValue != nil {
                        Button {
                            triggerSelectionFeedback()
                            onSelectDate()
                        } label: {
                            taskText
                        }
                        .buttonStyle(.plain)
                    } else {
                        taskText
                    }
                }
                .frame(maxWidth: .infinity, minHeight: CalendarTaskRowMetrics.contentMinHeight, alignment: .topLeading)

                Button(action: onOpenActions) {
                    Image(systemName: "pencil")
                        .font(.system(size: TaskListDetailMetrics.trailingDateIconSize, weight: .medium))
                        .foregroundStyle(AppPalette.subtleIcon)
                        .padding(.top, CalendarTaskRowMetrics.controlTopPadding)
                        .frame(
                            width: CalendarTaskRowMetrics.sideColumnWidth,
                            height: CalendarTaskRowMetrics.contentMinHeight,
                            alignment: .top
                        )
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(translations.t("a11y.editTask"))
            }
        }
        .padding(.bottom, CalendarTaskRowMetrics.rowBottomPadding)
        .background(
            isHighlighted ? AppPalette.cardSurface : Color.clear,
            in: RoundedRectangle(cornerRadius: AppMetrics.controlCornerRadius, style: .continuous)
        )
        .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: isHighlighted)
    }

    private var taskText: some View {
        Text(task.text)
            .font(AppTypography.bodyMedium())
            .foregroundStyle(.primary)
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.top, CalendarTaskRowMetrics.textTopPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct CalendarTaskSheet: View {
    enum Mode {
        case add
        case edit
    }

    @EnvironmentObject var translations: Translations
    @Environment(\.dismiss) private var dismiss
    let mode: Mode
    let taskLists: [TaskListDetail]
    let onSubmit: (_ taskListId: String, _ text: String, _ pinned: Bool, _ dateStr: String, _ onSuccess: @escaping @MainActor @Sendable () -> Void, _ onFailure: @escaping @MainActor @Sendable () -> Void) -> Void
    @Binding var errorMessage: String?
    @State private var taskListId: String
    @State private var text: String
    @State private var pinned: Bool
    @State private var selectedDate: Date?
    @State private var isSubmitting = false
    @FocusState private var isTextFieldFocused: Bool

    init(
        mode: Mode,
        taskLists: [TaskListDetail],
        initialTaskListId: String?,
        initialText: String,
        initialPinned: Bool,
        initialDate: Date?,
        errorMessage: Binding<String?>,
        onSubmit: @escaping (_ taskListId: String, _ text: String, _ pinned: Bool, _ dateStr: String, _ onSuccess: @escaping @MainActor @Sendable () -> Void, _ onFailure: @escaping @MainActor @Sendable () -> Void) -> Void
    ) {
        self.mode = mode
        self.taskLists = taskLists
        self._errorMessage = errorMessage
        self.onSubmit = onSubmit
        _taskListId = State(initialValue: initialTaskListId.flatMap { id in
            taskLists.contains(where: { $0.id == id }) ? id : nil
        } ?? taskLists.first?.id ?? "")
        _text = State(initialValue: initialText)
        _pinned = State(initialValue: initialPinned)
        _selectedDate = State(initialValue: initialDate)
    }

    private var title: String {
        translations.t(mode == .add ? "a11y.addTask" : "a11y.editTask")
    }

    private var isSubmitDisabled: Bool {
        isSubmitting
            || (mode == .add && text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !pinned && selectedDate == nil)
            || taskListId.isEmpty
    }

    var body: some View {
        VStack(spacing: 12) {
            AppActionSheetHeader(title: title, closeDisabled: isSubmitting) { dismiss() }
                .padding(.horizontal, 16)

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if let errorMessage {
                        AppAlert(message: errorMessage)
                    }

                    Menu {
                        Picker(translations.t("app.drawerTitle"), selection: $taskListId) {
                            ForEach(taskLists) { taskList in
                                Text(taskList.name).tag(taskList.id)
                            }
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Text(taskLists.first(where: { $0.id == taskListId })?.name ?? translations.t("app.drawerTitle"))
                                .foregroundStyle(.primary)
                                .lineLimit(1)
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.down")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(AppPalette.mutedText)
                        }
                        .appField()
                    }
                    .accessibilityLabel(translations.t("app.drawerTitle"))

                    TextField(
                        "",
                        text: $text,
                        prompt: Text(translations.t("pages.tasklist.addTaskPlaceholder")).foregroundStyle(AppPalette.placeholder)
                    )
                    .focused($isTextFieldFocused)
                    .submitLabel(.done)
                    .onSubmit(submit)
                    .appField()

                    HStack(spacing: 8) {
                        Button(translations.t("pages.tasklist.clearDate")) {
                            selectedDate = nil
                        }
                        .buttonStyle(AppButtonStyle(variant: .ghost))
                        .disabled(selectedDate == nil || isSubmitting)
                        .padding(.leading, -12)

                        Spacer(minLength: 8)

                        PinToggleButton(pinned: pinned, disabled: isSubmitting) {
                            pinned.toggle()
                        }
                    }

                    SheetCalendar(selectedDate: selectedDate) { date in
                        selectedDate = date
                    }
                }
                .padding(.horizontal, 16)
            }
            .scrollBounceBehavior(.basedOnSize)

            Button(action: submit) {
                Group {
                    if isSubmitting {
                        ProgressView()
                            .tint(AppPalette.onPrimary)
                    } else {
                        Text(translations.t(mode == .add ? "a11y.addTask" : "taskList.save"))
                    }
                }
            }
            .buttonStyle(AppButtonStyle(variant: .primary, fullWidth: true))
            .disabled(isSubmitDisabled)
            .padding(.horizontal, 16)
        }
        .padding(.top, 16)
        .padding(.bottom, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(AppPalette.cardSurface.ignoresSafeArea())
        .onAppear {
            if mode == .add {
                isTextFieldFocused = true
            }
        }
        .presentationDetents([.large])
        .presentationBackground(AppPalette.cardSurface)
        .presentationCornerRadius(28)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(title)
    }

    private func submit() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (mode == .edit || !trimmed.isEmpty || pinned || selectedDate != nil), !taskListId.isEmpty else { return }
        if mode == .add {
            let parsed = resolveTaskInput(trimmed, translations: translations)
            guard hasTaskContent(
                text: parsed.text,
                date: selectedDate.map { formatTaskInputDate($0) } ?? "",
                pinned: pinned
            ) else { return }
        }
        isSubmitting = true
        errorMessage = nil
        onSubmit(
            taskListId,
            trimmed,
            pinned,
            selectedDate.map { formatTaskInputDate($0) } ?? "",
            {
                isSubmitting = false
                dismiss()
            },
            {
                isSubmitting = false
            }
        )
    }
}

private struct CalendarAddSheetRequest: Identifiable {
    let id = UUID()
    let date: Date
}

private struct CalendarScreenView: View {
    @EnvironmentObject var translations: Translations
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dismiss) private var dismiss
    let currentUserId: String?
    var showsBackButton = true
    var defaultTaskListId: String? = nil
    var onOpenTaskList: ((String) -> Void)? = nil
    @StateObject private var viewModel = CalendarViewModel()
    @StateObject private var settingsViewModel = SettingsViewModel()
    @ObservedObject private var autoSortOverrides = AutoSortOverrideStore.shared

    private var calendarTasks: [CalendarTask] { viewModel.calendarTasks }

    @State private var displayedMonth: Date = {
        let cal = currentGregorianCalendar()
        return cal.date(from: cal.dateComponents([.year, .month], from: Date())) ?? Date()
    }()
    @State private var selectedDate: Date?
    @State private var addSheetRequest: CalendarAddSheetRequest?
    @State private var editingTask: CalendarTask?
    @State private var contentWidth: CGFloat = 0

    private var calendar: Calendar {
        currentGregorianCalendar(locale: Locale(identifier: localeIdentifier(for: translations.language)))
    }

    private var currentMonthKey: String {
        let components = calendar.dateComponents([.year, .month], from: displayedMonth)
        guard let year = components.year, let month = components.month else { return "" }
        return String(format: "%04d-%02d", year, month)
    }

    private var tasksInMonth: [CalendarTask] {
        calendarTasks.filter { $0.date.isEmpty || $0.date.hasPrefix(currentMonthKey) }
    }

    private var usesSplitLayout: Bool {
        !showsBackButton && contentWidth >= 640
    }

    private func dotColorsByDate(for tasks: [CalendarTask]) -> [String: [String?]] {
        var result: [String: [String?]] = [:]
        for task in tasks where !task.date.isEmpty {
            var colors = result[task.date] ?? []
            let color = task.taskListBackground
            if !colors.contains(color) && colors.count < 3 {
                colors.append(color)
            }
            result[task.date] = colors
        }
        return result
    }

    private func dateKey(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        guard let year = c.year, let month = c.month, let day = c.day else { return "" }
        return String(format: "%04d-%02d-%02d", year, month, day)
    }

    var body: some View {
        calendarContent
            .onAppear {
                viewModel.bind(uid: currentUserId)
                settingsViewModel.bind(uid: currentUserId)
            }
            .onDisappear {
                viewModel.reset()
                settingsViewModel.reset()
            }
            .onChange(of: currentUserId) { _, nextUid in
                viewModel.bind(uid: nextUid)
                settingsViewModel.bind(uid: nextUid)
            }
            .sheet(item: $addSheetRequest) { request in
                CalendarTaskSheet(
                    mode: .add,
                    taskLists: viewModel.taskLists,
                    initialTaskListId: defaultTaskListId ?? viewModel.taskLists.first?.id,
                    initialText: "",
                    initialPinned: false,
                    initialDate: request.date,
                    errorMessage: Binding(
                        get: { viewModel.calendarError },
                        set: { if $0 == nil { viewModel.clearError() } }
                    ),
                    onSubmit: { taskListId, text, pinned, dateStr, onSuccess, onFailure in
                        triggerLightImpact()
                        viewModel.addTask(
                            taskListId: taskListId,
                            rawText: text,
                            dateStr: dateStr,
                            pinned: pinned,
                            taskInsertPosition: settingsViewModel.settings?.taskInsertPosition ?? "top",
                            autoSort: settingsViewModel.settings?.autoSort ?? true,
                            translations: translations,
                            onSuccess: onSuccess,
                            onFailure: onFailure
                        )
                    }
                )
            }
            .sheet(item: $editingTask) { task in
                CalendarTaskSheet(
                    mode: .edit,
                    taskLists: viewModel.taskLists,
                    initialTaskListId: task.taskListId,
                    initialText: task.text,
                    initialPinned: task.pinned,
                    initialDate: parseTaskInputDate(task.date),
                    errorMessage: Binding(
                        get: { viewModel.calendarError },
                        set: { if $0 == nil { viewModel.clearError() } }
                    ),
                    onSubmit: { taskListId, text, pinned, dateStr, onSuccess, onFailure in
                        triggerLightImpact()
                        viewModel.saveTask(
                            task,
                            taskListId: taskListId,
                            rawText: text,
                            pinned: pinned,
                            dateStr: dateStr,
                            taskInsertPosition: settingsViewModel.settings?.taskInsertPosition ?? "top",
                            autoSort: autoSortOverrides.value(
                                for: currentUserId,
                                fallback: settingsViewModel.settings?.autoSort ?? true
                            ),
                            translations: translations,
                            onSuccess: onSuccess,
                            onFailure: onFailure
                        )
                    }
                )
            }
    }

    private var calendarContent: some View {
        let monthlyTasks = tasksInMonth
        let colorsByDate = dotColorsByDate(for: monthlyTasks)

        return VStack(spacing: 0) {
            ScrollViewReader { proxy in
                Group {
                    if usesSplitLayout {
                        VStack(alignment: .leading, spacing: 8) {
                            AppPageTitle(title: translations.t("app.calendar"))
                            HStack(alignment: .top, spacing: 48) {
                                calendarAside(colorsByDate: colorsByDate, monthlyTasks: monthlyTasks)
                                    .frame(minWidth: 288, maxWidth: 416)
                                ScrollView {
                                    taskList(monthlyTasks)
                                        .padding(.bottom, 48)
                                }
                                .scrollIndicators(.hidden)
                            }
                        }
                        .padding(.top, AppMetrics.regularPageTopPadding)
                        .padding(.horizontal, AppMetrics.regularPageHorizontalPadding)
                        .frame(maxWidth: 1152)
                        .frame(maxWidth: .infinity)
                    } else {
                        ScrollView {
                            VStack(alignment: .leading, spacing: 12) {
                                if !showsBackButton {
                                    AppPageTitle(title: translations.t("app.calendar"))
                                        .padding(.bottom, -4)
                                }
                                calendarAside(colorsByDate: colorsByDate, monthlyTasks: monthlyTasks)
                                taskList(monthlyTasks)
                            }
                            .padding(.top, showsBackButton ? 0 : AppMetrics.regularPageTopPadding)
                            .padding(.horizontal, showsBackButton ? AppMetrics.pageHorizontalPadding : AppMetrics.regularPageHorizontalPadding)
                            .padding(.bottom, 24)
                            .frame(maxWidth: showsBackButton ? .infinity : AppMetrics.settingsMaxWidth)
                            .frame(maxWidth: .infinity)
                        }
                    }
                }
                .onChange(of: selectedDate) { _, date in
                    guard let date else { return }
                    let key = dateKey(date)
                    if let first = monthlyTasks.first(where: { $0.date == key }) {
                        withAnimation(reduceMotion ? .none : .default) {
                            proxy.scrollTo(first.id, anchor: .center)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .onGeometryChange(for: CGFloat.self) { proxy in
            proxy.size.width
        } action: { width in
            contentWidth = width
        }
        .background(AppPalette.pageBackground.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .safeAreaInset(edge: .top, spacing: 0) {
            if showsBackButton {
                AppNavigationHeader(title: translations.t("app.calendar")) { dismiss() }
                    .background(AppPalette.pageBackground)
            }
        }
    }

    private func calendarAside(colorsByDate: [String: [String?]], monthlyTasks: [CalendarTask]) -> some View {
        VStack(spacing: 8) {
            MonthCalendarView(
                displayedMonth: $displayedMonth,
                selectedDate: selectedDate,
                dotsByDateKey: colorsByDate,
                onSelect: { date in selectedDate = date },
                onMonthChange: { _ in selectedDate = nil }
            )

            Button {
                viewModel.clearError()
                addSheetRequest = CalendarAddSheetRequest(date: selectedDate ?? Date())
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                        .font(.system(size: 17, weight: .semibold))
                    if let selectedDate {
                        Text("\(calendarTaskDateLabel(selectedDate, language: translations.language)) · \(translations.t("a11y.addTask"))")
                    } else {
                        Text(translations.t("a11y.addTask"))
                    }
                }
            }
            .buttonStyle(AppButtonStyle(variant: .primary, fullWidth: true))
            .accessibilityLabel(translations.t("a11y.addTask"))
            .accessibilityValue(selectedDate.map { calendarTaskDateLabel($0, language: translations.language) } ?? "")
        }
    }

    @ViewBuilder
    private func taskList(_ monthlyTasks: [CalendarTask]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if let calendarError = viewModel.calendarError, addSheetRequest == nil, editingTask == nil {
                AppAlert(message: calendarError)
                    .padding(.bottom, 8)
            }
            if monthlyTasks.isEmpty {
                Text(translations.t("app.calendarNoDatedTasks"))
                    .font(AppTypography.subheadline())
                    .foregroundStyle(AppPalette.subtleText)
                    .padding(.vertical, 16)
            } else {
                ForEach(Array(monthlyTasks.enumerated()), id: \.element.id) { index, task in
                    if task.dateValue == nil && (index == 0 || monthlyTasks[index - 1].dateValue != nil) {
                        Text(translations.t("pages.tasklist.noDate"))
                            .font(AppTypography.captionSemibold())
                            .foregroundStyle(AppPalette.subtleText)
                            .padding(.leading, CalendarTaskRowMetrics.sideColumnWidth)
                            .padding(.top, 16)
                            .padding(.bottom, 4)
                            .accessibilityAddTraits(.isHeader)
                    }
                    CalendarTaskRow(
                        task: task,
                        isHighlighted: selectedDate.map { dateKey($0) == task.date } ?? false,
                        onSelectDate: {
                            if let dateValue = task.dateValue {
                                selectedDate = dateValue
                            }
                        },
                        onOpenTaskList: { onOpenTaskList?(task.taskListId) },
                        onToggleComplete: {
                            viewModel.completeTask(
                                task,
                                autoSort: autoSortOverrides.value(
                                    for: currentUserId,
                                    fallback: settingsViewModel.settings?.autoSort ?? true
                                ),
                                translations: translations
                            )
                        },
                        onOpenActions: {
                            viewModel.clearError()
                            editingTask = task
                        }
                    )
                    .id(task.id)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

@MainActor private func colorLabel(_ hex: String?, translations: Translations) -> String {
    switch hex {
    case nil: return translations.t("taskList.backgroundNone")
    case "#F87171": return translations.t("taskList.colorRed")
    case "#FBBF24": return translations.t("taskList.colorYellow")
    case "#34D399": return translations.t("taskList.colorGreen")
    case "#38BDF8": return translations.t("taskList.colorBlue")
    case "#818CF8": return translations.t("taskList.colorIndigo")
    case "#A78BFA": return translations.t("taskList.colorPurple")
    default: return translations.t("taskList.colorCustom")
    }
}

private func warmUpStartupData(db: Firestore) {
    guard let uid = Auth.auth().currentUser?.uid else {
        return
    }
    let cachedIds = UserDefaults.standard.stringArray(forKey: taskListOrderCacheKey(uid: uid)) ?? []
    Task(priority: .userInitiated) {
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                _ = try? await db.collection("settings").document(uid).getDocument(source: .cache)
            }
            group.addTask {
                _ = try? await db.collection("taskListOrder").document(uid).getDocument(source: .cache)
            }
            group.addTask {
                var cachedMemberIds: [String] = []
                for taskListId in cachedIds {
                    if let snapshot = try? await db.collection("taskLists")
                        .document(taskListId)
                        .collection("members")
                        .document(uid)
                        .getDocument(source: .cache),
                       snapshot.exists {
                        cachedMemberIds.append(taskListId)
                    }
                }
                for startIndex in stride(from: 0, to: cachedMemberIds.count, by: 10) {
                    let chunk = Array(cachedMemberIds[startIndex..<min(startIndex + 10, cachedMemberIds.count)])
                    _ = try? await db.collection("taskLists")
                        .whereField(FieldPath.documentID(), in: chunk)
                        .getDocuments(source: .cache)
                }
            }
        }
    }
}

@main
struct LightlistApp: App {
    @State private var pendingDeepLink: PendingDeepLink?

    init() {
        FirebaseApp.configure()
        let firestore = Firestore.firestore()
        let firestoreSettings = firestore.settings
        firestoreSettings.cacheSettings = PersistentCacheSettings(sizeBytes: NSNumber(value: FirestoreCacheSizeUnlimited))
        firestore.settings = firestoreSettings
        warmUpStartupData(db: firestore)
        _ = Auth.auth().addStateDidChangeListener { _, user in
            Crashlytics.crashlytics().setUserID(user?.uid ?? "")
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
