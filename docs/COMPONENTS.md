# コンポーネント構成指針

## 分類

- `apps/web/src/components/ui`: SDKに依存しないプリミティブ（Alert, Calendar, ColorPicker, ConfirmDialog, Dialog, Drawer, FormInput, Spinner, StartupSplash, Carousel, Command, Popover, AppIcon, BrandLogo, ErrorBoundary）。Drawer は shadcn Drawer コンポジションを採用し、オーバーレイとレイアウトを Tailwind で定義済み。Dialog/Carousel も含め、ライト/ダークの可読性と操作性（focus-visible 等）を優先して必要なスタイルを持つ。Alert は variant 別に配色を切り替え、ConfirmDialog は Dialog を使って破壊的アクションのスタイルを切り替える。Spinner は `BrandLogo` を使用し、アニメーション（pulse）を伴う。`fullPage` prop を指定することで、画面中央に配置される。StartupSplash は起動時専用の全画面ローディング表示として `BrandLogo` を使用し、`_app.tsx` の `mounted` 判定と連動する。Calendar は i18next の言語に合わせて locale を切り替え、選択日の背景色・文字色は `day_button` の `aria-selected` スタイルでライト/ダーク両方に統一する。AppIcon は `@lightlist/sdk/icons` で定義された SVG パスデータを使用し、Web/Native で統一された汎用アイコン表示を実現する。BrandLogo は `apps/web/public/brand/logo.svg` を表示する Web 向けブランドロゴ表示コンポーネントで、デフォルトでは寸法クラスを持たず利用側で `h-*` / `w-*` を指定する。ColorPicker はタスクリストの背景色選択などで利用する再利用可能なカラー選択コンポーネント。ErrorBoundary はアプリ全体のクラッシュを捕捉し、リロードボタン付きのフォールバック画面を表示する。`AppIcon` (alert-circle) を使用し、シンプルでユーザーフレンドリーなエラー表示を提供する
- `apps/web/src/components/app`: 設定や、タスク表示・並び替えなど、アプリ固有の共有コンポーネント。SDKへの依存が判断基準。TaskListCard はタスクリストの操作（追加/編集/並び替え）を集約し、TaskItem は個々のタスク表示（ドラッグハンドル/チェックボックス/テキスト/日付）を担当する。DrawerPanel はタスクリスト一覧と作成・参加フローに加え、ヘッダー直下ボタンから開く下部シートで日付付きタスクの確認・日付変更を提供する
- `apps/native/src/components/ui`: ネイティブ向けのプリミティブ（Dialog, AppIcon, Carousel, StartupSplash）。Carousel は `react-native-pager-view` ベースで、`index` / `onIndexChange` の Controlled API を前提に `onPageSelected` を単一の index 確定イベントとして扱う。外部 index 変更はページャーへ直接反映して連続スワイプ時の戻りを防ぎ、`scrollEnabled` により並び替え中だけ横スワイプを停止できる。AppIcon は `@lightlist/sdk/icons` の SVG パスデータを `react-native-svg` で描画する。StartupSplash は `assets/splash-icon.png` を中央表示する起動時専用の全画面ローディング表示として `App.tsx` の初期待機と `Suspense fallback` で利用する
- `apps/native/src/components/app`: ネイティブ固有のタスク操作UIなど、画面共通で再利用するコンポーネント（TaskListCard はタスク追加/編集/並び替え/完了/完了削除の操作UIを集約し、タスク追加の send ボタンは入力フォーカス時のみアニメーション表示する。ヘッダーやリスト選択は画面側で管理）。TaskItem/TaskListCard の主要 props 命名（`task`, `onToggle`, `onDateChange`, `onEditingTextChange` など）は `apps/web` 側と揃え、`onToggle(task)` を共通シグネチャとして扱う。TaskItem の並び替え開始は drag_indicator ハンドル起点のみで、`onPressIn` により長押し不要で開始する。TaskListCard / DrawerPanel の `panGesture` は `activeOffsetY: [-12, 12]` / `failOffsetX: [-24, 24]` で統一し、ハンドル誤操作を抑えつつ縦ドラッグを優先する。DrawerPanel はタスクリスト一覧とリスト作成・参加ダイアログを集約し、並び替え更新は `onReorderTaskList` の単一経路で扱う

## 追加・変更ルール

