# コンポーネント構成指針

## 分類

- `apps/web/src/components/ui`: SDKに依存しないプリミティブ（Alert, ConfirmDialog, Dialog, Drawer, FormInput, Spinner, Carousel, Command）。Drawer は shadcn Drawer コンポジションを採用し、オーバーレイとレイアウトを Tailwind で定義済み。Dialog/Carousel も含め、ライト/ダークの可読性と操作性（focus-visible 等）を優先して必要なスタイルを持つ
- `apps/web/src/components/app`: 設定や、タスク表示・並び替えなど、アプリ固有の共有コンポーネント。SDKへの依存が判断基準（TaskListPanel が単一タスクの描画も内包）

## 追加・変更ルール

- 再利用が見込めるもののみ切り出し、単一箇所でしか使わないUIはページ内にとどめる
- SDKやタスクドメインに触れる場合は `tasks` など機能ベースのディレクトリにまとめる
- ボタンや入力などのプリミティブは `ui` に集約し、スタイルの重複を避ける
- テーマとi18nはプリミティブで吸収し、ページ側での個別対応を増やさない
- モーダルは `ui/Dialog` を使用し、`titleId`/`descriptionId` を設定してアクセシビリティを担保する。Drawer は shadcn 構成要素（Overlay/Content/Header/Title/Description/Trigger/Close/Portal）を利用する

## Pages ルーティング

- `apps/web` は `pageExtensions` を使い、`src/pages` 配下の `.page.tsx` / `.page.ts` のみをルーティング対象とする
- ページに密結合の補助コンポーネントは、同じディレクトリに `.tsx` として同居させる（例: `src/pages/app/DrawerPanel.tsx`）

## モノレポ内SDKの取り込み

- `@lightlist/sdk` は TypeScript ソースを export する前提のため、`apps/web/next.config.js` で `transpilePackages: ["@lightlist/sdk"]` を有効化し、Next.js のビルドで確実にトランスパイルできるようにする

## レイアウト基盤（画面100%基準）

- `apps/web/src/styles/globals.css` で `html` / `body` / `#__next` を `width: 100%` / `height: 100%` にし、`h-full` を成立させる
- `apps/web/src/pages/_app.page.tsx` は AppShell を持ち、`h-dvh` を高さの基準（画面100%）として扱う
- 画面スクロールは AppShell（`overflow-y-auto`）を基本とし、ページ側は `min-h-full w-full` を基準にレイアウトする

## app 配下のコンポーネント

- TaskListPanel: タスクリスト全体の DnD 並び替え、単一タスクのドラッグハンドル・編集・削除、追加フォームをまとめて提供する。追加フォームは `variant="card"` ではパネル上部（ヘッダー相当）に、`variant="split"` では下部の入力エリアに表示する。入力と追加ボタンは常に横並びで、追加ボタンは送信アイコン表示（`addButtonLabel` は `aria-label`/`title` 用）。`tasks` と `sensors`、編集/削除/完了/追加の各ハンドラ、`addPlaceholder` や `dragHintLabel` などの文言を props で受け取る。履歴入力候補（`historySuggestions`）は shadcn/ui の Combobox（`cmdk`）で表示し、候補リストはインスタンスごとにユニークな `id` を持つ。候補は入力が2文字以上のときのみ表示し、入力文字列を含むものを大小文字を無視して重複排除したうえで最大20件表示する。追加ボタンの状態制御（`addDisabled`/`inputDisabled`）も props で制御できる

## ビジュアルスタイル

- Drawer はオーバーレイやスライド方向、背景/文字色を Tailwind で定義し、ライト/ダークの可読性を担保する
- モバイルの Drawer ではヘッダーに閉じる（×）ボタンを配置し、`aria-label`/`title` は i18next の `common.close` を使用する
- Drawer のヘッダーではログインメールと設定導線を同一行に並べ、設定はアイコンボタンとして配置する。`aria-label`/`title` は i18next の `settings.title` を使用し、必要に応じて `data-vaul-no-drag` でタップ操作を阻害しないようにする
- 左右ドロワーは vaul のドラッグ判定でタップが奪われやすいので、必要に応じて `handleOnly` や `data-vaul-no-drag` でドラッグ開始を抑止して操作性を安定させる
- Dialog は `--dialog-bg` / `--dialog-fg` / `--dialog-muted` を `:root` と `.dark` で定義し、テーマ切り替えに追従させる
- Carousel は前後ボタンをデフォルトで視認性の高いコントロールとして表示する

## 設定ページ

- 戻る操作は履歴がある場合にブラウザバックを行い、履歴がない場合は `/app` に遷移してタスク一覧に戻る
