# コンポーネント構成指針

## 分類

- `apps/web/src/components/ui`: SDKに依存しないプリミティブ（Alert, ConfirmDialog, Dialog, FormInput, Spinner）で、現在はスタイルを持たないシンプルな実装
- `apps/web/src/components/app`: 設定や、タスク表示・並び替えなど、アプリ固有の共有コンポーネント。SDKへの依存が判断基準（TaskListPanel が単一タスクの描画も内包）

## 追加・変更ルール

- 再利用が見込めるもののみ切り出し、単一箇所でしか使わないUIはページ内にとどめる
- SDKやタスクドメインに触れる場合は `tasks` など機能ベースのディレクトリにまとめる
- ボタンや入力などのプリミティブは `ui` に集約し、スタイルの重複を避ける
- テーマとi18nはプリミティブで吸収し、ページ側での個別対応を増やさない
- モーダルは `ui/Dialog` を使用し、`titleId`/`descriptionId` を設定してアクセシビリティを担保する

## app 配下のコンポーネント

- TaskListPanel: タスクリスト全体の DnD 並び替え、単一タスクのドラッグハンドル・編集・削除、追加フォームをまとめて提供する。`tasks` と `sensors`、編集/削除/完了/追加の各ハンドラ、`addPlaceholder` や `dragHintLabel` などの文言を props で受け取る。履歴入力候補（`historySuggestions`）や追加ボタンの状態制御（`addDisabled`/`inputDisabled`）、`variant`（`split` or `card`）でレイアウトを切り替えられる

## ビジュアルスタイル

- スタイルはデザイン検証ではなく機能確認を優先するため、基本的に付与しない
- 背景や配色のトークンは廃止し、素のマークアップで動作を確認する
