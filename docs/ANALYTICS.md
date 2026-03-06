# Analytics

## 構成

- 実装は `packages/sdk/src/analytics/` に集約します。
- apps 側は `@lightlist/sdk/analytics` だけを import します。
- PII はイベント名にもパラメータにも含めません。
- イベント API の定義は `shared.ts` に集約し、platform ごとの差分は adapter だけに閉じ込めます。

## プラットフォーム別実装

- Web
  - `firebase/analytics` を使います。
  - 開発時は `console.log` にも出します。
  - 例外は `app_exception` を Analytics へ送ります。
- Native
  - Expo Go では `console.log` / `console.error` のみです。
  - Development Build / 本番では `@react-native-firebase/analytics` と `@react-native-firebase/crashlytics` を使います。
  - `logException()` は Crashlytics に `recordError()` します。

## 主なイベント

- 認証
  - `sign_up`
  - `login`
  - `app_sign_out`
  - `app_delete_account`
  - `app_password_reset_email_sent`
  - `app_email_change_requested`
- タスクリスト
  - `app_task_list_create`
  - `app_task_list_delete`
  - `app_task_list_reorder`
- タスク
  - `app_task_add`
  - `app_task_update`
  - `app_task_delete`
  - `app_task_reorder`
  - `app_task_sort`
  - `app_task_delete_completed`
- 共有
  - `app_share_code_generate`
  - `app_share_code_remove`
  - `app_share_code_join`
  - `share`
- 設定
  - `app_settings_theme_change`
  - `app_settings_language_change`
  - `app_settings_task_insert_position_change`
  - `app_settings_auto_sort_change`
- 例外
  - `app_exception`

## 環境変数

- Web で Analytics を有効にするには `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` が必要です。

## 補足

- Native の Firebase plugin は `app` と `crashlytics` のみ設定します。
- `analytics` は Expo plugin を持たないため `app.config.ts` の `plugins` へ追加しません。
