# 認証

認証方式は Firebase Authentication のメールアドレス + パスワード。アカウント状態は Firebase Auth のセッションを正とする。共有リストの未認証アクセスは [sharing.md](./sharing.md) を参照。

## 共通仕様

- 認証 UI は `signin` / `signup` / `reset` の 3 導線を持ち、認証前でも言語切替を行える。`email` state はタブ間で共有する。
- Web の `signin` / `signup` タブは選択中のタブだけを Tab 順に含め、左右矢印で切替、Home / End で先頭 / 末尾へ移動する。パスワードリセットはタブではない独立導線として扱い、表示中はタブリストを隠す。
- Web / iOS / Android の認証画面は、淡いページ背景上の角丸 24 + 1px 枠線のカードにアプリ名（`title`）、終了側の言語選択、`signin` / `signup` の 2 タブ（パスワードリセットはタブに含めない）、ラベル付き入力欄（プレースホルダーは `auth.placeholder.*`）、横幅いっぱいの主ボタン / 副ボタンを置き、カードの下に `copyright` を表示する。入力エラーは各入力欄の直下、送信エラーはエラー表示面で示す。
- メール / パスワードログインは Firebase Auth の応答待ちを 10 秒で打ち切り、loading state を戻して汎用認証エラーを表示する。
- 認証完了直後に必要な初期ドキュメントは `settings` / `taskLists` / `taskLists/{taskListId}/members/{uid}` / `taskListOrder`。これらは同一 batch で作成する。
- 設定画面は 3 プラットフォームとも淡いページ背景の上に、ボーダーレスの面カードを配置する。各セクション見出しはカード内の先頭に置き、設定行の操作領域は 44pt / 48dp 以上を維持する。

## Web の必須環境変数

- Firebase 初期化: `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_STORAGE_BUCKET` / `VITE_FIREBASE_MESSAGING_SENDER_ID` / `VITE_FIREBASE_APP_ID`
- パスワードリセット: `VITE_PASSWORD_RESET_URL`

## Firebase 設定ファイル

- iOS は build configuration で切り替える。Debug は `apps/ios/Lightlist/Resources/Firebase/Debug/GoogleService-Info.plist`、Release は同 `Release/GoogleService-Info.plist` を入力にし、app bundle には標準名 `GoogleService-Info.plist` を 1 つだけ配置する。
- Android は配置で切り替える。debug は `apps/android/app/google-services.json`、release は `apps/android/app/src/release/google-services.json`。
- iOS Release / Android release のファイルは bundle identifier / applicationId `com.lightlist.app` に一致する Firebase app から取得する。
- 設定同期は同じ Firebase project と同じ Auth `uid` の組み合わせだけで成立する。ローカル Web（`apps/web/.env.local`）と Android debug は `lightlist-dev`、Cloudflare Pages の本番 Web と Android release は `lightlist-prod-b0269` に揃える。dev Web と release Android（またはその逆）を併用すると、別 project のため設定は同期しない。

## サインアップ（Web / Native 共通）

Firebase Auth ユーザー作成後、Firestore へ初期データを batch 作成する。

- 作成対象: `settings/{uid}` / `taskLists/{taskListId}` / `taskLists/{taskListId}/members/{uid}` / `taskListOrder/{uid}`
- 初期設定: `theme: "system"` / `language: normalizeLanguage(language)` / `taskInsertPosition: "top"` / `autoSort: true` / `startupView: "taskList"`
- 初期タスクリスト: `shared/locales/locales.json` の選択言語にある `app.initialTaskListName` / `tasks: {}` / `history: []` / `shareCode: null` / `background: null` / `memberCount: 1`
- 初期 membership: `joinedAt` に作成時刻、`joinCode: null`。表示順の `taskListOrder` とは別に保持権限の正本として扱う。

## サインイン / サインアウト / 退会（Web）

