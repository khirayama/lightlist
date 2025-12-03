# コンポーネント構成指針

## 分類

- `apps/web/src/components/ui`: SDKに依存しないプリミティブ（Alert, ConfirmDialog, FormInput, Spinner）で、ライト/ダークテーマを考慮したスタイルを持つ
- `apps/web/src/components/app`: 設定や、タスク表示・並び替えなど、アプリ固有の共有コンポーネント。SDKへの依存が判断基準（TaskListPanel が単一タスクの描画も内包）

## 追加・変更ルール

- 再利用が見込めるもののみ切り出し、単一箇所でしか使わないUIはページ内にとどめる
- SDKやタスクドメインに触れる場合は `tasks` など機能ベースのディレクトリにまとめる
- ボタンや入力などのプリミティブは `ui` に集約し、スタイルの重複を避ける
- テーマとi18nはプリミティブで吸収し、ページ側での個別対応を増やさない

## app 配下のコンポーネント

- TaskListPanel: タスクリスト全体の DnD 並び替え、単一タスクのドラッグハンドル・編集・削除、追加フォームをまとめて提供する。`tasks` と `sensors`、編集/削除/完了/追加の各ハンドラ、`addPlaceholder` や `dragHintLabel` などの文言を props で受け取る。履歴入力候補（`historySuggestions`）や追加ボタンの状態制御（`addDisabled`/`inputDisabled`）、`variant`（`split` or `card`）でレイアウトを切り替えられる

## ビジュアルスタイル

- グローバル: `globals.css` で Sora + Noto Sans JP を適用し、`--glow` 由来のグラデーションを背景に敷いている。`--bg-panel`/`--bg-panel-strong` はモーダルやカードのベース色
- 面の扱い: UI は `bg-white/80` + `border-white/20` + `backdrop-blur` を基調とし、影は `shadow-[0_18px_60px_rgba(15,23,42,0.32)]` 系で統一する
- ボタン: プライマリは `from-cyan-500 via-emerald-500 to-lime-400` のグラデーション、破壊的操作は `from-rose-500 to-amber-400` を使用。角丸は XL（rounded-xl/2xl）で揃える
- 入力/カード: ガラス質感を持たせ、`border-white/10-30` と `focus:ring-cyan-400` を共通トーンとしている。TaskListPanel（内包するタスク行を含む）とモーダルも同一トーンで統一
- テーマ: `html.dark` で背景グラデーションを差し替え、ボーダー・影の濃度は同じトークンを再利用する方針
