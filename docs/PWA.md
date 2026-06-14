# PWA

Web は manifest と service worker を持つ最小構成の PWA。

## 構成ファイル

- manifest は `apps/web/public/manifest.webmanifest`。
- service worker は `apps/web/public/sw.js`。
- `public/` 配下のファイルは `/manifest.webmanifest` や `/sw.js` のようにルートパスで参照する。相対パス参照を前提にしない。

## manifest

- `name`: `Lightlist`
- `short_name`: `Lightlist`
- `description`: `Task list app`
- `start_url`: `/app`
- `scope`: `/`
- `display`: `standalone`
- `background_color`: `#ffffff`
- `theme_color`: `#ffffff`
- screenshots: wide `/screenshots/store/wide/*.png`（`1920x1080`）、narrow `/screenshots/store/narrow/*.png`（`750x1334`）。各画像は `screenshots` member で参照する。
- icons: `/icons/icon-192.png` / `/icons/icon-512.png` / `/icons/maskable-512.png`

## service worker

- `install` で `skipWaiting()` を呼ぶ。
- `activate` で `clients.claim()` を呼ぶ。
- `message` で `type === "SKIP_WAITING"` を受けたら `skipWaiting()` を呼ぶ。

## 登録

- `apps/web/src/entry.tsx` の `AppWrapper` で HTTPS、`localhost`、`127.0.0.1` のときだけ `/sw.js` を登録する。
- 登録成功後に `registration.update()` を呼ぶ。
- 登録失敗時は握りつぶす。

## 範囲外

- オフラインキャッシュ戦略は持たない。
- 更新通知 UI は持たない。
- 現行実装にないキャッシュ戦略やオフライン対応を docs へ書き足さない。
