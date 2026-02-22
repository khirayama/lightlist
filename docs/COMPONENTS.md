# コンポーネント構成指針

## 分類

- `apps/web/src/components/ui`: SDKに依存しないプリミティブ（Alert, Calendar, ColorPicker, ConfirmDialog, Dialog, Drawer, FormInput, Spinner, Carousel, Command, Popover, AppIcon, ErrorBoundary）。Drawer は shadcn Drawer コンポジションを採用し、オーバーレイとレイアウトを Tailwind で定義済み。Dialog/Carousel も含め、ライト/ダークの可読性と操作性（focus-visible 等）を優先して必要なスタイルを持つ。Alert は variant 別に配色を切り替え、ConfirmDialog は Dialog を使って破壊的アクションのスタイルを切り替える。Spinner は `AppIcon` (logo) を使用し、アニメーション（pulse）を伴う。`fullPage` prop を指定することで、画面中央に配置される。Calendar は i18next の言語に合わせて locale を切り替え、選択日の背景色・文字色は `day_button` の `aria-selected` スタイルでライト/ダーク両方に統一する。AppIcon は `@lightlist/sdk/icons` で定義された SVG パスデータを使用し、Web/Native で統一されたアイコン表示を実現する。ColorPicker はタスクリストの背景色選択などで利用する再利用可能なカラー選択コンポーネント。ErrorBoundary はアプリ全体のクラッシュを捕捉し、リロードボタン付きのフォールバック画面を表示する。`AppIcon` (alert-circle) を使用し、シンプルでユーザーフレンドリーなエラー表示を提供する
- `apps/web/src/components/app`: 設定や、タスク表示・並び替えなど、アプリ固有の共有コンポーネント。SDKへの依存が判断基準。TaskListCard はタスクリストの操作（追加/編集/並び替え）を集約し、TaskItem は個々のタスク表示（ドラッグハンドル/チェックボックス/テキスト/日付）を担当する。DrawerPanel はタスクリスト一覧と作成・参加フローに加え、ヘッダー直下ボタンから開く下部シートで日付付きタスクの確認・日付変更を提供する
- `apps/native/src/components/ui`: ネイティブ向けのプリミティブ（Dialog, AppIcon, Carousel）。Carousel は `react-native-pager-view` ベースで、`onPageSelected` を単一の index 確定イベントとして扱う。ローカル index と外部通知の同期を最小構成で行い、外部 index 変更はページャーへ直接反映して連続スワイプ時の戻りを防ぐ。`scrollEnabled` により並び替え中だけ横スワイプを停止できる。AppIcon は `@lightlist/sdk/icons` の SVG パスデータを `react-native-svg` で描画する
- `apps/native/src/components/app`: ネイティブ固有のタスク操作UIなど、画面共通で再利用するコンポーネント（TaskListCard はタスク追加/編集/並び替え/完了/完了削除の操作UIを集約し、タスク追加の send ボタンは入力フォーカス時のみアニメーション表示する。ヘッダーやリスト選択は画面側で管理）。TaskItem/TaskListCard の主要 props 命名（`task`, `onToggle`, `onDateChange`, `onEditingTextChange` など）は `apps/web` 側と揃え、`onToggle(task)` を共通シグネチャとして扱う。TaskItem の並び替え開始は drag_indicator ハンドル起点のみで、`onPressIn` により長押し不要で開始する。TaskListCard / DrawerPanel の `panGesture` は `activeOffsetY: [-12, 12]` / `failOffsetX: [-24, 24]` で統一し、ハンドル誤操作を抑えつつ縦ドラッグを優先する。DrawerPanel はタスクリスト一覧とリスト作成・参加ダイアログを集約し、並び替え更新は `onReorderTaskList` の単一経路で扱う

## 追加・変更ルール

- 再利用が見込めるもののみ切り出し、単一箇所でしか使わないUIはページ内にとどめる
- SDKやタスクドメインに触れる場合は `tasks` など機能ベースのディレクトリにまとめる
- ボタンや入力などのプリミティブは `ui` に集約し、スタイルの重複を避ける
- テーマとi18nはプリミティブで吸収し、ページ側での個別対応を増やさない
- アイコンは `@lightlist/sdk/icons` に集約された共通名と SVG パスデータを使用し、Web（標準SVG）と Native（react-native-svg）の両プラットフォームで一貫したビジュアルを提供する。これにより、フォントファイルのロードや外部アイコンライブラリへの依存を排除している
- モーダルは `ui/Dialog` を使用し、`titleId`/`descriptionId` を設定してアクセシビリティを担保する。Web の Drawer は shadcn 構成要素（Overlay/Content/Header/Title/Description/Trigger/Close/Portal）を利用し、Title/Description は Drawer 配下のみで使う。常設サイドバー表示では通常の見出し/本文要素でタイトル/説明を補う

## Pages ルーティング

- `apps/web` は `apps/web/src/pages` 配下の `.tsx` をルーティング対象とする（Next.js 標準）
- ページに密結合の補助コンポーネントは、`apps/web/src/components` に配置することを基本とするが、ページ固有の構成要素として分割する場合は適切なディレクトリ構造を検討する
- TaskListCard はタスクリストの表示・操作（タスク追加/編集/並び替え/完了/削除）を内包し、`enableEditDialog`/`enableShareDialog` フラグでリスト編集・共有ダイアログの表示を制御できる。AppPage と ShareCodePage の両方から再利用可能

## モノレポ内SDKの取り込み

