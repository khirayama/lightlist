# Analytics

3 プラットフォームとも Firebase Analytics を使い、イベント名と主要パラメータを揃える。

## 方針

- PII（メールアドレス、共有コード等）はイベント名・パラメータに含めない。
- イベント一覧は helper の定義数ではなく、現行 UI から実際に送信されるものだけを記載する。
- 開発時はデバッグ出力する（Web `console.log` / iOS `print` / Android `Log.d`）。
- Web は Firebase App 初期化済みかつ `firebase/analytics` が利用可能な環境でのみ送信する。

## 例外送信

- `app_exception` は捕捉済みの非致命例外だけを送信する。`operation` は固定の操作名、`error_category` は Firebase code または例外クラス名に限定する。
- Android は `recordNonFatalException()` で同じ固定情報だけを Crashlytics の non-fatal として記録する。Crashlytics は未捕捉例外を自動収集するため、アプリで default uncaught exception handler を差し替えない。
- 例外 message、ユーザー入力、メールアドレス、共有コード、UID、時刻などの一意値を Analytics / Crashlytics へ送らない。

## イベント一覧

- 認証: `sign_up` / `login` / `app_sign_out` / `app_delete_account` / `app_password_reset_email_sent` / `app_email_change_requested`
- タスクリスト: `app_task_list_create` / `app_task_list_delete` / `app_task_list_reorder`
- タスク: `app_task_add` / `app_task_update` / `app_task_reorder` / `app_task_sort` / `app_task_delete_completed`
- 共有: `app_share_code_generate` / `app_share_code_remove` / `app_share_code_join` / `share`
- 設定: `app_settings_theme_change` / `app_settings_language_change` / `app_settings_task_insert_position_change` / `app_settings_auto_sort_change` / `app_settings_startup_view_change`
- 例外: `app_exception`

## パラメータ

- `sign_up`, `login`: `method: "email"`
- `app_task_add`: `has_date: boolean`
- `app_task_update`: `fields: string`（ピン留め切替は `fields: "pinned"`）
- `app_task_delete_completed`: `count: number`
- `share`: `method: "share_code"`, `content_type: "task_list"`
- `app_settings_theme_change`: `theme: "system" | "light" | "dark"`
- `app_settings_language_change`: `language: string`
- `app_settings_task_insert_position_change`: `position: "top" | "bottom"`
- `app_settings_auto_sort_change`: `enabled: boolean`
- `app_settings_startup_view_change`: `view: "taskList" | "calendar" | "taskLists"`
- `app_exception`: `operation: string`, `error_category?: string`
