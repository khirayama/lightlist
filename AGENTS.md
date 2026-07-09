# Repository Guidelines

## 基本方針

- 回答・説明・コミットメッセージは日本語で記述する。
- 小さな変更を段階的に進め、各段階で達成を確認する。
- 必ず `context7` と `serena` を活用し、推測ではなく実装事実を根拠に判断する。
- コメント追加は不要。テスト追加は不要。後方互換性は考慮不要。
- 変更後は `docs/` を実装に合わせて更新し、進捗報告ではなく仕様として記述する。
- `docs/` は内部コンポーネント一覧や import 構成の重複管理を避け、ドメイン仕様・必須設定・運用上の制約に絞る。
- agent 向けドキュメント（`AGENTS.md` / `CLAUDE.md`）は作業で得た恒久的な知見を蓄積する場所として扱い、完了時に必要な更新があれば行う。

## 実装スタンス

- 実装はシンプルで見通しよく、正常系と主要エラー処理に集中する。
- 不要な抽象化や過剰な分割は避け、冗長コードは削除する。
- TypeScript で厳密に型付けし、`any` / `unknown` は極力使わない。
- UI は i18next 前提・テーマ（system/light/dark）前提で実装する。
- Web/iOS/Android で自然な操作感を優先し、アクセシビリティ（色覚、キーボード、読み上げ）に配慮する。

## Agentドキュメント運用

- `AGENTS.md` を運用ルールの正本とし、`CLAUDE.md` は要点を揃えて整合させる。
- 作業完了時に、今回の変更で再利用価値のある恒久ルール・手順・コマンド・構成差分が増えた場合は、agent ドキュメントを更新する。
- 一時的な調査メモ、進捗報告、タスク固有の事情は agent ドキュメントに書かない。
- 更新判断に迷う場合は「次回以降の別タスクでも参照価値があるか」で判断する。

## プロジェクト構成

