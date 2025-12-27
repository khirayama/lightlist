# 開発コマンド

## ルート（モノレポ）

- `npm run dev`: 全ワークスペースの開発サーバー起動
- `npm run build`: 全ワークスペースのビルド
- `npm run format`: 全ワークスペースの整形
- `npm run typecheck`: 全ワークスペースの型チェック
- `npm run deploy:firestore`: SDK の Firestore ルール/インデックスをデプロイ

## apps/web

- `cd apps/web`
- `npm run dev`
- `npm run build`
- `npm run format`
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

## Firestore 購読

- `taskListOrder` は `includeMetadataChanges` を使い、`hasPendingWrites` が false のときのみ `taskLists` の購読を更新する
