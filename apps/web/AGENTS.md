# Web（apps/web）

ルートの `AGENTS.md` を前提に、Web 固有の規則と落とし穴をまとめる。配信・PWA・LP・CSP の仕様は `docs/deployment.md`。

## 構成

- アプリの runtime は `src/entry.tsx` 1 ファイル（Firebase 初期化・i18n・状態購読・Analytics・全ページ）。HTML entry は Vite root の `html/` に置き、`body[data-page]`（`login` / `app` / `sharecodes` / `404` / `500`）で描画するページを切り替える。import alias は `@/*`。
- LP は `html/index.html` + `src/lp.ts`（React / Firebase / i18next に依存しない）。法的ページは `html/legal/index.html` を唯一のテンプレートとし、`vite.config.ts` の `landingPages` plugin が言語別の静的ページを書き出す。
- 言語正規化は `entry.tsx` / `lp.ts` / `public/theme.js` に意図的に複製しているため、変えるときは 3 つを揃える。
- 生成物（`src/locales/*.json`・`src/lp-locales.json`・`src/english-date-patterns.json`・`public/licenses/licenses.json`）は `scripts/prepare.ts` が dev / build / `npm run check` の開始時に生成する。commit・手編集しない（Prettier は `.gitignore` で除外される）。英語相対日付の parser は `english-date-patterns.json` を静的に読み、UI 翻訳の dynamic import に依存させない。
- `scripts/*.ts` は Node.js の型 strip でそのまま実行し、`vite.config.ts` からは `.ts` 拡張子付きで import する。
- Worker は `worker/index.ts` 1 本で `/mcp` の中継だけを担う（`assets.run_worker_first` は `/mcp` のみ）。Cloudflare Pages へ戻さない（理由は `docs/deployment.md`）。
- env は `.env.development.local` / `.env.production.local` だけにし、`.env.local` は置かない（production mode も読むため dev の値が本番 build に混入する）。ドメイン・URL などの固定値は env にしない。
- TypeScript 7 の `strict` + `skipLibCheck=false` を維持し、`allowJs` を有効にしない。npm の peer dependency 検証を `legacy-peer-deps` / `--force` で回避しない。依存更新後は `npm approve-scripts --allow-scripts-pending` が未承認なしになるよう `allowScripts` を同期する。Node.js 22 同梱の npm から npm 12 へ直接更新すると `promise-retry` 欠損で失敗する。

## 初期 payload・chunk

- Firebase Analytics と date-fns の locale は dynamic import のまま保ち、静的 import に戻さない。アプリ翻訳は `ja` だけを静的 import し、他言語は `LOCALE_LOADERS` で読む。言語変更は必ず `changeAppLanguage()` を通す（`i18next.changeLanguage` を直接呼ばない）。
- chunk 分割は Rolldown の `build.rolldownOptions.output.codeSplitting.groups` + `includeDependenciesRecursively: false`。明示した group の UI 依存は推移依存ごと同じ group に入れ、entry へ戻る import や循環を作らない（再帰取り込みにすると共通依存が Analytics 側へ移り、初期 HTML から読まれる）。`rollupOptions.output.manualChunks` に戻さない。
- Auth は `initializeAuth` に persistence だけを渡し、popup / redirect resolver を同梱しない。導入するときは CSP・preconnect も見直す。
- フォント CSS は bundle に入れず、全 HTML entry で非同期 preload（`onload` で stylesheet 化 + `<noscript>`）にする。

## CSS・UI

