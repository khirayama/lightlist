# Analytics

## 実装配置

- Web は `apps/web/src/lib/analytics.ts` に集約する。
- iOS は `apps/ios/Lightlist/Sources/ContentView.swift` に集約する。
- Android は `apps/android/app/src/main/java/com/example/lightlist/ContentView.kt` に集約する。
- 3 実装ともイベント名と主要パラメータは揃える。

## 基本動作

- PII はイベント名・パラメータへ含めない。
- このドキュメントのイベント一覧は、helper の定義数ではなく現行 UI から送信されるイベントだけを書く。
- 開発時はデバッグ出力を行う。
  - Web: `console.log("[analytics]", ...)`
  - iOS: `print(...)`
  - Android: `Log.d("analytics", ...)`
- Web は Firebase App が初期化済みで、かつ `firebase/analytics` が利用可能な環境でのみ送信する。
- iOS / Android は Firebase Analytics を直接送信する。

## 例外送信

- Web の `logException(description, fatal)` は `app_exception` を送信する。
- iOS / Android の `logException(description, fatal)` は `app_exception` を送信し、あわせて Crashlytics に記録する。
- iOS は `LightlistApp.swift` で未捕捉例外ハンドラを設定する。
- Android は `MainActivity.kt` で `Thread.setDefaultUncaughtExceptionHandler` を設定する。

## イベント一覧

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

## パラメータ

- `sign_up`, `login`: `method: "email"`
- `app_task_add`: `has_date: boolean`
- `app_task_update`: `fields: string`
- `app_task_delete_completed`: `count: number`
- `share`: `method: "share_code"`, `content_type: "task_list"`
- `app_settings_theme_change`: `theme: "system" | "light" | "dark"`
- `app_settings_language_change`: `language: string`
- `app_settings_task_insert_position_change`: `position: "top" | "bottom"`
- `app_settings_auto_sort_change`: `enabled: boolean`
- `app_exception`: `description: string`, `fatal: boolean`

## すること

- 3 実装でイベント名と主要パラメータを揃える。
- PII を送らない。
- 例外送信は analytics と crash reporting の両方がある実装では両方へ残す。

## しないこと

- メールアドレスや共有コードのような識別情報をイベントパラメータに含めない。
- Web だけ別名イベントに分岐させない。
