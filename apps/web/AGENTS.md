# Web（apps/web）

ルートの `AGENTS.md` を前提に、Web 固有の規則をまとめる。

## 構成・配信

- Web は TypeScript 7 系を採用し、`strict` + `skipLibCheck=false` で依存型定義まで検証する。runtime source は TS / TSX に限定し、`allowJs` は有効化しない。上流 peer 範囲未追随の依存（`i18next` / `react-i18next`）を許容するため `apps/web/.npmrc` の `legacy-peer-deps=true` を維持する。
- Web の Vite HTML entry は `apps/web/html` に集約し、`apps/web/src` は React/TypeScript コード専用とする。
- SDK（Firebase Auth/Firestore、状態管理・ミューテーション）は `apps/web/src/entry.tsx` に統合済み。独立パッケージ (`packages/sdk`) は廃止。
- Firebase 初期化は `apps/web/src/entry.tsx` に閉じ、`import.meta.env.VITE_FIREBASE_*` を直接読む。別途の初期化呼び出しは不要。 Auth は `getAuth` ではなく `initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence] })` で popup / redirect resolver を同梱しない。popup / redirect サインインを導入する場合だけ resolver を明示的に渡し、HTML の preconnect と CSP も合わせて見直す。
- Web UI は `firebase/*` を直接 import しない。Web のアプリ側 runtime TS/TSX 実装は `apps/web/src/entry.tsx` に集約する。LP だけは例外として `apps/web/src/lp.ts` を使う。
- Web の Vite root は `apps/web/html` を正とし、静的 asset は `apps/web/public`、env は `apps/web/.env*` を使う。
- Web の本番静的配信は Cloudflare Pages を正とし、root path 配信を前提に Vite `base` は `/` を維持する。build 出力は `apps/web/dist`、Cloudflare Pages 用 response headers は `apps/web/public/_headers` に置く。Universal Links 用 AASA は `apps/web/apple-app-site-association.template.json` と `LIGHTLIST_IOS_TEAM_ID` から、Android App Links 用 Digital Asset Links は `apps/web/assetlinks.template.json` と `LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT`（Play App Signing SHA-256、複数はカンマ区切り）から、それぞれ `dist/.well-known/` へ生成する。`cf:preview` / `cf:deploy` は両環境変数を必須とし、Git integration（本番 project の production domain は `lightlist.app`）は両方を設定するまで `npm run build`、設定後は `npm ci && npm run cf:build` を build command にする。
- Cloudflare Pages の Web build は Node.js `24.19.0` を前提とし、`apps/web/.node-version` で固定する。Pages の Root directory は `apps/web`、output directory は `dist` とし、`apps/web/package.json` の `packageManager` は `npm@12.0.2` に固定する。Node.js 22.22.2 同梱 npm から npm 12 への直接更新は `promise-retry` 欠損で失敗するため使用しない。
- npm 12 は依存パッケージの install script を既定で拒否する。`apps/web/package.json` の `allowScripts` は `npm install-scripts approve` で承認した実行必須パッケージと完全なバージョンを保持し、依存更新時は `npm install-scripts ls` が未承認なしになるよう同期する。
- Web のアプリ側 HTML entry（`login` / `app` / `sharecodes` / `password_reset` / `404` / `500`）は `apps/web/src/entry.tsx` 1 本を共通 bootstrap とし、各 HTML の `body[data-page]` で描画 page を切り替える。script path は各 HTML 自身の配置位置を基準に相対指定し、`apps/web/html/404.html` / `500.html` は `../src/entry.tsx`、`apps/web/html/*/index.html` は `../../src/entry.tsx` を使う。Vite 設定の `/src` alias も維持する。
- Web の初期 HTML module scripts には初回表示に必須でない payload を載せない。Firebase Analytics とカレンダー用 date-fns locale は静的 import に戻さず、実使用時の dynamic import + Vite chunk として保持する。 アプリ翻訳は `ja` だけを `./locales/ja.json` から静的 import し、他言語は `LOCALE_LOADERS` の言語別 dynamic import で読む。言語変更は必ず `changeAppLanguage()`（読み込み後に `i18next.changeLanguage`）を通し、`i18next.changeLanguage` を直接呼ばない。bootstrap も検出言語の読み込み後に `root.render` する。
- Web の chunk 分割は Vite 8 / Rolldown の `build.rolldownOptions.output.codeSplitting.groups` を使い、`includeDependenciesRecursively: false` を維持する。明示 group の UI 依存は、group 外へ残った推移依存から entry へ戻る import が発生しないよう同じ group に含め、生成物の import 循環を確認する。再帰的な依存取り込みは Analytics 側へ共通依存を移し、初期 HTML からの読み込みを発生させる。date-fns group から `locale/` を除外し、英語の既定値と共通 helper は専用 group、他言語は言語別 dynamic import とする。Rollup 互換の `rollupOptions.output.manualChunks` へ戻さない。
- LP（`apps/web/html/index.html`）はアプリと完全分離し、ja 本文を直書きした静的 HTML + `apps/web/src/lp.ts`（vanilla TS。react / firebase / i18next 非依存）で構成する。lp.ts は `?lang=` → `localStorage.i18nextLng` → `navigator.languages` の順で言語を解決し、`[data-i18n]` / `[data-i18n-alt]` の文言差し替え、SEO meta と `html[lang]` / `dir` の更新、言語ドロップダウン、service worker 登録だけを担う。言語選択は `localStorage.i18nextLng` 経由でアプリ側 i18next と引き継ぎ合い、`normalizeLanguage` 等の言語ヘルパは entry.tsx と同名のまま lp.ts へ意図的に複製する。LP 翻訳は sync スクリプトが生成する `apps/web/src/lp-locales.json`（`pages.index.*` + `copyright` + `common.skipToMain` の flat key 辞書）を使う。headline / subheadline は `white-space: pre-line` 前提のため、HTML 側は `<!-- prettier-ignore -->` + `&#10;` で 1 行記述を維持する。 LP の CSS は `base.css`（layer 宣言・utility・テーマ変数・html/body・見出し/スクロールバーの base）と `lp-styles.css` だけを読み、アプリの component / motion を含む `globals.css` を import しない。
- Web の前処理は `prepare:assets` に集約し、`npm run dev|build|lint|typecheck` のたびに shared locale 同期と `licenses:generate` を実行する。Cloudflare Pages の `cf:build` も同じ前処理を一度だけ実行する。 検証をまとめて行う場合は `npm run check`（前処理 1 回 + eslint + tsc + knip）を使う。`sync-shared-locales.mjs` はアプリ用に `src/locales/<lang>.json` を言語別に生成する（単一の `src/locales.json` は持たない）。
- Web は外部スタイル生成ライブラリを使わず、`apps/web/src/styles/globals.css` の通常 CSS と `apps/web/src/styles/compiled-styles.css` でスタイルを保持する。フォント CSS は bundle に巻き込まず、各 HTML entry で public asset として読む。読み込みは render-blocking にしない（`<link rel="preload" as="style" onload="this.onload=null;this.rel='stylesheet'">` + `<noscript>` fallback の非同期パターンを全 HTML entry で統一。フォント読込中は fallback フォント描画を許容）。Web に同梱する書体は通常 400 / 500 / 600 / 700 と表示 700 に限り、未使用 weight は CSS と WOFF2 の両方を置かない。新規スタイルは通常 CSS または既存の named class を優先する。 `globals.css` は先頭で `base.css` を import し、LP と共有する基盤は `base.css` に置く。`compiled-styles.css` の utility は TSX / HTML から参照されなくなったら削除してよい（クラス名を文字列連結で組み立てないため、静的な出現有無で判定できる）。ただし末尾の `@property --ll-*` 定義は TSX に出現しなくても、残存 utility が `var(--ll-*)` で参照する限り削除しない（Chrome では未登録の `--ll-border-style` / `--ll-outline-style` などが未定義になり、border・outline・ring・transform が無効化される）。
- Web の membership 再解決（`taskListOrder` の ID 集合・`updatedAt` 変化時）は解決済みの `memberTaskListIds` を `null` に戻さずに行い、ID 集合が同じなら配列参照を維持して `taskLists` chunk listener を張り直さない。並び替えだけで `pruneTaskListsById` による全消去や再購読を起こさない（ドロワー・詳細がスケルトンへ戻り全体が再マウントされる）。`Carousel` のスライド wrapper は子要素の `key` を使い、`index` を key にしない（`Children.map` の合成 key が変わり、並び替えで `TaskListCard` が再マウントされる）。
- Web の共通 UI 部品は `globals.css` の `@layer ll-components`（`ll-btn` + `ll-btn-primary` / `ll-btn-secondary` / `ll-btn-ghost` / `ll-btn-tonal` / `ll-btn-danger` / `ll-btn-destructive`、`ll-icon-btn`、`ll-field` / `ll-field-label` / `ll-select-wrap`、`ll-nav-row` / `ll-sidebar-item`、`ll-settings-row` / `ll-settings-heading`、`ll-muted-text` / `ll-muted-icon`）を使い、TSX では `BUTTON_*_CLASS` / `ICON_BUTTON_CLASS` 定数経由で指定する。レイヤー順は globals.css 先頭の `@layer` 宣言で `ll-components` を utility（`ll-styles`）より前に置き、utility で上書きできるようにする。色付き背景上の補助アイコン・補助文字は固定グレーでなく前景色の透過（`--ll-muted-icon` / `--ll-muted-text`）で描く。ダイアログのフッターは右寄せで「secondary（キャンセル/閉じる）→ primary」、破壊的操作は `DialogFooter` の `start` に `ll-btn-danger` のテキストボタンで置く。`compiled-styles.css` に存在しない `ll-*` class を TSX で使わない（追加時は定義も足す）。
- Web のモーションは `globals.css` の named class（`ll-anim-overlay` / `ll-anim-dialog` / `ll-anim-sheet` / `ll-anim-task-enter` / `ll-anim-task-exit` / `ll-anim-pop` / `ll-pressable` / `ll-check-mark` / `ll-check-circle` / `ll-task-row` / `ll-calendar-day` / `ll-calendar-task-row`）で管理し、すべて `@media (prefers-reduced-motion: no-preference)` 内に定義する。タスク行の enter アニメーション（`ll-anim-task-enter`）は dnd-kit の inline `transform` / `opacity` と衝突するため fill mode を持たせない（exit 用 `ll-anim-task-exit` は削除まで `both` で opacity 0 を保持してよい）。新規タスク検知は `TaskListCard` の `knownTaskIdsRef`（描画後に effect で同期）で行い、初回 mount では発火させない。完了済み削除は `prefers-reduced-motion: reduce` でない場合のみ `exitingTaskIds` を立てて約 120ms 待ってから保存する。dnd-kit の inline transition は `@media (prefers-reduced-motion: reduce)` の `transition: none !important` で無効化する。Radix の `data-state` 属性で開閉を駆動し、`ll-anim-sheet` は 40rem 以上で dialog 用 keyframes に切り替える。compiled-styles の中央寄せは `translate` プロパティ（`transform` と独立）なので keyframes は `transform` を使ってよい。見出し（h1–h3）は `font-feature-settings: "palt"` + `letter-spacing: 0.01em` + `text-wrap: balance` を適用する。
- カレンダー画面は 3 プラットフォーム共通で、月カレンダー + 「タスクを追加」ボタンを常に固定し、タスク一覧だけをスクロールさせる。Web は 1 カラム（64rem 未満）でも 2 カラムでも、月グリッド + 「タスクを追加」ボタン（`.ll-calendar-layout-aside`）を縦スクロール要素の上端に sticky 固定し（ページ背景色・z-index 付き）、一覧だけをその下でスクロールさせる。日付選択時のスクロールは、固定カレンダーに隠れない可視範囲の中央へ対象行を置く。
- Web の react-day-picker の `components`（`DayButton` など）には render 内で生成した関数を渡さず、モジュールレベルの component と定数オブジェクトを渡す（描画ごとに全日付ボタンが再マウントされる）。日付ごとの表示データは context で渡す。カレンダー画面の日付選択時のスクロールは、一覧の親要素ではなく画面の縦スクロール要素（`overflow-y-auto` の div）を対象にする。
- Web の並び替えは現行 dnd-kit の `@dnd-kit/react` + `@dnd-kit/dom` + `@dnd-kit/abstract` を使う。旧 `@dnd-kit/core` / `@dnd-kit/sortable` / `@dnd-kit/modifiers` / `@dnd-kit/utilities` を混在・再導入しない。
- Web の sortable drop は `operation.source.initialIndex` / `operation.source.index` を最終位置の正とする。`operation.target.id` から最終順を再計算すると dnd feedback と楽観表示がずれてドロップ時にちらつくため使用しない。
- Web の i18n 初期化、対応言語定義、言語正規化、方向判定、翻訳依存のエラー解決・バリデーションは `apps/web/src/entry.tsx` に集約する（LP 用の言語ヘルパ複製は `apps/web/src/lp.ts` のみ許可）。
- Web の Auth / settings / taskLists の状態購読は `apps/web/src/entry.tsx` の `AppStateProvider` と hook を正とし、`useSyncExternalStore` ベースの独自 store は持ち込まない。
- Web の Firestore 読み取りは購読・単発取得ともに `entry.tsx` の共通境界検証を通し、`settings` / `taskListOrder` / `taskLists` / `shareCodes` を型 assertion だけでドメイン型へ変換しない。トップレベルdocumentが不正な場合は読み込みエラーまたは当該documentの部分劣化とし、task map 内の不正要素だけは除外・server確定snapshotで削除する。
- Web の Firestore IndexedDB cache に `settings` / `taskListOrder` / `taskLists` の実データがある場合は、placeholder / skeleton より cache hydrate 済み実データ表示を優先する。auth 復元を待たず即描画するため、直近ログイン uid を localStorage `lightlist.lastUid` に保持し（`onAuthStateChanged` で書き込み・ログアウトで削除）、`AppStateProvider` の settings / taskListOrder / taskLists 購読は `activeUid`（確定 uid、auth loading 中は lastUid）をキーに起動・依存させる。auth が同一 uid で確定しても再購読せず、別 uid / 未認証確定で購読を張り直す。`AppShellPage` のスケルトン解除も authStatus ではなく `isSessionActive`（authenticated または loading かつ activeUid あり）+ データ hydrate 状態で判定する。app 系ページ（auth-free 以外）は React mount 前に `getAuthInstance()` / `getDbInstance()` を呼び捨てたうえで `warmUpStartupData()` を実行し、IndexedDB オープン・auth 復元・Firestore persistent cache のコールド初期化（leader election 含む）を React 初回描画と並行開始する。`warmUpStartupData()` は lastUid で `settings` / `taskListOrder` を `getDocFromCache`、localStorage `lightlist.taskListOrder.<uid>`（iOS の UserDefaults キャッシュと同キー形式。`AppStateProvider` の taskListOrder listener snapshot 到着時に順序付き ID 列を書き込み）で `taskLists` chunk を `getDocsFromCache` で先読みする。`AppStateProvider` は listener 自身の初回 cache snapshot を hydrate に使い、同じ参照への `getDocFromCache` / `getDocsFromCache` を重ねない。`getDbInstance()` の persistent cache は `cacheSizeBytes: CACHE_SIZE_UNLIMITED` で LRU GC を無効化し（iOS の無制限 `PersistentCacheSettings` と同一方針）、Web / iOS / Android の `taskLists` chunk は cache snapshot / live snapshot ともに `docChanges()` ではなく snapshot 全体を chunk 単位で反映し、chunk 内の既存保持分を一度外してから snapshot documents で再構築する。
- Web の task mutation は書き込み前の taskList read を `getDocFromCache` 優先（失敗時のみ `getDoc`）で行い、settings は Firestore を再読せず UI の購読済み値を `ResolvedTaskSettings` として引数で渡す。
- Web の taskLists chunk 購読は ID 集合キー（ソート済み `|` join）の変化時だけ張り直し、`taskListOrder` 内の順序変更（D&D 並び替え）では listener を解除・再購読しない。effect の依存に順序込みの ID 配列を入れない。
- Web の `index` / `404` / `500` / `password_reset` ページ（`body[data-page]` 判定）では Firebase Auth の状態購読を行わない。
- Web の認証後状態は単一 context にまとめず、`SessionContext` / `SettingsContext` / `TaskListsContext` の 3 分割を維持して無関係な購読者の再レンダーを避ける。
- Web の task action は狭幅で actual bottom sheet、広幅で centered dialog を使う。route hash は変えずに `history.state` を 1 段積み、戻る操作と `Esc`/dismiss のどちらでも閉じて起点ボタンへ focus を戻す。
- Web の compact layout とタスクリスト carousel は、現在表示中の画面・スライドだけを Tab 順と accessibility tree に含める。compact layout の画面切替時は main landmark へフォーカスを移し、初回表示ではフォーカスを奪わない。認証の `signin` / `signup` は選択中タブだけを Tab 順に含め、左右矢印と Home / End で移動する。パスワードリセットはタブではない独立導線として扱う。
- Web の各ページは `useDocumentTitle()` で `document.title` を「画面名 - Lightlist」に保つ（app shell はルートごとに一覧 = `app.drawerTitle` / 詳細 = タスクリスト名 / 設定 / ライセンス / カレンダー、login は選択中タブ、password_reset、sharecodes はリスト名またはエラー文言、404 / 500）。各ページは skip link の遷移先となる `main#main-content`（`MAIN_CONTENT_ID`）を 1 つ持ち、エラー表示・404 / 500 でも省略しない。タスクリスト名の見出しは `h1` とする。
- Web のカレンダー行上段（日付・リスト名のボタン）は最小高 24px（`.ll-calendar-task-meta`）とし、WCAG 2.5.8 のターゲットサイズを満たす。
- パスワードリセットURLは `VITE_PASSWORD_RESET_URL`（Web）が必須。prod 設定で `localhost` を使わない。
- Web は言語切替時に `document.documentElement.lang` と `dir` を同期する。`ar` は RTL、それ以外は LTR。 初回描画前は `public/theme.js` が `?lang=` → `localStorage.i18nextLng` → `navigator.language` から `lang` / `dir` を先に設定する（言語正規化は entry.tsx と同じ規則を複製する）。`theme.js` は保存済みテーマの `dark` class と `theme-color` meta も設定し、`applyTheme()` も明示テーマ時は両 `theme-color` meta を同色に、`system` では media 別の既定色に戻す。
- Web の `StartupSplash` は hydration mismatch を避けるため、読み上げラベルを i18n の初期言語解決に依存させず固定文字列（`読み込み中`）で扱う。
- Web の `Carousel` は `direction` prop を必須運用し、RTL 時の `scrollLeft` はブラウザ差分（positive/negative）を正規化して index を算出する。
- Web の認証後シェルは `apps/web/src/entry.tsx` 内の app page 実装を単一入口とし、`/app/#/task-lists` を stack root、`/app/#/task-lists/:taskListId` を task list 詳細、`/app/#/settings` を設定画面として扱う。`/app/` は bootstrap alias として client mount 後に `#/task-lists` を積み、settings の読込完了（cache 含む）を待って `startupView` で初期遷移を分岐する。`taskList`（既定）は taskLists 解決まで一覧へ切り替えず詳細スケルトンを表示したまま待ってから、前回選択リスト（localStorage `lightlist.lastTaskList` の `id` + 解決済み `background`。スケルトン背景にも使う）か先頭リストの `#/task-lists/:taskListId` を push する（一覧 root 表示は taskLists 0 件時のみ）。`calendar` は `#/calendar` を push し、`taskLists` は `#/task-lists` root に留まる。compact 幅の横スライドアニメーションは初期 route 確定後に有効化し、起動時の詳細→一覧→詳細のチラつきを出さない。`/settings` の独立 route は持たない。
- Web の開発サーバーと production build は `vite` / `vite build` を使う。
- Web の本番レスポンスヘッダはアプリ内では持たず、配信基盤側で `Content-Security-Policy`、`Referrer-Policy`、`X-Content-Type-Options`、`X-Frame-Options`、`Permissions-Policy`、`Strict-Transport-Security` を付与する。
- `apps/web` ではアプリ側 runtime TS/TSX 実装を `apps/web/src/entry.tsx` 1 ファイルへ集約し、各 HTML entry は `body[data-page]` で同ファイル内の page component を切り替える。LP のみ `apps/web/src/lp.ts` を使う。
- Web Analytics の実装は `apps/web/src/entry.tsx` に集約。PII をパラメータに含めない。イベント設計は `docs/analytics.md` を参照。
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

## 主要コマンド

- `npm run dev`
- `npm run build`
- `npm run cf:preview`
- `npm run cf:deploy`
- `npm run format`
- `npm run lint`
- `npm run knip`
- `npm run typecheck`
- `npm run check`（prepare:assets を 1 回実行して lint / typecheck / knip）

## セキュリティ・品質

- `ErrorBoundary` はクラスコンポーネントのため `withTranslation()` HOC で i18next を注入する（`useTranslation` フック不可）。

- Web の確認 UI は `window.confirm` / `window.alert` を使わず、`ConfirmDialog`（Radix Dialog、タイトル + 本文 + キャンセル / 削除）を使う。dialog 内からの確認は元の `DialogContent` の内側に置いて入れ子にする。
- オフライン表示は `AppWrapperBody` 直下の `OfflineNotice`（`role="status"`、`ll-offline-notice` / `ll-offline-notice-pill`）1 つだけで行い、画面ごとに追加しない。
