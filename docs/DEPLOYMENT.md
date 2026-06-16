# 配信

Web の本番配信と Firestore デプロイ。iOS / Android のストア提出は [release-ios.md](./release-ios.md) / [release-android.md](./release-android.md) を参照。

## Web（Cloudflare Pages）

- 本番静的配信は Cloudflare Pages を正とする。ドメイン直下配信を前提とし、subpath 配信はサポートしない。
- Vite の `base` は `/`、build 出力は `apps/web/dist`。
- Git integration: build command は `cd apps/web && npm ci && npm run build`、output directory は `apps/web/dist`。
- Direct Upload: `cd apps/web && npm run cf:deploy`。`CLOUDFLARE_PAGES_PROJECT_NAME` が必須。CI で `wrangler pages deploy` を使う場合は `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を設定する。Pages project は事前に作成しておく。
- ローカル確認: `cd apps/web && npm run cf:preview`。
- response headers は `apps/web/public/_headers` を使う。static asset response にのみ適用されるため、Pages Functions を追加した場合は Function 側で header を返す。
- 初期 HTML の module scripts は初回表示に必要な runtime に絞る。Analytics とカレンダー locale payload は初期 HTML から直接読まず、実使用時の chunk として読み込む。

## Web の env

- 本番 env は Vite の `.env.production` / `.env.production.local` または deploy 環境変数で供給する。build 前に `.env` をコピーしない。
- 認証に必要な env は [authentication.md](./authentication.md) を参照。

## エラーページ

- `404.html` は `apps/web/dist/404.html` を custom 404 として使う。
- `500.html` は build 出力へ含めるが、Cloudflare Pages が自動で custom 500 として扱う前提は置かない。

## Firestore デプロイ

- リポジトリルートで実行する。
- staging: `just deploy-firestore`
- production: `just deploy-firestore-prod`
- deploy 設定（`firestore.rules` / `firebase.json` / `.firebaserc` / `firestore.indexes.json`）はリポジトリルートに置く。
- deploy recipe は PATH 上の global `firebase` CLI を前提とする。

## 本番セキュリティヘッダ

- アプリ内では持たず、配信基盤側で管理する。
