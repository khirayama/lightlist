# SDK

## 役割

- `apps/web/src/lib/` は Web UI から Firebase Auth / Firestore の詳細を隠蔽する。
- pages / components は `@/lib/*` を通して認証、設定、タスクリスト、mutation、analytics を使う。
- pages / components から `firebase/*` を直接 import しない。

## 主なモジュール

- `@/lib/firebase`
  - Firebase App / Auth / Firestore 初期化
- `@/lib/session`
  - Firebase Auth セッション購読
- `@/lib/settings`
  - `settings/{uid}` 購読
- `@/lib/taskLists`
  - `taskListOrder/{uid}` と `taskLists/{taskListId}` 購読
  - 共有リスト購読
- `@/lib/mutations/auth`
  - 認証関連 mutation
- `@/lib/mutations/app`
  - 設定、タスクリスト、タスク、共有コード mutation
- `@/lib/analytics`
  - Analytics 送信
- `@/lib/utils/language`
  - 言語正規化、言語方向
- `@/lib/utils/errors`
  - エラー文言解決
- `@/lib/utils/validation`
  - 入力検証
- `@/lib/hooks/useOptimisticReorder`
  - 並び替え UI 補助

## 初期化

- `firebase.ts` が `NEXT_PUBLIC_FIREBASE_*` を直接読んで Firebase App を初期化する。
- Auth は `getAuth()` をキャッシュする。
- Firestore は `initializeFirestore()` を 1 回だけ呼び、永続ローカルキャッシュを有効化する。
- 別途の SDK 初期化呼び出しは不要。

## セッション / 設定 / タスクリスト

- `session.ts` は `onAuthStateChanged()` を購読し、`authStatus` と `user` を `useSyncExternalStore` で公開する。
- `settings.ts` は認証済みユーザーに対して `settings/{uid}` を購読し、`settingsStatus` と `settings` を公開する。
- `taskLists.ts` は認証状態と設定購読の状態に応じて購読を開始する。
- `taskListOrder` 購読と `taskLists` chunk 購読は別々に管理する。
- `taskLists` は 10 件ずつ chunk に分けて購読する。
- `subscribeToSharedTaskList(taskListId)` で共有リストを別管理で購読する。
- 未認証時は通常購読と共有購読を解除する。

## mutation

- `mutations/auth.ts`
  - サインアップ、サインイン、サインアウト
  - パスワードリセット
  - メールアドレス変更確認
  - 退会
- `mutations/app.ts`
  - 設定更新
  - タスクリスト CRUD
  - タスク CRUD
  - 並び替え
  - 共有コード生成 / 削除 / 参加

## 言語

- `DEFAULT_LANGUAGE` は `ja`。
- `SUPPORTED_LANGUAGES` は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。
- `getLanguageDirection()` は `ar` のみ `rtl`、それ以外は `ltr`。
