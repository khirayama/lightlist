# コンポーネント構成指針

## 分類
- `apps/web/src/components/ui`: SDKに依存しないプリミティブ（Alert, ConfirmDialog, FormInput, Spinner）
- `apps/web/src/components/tasks`: タスク表示や並び替えなど、タスクドメインの共有コンポーネント（TaskItem）

## 追加・変更ルール
- 再利用が見込めるもののみ切り出し、単一箇所でしか使わないUIはページ内にとどめる
- SDKやタスクドメインに触れる場合は `tasks` など機能ベースのディレクトリにまとめる
- ボタンや入力などのプリミティブは `ui` に集約し、スタイルの重複を避ける
