# ネイティブアプリ（apps/native）

## 目的

- Expo を使って最小構成の React Native 環境を用意し、実機での確認をすぐに行える状態にする
- テーマ（ライト/ダーク）と i18next による多言語対応の土台を持つ

## 構成

- `apps/native`: Expo + React Native（TypeScript）
- `i18next` / `react-i18next`: 文字列はすべて i18next で管理
- `@lightlist/sdk`: Firebase 認証の呼び出しは SDK 経由
- React: Expo 依存と揃えて 19.2.1 を利用し、単一バージョンで運用
- テーマ: `useColorScheme` によるライト/ダーク切替
- セーフエリア: `react-native-safe-area-context` による Safe Area 対応

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

- `apps/native/App.tsx`: i18next 初期化、テーマ適用、ログイン画面（SDK 経由でサインイン）
- `apps/native/app.json`: `userInterfaceStyle` を `automatic` に変更し、テーマ切替に追従
- `apps/native/package.json`: React を 19.2.1 に更新
