# Web 配信と PWA

Web は `apps/web` をアプリケーション実装の正とし、Cloudflare Workers の static assets でドメイン直下に静的配信する。iOS / Android のストア提出は [release-ios.md](./release-ios.md) / [release-android.md](./release-android.md) を参照。

## Vite 構成

- Vite root は `apps/web/html`、env dir は `apps/web`、public dir は `apps/web/public`。`base` は `/` で、subpath 配信はサポートしない。build 出力は `apps/web/dist`。
- multi-page input は `index` / `legal` / `login` / `app` / `sharecodes` / `404` / `500`。
- dev server は `/app` / `/login` / `/sharecodes` を末尾スラッシュ付き URL へ redirect する。本番も canonical な導線はスラッシュ付き URL を使う。
- `vite.config.ts` の `build-assets` plugin が、dev / build の開始時に `scripts/prepare.ts`（`shared/locales/locales.json` から言語別の `src/locales/<lang>.json`・`src/lp-locales.json`・`src/english-date-patterns.json` を、依存ライセンスと `shared/licenses/manual-licenses.json` から `public/licenses/licenses.json` を生成）を実行し、build 後に `dist/sw.js` の cache version を埋め込む。生成物は commit しない。`npm run check` も最初に同じ前処理を実行する。

## HTML entry

- LP は `apps/web/html/index.html` と `apps/web/src/lp.ts` で構成する。React / Firebase / i18next には依存せず、言語別ページへの遷移（言語選択と保存済み言語）と service worker 登録だけを担う。翻訳の差し替えは実行時に行わない。
- LP は言語ごとに静的 HTML を持つ。URL は `ja` が `/`、他言語が `/en/` `/es/` `/de/` `/fr/` `/ko/` `/zh-cn/` `/hi/` `/ar/` `/pt-br/` `/id/`。`landingPages` plugin が build 後に `dist/index.html` を `src/lp-locales.json` で言語別に書き出し、title / description / OGP / canonical / `hreflang`（`x-default` は `/en/`）/ JSON-LD（`WebApplication` + `FAQPage`）と `dist/sitemap.xml` を生成する。dev server でも同じ変換を同じ URL で適用する。対応言語を増減するときは plugin の `LP_LANGUAGES` と `lp.ts` の `LANGUAGE_PATHS` を合わせて更新する。
- 法的ページ（プライバシーポリシー `privacy` / 利用規約 `terms` / サポート `support` / アカウントとデータの削除 `account-deletion`）は LP と同じ言語 prefix の静的ページとする（`ja` は `/privacy/`、他言語は `/en/privacy/` など）。テンプレートは `apps/web/html/legal/index.html`、本文は `apps/web/src/legal/<lang>.json`（Web 専用。`shared/locales/locales.json` には入れない）、スタイルは `apps/web/src/styles/legal.css` で、`landingPages` plugin が build 後に全言語・全ページを書き出し、`dist/legal/` のテンプレート自体は削除して `sitemap.xml` に追加する。JavaScript は読み込まない。運営者名は Google Play の developer 名と同じ `khirayama`、連絡先は `support@lightlist.app`（plugin の `LEGAL_CONTACT` が本文中のアドレスを `mailto:` リンクにする）。本文は実装と一致させ、取得する情報・外部サービス・削除範囲が変わったら 11 言語すべてと `updated` の日付を更新する。LP のフッターから各ページへリンクする。
- LP はブラウザ言語で自動転送しない（クローラーが各言語ページをそのまま取得できるようにするため）。転送は `/` を開いたときに `localStorage.i18nextLng` が `ja` 以外の場合だけ行う。`ja` 以外のページの「はじめる / ログイン」リンクは `/login/?lang=<lang>` としてアプリへ言語を引き継ぐ。
- OGP 画像は `apps/web/public/og-image.png`（1200x630）を `https://lightlist.app/` からの絶対 URL で指定する。LP のヒーロー画像は `public/screenshot_ja_desktop.png`（1440x900）と `screenshot_ja_mobile.png`（780x1688）、機能紹介のカレンダー画像は `public/screenshot_ja_calendar.png`（1440x810。`apps/web/screenshots/web_06_calendar.png` を縮小したもの）で、差し替え時は `index.html` の `width` / `height` と OGP 画像も更新する。
- LP の本文は「ヒーロー → 3 つの特徴 → 機能詳細 → 利用シーン → よくある質問 → CTA」の順とし、文言は `pages.index.*` を正とする。訴求内容は実装済みの機能に限り、iPhone / Android アプリはストア公開まで実際の状況（現在は「申請準備中」）を記載する（公開後は対応端末の記述・JSON-LD の `operatingSystem`・ストアへのリンクを更新する）。共有は「URL を知っていればログインなしで閲覧でき、編集にはログインと参加が必要」と記載する。日付入力の例は全言語共通で解釈できる相対表現か `mm/dd` 形式だけを使う。
- `robots.txt` は `/app/`・`/sharecodes/` のクロールを拒否する。
- アプリ側 entry は `apps/web/src/entry.tsx` 1 本。`body[data-page]` で `login` / `app` / `sharecodes` / `404` / `500` を切り替える。`login` / `app` / `sharecodes` は `../../src/entry.tsx`、`404` / `500` は `../src/entry.tsx` を module script として読む。
- `index` / `404` / `500` では認証済みアプリの状態購読を前提にしない。`sharecodes` は未認証プレビューを許可しつつ、ログイン済み状態も見て参加導線を出す。

