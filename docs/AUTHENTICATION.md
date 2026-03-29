# 認証

## 共通仕様

- 認証方式は Firebase Authentication のメールアドレス + パスワード。
- アカウント状態は Firebase Auth のセッションを正とする。
- Web の認証ロジックは `apps/web/src/lib/mutations/auth.ts` に集約する。
- iOS / Android は画面側から Firebase Auth と Firestore を直接呼ぶ。
- iOS / Android の認証 UI は `signin` / `signup` / `reset` の 3 導線を持つ。

## Web の必須環境変数

- Firebase 初期化
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`
- パスワードリセット
  - `NEXT_PUBLIC_PASSWORD_RESET_URL`
- App Check 開発トークン
  - `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN`（localhost で App Check debug token を固定したい場合のみ）

## App Check

- Web は `apps/web/src/lib/firebase.ts` で Firebase App 初期化時に App Check を有効化する。
- Web の provider は `ReCaptchaEnterpriseProvider` を使い、`NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` を必須とする。
- Web の localhost / `127.0.0.1` では `FIREBASE_APPCHECK_DEBUG_TOKEN` を自動設定し、`NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` があればその値を使い、未設定時は debug token 自動発行モードを使う。
- iOS は `LightlistApp.swift` で App Check provider factory を設定し、simulator / Debug では debug provider、本番デバイスでは App Attest 優先・DeviceCheck フォールバックで初期化する。
- Android は `MainActivity.kt` で App Check provider factory を設定し、Debug では debug provider、release では Play Integrity provider を使う。
- Firebase Console 側で Web / iOS / Android app を App Check 登録し、Firestore / Auth の enforcement を有効化する前提とする。

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

## Native のサインアップ

- iOS / Android のサインアップは Firebase Auth ユーザー作成後、Firestore へ初期データを作成する。
- 作成対象
  - `settings/{uid}`
  - `taskLists/{taskListId}`
  - `taskListOrder/{uid}`
- 初期設定は Web と同じく `theme: "system"`、`language: normalizeLanguage(language)`、`taskInsertPosition: "top"`、`autoSort: false` を使う。
- 初期タスクリストは言語別固定名、`tasks: {}`、`history: []`、`shareCode: null`、`background: null`、`memberCount: 1` を使う。

## Native のパスワードリセット

- iOS は Info.plist の `PASSWORD_RESET_URL`、Android は `BuildConfig.PASSWORD_RESET_URL` を使って reset メール送信先 URL を解決する。
- 既定値は `https://lightlist.com/password_reset`。
- iOS / Android の reset メール送信時の言語は現在設定、未取得時は `ja` を使う。
- iOS / Android とも action code を受けた場合は、アプリ内で `verifyPasswordResetCode` と `confirmPasswordReset` を行う。

## Web のメールアドレス変更

- `sendEmailChangeVerification(newEmail)` は `verifyBeforeUpdateEmail()` を使う。
- 認証メールの言語は現在の設定言語、未取得時は `ja`。

## 画面仕様

- Web の認証画面は `apps/web/src/pages/login.tsx`。
- iOS のパスワードリセット deep link は `lightlist://password-reset?oobCode=...` を受け、`ContentView` の full screen cover で新しいパスワード入力画面を表示する。
- iOS の共有コード deep link は `lightlist://sharecodes/CODE` と `https://lightlist.com/sharecodes/CODE` を受け、ログイン後に該当タスクリストを `taskListOrder` へ追加して開く。
- Android の deep link は `lightlist://password-reset?oobCode=...`、`lightlist://sharecodes/CODE`、`https://lightlist.com/sharecodes/CODE`、`https://lightlist.com/password_reset?oobCode=...` を処理する。
- Android の共有コード deep link はログイン後に該当タスクリストを `taskListOrder` へ追加して開く。
- iOS / Android のサインイン画面は、Web と同様に全画面背景の中央へ最大幅約 `480pt/dp` のフォームサーフェスを置く。余白は外周側で確保し、カード背景はフォーム本文だけに付与する。
- タブは `signin` / `signup` / `reset` の 3 つ。
- `email` state はタブ間で共有し、切り替えても保持する。
- iOS の reset 画面は通常導線と deep link 起動の両方で使う。
- Android の reset 画面は通常導線と deep link 起動の両方で使う。

## サポート言語

- `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`
- `fallbackLng` は `ja`

## すること

- 認証まわりの仕様変更時は、Web の env、Native の deep link、初期 Firestore データを同時に見直す。
- パスワードリセット URL は Web / iOS / Android で `https://lightlist.com/password_reset` 系を維持する。
- 認証完了直後に必要な初期ドキュメントは `settings` `taskLists` `taskListOrder` の 3 つを揃える。

## しないこと

- 認証方式をメールアドレス + パスワード以外へ広げた前提で docs を書かない。
- Native の認証ロジックを Web の `@/lib/*` ベースだと説明しない。
- `localhost` を本番のパスワードリセット URL として記載しない。