- `signIn()`: `signInWithEmailAndPassword()` を使う。
- `signOut()`: Firebase Auth のセッションを破棄する。
- 退会は Web / iOS / Android ともに確認画面で現在のパスワードを入力し、Firebase Auth の再認証に成功してからデータ削除を開始する。空のパスワードでは実行できず、再認証失敗時はデータを変更せず認証エラーを表示する。入力したパスワードは保存・ログ出力しない。
- 削除は次の順で行う。Auth 削除後は Rules で書き込めないため、Auth ユーザーの削除は最後にする。
  1. 現在のユーザーをメールアドレスと入力パスワードで再認証する。
  2. `taskListOrder/{uid}` から所属リストを列挙する。
  3. 各リストを一覧から外す。最後の保持者なら共有コードを含めて実体削除し、それ以外は保持者数を減算する。
  4. `settings/{uid}` と `taskListOrder/{uid}` を削除する。
  5. Firebase Auth のユーザーを削除する。
- Firestore と Auth をまたぐ削除全体は原子的ではない。再認証成功後でも通信・権限などの失敗で一部削除済みになる場合があり、エラー後は再実行する。

## パスワードリセット

- Web: `sendPasswordResetEmail(email, language?)`。`ActionCodeSettings` は `url: VITE_PASSWORD_RESET_URL`、`handleCodeInApp: false`。`/password_reset/` ページが `oobCode` を検証し、成功時は 2 秒後に `/` へ遷移する。
- Native: iOS は Info.plist の `PASSWORD_RESET_URL`、Android は `BuildConfig.PASSWORD_RESET_URL` を使う。既定値は `https://lightlist.com/password_reset`。
- Android の送信は `handleCodeInApp: true`、`setAndroidPackageName(com.lightlist.app, false, null)`、`setLinkDomain(BuildConfig.PASSWORD_RESET_LINK_DOMAIN)` を使う。debug は `lightlist-dev.firebaseapp.com`、release は `lightlist-prod-b0269.firebaseapp.com` を既定の Firebase Hosting link domain とし、Firebase Hosting で実際に構成した custom link domain を使う場合だけ `LIGHTLIST_FIREBASE_AUTH_LINK_DOMAIN` で両 variant を上書きする。Cloudflare Pages の `lightlist.com` は Firebase Hosting link domain として登録済みでない限り、この値に使わない。
- Android は Firebase Hosting link の `mode=resetPassword` と `oobCode` を処理し、対応アプリがない端末では Firebase Authentication のメールテンプレートに設定した Web fallback へ遷移する。Web の `/password_reset/` はその fallback を担当する。
- 検証は `verifyPasswordResetCode(code)`、確定は `confirmPasswordReset(code, newPassword)`。
- 送信メールの言語は、明示引数 -> 現在設定 -> `ja` の順で解決する。
- 本番のリセット URL に `localhost` は使わない。

## メールアドレス変更（Web）

- `sendEmailChangeVerification(newEmail)`: `verifyBeforeUpdateEmail()` を使う。認証メールの言語は現在設定、未取得時は `ja`。

## deep link

- パスワードリセット: `lightlist://password-reset?oobCode=...` と `https://lightlist.com/password_reset?oobCode=...`（iOS / Android）
- 共有コード: [sharing.md](./sharing.md) を参照。

## Cloudflare Pages 配信時の前提

- Firebase Authentication の authorized domains に Cloudflare Pages の `*.pages.dev` または運用 custom domain を追加する。
- `VITE_PASSWORD_RESET_URL` は実際に配信する `/password_reset` URL に合わせる。
- Firebase Console の Authentication > Settings > Authorized domains には Web fallback domain を登録する。Authentication の mobile link / Hosting links 設定では Android app `com.lightlist.app` と、配布に使う signing certificate の SHA-1 / SHA-256 を登録し、`PASSWORD_RESET_LINK_DOMAIN` と同じ Firebase Hosting link domain を有効化する。メールテンプレートの fallback URL は `https://lightlist.com/password_reset` にする。

## サポート言語

- `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`
- `fallbackLng` は `ja`
