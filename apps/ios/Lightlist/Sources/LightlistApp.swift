import SwiftUI
import FirebaseCore
import FirebaseAuth
import FirebaseAppCheck
import FirebaseCrashlytics

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
            ContentView(pendingDeepLink: $pendingDeepLink)
                .onOpenURL { url in
                    pendingDeepLink = parseDeepLink(url)
                }
        }
    }
}
