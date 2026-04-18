# 配信

## Web 配信先

- Web の本番静的配信は Cloudflare Pages を正とする。
- Web はドメイン直下配信を前提とし、subpath 配信はサポートしない。
- Vite の `base` は `/` を使い、Cloudflare Pages の custom domain または `*.pages.dev` 直下で配信する。
- build 出力は `apps/web/dist` を使う。

## Cloudflare Pages 設定

- Git integration を使う場合の build command は `cd apps/web && npm ci && npm run build`。
- Git integration を使う場合の build output directory は `apps/web/dist`。
- Direct Upload を使う場合は `cd apps/web && npm run cf:deploy` を使う。
- Cloudflare Pages ローカル確認は `cd apps/web && npm run cf:preview` を使う。
- `apps/web/public/_headers` を Cloudflare Pages の response headers 定義として使う。

## Direct Upload 前提

- `npm run cf:deploy` は `CLOUDFLARE_PAGES_PROJECT_NAME` を必須とする。
- CI から `wrangler pages deploy` を使う場合は `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を設定する。
- Pages project は事前に作成しておく。`wrangler pages project create` または dashboard から新規作成する。

## Pages URL と認証

- 本番で使う custom domain、または `*.pages.dev` を Firebase Authentication の authorized domains に追加する。
- `VITE_PASSWORD_RESET_URL` は Cloudflare Pages で実際に配信する `/password_reset` URL を使う。
- production 用 URL に `localhost` は使わない。

## Cloudflare Pages 側の制約

- `404.html` は `apps/web/dist/404.html` を custom 404 として使う。
- `500.html` は build 出力へ含めるが、Cloudflare Pages の static hosting が自動で custom 500 として扱う前提は置かない。
- `_headers` は static asset response にのみ適用され、Pages Functions を追加した場合は Function 側で header を返す。
