# Repository Guidelines

## 基本方針

- 回答・説明・コミットメッセージは日本語で記述する。
- 小さな変更を段階的に進め、各段階で達成を確認する。
- 必ず `context7` と `serena` を活用し、推測ではなく実装事実を根拠に判断する。
- コメント追加は不要。テスト追加は不要。後方互換性は考慮不要。
- 変更後は `docs/` を実装に合わせて更新し、進捗報告ではなく仕様として記述する。
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
- iOS: `apps/ios`（SwiftUI, iOS 16+）— XcodeGen (`project.yml`) でプロジェクト生成
- Android: `apps/android`（Kotlin + Gradle）
- SDK（Firebase Auth/Firestore、状態管理・ミューテーション）は `apps/web/src/lib/` に統合済み。独立パッケージ (`packages/sdk`) は廃止。
- Firebase 初期化は `apps/web/src/lib/firebase.ts` に閉じ、`process.env.NEXT_PUBLIC_FIREBASE_*` を直接読む。別途の初期化呼び出しは不要。
- pages / components は `firebase/*` を直接 import しない。認証・設定・タスクリストの購読は `@/lib/session` / `@/lib/settings` / `@/lib/taskLists` を使う。
- Firebase デプロイ設定（`firestore.rules`, `firebase.json`, `.firebaserc`, `firestore.indexes.json`）はリポジトリルートに配置。
- `.gitignore` はルートで共通ローカル生成物（OS / editor / Node / Firebase 設定）を管理し、`apps/web/.gitignore` / `apps/ios/.gitignore` / `apps/android/.gitignore` は各アプリ固有の生成物だけを管理する。
- `apps/ios` の commit 対象は `project.yml` と `Lightlist/` 配下のソースを基本とし、`xcuserdata` / `xcuserstate` / `build` / `build-*` / `DerivedData` は含めない。`GoogleService-Info.plist` は `apps/ios/Lightlist/Resources/` にローカル配置して `.gitignore` で除外する。
- iOS の i18n は JSON ベースの `Localizer`（`apps/ios/Lightlist/Utilities/Localizer.swift`）で、`apps/web` と同一キー構造の JSON を `Resources/Locales/` に配置して使う。String Catalog (.xcstrings) は採用しない。
- Android の i18n も `apps/web/src/locales/*.json` を `apps/android/app/src/main/assets/locales/` へ同期して使う。件数表示やアクセシビリティ文言を含め、Android だけ `strings.xml` に分岐させず shared locale key を優先する。
- Android の件数表示は `taskList.taskCount_one` / `taskList.taskCount_other` を `count` 付きで解決し、`"${count}個のタスク"` のような直書きを持ち込まない。
- iOS の RTL 対応は `LightlistApp.swift` で `.environment(\.layoutDirection, ...)` をルートに設定し、SwiftUI の自動反転に委ねる。再起動不要。
- iOS のディープリンクは `lightlist://password-reset?oobCode=...`（パスワードリセット）と `lightlist://sharecodes/CODE` または `https://lightlist.com/sharecodes/CODE`（共有コード）を処理する。`RootView.handleDeepLink` で分岐。
- iOS の認証済み画面遷移は `RootView` の `AppRoute`（`.main` / `.settings` / `.shareCode(String?)`）で管理し、`MainView` はタスクリスト UI のみを担当する。compact 幅は `SideDrawer`、regular 幅は `NavigationSplitView` の 360pt サイドバーで `DrawerPanel` を使う。`SideDrawer` は本体コンテンツとドロワーを縦方向も上揃えで配置する。
- iOS / Android の tablet regular 幅は、左 360pt 前後のサイドバーにタスクリスト一覧と主要操作を置き、右ペインにタスクリスト詳細または設定を表示する。詳細の pager (`TabView(.page)` / `HorizontalPager`) とサイドバー選択状態は双方向同期する。
- iOS の `MainView` は `GeometryReader` の表示領域サイズを compact / regular レイアウトへ明示的に渡し、`TabView(.page)` 自体と各ページの両方へ同じサイズを適用して内部の LazyView / HostingView まで内容サイズへ縮まないようにする。
- iOS の `MainView` は compact 幅では `Color(.systemBackground)` を画面全体と `TabView(.page)` コンテナ背景へ適用し、status bar 直下から下端まで白い本文面を連続させる。regular 幅のみ現在選択中のタスクリスト背景色を外周背景として使う。
- iOS の compact 幅タスクリスト画面は `TaskListView` 自体を full screen コンテナとして描画し、最外層は `Color(.systemBackground)` を `ignoresSafeArea()` で全面へ敷く。本体は画面いっぱいの `VStack` を同じ白背景で満たし、上部 chrome の操作 UI だけ `GeometryReader.safeAreaInsets.top` 起点で status bar を避け、タスク行は full-width の `ScrollView + LazyVStack` でカード化せず edge-to-edge に構成する。
- iOS の SwiftUI 並び替えドラッグは、移動中の行の local 座標系ではなく親 `ScrollView` の named coordinate space を基準に追跡し、swap 判定は `GeometryReader` で収集した行高さだけを使う。`frame(in:)` の位置監視を drag state に戻さない。
- iOS の全画面ルートと sheet / dialog は `frame(maxWidth: .infinity, maxHeight: .infinity)` を維持しつつ、背景ビュー側だけで safe area を無視する。標準ナビゲーションバーを使わない iPhone ヘッダーは `SafeAreaNavigationHeader` と `safeAreaInset(edge: .top)` を使う。`LightlistApp` は hidden `UIViewRepresentable` の `WindowSceneConfigurator` で attach 済み `UIWindow` を初期化し、window 背景色と root view controller の safe area / layout margins も全画面前提に揃える。`ScrollView` ベースの全画面フォームはカードラッパーを持たず、外側 `maxWidth` 制約や `RoundedRectangle` でカード化しない。
- iOS の custom header 付き画面と sheet / dialog は、header を `safeAreaInset(edge: .top)` に載せ、本文 root も `frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)` で画面高または detent 高いっぱいまで広げる。header inset と重複する大きな `padding(.top)` は本文側で足さず、追加の視覚余白は最小限に留める。
- iOS の VoiceOver 対応はアイコンのみのボタンに `accessibilityLabel`、タスク完了トグルに `accessibilityHint`、ヘッダーに `.isHeader` trait を設定する。
- iOS の Firebase Analytics は `FirebaseApp.configure()` で自動有効化、Crashlytics は `FirebaseManager.configure()` で明示有効化。
- iOS の CI は `.github/workflows/ios.yml`（GitHub Actions, macOS 15 + Xcode 16, Simulator ビルド）。`apps/ios/` 変更時にトリガー。
- iOS の App Store 提出: Release ビルドは `PASSWORD_RESET_URL=https://lightlist.com/password_reset`。`ITSAppUsesNonExemptEncryption: NO` で暗号化輸出規制を申告。`PrivacyInfo.xcprivacy` で Privacy Manifest を宣言（メールアドレス、クラッシュデータ、Analytics、UserDefaults API）。
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は「`taskListOrder` から外す」を基本とする。`memberCount` が 0 になった場合のみ `taskLists` 実体を削除する。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を仕様として固定する。production readiness 評価で挙がった認可モデル再設計（item1）は 2026-03 時点で対応不要とする。
- パスワードリセットURLは `NEXT_PUBLIC_PASSWORD_RESET_URL`（Web）が必須。prod 設定で `localhost` を使わない。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。
- `apps/web/src/locales/*.json` は英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- Web は言語切替時に `document.documentElement.lang` と `dir` を同期する。`ar` は RTL、それ以外は LTR。
- Web の `StartupSplash` は hydration mismatch を避けるため、読み上げラベルを i18n の初期言語解決に依存させず固定文字列（`読み込み中`）で扱う。
- Web の `Carousel` は `direction` prop を必須運用し、RTL 時の `scrollLeft` はブラウザ差分（positive/negative）を正規化して index を算出する。
- `apps/web` では画面固有、または 1〜2 箇所でしか使わない UI / helper / hook は standalone file にせず、`pages/*` または直近のドメインファイルへ近接配置する。2026-03 時点では `pages/app.tsx` が drawer / calendar sheet を内包し、`TaskListCard` が task item と候補 UI を内包する。
- Web の主要ページ:
  - `apps/web/src/pages/index.tsx`（ランディング）
  - `apps/web/src/pages/login.tsx`（サインイン/サインアップ/リセット依頼）
  - `apps/web/src/pages/app.tsx`
  - `apps/web/src/pages/settings.tsx`
  - `apps/web/src/pages/password_reset.tsx`
  - `apps/web/src/pages/sharecodes/[sharecode].tsx`
  - `apps/web/src/pages/404.tsx`（カスタム404ページ）
  - `apps/web/src/pages/500.tsx`（カスタム500ページ）
