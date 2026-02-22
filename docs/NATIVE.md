# ネイティブアプリ（apps/native）

## 目的

- Expo を使って最小構成の React Native 環境を用意し、実機での確認をすぐに行える状態にする
- テーマ（ライト/ダーク）と i18next による多言語対応の土台を持つ
- **注意**: React Native Web による Web 対応は対象外（`apps/web` で別途実装）

## 構成

- `apps/native`: Expo + React Native（TypeScript）
- `i18next` / `react-i18next`: 文字列はすべて i18next で管理
- `@react-navigation/native` / `@react-navigation/native-stack` / `@react-navigation/drawer`: 認証/タスクリスト/設定画面のルーティング
- `react-native-gesture-handler`: ドラッグ操作を含むジェスチャの基盤
- `react-native-reanimated` / `react-native-worklets`: ドラッグ操作のアニメーション基盤
- `react-native-reorderable-list`: タスクのドラッグ並び替え
- `react-native-pager-view`: ネイティブページャーによる横スワイプ切り替え
- `@react-native-community/datetimepicker`: タスクの日付設定用Date Picker
- `react-native-svg`: SVGアイコンの描画
- `expo-splash-screen`: 認証状態の確定までのスプラッシュスクリーン制御
- `react-native-screens`: Expo Go に合わせたバージョン固定でネイティブスタックを安定化
- 依存解決: ルート `package.json` の `overrides` で Expo Go と整合するバージョンに固定
- `@lightlist/sdk`: Firebase 認証の呼び出しは SDK 経由
- React: モノレポ全体で 19.1.0 に統一し、Expo Go の renderer と整合させる
- テーマ: `useColorScheme` によるライト/ダーク切替、`useTheme` フックで画面から直接アクセス
- セーフエリア: `react-native-safe-area-context` による Safe Area 対応
- i18n 初期化: `apps/native/src/utils/i18n.ts` に集約
- 翻訳リソース: `apps/native/src/locales/ja.json` / `apps/native/src/locales/en.json`
- テーマ定義: `apps/native/src/styles/theme.ts` に定数と型定義を集約
- スタイリング: NativeWind v4 (Tailwind CSS) を使用。`apps/native/global.css` を定義し、`apps/native/src/index.ts` でインポートして適用。`babel.config.js` で `{ jsxImportSource: "nativewind" }` を設定。
- 画面: `apps/native/src/screens` に `AuthScreen` / `AppScreen` / `SettingsScreen` / `ShareCodeScreen` / `PasswordResetScreen` を配置。各画面は自己完結型で、状態管理・ビジネスロジック・SDK呼び出しを内包する
- UIコンポーネント: `apps/native/src/components/ui` に `Dialog.tsx`（作成/編集用ダイアログ）、`Carousel.tsx`（リスト表示）、`AppIcon.tsx`（SVGアイコン）を集約
- appコンポーネント: `apps/native/src/components/app/TaskListCard.tsx` を `AppScreen` / `ShareCodeScreen` で共通利用し、タスク追加/編集/並び替え/完了/完了削除の操作UIを集約。Web版に合わせ、タスクの日付をテキスト上部に表示し、エラー表示用変数名などの内部ロジックも共通化している（ヘッダーやリスト選択は画面側で管理）。`apps/native/src/components/app/DrawerPanel.tsx` はタスクリスト一覧と作成・参加ダイアログを集約
- バリデーション/エラーハンドリング: `apps/native/src/utils/validation.ts` / `apps/native/src/utils/errors.ts` に集約。`validateAuthForm` / `validatePasswordForm` / `resolveErrorMessage` の API は `apps/web` と同一に統一

## アーキテクチャ

### 責務分離

`apps/web` のページ構成に合わせ、各画面が自己完結型となっている:

- **App.tsx**: ナビゲーション設定と認証状態の監視、NativeWind のテーマ同期を担当
- **各Screen**: フォーム状態、バリデーション、SDK呼び出し、エラーハンドリングを自身で管理

これにより:

- 画面間の依存関係が最小化され、各画面を独立して理解・修正できる
- Web版（`apps/web/src/pages`）と同様の責務分離パターンを採用

### スタイリングとテーマ

NativeWind v4 を使用して、Tailwind CSS のユーティリティクラスでスタイリングを行う:

