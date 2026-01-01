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
- `npm run dev`
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

- `taskListOrder` は `includeMetadataChanges` を使い、`hasPendingWrites` が false のときのみ `taskLists` の購読を更新する
