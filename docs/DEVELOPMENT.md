# 開発

## モノレポ

- npm workspaces + Turbo を使います。
- workspace は `apps/web`、`apps/native`、`packages/sdk` です。
- iOS ネイティブ実装は `apps/ios`、Swift Package は `packages/sdk-swift` で管理します。

## コマンド

- ルート
  - `npm run dev`
  - `npm run build`
  - `npm run format`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run deploy:firestore`
  - `npm run deploy:firestore:prod`
- Web
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run typecheck`
- Native
  - `npm run dev`
  - `npm run dev:lan`
  - `npm run dev:local`
  - `npm run lint`
  - `npm run typecheck`
- iOS
  - `xcodegen generate`
  - `xcodebuild -scheme Lightlist -destination 'platform=iOS Simulator,...'`
- SDK-Swift
  - `swift build`
  - `swift test`
- SDK
  - `npm run build`
  - `npm run dev`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run deploy:firestore`
  - `npm run deploy:firestore:prod`

## React 依存

- `react` / `react-dom` / `@types/react*` は各 app が管理します。
- ルート `overrides` で React 系は固定しません。
- SDK は `react` を `peerDependencies` で要求します。

## Web 実装上の前提

- `@lightlist/sdk` は `packages/sdk/dist` を配布境界にした workspace package として扱います。
- Web / Native は起動エントリで `initializeSdk()` を呼び、公開 env を SDK へ明示的に渡します。
- `next/font/google` を使うため、Web build はネットワーク到達性が前提です。
- Next.js の環境変数は標準の `.env.production` / `.env.production.local` または deploy 環境変数で供給します。build/start 前に `.env` をコピーしません。
- i18n の言語検出順は `querystring -> localStorage -> navigator -> htmlTag` です。
- `document.documentElement.lang` と `dir` は現在言語へ同期します。

## Native 実装上の前提

- Expo Go を基本にします。
- 起動モードの比較が必要な場合だけ `dev:lan` / `dev:local` を使います。
- `APP_ENV` で app name、bundle id、deep link scheme を切り替えます。
- `APP_ENV` ごとの設定は [app.config.ts](/home/khirayama/Works/lightlist-poc/apps/native/app.config.ts) の typed config map で管理します。

## iOS 実装上の前提

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

## iOS / Swift Package の生成物

- `apps/ios` では `build/`、`DerivedData/`、`xcuserdata`、`xcuserstate` を commit しません。
- `apps/ios/Lightlist/GoogleService-Info.plist` は Firebase コンソールから取得してローカル配置し、commit しません。
- `packages/sdk-swift` では SwiftPM の生成物である `.build/` と `.swiftpm/` を commit しません。

## Turbo 実行順

- `build` は依存 workspace の `build` を先に実行します。
- `dev` は依存 workspace の `build` を先に実行した上で persistent task を起動します。
- `typecheck` は依存 workspace の `build` と `typecheck` を先に実行します。
- `lint` は source を直接検査し、`build` には依存しません。

## 品質ゲート

- `lint` は各 workspace で `eslint . --max-warnings=0` です。
- CI は `build`、`lint`、`typecheck`、`npm audit --audit-level=high` を前提にします。

## 固定仕様

- 共有 URL を知っている未認証ユーザーの閲覧・編集を許可する認可モデルを維持します。
- `apps/web/src/locales/*.json` と `apps/native/src/locales/*.json` は同一キー構造を保ちます。
- agent ドキュメントは恒久的な運用知識だけを書き、進捗や一時メモは書きません。