- `apps/native/tailwind.config.js` で `nativewind/preset` を使用し、カラーパレットとフォントを定義
- `apps/native/babel.config.js` で `nativewind/babel` プラグインと `{ jsxImportSource: "nativewind" }` オプションを設定
- `apps/native/global.css` を作成し、Tailwind のディレクティブを記述
- `apps/native/src/index.ts` で `global.css` をインポートしてスタイルを適用
- `dark:` クラスを使用して、ライト/ダークモードのスタイルを宣言的に記述
- 以前の `appStyles.ts` は廃止され、完全に Tailwind CSS クラスによるスタイリングに移行
- `App.tsx` で `nativewind` の `setColorScheme` を呼び出し、アプリ設定と NativeWind のテーマを同期

## Appページ

- `apps/native/src/App.tsx` はナビゲーション設定と認証状態の監視のみを担当し、認証状態に応じて `AuthScreen` / `AppScreen` を切り替える
- `expo-splash-screen` を使用し、認証状態の確定までスプラッシュスクリーンを表示し続ける。フォント読み込みはバックグラウンドで継続し、初回表示を優先する。アイコンは SVG 化（`react-native-svg`）している
- `App.tsx` の Hook 呼び出し順序を固定するため、`isAuthReady` による早期 return は `useCallback` 群の定義後に配置し、初回レンダーと以降のレンダーで Hook 数が変わらないようにしている
- 共有コード画面 `ShareCodeScreen` を追加し、共有コード入力で共有リストの閲覧・追加・編集（テキスト/期限、日付設定ボタンのDate Picker経由）・完了切り替え・並び替え・完了タスク削除・自分のリスト追加に対応
- `ShareCodeScreen` は共有リスト未取得時のタスク配列参照を固定し、状態同期の無限再レンダーを回避
- `AppScreen` はタスクリスト未取得時の配列参照を固定し、依存関係の無限再実行を防止する。あわせて `AppScreenContent` 側の `appStore` 直接購読を廃止し、画面全体での二重購読を解消して再レンダー範囲を縮小している
- `App.tsx` / `AppScreen.tsx` / `SettingsScreen.tsx` / `ShareCodeScreen.tsx` は `useSyncExternalStore` で必要な値のみを選択して購読し、無関係な更新による再レンダーを抑制している
- `useOptimisticReorder` は並び替え中のみ optimistic state を保持し、`task.completed` など通常更新では `initialItems` を直接参照して再レンダーの二重化を抑制している
- `AppScreen` は `appStore` の snapshot 取得関数を安定化し、`Drawer.Screen` のメイン描画関数を固定してドロワー入力中の不要再描画を抑制している
- `TaskListCard` はタスクIDごとの参照マップを事前計算し、`renderItem` の `index` を直接利用してドラッグ・編集時のレンダー負荷を軽減している
- `TaskItem` / `TaskListCard` の主要 props 契約は Web と同名で揃え、`onToggle(task)` / `onDateChange(taskId, date)` を共通シグネチャとして扱う
- `TaskListCard` のミューテーションは `resolveErrorMessage` に統一し、`traceId` や UI 側の計測ログは持たないシンプルな経路に整理している
- `DrawerPanel` はカレンダー表示データ（日付ラベル・色）を事前計算し、`FlatList` / `ReorderableList` の `keyExtractor` / `renderItem` を安定化して描画の再作成を抑制している
- `ShareCodeScreen` / `PasswordResetScreen` のデータ取得系 `useEffect` は言語切替で再フェッチしない依存関係に調整している
- `AppScreen` のカルーセルは、選択中リストと隣接リストのみ `TaskListCard` を描画し、非表示側リストの重い描画を抑制して操作レスポンスを改善している
- `AppScreen` のタスクリスト並び替えは `useOptimisticReorder` と `updateTaskListOrder` の単一経路で処理する
- `password-reset?oobCode=...` のディープリンクを `PasswordResetScreen` にマッピングし、パスワード再設定を実行
- 認証状態の変化時にナビゲーションをリセットし、ログイン時は `AppScreen` に遷移
- `NavigationContainer` + `NativeStack` で画面を構成
- `AppScreen` はドロワーに設定/サインアウト/タスクリスト一覧/タスクリスト作成/リストに参加を集約し、ヘッダー左の menu アイコンボタン（枠線なし、パディング調整）で開閉する。ドロワーヘッダーにはユーザーのメールアドレスを表示し、右には settings / close のアイコンボタンを並べ、設定はドロワー内、閉じるはドロワー表示時のみ操作できる。「リストに参加」は Dialog で共有コードを入力して実行する。
- ドロワー内ヘッダー直下に「カレンダーで確認」ボタンを配置し、モーダルシートで未完了かつ日付付きタスクを月ごとに確認できる。カレンダー領域は `Carousel` で月単位に横スライドし、上部インジケーター操作とスワイプで移動する。`react-native-calendars` は Web 側と同じトーンになるよう日セル（36px角・選択時反転配色・today枠線）と日付ドット（最大3件）をカスタマイズし、日付選択で同日タスクへスクロール、タスクリスト名タップで対象リストへ遷移できる。表示中の月はインデックスではなく `YYYY-MM` の月キーで保持し、再計算時の月ジャンプを防ぐ。共通 `Carousel` は `react-native-pager-view` ベースで index を管理し、`onPageSelected` で確定する。ページ選択時はローカル index と通知先 index を同期し、外部からの index 変更時はページャーへ直接反映して連続スワイプ時の逆戻りを防ぐ。
- 画面幅が広い場合はドロワーの内容を常時表示（`permanent`）し、左にタスクリスト一覧、右にタスクリスト詳細の2カラムで操作する。ドロワー幅は Web と揃えて 360px（モバイルは最大 420px）を基準とし、メインコンテンツの最大幅を 768px に制限することで、ワイド画面での視認性を向上させている。
- Web との見た目整合のため、主要画面の横余白は `px-4`（16px）を基準に統一し、認証系画面は `max-w-[576px]`、タスクリスト/設定/共有コード画面は `max-w-[768px]` で中央寄せにしている。タスクリスト本文の内側余白も 16px を基準値として揃えている。
- タスクリストの選択、作成（ドロワー内のダイアログで名前＋色）、編集（ダイアログ内で名前＋色）、削除、ドロワー内の drag_indicator アイコンボタン（枠線なし、パディング調整）で順序変更に対応。タスクリスト並び替えのハンドルは `onPressIn` 起点で長押し不要とし、`panGesture` のしきい値（`activeOffsetY: [-12, 12]` / `failOffsetX: [-24, 24]`）で誤操作を抑制する。色の選択肢には「なし（テーマカラー）」を含み、`TaskList.background` はカルーセル内の各リスト領域にのみ反映し、背景未設定（`null`）時はテーマ背景色（light: `#F9FAFB` / dark: `#030712`）を使用する
- タスクリストの編集/共有はヘッダー右の edit/share アイコンボタン（枠線なし、パディング調整）からダイアログを開き、名前・色の更新と共有コードの発行/停止を行う。編集ダイアログの色選択でも「なし」を指定して背景色をリセットできる
- タスクリスト詳細はカルーセルで横スワイプ切り替えでき、スワイプ位置と選択中のリストIDを同期する。通常のスワイプ操作はカルーセルを優先し、`Carousel` の `scrollEnabled` は `TaskListCard` から受け取る `onSortingChange` と連動して、タスク並び替え中のみ横スワイプを無効化する。上部インジケーター（ドット）のタップでも切り替え可能
- タスク追加フォームは上部に配置し、入力欄にフォーカスしたときだけ send アイコンボタンをアニメーション表示して追加操作を行う。右側の calendar_today アイコンボタン（枠線なし、パディング調整）からDate Pickerで日付設定、完了切り替え、左端の drag_indicator アイコンボタン（枠線なし、パディング調整）による並び替え、ソート（sort アイコン付き、左寄せ、枠線なし、パディング調整）、完了タスク削除（delete アイコン付き、右寄せ、枠線なし、パディング調整）に対応。タスク並び替えは drag_indicator ハンドル起点のみで開始し、長押しは不要
- タスクのドラッグ並び替えは `onDragStart` / `onDragEnd` で並び替え中フラグのみを管理し、順序更新は `onReorder` の単一経路で実行する。`updateTasksOrder` は通常ドラッグ対象 1 件の `order` のみ更新し、前後ギャップが不足したときだけ再採番する。タスクリスト並び替えも同様に `onReorderTaskList` 単一経路で処理する
- 設定画面でテーマ/言語/追加位置/自動並び替えを更新し、アカウント削除にも対応
- サインアウトはドロワーと設定画面から実行
- 画面文言は `apps/web/src/locales` のキー体系（`auth` / `common` / `taskList` / `pages.*`）を基準にし、native 固有のキーのみを追加して i18next で管理
- `GestureHandlerRootView` でアプリルートをラップし、ドラッグ操作を安定化

