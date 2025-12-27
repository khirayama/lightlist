# ネイティブアプリ（apps/native）

## 目的

- Expo を使って最小構成の React Native 環境を用意し、実機での確認をすぐに行える状態にする
- テーマ（ライト/ダーク）と i18next による多言語対応の土台を持つ

## 構成

- `apps/native`: Expo + React Native（TypeScript）
- `i18next` / `react-i18next`: 文字列はすべて i18next で管理
- `@react-navigation/native` / `@react-navigation/native-stack`: 認証/タスクリスト/設定画面のルーティング
- `react-native-screens`: Expo Go に合わせたバージョン固定でネイティブスタックを安定化
- 依存解決: ルート `package.json` の `overrides` で Expo Go と整合するバージョンに固定
- `@lightlist/sdk`: Firebase 認証の呼び出しは SDK 経由
- React: モノレポ全体で 19.1.0 に統一し、Expo Go の renderer と整合させる
- テーマ: `useColorScheme` によるライト/ダーク切替
- セーフエリア: `react-native-safe-area-context` による Safe Area 対応
- i18n 初期化: `apps/native/i18n.ts` に集約
- テーマ定義: `apps/native/theme.ts` に集約
- 画面: `apps/native/screens` に `AuthScreen` / `TaskListScreen` / `SettingsScreen` / `ShareCodeScreen` / `PasswordResetScreen` を配置
- UIコンポーネント: `apps/native/components/Dialog.tsx` にダイアログの共通UIを集約
- スタイル: `apps/native/appStyles.ts` で画面共通のスタイルを管理

## Appページ

- `App.tsx` で認証状態に応じて `AuthScreen` / `TaskListScreen` を切り替え、ログイン時は `SettingsScreen` もスタックに追加
- 共有コード画面 `ShareCodeScreen` を追加し、共有コード入力で共有リストの閲覧・追加・編集（テキスト/期限）・完了切り替え・並び替え・完了タスク削除・自分のリスト追加に対応
- `password-reset?oobCode=...` のディープリンクを `PasswordResetScreen` にマッピングし、パスワード再設定を実行
- 認証状態の変化時にナビゲーションをリセットし、ログイン時は `TaskListScreen` に遷移
- `NavigationContainer` + `NativeStack` で画面を構成
- タスクリストの選択、作成（ダイアログ内で名前＋色）、編集（名前＋色）、削除、順序変更に対応
- タスクリストの共有コード発行/停止に対応
- タスクの追加、編集（テキスト/期限）、完了切り替え、削除、並び替え、ソート、完了タスク削除に対応
- 設定画面でテーマ/言語/追加位置/自動並び替えを更新し、アカウント削除にも対応
- サインアウトはヘッダーと設定画面から実行
- 画面文言は `app` / `taskList` / `settings` / `pages.tasklist` を中心に i18next で管理

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

- `apps/native/App.tsx`: アプリ状態と画面切替、SDK 経由の認証/データ操作
- `apps/native/screens/AuthScreen.tsx`: 認証画面の UI
- `apps/native/screens/TaskListScreen.tsx`: タスクリスト画面の UI
- `apps/native/screens/SettingsScreen.tsx`: 設定画面の UI
- `apps/native/screens/ShareCodeScreen.tsx`: 共有コード画面の UI
- `apps/native/screens/PasswordResetScreen.tsx`: パスワード再設定画面の UI
- `apps/native/components/Dialog.tsx`: タスクリスト作成などに使うダイアログの共通UI
- `apps/native/appStyles.ts`: 共有スタイル
- `apps/native/i18n.ts`: i18next のリソースと初期化
- `apps/native/theme.ts`: テーマ定義とリストカラー
- `apps/native/app.json`: `userInterfaceStyle` を `automatic` に変更し、テーマ切替に追従。`scheme` を追加してディープリンクに対応
- `apps/native/package.json`: `react-native-screens` を Expo Go に合わせて固定
- `package.json`: `react` / `react-dom` / `@types/react` / `@types/react-dom` / `react-native-screens` を Expo Go 互換で固定
