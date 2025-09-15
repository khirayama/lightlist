# タスク管理アプリ API設計書

## 目次

- [1. Prismaスキーマ](#1-prismaスキーマ)
- [2. APIエンドポイント一覧](#2-apiエンドポイント一覧)
- [3. リクエスト/レスポンス例](#3-リクエストレスポンス例)

## 1. Prismaスキーマ

データベーススキーマの詳細については、実際のPrismaスキーマファイルを参照してください。

参照: `@apps/api/prisma/schema.prisma`

## 2. APIエンドポイント一覧

認証は全てSupabase Authを使用。

- `GET    /api/app` - App(AppDoc)設定取得（theme, language, taskInsertPosition, autoSort）
- `PUT    /api/app` - App(AppDoc)設定更新
- `POST   /api/tasklists` - TaskList(TaskListDoc)作成
- `GET    /api/tasklists` - TaskList(TaskListDoc)一覧取得
- `PUT    /api/tasklists/:taskListId` - TaskList(TaskListDoc)更新
- `DELETE /api/tasklists/:taskListId` - TaskList(TaskListDoc)削除
- `GET    /api/tasklists?token=token` - 共有トークンによるTaskList(TaskListDoc)取得
- `POST   /api/tasklists/:taskListId/token` - タスクリスト共有トークンを生成・更新

### 注意事項

- /api/appと/api/tasklistsはloro docの操作を行う
- 個別のCRUDエンドポイント（PUT /tasklists/:id、POST /tasks等）は存在しない
- データの一貫性はLoroのCRDTアルゴリズムで保証

## 3. リクエスト/レスポンス例

```json
// GET /app
// Response
{
  "data": {
    "id": "app_xxx",
    "theme": "dark",
    "language": "en"
    "taskInsertPosition": "top",
    "autoSort": false
  },
  "message": "App settings retrieved successfully"
}

// PUT /app
{
  "taskInsertPosition": "bottom",
  "autoSort": true
}

// Response
{
  "data": {
    "id": "app_xxx",
    "taskInsertPosition": "bottom",
    "autoSort": true
  },
  "message": "App settings updated successfully"
}

// POST /collaborative/sessions
{
  "sessionType": "active"  // オプション（デフォルト: "active"）
}

// Response
{
  "data": {
    "sessions": [
      {
        "taskListId": "list1",
        "sessionId": "session_xxx",
        "documentState": "base64-encoded-yjs-document",
        "stateVector": "base64-encoded-state-vector"
      },
      {
        "taskListId": "list2",
        "sessionId": "session_yyy",
        "documentState": "base64-encoded-yjs-document",
        "stateVector": "base64-encoded-state-vector"
      }
    ]
  },
  "message": "Sessions started successfully"
}

// GET /health
// Response
{
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00Z",
    "database": "connected",
    "services": {
      "auth": "ok",
      "collaborative": "ok"
    }
  },
  "message": "System is healthy"
}

// GET /metrics
// Response
{
  "data": {
    "activeUsers": 150,
    "activeSessions": 45,
    "totalTasks": 1250,
    "uptime": "72h 15m"
  },
  "message": "Metrics retrieved successfully"
}
```
