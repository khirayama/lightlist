# 開発コマンド

## ルート（モノレポ）

- `npm run dev`: 全ワークスペースの開発サーバー起動
- `npm run build`: 全ワークスペースのビルド
- `npm run format`: 全ワークスペースの整形
- `npm run typecheck`: 全ワークスペースの型チェック
- `npm run deploy:firestore`: SDK の Firestore ルール/インデックスをデプロイ（dev）
- `npm run deploy:firestore:prod`: SDK の Firestore ルール/インデックスをデプロイ（prod）

## apps/web

- `cd apps/web`
- `npm run dev`
- `npm run build`
- `npm run build:prod`
- `npm run format`
- `npm run start`
- `npm run start:prod`
- `npm run typecheck`

## apps/native

- `cd apps/native`
- `npm run dev`（Expo Go / Tunnel）
- `npm run dev:lan`（Expo Go / LAN）
- `npm run dev:local`（Expo Go / Localhost）
- `npm run start`（Expo Go / Tunnel）
- `npm run start:lan`（Expo Go / LAN）
- `npm run start:local`（Expo Go / Localhost）
- `npm run android`
- `npm run ios`
- `npm run format`
- `npm run typecheck`

## packages/sdk

- `cd packages/sdk`
- `npm run format`
- `npm run typecheck`
- `npm run deploy`
- `npm run deploy:prod`

## 本番デプロイ準備（web）

- `apps/web/.env.prod` を用意する
- `npm run build:prod`: `.env.prod` を `.env.production` にコピーしてビルド
- `npm run start:prod`: `.env.prod` を `.env.production` にコピーして起動
- 必要な環境変数は `docs/AUTHENTICATION.md` を参照する

## Firestore 購読

- `taskListOrder` のスナップショット更新時に、購読対象の `taskLists` を再計算して購読を更新する

## 状態管理の最適化 (SDK)

- `appStore.commit()` は `user` / `taskListOrderUpdatedAt` / `settings` / `taskLists` / `sharedTaskListsById` を段階的に比較し、変更がない場合はリスナー通知をスキップします。
- `transform` は `taskListOrder`・`settings`・各 `taskList` の変換結果をキャッシュし、入力参照が同一のときは再計算と参照再生成を避けます。
- `taskLists` の Firestore 同期は `snapshot.docChanges()` を使って差分適用し、削除されたドキュメントもストアから除去します。

## エラーハンドリングとロギング

- SDK (`packages/sdk/src/store.ts`) 内の Firestore リスナー (`onSnapshot`) には、必ずエラーコールバックを設定する。
- エラーコールバックでは、`logSnapshotError` ヘルパーなどを使用して、以下の情報を構造化ログとして出力する：
  - エラー発生箇所（コンテキスト）
  - エラーコード (`code`)
  - エラーメッセージ (`message`)
  - 発生時のユーザー情報（UID, Email）
- これにより、長時間放置後のトークン期限切れやネットワーク切断による権限エラー (`permission-denied` 等) を特定しやすくする。
- Webアプリ (`apps/web`) では `ErrorBoundary` コンポーネントを使用し、予期せぬエラーによる画面のホワイトアウト（White Screen of Death）を防ぐ。

## 起動性能の実装方針（web）

- `/app` は `taskListOrderUpdatedAt` を待って全画面スピナーを維持しない。認証確認後はシェルを先に表示し、タスクリスト同期中はコンテンツ領域のみローディングを表示する。
- `TaskListCard` / `DrawerPanel` / `Carousel` / `ConfirmDialog` は `next/dynamic` で遅延ロードし、初期バンドル評価を分散する。
- ランディングページ (`/`) は `getServerSideProps` を使わず静的配信し、言語切り替えはクエリ (`?lang=`) をクライアント側で同期する。
- フォントは `_document.tsx` の外部 CSS 読み込みを廃止し、`_app.tsx` の `next/font/google` に統一する。Portal 配下の UI も `font-sans` が同じ変数を参照できるよう、`body` にフォント変数クラスを付与する。