## 初期 payload

- 初期 HTML の module script は初回表示に必要な runtime に絞る。Firebase Analytics は dynamic import で読み込む。
- アプリの翻訳は fallback の `ja` だけを entry に静的同梱し、その他の言語は `apps/web/src/locales/<lang>.json` を言語別 chunk として dynamic import する。初回描画は検出言語の翻訳を読み込んでから行い、言語切替も読み込み完了後に反映する。
- Firebase Auth は `initializeAuth` に IndexedDB / localStorage / sessionStorage の persistence だけを渡し、popup / redirect resolver を同梱しない（popup / redirect サインインは使わない）。HTML の preconnect は `identitytoolkit.googleapis.com` と、Firestore を使う `app` / `sharecodes` の `firestore.googleapis.com` に限る。
- カレンダーの翻訳は英語をライブラリ既定値として使い、それ以外の `date-fns` locale は利用時に言語別の dynamic import で読み込む。
- chunk 分割は Vite 8 / Rolldown の `build.rolldownOptions.output.codeSplitting.groups` を正とし、Firebase / i18n / app UI / React vendor などを分ける。chunk group は依存モジュールを再帰的に取り込まない設定にする。明示的な group へ分ける UI 依存は、group 外へ残った推移依存から entry へ戻る import が発生しないよう同じ group に含める。英語のカレンダー既定値と共通 helper は `date-fns-default` group に置き、その他の locale は利用時の dynamic import に残す。Analytics とカレンダー翻訳が初期 HTML の module script やその静的依存へ混入しないことを build 成果物で確認する。chunk size warning の閾値は 550 kB。
- フォントは通常書体 400 / 500 / 600 / 700 と表示書体 700 だけを各 HTML entry から非同期で読み、JavaScript bundle には含めない。`/fonts/*` は `_headers` で 7 日の `max-age` と 30 日の `stale-while-revalidate` を付けて配信する。
- LP は utility と共通 base（`apps/web/src/styles/base.css`）と LP 専用 CSS だけを読み、アプリの component / motion CSS（`globals.css`）を含めない。
- アプリ側 HTML の `theme.js` は描画前に、保存済みテーマの `dark` class と `theme-color` meta、`?lang=` → `localStorage.i18nextLng` → ブラウザ言語から解決した `html[lang]` / `dir` を設定し、RTL やテーマの初回描画後の切り替わりを防ぐ。
- アプリ側 HTML の viewport は `viewport-fit=cover` とし、Android Chrome / PWA のナビゲーションバー下や iOS のホームインジケータ下まで各画面の背景を描画する。スクロール末尾・ボトムシートの下端余白には `env(safe-area-inset-bottom)` を加え、左右は app ルートで `safe-area-inset-left/right` を確保する。`html` の背景はテーマ色（light `#ffffff` / dark `#030712`）にし、compact 幅のタスクリスト詳細を表示している間だけ表示中リストの背景色に置き換える。
- `manifest.webmanifest` には `theme_color` を置かない。Android のインストール済み PWA はナビゲーションバー色を manifest の `theme_color` に固定するため、省略して端末の light / dark に従う OS 既定色にする。`background_color` は起動画面用に残す。

## PWA

