# ネイティブアプリ（apps/native）

## 目的

- Expo を使って最小構成の React Native 環境を用意し、実機での確認をすぐに行える状態にする
- テーマ（ライト/ダーク）と i18next による多言語対応の土台を持つ

## 構成

- `apps/native`: Expo + React Native（TypeScript）
- `i18next` / `react-i18next`: 文字列はすべて i18next で管理
- `@react-navigation/native` / `@react-navigation/native-stack`: 認証/タスクリスト/設定画面のルーティング
- `react-native-gesture-handler`: ドラッグ操作を含むジェスチャの基盤
- `react-native-reanimated` / `react-native-worklets`: ドラッグ操作のアニメーション基盤
- `react-native-draggable-flatlist`: タスクのドラッグ並び替え
- `react-native-reanimated-carousel`: タスクリストの横スワイプ切り替え
- `@react-native-community/datetimepicker`: タスクの日付設定用Date Picker
- `react-native-svg`: SVGアイコンの描画
- `expo-splash-screen`: 認証状態の確定までのスプラッシュスクリーン制御
- `react-native-screens`: Expo Go に合わせたバージョン固定でネイティブスタックを安定化
- 依存解決: ルート `package.json` の `overrides` で Expo Go と整合するバージョンに固定
- `@lightlist/sdk`: Firebase 認証の呼び出しは SDK 経由
- React: モノレポ全体で 19.1.0 に統一し、Expo Go の renderer と整合させる
- テーマ: `useColorScheme` によるライト/ダーク切替
- セーフエリア: `react-native-safe-area-context` による Safe Area 対応
- i18n 初期化: `apps/native/src/utils/i18n.ts` に集約
- 翻訳リソース: `apps/native/src/locales/ja.json` / `apps/native/src/locales/en.json`
- テーマ定義: `apps/native/src/styles/theme.ts` に集約
- 画面: `apps/native/src/screens` に `AuthScreen` / `AppScreen` / `SettingsScreen` / `ShareCodeScreen` / `PasswordResetScreen` を配置
- UIコンポーネント: `apps/native/src/components/ui/Dialog.tsx` に作成/編集用ダイアログの共通UIを集約
- appコンポーネント: `apps/native/src/components/app/TaskListPanel.tsx` を `AppScreen` / `ShareCodeScreen` で共通利用し、タスク追加/編集/並び替え/完了/完了削除の操作UIを集約（ヘッダーやリスト選択は画面側で管理）。`apps/native/src/components/app/AppDrawerContent.tsx` はタスクリスト一覧と作成・参加ダイアログを集約
- バリデーション/エラーハンドリング: `apps/native/src/utils/validation.ts` / `apps/native/src/utils/errors.ts` に集約
- スタイル: `apps/native/src/styles/appStyles.ts` で画面共通のスタイルを管理

## Appページ

