$1

$1

- 画面フォーカス時とAppStateがactiveに遷移した際、/api/settingsを再取得してタスク挿入位置と自動並び替え設定を即時反映（native）。

$2GET /api/tasklistdocs（追加）

- apps/native/src/lib/api.ts に api.getTaskListDocs(params?: { signal?: AbortSignal; ifNoneMatch?: string }) を追加
- レスポンス: Array<{ id, name, background, createdAt, updatedAt, doc?: base64 }>
- 使い方: 初回ロードとポーリングで呼び出し、docをimportしてUIに反映

apps/native/src/lib/api.ts は docs/SPEC/API.md を正とする。

- エンドポイント:
  - 認証: /api/auth/\*
  - 設定: /api/settings (GET/PUT)
  - タスクリスト: /api/tasklistdocs (POST/GET)
  - タスクリスト更新: /api/tasklistdocs/:taskListId (PUT) updates=base64(JSON of CRDT operations)
  - 並び順更新: /api/tasklistdocs/order (PUT) updates=base64(JSON of CRDT operations)
- リフレッシュ: 401時に /api/auth/refresh を1回だけ試行
- Androidエミュ: 10.0.2.2 に自動切替
- 依存: lib/crdt の Operation 型を参照

差分

- 以前の updateTaskListDoc は name/background/tasks を直接送信していたが、CRDT ops(base64)に統一
- updateTaskListDocOrder も同様に ops(base64) を送信
