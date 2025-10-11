# タスク管理アプリ API設計書

## 目次

- [1. Prismaスキーマ](#1-prismaスキーマ)
- [2. APIエンドポイント一覧](#2-apiエンドポイント一覧)
- [3. リクエスト/レスポンス例](#3-リクエストレスポンス例)

## 1. Prismaスキーマ

データベーススキーマの詳細については、実際のPrismaスキーマファイルを参照してください。

参照: `apps/api/prisma/schema.prisma`

## 2. APIエンドポイント一覧

認証はPrismaのUser/Accountを用いた自前JWT(HS256, BETTER_AUTH_SECRET)で運用。/api/auth/refreshは受け取ったrefreshTokenの署名・exp・typ("refresh")・sub存在を検証し、DBのUser存在確認後にaccess/refreshを再発行する。Better Authのハンドラは現状未使用。
TaskListDocとTaskListDocOrderはlib/crdtのCRDTで管理。TaskListDocはCRDTドキュメントを明示するため、doc suffixを付与。

### 認証エンドポイント

- `POST   /api/auth/register` - ユーザー登録（Settings、TaskListDocOrderDoc、初期TaskListDoc作成含む）
- `POST   /api/auth/login` - ログイン
- `POST   /api/auth/logout` - ログアウト
- `POST   /api/auth/refresh` - トークンリフレッシュ
- `POST   /api/auth/forgot-password` - パスワードリセットリクエスト
- `POST   /api/auth/reset-password` - パスワードリセット実行
- `DELETE /api/auth/account` - アカウント削除

### 設定エンドポイント

- `GET    /api/settings` - Settings設定取得
- `PUT    /api/settings` - Settings設定更新

### タスクリストエンドポイント

- `POST   /api/tasklistdocs` - TaskList(TaskListDoc)作成
  - 備考: TaskListDocOrderDocが未初期化の場合はサーバー側で自動初期化（空スナップショット・order=[]）してから作成を続行します。
- `GET    /api/tasklistdocs` - TaskList(TaskListDoc)一覧取得（ユーザー順に整列）。各要素はdoc(base64のexport())を含み、tasksはdocから復元したスナップショットを併記
- `PUT    /api/tasklistdocs/:taskListId` - TaskList(TaskListDoc)更新（CRDT updates適用）
- `DELETE /api/tasklistdocs/:taskListId` - TaskList(TaskListDoc)削除
- `PUT    /api/tasklistdocs/order` - TaskList(TaskListDoc)の順序更新（CRDT updates適用）
  - 備考: TaskListDocOrderDocが未初期化の場合はサーバー側で自動初期化してから更新を適用します。

- `POST   /api/tasklistdocs` - TaskList(TaskListDoc)作成
- `GET    /api/tasklistdocs` - TaskList(TaskListDoc)一覧取得（ユーザー順に整列）。各要素はdoc(base64のexport())を含み、tasksはdocから復元したスナップショットを併記
- `PUT    /api/tasklistdocs/:taskListId` - TaskList(TaskListDoc)更新（CRDT updates適用）
- `DELETE /api/tasklistdocs/:taskListId` - TaskList(TaskListDoc)削除
- `PUT    /api/tasklistdocs/order` - TaskList(TaskListDoc)の順序更新（CRDT updates適用）

### システムエンドポイント

- `GET    /api/health` - システムヘルスチェック
- `GET    /api/metrics` - システムメトリクス取得

エラーポリシー:

- 422 Validation error (Zod)
- 401 Unauthorized (JWTなし/不正)
- 404 Not Found
- 429 Too Many Requests (レート制限)
- 500 Internal server error

認証:

- Better Authハンドラは未使用（将来の導入候補）
- アプリAPIはBearer JWT (HS256, BETTER_AUTH_SECRET) を検証

更新系ペイロード:

- TaskListDoc更新/順序更新は、libのCRDT Operation配列(JSON)をbase64化した文字列をupdatesとして送信

- TaskListDocOrderDocはlib/crdtのスナップショットを復元して要素IDを保持し、新規作成時は既存順序に追記のみを行う
