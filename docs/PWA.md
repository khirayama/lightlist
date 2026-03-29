# PWA

## 実装範囲

- Web は manifest と service worker を持つ最小構成の PWA。
- manifest は `apps/web/public/manifest.webmanifest`。
- service worker は `apps/web/public/sw.js`。
- `public/` 配下のファイルは `/manifest.webmanifest` や `/sw.js` のようにルートパスで参照する。

## manifest

- `name`: `Lightlist`
- `short_name`: `Lightlist`
- `description`: `Task list app`
- `start_url`: `/app`
- `scope`: `/`
- `display`: `standalone`
- `background_color`: `#ffffff`
- `theme_color`: `#ffffff`
- icons
  - `/icons/icon-192.png`
  - `/icons/icon-512.png`
  - `/icons/maskable-512.png`

## service worker

- `install` で `skipWaiting()` を呼ぶ。
- `activate` で `clients.claim()` を呼ぶ。
- `message` で `type === "SKIP_WAITING"` を受けたら `skipWaiting()` を呼ぶ。

## 登録

- `_app.tsx` で HTTPS、`localhost`、`127.0.0.1` のときだけ `/sw.js` を登録する。
- 登録成功後に `registration.update()` を呼ぶ。
- 登録失敗時は握りつぶす。

## やらないこと

- オフラインキャッシュ戦略は持たない。
- 更新通知 UI は持たない。

## すること

- manifest と service worker は最小構成のまま維持する。
- `_app.tsx` からの登録条件は HTTPS または localhost 系に限定する。

## しないこと

- キャッシュ戦略やオフライン対応を、現行実装にないまま docs へ書き足さない。
- `public/` 配下のファイルを相対パス参照する前提にしない。
