# Analytics

3 プラットフォームとも Firebase Analytics を使い、イベント名と主要パラメータを揃える。

## 方針

- PII（メールアドレス、共有コード等）はイベント名・パラメータに含めない。
- イベント一覧は helper の定義数ではなく、現行 UI から実際に送信されるものだけを記載する。
- 開発時はデバッグ出力する（Web `console.log` / iOS `print` / Android `Log.d`）。
- Web は Firebase App 初期化済みかつ `firebase/analytics` が利用可能な環境でのみ送信する。

## 例外送信

- `logException(description, fatal)` は `app_exception` を送信する。
- iOS / Android は `app_exception` 送信に加えて Crashlytics へも記録し、未捕捉例外ハンドラを設定する。

## イベント一覧

- 認証: `sign_up` / `login` / `app_sign_out` / `app_delete_account` / `app_password_reset_email_sent` / `app_email_change_requested`
- タスクリスト: `app_task_list_create` / `app_task_list_delete` / `app_task_list_reorder`
- タスク: `app_task_add` / `app_task_update` / `app_task_reorder` / `app_task_sort` / `app_task_delete_completed`
- 共有: `app_share_code_generate` / `app_share_code_remove` / `app_share_code_join` / `share`
- 設定: `app_settings_theme_change` / `app_settings_language_change` / `app_settings_task_insert_position_change` / `app_settings_auto_sort_change`
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
- `app_exception`: `description: string`, `fatal: boolean`
