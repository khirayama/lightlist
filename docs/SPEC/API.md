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
TaskListDocとTaskListDocOrderはLoroのCRDTドキュメントとして管理。TaskListDocはLoro Docを明示するため、doc suffixを付与。

- `GET    /api/settings` - Settings設定取得
- `PUT    /api/settings` - Settings設定更新
- `POST   /api/tasklistdocs` - TaskList(TaskListDoc)作成
- `GET    /api/tasklistdocs` - TaskList(TaskListDoc)一覧取得
- `PUT    /api/tasklistdocs/:taskListId` - TaskList(TaskListDoc)更新
- `DELETE /api/tasklistdocs/:taskListId` - TaskList(TaskListDoc)削除
- `PUT    /api/tasklistdocs/order` - TaskList(TaskListDoc)の順序更新。taskListDocOrderの更新。
- `POST   /api/tasklistdocs/:taskListId/token` - タスクリスト共有トークンを生成・更新
- `GET    /api/tasklistdocs?token=token` - 共有トークンによるTaskList(TaskListDoc)取得
- `GET    /api/health` - システムヘルスチェック
- `GET    /api/metrics` - システムメトリクス取得

### 注意事項

- 個別のCRUDエンドポイント（PUT /tasklists/:id、POST /tasks等）は存在しない
- データの一貫性はLoroのCRDTアルゴリズムで保証

## 3. リクエスト/レスポンス例

```json
// GET /api/appdoc
// Response
{
  "data": {
    "id": "app_xxx",
    "theme": "dark",
    "language": "en",
    "taskInsertPosition": "top",
    "autoSort": false
  },
  "message": "App settings retrieved successfully"
}

// PUT /api/appdoc
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


// GET /api/health
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

// GET /api/metrics
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

// POST /api/tasklistdocs
// Request
{
  "name": "新しいタスクリスト",
  "backgroundColor": "#ff5733"
}

// Response
{
  "data": {
    "id": "tasklist_xxx",
    "name": "新しいタスクリスト",
    "backgroundColor": "#ff5733",
    "order": 0,
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  },
  "message": "TaskList created successfully"
}

// GET /api/tasklistdocs
// Response
{
  "data": [
    {
      "id": "tasklist_xxx",
      "name": "個人タスク",
      "backgroundColor": "#007bff",
      "order": 0,
      "isShared": false,
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    },
    {
      "id": "tasklist_yyy",
      "name": "仕事タスク",
      "backgroundColor": "#28a745",
      "order": 1,
      "isShared": true,
      "createdAt": "2024-01-01T13:00:00Z",
      "updatedAt": "2024-01-01T13:00:00Z"
    }
  ],
  "message": "TaskLists retrieved successfully"
}

// PUT /api/tasklistdocs/:taskListId
// Request
{
  "name": "更新されたタスクリスト名",
  "backgroundColor": "#6f42c1"
}

// Response
{
  "data": {
    "id": "tasklist_xxx",
    "name": "更新されたタスクリスト名",
    "backgroundColor": "#6f42c1",
    "order": 0,
    "updatedAt": "2024-01-01T14:00:00Z"
  },
  "message": "TaskList updated successfully"
}

// PUT /api/tasklistdocs/order
// Request
{
  "taskListOrders": [
    { "id": "tasklist_yyy", "order": 0 },
    { "id": "tasklist_xxx", "order": 1 }
  ]
}

// Response
{
  "data": {
    "updatedCount": 2
  },
  "message": "TaskList order updated successfully"
}

// DELETE /api/tasklistdocs/:taskListId
// Response
{
  "data": {
    "id": "tasklist_xxx"
  },
  "message": "TaskList deleted successfully"
}

// GET /api/tasklistdocs?token=abcd1234
// Response
{
  "data": {
    "id": "tasklist_xxx",
    "name": "共有タスクリスト",
    "backgroundColor": "#007bff",
    "ownerName": "田中太郎",
    "tasks": [
      {
        "id": "task_xxx",
        "text": "サンプルタスク1",
        "completed": false,
        "date": "2024-01-15",
        "order": 0
      },
      {
        "id": "task_yyy",
        "text": "サンプルタスク2",
        "completed": true,
        "date": null,
        "order": 1
      }
    ],
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  },
  "message": "Shared TaskList retrieved successfully"
}

// POST /api/tasklistdocs/:taskListId/token
// Response
{
  "data": {
    "shareToken": "abcd1234efgh5678",
    "shareUrl": "https://lightlist.app/lists/tasklist_xxx?share=abcd1234efgh5678"
  },
  "message": "Share token generated successfully"
}
```
