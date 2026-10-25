# iOS（apps/ios）

ルートの `AGENTS.md` を前提に、iOS 固有の規則と落とし穴をまとめる。提出手順は `docs/release-ios.md`。

## プロジェクト・ビルド

- commit するのは `project.yml` と `Lightlist/` 配下のソース。XcodeGen が生成する `Lightlist.xcodeproj`・`Lightlist/Info.plist`・`xcuserdata`・`build*`・`DerivedData` は含めない。例外として `Lightlist.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` だけは `.gitignore` の否定パターンで追跡する。
- Info.plist は `project.yml` の `info:` で生成する。`INFOPLIST_KEY_*` が効くのは Apple 定義のスカラーキーだけで、配列・辞書（`CFBundleLocalizations` の 11 言語（`zh-CN` は `zh-Hans`）・`UIAppFonts`）は `info.properties` に書く。`CFBundleDevelopmentRegion` は `options.developmentLanguage: ja` で揃える。Push capability は entitlements の `aps-environment` から automatic signing が反映するため `SystemCapabilities` は書かない。テスト target は持たない。
- `shared/locales/locales.json` と `shared/licenses/manual-licenses.json` は `project.yml` の sources で直接 bundle resource にし、コピーを持たない。
- Firebase plist は `Lightlist/Resources/Firebase/{Debug,Release}/GoogleService-Info.plist` に置き（gitignore 対象）、build configuration に応じて bundle 内の `GoogleService-Info.plist` へ 1 つだけコピーする。`BUNDLE_ID` と `PRODUCT_BUNDLE_IDENTIFIER` の不一致は build script で失敗させる。
- URL などの固定値は Info.plist や build setting にせず Swift の定数で持つ（Debug / Release の差は `#if DEBUG`）。
- LicensePlist の build tool plugin は `license_plist.yml` を必須設定として読む。初回 build で Xcode の trust が必要で、CLI では `xcodebuild -skipPackagePluginValidation` を使う。
- lint / format は Xcode 同梱の swift-format（設定 `.swift-format`）。`just lint`（`--strict`）の警告 0 を保つ。`.forEach {}` ではなく for-in、定数・変数は lowerCamelCase で書く。
- Swift 6: Firestore の `@Sendable` completion へ渡す関数は `nonisolated` にする（file 内の private 関数は MainActor と推論されてエラーになる）。async 文脈から completion 版 API を直接呼ぶと「asynchronous alternative」警告が出るため同期 helper 経由で呼ぶ。
- `List` を含む `body` は型検査が失敗しやすい（「failed to produce diagnostic」）。行のまとまりは computed property へ分け、`.onMove(perform:)` に三項演算子で関数参照と `nil` を渡さない。
- 提出: `just archive` が IPA を作り `just verify-ipa` で署名・entitlements・Firebase plist を検証、`just upload` で App Store Connect へ送る。再アップロード時は `project.yml` の `CURRENT_PROJECT_VERSION` を上げる。署名情報は `.env.local`（雛形 `.env.sample`）から読み、証明書・profile・`.p8` をリポジトリに置かない。
- AppIcon は `shared/assets/brand/logo.svg` を白背景の不透明な正方形 PNG にして全スロットへ置く。
- Privacy Manifest（`PrivacyInfo.xcprivacy`）は Crashlytics に uid を設定する限りユーザー ID の宣言を外さない。Crashlytics の例外説明にユーザー入力や生の例外理由を含めない。

## UI 部品

- 色は `AppPalette` だけを使い、system semantic color（`Color(.systemBackground)`・`Color.secondary` など）や `Color.accentColor` を UI に直接使わない。`Menu` / `Picker` のアクセントをモノクロにするため `Assets.xcassets/AccentColor.colorset` の定義を維持する（空にするとシステムの青に戻る）。`Toggle` には `.tint(AppPalette.primary)` を付ける。`Form` の行の `Button` ラベルは `.foregroundStyle(Color.primary)` で指定する（`.primary` だけだと tint 基準の青になる）。
- 共通部品は `ContentView.swift` にあり、画面ごとに独自スタイルを作らない: `AppButtonStyle` / `AppIconButtonStyle` / `.appField()` / `AppFormField` / `AppAlert` / `AppDialog` / `AppPageTitle` / `MonthCalendarView` / `FittedSheetModifier`。`.textFieldStyle(.roundedBorder)`・`.buttonStyle(.borderedProminent)` / `.bordered`・`DatePicker(.graphical)` は使わない。
- ダイアログ（リスト作成・参加・編集・共有）は `AppDialog` で標準のシート構成（`NavigationStack` + inline タイトル、`.cancellationAction` / `.confirmationAction`）にし、確定以外の操作は本文の末尾に置く。task action sheet は `FittedSheetModifier`（iOS 18 以降の iPad は `.form.fitted`）、カレンダーのタスクシートは確定ボタンを固定するため `.large`。
- push 画面は標準ナビゲーションバー（標準の戻るボタン・戻るスワイプ）を使い、自前ヘッダーに置き換えない。タイトル書体は `LightlistApp.init` の `UINavigationBar.appearance()` で指定する。root のタスクリスト一覧はバーを隠すが、戻るボタンのラベルに使われるため `.navigationTitle` は付ける。regular 幅は `NavigationSplitView` のサイドバーに `TaskListsView` を置き、バーを隠して `AppPageTitle` を本文に置く。
- iOS 26 の toolbar item は既定で Liquid Glass のボタン風背景が付く。今日の日付など操作できない表示は `.principal` に置き、`sharedBackgroundVisibility(.hidden)` + `allowsHitTesting(false)` にする（`.topBarTrailing` などボタン用の placement に置かない）。
- タスクリストの背景色は `resolveTaskListBackgroundColor` で解決し、背景色付きのページとインジケータは `taskListColorScheme` で `.light` に固定する。sheet / alert はその外側に置き、履歴 popover には元の `colorScheme` を渡す。compact のバーは `taskListNavigationBar` + `toolbarColorScheme(.light)` にする（`toolbarColorScheme` はバー背景が visible のときだけ効く）。背景は top chrome の `safeAreaInset` より外側に付ける。
- 全画面ルートと sheet / dialog は `frame(maxWidth: .infinity, maxHeight: .infinity)` を保ち、safe area は背景ビューだけで無視する。