- `apps/native/src/App.tsx` で認証状態に応じて `AuthScreen` / `AppScreen` を切り替え、ログイン時は `SettingsScreen` もスタックに追加
- `expo-splash-screen` を使用し、認証状態の確定が完了するまでスプラッシュスクリーンを表示し続けることで、起動時の画面のちらつきを防止。アイコンは SVG 化（`react-native-svg`）されており、フォントのロード待ちを排除している
- 共有コード画面 `ShareCodeScreen` を追加し、共有コード入力で共有リストの閲覧・追加・編集（テキスト/期限、日付設定ボタンのDate Picker経由）・完了切り替え・並び替え・完了タスク削除・自分のリスト追加に対応
- `ShareCodeScreen` は共有リスト未取得時のタスク配列参照を固定し、状態同期の無限再レンダーを回避
- `AppScreen` はタスクリスト未取得時の配列参照を固定し、依存関係の無限再実行を防止
- `password-reset?oobCode=...` のディープリンクを `PasswordResetScreen` にマッピングし、パスワード再設定を実行
- 認証状態の変化時にナビゲーションをリセットし、ログイン時は `AppScreen` に遷移
- `NavigationContainer` + `NativeStack` で画面を構成
- `AppScreen` はドロワーに設定/サインアウト/タスクリスト一覧/タスクリスト作成/リストに参加を集約し、ヘッダー左の menu アイコンボタン（枠線なし、パディング調整）で開閉する。ドロワーヘッダーにはユーザーのメールアドレスを表示し、右には settings / close のアイコンボタンを並べ、設定はドロワー内、閉じるはドロワー表示時のみ操作できる。「リストに参加」は Dialog で共有コードを入力して実行する。
- 画面幅が広い場合はドロワーの内容を常時表示（`permanent`）し、左にタスクリスト一覧、右にタスクリスト詳細の2カラムで操作する。ドロワー幅は Web と揃えて 360px（モバイルは最大 420px）を基準とし、メインコンテンツの最大幅を 768px に制限することで、ワイド画面での視認性を向上させている。
- タスクリストの選択、作成（ドロワー内のダイアログで名前＋色）、編集（ダイアログ内で名前＋色）、削除、ドロワー内の drag_indicator アイコンボタン（枠線なし、パディング調整）で順序変更に対応。色の選択肢には「なし（テーマカラー）」を含み、背景色が設定されている場合は画面全体およびカルーセル内の各リストの背景に反映される
- タスクリストの編集/共有はヘッダー右の edit/share アイコンボタン（枠線なし、パディング調整）からダイアログを開き、名前・色の更新と共有コードの発行/停止を行う。編集ダイアログの色選択でも「なし」を指定して背景色をリセットできる
- タスクリスト詳細はカルーセルで横スワイプ切り替えでき、スワイプ位置と選択中のリストIDを同期する。判定を緩く（`minScrollDistancePerSwipe: 10`, `activeOffsetX: [-8, 8]`）設定し、軽いスワイプでも隣のリストへ遷移しやすく調整している。並び替えハンドルのタッチ中のみ横スワイプを停止し、それ以外は横スワイプ優先で操作する。タスクリストのドラッグ操作は `activationDistance` を設定し、横スワイプ時にリストのジェスチャが先に反応しないよう調整する。上部にインジケーター（ドット）を表示し、現在のリスト位置を可視化・タップで切り替え可能
- タスク追加フォームは上部に配置し、入力欄と send アイコンボタンで追加する。右側の calendar_today アイコンボタン（枠線なし、パディング調整）からDate Pickerで日付設定、完了切り替え、左端の drag_indicator アイコンボタン（枠線なし、パディング調整）による並び替え、ソート（sort アイコン付き、左寄せ、枠線なし、パディング調整）、完了タスク削除（delete アイコン付き、右寄せ、枠線なし、パディング調整）に対応
- 設定画面でテーマ/言語/追加位置/自動並び替えを更新し、アカウント削除にも対応
- サインアウトはドロワーと設定画面から実行
- 画面文言は `app` / `taskList` / `settings` / `pages.tasklist` を中心に i18next で管理
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
- `npm run dev`
- Expo Go を実機にインストールして QR を読み取り、表示を確認する
- Android 端末は同一ネットワーク上で Expo Go を使用する（USB 接続での確認も可）

## 主な変更点

- `apps/native/src/App.tsx`: アプリ状態と画面切替、SDK 経由の認証/データ操作
- `apps/native/src/index.ts`: Gesture Handler 初期化
- `apps/native/babel.config.js`: Worklets プラグイン設定
- `apps/native/src/screens/AuthScreen.tsx`: 認証画面の UI
- `apps/native/src/screens/AppScreen.tsx`: タスクリスト画面の UI
- `apps/native/src/screens/SettingsScreen.tsx`: 設定画面の UI
- `apps/native/src/screens/ShareCodeScreen.tsx`: 共有コード画面の UI
- `apps/native/src/screens/PasswordResetScreen.tsx`: パスワード再設定画面の UI
- `apps/native/src/components/ui/Dialog.tsx`: タスクリスト作成などに使うダイアログの共通UI
- `apps/native/src/components/ui/Carousel.tsx`: タスクリスト表示のカルーセルUI
- `apps/native/src/components/app/TaskListPanel.tsx`: タスク操作の共通パネル
- `apps/native/src/components/app/AppDrawerContent.tsx`: タスクリスト一覧と作成・参加ダイアログを集約
- `apps/native/src/styles/appStyles.ts`: 共有スタイル
- `apps/native/src/utils/i18n.ts`: i18next のリソースと初期化
- `apps/native/src/utils/validation.ts`: 入力バリデーション
- `apps/native/src/utils/errors.ts`: 認証/リセットのエラーメッセージ解決
- `apps/native/src/locales/ja.json`: 日本語リソース
- `apps/native/src/locales/en.json`: 英語リソース
- `apps/native/src/styles/theme.ts`: テーマ定義とリストカラー
- `apps/native/app.json`: `userInterfaceStyle` を `automatic` に変更し、テーマ切替に追従。`scheme` を追加してディープリンクに対応。`orientation` を `default` にして回転に対応
- `apps/native/package.json`: `react-native-screens` を Expo Go に合わせて固定
- `package.json`: `react` / `react-dom` / `@types/react` / `@types/react-dom` / `react-native-screens` を Expo Go 互換で固定
