# タスク管理アプリ API設計書

## 目次

- [1. Prismaスキーマ](#1-prismaスキーマ)
- [2. APIエンドポイント一覧](#2-apiエンドポイント一覧)
- [3. リクエスト/レスポンス例](#3-リクエストレスポンス例)

## 1. Prismaスキーマ

データベーススキーマの詳細については、実際のPrismaスキーマファイルを参照してください。

参照: `apps/api/prisma/schema.prisma`

## 2. APIエンドポイント一覧

Better Authを採用。Expressに toNodeHandler(auth) をマウント（/api/auth/\*）。
Cookieセッション（ll_session）を基本とし、Authorization: Bearer でのセッション検出も許容。
CORS: CORS_ORIGIN が '_' または未設定の場合は origin='_' かつ credentials=false。カンマ区切りの値を指定した場合は allowlist として適用し、credentials=true。

- `DELETE /api/account` - アカウント削除（アプリ独自）

### 設定エンドポイント

- `GET    /api/settings` - Settings設定取得
- `PUT    /api/settings` - Settings設定更新

### タスクリストエンドポイント（Local-first）

ID生成ポリシー（Local-first）:

- IDはクライアント側でUUID v4を生成して送信します（オフラインでも安定一意）。
- サーバーは通常IDを生成しません。Prismaのuuid()はサーバー主導作成時のみのフォールバックで、通常未使用です。
- 既存IDと衝突した場合は作成は失敗します（クライアントは衝突しないIDを用意してください）。

- `POST   /api/tasklistdocs` - TaskList(TaskListDoc)作成（クライアント生成・サーバ保存）
  - リクエスト: `{ id: string(uuid), doc: string(base64 of snapshot) }`
  - サーバはdocをインポートし、name/background/tasks/historyをスナップショットから抽出して保存。
  - 順序ドキュメント(TaskListDocOrderDoc)にidを一度だけ末尾追加（冪等）。
- `GET    /api/tasklistdocs` - TaskList(TaskListDoc)一覧取得（ユーザー順）。各要素に`doc`(base64)を含む。
- `PUT    /api/tasklistdocs/:taskListId` - TaskList更新（CRDT updates適用）
  - リクエスト: `{ updates: string(base64 of ops JSON) }`
- `DELETE /api/tasklistdocs/:taskListId` - TaskList削除（順序からも削除）
- `PUT    /api/tasklistdocs/order` - TaskList順序更新（CRDT updates適用）

### システムエンドポイント

- `GET    /api/health` - システムヘルスチェック（DB接続を簡易検証）
- `GET    /api/metrics` - システムメトリクス取得

エラーポリシー:

- 422 Validation error (Zod)
- 401 Unauthorized (未認証)
- 403 Forbidden（他人のリソース/順序に対する操作）
- 404 Not Found
- 429 Too Many Requests (レート制限)
- 500 Internal server error

## 3. リクエスト/レスポンス例

- POST /api/tasklistdocs

```
{
  "id": "7b2f5f34-9d57-4e8d-9b2a-4e9dcd7f7f1a",
  "doc": "eyJhY3RvcklkIjoi..." // base64
}
```

{
"id": "7b2f5f34-9d57-4e8d-9b2a-4e9dcd7f7f1a",
"doc": "eyJhY3RvcklkIjoi..." // base64
}

```

```
