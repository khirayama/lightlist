# 認証

認証方式は Firebase Authentication のメールアドレス + パスワード。アカウント状態は Firebase Auth のセッションを正とする。共有リストの未認証アクセスは [sharing.md](./sharing.md) を参照。

## 共通仕様

- 認証 UI は `signin` / `signup` / `reset` の 3 導線を持ち、認証前でも言語切替を行える。`email` state はタブ間で共有する。
- Web の `signin` / `signup` タブは選択中のタブだけを Tab 順に含め、左右矢印で切替、Home / End で先頭 / 末尾へ移動する。パスワードリセットはタブではない独立導線として扱い、表示中はタブリストを隠す。
- Web / iOS / Android の認証画面は、淡いページ背景上の角丸 24 + 1px 枠線のカードにアプリ名（`title`）、終了側の言語選択、`signin` / `signup` の 2 タブ（パスワードリセットはタブに含めない）、ラベル付き入力欄（プレースホルダーは `auth.placeholder.*`）、横幅いっぱいの主ボタン / 副ボタンを置き、カードの下に `copyright` を表示する。入力エラーは各入力欄の直下、送信エラーはエラー表示面で示す。
- メール / パスワードログインは Firebase Auth の応答待ちを 10 秒で打ち切り、loading state を戻して汎用認証エラーを表示する。
- 認証エラーは Firebase Auth の error code を `auth.error.*` / `auth.passwordReset.*` へ対応付けて表示し、対応のない code は `auth.error.general` を表示する。SDK の英語メッセージをそのまま表示しない。メールアドレス変更の失敗も同じ対応付けを使う。
- 認証完了直後に必要な初期ドキュメントは `settings` / `taskLists` / `taskLists/{taskListId}/members/{uid}` / `taskListOrder`。これらは同一 batch で作成する。

## 設定画面

- 3 プラットフォームとも淡いページ背景の上にボーダーレスの面カードを置き、カード内の先頭に muted 色のセクション見出し、行間は hairline divider だけで区切る。枠線・影は付けず、設定行の操作領域は 44pt / 48dp 以上を維持する。
- セクション順は「アカウント（`settings.userInfo.title`：メール表示・メールアドレス変更・API トークン）→ 表示と動作（`settings.preferences.title`：言語・テーマ・起動画面・追加位置・autoSort・共有リストの更新通知）→ 法的情報 → アカウント操作」。
- 言語・テーマ・起動画面（`settings.startupView.*`）・追加位置は同じ行 + ピッカー / ダイアログ形式で選ぶ。autoSort は本文 `settings.autoSort.title` + muted の説明 `settings.autoSort.enable` + スイッチの行とする。
- アカウント操作は塗り・枠線のボタンにせず、他の設定行と同じテキスト行で表す（ログアウト `settings.danger.signOut` は通常の文字色、アカウント削除 `settings.danger.deleteAccount` は error 色）。実行中は `settings.signingOut` / `settings.deletingAccount` を表示する。
- `settings/{uid}` が存在しない場合も永久に読み込み中にせず、既定値で表示する。

## Web の必須環境変数

- Firebase 初期化: `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_STORAGE_BUCKET` / `VITE_FIREBASE_MESSAGING_SENDER_ID` / `VITE_FIREBASE_APP_ID`
- Web Push: `VITE_FIREBASE_VAPID_KEY`（Firebase Console の Project settings > Cloud Messaging > Web Push certificates にある公開鍵）

## Firebase 設定ファイル

- iOS は build configuration で切り替える。Debug は `apps/ios/Lightlist/Resources/Firebase/Debug/GoogleService-Info.plist`、Release は同 `Release/GoogleService-Info.plist` を入力にし、app bundle には標準名 `GoogleService-Info.plist` を 1 つだけ配置する。
- Android は配置で切り替える。debug は `apps/android/app/google-services.json`、release は `apps/android/app/src/release/google-services.json`。
- iOS Release / Android release のファイルは bundle identifier / applicationId `com.lightlist.app` に一致する Firebase app から取得する。
- 設定同期は同じ Firebase project と同じ Auth `uid` の組み合わせだけで成立する。ローカル Web（`apps/web/.env.development.local`）と Android debug は `lightlist-dev`、本番 Web（`apps/web/.env.production.local` で build）と Android release は `lightlist-prod-b0269` に揃える。dev Web と release Android（またはその逆）を併用すると、別 project のため設定は同期しない。

## サインアップ（Web / Native 共通）

Firebase Auth ユーザー作成後、Firestore へ初期データを batch 作成する。初期データ作成は Web / iOS / Android 共通の冪等処理 `ensureInitialUserData` に集約する。

- サーバーから `settings/{uid}` を読み、存在すれば何もしない。`taskListOrder/{uid}` が既にあれば `settings` だけを作成する。
- 初期データ作成に失敗しても Auth ユーザーは削除せず、サインアップは完了扱いにして失敗を匿名の例外ログに残す。
- ログイン中の settings listener がサーバー確定（`fromCache == false` かつ `hasPendingWrites == false`）で `settings/{uid}` の不在を受け取ったら、同じ処理で初期データを作成して自己修復する。言語は端末（Web は現在の UI 言語）から解決する。
- 同一プロセス内の同時実行は uid 単位で 1 本にまとめる。

- 作成対象: `settings/{uid}` / `taskLists/{taskListId}` / `taskLists/{taskListId}/members/{uid}` / `taskListOrder/{uid}`
- 初期設定: `theme: "system"` / `language: normalizeLanguage(language)` / `taskInsertPosition: "top"` / `autoSort: true` / `startupView: "taskList"`
- 初期タスクリスト: `shared/locales/locales.json` の選択言語にある `app.initialTaskListName` / `tasks: {}` / `history: []` / `shareCode: null` / `background: null` / `memberCount: 1` / `memberKeys: [自分の key]`
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
- 外部 API のトークン（`apiTokens`）はクライアントでは削除せず、Auth ユーザーの削除を受けた Functions が削除する（[api.md](./api.md)）。
- Firestore と Auth をまたぐ削除全体は原子的ではない。再認証成功後でも通信・権限などの失敗で一部削除済みになる場合があり、エラー後は再実行する。

## パスワードリセット

- 送信は Web / iOS / Android とも `sendPasswordResetEmail(email)` だけを呼び、`ActionCodeSettings` を渡さない。メールのリンクは Firebase Authentication の標準 action handler（`<project>.firebaseapp.com/__/auth/action`）を開き、新しいパスワードの入力と確定は標準ページで行う。アプリ・Web に独自のリセット画面や deep link は持たない。
- Firebase Console のメールテンプレートの action URL は標準のまま変更しない（メールアドレス変更の確認なども同じ action URL を使うため）。
- 送信メールの言語は、明示引数 -> 現在設定 -> `ja` の順で解決する。

## メールアドレス変更（Web）

- `sendEmailChangeVerification(newEmail)`: `verifyBeforeUpdateEmail()` を使う。認証メールの言語は現在設定、未取得時は `ja`。

## deep link

- 共有コードだけを扱う（[sharing.md](./sharing.md)）。custom scheme は持たない。

## サポート言語

- `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`
- `fallbackLng` は `ja`
- 未認証時の端末言語は、Web / iOS / Android 共通で `zh-*` を `zh-CN`、`pt-*` を `pt-BR` に丸める。その他の対応言語は地域指定を除いた言語を使い、未対応言語は `ja` にする。
