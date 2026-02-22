# PWA

## 目的

- Web App Manifest と Service Worker を追加し、インストール可能（installable）判定が走る前提を整える

## 実装内容

### 追加ファイル

- `apps/web/public/manifest.webmanifest`
- `apps/web/public/icons/icon.svg`
- `apps/web/public/icons/maskable.svg`
- `apps/web/public/icons/icon-192.png`
- `apps/web/public/icons/icon-512.png`
- `apps/web/public/icons/maskable-512.png`
- `apps/web/public/icons/apple-touch-icon.png`
- `apps/web/public/sw.js`

### 既存ファイルの変更

- `apps/web/src/pages/_app.tsx`
  - `next/head` で `manifest` と `theme-color`、アイコンなどの共通メタデータを追加
  - `mounted` 前でも `Head` を出し、初回HTMLにも manifest が含まれるようにする
  - `navigator.serviceWorker.register(\"/sw.js\")` で SW を登録し、`registration.update()` を実行して更新チェックを即時化する
- `apps/web/next.config.js`
  - `/sw.js` に `Cache-Control: no-cache, no-store, must-revalidate` を付与し、古い Service Worker を残しにくくする

## 制約

- `sw.js` はインストール条件を満たすための最小実装で、オフライン対応やキャッシュ戦略は含まない

## 起動時ローディング対策

- `packages/sdk/src/store.ts` の `AppState` に以下の状態を追加
  - `authStatus` (`loading | authenticated | unauthenticated`)
  - `settingsStatus` (`idle | loading | ready | error`)
  - `taskListOrderStatus` (`idle | loading | ready | error`)
  - `startupError` (`string | null`)
- `/app` と `/settings` は上記ステータスを参照して待機条件を制御し、`null` 判定のみで無限ローディングしないようにした
- `/app` と `/settings` では `authStatus === "loading"` が一定時間継続した場合に `/` へフォールバック遷移する

## 拡張の方向性

- オフライン対応とキャッシュ戦略（静的アセット/画像/Firestore等）の設計を追加する
- 更新検知（新しいSWが有効になったら通知してリロード促し）を追加する
