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

- `apps/web/src/pages/_app.page.tsx`
  - `next/head` で `manifest` と `theme-color`、アイコンなどの共通メタデータを追加
  - `mounted` 前でも `Head` を出し、初回HTMLにも manifest が含まれるようにする
  - `navigator.serviceWorker.register(\"/sw.js\")` で SW を登録する

## 制約

- `sw.js` はインストール条件を満たすための最小実装で、オフライン対応やキャッシュ戦略は含まない

## 拡張の方向性

- オフライン対応とキャッシュ戦略（静的アセット/画像/Firestore等）の設計を追加する
- 更新検知（新しいSWが有効になったら通知してリロード促し）を追加する
