# SDK

## 役割

- `apps/web/src/lib/` は Firebase 依存とアプリ状態を UI 層から隠蔽します。
- UI 層は `@/lib/*` を通して認証、購読、ミューテーション、分析を呼びます。
- pages / components は `firebase/*` を直接 import しません。

## モジュール構成

- `@/lib/session`
- `@/lib/settings`
- `@/lib/taskLists`
- `@/lib/types`
- `@/lib/icons`
- `@/lib/mutations/auth`
- `@/lib/mutations/app`
- `@/lib/hooks/useOptimisticReorder`
- `@/lib/utils/dateParser`
- `@/lib/utils/language`
- `@/lib/utils/errors`
- `@/lib/utils/validation`
- `@/lib/analytics`

pages / components は `@/lib/firebase` を直接 import しません。認証・設定・タスクリストの購読は `session` / `settings` / `taskLists` を使います。

## Firebase 初期化

- `firebase.ts` が `process.env.NEXT_PUBLIC_FIREBASE_*` を直接読み、Firebase App / Auth / Firestore をキャッシュ付きで初期化します。
- 別途の初期化呼び出し（`initializeSdk()` 等）は不要です。

## runtime state

- `session.ts` が Firebase Auth の `currentUser` と `authStatus` を購読します。
- `settings.ts` が `settings/{uid}` を購読し、UI 向けに `Settings` へ変換します。
- `taskLists.ts` が `taskListOrder/{uid}` と関連 `taskLists/{taskListId}` を購読し、一覧用配列と共有リスト参照を組み立てます。
- `mutations/*` は上記 module の getter から必要な最新スナップショットを参照します。

## 購読

- 認証済みになると `settings/{uid}` と `taskListOrder/{uid}` を購読します。
- `taskListOrder` の内容から対象 `taskLists` を再計算し、10 件ずつ chunk で購読します。
- `taskLists.ts` は `taskListOrder` 購読と taskList chunk 購読を別々に管理します。
- 共有リストは `subscribeToSharedTaskList(taskListId)` で別管理します。
- 未認証になると通常購読と共有購読をすべて解除します。

## mutations

- `mutations/auth.ts`
  - サインアップ / サインイン / サインアウト
  - パスワードリセット / メール変更確認 / アカウント削除
  - Firebase Auth の言語は明示引数があればそれを使い、なければ `settings` スナップショット、最後に `DEFAULT_LANGUAGE` を使います。
- `mutations/app.ts`
  - 設定更新 / タスクリスト CRUD / タスク CRUD / 並び替え / 共有コード生成・削除・参加

## 言語と方向

- `DEFAULT_LANGUAGE` は `ja` です。
- `SUPPORTED_LANGUAGES` は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id` です。
- `getLanguageDirection()` は `ar` のみ `rtl`、それ以外は `ltr` を返します。

## 固定仕様

- `memberCount` はタスクリスト保持者数です。
- `deleteTaskList()` は「一覧から外す」を基本にし、`memberCount` が 0 のときだけ実体を削除します。
- 共有 URL を知っている未認証ユーザーの閲覧・編集を許可する仕様は SDK と Firestore ルールの両方で前提です。
