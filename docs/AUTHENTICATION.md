# 認証

## 共通仕様

- 認証方式は Firebase Authentication のメールアドレス + パスワード。
- アカウント状態は Firebase Auth のセッションを正とする。
- Web の認証状態、settings 購読、taskList 購読は `apps/web/src/entry.tsx` の `AppStateProvider` と関連 hook に集約する。
- iOS / Android は画面側から Firebase Auth と Firestore を直接呼ぶ。
- iOS / Android の認証 UI は `signin` / `signup` / `reset` の 3 導線を持ち、認証前でも言語切替を行える。

## Web の必須環境変数

- Firebase 初期化
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_APPCHECK_SITE_KEY`
- パスワードリセット
  - `VITE_PASSWORD_RESET_URL`
- App Check 開発トークン
  - `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`（localhost で App Check debug token を固定したい場合のみ）

## Cloudflare Pages 配信時の前提

- Firebase Authentication の authorized domains には Cloudflare Pages の `*.pages.dev` または運用 custom domain を追加する。
- `VITE_PASSWORD_RESET_URL` は Cloudflare Pages で実際に配信する `/password_reset` URL に合わせる。

## App Check

- Web は `apps/web/src/entry.tsx` で Firebase App 初期化時に App Check を有効化する。
- Web の provider は `ReCaptchaEnterpriseProvider` を使い、`VITE_FIREBASE_APPCHECK_SITE_KEY` を必須とする。
- Web の localhost / `127.0.0.1` では `FIREBASE_APPCHECK_DEBUG_TOKEN` を自動設定し、`VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` があればその値を使い、未設定時は debug token 自動発行モードを使う。
- iOS は `ContentView.swift` 内の `LightlistApp` で App Check provider factory を設定し、simulator / Debug では debug provider、本番デバイスでは App Attest 優先・DeviceCheck フォールバックで初期化する。
- Android は `MainActivity.kt` で App Check provider factory を設定し、Debug では debug provider、release では Play Integrity provider を使う。
- Android の Firebase project 切り替えは `google-services.json` の配置で行う。debug は `apps/android/app/google-services.json`、release は `apps/android/app/src/release/google-services.json` を使う。
- Android の release 用 `google-services.json` は `applicationId=com.lightlist.app` に一致する Firebase Android app から取得した内容を置く。
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
- `ActionCodeSettings` は `url: VITE_PASSWORD_RESET_URL`、`handleCodeInApp: false`。
- メール送信時の言語は、明示引数、現在設定、`ja` の順で解決する。
- コード検証は `verifyPasswordResetCode(code)`、確定は `confirmPasswordReset(code, newPassword)`。
- Web の `/password_reset/` page は `oobCode` を検証し、成功時は 2 秒後に `/` へ遷移する。実装は `apps/web/src/entry.tsx` に集約する。

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

- Web の認証画面は `/login/` で提供し、実装は `apps/web/src/entry.tsx` に集約する。
- iOS のパスワードリセット deep link は `lightlist://password-reset?oobCode=...` を受け、`RootView` の full screen cover で新しいパスワード入力画面を表示する。
- Web の共有コードページは `/sharecodes/?code=CODE` を受け、未認証でも共有リストの軽量プレビューを開く。ログイン済みかつ未参加の場合のみ `taskListOrder` へ追加する導線を表示する。
- iOS の共有コード deep link は `lightlist://sharecodes/CODE` と `https://lightlist.com/sharecodes/CODE` を受け、未認証でも共有リストのプレビューを開く。ログイン済みかつ未参加の場合のみ `taskListOrder` へ追加する導線を表示する。
- Android の deep link は `lightlist://password-reset?oobCode=...`、`lightlist://sharecodes/CODE`、`https://lightlist.com/sharecodes/CODE`、`https://lightlist.com/password_reset?oobCode=...` を処理する。
- Android の共有コード deep link は未認証でも共有リストのプレビューを開く。ログイン済みかつ未参加の場合のみ `taskListOrder` へ追加する導線を表示する。
- iOS / Android のサインイン画面は、Web と同様に全画面背景の中央へ最大幅約 `480pt/dp` のフォームサーフェスを置く。余白は外周側で確保し、カード背景はフォーム本文だけに付与する。
- Android の認証フォームは Compose Autofill を有効にするため `contentType` を必須とし、サインインのメール欄は `Username + EmailAddress`、既存パスワード欄は `Password`、サインアップとパスワードリセットの新規パスワード欄は `NewPassword` を設定する。
- Android の未ログイン起動時の認証画面は、保存済み設定が無い場合に端末ロケールをサポート言語 (`ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`) へ丸めて初回表示言語として使う。`zh-*` は `zh-CN`、`pt-*` は `pt-BR` へ丸め、それ以外の未対応ロケールは `ja` にフォールバックする。
- Android の認証画面は、初回描画前に確定した翻訳辞書を使って表示し、起動直後に locale key や未翻訳文言を生表示しない。
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
