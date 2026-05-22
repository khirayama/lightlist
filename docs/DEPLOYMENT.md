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

## Android Google Play 配信

- Google Play 提出物は Android App Bundle（AAB）を正とし、`cd apps/android && just bundle-play` で生成する。
- 生成物は `apps/android/app/build/outputs/bundle/release/app-release.aab`。
- `just bundle-play` は release upload key 署名を必須とし、`LIGHTLIST_ANDROID_KEYSTORE`、`LIGHTLIST_ANDROID_KEYSTORE_PASSWORD`、`LIGHTLIST_ANDROID_KEY_ALIAS`、`LIGHTLIST_ANDROID_KEY_PASSWORD` を Gradle property または環境変数で渡す。
- `versionCode` は Play Console へアップロード済みの値より大きい整数へ更新してから AAB を生成する。
- Android の `applicationId` は `com.lightlist.app`、release Firebase 設定は `apps/android/app/src/release/google-services.json` を使う。
- release build は R8 縮小を有効化し、App Check は Play Integrity provider を使う。
- Play Console では Play App Signing を有効化し、内部テスト track で確認してから production へ段階的に公開する。
