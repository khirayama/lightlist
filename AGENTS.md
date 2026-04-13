# Repository Guidelines

## 基本方針

- 回答・説明・コミットメッセージは日本語で記述する。
- 小さな変更を段階的に進め、各段階で達成を確認する。
- 必ず `context7` と `serena` を活用し、推測ではなく実装事実を根拠に判断する。
- コメント追加は不要。テスト追加は不要。後方互換性は考慮不要。
- 変更後は `docs/` を実装に合わせて更新し、進捗報告ではなく仕様として記述する。
- `docs/` は内部コンポーネント一覧や import 構成の重複管理を避け、ドメイン仕様・必須設定・運用上の制約に絞る。
- agent 向けドキュメント（`AGENTS.md` / `CLAUDE.md` / `GEMINI.md`）は作業で得た恒久的な知見を蓄積する場所として扱い、完了時に必要な更新があれば行う。

## 実装スタンス

- 実装はシンプルで見通しよく、正常系と主要エラー処理に集中する。
- 不要な抽象化や過剰な分割は避け、冗長コードは削除する。
- TypeScript で厳密に型付けし、`any` / `unknown` は極力使わない。
- UI は i18next 前提・テーマ（system/light/dark）前提で実装する。
- Web/iOS/Android で自然な操作感を優先し、アクセシビリティ（色覚、キーボード、読み上げ）に配慮する。

## Agentドキュメント運用

- `AGENTS.md` を運用ルールの正本とし、`CLAUDE.md` / `GEMINI.md` は要点を揃えて整合させる。
- 作業完了時に、今回の変更で再利用価値のある恒久ルール・手順・コマンド・構成差分が増えた場合は、agent ドキュメントを更新する。
- 一時的な調査メモ、進捗報告、タスク固有の事情は agent ドキュメントに書かない。
- 更新判断に迷う場合は「次回以降の別タスクでも参照価値があるか」で判断する。

## プロジェクト構成

