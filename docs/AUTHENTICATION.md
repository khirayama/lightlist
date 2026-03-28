# 認証

## 概要

- 認証方式は Firebase Authentication のメールアドレス + パスワードです。
- 認証 API は `apps/web/src/lib/mutations/auth.ts` に集約します。
- サインアップ時は認証作成に加えて、`settings`、初期タスクリスト、`taskListOrder` を同時に作成します。

## 必須環境変数

- Firebase 初期化
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- パスワードリセット
  - `NEXT_PUBLIC_PASSWORD_RESET_URL`
  - 未設定時は `sendPasswordResetEmail()` がエラーを投げます。
  - 本番設定で `localhost` は使いません。

Web の環境変数は Next.js 標準の `.env.production` / `.env.production.local` または deploy 環境変数で供給します。build/start 前に `.env` をコピーしません。

`sendPasswordResetEmail()` は Firebase Auth の `ActionCodeSettings.url` に上記 URL を渡し、`handleCodeInApp` は `false` です。URL のドメインは Firebase 側で許可されている前提です。

## サインアップ

- `signUp(email, password, language)` は Firebase Auth のユーザー作成後、次のデータを batch で作成します。
  - `settings/{uid}`
  - `taskLists/{taskListId}`
  - `taskListOrder/{uid}`
- 初期設定の固定値
  - `theme: "system"`
  - `language: normalizeLanguage(language)`
  - `taskInsertPosition: "top"`
  - `autoSort: false`
- 初期タスクリスト
  - 言語ごとに既定名を持ちます。
  - `shareCode: null`
  - `background: null`
  - `memberCount: 1`

## サインイン / サインアウト / アカウント削除

- `signIn()` は Firebase Auth のメールログインです。
- Android は Firebase Auth の代表的な例外コード（`invalid credential`、`user not found`、`requires recent login` など）を locale JSON の翻訳キーへ変換し、生の SDK 英語メッセージはそのまま表示しません。
- `signOut()` は Firebase Auth のセッションを破棄します。
- `deleteAccount()` は次の順で処理します。
  - `taskListOrder/{uid}` から所属リストを列挙
  - 各リストに対して `deleteTaskList()` を実行
  - `settings/{uid}` と `taskListOrder/{uid}` を削除
  - Firebase Auth のユーザーを削除

## パスワードリセット

- リセットメール送信は `sendPasswordResetEmail(email, language?)` を使います。
- メール言語は `language`、未指定時は `appStore.settings.language`、それもなければ `ja` を使います。
- コード検証は `verifyPasswordResetCode(code)`、確定は `confirmPasswordReset(code, newPassword)` です。
- Web は [password_reset.tsx](/home/khirayama/Works/lightlist-poc/apps/web/src/pages/password_reset.tsx) で `oobCode` を検証し、成功後 2 秒後に `/` へ戻します。

## メールアドレス変更

- 設定画面から `sendEmailChangeVerification(newEmail)` を呼びます。
- 実体は `verifyBeforeUpdateEmail()` です。
- 言語は現在の `settings.language` を使います。

## Web

- 認証画面は [login.tsx](/home/khirayama/Works/lightlist-poc/apps/web/src/pages/login.tsx) です。
- タブは sign in / sign up / password reset の 3 つです。
- メール入力はタブごとに分離せず共通 state で保持するため、タブ切替で保持されます。
- `/app` と `/settings` は認証状態が `loading` のまま 10 秒続いた場合 `/` に戻します。

## 固定仕様

- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id` です。
- `fallbackLng` は `ja` です。
- ブランド名とパスワード伏字以外の文言は locale JSON で管理します。
