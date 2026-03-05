# Analytics & Crashlytics

## 概要と設計方針

Firebase Analytics と Firebase Crashlytics を使ってユーザー行動とエラーを計測する。

実装詳細は `packages/sdk` に隠蔽し、apps 側は `@lightlist/sdk/analytics` 経由で利用する。PII（タスク名・リスト名・ユーザーID 等）はパラメータに含めない。

## 実装アーキテクチャ

```
packages/sdk/src/analytics/
  index.ts          - Web 実装 (firebase/analytics)
  index.native.ts   - Native 実装 (@react-native-firebase + Expo Go 条件分岐)
```

`package.json` の exports:

```json
"./analytics": {
  "react-native": "./src/analytics/index.native.ts",
  "default": "./src/analytics/index.ts"
}
```

apps 側の利用:

```ts
import { logTaskAdd, logException } from "@lightlist/sdk/analytics";
```

### Native の Expo Go 判定

`Constants.executionEnvironment === "storeClient"` で Expo Go を判定し、Expo Go 時はログ出力のみ行う。Development Build / 本番では `@react-native-firebase/analytics` と `@react-native-firebase/crashlytics` を実際に呼ぶ。

### Web の Crashlytics 代替

Web に Crashlytics はないため、`app_exception` イベントを Analytics に記録する形で代替する。`_app.tsx` の `window.onerror` / `unhandledrejection` と `ErrorBoundary.componentDidCatch` から呼ぶ。

## イベント一覧

| イベント名 | トリガー | パラメータ |
|---|---|---|
| `sign_up` | サインアップ成功 | `method: "email"` |
| `login` | サインイン成功 | `method: "email"` |
| `app_sign_out` | サインアウト成功 | なし |
| `app_delete_account` | アカウント削除成功 | なし |
| `app_password_reset_email_sent` | パスワードリセットメール送信成功 | なし |
| `app_email_change_requested` | メールアドレス変更リクエスト成功 | なし |
| `app_task_list_create` | タスクリスト作成成功 | なし |
| `app_task_list_delete` | タスクリスト削除成功 | なし |
| `app_task_list_reorder` | タスクリスト並び替え成功 | なし |
| `app_task_add` | タスク追加成功 | `has_date: boolean` |
| `app_task_update` | タスク更新成功 | `fields: string`（例: `"completed,date"`） |
| `app_task_delete` | タスク削除成功 | なし |
| `app_task_reorder` | タスク並び替え成功 | なし |
| `app_task_sort` | タスク手動ソート成功 | なし |
| `app_task_delete_completed` | 完了タスク一括削除成功 | `count: number` |
| `app_share_code_generate` | 共有コード生成成功 | なし |
| `app_share_code_remove` | 共有コード削除成功 | なし |
| `app_share_code_join` | 共有リスト参加成功 | なし |
| `share` | 共有ページ表示成功 | `method: "share_code"`, `content_type: "task_list"` |
| `app_settings_theme_change` | テーマ変更成功 | `theme: "system" \| "light" \| "dark"` |
| `app_settings_language_change` | 言語変更成功 | `language: string` |
| `app_settings_task_insert_position_change` | 挿入位置変更成功 | `position: "top" \| "bottom"` |
| `app_settings_auto_sort_change` | 自動ソート変更成功 | `enabled: boolean` |
| `app_exception` | ErrorBoundary / window.onerror | `description: string`, `fatal: boolean` |

## Web セットアップ手順

`.env.local` / `.env.prod` に追加:

```
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

Firebase Console で Analytics を有効化し、Measurement ID を取得する。

## Native セットアップ手順

1. Firebase Console から `google-services.json`（Android）と `GoogleService-Info.plist`（iOS）を取得し、`apps/native/` に配置する。
2. `@react-native-firebase/app`, `analytics`, `crashlytics` は `packages/sdk/dependencies` に含まれており、`apps/native` への追加は不要。
3. Expo Go での動作確認はログ出力のみ。Development Build または本番ビルドで Firebase Console の DebugView を使って確認する。

### DebugView 確認方法

- **Web**: `?firebase_analytics_debug=1` クエリパラメータを付与してアクセスし、Firebase Console の DebugView でイベントを確認する。
- **Native (Development Build)**: Firebase Console の DebugView でデバイスを選択し確認する。
