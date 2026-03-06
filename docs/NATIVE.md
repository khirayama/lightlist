# Native

## 構成

- `apps/native` は Expo + React Native + NativeWind です。
- 画面は次の 5 つです。
  - `Auth`
  - `App`
  - `Settings`
  - `ShareCode`
  - `PasswordReset`
- データ取得と更新は SDK 経由です。

## 起動

- ルートは [App.tsx](/home/khirayama/Works/lightlist-poc/apps/native/src/App.tsx) です。
- `expo-splash-screen` を使い、認証状態確定とルートレイアウト完了までネイティブスプラッシュを維持します。
- その後の待機表示は `StartupSplash` を使います。
- `Auth` と `TaskList` のどちらを初期画面にするかは認証状態で切り替えます。

## ナビゲーション

- `NavigationContainer` + `NativeStack` を使います。
- `PasswordReset` と `ShareCode` は認証状態に関係なく遷移可能です。
- パスワードリセットの deep link は `password-reset` です。
- scheme は `APP_ENV` に応じて次を使います。
  - production: `lightlist`
  - staging: `lightlist-staging`
  - development: `lightlist-dev`

## テーマと言語

- テーマ設定は `nativewind` の `setColorScheme()` に同期します。
- i18n の `fallbackLng` は `ja` です。
- 言語方向は `settings.language` から `getLanguageDirection()` で求めます。
- `I18nManager` は使いません。
- `uiDirection` を `NavigationContainer`、`SafeAreaView`、`AppDirectionProvider` に渡して統一します。

## カルーセル

- 共通カルーセルは [Carousel.tsx](/home/khirayama/Works/lightlist-poc/apps/native/src/components/ui/Carousel.tsx) です。
- 実装は `react-native-pager-view` です。
- `index` / `onIndexChange` の controlled API を前提にします。
- `uiDirection` が変わると `PagerView` を再マウントし、`setPageWithoutAnimation(currentIndex)` で再同期します。
- タスク並び替え中だけ `scrollEnabled` を止めます。

## 主要画面

- `Auth`
  - sign in / sign up / password reset を切り替えます。
- `App`
  - タスクリスト一覧、選択、並び替え、作成、参加、設定導線を持ちます。
- `Settings`
  - 言語、テーマ、追加位置、自動ソート、メール変更、サインアウト、アカウント削除を持ちます。
- `ShareCode`
  - 共有コード入力、共有リスト閲覧、自分の一覧への追加を持ちます。
- `PasswordReset`
  - `oobCode` を受け取り、パスワード再設定を実行します。

## 必須環境変数

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_PASSWORD_RESET_URL`

## Expo 設定

- [app.config.ts](/home/khirayama/Works/lightlist-poc/apps/native/app.config.ts) で `APP_ENV` に応じて app name、bundle id、scheme を切り替えます。
- Firebase plugin は次だけを `plugins` に入れます。
  - `@react-native-firebase/app`
  - `@react-native-firebase/crashlytics`
- `@react-native-firebase/analytics` は plugin を持たないため追加しません。

## やらないこと

- React Native Web 対応はしません。Web は `apps/web` が正です。
- RTL 切り替えのためのアプリ再起動は行いません。