- リポジトリ直下に Node の manifest は置かず、Web の Node ツール・lockfile は `apps/web` に集約する。
- Web は TypeScript 7 系を採用し、上流 peer 範囲未追随の依存（`i18next` / `react-i18next`）を許容するため `apps/web/.npmrc` の `legacy-peer-deps=true` を維持する。
- Web: `apps/web`（Vite multi-page app + React + TypeScript + 通常 CSS）
- Web の Vite HTML entry は `apps/web/html` に集約し、`apps/web/src` は React/TypeScript コード専用とする。
- iOS: `apps/ios`（SwiftUI, iOS 17+）— XcodeGen (`project.yml`) でプロジェクト生成
- Android: `apps/android`（Kotlin + Gradle）
- SDK（Firebase Auth/Firestore、状態管理・ミューテーション）は `apps/web/src/entry.tsx` に統合済み。独立パッケージ (`packages/sdk`) は廃止。
- Firebase 初期化は `apps/web/src/entry.tsx` に閉じ、`import.meta.env.VITE_FIREBASE_*` を直接読む。別途の初期化呼び出しは不要。
- Firebase App Check は 3 プラットフォームで有効化する。Web は `entry.tsx` の `setupAppCheck()`（reCAPTCHA v3、`VITE_FIREBASE_APPCHECK_SITE_KEY` 未設定なら無効、debug token は `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`）、iOS は `LightlistApp.init()` で `FirebaseApp.configure()` より前に factory を設定（Release: App Attest + entitlement `com.apple.developer.devicecheck.appattest-environment`、DEBUG: debug provider）、Android は `MainActivity.onCreate()` で `FirebaseApp.initializeApp()` 直後に install（variant source set の `AppCheckProviderFactorySelector.kt` で release: Play Integrity / debug: Debug provider を切替）。Console 手順と enforcement の制約は `docs/app-check.md` を正とする。
- Web UI は `firebase/*` を直接 import しない。Web のアプリ側 runtime TS/TSX 実装は `apps/web/src/entry.tsx` に集約する。LP だけは例外として `apps/web/src/lp.ts` を使う。
- Web の Vite root は `apps/web/html` を正とし、静的 asset は `apps/web/public`、env は `apps/web/.env*` を使う。
- Web の本番静的配信は Cloudflare Pages を正とし、root path 配信を前提に Vite `base` は `/` を維持する。build 出力は `apps/web/dist`、Cloudflare Pages 用 response headers は `apps/web/public/_headers` に置く。
- Web のアプリ側 HTML entry（`login` / `app` / `sharecodes` / `password_reset` / `404` / `500`）は `apps/web/src/entry.tsx` 1 本を共通 bootstrap とし、各 HTML の `body[data-page]` で描画 page を切り替える。script path は各 HTML 自身の配置位置を基準に相対指定し、`apps/web/html/404.html` / `500.html` は `../src/entry.tsx`、`apps/web/html/*/index.html` は `../../src/entry.tsx` を使う。Vite 設定の `/src` alias も維持する。
- Web の初期 HTML module scripts には初回表示に必須でない payload を載せない。Firebase Analytics とカレンダー用 date-fns locale は静的 import に戻さず、実使用時の dynamic import + Vite chunk として保持する。
- LP（`apps/web/html/index.html`）はアプリと完全分離し、ja 本文を直書きした静的 HTML + `apps/web/src/lp.ts`（vanilla TS。react / firebase / i18next 非依存）で構成する。lp.ts は `?lang=` → `localStorage.i18nextLng` → `navigator.languages` の順で言語を解決し、`[data-i18n]` / `[data-i18n-alt]` の文言差し替え、SEO meta と `html[lang]` / `dir` の更新、言語ドロップダウン、service worker 登録だけを担う。言語選択は `localStorage.i18nextLng` 経由でアプリ側 i18next と引き継ぎ合い、`normalizeLanguage` 等の言語ヘルパは entry.tsx と同名のまま lp.ts へ意図的に複製する。LP 翻訳は sync スクリプトが生成する `apps/web/src/lp-locales.json`（`pages.index.*` + `copyright` + `common.skipToMain` の flat key 辞書）を使う。headline / subheadline は `white-space: pre-line` 前提のため、HTML 側は `<!-- prettier-ignore -->` + `&#10;` で 1 行記述を維持する。
- Web の前処理はシンプルさを優先し、`npm run dev|build|lint|typecheck` のたびに `apps/web/scripts/sync-shared-locales.mjs` と `licenses:generate` をそのまま実行する。
- Web は外部スタイル生成ライブラリを使わず、`apps/web/src/styles/globals.css` の通常 CSS と `apps/web/src/styles/compiled-styles.css` でスタイルを保持する。フォント CSS は bundle に巻き込まず、各 HTML entry で public asset として読む。読み込みは render-blocking にしない（`<link rel="preload" as="style" onload="this.onload=null;this.rel='stylesheet'">` + `<noscript>` fallback の非同期パターンを全 HTML entry で統一。フォント読込中は fallback フォント描画を許容）。新規スタイルは通常 CSS または既存の named class を優先する。
- UI 配色は Web のモノクロ（Tailwind gray 系）パレットを 3 プラットフォーム共通の正本とする。light は背景 `#FFFFFF` / 文字 `#111827` / muted `#4B5563` / 枠線 `#D1D5DB` / 強調面 `#F9FAFB`、dark は背景 `#030712` / 面（sheet / dialog） `#111827` / 文字 `#F9FAFB` / muted `#D1D5DB` / 枠線 `#374151`〜`#4B5563`。アクセント色は持たず、primary（選択日・ピン留め・選択リング・主ボタン）は light `#111827` / dark `#F9FAFB`、エラーは light `#DC2626` / dark `#EF4444`（iOS は system red 相当を許容）。タスクリスト背景色の選択肢（`#F87171` `#FBBF24` `#34D399` `#38BDF8` `#818CF8` `#A78BFA`）はテーマ非依存で共通、未設定リストの色ドットは theme 既定色 + 枠線（または separator 相当のグレー）で表す。
- 設定・カレンダー画面の視覚階層は Android の Material パレット割当を 3 プラットフォーム共通の正とする。淡いページ背景（light `#F9FAFB` / dark `#030712`）の上に **ボーダーレス** の面カード（radius 12、light `#FFFFFF` / dark `#111827`、padding 16）を置き、枠線・影は付けない。カード内セクション見出しは muted 色（light `#4B5563` / dark `#D1D5DB`）・小さめ semibold で先頭に置き、行間は hairline divider（light `#D1D5DB` / dark `#374151`）だけで区切る。Android は `surfaceDim` / `surfaceContainer` / `outlineVariant` / `onSurfaceVariant`、Web は gray-50/white/gray-300/gray-600（dark: gray-950/gray-900/gray-700/gray-300）、iOS は `ContentView.swift` の `AppPalette`（pageBackground / cardSurface / rowHighlight / mutedText の dynamic color。system grouped background は使わない）で表現し、設定行の 44pt / 48dp 以上の操作領域を維持する。
- 設定画面のセクション順は 3 プラットフォーム共通で「アカウント（`settings.userInfo.title`：メール表示 + メールアドレス変更行）→ 表示と動作（言語・テーマ・追加位置・autoSort）→ 法的情報 → アカウント操作」とする。autoSort 行は `settings.autoSort.title`（本文）+ `settings.autoSort.enable`（説明・muted）の 2 行 + スイッチで統一する。アカウント操作はボタンではなく他の設定行と同じ**テキスト行**（ログアウト = 通常文字色、アカウント削除 = error 色、間に hairline divider）で表し、枠線・塗りボタンにしない。文言キーは `settings.danger.signOut` / `settings.danger.deleteAccount`、実行中表示は `settings.signingOut` / `settings.deletingAccount` を 3 プラットフォーム共通で使う。
- カレンダー画面は 3 プラットフォーム共通で、淡いページ背景上に月ナビ + 曜日・日グリッドを直置きし、日付付きタスク一覧だけをボーダーレスの面カード（radius 12、面色は設定カードと同じ）に入れる。月ナビの前後ボタンは枠なしのアイコンボタン、曜日ヘッダーは muted 色。日セルは選択 = primary 塗りの円（40pt/40dp 相当、Web は `ll-rounded-full`）、当日 = 枠線のみの円で統一し、日付ドットに縁取りは付けない（背景色未設定リストのみ outline 円で表す）。タスク行は「メタ行（左: 日付ラベル muted、右: 色ドット 16 + リスト名のチップ）+ タスク本文」の 2 行構成（padding 16×10）で、選択日ハイライトは light `#F9FAFB` / dark `#374151`。日付・本文タップ = その日付を選択（ハイライト + 先頭タスクへスクロール。一覧は月内全件のまま絞り込まない）、チップタップ = 該当タスクリストを開く、を全プラットフォームで揃える。
- Android は Material You の dynamic color（`dynamicDarkColorScheme` / `dynamicLightColorScheme`）を使わず、`ContentView.kt` の `LightColorScheme` / `DarkColorScheme` を上記パレットで明示定義する（`surfaceContainer*` 系も含めて指定し、sheet / dialog / DatePicker の面色を dark `#111827` に揃える）。起動 window theme は `values/themes.xml`（light）と `values-night/themes.xml`（dark）で OS 設定に追従させる。`res/values/colors.xml` のテンプレート色は削除済みで復活させない。
- iOS は system semantic color（`Color(.systemBackground)` / `Color(.secondarySystemBackground)` / `Color(.separator)` / `Color.primary` / `Color.secondary`）で同パレット相当を表現し、`Color.accentColor`（青）は使わない。primary 塗りの上の文字色は `Color(.systemBackground)` を使う。iOS の `.buttonStyle(.borderedProminent)` / テキストボタン / ナビのシェブロン / `Toggle` のアクセントは、`Lightlist/Resources/Assets.xcassets/AccentColor.colorset` に light `#111827` / dark `#F9FAFB` を定義してモノクロ化する（このアセットを空にするとシステム青に戻り、3 platform 統一が崩れる）。autoSort `Toggle` は `.tint(.primary)` も付ける。
- Web のモーションは `globals.css` の named class（`ll-anim-overlay` / `ll-anim-dialog` / `ll-anim-sheet` / `ll-anim-task-enter` / `ll-anim-task-exit` / `ll-anim-pop` / `ll-pressable` / `ll-check-mark` / `ll-check-circle` / `ll-task-row`）で管理し、すべて `@media (prefers-reduced-motion: no-preference)` 内に定義する。タスク行の enter アニメーション（`ll-anim-task-enter`）は dnd-kit の inline `transform` / `opacity` と衝突するため fill mode を持たせない（exit 用 `ll-anim-task-exit` は削除まで `both` で opacity 0 を保持してよい）。新規タスク検知は `TaskListCard` の `knownTaskIdsRef`（描画後に effect で同期）で行い、初回 mount では発火させない。完了済み削除は `prefers-reduced-motion: reduce` でない場合のみ `exitingTaskIds` を立てて約 200ms 待ってから保存する。Radix の `data-state` 属性で開閉を駆動し、`ll-anim-sheet` は 40rem 以上で dialog 用 keyframes に切り替える。compiled-styles の中央寄せは `translate` プロパティ（`transform` と独立）なので keyframes は `transform` を使ってよい。見出し（h1–h3）は `font-feature-settings: "palt"` + `letter-spacing: 0.01em` + `text-wrap: balance` を適用する。
- iOS / Android のタスク行モーション（完了トグルの塗り scale + spring、行 alpha のフェード、ピン/カレンダーアイコンの切替、追加ボタンの表示切替）は OS の reduce motion 設定（iOS `accessibilityReduceMotion` / Android の `reduceMotion` フラグ）を尊重して無効化できる形で実装する。iOS のアイコン切替は `contentTransition(.symbolEffect(.replace))`、Android は `Crossfade` を使う。タスク行の挿入・削除は、iOS は `setPendingTasks` を `withAnimation` で包み行へ `.transition`（挿入 opacity + move(top) / 削除 opacity）を付け、Android は詳細 `LazyColumn` の `TaskListRow` へ呼び出し側から `Modifier.animateItem()`（drag 中と reduce motion 時は付与しない）を渡してアニメーションする。
- iOS / Android はタスク操作で触覚フィードバックを返し、両プラットフォームで挙動を揃える。対象は完了トグル・ピン切替・タスク追加・完了済み削除・ドラッグ開始・並び替え中の入れ替え（task / taskList 共通）。iOS は `UIImpactFeedbackGenerator`（完了/ピン/追加 = `.light`、ドラッグ開始 = `.medium`）と `UISelectionFeedbackGenerator`（並び替え入れ替え）と `UINotificationFeedbackGenerator`（完了済み削除 = `.warning`）、Android は `LocalHapticFeedback` の `HapticFeedbackType`（完了/ピン = `ToggleOn`/`ToggleOff`、追加 = `Confirm`、完了済み削除 = `Reject`、ドラッグ開始 = `GestureThresholdActivate`、入れ替え = `SegmentFrequentTick`）を使う。
- Firebase デプロイ設定（`firestore.rules`, `firebase.json`, `.firebaserc`, `firestore.indexes.json`）はリポジトリルートに配置。
- `.gitignore` はルートで共通ローカル生成物（OS / editor / Node / Firebase 設定）を管理し、`apps/web/.gitignore` / `apps/ios/.gitignore` / `apps/android/.gitignore` は各アプリ固有の生成物だけを管理する。
- `apps/ios` の commit 対象は `project.yml` と `Lightlist/` 配下のソースを基本とし、`xcuserdata` / `xcuserstate` / `build` / `build-*` / `DerivedData` は含めない。Firebase plist は `apps/ios/Lightlist/Resources/Firebase/{Debug,Release}/GoogleService-Info.plist` にローカル配置して `.gitignore` で除外し、build configuration に応じて app bundle 内の標準名 `GoogleService-Info.plist` へ 1 つだけコピーする。entitlements は `apps/ios/Lightlist/Lightlist.entitlements` を使う。
- Web の i18n 初期化、対応言語定義、言語正規化、方向判定、翻訳依存のエラー解決・バリデーションは `apps/web/src/entry.tsx` に集約する（LP 用の言語ヘルパ複製は `apps/web/src/lp.ts` のみ許可）。
- Web の Auth / settings / taskLists の状態購読は `apps/web/src/entry.tsx` の `AppStateProvider` と hook を正とし、`useSyncExternalStore` ベースの独自 store は持ち込まない。
- Web の Firestore IndexedDB cache に `settings` / `taskListOrder` / `taskLists` の実データがある場合は、placeholder / skeleton より cache hydrate 済み実データ表示を優先する。auth 復元を待たず即描画するため、直近ログイン uid を localStorage `lightlist.lastUid` に保持し（`onAuthStateChanged` で書き込み・ログアウトで削除）、`AppStateProvider` の settings / taskListOrder / taskLists 購読は `activeUid`（確定 uid、auth loading 中は lastUid）をキーに起動・依存させる。auth が同一 uid で確定しても再購読せず、別 uid / 未認証確定で購読を張り直す。`AppShellPage` のスケルトン解除も authStatus ではなく `isSessionActive`（authenticated または loading かつ activeUid あり）+ データ hydrate 状態で判定する。app 系ページ（auth-free 以外）は React mount 前に `getAuthInstance()` / `getDbInstance()` を呼び捨てて IndexedDB オープンと auth 復元を並行開始する。Web / iOS / Android の `taskLists` chunk は cache snapshot / live snapshot ともに `docChanges()` ではなく snapshot 全体を chunk 単位で反映し、chunk 内の既存保持分を一度外してから snapshot documents で再構築する。
- Web の task 更新系は Firestore `tasks` map の列挙順を順序根拠に使わず、必ず `order` 昇順の配列へ直してから追加・自動並び替え・D&D 並び替え・完了済み削除を計算する。
- Web / iOS / Android の UI 更新系 Firestore 書き込みでは transaction を使わず、task 本文 blur・task 並び替え・taskList 並び替え・日付変更・ピン切替・完了切替の保存後も、listener が同じ内容へ追いつくまで local pending state を優先表示して旧表示への瞬間的な逆戻りを防ぐ。Web の local pending task 表示も `autoSort` 有効時は `未完了 pinned -> 未完了 unpinned -> 完了` と各グループ内 `date -> order` へ正規化して保持する。
- Web / iOS / Android の task 更新系 Firestore 書き込みは同一 `taskListId` ごとにクライアント内で直列化し、task 追加直後の後続更新が先行保存を追い越さないようにする。Web の optimistic task 追加は Firestore 保存と同じ `taskId` を使う。
- Web / iOS / Android の task 更新 UI は、各操作ごとに直接 Firestore payload を組み立てず、`現在表示中 task 群 -> 正規化済み next task 群 -> pending 表示 -> queue 経由の差分保存` の順で処理する。pending 解放判定も listener 側 task 群を同じ正規化へ通した結果で比較する。Firestore へは新規 task の full object、削除 task の `tasks.<id>` delete、既存 task の変更 field と変化した `order` だけを書き込む。
- iOS / Android の task pending（楽観的 overlay）の解放は listener 一致判定だけに依存させない。一致判定は即時解放の fast-path として残しつつ、リスト単位の mutation queue がドレイン（投入済み書き込みが全件コミット完了）した時点でも必ず解放する。一致判定だけだと別端末の並行編集が割り込んで一致が永久に成立せず、pending が解放されないまま View が固着し以降の更新（自端末・他端末とも）を無視する不具合になるため。iOS は `TaskListMutationQueue` の未完了件数が 0 になった `onIdle` で、Android は同 queue の `onIdle` で `pendingDisplay(ed)Tasks` を `nil`/`null` にする。taskList 並び替えの `pendingTaskListOrder` も書き込みコミット完了（iOS は `updateData` completion、Android は `update().await()` 成功後）で解放する。
- iOS / Android の表示優先順は `dragOrdered* -> pending* -> listener由来`。ドラッグ並び替えの最優先 overlay（`dragOrderedTasks` / `dragOrderedTaskLists`）は `onDragCancel` だけでなく**正常終了（iOS `.onEnded` / Android `onDragEnd`）でも必ず `nil`/`null` に戻す**。戻し忘れると並び替え後に overlay が残り、以降の追加・編集・完了切替・listener 更新をすべて shadow して固着する。永続化（pending を同期設定する `persistTaskOrder` / `commitTaskOrder` 等）を呼んだ**後**に overlay を解放すれば、pending が表示を引き継ぎフリッカしない。並び替えの有無判定は overlay 自身ではなく listener 由来の原順（iOS `getDisplayOrderedTasks(taskList.tasks)` / Android 同関数・`uiState.taskLists`）と比較する。
- Web / iOS / Android の task 一覧の空状態判定も pending 表示を含む現在表示中 task 群を基準にし、空リストへの 1 件目追加を listener 反映待ちにしない。
- Web の task mutation は書き込み前の taskList read を `getDocFromCache` 優先（失敗時のみ `getDoc`）で行い、settings は Firestore を再読せず UI の購読済み値を `ResolvedTaskSettings` として引数で渡す。
- `addTask()` の order は top 挿入で `先頭 task の order - 1`、bottom 挿入で `末尾 task の order + 1` を新規 task に与え、正規化（autoSort 無効時は配列順の連番再採番）後の差分だけを保存する。Web / iOS / Android で同一実装とする。
- Web の taskLists chunk listener の失敗は部分劣化とし、読み込めた chunk の表示を維持する。全画面エラーは settings / taskListOrder の失敗か、taskLists を 1 件も読めない場合だけにする。
- Web の taskLists chunk 購読は ID 集合キー（ソート済み `|` join）の変化時だけ張り直し、`taskListOrder` 内の順序変更（D&D 並び替え）では listener を解除・再購読しない。effect の依存に順序込みの ID 配列を入れない。
- Firestore でドット記法の field path（`tasks.<id>.text` や `<taskListId>.order`）を書き込むときは必ず update 系 API（Web `updateDoc`、iOS `updateData`、Android `update`）を使う。set + merge はドットを field path として解釈しないため使用禁止。`deleteField()` を含む top-level キーの merge set は可。
- タスクの `yyyy-MM-dd` 日付文字列は 3 プラットフォームとも常に端末ローカルの暦日として解釈・生成する（formatter / parser に UTC を指定しない、Web で `new Date("yyyy-mm-dd")` を使わない）。唯一の例外は Android Compose Material3 `DatePicker` の `selectedDateMillis` で、UTC midnight millis 前提のため変換時のみ UTC を使う。iOS の `yyyy-MM-dd` formatter は `en_US_POSIX` ロケールと gregorian calendar を必ず指定する。
- settings doc が存在しないユーザーでも設定画面を永久ローディングにせず、既定値（`system` / `ja` / `top` / `autoSort=false`）で表示する。
- Web の `index` / `404` / `500` / `password_reset` ページ（`body[data-page]` 判定）では Firebase Auth の状態購読を行わない。
- iOS の task mutation queue は view 単位の `@StateObject` ではなく `TaskListMutationQueues`（taskListId キーのグローバル登録）で保持する。iOS の `CalendarViewModel` は RootView 常駐ではなく `CalendarScreenView` が自身で bind し、`OrderedTaskListViewModel` は `deinit` で listener を解放する。
- Web / iOS / Android の `deleteTaskList()` と `addSharedTaskListToOrder()` も transaction を使わず、事前 read 後の batch write で `taskListOrder` と `taskLists.memberCount` を更新する。共有参加は `taskListOrder/{uid}` 欠損時でも merge 書き込みで自動作成し、既に追加済みなら no-op にする。
- Web / iOS / Android のタスク入力候補は `taskLists.history` を共通の正本として使い、履歴更新はタスク追加時と本文変更時に行う。候補表示条件は trim 後 2 文字以上の部分一致・最大 20 件・完全一致除外で Web 仕様に揃える。
- task のピン留めは `tasks.*.pinned` だけを追加し、`pinOrder` は持たない。表示順は `未完了 pinned -> 未完了 unpinned -> 完了`、各グループ内は `order` 昇順を正とする。`autoSort` 有効時は各グループ内を `date -> order` で再採番する。pinned task の右端 action はカレンダーではなくピンアイコンを表示し、強めの本文 weight で通常 task と区別する。本文 weight は 3 platform 共通で 通常（および完了）= SemiBold、`pinned && !completed` = Bold（Web は Tailwind の `font-weight-semibold` / `font-weight-bold`、編集中の入力欄も SemiBold）。完了トグルも 3 platform 共通で「未完了 = 薄い枠線円 / 完了 = 薄いグレーの塗り円（チェックマークは表示しない）」とし、Web も塗り円で表現する。
- タスク入力先頭の日付読み取り仕様は Web の `apps/web/src/entry.tsx` を正本とし、iOS / Android も対応言語・数字正規化・先頭一致ルールを揃える。`mm-dd` / `mm/dd` / `mm.dd` の月日指定は当年として解釈し、今日より過去なら翌年へ繰り上げる。
- `taskInsertPosition` の既定（settings 未取得・フィールド欠損時）は Web / iOS / Android ともに `top` とする。
- `taskLists.history` は重複（小文字比較）を除いて先頭追加し、最大 300 件を保持する。Web / iOS / Android で同一仕様とする。
- task 入力 parser は、先頭の日付表現に加えて各対応言語の短い pin prefix も扱う。`ja: ピン`, `es: fijar`, `de: anheften`, `fr: epingler/épingler`, `ko: 고정`, `zh-CN: 置顶`, `hi: पिन`, `ar: تثبيت`, `pt-BR: fixar`, `id: sematkan` に加え、全言語で `pin` / `pinned` を許可し、`pin 04/24 task1` と `04/24 pin task1` の両方を解釈する。本文編集では prefix 付与時だけ `pinned = true` にし、prefix 不在で自動解除しない。
- task 入力 parser の日付表現は、設定言語の相対表現に加えて全言語で英語相対表現（`today` / `tomorrow` / `day after tomorrow` / `in N days` / `N days later` / 英語曜日）も解釈する。
- locale の正本は `shared/locales/locales.json` 1 ファイルとし、Web / iOS / Android はその JSON を各 app 起動前または build 時にローカル resource へ同期して読む。String Catalog (.xcstrings) は採用しない。iOS の `apps/ios/Lightlist/Resources/locales.json` は自動同期スクリプトを持たない手動コピーのため、`shared/locales/locales.json` を変更したら `cp` で必ず追従させる。Web の `apps/web/scripts/sync-shared-locales.mjs` は `src/locales.json` への全体コピーに加え、LP 用 subset を `src/lp-locales.json` へ生成する。
- Android の件数表示は `taskList.taskCount_one` / `taskList.taskCount_other` を `count` 付きで解決し、`"${count}個のタスク"` のような直書きを持ち込まない。
- Android の設定値表示やアクセシビリティ文言も shared locale key を正とし、`system` / `top` / `Settings` / 固定曜日名のような raw value や固定言語文字列を直接表示しない。
- Android の i18n は `apps/android/app/src/main/java/com/example/lightlist/ContentView.kt` 内の `Translations` で `locales.json` の言語ノードを読み分けて使う。
- Android の app module は `ContentView.kt` 内の analytics helper が `BuildConfig.DEBUG` を参照するため、`apps/android/app/build.gradle.kts` の `buildFeatures.buildConfig = true` を維持する。
- Android のパスワードリセット URL は `BuildConfig.PASSWORD_RESET_URL` で管理し、既定値は `https://lightlist.com/password_reset` とする。
- Android の Firebase 設定は build variant ごとに `google-services.json` を分け、debug は `apps/android/app/google-services.json`、release は `apps/android/app/src/release/google-services.json` を使う。release 用ファイルの package 名は `com.lightlist.app` と一致させる。
- Android の Firebase BoM は v34 以降を前提にし、`firebase-*-ktx` ではなく `firebase-auth` / `firebase-firestore` / `firebase-analytics` / `firebase-crashlytics` の main module を使う。
- Android の release APK は R8 縮小後も Firebase component registrar の no-arg constructor を保持する必要がある。`apps/android/app/proguard-rules.pro` の `-keep class * implements com.google.firebase.components.ComponentRegistrar { <init>(); }` を維持し、削除しない。
- Android の Google Play 提出物は `cd apps/android && just bundle-play` で生成する release AAB（`apps/android/app/build/outputs/bundle/release/app-release.aab`）を正とする。release upload key 署名は `LIGHTLIST_ANDROID_KEYSTORE` / `LIGHTLIST_ANDROID_KEYSTORE_PASSWORD` / `LIGHTLIST_ANDROID_KEY_ALIAS` / `LIGHTLIST_ANDROID_KEY_PASSWORD` を Gradle property または環境変数で渡し、`versionCode` は既定 1 で `LIGHTLIST_VERSION_CODE` を Gradle property または環境変数で渡して上書きでき、Play Console にアップロード済みの値より大きくしてから生成する。
- Android の認証フォームは Compose Autofill を有効にするため `ContentView.kt` の `OutlinedTextField` に `contentType` を必ず設定し、サインインは既存資格情報、サインアップ/パスワードリセットは新規資格情報として宣言する。
- Android の未ログイン起動時の認証画面は、保存済み settings が無い場合に端末ロケールをサポート言語へ丸めて初回表示言語として使い、`Translations` は初回描画前にロード済みインスタンスを `CompositionLocal` へ渡して翻訳キーの生表示を避ける。`zh-*` は `zh-CN`、`pt-*` は `pt-BR` に丸め、それ以外の未対応ロケールは `ja` にフォールバックする。
- iOS の未ログイン起動時の認証画面も、`ContentView.swift` の `resolveDeviceLanguage()` で端末ロケール（`Locale.preferredLanguages`）をサポート言語へ丸めて初回表示言語として使う。丸め規則は Android と同じく `zh-*` は `zh-CN`、`pt-*` は `pt-BR`、それ以外の未対応ロケールは `ja`。`ja` 固定にしない。
- iOS の RTL 対応は `ContentView.swift` 内の `LightlistApp` で `.environment(\.layoutDirection, ...)` をルートに設定し、SwiftUI の自動反転に委ねる。再起動不要。
- iOS のディープリンクは `lightlist://password-reset?oobCode=...`（パスワードリセット）と `lightlist://sharecodes/CODE` または `https://lightlist.com/sharecodes/CODE`（共有コード）を処理する。`LightlistApp` で URL を `PendingDeepLink` へ変換し、`RootView` 側でパスワードリセット画面または共有リストプレビューへ振り分ける。共有コードは未認証でもプレビューを開き、ログイン済みかつ未参加のときだけ `taskListOrder` 追加導線を出す。
- Android のディープリンクは `lightlist://password-reset?oobCode=...`、`lightlist://sharecodes/CODE`、`https://lightlist.com/sharecodes/CODE`、`https://lightlist.com/password_reset?oobCode=...` を処理し、`ContentView.kt` 内の `MainActivity` で `PendingDeepLink` へ変換して UI 側で処理する。共有コードは未認証でもプレビューを開き、ログイン済みかつ未参加のときだけ `taskListOrder` 追加導線を出す。
- iOS / Android の認証 UI は `signin` / `signup` / `reset` の 3 導線を持ち、認証前でも言語切替を行える。ネイティブ側で Firebase Auth と Firestore 初期データ作成を完結させる。
- Web / iOS / Android のメール/パスワードログインは Firebase Auth 応答待ちを 10 秒で打ち切り、loading state を必ず戻して汎用認証エラーを表示する。
- iOS の認証状態監視と認証画面表示は `RootView` に集約し、子 view に auth listener や認証用 full screen cover を分散させない。子 view（detail pager / settings / shared preview / calendar）は `currentUserId` を引数で受け取り、`onAppear` と `onChange(of: currentUserId)` で view model を bind する。
- iOS の `TaskListsView` は `onDisappear` で listener を全解除しない。購読の張り替えは `bind(uid:)` の uid 変化と `deinit` に任せ、detail への push/pop で再購読を発生させない。
- iOS の `Translations` は `locales.json` の parse 結果を static にキャッシュし、言語切替や date pattern 取得のたびにディスクから再読込しない（Android の `allLocales` キャッシュと同じ方針）。
- Web の認証後状態は単一 context にまとめず、`SessionContext` / `SettingsContext` / `TaskListsContext` の 3 分割を維持して無関係な購読者の再レンダーを避ける。
- iOS の認証済み画面遷移は `RootView` の `AppRoute` と `NavigationStack` / `NavigationSplitView` で管理し、compact 幅は `TaskListsView` から `TaskListDetailPagerView` / `SettingsView` / `CalendarScreenView` へ遷移し、regular 幅は 360pt サイドバーと `RegularTaskListDetailPagerView` / `SettingsView` / `CalendarScreenView` の detail pane で表示する。
- iOS / Android の tablet regular 幅は、左 360pt 前後のサイドバーにタスクリスト一覧と主要操作を置き、右ペインにタスクリスト詳細または設定を表示する。詳細の pager (`TabView(.page)` / `HorizontalPager`) とサイドバー選択状態は双方向同期する。
- iOS の `TaskListDetailPagerView` / `RegularTaskListDetailPagerView` は、選択中タスクリストの `background` を詳細画面背景として使う。compact 幅は safe area を含む全面、regular 幅は detail column 内だけに適用し、sidebar と split 境界線には広げない。各 `TaskListDetailPage` 本文も同じ色を使い、未設定時だけ `Color(.systemBackground)` にフォールバックする。
- iOS の compact 幅タスクリスト詳細は `TaskListDetailPagerView` 自体を full screen コンテナとして描画し、最外層背景は選択中タスクリストの `background` を `ignoresSafeArea()` で全面へ敷く。本体は画面いっぱいの `VStack` を同じ背景で満たす。ページャーのインジケータだけを固定表示し、タスクリスト名、タスク追加欄、並び替え・完了済み削除操作、タスク行は同じ `ScrollView + LazyVStack` に載せて edge-to-edge にスクロールさせる。regular 幅では detail 側の背景を clip し、divider は sidebar 側の通常背景で固定する。
- Android の `TaskListDetailPagerScreen` は選択中タスクリストの `background` を詳細ペイン背景として使う。compact 幅は画面全体、regular 幅は右ペインだけに適用し、左ペインと split 境界線は `MaterialTheme.colorScheme.background` / `outlineVariant` で固定する。`TaskListDetailPage` はページャーのインジケータだけを固定表示し、タスクリスト名、タスク追加欄、並び替え・完了済み削除操作、タスク一覧を同じ `LazyColumn` に含める。
- Android の `TaskListDetailPagerScreen` のページインジケータは、固定ヘッダー直下に隙間なく接続する横幅いっぱいのフラットな背景帯として描画する。背景色は選択中タスクリストの `background` と同じ解決色をそのまま使い、角丸・枠線・影・透明度差は付けない。
- Android の一覧ヘッダー、詳細ヘッダー、設定ヘッダー、カレンダー確認画面の上部クロームは `WindowInsets.safeDrawing` を反映し、ステータスバーと重ねない。詳細/設定/カレンダーの共通ヘッダーは safe area 分を外側コンテナで確保し、戻るボタンやタイトルの固定高さを inset と共有しない。
- Android のタスクリスト詳細の密度調整は global typography ではなく `TaskListDetailPage` ローカルの metrics で行い、iOS に近い視覚バランスへ寄せつつ edit/share/add/date/complete/drag の `48dp` タップ領域は維持する。
- Android の `TaskListDetailPage` の icon 配置は local metrics を正とし、ヘッダー右上 action・操作列 icon・task row 右端 action・drag handle の見た目サイズと左右端の x 軸整列を揃える。個別 `offset` ではなく hit area と列幅で視覚的な一直線を作る。
- Android の `TaskListDetailPage` の本文系テキスト（新規入力欄、task 本文、インライン編集欄、日付ラベル）は local `TextStyle` を共有し、`includeFontPadding = false` と固定 line height で言語や font fallback による高さ揺れを吸収する。新規入力欄は local metrics の最小高さを持たせる。
- Web / iOS / Android の task 右端 action は、task ごとの sheet / dialog でピン留め切替・日付選択・日付クリアをまとめて扱う。ピン留め切替・日付選択・日付クリアは即時保存し、保存後は sheet を閉じる。
- 日付クリア action は対象 task に日付がある場合だけ有効にし、日付未設定 task では disabled として no-op 保存を発生させない。
- task action の visible UI には `pages.tasklist.setDate` タイトルや task 名を表示しない。用途説明はアクセシビリティ名として保持する。
- Android の task action は `ModalBottomSheet` と Compose Material3 `DatePicker` を使い、TalkBack では `paneTitle` を設定して別ペインとして読ませる。sheet 本文は縦スクロール可能にし、`DatePicker` の title / headline / mode toggle は表示しない。
- Web の task action は狭幅で actual bottom sheet、広幅で centered dialog を使う。route hash は変えずに `history.state` を 1 段積み、戻る操作と `Esc`/dismiss のどちらでも閉じて起点ボタンへ focus を戻す。
- iOS / Android / Web の task action sheet は、可能な限りキーボードのみで操作できる構成を維持する。
- iOS のアプリ内アイコンは `ContentView.swift` の metrics を正とし、標準アクションとナビゲーション `22pt`、テキスト横の補助アクション `18pt`、詳細画面の小型アクション `20pt` を基準に目視サイズを揃える。AppIcon 資産とは分けて扱う。
- タスクリスト詳細の右端 action（ヘッダー共有・操作列ゴミ箱・task row のカレンダー/ピン・追加ボタン）は 3 プラットフォームともアイコン中心線を 1 本に揃える。iOS は `trailingDateButtonWidth`（48pt）の列幅で中心線をコンテンツ右端から 24pt に、Android は `headerActionsEndOffset 11dp` / trash `offset 2dp` / trailing `offset 3dp` で 9dp に、Web は header 48px ボタン + コンテナ `left:8px` / 行 action `padding 4px + icon 24px` で 16px に置く。drag handle は並び替えアイコンと glyph 中心線を揃え（Web は drag span に手動 offset を足さない）、iOS のドットは `4pt`（spacing 3pt、全高 18pt）、Android は `AppIconMetrics.dragHandleDotSize`（4dp）を参照する。
- Android のアプリ内アイコンは `ContentView.kt` の metrics を正とし、標準アクション `24dp`、テキスト横の補助アクション `18dp`、詳細画面の小型アクション `20dp` を基準に目視サイズを揃える。launcher icon 資産とは分けて扱う。
- Android の `TaskListDetailPage` は、タイトル・入力欄・操作列のセクション間余白と、タスク行同士の余白を別メトリクスで管理する。タスク行間はセクション間より詰める。
- iOS / Android の compact 幅タスクリスト詳細は、戻るボタン行とページャーインジケータ行を分離し、入力欄の追加ボタンは入力文字がある時だけ表示する。未完了トグルは薄い枠線円、完了トグルは薄いグレー塗り円で描画し、参考画面に近い密度へ寄せる。
- タスクリスト詳細の共通視覚定数は 3 プラットフォームで揃える: タスク追加入力欄は角丸 14 / padding 14×10 / 最小高 44 / 背景は不透明度 0.92（リスト背景色をわずかに透かす）/ 枠線は gray-300 相当を減光なしで使う（iOS は `Color(.separator)`、Android は `outlineVariant`）。完了 task 行の不透明度は 0.55、未完了トグル円は塗りなし（透明）で 20pt/dp/px、ページャーインジケータのドットは 8 で非選択は前景色の 40%。認証・共有プレビューのカードは角丸 24 + 1px 枠線（Web `ll-rounded-24px` + gray-300、iOS `cornerRadius 24` + separator、Android `RoundedCornerShape(24.dp)` + `outlineVariant`、カード面は dark で gray-900 相当 = Android `surfaceContainerLow`）。
- iOS / Android の task row は drag handle・完了トグル・本文の縦方向中心を揃える。Android は `task.text` の 1 行目中心を基準とし、複数行でもその基準を維持する。日付ラベルは本文や編集欄の縦位置を押し下げず、同じ本文領域内の直上へ近接表示する。iOS は日付ラベル下の余白を負方向に少し詰め、本文領域の中心線を基準に揃える。
- Web / iOS / Android の task 本文インライン編集は、編集開始時にキャレットを本文末尾へ置く（全選択にしない）。iOS / Android は `TextRange(length)` 相当、Web は `setSelectionRange(end, end)` で揃える。
- task 行一覧の密度はやや詰めた行間を正とする。タップ領域（iOS の completion / drag `44pt`・trailing `48pt`、Android の各操作 `48dp`）は据え置き、行間メトリクス（iOS `taskRowVerticalPadding`、Android `taskRowSpacing` + `taskRowVerticalPadding`、Web は task 行の `padding-block`）だけで密度を調整する。
- Android Compose の handle 並び替えで `pointerInput` を使う場合、再 compose ごとに変わる gesture lambda を key や detector 本体に直接渡さない。drag 中に state 更新が入っても detector を再生成せず、必要な callback は `rememberUpdatedState` 経由で参照する。
- iOS / Android の `TaskListDetailPage` は、タスク追加・完了切替・本文編集・日付変更・ピン切替ごとに local pending 表示へ入れた正規化済み task 集合を保持し、Firestore へは変更前後の差分 field だけを保存する。`autoSort` 有効時も同じ順序で再採番したうえで、変化した `order` だけを書き込む。
- iOS の SwiftUI 並び替えドラッグは、移動中の行の local 座標系ではなく親 `ScrollView` の named coordinate space を基準に追跡し、swap 判定は `GeometryReader` で収集した行高さだけを使う。`frame(in:)` の位置監視を drag state に戻さない。
- iOS の全画面ルートと sheet / dialog は `frame(maxWidth: .infinity, maxHeight: .infinity)` を維持しつつ、背景ビュー側だけで safe area を無視する。標準ナビゲーションバーを使わない iPhone ヘッダーは `SafeAreaNavigationHeader` と `safeAreaInset(edge: .top)` を使う。`LightlistApp` は hidden `UIViewRepresentable` の `WindowSceneConfigurator` で attach 済み `UIWindow` を初期化し、window 背景色と root view controller の safe area / layout margins も全画面前提に揃える。`ScrollView` ベースの全画面フォームはカードラッパーを持たず、外側 `maxWidth` 制約や `RoundedRectangle` でカード化しない。
- iOS の custom header 付き画面と sheet / dialog は、header を `safeAreaInset(edge: .top)` に載せ、本文 root も `frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)` で画面高または detent 高いっぱいまで広げる。header inset と重複する大きな `padding(.top)` は本文側で足さず、追加の視覚余白は最小限に留める。
- 3 プラットフォームのアクセシビリティ文言は shared locale の `a11y.*` キー（`listPosition` / `moveUp` / `moveDown` / `today` / `hasTasks` / `addTask` / `editTask` / `drag*`）と既存 key を正本とし、固定言語文字列を直接書かない。iOS はアイコンのみのボタンに `accessibilityLabel`、画面・セクションタイトルに `.isHeader` trait、Android は `semantics { heading() }` を設定する。
- 並び替えはドラッグ操作に加えてスクリーンリーダー向け代替手段を必ず提供する。Web は dnd-kit `KeyboardSensor` と `DndContext` の `accessibility` prop（`buildDndAccessibility()` で `a11y.drag*` をローカライズ）、iOS は drag handle の `accessibilityAction(named:)`、Android は drag handle semantics の `customActions` で `a11y.moveUp` / `a11y.moveDown` を出す。実装は表示順配列を swap した ID 配列を既存の commit / persist 関数へ渡す。
- ページャーインジケータのドットはタスクリスト名 + `a11y.listPosition` を読み上げラベルにし、選択状態（iOS `.isSelected` trait / Android semantics `selected`）を公開する。カレンダー日セルは日番号 + `a11y.today` / `a11y.hasTasks` + 選択状態を公開する。
- iOS の Firebase Analytics は `FirebaseApp.configure()` で自動有効化し、Crashlytics も `ContentView.swift` 内の `LightlistApp` で初期化する。
- iOS の Firebase Auth callback と auth state listener から SwiftUI state を更新する処理は MainActor 上で行い、ログイン completion で `error` と `result` がともに空の場合も汎用認証エラーを表示する。
- iOS の App Store 提出: Release ビルドは `PASSWORD_RESET_URL=https://lightlist.com/password_reset`。`ITSAppUsesNonExemptEncryption: NO` で暗号化輸出規制を申告し、`Lightlist/Resources/PrivacyInfo.xcprivacy` で Privacy Manifest を宣言する（メールアドレス、クラッシュデータ、Product Interaction、UserDefaults API）。
- iOS の App Store 提出物は `cd apps/ios && LIGHTLIST_IOS_TEAM_ID=<Team ID> just archive` で生成する IPA（`apps/ios/build-archive/export/Lightlist.ipa`）を正とする。署名は automatic signing + `-allowProvisioningUpdates`、export 設定は `apps/ios/ExportOptions.plist`（method `app-store-connect`）。再アップロード時は `project.yml` の `CURRENT_PROJECT_VERSION` を上げる。手順詳細は `docs/release-ios.md`。
- iOS の Info.plist は xcodegen の `info:`（`project.yml`）で `Lightlist/Info.plist` へ生成し、`CFBundleLocalizations` にサポート 11 言語（`zh-CN` は `zh-Hans` 表記）、`CFBundleURLTypes`（`lightlist` scheme）、`UIAppFonts`、`PASSWORD_RESET_URL` を宣言する。`GENERATE_INFOPLIST_FILE: YES` と併用できるが、`INFOPLIST_KEY_*` が効くのは Apple 定義のスカラーキーのみで、配列・辞書・カスタムキー（`CFBundleURLTypes` / `UIAppFonts` / `PASSWORD_RESET_URL` 等）は `INFOPLIST_KEY_` 形式では built product に入らない。必ず `info.properties` 側へ書く。`CFBundleDevelopmentRegion` は生成側の `DEVELOPMENT_LANGUAGE` が勝つため、xcodegen `options.developmentLanguage: ja` で揃える。
- iOS の bundle identifier と Android の applicationId は `com.lightlist.app` を正とする。Android の Gradle `namespace` と Kotlin パッケージも `com.lightlist.app` に揃える。
- iOS の AppIcon は `shared/assets/brand/logo.svg` を元に、白背景の不透明な正方形 PNG として `apps/ios/Lightlist/Resources/Assets.xcassets/AppIcon.appiconset` の全スロットへ配置する。
- Android の launcher icon は `shared/assets/brand/maskable-512.png` を正とし、70% に縮小して中央配置した素材から adaptive icon と density 別 mipmap を生成する。themed icon 用の monochrome layer は同じ意匠の単色 vector を使う。
- UI フォントの正本は `shared/assets/fonts/gen-interface-jp` とし、本文は `Gen Interface JP`、主要見出しは `Gen Interface JP Display` を使う。共有コードなど等幅の意味を持つ表示は monospace を維持する。
- ライセンス表記の手動管理対象は `shared/licenses/manual-licenses.json` を正本とし、Web は `apps/web/scripts/generate-licenses.mjs`、iOS は `LicensePlist` build tool plugin、Android は Google OSS Licenses plugin で依存ライセンスを生成する。Android の Google OSS Licenses plugin は runtime classpath を設定時に解決するため、Google Play 提出物を作る `bundleRelease` / `bundle-play` のときだけ適用し、Debug build / lint / `assembleRelease` では適用しない。iOS の build tool plugin は初回 build 時に Xcode の trust が必要で、CLI では必要に応じて `xcodebuild -skipPackagePluginValidation` を使う。
- ブランドロゴの現行 SVG は `shared/assets/brand/logo.svg` と `apps/web/public/brand/logo.svg` を正とし、差し替え前の旧ロゴは `logo_legacy.svg` に退避する。
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は「`taskListOrder` から外す」を基本とする。現在の `memberCount` が 1 以下の場合のみ `taskLists` 実体を削除する。
- アカウント削除は「全タスクリストの離脱/削除 → settings + taskListOrder の削除 → `deleteUser`」の順を維持する。auth 削除後は Firestore Rules で書き込みできないため逆順にはできず、`requires-recent-login` で `deleteUser` だけ失敗した場合はエラー表示して再ログイン後の再実行に任せる。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を仕様として固定する。production readiness 評価で挙がった認可モデル再設計（item1）は 2026-03 時点で対応不要とする。
- 共有コードは bearer credential として扱い、有効な共有コード保有者は未認証でも `taskLists` の `name` `tasks` `history` `background` `shareCode` を更新できる。
- 共有コード生成は 8 文字の英大文字・数字を暗号学的乱数で作る。Web は `crypto.getRandomValues`、iOS は `SecRandomCopyBytes`、Android は `SecureRandom` を使い、生成・削除は事前 read 後の batch write で `shareCodes` と `taskLists.shareCode` を更新する。生成の試行回数は 3 プラットフォームとも最大 10 回で、既存 `shareCode` がある場合は trim + uppercase 正規化した doc ID で旧 `shareCodes` doc を同じ batch で削除する。
- `memberCount <= 1` のタスクリスト実体削除（リスト削除・アカウント削除の両方）では、`taskLists.shareCode` が残っていれば対応する `shareCodes` doc も同じ batch で削除し、削除済みリストを指す共有コードを残さない。
- `taskListOrder/{uid}` は本人が任意の `taskListId` を追加でき、その追加自体を共有済み・参加済みリストの保持権限付与として扱う。
- `taskLists` / `taskListOrder` / `shareCodes` の `createdAt` / `updatedAt` は Firestore Rules の `int` 型検証と pending snapshot の安定性に合わせ、server timestamp ではなく Unix epoch milliseconds の number を書き込む。Web の `taskLists` 読み取りは既存データや pending snapshot に timestamp-like 値が混在しても `estimate` として解決する。
- パスワードリセットURLは `VITE_PASSWORD_RESET_URL`（Web）が必須。prod 設定で `localhost` を使わない。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。
- `shared/locales/locales.json` は英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- Web は言語切替時に `document.documentElement.lang` と `dir` を同期する。`ar` は RTL、それ以外は LTR。
- Web の `StartupSplash` は hydration mismatch を避けるため、読み上げラベルを i18n の初期言語解決に依存させず固定文字列（`読み込み中`）で扱う。
- Web の `Carousel` は `direction` prop を必須運用し、RTL 時の `scrollLeft` はブラウザ差分（positive/negative）を正規化して index を算出する。
- Web の認証後シェルは `apps/web/src/entry.tsx` 内の app page 実装を単一入口とし、`/app/#/task-lists` を stack root、`/app/#/task-lists/:taskListId` を task list 詳細、`/app/#/settings` を設定画面として扱う。`/app/` は bootstrap alias として client mount 後に `#/task-lists` を積み、taskLists 解決まで一覧へ切り替えず詳細スケルトンを表示したまま待ってから、前回選択リスト（localStorage `lightlist.lastTaskList` の `id` + 解決済み `background`。スケルトン背景にも使う）か先頭リストの `#/task-lists/:taskListId` を push する（一覧 root 表示は taskLists 0 件時のみ）。compact 幅の横スライドアニメーションは初期 route 確定後に有効化し、起動時の詳細→一覧→詳細のチラつきを出さない。`/settings` の独立 route は持たない。
- Web の開発サーバーと production build は `vite` / `vite build` を使う。
- Web の本番レスポンスヘッダはアプリ内では持たず、配信基盤側で `Content-Security-Policy`、`Referrer-Policy`、`X-Content-Type-Options`、`X-Frame-Options`、`Permissions-Policy`、`Strict-Transport-Security` を付与する。
- 配信用スクリーンショットの元画像は `apps/ios/screenshots` / `apps/android/screenshots` / `apps/web/screenshots` に置き、生成は `cd apps/web && npm run screenshots:generate -- <target>` またはルートの `just screenshots <target>` で行う。出力は iOS が `apps/ios/screenshots/app-store/iphone-6.9`、Android が `apps/android/screenshots/google-play/phone`、Web が `apps/web/public/screenshots/store/{wide,narrow}`。変換は中央基準の cover crop を使い、iOS App Store は `1290x2796`、Google Play phone は `1080x1920`、Web manifest screenshots は wide `1920x1080` / narrow `750x1334` を正とする。現行フローは iPhone 比率の元画像だけを対象にし、iPad App Store スクリーンショットは別途 iPad 実画面の元画像追加が必要。
- `apps/web` ではアプリ側 runtime TS/TSX 実装を `apps/web/src/entry.tsx` 1 ファイルへ集約し、各 HTML entry は `body[data-page]` で同ファイル内の page component を切り替える。LP のみ `apps/web/src/lp.ts` を使う。
- Web の主要ページ:
  - `apps/web/html/index.html`（ランディング, 静的 HTML + `src/lp.ts`、`data-page` なし）
  - `apps/web/html/login/index.html`（サインイン/サインアップ/リセット依頼, `data-page="login"`）
  - `apps/web/html/app/index.html`（認証後シェル, `data-page="app"`）
  - `apps/web/html/password_reset/index.html`（`data-page="password_reset"`）
  - `apps/web/html/sharecodes/index.html`（`data-page="sharecodes"`）
  - `apps/web/html/404.html`（カスタム404ページ, `data-page="404"`）
  - `apps/web/html/500.html`（カスタム500ページ, `data-page="500"`）
