# SDK

## 役割

- `packages/sdk` は Firebase 依存とアプリ状態を Web / Native から隠蔽します。
- UI 層は `@lightlist/sdk/*` を通して認証、購読、ミューテーション、分析を呼びます。
- apps は `firebase/*` と `@lightlist/sdk/firebase` を import しません。

## exports

- `@lightlist/sdk/session`
- `@lightlist/sdk/settings`
- `@lightlist/sdk/taskLists`
- `@lightlist/sdk/types`
- `@lightlist/sdk/mutations/auth`
- `@lightlist/sdk/mutations/app`
- `@lightlist/sdk/hooks/useOptimisticReorder`
- `@lightlist/sdk/utils/dateParser`
- `@lightlist/sdk/utils/language`
- `@lightlist/sdk/utils/errors`
- `@lightlist/sdk/utils/validation`
- `@lightlist/sdk/analytics`

apps は `@lightlist/sdk/store` を直接 import しません。認証・設定・タスクリストの購読は `session` / `settings` / `taskLists` を使います。

## 依存関係

- `react` は `peerDependencies` です。
- SDK は `react-dom` を持ちません。
- Firebase 関連は SDK 側の依存です。
- apps は Firebase の初期化済みインスタンスや Firebase SDK 型へ直接依存しません。
- SDK は `src` を `dist` へ build してから apps に配布します。
- `packages/sdk/tsconfig.json` は `**/*.native.ts` を除外し、Web の型チェック時に Native 専用モジュールを読まない構成です。

## build

- `npm run build` は `packages/sdk/tsconfig.build.json` を使って `dist/` を生成します。
- `npm run dev` は `tsc --watch` で `dist/` を更新し続けます。
- `package.json` の subpath exports は `dist` を向きます。
- apps は起動エントリで `@lightlist/sdk/config` の `initializeSdk()` を呼び、Firebase 設定と password reset URL を SDK へ渡します。

## Firebase 初期化

- SDK 内部の Firebase 初期化は platform ごとに分かれます。
- Web は [index.ts](/home/khirayama/Works/lightlist-poc/packages/sdk/src/firebase/index.ts) を使います。
- Native は [index.native.ts](/home/khirayama/Works/lightlist-poc/packages/sdk/src/firebase/index.native.ts) を使います。
- Firebase 必須環境変数と password reset URL の解決は [env.ts](/home/khirayama/Works/lightlist-poc/packages/sdk/src/utils/env.ts) に集約します。
- Native Auth 永続化は `@react-native-async-storage/async-storage` を使います。

## runtime state

- `session.ts` が Firebase Auth の `currentUser` と `authStatus` を購読します。
- `settings.ts` が `settings/{uid}` を購読し、UI 向けに `Settings` へ変換します。
- `taskLists.ts` が `taskListOrder/{uid}` と関連 `taskLists/{taskListId}` を購読し、一覧用配列と共有リスト参照を組み立てます。
- `taskLists.ts` のセッション切替時の初期化、通常リストの購読対象入れ替え、共有リストの単体更新は同じ内部 state を更新します。
- `mutations/*` は上記 module の getter から必要な最新スナップショットを参照します。
- runtime state は feature 単位に分かれていますが、apps からは各 module の hook / getter だけを使います。

## 購読

- 認証済みになると `settings/{uid}` と `taskListOrder/{uid}` を購読します。
- `taskListOrder` の内容から対象 `taskLists` を再計算し、10 件ずつ chunk で購読します。
- apps は `session` / `settings` / `taskLists` の hook・getter を通して購読結果を参照します。
- `taskLists.ts` は `taskListOrder` 購読と taskList chunk 購読を別々に管理します。
- 共有リストは `subscribeToSharedTaskList(taskListId)` で別管理します。
- 未認証になると通常購読と共有購読をすべて解除します。

## mutations

- `mutations/auth.ts`
  - サインアップ
  - サインイン
  - サインアウト
  - パスワードリセット
  - メール変更確認
  - アカウント削除
  - Firebase Auth の言語は明示引数があればそれを使い、なければ `settings` スナップショット、最後に `DEFAULT_LANGUAGE` を使います。
- `mutations/app.ts`
  - 設定更新
  - タスクリスト CRUD
  - タスク CRUD
  - 並び替え
  - 共有コード生成・削除・参加

## 言語と方向

- `DEFAULT_LANGUAGE` は `ja` です。
- `SUPPORTED_LANGUAGES` は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id` です。
- `getLanguageDirection()` は `ar` のみ `rtl`、それ以外は `ltr` を返します。

## 固定仕様

- `memberCount` はタスクリスト保持者数です。
- `deleteTaskList()` は「一覧から外す」を基本にし、`memberCount` が 0 のときだけ実体を削除します。
- 共有 URL を知っている未認証ユーザーの閲覧・編集を許可する仕様は SDK と Firestore ルールの両方で前提です。