- manifest は `apps/web/public/manifest.webmanifest`。`start_url` は `/app`、`scope` は `/`、`display` は `standalone`。screenshots は `apps/web/public/screenshots/store/wide/*.png`（`1920x1080`）と `apps/web/public/screenshots/store/narrow/*.png`（`750x1334`）、icons は `/icons/icon-192.png` / `/icons/icon-512.png` / `/icons/maskable-512.png`。
- service worker は root scope の `apps/web/public/sw.js` 1 本だけとし、offline shell と Web Push の両方を担う。LP とアプリ側 entry が `/sw.js` を登録する。
- 同一オリジンの Vite assets / フォント / アイコン / manifest と、過去に表示した navigation response を cache し（navigation は query・hash を除いた origin + path を cache key にし、共有コードを含む URL を Cache Storage に残さない）、オフライン時は最後に取得した navigation を返す。navigation は network-first だが、3 秒以内に応答がなく cache がある場合は cache を返し、network 応答は裏で cache を更新する。cache version は build ごとに変わり、旧 cache は activate 時に削除する。
- Firestore のデータ同期は Firestore SDK の永続 cache に任せ、service worker は静的 shell だけを扱う。更新通知 UI は持たず、`skipWaiting()` と `clients.claim()` で更新を適用する。
- Web Push の受信・表示・通知タップは同じ `sw.js` の `push` / `notificationclick` で扱う（[notifications.md](./notifications.md)）。

## Cloudflare Workers

- 本番ドメインは `https://lightlist.app/`（`www.lightlist.app` も同じ Worker）とし、native の共有 URL・Universal Links / App Links もこのドメインに揃える。`lightlist.com` は Lightlist の配信先ではないため使わない。
- 本番 Web はローカルで build して `wrangler deploy` で配信する。Worker は `lightlist`（Cloudflare account `personal`、設定は `apps/web/wrangler.jsonc`）で、`lightlist.app` と `www.lightlist.app` を Custom Domain とし、`workers.dev` と preview URL は無効にする。Git 連携・Cloudflare 側の build 設定と環境変数は使わず、push では配信しない。
- Cloudflare Pages は使わない。Pages の custom domain と `*.pages.dev` / `*.workers.dev` には zone 設定で外せない Browser Integrity Check がかかり、Python urllib の既定 User-Agent などからの `/mcp` が `403`（error code 1010）になるため。zone `lightlist.app` の Configuration Rule で `/mcp` だけ Browser Integrity Check を無効にしている（dashboard で管理し、リポジトリには持たない）。
- build は `apps/web/.node-version`（`24.19.0`）と `apps/web/package.json` の `packageManager`（`npm@12.0.2`）で行う（recipe は fnm で切り替える）。本番の Firebase 設定は gitignore 対象の `apps/web/.env.production.local`（雛形は `apps/web/.env.production.sample`）に置く。Vite の production mode は `.env.local` も読むため、dev 用の値は `apps/web/.env.development.local` に置き、本番 build へ混入させない。
- Web は TypeScript 7 系を `strict` + `skipLibCheck=false` で使い、依存packageの型定義も typecheck 対象にする。runtime source は TS / TSX に限定する。npm install / ci は標準の peer dependency 検証を使い、`legacy-peer-deps` / `--force` は使わない。
- npm 12 は依存パッケージの install script を既定で実行しない。build に必要な Firebase utility、esbuild、protobufjs、workerd と開発時の fsevents は `apps/web/package.json` の完全バージョン付き `allowScripts` で承認する。依存更新後は `npm approve-scripts --allow-scripts-pending` が未承認なしになるよう承認バージョンを更新してから `npm ci` する。
- Web だけの配信: リポジトリルートで `just deploy-web`。`.env.production.local` が本番 project であることを確認してから `npm run deploy`（`vite build` + `wrangler deploy`）を実行する。wrangler の認証は `npx wrangler login` か `CLOUDFLARE_API_TOKEN`。ローカル確認は `cd apps/web && npm run preview`（`wrangler dev`）。
- Universal Links 用の `apple-app-site-association` と Android App Links 用の `assetlinks.json` は `apps/web/public/.well-known/` に静的ファイルとして置く。値は公開情報の Apple Developer Team ID と Play App Signing certificate の SHA-256 fingerprint で、揃った時点で置く（内容は [release-ios.md](./release-ios.md) / [release-android.md](./release-android.md)）。未配置の間は共有 URL が Web で開く。
- response headers は `apps/web/public/_headers` を使い、`.well-known` の 2 ファイルは `application/json`・短い cache lifetime で配信する。Worker script は `apps/web/worker/index.ts` 1 本で、`assets.run_worker_first` で `/mcp` だけを先に受けて外部 API を中継し（[api.md](./api.md)）、それ以外は static assets に任せる。末尾スラッシュは既定の `auto-trailing-slash`（`/login` → `/login/`）とする。`_headers` は Worker script が返す `/mcp` の応答には付かない。
- CSP は `_headers` で管理し、Cloudflare Insights の script / beacon と、self-hosted の `theme.js` / `font-loader.js` を許可する。HTML 側に inline script / event handler を追加せず、`unsafe-inline` も追加しない。
- 外部 script は Google Analytics（`www.googletagmanager.com`）と Cloudflare Insights だけを許可し、`frame-src` / `frame-ancestors` は `'none'`、`form-action` は `'self'` とする。Firebase Auth は popup / redirect resolver を同梱せず、Firebase Auth の reCAPTCHA（Enterprise を含む）も未構成のため、`apis.google.com` / `www.google.com` / `www.gstatic.com` / `*.firebaseapp.com` は script・frame に許可しない（JSONP などによる CSP 回避の経路を残さない）。popup / redirect サインインや Auth の reCAPTCHA を有効にする場合は、先に CSP の `script-src` / `frame-src` と `Cross-Origin-Opener-Policy`（`same-origin`）を見直す。
- `404.html` は `assets.not_found_handling: "404-page"` で custom 404 として使う。`500.html` は build 出力へ含めるが、配信基盤が自動で custom 500 として扱う前提は置かない。
- Firebase App Check は使用しない。クライアントは provider を初期化せず、Firebase Console の enforcement も有効にしない。

