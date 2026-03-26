# Gemini CLI Guidelines for lightlist

## 1. 基本行動

- 日本語で回答する。
- 段階的に進め、1ステップずつ確認する。
- `context7` と `serena` を必ず利用する。
- 破壊的変更は事前確認を行う。

## 2. 実装ルール

- シンプルで見通しの良い実装を優先する。
- コメント追加は不要、テスト追加は不要、後方互換性は考慮不要。
- TypeScript を厳密に扱い、`any` / `unknown` を避ける。
- i18next による文言管理とテーマ（system/light/dark）対応を維持する。

## 3. 現在の構成

- リポジトリ直下に Node の manifest は置かず、Web の Node ツール・lockfile は `apps/web` に集約する
- `apps/web`（Next.js）/ `apps/ios`（SwiftUI）/ `apps/android`（Kotlin）
- SDK（Firebase Auth/Firestore、状態管理・ミューテーション）は `apps/web/src/lib/` に統合済み。独立パッケージは廃止。
- Firebase 初期化は `apps/web/src/lib/firebase.ts` に閉じ、`process.env.NEXT_PUBLIC_FIREBASE_*` を直接読む。別途の初期化呼び出しは不要。
- pages / components は `firebase/*` を直接 import しない。認証・設定・タスクリストの購読は `@/lib/session` / `@/lib/settings` / `@/lib/taskLists` を使う。
- Firebase デプロイ設定（`firestore.rules`, `firebase.json`, `.firebaserc`）はリポジトリルートに配置。
- `apps/ios` では `xcuserdata` / `xcuserstate` / `build` / `DerivedData` と `apps/ios/Lightlist/GoogleService-Info.plist` を commit しない。
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は `taskListOrder` からの離脱を基本とする（`memberCount` が 0 のときのみ実体削除）。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を固定仕様とし、production readiness 評価の item1（認可モデル再設計）は 2026-03 時点で対応不要とする。
- iOS の認証済み画面遷移は `RootView` の `AppRoute`（`.main` / `.settings` / `.shareCode(String?)`）で管理し、`MainView` はタスクリスト UI のみを担当する。compact 幅は `SideDrawer`、regular 幅は `NavigationSplitView` の 360pt サイドバーで `DrawerPanel` を使う。`SideDrawer` は本体コンテンツとドロワーを縦方向も上揃えで配置する。
- iOS の `MainView` は `GeometryReader` の表示領域サイズを compact / regular レイアウトへ明示的に渡し、`TabView(.page)` 自体と各ページの両方へ同じサイズを適用して内部の LazyView / HostingView まで内容サイズへ縮まないようにする。
- iOS の `MainView` は compact 幅では `Color(.systemBackground)` を画面全体と `TabView(.page)` コンテナ背景へ適用し、status bar 直下から下端まで白い本文面を連続させる。regular 幅のみ現在選択中のタスクリスト背景色を外周背景として使う。
- iOS の compact 幅タスクリスト画面は `TaskListView` 自体を full screen コンテナとして描画し、最外層は `Color(.systemBackground)` を `ignoresSafeArea()` で全面へ敷く。本体は画面いっぱいの `VStack` を同じ白背景で満たし、上部 chrome の操作 UI だけ `GeometryReader.safeAreaInsets.top` 起点で status bar を避け、タスク行は full-width の `ScrollView + LazyVStack` でカード化せず edge-to-edge に構成する。
- iOS の SwiftUI 並び替えドラッグは、移動中の行の local 座標系ではなく親 `ScrollView` の named coordinate space を基準に追跡し、swap 判定は `GeometryReader` で収集した行高さだけを使う。`frame(in:)` の位置監視を drag state に戻さない。
- iOS の全画面ルートと sheet / dialog は `frame(maxWidth: .infinity, maxHeight: .infinity)` を維持しつつ、背景ビュー側だけで safe area を無視する。標準ナビゲーションバーを使わない iPhone ヘッダーは `SafeAreaNavigationHeader` と `safeAreaInset(edge: .top)` を使う。
- iOS の custom header 付き画面と sheet / dialog は、header を `safeAreaInset(edge: .top)` に載せ、本文 root も `frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)` で画面高または detent 高いっぱいまで広げる。
- パスワードリセットURLは `NEXT_PUBLIC_PASSWORD_RESET_URL`（Web）が必須。prod 設定で `localhost` を使わない。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。
- `apps/web/src/locales/*.json` は英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- Web は言語切替時に `document.documentElement.lang` と `dir` を同期する。`ar` は RTL、それ以外は LTR。
- Web の `StartupSplash` は hydration mismatch 回避のため、読み上げラベルを i18n の初期言語解決に依存させず固定文字列（`読み込み中`）で扱う。
- Web の `Carousel` は `direction` prop で方向を受け取り、RTL 時の `scrollLeft` はブラウザ差分を正規化して index を管理する。
- `apps/web` では画面固有、または 1〜2 箇所でしか使わない UI / helper / hook は standalone file にせず、`pages/*` または直近のドメインファイルへ近接配置する。
- `apps/web`: Next.js Pages Router
  - 認証: `apps/web/src/pages/login.tsx`
  - 共有: `apps/web/src/pages/sharecodes/[sharecode].tsx`
- Web の本番 env は Next.js 標準の `.env.production` / `.env.production.local` または deploy 環境変数で供給し、build/start 前に `.env` をコピーしない。

## 4. 作業フロー

1. 実装コードを先に確認し、実装を正として判断する。
2. 小さな単位で修正する。
3. 変更後は `docs/` を実装に合わせて仕様として更新する。
4. 作業完了時に、恒久的に再利用できる知見（ルール、手順、コマンド、構成差分）が増えた場合は `AGENTS.md` を先に更新し、必要に応じて `GEMINI.md` / `CLAUDE.md` へ反映する。
5. 進捗報告やタスク固有メモは agent ドキュメントに書かない。
6. 最後に `cd apps/web && npm run format` → `cd apps/web && npm run build` → `cd apps/web && npm run typecheck` を実行する。
7. 明示指示がない限りコミットしない。

## 5. 主要コマンド

- ルート: `just deploy-firestore` / `just deploy-firestore-prod`
- Web: `cd apps/web && npm run dev`
- Firestore デプロイ: `just deploy-firestore` / `just deploy-firestore-prod`
