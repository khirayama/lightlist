# 共有リスト更新通知

共有リストの通知は Firebase Cloud Messaging（FCM）で配信する。ユーザー設定 `notifySharedListUpdates` は既定で無効。ユーザーが有効にし、OS またはブラウザーの通知許可を与えた端末だけが受信する。

タスクリスト document の変更時に Cloud Functions が前後の値を比較し、タスクの追加・削除・本文・完了・日付・ピン留めの変更とリスト名の変更を通知対象とする。表示順だけの変更は通知しない。変更者自身には送らず、通知を有効にしている共有メンバーの登録済み端末へ配信する。本文は設定言語に合わせた共通文言、タイトルはタスクリスト名とし、タスク本文は通知に含めない。通知をタップすると該当タスクリストを開く。

同じタスクリストの通知は 3 プラットフォームとも 1 件に上書きし、連続した変更で通知を積み上げない（Android `tag` / `collapseKey`、iOS `apns-collapse-id`、Web `tag` に `taskListId` を使う）。

## Firestore 登録

- `settings/{uid}.notifySharedListUpdates`: 通知のユーザー単位設定。
- `settings/{uid}.notificationDevices.{deviceId}`: 端末ごとの `{ token, platform, updatedAt }`。`deviceId` は端末内で生成・保存する UUID。
- 通知を無効にすると、そのユーザーの端末登録 map を空にする。
- ログアウト時は、オンラインなら現在の端末登録の削除と端末側の FCM token 削除を最大 3 秒待ってからサインアウトする。オフライン時や待機期限内に削除が終わらなかった場合は、サーバー上の登録と端末の token が残ることがある。
- 端末は取得した FCM token の所有ユーザー（uid）を端末内に保存する。認証状態の確定時と端末登録の前に、所有ユーザーが現在のログインユーザーと異なれば（未ログインを含む）端末の token を破棄する（iOS / Android は FCM token の削除、Web は通知 worker の push subscription の解除）。破棄に失敗した場合は端末登録を行わず、次回の起動・ログイン時に再試行する。前のユーザーに残った登録は次回配信時に無効 token として削除される。
- 配信結果が無効 token を示した場合、Functions が該当端末登録を削除する。
- 端末登録の書き込みは、settings の購読結果にある登録済み token と端末の token が異なるときだけ行う。起動のたびに書き込まない。

## 費用を抑えるための制約

- Functions は `memberCount` が 1 以下のタスクリストでは Firestore を読まずに終了する。共有していないリストの編集で読み書きを発生させない。
- 通知は最初の変更ですぐ配信し、同じタスクリストの同じ変更者による変更はその後 10 分間配信しない。抑制は変更者ごとに独立し、別のメンバーの変更は抑制中でも配信する。待ってまとめて送る処理は持たない。配信先が 0 件だった場合も同じ期間は再確認しない。抑制の判定は Functions instance 内の記録を先に見て、記録がなければ `notificationThrottles/{taskListId}_{変更者 uid}` を 1 回読む。変更者を特定できない書き込みは `notificationThrottles/{taskListId}` を使う。
- trigger の再配信に対する重複抑止用 document は持たない。重複して配信されても抑制の対象になるか、同じ `taskListId` の通知を上書きするだけになる。
- 共有リストの通知対象の変更 1 回あたりの Firestore 操作は、抑制中なら読み取り 0〜1 回。配信するときは抑制 document の読み書き各 1 回に加えて、`members` の人数分と変更者以外の `settings` の人数分の読み取り。
- Functions は `maxInstances: 3`、`256MiB`、timeout 30 秒とし、retry は有効にしない。

## Firebase の必須設定

1. Firebase Console で Cloud Messaging を有効にする。
2. Firebase Functions をデプロイするプロジェクトを Blaze プランにし、Cloud Functions for Firebase の Node.js 22 runtime が利用できる状態にする。
3. リポジトリルートで `just deploy-firebase`（dev）または `just deploy-firebase prod` を実行する。Firestore Rules / indexes と通知 Functions を同じ環境へ配信し、`firebase.json` の predeploy が Functions を build する。
4. iOS 配信では Apple Developer の App ID に Push Notifications capability を許可し、対応する provisioning profile を更新する。APNs authentication key を Firebase Console の Project settings > Cloud Messaging > Apple app configuration に登録する。Debug / Release の entitlement は `apps/ios/Lightlist/Lightlist.entitlements` で設定する。
5. Web 配信では Firebase Console の Project settings > Cloud Messaging > Web Push certificates で VAPID key pair を用意し、公開鍵を Cloudflare Pages の `VITE_FIREBASE_VAPID_KEY` build environment variable に設定する。Web Push は HTTPS と Push API 対応ブラウザーが必要。Firebase JavaScript SDK が非対応と判定した環境では設定を有効にできない。iOS / iPadOS では native app の通知を利用する。
6. Android の `google-services.json` と iOS の `GoogleService-Info.plist` が、配信する app identifier と同じ Firebase project のものか確認する。