- リポジトリ直下に Node の manifest は置かず、Web の Node ツール・lockfile は `apps/web` に集約する。
- Web: `apps/web`（Next.js Pages Router + TypeScript + Tailwind）
- iOS: `apps/ios`（SwiftUI, iOS 17+）— XcodeGen (`project.yml`) でプロジェクト生成
- Android: `apps/android`（Kotlin + Gradle）
- SDK（Firebase Auth/Firestore、状態管理・ミューテーション）は `apps/web/src/lib/` に統合済み。独立パッケージ (`packages/sdk`) は廃止。
- Firebase 初期化は `apps/web/src/lib/firebase.ts` に閉じ、`process.env.NEXT_PUBLIC_FIREBASE_*` を直接読む。Web の App Check も同ファイルで初期化し、`NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` を使う。別途の初期化呼び出しは不要。
- pages は `firebase/*` を直接 import しない。Web 共通コードは `apps/web/src/common.tsx` へ集約し、page 側は `@/common` を使う。
- Firebase デプロイ設定（`firestore.rules`, `firebase.json`, `.firebaserc`, `firestore.indexes.json`）はリポジトリルートに配置。
- `.gitignore` はルートで共通ローカル生成物（OS / editor / Node / Firebase 設定）を管理し、`apps/web/.gitignore` / `apps/ios/.gitignore` / `apps/android/.gitignore` は各アプリ固有の生成物だけを管理する。
- `apps/ios` の commit 対象は `project.yml` と `Lightlist/` 配下のソースを基本とし、`xcuserdata` / `xcuserstate` / `build` / `build-*` / `DerivedData` は含めない。`GoogleService-Info.plist` は `apps/ios/Lightlist/Resources/` にローカル配置して `.gitignore` で除外する。entitlements は `apps/ios/Lightlist/Lightlist.entitlements` を使う。
- Web の i18n 初期化、対応言語定義、言語正規化、方向判定、翻訳依存のエラー解決・バリデーションは `apps/web/src/common.tsx` に集約する。
- タスク入力先頭の日付読み取り仕様は Web の `apps/web/src/common.tsx` を正本とし、iOS / Android も対応言語・数字正規化・先頭一致ルールを揃える。
- locale の正本は `shared/locales/locales.json` 1 ファイルとし、Web / iOS / Android はその JSON を各 app 起動前または build 時にローカル resource へ同期して読む。String Catalog (.xcstrings) は採用しない。
- Android の件数表示は `taskList.taskCount_one` / `taskList.taskCount_other` を `count` 付きで解決し、`"${count}個のタスク"` のような直書きを持ち込まない。
- Android の設定値表示やアクセシビリティ文言も shared locale key を正とし、`system` / `top` / `Settings` / 固定曜日名のような raw value や固定言語文字列を直接表示しない。
- Android の i18n は `apps/android/app/src/main/java/com/example/lightlist/ContentView.kt` 内の `Translations` で `locales.json` の言語ノードを読み分けて使う。
- Android の app module は `ContentView.kt` 内の analytics helper が `BuildConfig.DEBUG` を参照するため、`apps/android/app/build.gradle.kts` の `buildFeatures.buildConfig = true` を維持する。
- Android のパスワードリセット URL は `BuildConfig.PASSWORD_RESET_URL` で管理し、既定値は `https://lightlist.com/password_reset` とする。
- iOS の RTL 対応は `ContentView.swift` 内の `LightlistApp` で `.environment(\.layoutDirection, ...)` をルートに設定し、SwiftUI の自動反転に委ねる。再起動不要。
- iOS のディープリンクは `lightlist://password-reset?oobCode=...`（パスワードリセット）と `lightlist://sharecodes/CODE` または `https://lightlist.com/sharecodes/CODE`（共有コード）を処理する。`LightlistApp` で URL を `PendingDeepLink` へ変換し、`ContentView` 側でパスワードリセット画面または共有リストプレビューへ振り分ける。共有コードは未認証でもプレビューを開き、ログイン済みかつ未参加のときだけ `taskListOrder` 追加導線を出す。
- Android のディープリンクは `lightlist://password-reset?oobCode=...`、`lightlist://sharecodes/CODE`、`https://lightlist.com/sharecodes/CODE`、`https://lightlist.com/password_reset?oobCode=...` を処理し、`ContentView.kt` 内の `MainActivity` で `PendingDeepLink` へ変換して UI 側で処理する。共有コードは未認証でもプレビューを開き、ログイン済みかつ未参加のときだけ `taskListOrder` 追加導線を出す。
- iOS / Android の認証 UI は `signin` / `signup` / `reset` の 3 導線を持ち、認証前でも言語切替を行える。ネイティブ側で Firebase Auth と Firestore 初期データ作成を完結させる。
- iOS の認証済み画面遷移は `RootView` の `AppRoute`（`.main` / `.settings` / `.shareCode(String?)`）で管理し、`MainView` はタスクリスト UI のみを担当する。compact 幅は `SideDrawer`、regular 幅は `NavigationSplitView` の 360pt サイドバーで `DrawerPanel` を使う。`SideDrawer` は本体コンテンツとドロワーを縦方向も上揃えで配置する。
- iOS / Android の tablet regular 幅は、左 360pt 前後のサイドバーにタスクリスト一覧と主要操作を置き、右ペインにタスクリスト詳細または設定を表示する。詳細の pager (`TabView(.page)` / `HorizontalPager`) とサイドバー選択状態は双方向同期する。
- iOS の `MainView` は `GeometryReader` の表示領域サイズを compact / regular レイアウトへ明示的に渡し、`TabView(.page)` 自体と各ページの両方へ同じサイズを適用して内部の LazyView / HostingView まで内容サイズへ縮まないようにする。
- iOS の `MainView` / `TaskListView` / `RegularTaskListView` は、選択中タスクリストの `background` を詳細画面背景として使う。compact 幅は safe area を含む全面、regular 幅は detail column 内だけに適用し、sidebar と split 境界線には広げない。各 `TaskListDetailPage` 本文も同じ色を使い、未設定時だけ `Color(.systemBackground)` にフォールバックする。
- iOS の compact 幅タスクリスト画面は `TaskListView` 自体を full screen コンテナとして描画し、最外層背景は選択中タスクリストの `background` を `ignoresSafeArea()` で全面へ敷く。本体は画面いっぱいの `VStack` を同じ背景で満たす。ページャーのインジケータだけを固定表示し、タスクリスト名、タスク追加欄、並び替え・完了済み削除操作、タスク行は同じ `ScrollView + LazyVStack` に載せて edge-to-edge にスクロールさせる。regular 幅では detail 側の背景を clip し、divider は sidebar 側の通常背景で固定する。
- Android の `TaskListView` は選択中タスクリストの `background` を詳細ペイン背景として使う。compact 幅は画面全体、regular 幅は右ペインだけに適用し、左ペインと split 境界線は `MaterialTheme.colorScheme.background` / `outlineVariant` で固定する。`TaskListDetailPage` はページャーのインジケータだけを固定表示し、タスクリスト名、タスク追加欄、並び替え・完了済み削除操作、タスク一覧を同じ `LazyColumn` に含める。
- Android の一覧ヘッダー、詳細ヘッダー、設定ヘッダー、カレンダー確認シートの上部クロームは `WindowInsets.safeDrawing` を反映し、ステータスバーと重ねない。詳細/設定の共通ヘッダーは safe area 分を外側コンテナで確保し、戻るボタンやタイトルの固定高さを inset と共有しない。
- Android のタスクリスト詳細の密度調整は global typography ではなく `TaskListDetailPage` ローカルの metrics で行い、iOS に近い視覚バランスへ寄せつつ edit/share/add/date/complete/drag の `48dp` タップ領域は維持する。
- Android の task 日付設定ダイアログは platform `DatePickerDialog` を使い、positive button は `pages.tasklist.setDateShort`、neutral button は `pages.tasklist.clearDateShort` を使って 3 ボタンを横並びに収める。Compose Material3 `DatePicker` と custom 月間カレンダーは使わない。
- iOS のアプリ内アイコンは `ContentView.swift` の metrics を正とし、標準アクションとナビゲーション `22pt`、テキスト横の補助アクション `18pt`、詳細画面の小型アクション `20pt` を基準に目視サイズを揃える。AppIcon 資産とは分けて扱う。
- Android のアプリ内アイコンは `ContentView.kt` の metrics を正とし、標準アクション `24dp`、テキスト横の補助アクション `18dp`、詳細画面の小型アクション `20dp` を基準に目視サイズを揃える。launcher icon 資産とは分けて扱う。
- Android の `TaskListDetailPage` は、タイトル・入力欄・操作列のセクション間余白と、タスク行同士の余白を別メトリクスで管理する。タスク行間はセクション間より詰める。
- iOS / Android の compact 幅タスクリスト詳細は、戻るボタン行とページャーインジケータ行を分離し、入力欄の追加ボタンは入力文字がある時だけ表示する。未完了トグルは薄い枠線円、完了トグルは薄いグレー塗り円で描画し、参考画面に近い密度へ寄せる。
- iOS / Android の task row は drag handle・完了トグル・本文の縦方向中心を揃え、日付ラベルは本文や編集欄の縦位置を押し下げず、同じ本文領域内の直上へ近接表示する。iOS は日付ラベル下の余白を負方向に少し詰め、本文領域の中心線を基準に揃える。
- iOS / Android の `TaskListDetailPage` は `autoSort` 有効時、タスク追加・完了切替・本文編集・日付変更・完了済み削除ごとに `未完了 -> date -> order` で再採番した `tasks.*` 全体を Firestore へ保存する。
- iOS の SwiftUI 並び替えドラッグは、移動中の行の local 座標系ではなく親 `ScrollView` の named coordinate space を基準に追跡し、swap 判定は `GeometryReader` で収集した行高さだけを使う。`frame(in:)` の位置監視を drag state に戻さない。
- iOS の全画面ルートと sheet / dialog は `frame(maxWidth: .infinity, maxHeight: .infinity)` を維持しつつ、背景ビュー側だけで safe area を無視する。標準ナビゲーションバーを使わない iPhone ヘッダーは `SafeAreaNavigationHeader` と `safeAreaInset(edge: .top)` を使う。`LightlistApp` は hidden `UIViewRepresentable` の `WindowSceneConfigurator` で attach 済み `UIWindow` を初期化し、window 背景色と root view controller の safe area / layout margins も全画面前提に揃える。`ScrollView` ベースの全画面フォームはカードラッパーを持たず、外側 `maxWidth` 制約や `RoundedRectangle` でカード化しない。
- iOS の custom header 付き画面と sheet / dialog は、header を `safeAreaInset(edge: .top)` に載せ、本文 root も `frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)` で画面高または detent 高いっぱいまで広げる。header inset と重複する大きな `padding(.top)` は本文側で足さず、追加の視覚余白は最小限に留める。
- iOS の VoiceOver 対応はアイコンのみのボタンに `accessibilityLabel`、タスク完了トグルに `accessibilityHint`、ヘッダーに `.isHeader` trait を設定する。
- iOS の Firebase Analytics は `FirebaseApp.configure()` で自動有効化し、Crashlytics / App Check も `ContentView.swift` 内の `LightlistApp` で初期化する。
- iOS の Firebase Auth callback と auth state listener から SwiftUI state を更新する処理は MainActor 上で行い、ログイン completion で `error` と `result` がともに空の場合も汎用認証エラーを表示する。
- iOS の App Store 提出: Release ビルドは `PASSWORD_RESET_URL=https://lightlist.com/password_reset`。`ITSAppUsesNonExemptEncryption: NO` で暗号化輸出規制を申告し、`Lightlist/Resources/PrivacyInfo.xcprivacy` で Privacy Manifest を宣言する（メールアドレス、クラッシュデータ、Product Interaction、UserDefaults API）。
- iOS の bundle identifier と Android の applicationId は `com.lightlist.app` を正とする。
- iOS の AppIcon は `shared/assets/brand/logo.svg` を元に、白背景の不透明な正方形 PNG として `apps/ios/Lightlist/Resources/Assets.xcassets/AppIcon.appiconset` の全スロットへ配置する。
- Android の launcher icon は `shared/assets/brand/maskable-512.png` を正とし、70% に縮小して中央配置した素材から adaptive icon と density 別 mipmap を生成する。themed icon 用の monochrome layer は同じ意匠の単色 vector を使う。
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は「`taskListOrder` から外す」を基本とする。`memberCount` が 0 になった場合のみ `taskLists` 実体を削除する。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を仕様として固定する。production readiness 評価で挙がった認可モデル再設計（item1）は 2026-03 時点で対応不要とする。
- パスワードリセットURLは `NEXT_PUBLIC_PASSWORD_RESET_URL`（Web）が必須。prod 設定で `localhost` を使わない。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。
- `shared/locales/locales.json` は英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- Web は言語切替時に `document.documentElement.lang` と `dir` を同期する。`ar` は RTL、それ以外は LTR。
- Web の `StartupSplash` は hydration mismatch を避けるため、読み上げラベルを i18n の初期言語解決に依存させず固定文字列（`読み込み中`）で扱う。
- Web の `Carousel` は `direction` prop を必須運用し、RTL 時の `scrollLeft` はブラウザ差分（positive/negative）を正規化して index を算出する。
- Web の認証後シェルは `apps/web/src/pages/app.tsx` を単一入口とし、`/app#/task-lists` を stack root、`/app#/task-lists/:taskListId` を task list 詳細、`/app#/settings` を設定画面として扱う。`/app` は bootstrap alias として client mount 後に `#/task-lists` を積み、初期 task list があれば `#/task-lists/:taskListId` を push する。`/settings` の独立 route は持たない。
- Web の開発サーバーと production build は `next dev --webpack` / `next build --webpack` を使う。Next 16 系の Turbopack は `shared/locales/locales.json` のような repo 共通 resource 参照や Vercel の `onBuildComplete` と相性が悪いため、dev/build とも webpack に固定する。
- Web の本番レスポンスヘッダは `apps/web/next.config.js` で管理し、`Content-Security-Policy`、`Referrer-Policy`、`X-Content-Type-Options`、`X-Frame-Options`、`Permissions-Policy`、`Strict-Transport-Security` を付与する。
- 配信用スクリーンショットの元画像は `apps/ios/screenshots` / `apps/android/screenshots` / `apps/web/screenshots` に置き、生成は `cd apps/web && npm run screenshots:generate -- <target>` またはルートの `just screenshots <target>` で行う。出力は iOS が `apps/ios/screenshots/app-store/iphone-6.9`、Android が `apps/android/screenshots/google-play/phone`、Web が `apps/web/public/screenshots/store/{wide,narrow}`。変換は中央基準の cover crop を使い、iOS App Store は `1290x2796`、Google Play phone は `1080x1920`、Web manifest screenshots は wide `1920x1080` / narrow `750x1334` を正とする。現行フローは iPhone 比率の元画像だけを対象にし、iPad App Store スクリーンショットは別途 iPad 実画面の元画像追加が必要。
- `apps/web` では `pages/*` 以外の共通 TS/TSX は `apps/web/src/common.tsx` 1 ファイルへ集約し、route file 側は page 固有ロジックだけを持つ。
- Web の主要ページ:
  - `apps/web/src/pages/index.tsx`（ランディング）
  - `apps/web/src/pages/login.tsx`（サインイン/サインアップ/リセット依頼）
  - `apps/web/src/pages/app.tsx`
  - `apps/web/src/pages/password_reset.tsx`
  - `apps/web/src/pages/sharecodes/[sharecode].tsx`
  - `apps/web/src/pages/404.tsx`（カスタム404ページ）
  - `apps/web/src/pages/500.tsx`（カスタム500ページ）
