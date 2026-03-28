# 開発

## モノレポ

- リポジトリ直下に Node の manifest は置かず、Web の Node ツール・lockfile は `apps/web` に集約します。
- SDK コードは `apps/web/src/lib/` に配置します。
- Web の npm scripts と ESLint / Knip 設定は `apps/web` に集約します。
- root の `Justfile` は Firestore deploy の入口だけを持ちます。

## コマンド

- ルート
  - `just deploy-firestore`
  - `just deploy-firestore-prod`
- Web
  - `npm run dev`
  - `npm run build`
  - `npm run format`
  - `npm run lint`
  - `npm run knip`
  - `npm run typecheck`
- iOS
  - `xcodegen generate`
  - `xcodebuild -scheme Lightlist -destination 'platform=iOS Simulator,...'`

## Web 実装上の前提

- SDK コードは `apps/web/src/lib/` に配置し、`@/lib/*` で import します。
- Firebase 初期化は `apps/web/src/lib/firebase.ts` が環境変数を直接読み取ります。
- `next/font/google` を使うため、Web build はネットワーク到達性が前提です。
- Next.js の環境変数は標準の `.env.production` / `.env.production.local` または deploy 環境変数で供給します。build/start 前に `.env` をコピーしません。
- i18n の言語検出順は `querystring -> localStorage -> navigator -> htmlTag` です。
- `document.documentElement.lang` と `dir` は現在言語へ同期します。

## iOS 実装上の前提

- regular 幅では `NavigationSplitView` を使い、左 360pt サイドバーにタスクリスト一覧と主要操作、右ペインにタスクリスト詳細または設定を表示します。右ペインの詳細は `TabView(.page)` を維持し、横スワイプで選択中タスクリストを切り替えます。
- 認証済みアプリ領域のルート遷移は `RootView` が持ち、`.main` / `.settings` / `.shareCode(String?)` を切り替えます。
- `MainView` はタスクリスト UI に専念し、Settings / ShareCode の遷移はコールバックで `RootView` へ委譲します。
- `MainView` は `GeometryReader` の表示領域サイズを compact / regular 両レイアウトへ明示的に渡し、`TabView(.page)` 自体だけでなく各ページにも同じサイズを適用して内部の LazyView / HostingView まで画面高さいっぱいに固定します。
- `MainView` は compact 幅では `Color(.systemBackground)` を画面全体と `TabView(.page)` コンテナ背景へ適用し、status bar 直下から下端まで白い本文面を連続させます。regular 幅では現在選択中のタスクリスト背景色を外周背景として維持します。
- compact 幅では `SideDrawer` に `DrawerPanel` を載せるオーバーレイドロワーを使い、幅は `min(UIScreen.main.bounds.width, 420)` です。
- compact 幅のタスクリスト表示では、`TaskListView` 自体を full screen コンテナとして描画し、最外層に `Color(.systemBackground)` を `ignoresSafeArea()` で全面へ敷きます。本体は画面いっぱいの `VStack` を同じ白背景で満たし、上部 chrome の操作 UI だけ `GeometryReader.safeAreaInsets.top` 起点で status bar を避け、タスク行は full-width の `ScrollView + LazyVStack` で edge-to-edge に描画します。
- regular 幅では `NavigationSplitView` を使い、サイドバー列幅は `360pt` に固定します。
- `SettingsView` と `ShareCodeView` は sheet ではなく全画面ルートとして扱い、戻るは `onBack` コールバックで制御します。
- iOS の全画面ルートと sheet / dialog は、背景ビューだけでなくコンテンツ本体も `frame(maxWidth: .infinity, maxHeight: .infinity)` 前提の full screen コンテナとして扱います。操作 UI は safe area 内に維持し、独自ヘッダーが必要な画面は `safeAreaInset(edge: .top)` を使い、標準ナビゲーションバーに依存しません。
- `LightlistApp` は `WindowSceneConfigurator` で attach 済み `UIWindow` を受け取り、`backgroundColor`・`additionalSafeAreaInsets`・layout margins を初期化して `UIWindowScene` 側にも余白が見えない状態を保ちます。
- `ScrollView` ベースの全画面フォームはカード化しません。`maxWidth` 制約、外側 `padding`、`RoundedRectangle` の外枠を持たず、画面直下の full screen コンテナとして上寄せ配置します。`Spacer` による縦中央寄せで大きな上下空白を作りません。
- custom header を `safeAreaInset(edge: .top)` で載せる画面では、本文側の大きな先頭余白を足して二重に safe area を消費しません。sheet / dialog でも本文 root を full-height に揃え、`.presentationDetents([.medium])` を使う場合は detent 内で最大化します。
- iOS の翻訳 JSON は `apps/ios/Lightlist/Resources/Locales/*.json` に置きますが、Xcode ビルド後は `Lightlist.app` 直下へフラット配置されます。`Translations` は app bundle 直下の `ja.json` などを直接読みます。

## Android 実装上の前提

- `apps/android/app` は `BuildConfig.DEBUG` を使うため、module の `buildFeatures.buildConfig = true` を維持します。

## iOS の生成物

- `apps/ios` では `build/`、`build-*/`、`DerivedData/`、`xcuserdata`、`xcuserstate` を commit しません。
- `apps/ios/Lightlist/Resources/GoogleService-Info.plist` は Firebase コンソールから取得してローカル配置し、commit しません。
- ルート `.gitignore` は OS / editor / Node / Firebase の共通ローカル生成物を管理し、`apps/web/.gitignore`、`apps/ios/.gitignore`、`apps/android/.gitignore` は各アプリ固有の生成物だけを管理します。
- `apps/ios/Lightlist.xcodeproj/xcuserdata/` は user-specific な Xcode 状態として常に ignore し、commit しません。

## コマンド入口

- Web の Node コマンドを直接使う場合は `cd apps/web && npm run <script>` を使います。
- Firestore deploy は root `Justfile` を使います。
- root `Justfile` は global install された `firebase` CLI を前提にします。

## 品質ゲート

- Web の `lint` は `apps/web` で `eslint . --max-warnings=0` です。
- CI は `build`、`lint`、`typecheck`、`npm audit --audit-level=high` を前提にします。

## 固定仕様

- 共有 URL を知っている未認証ユーザーの閲覧・編集を許可する認可モデルを維持します。
- 文言は `apps/web/src/locales/*.json` で管理します。
- iOS / Android のネイティブ翻訳も `apps/web/src/locales/*.json` を正本として同期します。
- Android の regular 幅では一覧画面を左サイドバー、タスクリスト詳細または設定を右ペインに出す 2カラム構成にし、詳細の `HorizontalPager` と左サイドバーの選択状態を同期します。
- Android の件数表示は hardcode や `strings.xml` の個別管理ではなく、JSON の `taskCount_one` / `taskCount_other` を `count` 付きで解決します。
- agent ドキュメントは恒久的な運用知識だけを書き、進捗や一時メモは書きません。