- 共通 import:
  - Web アプリ内: `@/*`
- Web Analytics の実装は `apps/web/src/entry.tsx` に集約。PII をパラメータに含めない。イベント設計は `docs/analytics.md` を参照。

## 主要コマンド

- ルート:
  - `just deploy-firestore`
  - `just deploy-firestore-prod`
- `apps/web`:
  - `npm run dev`
  - `npm run build`
  - `npm run cf:preview`
  - `npm run cf:deploy`
  - `npm run format`
  - `npm run lint`
  - `npm run knip`
  - `npm run typecheck`
- `apps/ios`:
  - `just build`
  - `just build-release`
  - `LIGHTLIST_IOS_TEAM_ID=<Team ID> just archive`（App Store 提出用 IPA を `build-archive/export/Lightlist.ipa` へ生成）
  - `xcodegen generate`（`project.yml` → `.xcodeproj` 生成）
  - Xcode で開いてビルド（CLI: `xcodebuild -scheme Lightlist -destination 'platform=iOS Simulator,...'`）
  - Firebase plist は `.gitignore` で除外。Firebase コンソールからダウンロードして `apps/ios/Lightlist/Resources/Firebase/Debug/GoogleService-Info.plist` と `apps/ios/Lightlist/Resources/Firebase/Release/GoogleService-Info.plist` に配置