## リリース

- リポジトリルートで `just release` を実行する。`main` ブランチ・未コミットの変更なし・`origin/main` と一致していることを確認し、ローカル検証（Functions の build、Web の lint / typecheck / knip）→ `just deploy-firebase dev` → `just deploy-firebase prod` → `just deploy-web` → `just verify-release` の順に実行する。途中で失敗したら以降を実行しない。
- `just verify-release` は `https://lightlist.app/mcp` がトークンなしで `401` を返すことを最大 60 秒確認する。Python urllib の既定 User-Agent で送り、Browser Integrity Check で弾かれないことも確かめる。
- iOS / Android はストア審査を挟むため `just release` に含めず、[release-ios.md](./release-ios.md) / [release-android.md](./release-android.md) の手順で `just release` の後に提出する。

## Firebase デプロイ

- リポジトリルートで `just deploy-firebase`（既定 dev）/ `just deploy-firebase prod` を実行する。`firebase/firebase.json` に定義した Firestore Rules / indexes と `functions` codebase（通知・共有プレビュー・`mcp`・`deleteApiTokensOnUserDelete`）を一括で反映する。環境ごとの project ID は recipe 内で固定し、`.firebaserc` の既定 project に依存しない。
- deploy 設定（`firebase.json` / `firebase.billing.json` / `.firebaserc` / `firestore.rules` / `firestore.indexes.json`）と Functions のソース（`functions/` / `functions-billing/`）は `firebase/` に置く。
- 配信前のローカル build は Functions 用 Node.js 22 と npm 12.0.2 で実行する。Cloud Build の npm 版も両 Functions の `engines.npm` で固定し、未承認の install script があれば停止する。Functions 系の recipe は fnm があれば対象ディレクトリの `.node-version` で実行する（`just _node <dir> <command>`）。deploy recipe は PATH 上の global `firebase` CLI を前提とする。
- クライアントが新しいコレクション・field を書き込む変更は、本番 Rules のデプロイ後に配布する。配布前に本番の Rules release（`firebaserules.googleapis.com/v1/projects/lightlist-prod-b0269/releases/cloud.firestore`）の ruleset がリポジトリの `firebase/firestore.rules` と一致することを確認する。Web は push では配信されないため、`just release` の順序（Firebase → Web）で配布する。
- 課金停止の Functions は `just deploy-billing` で本番だけに配信する（[billing-control.md](./billing-control.md)）。
- 通知 Functions は Firebase Blaze プランと Node.js 22 runtime を使う。FCM / APNs / Web Push の設定は [notifications.md](./notifications.md) を参照する。
