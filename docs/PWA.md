# PWA

## 実装範囲

- Web は manifest と service worker を持つ最小構成の PWA です。
- manifest は [manifest.webmanifest](/home/khirayama/Works/lightlist-poc/apps/web/public/manifest.webmanifest) で管理します。
- service worker は [sw.js](/home/khirayama/Works/lightlist-poc/apps/web/public/sw.js) です。

## manifest

- `start_url`: `/app`
- `scope`: `/`
- `display`: `standalone`
- icons
  - `icon-192.png`
  - `icon-512.png`
  - `maskable-512.png`

## service worker

- install 時に `skipWaiting()`
- activate 時に `clients.claim()`
- `SKIP_WAITING` message を受けたら `skipWaiting()`

## 登録

- [_app.tsx](/home/khirayama/Works/lightlist-poc/apps/web/src/pages/_app.tsx) で HTTPS または localhost のときだけ `/sw.js` を登録します。
- 登録後に `registration.update()` を呼びます。

## 起動時 UI

- 初回マウント前は `StartupSplash` を表示します。
- `StartupSplash` の読み上げラベルは hydration mismatch を避けるため固定文字列 `読み込み中` です。

## やらないこと

- オフライン対応はしません。
- キャッシュ戦略は持ちません。
- 更新通知 UI は持ちません。