## タスクリスト詳細・並び替え

- 横ページャー（`TabView(.page)`）は戻るスワイプを横取りするため、`PagerBackSwipeEnabler` が先頭ページでの右スワイプ（LTR のみ）を pop に割り当てる。ページャーの pan / swipe recognizer にはこの recognizer と `interactivePopGestureRecognizer` の失敗を要求する。
- compact のインジケータは `safeAreaInset(edge: .top)` に固定し、各ページはその下端で `mask` してタスクがインジケータの下へスクロールしないようにする（背景色は `mask` の外側に付ける）。スクロール量は `@Observable` の `TaskListPagerProgress` をインジケータだけが読み、ページを再描画しない。
- タスクリスト一覧は `List` + `.onMove` + `.environment(\.editMode, .constant(.active))` で行末に標準ハンドルを常時表示する（`onDelete` は付けない）。行内に `NavigationLink` を置くと disclosure が付くため、遷移は `Button` で path を操作する。
- タスク一覧は `List` にしない（行頭に handle を置けず、常時編集モードでは本文の長押しドラッグが無効になり、ドラッグ中に横ページャーが切り替わる）。`ScrollView` 内の `LazyVStack` で描き、`.contextMenu` も付けない。
- ドラッグは親 `ScrollView` の named coordinate space を基準に追跡し、swap 判定は `GeometryReader` で集めた隣接行の高さ（`taskItemHeights`、未計測は現在行の高さで代用）だけを使う。`frame(in:)` の位置監視を drag state に戻さない。
- 本文の長押し並び替えは `TaskLongPressDragGesture`（`UIGestureRecognizerRepresentable`、iOS 18 以降）で付ける。SwiftUI の `LongPressGesture.sequenced(before: DragGesture)` は `simultaneousGesture` だとスクロールとページ切替を止め、`gesture` だと発火せず、`highPriorityGesture` だとタップ編集を壊す。`Button` に付けた representable も発火しないため、iOS 18 以降の本文は `onTapGesture` + button trait の非 `Button`、iOS 17 は `Button` のまま（drag handle だけで並び替え）にする。
- 取り消し線は `StrikethroughText` の mask で伸ばし、件数は `numericText` で差し替える。
- pin prefix の照合に `.diacriticInsensitive` を使わない（大文字小文字だけを無視する）。

## 状態・Firebase

- 認証状態の監視と認証画面の表示は `RootView` に集約する。子 view は `currentUserId` を引数で受け取り、`onAppear` と `onChange(of: currentUserId)` で view model を bind する。settings は `RootView` の `SettingsViewModel` 1 つだけが購読し（テーマ・言語・UserDefaults キャッシュ・通知端末の登録・初期データの自己修復を担う）、子は `environmentObject` で参照する。
- `TaskListsView` は `onDisappear` で listener を解除しない（push / pop で再購読させない）。`OrderedTaskListViewModel` は `deinit` で解放し、`CalendarViewModel` は `CalendarScreenView` 自身が bind する。task の mutation queue は view ではなく `TaskListMutationQueues`（プロセス内の taskListId 登録）で保持する。
- 起動: `LightlistApp.init` で `FirebaseApp.configure()` 直後に `PersistentCacheSettings`（無制限）を設定し、`warmUpStartupData()` で cache 読み取りを並列に始める。言語・テーマ・起動画面は UserDefaults（`lightlist.language` / `lightlist.theme` / `lightlist.startupView`）から初回フレームで使い、初期 path は `AppRoute.startupPath()` で決める。`publishTaskLists` は `.loading` 中でも非空になれば `.ready` にする。
- `Translations` は `locales.json` の parse 結果を static にキャッシュする。未ログイン時の言語は `resolveDeviceLanguage()` で決める。`RootView` が locale・gregorian calendar・`layoutDirection` をルート環境に設定する。
- deep link は `PendingDeepLink` へ変換して `RootView` で振り分ける。
- Auth の callback と listener からの state 更新は MainActor 上で行い、ログイン completion で `error` と `result` がともに空の場合も汎用エラーを表示する。
- オンライン判定は `NetworkStatus.shared`、同期失敗は `SyncFailureCenter.shared.report()`。queue 外の batch（リスト作成・削除）は `commitReportingFailure(_:)` で commit する。
- 前景復帰時の Firestore 再接続は SDK が行うため、Web / Android のような張り直しを追加しない。
- FCM token は `didRegisterForRemoteNotificationsWithDeviceToken` で APNs token を設定した後に取得する（`registerForRemoteNotifications()` の直後には取れない）。

## 主要コマンド

- `just format` / `just lint` / `just build` / `just build-release`
- `just run`、`just simulator <名前または UDID>` / `just simulator-list`、`just screenshot`
- `just archive` / `just verify-ipa` / `just upload` / `just signing-report`
- `xcodegen generate`（`project.yml` → `.xcodeproj`）