- 共通 import:
  - Web アプリ内: `@/*`
  - Web 共通コード: `@/common`
- Analytics の実装は `apps/web/src/lib/analytics.ts` に集約。PII をパラメータに含めない。イベント設計は `docs/ANALYTICS.md` を参照。

## 主要コマンド

- ルート:
  - `just deploy-firestore`
  - `just deploy-firestore-prod`
- `apps/web`:
  - `npm run dev`
  - `npm run build`
  - `npm run format`
  - `npm run lint`
  - `npm run knip`
  - `npm run typecheck`
- `apps/ios`:
  - `just build`
  - `xcodegen generate`（`project.yml` → `.xcodeproj` 生成）
  - Xcode で開いてビルド（CLI: `xcodebuild -scheme Lightlist -destination 'platform=iOS Simulator,...'`）
  - `GoogleService-Info.plist` は `.gitignore` で除外。Firebase コンソールからダウンロードして `apps/ios/Lightlist/Resources/` に配置
- `apps/android`:
  - `just lint`
  - `just build`
  - `just run`（通常は上書きインストールで Firebase Auth セッションを保持し、失敗時のみアンインストールして入れ直す）
  - `just run-clean`（明示的なクリーン再インストール用。アプリデータとログイン状態は消える）

## セキュリティ・品質ルール

