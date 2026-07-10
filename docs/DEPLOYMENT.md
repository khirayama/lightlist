# Web 配信と PWA

Web は `apps/web` をアプリケーション実装の正とし、Cloudflare Pages でドメイン直下に静的配信する。iOS / Android のストア提出は [release-ios.md](./release-ios.md) / [release-android.md](./release-android.md) を参照。

## Vite 構成

- Vite root は `apps/web/html`、env dir は `apps/web`、public dir は `apps/web/public`。
- `base` は `/`。subpath 配信はサポートしない。
- build 出力は `apps/web/dist`。
- multi-page input は `index` / `login` / `app` / `password_reset` / `sharecodes` / `404` / `500`。
- dev server は `/app` / `/login` / `/sharecodes` / `/password_reset` を末尾スラッシュ付き URL へ redirect する。本番も canonical な導線は `/app/` のようなスラッシュ付き URL を使う。
- `apps/web/public` 配下の asset は `/manifest.webmanifest`、`/sw.js`、`/brand/logo.svg` のように root path で参照する。

## HTML entry

- LP は `apps/web/html/index.html` と `apps/web/src/lp.ts` で構成する。React / Firebase / i18next には依存せず、静的 HTML の翻訳差し替え、SEO meta 更新、言語選択、service worker 登録だけを担う。
- アプリ側 entry は `apps/web/src/entry.tsx` 1 本。`body[data-page]` で `login` / `app` / `sharecodes` / `password_reset` / `404` / `500` を切り替える。
- `login` / `app` / `sharecodes` / `password_reset` は `../../src/entry.tsx`、`404` / `500` は `../src/entry.tsx` を module script として読む。
- `index` / `404` / `500` / `password_reset` では認証済みアプリの状態購読を前提にしない。`sharecodes` は未認証プレビューを許可しつつ、ログイン済み状態も見て参加導線を出す。

## 初期 payload

- 初期 HTML の module script は初回表示に必要な runtime に絞る。
- Firebase Analytics は dynamic import で読み込む。
- カレンダー用 `date-fns` locale は利用時に dynamic import する。
- chunk 分割は `vite.config.ts` の `manualChunks` を正とし、Firebase / i18n / app UI / React vendor などを分ける。

## PWA

- manifest は `apps/web/public/manifest.webmanifest`。`start_url` は `/app`、`scope` は `/`、`display` は `standalone`。
- manifest の screenshots は `apps/web/public/screenshots/store/wide/*.png`（`1920x1080`）と `apps/web/public/screenshots/store/narrow/*.png`（`750x1334`）を参照する。
- icons は `/icons/icon-192.png` / `/icons/icon-512.png` / `/icons/maskable-512.png`。
- service worker は `apps/web/public/sw.js`。`install` で `skipWaiting()`、`activate` で `clients.claim()`、`SKIP_WAITING` message で `skipWaiting()` を呼ぶだけの最小構成。
- LP とアプリ側 entry は、HTTPS / `localhost` / `127.0.0.1` でのみ `/sw.js` を登録し、登録後に `registration.update()` を呼ぶ。
- オフラインキャッシュ戦略と更新通知 UI は持たない。

## Cloudflare Pages

- Git integration: build command は `cd apps/web && npm ci && npm run cf:build`、output directory は `apps/web/dist`。`LIGHTLIST_IOS_TEAM_ID` に Apple Developer Team ID（10 文字の英大文字・数字）、`LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT` に Play App Signing certificate の SHA-256 fingerprint を設定する。後者はカンマ区切りで複数指定でき、生成時に大文字・コロン区切りへ正規化する。どちらかが欠けると `cf:build` は失敗し、Universal Links / Android App Links の関連付けを欠いた本番デプロイを防ぐ。
- Web は TypeScript 7 系を採用する。`i18next` / `react-i18next` の peer 範囲が追いつくまでは、`apps/web/.npmrc` の `legacy-peer-deps=true` を前提に npm install / ci を行う。
- Direct Upload: `cd apps/web && npm run cf:deploy`。`CLOUDFLARE_PAGES_PROJECT_NAME`、`LIGHTLIST_IOS_TEAM_ID`、`LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT` が必須。
- ローカル確認: `cd apps/web && npm run cf:preview`。`LIGHTLIST_IOS_TEAM_ID` と `LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT` が必須。
- CI で `wrangler pages deploy` を使う場合は `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を設定する。Pages project は事前に作成しておく。
- response headers は `apps/web/public/_headers` を使う。AASA は build 後に `dist/.well-known/apple-app-site-association`、Digital Asset Links は `dist/.well-known/assetlinks.json` へ生成し、どちらも `application/json`・短い cache lifetime で配信する。通常の `npm run build` は Web 単体開発を許可するため、対応する環境変数が未設定なら関連付けファイルを生成しない。Pages Functions を追加した場合、Function response の header は Function 側で返す。
- `404.html` は `apps/web/dist/404.html` を custom 404 として使う。`500.html` は build 出力へ含めるが、Cloudflare Pages が自動で custom 500 として扱う前提は置かない。

## Web env

- 本番 env は Vite の `.env.production` / `.env.production.local` または deploy 環境変数で供給する。build 前に `.env` をコピーしない。
- Firebase Auth / Firestore に必要な env は [authentication.md](./authentication.md) を参照する。
- App Check の env と Console 手順は [app-check.md](./app-check.md) を参照する。

## Firestore デプロイ

- リポジトリルートで実行する。
- staging: `just deploy-firestore`
- production: `just deploy-firestore-prod`
- deploy 設定（`firestore.rules` / `firebase.json` / `.firebaserc` / `firestore.indexes.json`）はリポジトリルートに置く。
- deploy recipe は PATH 上の global `firebase` CLI を前提とする。