- 再利用が見込めるもののみ切り出し、単一箇所でしか使わないUIはページ内にとどめる
- SDKやタスクドメインに触れる場合は `tasks` など機能ベースのディレクトリにまとめる
- ボタンや入力などのプリミティブは `ui` に集約し、スタイルの重複を避ける
- テーマとi18nはプリミティブで吸収し、ページ側での個別対応を増やさない
- Web の `StartupSplash` は hydration mismatch を避けるため、起動時の読み上げラベルを i18n の動的言語解決に依存させず固定文字列（`読み込み中`）で提供する
- 汎用アイコンは `@lightlist/sdk/icons` に集約された共通名と SVG パスデータを使用し、Web（標準SVG）と Native（react-native-svg）の両プラットフォームで一貫したビジュアルを提供する。ブランドロゴ表示は Web の `BrandLogo`（`/brand/logo.svg`）を使用する。これにより、フォントファイルのロードや外部アイコンライブラリへの依存を排除している
- モーダルは `ui/Dialog` を使用し、`titleId`/`descriptionId` を設定してアクセシビリティを担保する。Web の Drawer は shadcn 構成要素（Overlay/Content/Header/Title/Description/Trigger/Close/Portal）を利用し、Title/Description は Drawer 配下のみで使う。常設サイドバー表示では通常の見出し/本文要素でタイトル/説明を補う
- Web の AppShell は先頭にスキップリンクを配置し、各ページの主領域は `id="main-content"` を持つ `main` 要素を使用する（`/app` を含む）
- Web の通知 UI は `ui/Alert` を使用し、`variant` ごとに通知優先度を分ける。`error` / `warning` は assertive、`info` / `success` は polite を既定とし、必要時のみ `announcement` prop で上書きする
- Web の `ui/Carousel` は非アクティブスライドを `aria-hidden` にし、スクリーンリーダーの読み上げ対象を現在表示スライドに寄せる
- Web の `TaskItem` の完了チェックボックスはタスクテキストを `aria-labelledby` で関連付ける。`TaskListCard` の新規タスク入力（combobox）は placeholder とは別に `aria-label` を持つ
- Native のカスタム操作 UI（`Pressable`）は `accessibilityRole` / `accessibilityLabel` / `accessibilityState` をセットで定義する。特に完了切り替えは `checkbox` ロールと `checked` 状態、設定の選択肢は `radio` ロールと `checked` 状態を使用する
- Native の `ui/Dialog` 背景スクラムは既定で読み上げ対象外とし、必要時のみ `overlayAccessible` / `overlayAccessibilityLabel` を使って背景閉じる操作を公開する

## Pages ルーティング

- `apps/web` は `apps/web/src/pages` 配下の `.tsx` をルーティング対象とする（Next.js 標準）
- ページに密結合の補助コンポーネントは、`apps/web/src/components` に配置することを基本とするが、ページ固有の構成要素として分割する場合は適切なディレクトリ構造を検討する
- `/`（`apps/web/src/pages/index.tsx`）はランディングページとして `next/head` でページ専用の title/description/keywords、OGP/Twitter Card、canonical・alternate（`?lang=en`）を出し分ける。Hero ロゴサイズは利用側クラスで mobile を小さめ（`h-12`）に抑え、`sm` 以上で段階的に拡大する
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
- Carousel はインジケーター（ドット）を表示し、スワイプ操作やドラッグ操作によるスライド切り替えを基本とする。インジケーターのドット間隔は Web / Native ともに `gap-0.5`（2px）で統一する。`index` / `onIndexChange` による Controlled 制御を前提に、連続操作中はユーザージェスチャーで確定した index を優先する。また、`scrollEnabled` プロパティでユーザー操作によるスクロール（スワイプ）の可否を制御でき、タスク並び替え時などの誤操作防止に利用する
- スクロールバーは `apps/web/src/styles/globals.css` でグローバルに定義され、OS 標準のスクロールバーを非表示にする代わりに、ライト/ダーク各テーマに合わせた細身で角丸のモダンなスタイル（WebKit/Firefox 対応）を適用している

## 設定ページ

- 戻る操作は履歴がある場合にブラウザバックを行い、履歴がない場合は `/app` に遷移してタスク一覧に戻る
- Web / Native ともに「ヘッダー」「表示と動作」「アカウント操作」のカード型セクションで構成し、主要画面の情報設計を揃える
- 設定画面ヘッダーの戻る導線は、Web / Native ともに `settings.title` 見出しの左側に丸型のアイコンボタン（`arrow-back`）として配置する
- 「表示と動作」セクションには言語 / テーマ / 追加位置（select形式）と自動並び替え（トグル）をまとめる
- Web はネイティブの `<select>`、Native は選択行タップで開くダイアログ式セレクタで、単一選択の操作モデルを揃える
- アカウント操作セクションにはメールアドレス表示とログアウト / アカウント削除をまとめ、削除のみ赤系の破壊的ボタンとして分離する