## Firebase 設定

- Expo の環境変数として `EXPO_PUBLIC_FIREBASE_*` を設定する
  - `EXPO_PUBLIC_FIREBASE_API_KEY`
  - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
  - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `EXPO_PUBLIC_FIREBASE_APP_ID`
- Auth 永続化は `@react-native-async-storage/async-storage` を使用する

## 実機での確認

- `cd apps/native`
- `npm run dev`（Tunnel固定）
- Expo Go を実機にインストールして QR を読み取り、表示を確認する
- Expo Go 前提のため `EXPO_PROJECT_ID` は不要
- Android 端末は同一ネットワーク上で Expo Go を使用する（USB 接続での確認も可）
- ネットワーク条件の比較検証時は `npm run dev:lan` / `npm run dev:local` を使用する

## 起動速度の運用

- Expo Go の `--tunnel` は接続安定性を優先する代わりに、`--lan` / `--localhost` より起動が遅くなりやすい
- 通常運用は `npm run dev`（Tunnel固定）とし、遅延の切り分け時に `npm run dev:lan` / `npm run dev:local` で比較する
- 起動時間の確認は、コールドスタートで「QR読み取りから初回画面表示まで」を 3 回計測し、平均値で比較する
- 計測時は未認証状態と認証済み状態を分けて確認する

