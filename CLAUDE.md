# CLAUDE.md

## 必須ルール

- 日本語で回答する。
- 小さな変更を段階的に進め、各ステップで確認する。
- `context7` と `serena` を必ず使う。
- コメント追加は不要。テスト追加は不要。後方互換性は考慮不要。

## 実装方針

- 過度な抽象化を避け、素直で可読性の高い実装を優先する。
- 正常系と主要なエラー処理に集中する。
- TypeScript で厳密に型付けし、`any` / `unknown` の使用を避ける。
- 不要な処理・関数・ファイルは積極的に削除する。
- 文言は i18next で管理し、テーマ（system/light/dark）対応を維持する。

## プロジェクト実態（2026-03）

- モノレポ: `apps/web`（Next.js）/ `apps/ios`（SwiftUI）/ `apps/android`（Kotlin）
- SDK（Firebase Auth/Firestore、状態管理・ミューテーション）は `apps/web/src/lib/` に統合済み。独立パッケージは廃止。
- Firebase 初期化は `apps/web/src/lib/firebase.ts` に閉じ、`process.env.NEXT_PUBLIC_FIREBASE_*` を直接読む。別途の初期化呼び出しは不要。
- pages / components は `firebase/*` を直接 import しない。認証・設定・タスクリストの購読は `@/lib/session` / `@/lib/settings` / `@/lib/taskLists` を使う。
- Firebase デプロイ設定（`firestore.rules`, `firebase.json`, `.firebaserc`）はリポジトリルートに配置。
- `.gitignore` はルートで共通ローカル生成物を管理し、`apps/web` / `apps/ios` / `apps/android` 配下は各アプリ固有の生成物だけを管理する。
- `apps/ios` では `xcuserdata` / `xcuserstate` / `build` / `build-*` / `DerivedData` と `apps/ios/Lightlist/Resources/GoogleService-Info.plist` を commit しない。
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は `taskListOrder` からの離脱を基本とする（`memberCount` が 0 のときのみ実体削除）。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を固定仕様とし、production readiness 評価の item1（認可モデル再設計）は 2026-03 時点で対応不要とする。
- iOS の認証済み画面遷移は `RootView` の `AppRoute`（`.main` / `.settings` / `.shareCode(String?)`）で管理し、`MainView` はタスクリスト UI のみを担当する。compact 幅は `SideDrawer`、regular 幅は `NavigationSplitView` の 360pt サイドバーで `DrawerPanel` を使う。`SideDrawer` は本体コンテンツとドロワーを縦方向も上揃えで配置する。
- iOS の `MainView` は `GeometryReader` の表示領域サイズを compact / regular レイアウトへ明示的に渡し、`TabView(.page)` 自体と各ページの両方へ同じサイズを適用して内部の LazyView / HostingView まで内容サイズへ縮まないようにする。
- iOS の `MainView` は compact 幅では `Color(.systemBackground)` を画面全体と `TabView(.page)` コンテナ背景へ適用し、status bar 直下から下端まで白い本文面を連続させる。regular 幅のみ現在選択中のタスクリスト背景色を外周背景として使う。
- iOS の compact 幅タスクリスト画面は `TaskListView` 自体を full screen コンテナとして描画し、最外層は `Color(.systemBackground)` を `ignoresSafeArea()` で全面へ敷く。本体は画面いっぱいの `VStack` を同じ白背景で満たし、上部 chrome の操作 UI だけ `GeometryReader.safeAreaInsets.top` 起点で status bar を避け、タスク行は full-width の `ScrollView + LazyVStack` でカード化せず edge-to-edge に構成する。
- iOS の SwiftUI 並び替えドラッグは、移動中の行の local 座標系ではなく親 `ScrollView` の named coordinate space を基準に追跡し、swap 判定は `GeometryReader` で収集した行高さだけを使う。`frame(in:)` の位置監視を drag state に戻さない。
- iOS の全画面ルートと sheet / dialog は `frame(maxWidth: .infinity, maxHeight: .infinity)` を維持しつつ、背景ビュー側だけで safe area を無視する。標準ナビゲーションバーを使わない iPhone ヘッダーは `SafeAreaNavigationHeader` と `safeAreaInset(edge: .top)` を使う。`LightlistApp` は hidden `UIViewRepresentable` の `WindowSceneConfigurator` で attach 済み `UIWindow` を初期化し、window 背景色と root view controller の safe area / layout margins も全画面前提に揃える。`ScrollView` ベースの全画面フォームはカードラッパーを持たず、外側 `maxWidth` 制約や `RoundedRectangle` でカード化しない。
- iOS の custom header 付き画面と sheet / dialog は、header を `safeAreaInset(edge: .top)` に載せ、本文 root も `frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)` で画面高または detent 高いっぱいまで広げる。header inset と重複する大きな `padding(.top)` は本文側で足さず、追加の視覚余白は最小限に留める。
- パスワードリセットURLは `NEXT_PUBLIC_PASSWORD_RESET_URL`（Web）が必須。prod 設定で `localhost` を使わない。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。
- `apps/web/src/locales/*.json` は英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- Android の翻訳資産は `apps/web/src/locales/*.json` を `apps/android/app/src/main/assets/locales/` へ同期して使い、件数表示は `taskList.taskCount_one` / `taskList.taskCount_other` を `count` 付きで解決する。
- Web は言語切替時に `document.documentElement.lang` と `dir` を同期する。`ar` は RTL、それ以外は LTR。
- Web の `StartupSplash` は hydration mismatch 回避のため、読み上げラベルを i18n の初期言語解決に依存させず固定文字列（`読み込み中`）で扱う。
- Web の `Carousel` は `direction` prop で方向を受け取り、RTL 時の `scrollLeft` はブラウザ差分を正規化して index を管理する。
- `apps/web` では画面固有、または 1〜2 箇所でしか使わない UI / helper / hook は standalone file にせず、`pages/*` または直近のドメインファイルへ近接配置する。
- Web 認証ページ: `apps/web/src/pages/login.tsx`
- 共有ページ: `apps/web/src/pages/sharecodes/[sharecode].tsx`
- Firestore デプロイ: ルートの `just deploy-firestore` / `just deploy-firestore-prod`
- Web の本番 env は Next.js 標準の `.env.production` / `.env.production.local` または deploy 環境変数で供給し、build/start 前に `.env` をコピーしない。

## agentドキュメント更新

- 作業完了時に再利用価値のある恒久的な知見（ルール、手順、コマンド、構成差分）が増えた場合は、まず `AGENTS.md` を更新する。
- `CLAUDE.md` は `AGENTS.md` の要点と矛盾しないように必要最小限で追従更新する。
- 進捗報告やタスク固有メモは書かない。

## 完了条件

1. 実装と `docs/` の整合を取る（進捗ではなく仕様として記述）。
2. agent ドキュメント（少なくとも `AGENTS.md`）に恒久知見の更新が必要か確認し、必要なら反映する。
3. `cd apps/web && npm run format` を実行する。
4. `cd apps/web && npm run build` と `cd apps/web && npm run typecheck` を実行し、エラーなしを確認する。
5. 明示指示がない限りコミットしない。
