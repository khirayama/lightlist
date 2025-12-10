# コンポーネント構成指針

## 分類

- `apps/web/src/components/ui`: SDKに依存しないプリミティブ（Alert, ConfirmDialog, Dialog, Drawer, FormInput, Spinner, Carousel）。Drawer は shadcn Drawer コンポジションを採用し、オーバーレイとレイアウトを Tailwind で定義済み。その他はスタイル最小限のシンプル実装
- `apps/web/src/components/app`: 設定や、タスク表示・並び替えなど、アプリ固有の共有コンポーネント。SDKへの依存が判断基準（TaskListPanel が単一タスクの描画も内包）

## 追加・変更ルール

- 再利用が見込めるもののみ切り出し、単一箇所でしか使わないUIはページ内にとどめる
- SDKやタスクドメインに触れる場合は `tasks` など機能ベースのディレクトリにまとめる
- ボタンや入力などのプリミティブは `ui` に集約し、スタイルの重複を避ける
- テーマとi18nはプリミティブで吸収し、ページ側での個別対応を増やさない
- モーダルは `ui/Dialog` を使用し、`titleId`/`descriptionId` を設定してアクセシビリティを担保する。Drawer は shadcn 構成要素（Overlay/Content/Header/Title/Description/Trigger/Close/Portal）を利用する

## app 配下のコンポーネント

- TaskListPanel: タスクリスト全体の DnD 並び替え、単一タスクのドラッグハンドル・編集・削除、追加フォームをまとめて提供する。`tasks` と `sensors`、編集/削除/完了/追加の各ハンドラ、`addPlaceholder` や `dragHintLabel` などの文言を props で受け取る。履歴入力候補（`historySuggestions`）や追加ボタンの状態制御（`addDisabled`/`inputDisabled`）、`variant`（`split` or `card`）でレイアウトを切り替えられる

## ビジュアルスタイル

- Drawer はオーバーレイやスライド方向、背景/文字色を Tailwind で定義し、ライト/ダークの可読性を担保する
- その他のプリミティブは機能確認を優先し、スタイルは最小限にとどめる

## 設定ページ

- 戻る操作は履歴がある場合にブラウザバックを行い、履歴がない場合は `/app` に遷移してタスク一覧に戻る