- 共通 import:
  - Web アプリ内: `@/*`
  - SDK / ビジネスロジック: `@/lib/*`
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
  - `xcodegen generate`（`project.yml` → `.xcodeproj` 生成）
  - Xcode で開いてビルド（CLI: `xcodebuild -scheme Lightlist -destination 'platform=iOS Simulator,...'`）
  - `GoogleService-Info.plist` は `.gitignore` で除外。Firebase コンソールからダウンロードして `apps/ios/Lightlist/Resources/` に配置

## セキュリティ・品質ルール

- `console.error` にユーザーメール等の PII（個人識別情報）を含めない。`userEmail` は必ずログから除外する。
- `taskLists.ts` は `taskListOrder` 購読と taskList chunk 購読を別々に管理する。固定 index 前提の購読解除配列は持ち込まない。
- `ErrorBoundary` はクラスコンポーネントのため `withTranslation()` HOC で i18next を注入する（`useTranslation` フック不可）。
- CI（`.github/workflows/quality.yml`）の `npm audit --audit-level=high` は必須ステップ。削除しない。

## 作業完了チェック

1. 変更内容を見直し、無駄な変数・関数・分割がないことを確認する。
2. `docs/` を実装に合わせて更新し、仕様として記述する。
3. agent 向けドキュメント（`AGENTS.md` / `CLAUDE.md` / `GEMINI.md`）に恒久的な知見の追記・修正が必要か確認し、必要なら更新する。
4. `cd apps/web && npm run format` を実行する。
5. `cd apps/web && npm run build` と `cd apps/web && npm run typecheck` を実行し、エラーがないことを確認する。
6. 明示指示がない限りコミットしない。
