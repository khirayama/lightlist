# PWA

## 目的

- Web App Manifest と Service Worker を追加し、インストール可能（installable）判定が走る前提を整える

## 実装内容

### 追加ファイル

- `apps/web/public/manifest.webmanifest`
- `apps/web/public/icons/icon-192.png`
- `apps/web/public/icons/icon-512.png`
- `apps/web/public/icons/maskable-512.png`
- `apps/web/public/icons/apple-touch-icon.png`
- `apps/web/public/brand/logo.svg`
- `apps/web/public/sw.js`

### 既存ファイルの変更

- `apps/web/src/pages/_app.tsx`
  - `next/head` で `manifest` と `theme-color`、PNGベースのアイコンなどの共通メタデータを追加
  - `mounted` 前でも `Head` を出し、初回HTMLにも manifest が含まれるようにする
  - `navigator.serviceWorker.register(\"/sw.js\")` で SW を登録し、`registration.update()` を実行して更新チェックを即時化する
- `apps/web/next.config.js`
  - `/sw.js` に `Cache-Control: no-cache, no-store, must-revalidate` を付与し、古い Service Worker を残しにくくする

## 制約

- `sw.js` はインストール条件を満たすための最小実装で、オフライン対応やキャッシュ戦略は含まない
- PWA アイコンは `apps/web/public/icons/*.png` を使用し、ブランドロゴのSVG表示は `apps/web/public/brand/logo.svg` を UI 用に分離している
- `apps/web/public/icons/*.png` は `apps/native/assets/icon.png` を正本として各サイズ（512/192/180）へリサイズして同期し、角丸白背景上のロゴを既存デザイン準拠で表示する
- `apps/web/public/icons/*.png` のブランドロゴは、角丸白背景の中央付近に縮小して配置し、上下の余白を確保しつつ視覚上の重心を中央に寄せたレイアウトを採用する（現行アセットはロゴレイヤーのみを従来比 `96%` に縮小し、上下余白を微増した配置を反映）

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