- `@lightlist/sdk` は TypeScript ソースを export する前提のため、`apps/web/next.config.js` で `transpilePackages: ["@lightlist/sdk"]` を有効化し、Next.js のビルドで確実にトランスパイルできるようにする

## レイアウト基盤（画面100%基準）

- `apps/web/src/styles/globals.css` で `html` / `body` / `#__next` を `width: 100%` / `height: 100%` にし、`h-full` を成立させる
- `apps/web/src/pages/_app.tsx` は AppShell を持ち、`h-dvh` を高さの基準（画面100%）として扱う
- 画面スクロールは AppShell（`overflow-y-auto`）を基本とし、ページ側は `min-h-full w-full` を基準にレイアウトする
- PWA の manifest と共通メタデータは `apps/web/public/manifest.webmanifest` と `apps/web/src/pages/_app.tsx` の `Head` で管理する

## app 配下のコンポーネント

- TaskListCard: タスクリスト全体の DnD 並び替え、単一タスクのドラッグハンドル・編集・日付設定・完了、追加フォームをまとめて提供する。タスクのテキスト編集は Enter キーで確定、Escape キーでキャンセル（編集終了）が可能。`TaskList.background` をカード全体の背景色として反映し、タスクアイテム自体は透明（背景色なし）に保つことで、リストの一体感を高める。追加フォームはパネル上部（ヘッダー相当）に表示する。入力と追加ボタンは常に横並びで、追加ボタンは送信アイコン表示（`addButtonLabel` は `aria-label`/`title` 用）。並び替えは左寄せボタンでテキスト左に並び替えアイコンを配置し、完了タスク削除は右寄せボタンでテキスト右にゴミ箱アイコンを配置する。`tasks` と `sensors`、編集/完了/日付設定/追加の各ハンドラ、`addPlaceholder` や `dragHintLabel` などの文言を props で受け取る。履歴入力候補（`historySuggestions`）は shadcn/ui の Combobox（`cmdk`）で表示し、候補リストはインスタンスごとにユニークな `id` を持つ。候補は入力が2文字以上のときのみ表示し、入力文字列を含むものを大小文字を無視して重複排除したうえで最大20件表示する。追加ボタンの状態制御（`addDisabled`/`inputDisabled`）も props で制御でき、追加フォーム送信後は入力欄にフォーカスを戻す

## ビジュアルスタイル

- アプリケーション全体のフォントは、Web では `next/font/google`（`Inter` / `Noto Sans JP`）を `_app.tsx` で読み込み、Tailwind の `font-sans` から CSS 変数経由で適用する。Portal 配下にも反映されるよう、`body` に同じフォント変数クラスを付与する
- Web の Drawer はオーバーレイやスライド方向、背景/文字色を Tailwind で定義し、ライト/ダークの可読性を担保する
- z-index は通常レイヤーを 10 刻み（10〜100）、ダイアログ系は 10 刻み（1000〜1500）で管理し、Web の Drawer はオーバーレイ 1000/コンテンツ 1100、Dialog はオーバーレイ 1200/コンテンツ 1300 を基本とする
- Web (Mobile) の Drawer ではヘッダーに閉じる（×）ボタンを配置し、`aria-label`/`title` は i18next の `common.close` を使用する
- Web (Mobile) の Drawer は開く際に History API で状態を追加し、ブラウザの戻るボタンや Android/iOS のスワイプジェスチャーで閉じられる。閉じる時は `history.back()` を呼び、`popstate` イベントで状態を同期する
- Drawer のヘッダーではログインメールと設定導線を同一行に並べ、設定はアイコンボタンとして配置する。`aria-label`/`title` は i18next の `settings.title` を使用し、必要に応じて `data-vaul-no-drag` でタップ操作を阻害しないようにする
- 左右ドロワーは vaul のドラッグ判定でタップが奪われやすいので、必要に応じて `handleOnly` や `data-vaul-no-drag` でドラッグ開始を抑止して操作性を安定させる
- Dialog は `--dialog-bg` / `--dialog-fg` / `--dialog-muted` を `:root` と `.dark` で定義し、テーマ切り替えに追従させる
- Dialog はオーバーレイ（背景）タップで閉じられる挙動を標準とする
- Carousel はインジケーター（ドット）を表示し、スワイプ操作やドラッグ操作によるスライド切り替えを基本とする。インジケーターのドット間隔は Web / Native ともに `gap-0.5`（2px）で統一する。外部からのインデックス制御にも対応しつつ、連続操作中はユーザージェスチャーで確定した index を優先する。また、`scrollEnabled` プロパティでユーザー操作によるスクロール（スワイプ）の可否を制御でき、タスク並び替え時などの誤操作防止に利用する
- スクロールバーは `apps/web/src/styles/globals.css` でグローバルに定義され、OS 標準のスクロールバーを非表示にする代わりに、ライト/ダーク各テーマに合わせた細身で角丸のモダンなスタイル（WebKit/Firefox 対応）を適用している

## 設定ページ

- 戻る操作は履歴がある場合にブラウザバックを行い、履歴がない場合は `/app` に遷移してタスク一覧に戻る
- 各設定はカード型セクションでまとめ、`fieldset`/`legend` でまとまりを明示する
- ラジオ/チェックボックスはタイル状の選択 UI とし、ライト/ダーク両テーマの可読性とフォーカス可視性を担保する
- 破壊的アクションは赤系のカードとボタンで分離し、誤操作を避ける