- スタイルは通常 CSS だけ: `base.css`（LP と共有する基盤）、`globals.css`（`@layer ll-components` の共通部品とモーション）、`compiled-styles.css`（utility）。LP は `globals.css` を読まない。
- TSX で使う `ll-*` class は必ず定義する。utility は参照がなくなれば削除してよい（class 名を文字列連結しないので静的検索で判定できる）。ただし末尾の `@property --ll-*` は残す（未登録だと Chrome で border・outline・ring・transform が効かなくなる）。
- ボタンは `BUTTON_*_CLASS` / `ICON_BUTTON_CLASS` 定数で指定する。layer は `ll-components` を utility より前に置き、utility で上書きできるようにする。
- dark のセレクタ（`compiled-styles.css` の `:is(.dark *)`、`globals.css` の `.dark .ll-*`）は必ず `:not([data-colored-background] *)` を付ける。背景色付き領域の CSS 変数は `[data-colored-background]` で light の値へ戻す。
- モーションは `@media (prefers-reduced-motion: no-preference)` の中で定義する。`ll-anim-task-enter` に fill mode を付けない（dnd-kit の inline `transform` / `opacity` と衝突する）。押下表現は `transform` ではなく独立した `scale` プロパティで行う。完了 ripple は checkbox の `:focus` 中に限定し、mount で発火させない。取り消し線は `ll-task-strike` の `background-size` で描く。
- 確認 UI は `ConfirmDialog` を使い、`window.confirm` / `window.alert` を使わない。dialog 内からの確認は元の `DialogContent` の内側に入れ子にする。
- safe area: アプリ側 HTML は `viewport-fit=cover`。下端の余白は `ll-safe-pb*`（通常の `ll-pb-*` ではなく）、左右は app ルートの `ll-safe-px`。`html` の背景色を指定しないと PWA のシステムバー領域が白く残る。`manifest.webmanifest` に `theme_color` を置かない（WebAPK がナビゲーションバー色を固定する）。
- wide layout の詳細は `min-height: 100%` の入れ子では高さが伝わらないため、詳細コンテナと `Carousel` を flex column + `flex: 1` でつなぐ。
- `Carousel` は `direction` prop を必ず渡す（RTL の `scrollLeft` はブラウザ差を正規化する）。スライドの wrapper は子の `key` を使い、`index` を key にしない（並び替えで `TaskListCard` が再マウントされる）。インジケータは scroll handler から CSS 変数を直接更新し、React の再レンダーを起こさない。
- react-day-picker の `components` には render 内で作った関数を渡さず、モジュールレベルの component を渡す（毎回すべての日付ボタンが再マウントされる）。日付ごとのデータは context で渡す。
- カレンダー画面の日付選択時のスクロールは、一覧の親ではなく画面の縦スクロール要素を対象にする（月カレンダーと追加ボタンはその中で sticky）。

## 並び替え（dnd-kit）

- `@dnd-kit/react` + `@dnd-kit/dom` + `@dnd-kit/abstract` だけを使い、旧 `@dnd-kit/core` / `sortable` / `modifiers` / `utilities` を入れない。
- sensor は task が `TASK_SORTABLE_SENSORS`、taskList が `SORTABLE_SENSORS`。長押しは `[data-task-text]` 上のタッチだけで開始し、行全体に `touch-action: none` を付けない（縦スクロールと carousel が止まる）。
- drop 位置は `operation.source.initialIndex` / `operation.source.index` を正とし、`operation.target.id` から再計算しない（楽観表示とずれてちらつく）。
- 配置のアニメーションは `useSortable` の `transition`（`idle: true`）に一本化し、独自の `transform` FLIP を重ねない。
- 読み上げは `DragDropProvider` の `plugins` に `buildDndAccessibility()`（`a11y.drag*` をローカライズ）を渡す。

## 状態・Firestore