- `apps/android`:
  - `just lint`
  - `just build`
  - `just build-release`
  - `just bundle-play`
  - `just run`（通常は上書きインストールで Firebase Auth セッションを保持し、失敗時のみアンインストールして入れ直す）
  - `just run-clean`（明示的なクリーン再インストール用。アプリデータとログイン状態は消える）

## セキュリティ・品質ルール

- `console.error` にユーザーメール等の PII（個人識別情報）を含めない。`userEmail` は必ずログから除外する。
- `taskLists.ts` は `taskListOrder` 購読と taskList chunk 購読を別々に管理する。固定 index 前提の購読解除配列は持ち込まない。
- `ErrorBoundary` はクラスコンポーネントのため `withTranslation()` HOC で i18next を注入する（`useTranslation` フック不可）。
- CI による品質ゲートは設定しない。品質確認は変更があった app のローカル検証コマンド実行を正本とする。
- Android の release build は `isMinifyEnabled = true` とし、`allowBackup = false` を維持する。
- Android の `just build-release` は debug keystore 署名の内部配布確認用 release APK（`apps/android/app/build/outputs/apk/release/app-release.apk`）を生成する。正式配布用 keystore 署名は別途用意する。
- Android の `just bundle-play` は release upload key 署名なしでは失敗させ、Google Play 提出用 AAB を生成する。

## 作業完了チェック

1. 変更内容を見直し、無駄な変数・関数・分割がないことを確認する。
2. `docs/` を実装に合わせて更新し、仕様として記述する。
3. agent 向けドキュメント（`AGENTS.md` / `CLAUDE.md`）に恒久的な知見の追記・修正が必要か確認し、必要なら更新する。
4. 変更があった app ごとに検証を実行する。`apps/web` は `npm scripts`、`apps/ios` / `apps/android` は `Justfile` を正本として扱う。
5. `apps/web` を変更した場合は `cd apps/web && npm run format && npm run lint && npm run build && npm run typecheck` を実行する。
6. `apps/ios` を変更した場合は `cd apps/ios && just build && just build-release` を実行する。現状 iOS 専用の `lint` / `format` は未設定のため要求しない。
7. `apps/android` を変更した場合は `cd apps/android && just lint && just build` を実行する。現状 Android 専用の `format` は未設定のため要求しない。
8. 明示指示がない限りコミットしない。
