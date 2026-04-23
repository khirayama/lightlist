# CLAUDE.md

## 必須ルール

- 日本語で回答する。
- 小さな変更を段階的に進め、各ステップで確認する。
- `context7` と `serena` を必ず使う。
- コメント追加は不要。テスト追加は不要。後方互換性は考慮不要。
- `docs/` は内部構成の重複説明ではなく、ドメイン仕様・必須設定・制約を書く。

## 実装方針

- 過度な抽象化を避け、素直で可読性の高い実装を優先する。
- 正常系と主要なエラー処理に集中する。
- TypeScript で厳密に型付けし、`any` / `unknown` の使用を避ける。
- 不要な処理・関数・ファイルは積極的に削除する。
- 文言は i18next で管理し、テーマ（system/light/dark）対応を維持する。

## プロジェクト実態（2026-03）

- モノレポ: `apps/web`（Vite multi-page app）/ `apps/ios`（SwiftUI）/ `apps/android`（Kotlin）
- Web の Vite HTML entry は `apps/web/html` に集約し、`apps/web/src` は React/TypeScript コード専用とする。
- SDK（Firebase Auth/Firestore、状態管理・ミューテーション）は `apps/web/src/lib/` に統合済み。独立パッケージは廃止。
- Firebase 初期化は `apps/web/src/entry.tsx` に閉じ、`import.meta.env.VITE_FIREBASE_*` を直接読む。Web の App Check も同ファイルで初期化し、`VITE_FIREBASE_APPCHECK_SITE_KEY` を使う。
- Web の Vite root は `apps/web/html` を正とし、静的 asset は `apps/web/public`、env は `apps/web/.env*` を使う。
- Web の HTML entry は `apps/web/src/entry.tsx` 1 本を共通 bootstrap とし、各 HTML の `body[data-page]` で描画 page を切り替える。script path は各 HTML ファイル自身の配置位置を基準に相対指定し、Vite 設定の `/src` alias を維持する。
- Web UI は `firebase/*` を直接 import しない。Web の runtime TS/TSX 実装は `apps/web/src/entry.tsx` に集約する。
- タスク入力先頭の日付読み取り仕様は Web の `apps/web/src/entry.tsx` を正本とし、iOS / Android も対応言語・数字正規化・先頭一致ルールを揃える。
- Firebase デプロイ設定（`firestore.rules`, `firebase.json`, `.firebaserc`）はリポジトリルートに配置。
- `.gitignore` はルートで共通ローカル生成物を管理し、`apps/web` / `apps/ios` / `apps/android` 配下は各アプリ固有の生成物だけを管理する。
- `apps/ios` では `xcuserdata` / `xcuserstate` / `build` / `build-*` / `DerivedData` と `apps/ios/Lightlist/Resources/GoogleService-Info.plist` を commit しない。
- iOS の entitlements は `apps/ios/Lightlist/Lightlist.entitlements`、Privacy Manifest は `apps/ios/Lightlist/Resources/PrivacyInfo.xcprivacy` を正とする。
- iOS の bundle identifier と Android の applicationId は `com.lightlist.app` を正とする。
- iOS の Firebase Auth callback と auth state listener から SwiftUI state を更新する処理は MainActor 上で行い、ログイン completion で `error` と `result` がともに空の場合も汎用認証エラーを表示する。
- iOS の AppIcon は `shared/assets/brand/logo.svg` を元に、白背景の不透明な正方形 PNG として `apps/ios/Lightlist/Resources/Assets.xcassets/AppIcon.appiconset` の全スロットへ配置する。
- Android の launcher icon は `shared/assets/brand/maskable-512.png` を正とし、70% に縮小して中央配置した素材から adaptive icon と density 別 mipmap を生成する。themed icon 用の monochrome layer は同じ意匠の単色 vector を使う。
- ブランドロゴの現行 SVG は `shared/assets/brand/logo.svg` と `apps/web/public/brand/logo.svg` を正とし、差し替え前の旧ロゴは `logo_legacy.svg` に退避する。
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は `taskListOrder` からの離脱を基本とする（`memberCount` が 0 のときのみ実体削除）。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を固定仕様とし、production readiness 評価の item1（認可モデル再設計）は 2026-03 時点で対応不要とする。
- iOS の認証済み画面遷移は `RootView` の `AppRoute`（`.main` / `.settings` / `.shareCode(String?)`）で管理し、`MainView` はタスクリスト UI のみを担当する。compact 幅は `SideDrawer`、regular 幅は `NavigationSplitView` の 360pt サイドバーで `DrawerPanel` を使う。`SideDrawer` は本体コンテンツとドロワーを縦方向も上揃えで配置する。
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
- iOS / Android の `TaskListDetailPage` は `autoSort` 有効時、タスク追加・完了切替・本文編集・日付変更・完了済み削除ごとに `未完了 -> date -> order` で再採番した `tasks.*` 全体を Firestore へ保存する。
- iOS の SwiftUI 並び替えドラッグは、移動中の行の local 座標系ではなく親 `ScrollView` の named coordinate space を基準に追跡し、swap 判定は `GeometryReader` で収集した行高さだけを使う。`frame(in:)` の位置監視を drag state に戻さない。
- iOS の全画面ルートと sheet / dialog は `frame(maxWidth: .infinity, maxHeight: .infinity)` を維持しつつ、背景ビュー側だけで safe area を無視する。標準ナビゲーションバーを使わない iPhone ヘッダーは `SafeAreaNavigationHeader` と `safeAreaInset(edge: .top)` を使う。`ContentView.swift` 内の `LightlistApp` は hidden `UIViewRepresentable` の `WindowSceneConfigurator` で attach 済み `UIWindow` を初期化し、window 背景色と root view controller の safe area / layout margins も全画面前提に揃える。`ScrollView` ベースの全画面フォームはカードラッパーを持たず、外側 `maxWidth` 制約や `RoundedRectangle` でカード化しない。
- iOS の custom header 付き画面と sheet / dialog は、header を `safeAreaInset(edge: .top)` に載せ、本文 root も `frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)` で画面高または detent 高いっぱいまで広げる。header inset と重複する大きな `padding(.top)` は本文側で足さず、追加の視覚余白は最小限に留める。
- パスワードリセットURLは `VITE_PASSWORD_RESET_URL`（Web）が必須。prod 設定で `localhost` を使わない。
- iOS のパスワードリセット URL は Info.plist の `PASSWORD_RESET_URL`、Android は `BuildConfig.PASSWORD_RESET_URL` を使い、既定値は `https://lightlist.com/password_reset` とする。
- iOS / Android の認証 UI は `signin` / `signup` / `reset` の 3 導線を持ち、認証前でも言語切替を行える。共有コード deep link は未認証でも共有リストプレビューを開き、ログイン済みかつ未参加のときだけ `taskListOrder` 追加導線を出す。Android の deep link は `lightlist://password-reset?...`、`lightlist://sharecodes/...`、`https://lightlist.com/sharecodes/...`、`https://lightlist.com/password_reset?...` を処理する。
- Web の本番 security headers は配信基盤側で管理する。
- Android の release build は `isMinifyEnabled = true`、`allowBackup = false`、App Check は release で Play Integrity provider を使う。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。
- `shared/locales/locales.json` は英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- Web の翻訳資産は `shared/locales/locales.json` を `apps/web/scripts/sync-shared-locales.mjs` で `apps/web/src/locales.json` へ同期して使う。
- Android の翻訳資産は `shared/locales/locales.json` を build 時に asset 化して使い、件数表示は `taskList.taskCount_one` / `taskList.taskCount_other` を `count` 付きで解決する。
- Android の設定値表示やアクセシビリティ文言も shared locale key を正とし、`system` / `top` / `Settings` / 固定曜日名のような raw value や固定言語文字列を直接表示しない。
- Web の i18n 初期化、対応言語定義、言語正規化、方向判定、翻訳依存のエラー解決・バリデーションは `apps/web/src/entry.tsx` に集約する。
- Web の Auth / settings / taskLists の状態購読は `apps/web/src/entry.tsx` の `AppStateProvider` と hook を正とし、`useSyncExternalStore` ベースの独自 store は持ち込まない。
- Web の task 更新系は Firestore `tasks` map の列挙順を順序根拠に使わず、必ず `order` 昇順の配列へ直してから追加・自動並び替え・D&D 並び替え・完了済み削除を計算する。
- Web の認証後シェルは `apps/web/src/entry.tsx` 内の app page 実装を単一入口とし、`/app/#/task-lists` を stack root、`/app/#/task-lists/:taskListId` を task list 詳細、`/app/#/settings` を設定画面として扱う。`/app/` は bootstrap alias として client mount 後に `#/task-lists` を積み、初期 task list があれば `#/task-lists/:taskListId` を push する。`/settings` の独立 route は持たない。
- Web の本番静的配信は Cloudflare Pages を正とし、root path 配信を前提に Vite `base` は `/` を維持する。build 出力は `apps/web/dist`、Cloudflare Pages 用 response headers は `apps/web/public/_headers` に置く。
- iOS / Android の translation loader と analytics helper は `ContentView.swift` / `ContentView.kt` に同居させる。
- Android の app module は `ContentView.kt` 内の analytics helper が `BuildConfig.DEBUG` を参照するため、`apps/android/app/build.gradle.kts` の `buildFeatures.buildConfig = true` を維持する。
- Android の `just run` は通常上書きインストールで Firebase Auth セッションを保持し、失敗時のみアンインストールして入れ直す。明示的なクリーン再インストールは `just run-clean` を使う。
- CI による品質ゲートは設定しない。品質確認は変更があった app のローカル検証コマンド実行を正本とする。
- Web は言語切替時に `document.documentElement.lang` と `dir` を同期する。`ar` は RTL、それ以外は LTR。
- Web の `StartupSplash` は hydration mismatch 回避のため、読み上げラベルを i18n の初期言語解決に依存させず固定文字列（`読み込み中`）で扱う。
- Web の `Carousel` は `direction` prop で方向を受け取り、RTL 時の `scrollLeft` はブラウザ差分を正規化して index を管理する。
- Web の開発サーバーと production build は `vite` / `vite build` を使う。
- iOS / Android の task row は drag handle・完了トグル・本文の縦方向中心を揃え、日付ラベルは本文や編集欄の縦位置を押し下げず、同じ本文領域内の直上へ近接表示する。iOS は日付ラベル下の余白を負方向に少し詰め、本文領域の中心線を基準に揃える。
- 配信用スクリーンショットの元画像は `apps/ios/screenshots` / `apps/android/screenshots` / `apps/web/screenshots` に置き、生成は `cd apps/web && npm run screenshots:generate -- <target>` または `just screenshots <target>` で行う。出力は iOS が `apps/ios/screenshots/app-store/iphone-6.9`、Android が `apps/android/screenshots/google-play/phone`、Web が `apps/web/public/screenshots/store/{wide,narrow}`。中央基準の cover crop で、iOS は `1290x2796`、Android phone は `1080x1920`、Web manifest screenshots は wide `1920x1080` / narrow `750x1334` を使う。iPad App Store スクリーンショットは別途 iPad 実画面の元画像追加が必要。
- `apps/web` では画面固有、または 1〜2 箇所でしか使わない UI / helper / hook も含めて runtime TS/TSX を `apps/web/src/entry.tsx` に集約する。
- Web 認証ページ実装: `apps/web/src/entry.tsx`（HTML entry は `apps/web/html/login/index.html`）
- 共有ページ実装: `apps/web/src/entry.tsx`（HTML entry は `apps/web/html/sharecodes/index.html`）
- Firestore デプロイ: ルートの `just deploy-firestore` / `just deploy-firestore-prod`
- Cloudflare Pages ローカル確認: `cd apps/web && npm run cf:preview`
- Cloudflare Pages Direct Upload: `cd apps/web && npm run cf:deploy`
- Web の本番 env は Vite の `.env.production` / `.env.production.local` または deploy 環境変数で供給し、build 前に `.env` をコピーしない。

## agentドキュメント更新

- 作業完了時に再利用価値のある恒久的な知見（ルール、手順、コマンド、構成差分）が増えた場合は、まず `AGENTS.md` を更新する。
- `CLAUDE.md` は `AGENTS.md` の要点と矛盾しないように必要最小限で追従更新する。
- 進捗報告やタスク固有メモは書かない。

## 完了条件

1. 実装と `docs/` の整合を取る（進捗ではなく仕様として記述）。
2. agent ドキュメント（少なくとも `AGENTS.md`）に恒久知見の更新が必要か確認し、必要なら反映する。
3. 変更があった app だけ検証する。`apps/web` は npm scripts、`apps/ios` / `apps/android` は `Justfile` を使う。
4. `apps/web` を変更した場合は `cd apps/web && npm run format && npm run lint && npm run build && npm run typecheck` を実行する。
5. `apps/ios` を変更した場合は `cd apps/ios && just build` を実行する。iOS の `lint` / `format` は現状未設定。
6. `apps/android` を変更した場合は `cd apps/android && just lint && just build` を実行する。Android の `format` は現状未設定。
7. 明示指示がない限りコミットしない。
