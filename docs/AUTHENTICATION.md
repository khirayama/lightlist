# 認証

## 共通仕様

- 認証方式は Firebase Authentication のメールアドレス + パスワード。
- アカウント状態は Firebase Auth のセッションを正とする。
- Web の認証ロジックは `apps/web/src/lib/mutations/auth.ts` に集約する。
- iOS / Android は現在の実装では画面側から Firebase Auth を直接呼ぶ。

## Web の必須環境変数

- Firebase 初期化
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- パスワードリセット
  - `NEXT_PUBLIC_PASSWORD_RESET_URL`

## Web のサインアップ

- `signUp(email, password, language)` は Firebase Auth のユーザー作成後、Firestore へ初期データを batch で作成する。
- 作成対象
  - `settings/{uid}`
  - `taskLists/{taskListId}`
  - `taskListOrder/{uid}`
- 初期設定
  - `theme: "system"`
  - `language: normalizeLanguage(language)`
  - `taskInsertPosition: "top"`
  - `autoSort: false`
- 初期タスクリスト
  - 言語別の固定名を使う。
  - `tasks: {}`
  - `history: []`
  - `shareCode: null`
  - `background: null`
  - `memberCount: 1`

## Web のサインイン / サインアウト / 退会

- `signIn()` は `signInWithEmailAndPassword()` を使う。
- `signOut()` は Firebase Auth のセッションを破棄する。
- `deleteAccount()` は次の順で処理する。
  - `taskListOrder/{uid}` から所属リストを列挙する。
  - 各 `taskListId` に対して `deleteTaskList()` を呼ぶ。
  - `settings/{uid}` と `taskListOrder/{uid}` を削除する。
  - Firebase Auth のユーザーを削除する。

## Web のパスワードリセット

- リセットメール送信は `sendPasswordResetEmail(email, language?)` を使う。
- `ActionCodeSettings` は `url: NEXT_PUBLIC_PASSWORD_RESET_URL`、`handleCodeInApp: false`。
- メール送信時の言語は、明示引数、現在設定、`ja` の順で解決する。
- コード検証は `verifyPasswordResetCode(code)`、確定は `confirmPasswordReset(code, newPassword)`。
- `apps/web/src/pages/password_reset.tsx` は `oobCode` を検証し、成功時は 2 秒後に `/` へ遷移する。

## Web のメールアドレス変更

- `sendEmailChangeVerification(newEmail)` は `verifyBeforeUpdateEmail()` を使う。
- 認証メールの言語は現在の設定言語、未取得時は `ja`。

## 画面仕様

- Web の認証画面は `apps/web/src/pages/login.tsx`。
- タブは `signin` / `signup` / `reset` の 3 つ。
- `email` state はタブ間で共有し、切り替えても保持する。
- iOS / Android の現在 UI はサインイン画面を持つ。ネイティブ UI にサインアップ / パスワードリセット画面は実装していない。

## サポート言語

- `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`
- `fallbackLng` は `ja`