- `console.error` にユーザーメール等の PII（個人識別情報）を含めない。`userEmail` は必ずログから除外する。
- `taskLists.ts` は `taskListOrder` 購読と taskList chunk 購読を別々に管理する。固定 index 前提の購読解除配列は持ち込まない。
- `ErrorBoundary` はクラスコンポーネントのため `withTranslation()` HOC で i18next を注入する（`useTranslation` フック不可）。
- CI による品質ゲートは設定しない。品質確認は変更があった app のローカル検証コマンド実行を正本とする。
- Android の release build は `isMinifyEnabled = true` とし、`allowBackup = false` を維持する。App Check は Debug で debug provider、release で Play Integrity provider を使う。

## 作業完了チェック

1. 変更内容を見直し、無駄な変数・関数・分割がないことを確認する。
2. `docs/` を実装に合わせて更新し、仕様として記述する。
3. agent 向けドキュメント（`AGENTS.md` / `CLAUDE.md` / `GEMINI.md`）に恒久的な知見の追記・修正が必要か確認し、必要なら更新する。
4. 変更があった app ごとに検証を実行する。`apps/web` は `npm scripts`、`apps/ios` / `apps/android` は `Justfile` を正本として扱う。
5. `apps/web` を変更した場合は `cd apps/web && npm run format && npm run lint && npm run build && npm run typecheck` を実行する。
6. `apps/ios` を変更した場合は `cd apps/ios && just build` を実行する。現状 iOS 専用の `lint` / `format` は未設定のため要求しない。
7. `apps/android` を変更した場合は `cd apps/android && just lint && just build` を実行する。現状 Android 専用の `format` は未設定のため要求しない。
8. 明示指示がない限りコミットしない。