## 主な変更点

- `apps/native/src/App.tsx`: ナビゲーション設定と認証状態の監視（画面固有のロジックは各Screenに移譲）
- `apps/native/src/App.tsx`: 起動時のスプラッシュ解除条件を認証状態の確定に絞り、`AppScreen` / `SettingsScreen` / `ShareCodeScreen` / `PasswordResetScreen` を遅延ロード化
- `apps/native/src/index.ts`: Gesture Handler 初期化および `global.css` のインポート
- `apps/native/babel.config.js`: NativeWind v4 設定 (`jsxImportSource`) および Worklets プラグイン設定
- `apps/native/tailwind.config.js`: NativeWind v4 プリセット (`nativewind/preset`) の設定
- `apps/native/global.css`: NativeWind 用グローバルスタイル定義
- `apps/native/nativewind-env.d.ts`: NativeWind 型定義
- `apps/native/src/screens/AuthScreen.tsx`: 認証画面の UI
- `apps/native/src/screens/AppScreen.tsx`: タスクリスト画面の UI
- `apps/native/src/screens/SettingsScreen.tsx`: 設定画面の UI
- `apps/native/src/screens/ShareCodeScreen.tsx`: 共有コード画面の UI
- `apps/native/src/screens/AppScreen.tsx` / `apps/native/src/screens/SettingsScreen.tsx` / `apps/native/src/screens/ShareCodeScreen.tsx`: `useSyncExternalStore` の snapshot 取得関数を安定化し、購読処理の再生成を抑制
- `apps/native/src/screens/PasswordResetScreen.tsx`: パスワード再設定画面の UI
- `apps/native/src/components/ui/Dialog.tsx`: タスクリスト作成などに使うダイアログの共通UI
- `apps/native/src/components/ui/Carousel.tsx`: タスクリスト表示のカルーセルUI
- `apps/native/src/components/app/TaskListCard.tsx`: タスク操作の共通パネル。タスク参照マップを事前計算し、ドラッグ開始/終了の状態管理（`onDragStart` / `onDragEnd`）と順序更新（`onReorder`）を分離して描画競合を抑制。通常スワイプはカルーセル優先とし、`TaskItem` の drag_indicator ハンドル起点でのみ即時ドラッグを開始する。`onSortingChange` で親へドラッグ状態を通知し、`panGesture` は `activeOffsetY: [-12, 12]` / `failOffsetX: [-24, 24]` を使って縦方向ドラッグの誤発火を抑えつつ、横方向操作はカルーセルへ譲る
- `apps/native/src/components/app/DrawerPanel.tsx`: タスクリスト一覧と作成・参加ダイアログを集約。カレンダー行データの事前計算とリスト描画関数の安定化で再レンダーを抑制し、タスクリスト並び替えも `reorder` 経路へ統一
- `apps/native/src/utils/i18n.ts`: i18next のリソースと初期化
- `apps/native/src/utils/validation.ts`: 入力バリデーション（Web と同一の `validateAuthForm` / `validatePasswordForm`）
- `apps/native/src/utils/errors.ts`: 認証/リセットのエラーメッセージ解決
- `apps/native/src/locales/ja.json`: 日本語リソース
- `apps/native/src/locales/en.json`: 英語リソース
- `apps/native/src/styles/theme.ts`: テーマ定義とリストカラー
- `apps/native/app.json`: `userInterfaceStyle` を `automatic` に変更し、テーマ切替に追従。`scheme` を追加してディープリンクに対応。`orientation` を `default` にして回転に対応
- `apps/native/package.json`: `react-native-screens` を Expo Go に合わせて固定。開発用に `dev:lan` / `dev:local` / `start:lan` / `start:local` を追加
- `package.json`: `react` / `@types/react` を React 19.1.0 と整合する最新の型定義に固定し、`react-native-screens` は Expo Go 互換で固定