- 状態は `AppStateProvider` と `SessionContext` / `SettingsContext` / `TaskListsContext` の 3 分割を維持する（無関係な再レンダーを避けるため）。`useSyncExternalStore` の独自 store を持ち込まない。
- taskLists の購読は `activeUid` だけに依存させる。order の snapshot で `taskListDocsStatus` を `loading` に戻さない（ドロワー・詳細がスケルトンへ戻り再マウントされる）。
- Firestore の読み取りは購読・単発とも共通の境界検証（`assertSettingsStore` / `assertTaskListOrderStore` / `assertTaskListStore` など）を通し、型 assertion だけで変換しない。
- 起動（仕様は `docs/data-model.md`）: localStorage `lightlist.lastUid` で auth 確定前から購読を始め、mount 前に `warmUpStartupData()` を呼ぶ。listener の初回 cache snapshot を hydrate に使い、同じ参照へ `getDocFromCache` を重ねない。`lightlist.startupSnapshot`（`readStartupSnapshot()`）は表示専用で、表示中は app shell を `inert` にし、mutation の基準にしない。
- mutation: `enqueueTaskListMutations` は SDK への投入で resolve し、サーバー応答は `trackCommit` が同期失敗通知へ流す。応答待ちが必要な操作だけ `{ waitForCommit: true }` を渡す。pending は `waitForTaskListMutations(ids)` を待ってから解放する（投入の resolve で解放すると旧表示へ戻る）。キュー内で `await updateDoc` / `await batch.commit` して投入を止めない。
- task mutation の settings は Firestore を再読せず、購読済みの値を `ResolvedTaskSettings` で渡す。`updateSettings` は同期関数で、画面に更新中ロックを持たない。
- `index` / `404` / `500` では Auth を購読しない。30 秒以上 hidden だった後の復帰では `restartNetworkAfterHidden` で接続を張り直す。
- localStorage は `readStorageItem` / `writeStorageItem` を通す。SSR しないため `typeof window` ガードや `useIsomorphicLayoutEffect` を持ち込まない。
- `ErrorBoundary` はクラスコンポーネントのため `withTranslation()` で i18next を注入する。

## ルーティング・アクセシビリティ

- 認証後シェルは hash route（`/app/#/task-lists`・`#/task-lists/:taskListId`・`#/settings`・`#/calendar`）。`/app/` は mount 後に `#/task-lists` を積み、settings 読み込み後に `startupView` で初期遷移する。compact の横スライドは初期 route の確定後に有効化する（起動時のちらつき防止）。`/settings` の独立 route は持たない。
- task action は狭幅で bottom sheet、広幅で dialog。`history.state` を 1 段積み、戻る操作と `Esc` のどちらでも閉じて起点のボタンへフォーカスを戻す。
- compact layout と carousel は表示中の画面・スライドだけを Tab 順と accessibility tree に含める。画面切替時は main へフォーカスを移す（初回表示では奪わない）。
- 各ページは `useDocumentTitle()` で「画面名 - Lightlist」を設定し、`main#main-content`（`MAIN_CONTENT_ID`）を 1 つ持つ（エラー・404 / 500 でも省略しない）。タスクリスト名の見出しは `h1`。
- オンライン判定は `useIsOnline()`、オンライン必須操作の説明は `ConnectionRequiredNote`。

## LP の編集

- section や FAQ を足すときは、HTML の ja 直書き・`shared/locales/locales.json` の全言語・JSON-LD（FAQ は `vite.config.ts` の `LP_FAQ_KEYS`）を揃える。`data-i18n` 要素は子要素を持たないテキストだけにし、新しい utility は `lp-styles.css` に `ll-lp-*` で定義する。
- headline / subheadline は `white-space: pre-line` 前提のため、HTML は `<!-- prettier-ignore -->` + `&#10;` の 1 行記述を保つ。
- 法的ページを増減するときは plugin の `LEGAL_PAGES`・全言語の `src/legal/<lang>.json`・LP フッターのリンクを揃える。
- LP は `.dark` を付けないため常に light で表示される。

## 主要コマンド

- `npm run dev` / `npm run build`
- `npm run check`（前処理 + eslint / tsc / knip）
- `npm run format`
- `npm run preview`（build + `wrangler dev`）
- `npm run deploy`（通常はルートの `just deploy-web` / `just release` から実行）
- `npm run screenshots -- <target>`