配信先は FCM registration token を使用する。Firebase SDK の installation ID による登録モードは有効にしない。

## 環境別設定とバックアップ

開発の Firebase project は `lightlist-dev`、本番は `lightlist-prod-b0269`。iOS の bundle ID と Android の application ID は両環境とも `com.lightlist.app` を使い、Firebase に同じ識別子で登録した app の設定ファイルを配置する。

- iOS 開発: `apps/ios/Lightlist/Resources/Firebase/Debug/GoogleService-Info.plist`
- iOS 本番: `apps/ios/Lightlist/Resources/Firebase/Release/GoogleService-Info.plist`
- Android 開発: `apps/android/app/google-services.json`
- Android 本番: `apps/android/app/src/release/google-services.json`
- Web ローカル開発: `apps/web/.env.local`

これらのローカル設定は Git 管理外のため、環境別にバックアップする。APNs authentication key の `.p8` と対応する Key ID・Team ID も保管する。秘密鍵のバックアップ先は共有範囲を限定する。

Web の `VITE_FIREBASE_VAPID_KEY` は公開鍵であり、`VITE_FIREBASE_PROJECT_ID` と同じ Firebase project の値を使う。Cloudflare Pages の Production と Preview は別々に設定し、保存後の次回 build で反映する。環境変数の保存だけでは配信済み Web は更新されない。

通知 Functions は Firestore Rules / indexes と合わせて `just deploy-firebase`（dev）/ `just deploy-firebase prod` で同じ環境へ一括配信する。配信後にクライアントを配布する。予算アラートは請求先 account の対象 project 範囲を確認し、通知金額を課金上限として扱わない。

端末登録はログインユーザーと通知設定が確定した時点で更新し、設定画面を開く必要はない。iOS は APNs 登録完了後に FCM token を取得し、APNs 登録失敗または 15 秒の待機期限超過時には有効化を失敗として扱う。

Web のバックグラウンド通知は FCM SDK の自動表示を使用する。クリック時に同一 origin の既存アプリタブがあれば、通知 worker が `taskListId` を `postMessage` で渡してフォーカスし、アプリ側が該当リストを開く。通知 worker はアプリのページを制御しないため、`WindowClient.navigate()` は使わない。アプリタブがない場合は `taskListId` 付きの URL を新しいタブで開く。同一 origin のページが表示中の場合、SDK は通知を表示せずページへ渡すため、アプリ以外のページ（LP・ログイン画面）だけが表示中のときは通知が出ない。

通知 worker の初回登録時は、worker が active になるのを待ってから FCM token を取得する。

通知許可はアプリ内スイッチを有効にしたときだけ要求する。OS 設定で許可を後から取り消した場合、アプリ内設定は維持されるが通知は届かない。再許可後にアプリを起動すると端末登録を更新する。

## Android開発環境の受信確認

Androidの通知チャンネル名は表示言語の `settings.notifications.title` を使い、言語変更時に更新する。

Androidのdebug buildは `lightlist-dev` に接続する。Google Playサービスを利用できる実機またはエミュレーターを使い、最新のdebug APKを上書きインストールする。別のFirebase app登録へ切り替えた場合は、アプリ上でログイン状態と通知設定を確認する。

受信側ユーザーで共有リスト更新通知を有効にし、Android 13以降ではOSの通知許可も与える。別ユーザーを検証用の共有リストへ参加させ、受信側アプリを強制停止せずバックグラウンドへ移した状態でタスクを更新する。同じリストの同じ変更者による通知は配信後10分間抑制されるため、続けて確認する場合は `notificationThrottles/{taskListId}_{変更者 uid}` を削除するか別のリストを使う。通知は1件表示され、タップすると対象リストを開く。前景でも受信処理を行う。設定を無効にしたユーザーと変更者自身には送らない。

ログアウト・再ログイン後の受信確認では、設定画面を開かずに別ユーザーから更新する。端末登録は認証と設定の読み込み完了後に再作成される。

初回のFunctions配信ではAPIの有効化とEventarcの権限反映に時間がかかる。API未有効・初回service agent権限の伝播待ちによる失敗は、対象projectで反映後に同じdeploy recipeを再実行する。Functionsの作成成功後にArtifact Registryのcleanup policy未設定だけでCLIが失敗した場合は、対象projectに `firebase functions:artifacts:setpolicy --location asia-northeast1 --days 1 --force --project <project-id>` を実行して生成済みコンテナ画像の保持期間を1日に設定し、同じ環境の `just deploy-firebase`（dev）/ `just deploy-firebase prod` を再実行する。稼働中のFunctionsを削除する設定ではない。
