# Lightlist ファミリーのアーキテクチャ（Lightlist / Lightpad / Account）検討メモ

最終更新: 2026-11-22
状態: **見送り（2026-11-22）**。Phase 1・2・4 を dev まで実装して動作を確認したうえで、今は恩恵を受けるユーザーがいない一方、認証基盤の自前保守・運用コスト・Firebase の制約（メールのアクション URL を Account に向けられない）・Android Auth Tab の不確実さを抱えるため、実装を戻した。実装は `account-migration` ブランチ（ローカル、未 push）にアーカイブしている。dev の Firebase / Cloudflare の変更も戻した（14 章）。再開する条件: Lightpad を公開して両方を使うユーザーが増えた、サービスが 3 つ以上になった、パスキーや一元的なアカウント管理が必須になった、のどれか。このファイルは作業メモであり、`docs/` の仕様書ではない。ここに書いた構想はアイデアの段階で、今は実装しない（再開条件を満たすまで作業対象にしない）。

## 1. 趣旨

- Lightpad を `../lightpad` で開発し始めた。Lightlist の拡張ではなく独立した製品。
- Lightlist と Lightpad はアカウントを共有する。
- 目指す形は Adobe 型: **認証は共通ドメインのアカウントサービスが提供し、各サービスは認証画面を持たない。**
- 実装は Firebase を前提とする。

## 2. 結論

| 項目 | 決定 |
|---|---|
| ブランドとドメイン | Lightlist を親ブランドにし、すべて `lightlist.app` の下に置く。Lightlist `lightlist.app`、Account `account.lightlist.app`、Lightpad `pad.lightlist.app` |
| Firebase プロジェクト | 1 つ。既存の dev `lightlist-dev` / prod `lightlist-prod-b0269` を全サービス共通にする |
| 認証 | `account.lightlist.app` の Web だけがログイン・新規登録・パスワードリセット・メールアクション・アカウント管理・退会を持つ |
| 利便性と安全性 | 手間（パスワードの入力・確認画面）は回数を減らし、検査の強さは下げない。手間を残すのは乗っ取りを確定させる操作（メールアドレス・パスワードの変更、退会）の再認証と、Web のログアウトで Account の cookie を消すことだけ |
| Account のセッション | `account` DB に持つ独自のセッション（HttpOnly cookie。最後に使ってから 90 日で失効し、使うたびに延長）。失効は Auth の無効化と `tokensValidAfterTime` で判定する。Firebase Auth の client SDK はメモリ上だけで使い、ブラウザに保存しない |
| SSO | セッションが有効なら確認なしでサービスへ戻す。アカウントを選ぶ画面は `prompt=select_account` のときだけ出す。iOS は Keychain のアクセスグループでアプリ間のログイン状態を共有する |
| サービス | 認証画面を持たない。アカウントへ遷移 → 一回限りのコードを受け取る → Functions でカスタムトークンに交換 → `signInWithCustomToken` |
| データ | サービスごとに Firestore データベースを持つ（Lightlist `(default)`、Lightpad `lightpad`、Account `account`） |
| Functions | サービスごとに codebase を持つ（Lightlist `default`、Lightpad `lightpad`、Account `account`、課金停止 `billing-control`） |
| 退会 | アカウントで再認証のうえ Auth ユーザーを削除する。各サービスの codebase の Auth `onDelete` が自分のデータを消す |
| リポジトリ | lightlist（Account を含む） / lightpad の 2 つ。プロジェクト全体の設定の所有者は Account（lightlist リポジトリ） |
| 進め方 | Lightlist をあるべき形にする → Account を作り Lightlist から認証を切り出す → Lightpad を載せる → パスキーを入れる（9 章） |

```
account.lightlist.app（lightlist リポジトリの apps/account）
  ログイン / 新規登録 / パスワードリセット / メールアクション / アカウント管理 / 退会
  セッション: account DB の独自セッション（HttpOnly cookie、最後の利用から 90 日）
  Functions: セッション発行・確認、認可コード発行・交換、ログアウト
        │ ① /authorize へ遷移（client_id・redirect_uri・state・PKCE）
        │ ② ログイン後（セッションが有効なら確認なしで）、redirect_uri へ code を付けて戻す
        ▼
lightlist.app / pad.lightlist.app（Web・iOS・Android、lightlist / lightpad リポジトリ）
        │ ③ code + code_verifier を交換 API へ送り、カスタムトークンを受け取る
        ▼
  signInWithCustomToken → 以降は通常の Firebase Auth（同一プロジェクト・同一 uid）
  各サービスのデータベース・Functions だけを読み書きする
```

## 3. 判断の理由

- **Firebase プロジェクトを 1 つにする**: Firestore の Rules は同一プロジェクトの Auth が発行したトークンだけを受け付ける。プロジェクトを分けると、プロジェクト間のトークン交換と、パスワード変更・無効化・退会の失効連携を自作することになる。1 プロジェクトなら Auth の失効と Rules が全サービスにそのまま効く。
- **認証をアカウントに集約する**: ユーザーに「Lightlist アカウント」として伝わる。サービスからログイン・新規登録・リセット・メール変更・退会の画面がなくなり、実装は 2 サービス × 3 プラットフォームから Account の Web 1 か所に移る。
- **ドメインを `lightlist.app` にそろえる**: 一番手軽で、ユーザーから見ても一貫する。
  - 既存の資源（DNS・Cloudflare の zone・認証メールの送信ドメイン・iOS / Android の関連付け）を再利用できる。
  - 保存済みパスワードはそのままでは引き継げない: パスワードマネージャーの照合は origin 単位なので、`lightlist.app` に保存した資格情報は `account.lightlist.app` のログイン画面で自動入力されない（Safari / iCloud キーチェーンと Chrome は完全一致、Bitwarden など base domain 一致を既定にするものだけが候補に出る）。2 つのホストを同じ資格情報として扱ってもらう宣言・申請を行い（6.1）、それが効かないパスワードマネージャーでは初回が手動入力になるので、再保存を促す案内を用意する。
  - 別ブランドのドメインからログインに飛ぶ不自然さ（フィッシングと見分けにくい）がない。
  - Lightpad はまだドメインに依存していない（bundle ID / applicationId の `com.lightpad.app` はドメインの所有と無関係なので変えない）。
  - 認証専用の origin になるので、パスキー（9 章 Phase 4）の RP ID を `account.lightlist.app` の 1 つに固定できる。
  - 将来リブランドするときは、ドメイン移行のコスト（保存済みパスワード・パスキーの RP ID・関連付けファイル・allowlist）を払う。リブランド自体にコストがかかるので、いま先回りしない。
- **Account はサブドメインに置く**（`lightlist.app/account` のような path にしない）: 同じ origin だと Lightlist の Web の XSS で Account のセッションまで盗まれる。サブドメインなら別の Worker として独立して配信でき、XSS の影響も分けられる。
- **利便性を優先し、検査の強さは下げない**: ユーザーが感じる手間はパスワードの入力と確認画面の数だけで、PKCE・`redirect_uri` の完全一致・`Origin` の検査・レート制限などは見えない。見えない検査はすべて残し、見える手間は入力の機会を減らす（長いセッション、確認なしの SSO、アプリ間の共有、パスキー）ことで削る。手間を残すのは、乗っ取りを確定させる操作（メールアドレス・パスワードの変更、退会）の再認証と、共有 PC を守る Web のログアウトだけにする。
  - 共有端末での利用が多いと分かったら（学校・職場など）、Account のセッションを短くするか、「続行」の確認を常に出す形へ戻す。
- **SSO は Account の HttpOnly cookie で実現する**: 2 つ目のサービスでは、セッションが有効なら操作なしで戻れる。
  - Firebase Auth JS の既定のセッションは IndexedDB にある。iOS の `ASWebAuthenticationSession`（ephemeral にしない）と Safari の間で共有されるのは cookie で、localStorage は共有されないという報告がある。Safari ITP は、スクリプトが書いたストレージを 7 日間操作がなければ消す。IndexedDB のセッションでは、アプリ間の SSO も Safari 上の継続も当てにできない。なお simulator では、`ASWebAuthenticationSession` の cookie はアプリ同士で共有される一方、Safari とは共有されなかった（11 章）。iOS の SSO はアプリ同士（`ASWebAuthenticationSession` の cookie と Keychain の共有）で成り立ち、Safari の Web からアプリへの SSO は当てにしない。
  - そこで Account は、ログイン直後の ID token を確かめて独自のセッションを作り、その ID を HttpOnly の cookie で保存する。client SDK はメモリ上の persistence で使い捨てる。Android の Custom Tabs は Chrome と cookie を共有する（Auth Tab は 11 章で確かめる）。
  - Functions はセッションを確かめるたびに `getUser(uid)` で無効化と `tokensValidAfterTime` を検査するので、「全サービスからログアウト」・パスワード変更・退会の直後から Account のセッションも無効になる（Admin SDK の `verifySessionCookie(cookie, true)` と同じ判定）。
  - 期限は最後に使ってから 90 日で、使うたびに延びる。Admin SDK の session cookie は最長 14 日で、延長に再ログインが要るため使わない（4 章）。長いセッションの代わりに、アカウント管理に「ログイン中の端末」の一覧と端末ごとのログアウトを置く。
- **同じブランドのサービス間は確認なしで戻す**: Google・Adobe・Microsoft は自社サービス間の SSO で確認を求めない。「<アカウント> で続行」は第三者ログインの同意や、別々のアカウントを連携する形（Meta）の画面である。共有 PC は、Web のログアウトで Account の cookie も消すこと（5.4）で守る。
- **iOS のアプリ間は Keychain でログイン状態を共有する**: Firebase Auth iOS の `useUserAccessGroup` で、同じ Team ID のアプリが Keychain のアクセスグループを通してログイン状態を共有する。1 つのアプリでログインすれば他のアプリはブラウザを経由せずにログイン済みになり、`ASWebAuthenticationSession` と Safari の cookie 共有（11 章）に頼らない。その代わり、アプリでのログアウトは共有している全アプリからのログアウトになる（Google の iOS アプリと同じ）。Android には同等の簡単な仕組みがない（Google が使う AccountManager の自作は重い）ので、Auth Tab と Chrome の cookie による SSO のままにする。
- **既存ユーザーに影響しない**: 同一プロジェクト・同一 uid なので、Lightlist の既存セッションはそのまま有効。変わるのは次回以降のログインの経路だけ。Rules は `request.auth.token` の claim に依存していない（`request.auth.uid` だけ）ので、カスタムトークンでのセッションでもそのまま動く。
- **Account を lightlist リポジトリに置く**: 文言の複製を解消でき（`shared/locales/locales.json` を 1 つにする）、課金停止の移設が不要で、サービス間の契約を同じ repo で揃えられる。境界は引き続き「認可フロー + uid」という契約だけで、個別売却・運営主体の分離が現実になったらリポジトリの分離を再検討する。
- **Lightlist から先に進める**: 認証画面・文言・退会処理など、Account へ移すものはすべて Lightlist にある。切り出しと移行を同じフェーズで行えば対応が取りやすく、Lightpad は動いている契約にそのまま載せられる。

## 4. 却下した選択肢

- **サービスごとに認証画面を持つ（同一プロジェクトでアカウントだけ共有）**
  - 実装は最小だが、ユーザーには「どのアカウントか」が伝わらない。新規登録時の `email-already-in-use` で詰まる、片方のアプリを入れていないと退会できない、といった問題が残る。
- **Firebase プロジェクトをサービスごとに分ける**
  - 3 章のとおり、プロジェクト間の ID 連携と失効の伝達を自作することになる。Lightlist の既存ユーザーの Auth 移行（パスワードハッシュ）も発生する。次のどれかが起きたら再検討する: サービスの個別売却・譲渡、運営主体の分離、アカウント共有の廃止。
- **家族ブランドのドメインを新たに取る / Lightpad を `lightpad.app` に置く**
  - 新しいブランド名とドメインを決める必要があり、既存の資源と保存済みパスワードを引き継げない。`lightpad.app` から `account.lightlist.app` へ飛ぶ混在構成は、ユーザーから見て最も不自然になる。
- **Account のセッションを Firebase Auth JS の persistence（IndexedDB）で持つ**
  - 3 章のとおり、アプリ内ブラウザと既定ブラウザの間で共有される見込みが薄く、ITP で 7 日で消える。ID token は失効しても最大 1 時間有効なので、失効後もしばらく認可コードを発行できてしまう。
- **親ドメインの cookie（`Domain=lightlist.app`）で各サービスまで SSO する**
  - Firebase Auth の client SDK は cookie セッションを使わず、iOS / Android のアプリにも効かない。cookie が全サブドメインのサーバーへ送られ、どれか 1 つの Worker の不備で漏れる。cookie は Account の host だけに置き、サービスへは認可コード方式で渡す。
- **Meta 型（サービスごとにアカウントを持ち、Accounts Center で後から連携する）**
  - 買収で別々のアカウント体系が合わさった経緯でできた形で、最初から作るなら選ぶ理由がない。ログイン画面がサービスごとに残り、「サービスごとに認証画面を持つ」と同じ問題を抱える。
- **Account のセッションを Admin SDK の session cookie（`createSessionCookie`）で持つ**
  - 期限が最長 14 日で、延長には再ログインが要る。2 つ目のサービスを 14 日より後に使い始めると、パスワードの入力を求めることになる。
- **SSO のたびに「<メールアドレス> で続行 / 別のアカウントを使う」を出す**
  - 共有端末で別人として黙って戻さないための確認だが、自社サービス間の SSO では毎回 1 操作増える。アカウントの切り替えは `prompt=select_account` で必要なときだけ出す（5.2）。
- **外部の IdP（Auth0・Clerk など）を使う**
  - Firebase 前提に反し、既存ユーザーの移行が必要になる。

## 5. 認可フロー（Account ⇔ サービス）

OAuth 2.0 の Authorization Code + PKCE（S256）と同じ形にし、最終的な資格情報を Firebase のカスタムトークンにする。

### 5.1 登録済みクライアント

Account 側で allowlist として持つ。`redirect_uri` は完全一致で比較し、前方一致・ワイルドカードは使わない。

| client_id | redirect_uri | ログアウト後の戻り先 |
|---|---|---|
| `lightlist-web` | `https://lightlist.app/auth/callback` | `https://lightlist.app/` |
| `lightlist-ios` / `lightlist-android` | `https://lightlist.app/auth/app-callback` | なし |
| `lightpad-web` | `https://pad.lightlist.app/auth/callback` | `https://pad.lightlist.app/` |
| `lightpad-ios` / `lightpad-android` | `https://pad.lightlist.app/auth/app-callback` | なし |

- Web とアプリで path を分ける。`/auth/callback` を App Links に含めると、アプリを入れた端末のブラウザで Web のログインの戻りがアプリに奪われ、`code_verifier` がないため交換に失敗する。
- iOS: `ASWebAuthenticationSession` の https callback（`ASWebAuthenticationSession.Callback.https(host:path:)`）は、セッション自身が host + path の一致で戻りを受け取る。そのため Universal Links（`applinks`）には含めない。代わりに Associated Domains の `webcredentials:<ホスト>` が必須になる（entitlements と `apple-app-site-association` の `webcredentials.apps`）。Lightlist は `applinks:lightlist.app` に加えて `webcredentials:lightlist.app` を持つ（`apps/ios/Lightlist/Lightlist.entitlements`）。
- Android: Auth Tab（`androidx.browser` 1.9 以上。Lightlist は 1.9.0 に依存している）で開く。`AuthTabIntent.launch(launcher, url, redirectHost, redirectPath)` に https redirect の host と path を渡す。Auth Tab は redirect 先のホストとアプリの所有を Digital Asset Links で確かめ、戻りを `AuthTabIntent.AuthResult` として返す。
  - Custom Tabs + App Links へ落とすのは、Custom Tabs provider が Auth Tab に対応しない場合（`CustomTabsClient.isAuthTabSupported(context, providerPackage)` が false。provider は先に解決する）と `RESULT_VERIFICATION_TIMED_OUT` のときだけにする。
  - `RESULT_VERIFICATION_FAILED` はエラーを表示して終える。同じ `assetlinks.json` に依存する App Links も未検証の可能性が高く、Android 12 以上では未検証のリンクがブラウザで開くので、Custom Tabs へ落としても `/auth/app-callback` のページで止まり、「アプリで開く」も効かない。
  - path を絞るのは App Links の intent-filter と Auth Tab に渡す path にする。`assetlinks.json` に path の規則を書けるのは Android 15 以上（Dynamic App Links）だけなので、それより前の端末も含めた基準にはしない。intent-filter に `/auth/callback` を含めないことで、ブラウザからの Web ログインの戻りがアプリに奪われない。
  - `/auth/app-callback` は `pathPrefix="/sharecodes/"` の intent-filter に混ぜない（同一 filter 内の複数 `<data>` は属性が合成される）。`autoVerify` 付きの別 filter にして、`path` の完全一致にする。
  - Auth Tab の https redirect の検証が `assetlinks.json` のどの relation（`handle_all_urls` / `get_login_creds`）を見るかは公式に明記されていないため、アプリの statement には両方を宣言する（`scripts/generate-app-links.mjs`）。
- 関連付けファイルはホストごとに置く（`lightlist.app/.well-known/` と `pad.lightlist.app/.well-known/`）。Lightlist は `scripts/generate-app-links.mjs` で生成し、AASA に `applinks`（`/sharecodes/`）と `webcredentials` を出力する。
- `/auth/app-callback` も Web に実体のあるページとして置く。App Links の検証に失敗した端末や、Custom Tabs がユーザー操作のないリダイレクトでアプリを開かない場合、このページがブラウザで開く。中身は「アプリで開く」ボタンだけにする。ボタンは開いている URL（code と state 付き）へのリンクにし、タップ（ユーザー操作）で App Links を発動させる。Analytics と Auth を読み込まず、`no-referrer` と `no-store` で配信する。これがないと `404-page` が開き、Lightlist の `404.html` は `entry.tsx`（Analytics を含む）を読むので、code が `page_location` に残る。

dev:

- dev の Account は `account-dev.lightlist.app` に置き、dev の Firebase プロジェクトを使う（`account.dev.lightlist.app` のような 2 階層のサブドメインは Cloudflare の Universal SSL の対象外なので使わない）。
- dev の allowlist では、Web は各サービスの dev server の `http://localhost:<port>/auth/callback` を登録する。アプリは本番と同じ redirect_uri を使う。https callback は `ASWebAuthenticationSession` / Auth Tab がページを読み込む前に受け取るため、本番の Web には届かない。dev ビルドも bundle ID / applicationId が本番と同じなので、本番ホストの関連付けファイルがそのまま使える（Android は `assetlinks.json` に載っている署名の鍵でビルドする。debug 鍵の dev ビルドで動かすなら、その fingerprint を `LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT` にカンマ区切りで足すか、Auth Tab の検証に失敗する前提で dev では Web だけを確かめるかを決める。13 章）。

### 5.2 流れ

iOS は、起動時に Keychain の共有（6.2）で他のアプリのログイン状態が見つかれば、このフローを使わない。

1. サービスが `state`（乱数）と `code_verifier`（乱数）を作り、`code_challenge = BASE64URL(SHA-256(code_verifier))` を計算する。`state` と `code_verifier` は端末内に保存する。Web は `sessionStorage`。iOS はメモリ上に置く（`ASWebAuthenticationSession` はプロセスと一緒に消え、プロセス終了後に戻りを受け取る経路がないため、永続化しても使い道がない）。Android は SharedPreferences など、認証中にアプリのプロセスが終了されても残る場所に保存する（Custom Tabs の経路では戻りが新しい intent として届き、Auth Tab の結果もプロセスの再生成後に届くことがある）。
2. サービスが `https://account.lightlist.app/authorize?client_id=…&redirect_uri=…&state=…&code_challenge=…&code_challenge_method=S256&ui_locales=…` を開く。アカウントを選ばせたいときは `&prompt=select_account` を付ける。アプリはログアウトした後の最初のログインで必ず付ける（アプリのログアウトでは Account の cookie が残るため、付けないとログアウト前のアカウントに黙って戻る）。
   - Web: 同じタブで遷移する。
   - iOS: `ASWebAuthenticationSession`（`prefersEphemeralWebBrowserSession = false`、https callback）。
   - Android: Auth Tab。非対応なら Custom Tabs（5.1）。
3. Account は `client_id` と `redirect_uri` の組を allowlist で検証する。一致しなければエラー画面を出し、どこにも戻さない（オープンリダイレクトを作らない）。
4. Account はセッションを確かめる（6.1）。無効ならログインまたは新規登録を行う。有効なら確認なしで 5 へ進む。`prompt=select_account` が付いているときだけ「<メールアドレス> で続行 / 別のアカウントを使う」を表示する。「別のアカウントを使う」はセッションを無効にして cookie を消してからログインへ進む。
5. Account の Web が `client_id` / `redirect_uri` / `code_challenge` を付けて認可コード発行 API を呼ぶ（同一 origin、cookie 付き）。これらの値は `/authorize` の URL から受け取り、ログイン・新規登録の画面を経ても Account の Web が保持する（Account の origin の `sessionStorage`）。他の origin から code を発行させる要求は `Origin` の検査（5.3）で拒否する。`/authorize` の要求をサーバー側に保存しない。保存しても Account の XSS には効かず、cookie の紐づけ先が未ログイン時にない、メールのリンクから戻ると文脈が失われる、認証前の GET ごとに課金対象の `account` DB へ書き込む、といった問題が出るため。API はセッションを失効まで検証し（6.1）、allowlist を再検証して、32 bytes 以上の乱数 code を発行する。DB には `authCodes/{sha256(code)}` として `uid` / `clientId` / `redirectUri` / `codeChallenge` / `expireAt`（発行から 60 秒）を保存する。
6. Account が `redirect_uri?code=…&state=…` へ戻す。
7. サービスは `state` が保存値と一致することを確認し、`code` / `code_verifier` / `client_id` / `redirect_uri` を交換 API へ送る。
8. 交換 API は transaction の中で `authCodes` の文書を読んで削除し、その後で期限・`clientId`・`redirectUri`・PKCE を検証する（成否にかかわらず code は再利用できない。読みと削除を分けると同時に来た 2 つの要求が両方通る）。続けて `getUser(uid)` で削除・無効化されていないことを確認し、`createCustomToken(uid)` を返す。
9. サービスは `signInWithCustomToken` でログインし、保存していた `state` / `code_verifier` を消す。

### 5.3 規則

- code・カスタムトークン・ID token・セッションの cookie をログ・Analytics・URL の fragment に残さない。code は query で 1 回だけ渡す。
- callback ページ（`/auth/callback` と `/auth/app-callback`）は `Referrer-Policy: no-referrer` と `Cache-Control: no-store` で配信する。`/auth/callback` は Analytics を初期化せず、交換を始める前に `history.replaceState` で URL から code と state を消し、ログイン後の画面へ移る（Analytics の `page_location` には query が入る）。`/auth/app-callback` はボタンのために URL を残すので、Analytics を一切読み込まないことで守る。
  - Cloudflare Web Analytics は、ゾーンの自動挿入で配信されているとみられる（ソースに読み込みがなく、CSP だけが `static.cloudflareinsights.com` を許可している）。ページの実装では止められないので、この 2 パスを自動挿入の対象から外す。
  - どちらも SPA のルートではなく、実体のあるページとして配信する（静的ホスティングは `not_found_handling: 404-page` なので、ファイルがないと 404 になる）。現行の `_headers` は全体が `strict-origin-when-cross-origin` なので、この 2 つのパスだけ `no-referrer` / `no-store` にするエントリを足す。
  - Lightlist の `sw.js` は同一 origin のナビゲーションを network-first + 3 秒で Cache Storage にフォールバックする（`apps/web/public/sw.js`）。`/auth/callback` と `/auth/app-callback` は Service Worker の対象外（network only）にする。
  - エッジ（Cloudflare）のアクセスログには query が残る。Logpush の対象からこの 2 パスを外すか、code が 60 秒・1 回限りであることを理由に、この節の冒頭の規則の例外として許容するかを決める。
- API はすべて Account の Worker 経由で公開し、IP 単位のレート制限を付ける（code は推測不能だが、費用と濫用の対策として）。`cloudfunctions.net` の URL をクライアントに持たせない。Functions は Worker との共有秘密（Lightlist の `MCP_PROXY_SECRET` と同じ方式、値は別）がない要求を拒否し、Worker を迂回したレート制限の回避を防ぐ。
- cookie を使う API（セッション・認可コード発行）は Account の origin からの要求だけを受ける。`Origin` ヘッダーを検査し、CORS は許可しない。全サービスが同じサイト（`lightlist.app`）なので、`SameSite` では他のサブドメインからの要求を防げない。`/logout` はトップレベル GET ナビゲーションなので `Origin` を持たず、第三者のリンクでログアウトさせる CSRF は許容する（戻り先は `client_id` から決めるので、任意の URL へは戻さない）。
- 交換 API はサービスの Web から別 origin で呼ばれるので、CORS は allowlist の Web クライアントの origin だけを許可する。各サービスの CSP の `connect-src` に `https://account.lightlist.app` を足す（Lightlist は `apps/web/public/_headers`）。
- 交換 API は `Cache-Control: no-store` を返し、POST だけを受ける。カスタムトークンは 1 時間有効な bearer 資格情報なので、code（60 秒）より長く価値が残る。
- 交換 API の応答が失われると、code は消費済みで再試行できない（サービスはフローをやり直す）。同時要求の二重成功を防ぐため、削除は必ず応答の前（transaction 内）に行う。
- `authCodes` はクライアントから読み書きできない（Rules で全拒否、Admin SDK だけが扱う）。TTL policy で期限切れの文書を自動削除する。
- カスタムトークンの発行には、Functions の実行サービスアカウントに `iam.serviceAccounts.signBlob`（`roles/iam.serviceAccountTokenCreator`）が要る。
- `ui_locales` を受け取り、Account の表示言語と認証メールの言語に使う。Firebase のメール言語はユーザーの `locale`（Admin SDK の `updateUser`）かクライアントの `auth.languageCode` で決まるため、どちらをいつ書くかは詳細設計で決める（既存ユーザーは `locale` 未設定のことがある）。
- セッションの cookie は `__Host-` 接頭辞・`HttpOnly`・`Secure`・`SameSite=Lax`・`Path=/`・`Max-Age` 90 日で発行し、セッションの期限を延ばすたびに発行し直す。値は 32 bytes 以上の乱数にする。`__Host-` により、他のサブドメインから `Domain=lightlist.app` の cookie を植え込まれない。
- Account の画面は `frame-ancestors 'none'` と `X-Frame-Options: DENY` で配信する（Lightlist の `_headers` と同じ）。`/authorize` を iframe に埋め込ませない。

### 5.4 ログアウト・失効

- サービスの Web でのログアウト: サービスのセッションを消した後、Account の `/logout?client_id=…` へ遷移して Account のセッションを無効にして cookie も消し、5.1 の「ログアウト後の戻り先」へ戻す。戻り先は `client_id` から決め、引数では受けない。共有 PC で、次に使う人が「続行」で前の人として入れてしまうのを防ぐため。
- サービスのアプリでのログアウト: アプリのセッションだけを消し、Account の cookie は消さない（消すにはブラウザのセッションを開き直す必要があり、端末は個人のものと見なせる）。iOS は Keychain を共有しているので、同じアクセスグループのすべてのアプリからログアウトする。次のログインでは `prompt=select_account` を付け（5.2）、「続行」の 1 操作で戻れるようにしつつ、別のアカウントへ切り替えられるようにする。
- Account の「すべてのサービスからログアウト」: Functions で `revokeRefreshTokens(uid)` を呼び、cookie を消す。他の端末の Account の cookie は、次の検証で無効になる。各サービスのセッションは、ID token の期限（最大 1 時間）以内に失効する。
- Account の「ログイン中の端末」から 1 台をログアウトする: その端末の Account のセッションだけを無効にする。Firebase のリフレッシュトークンは uid 単位でしか失効できないため、その端末のサービスのセッションは残る。端末を紛失したときは「すべてのサービスからログアウト」を使うよう画面で案内する。
- パスワード変更・パスワードリセット・メールアドレス変更は、Firebase Auth の仕様でリフレッシュトークンが失効する。無効化されたユーザーはトークンを更新できない（Firebase「Manage User Sessions」）。いずれも `revokeRefreshTokens` の呼び出しは要らない。Account のセッションも `tokensValidAfterTime` の検査で同時に無効になるので、操作した端末では新しい ID token でセッションを作り直す。
- Rules は失効を検査しないので、失効から ID token の期限までの間は読み書きできる。これは許容する。退会後のこの期間に初期データが作り直される問題だけは、6.2 の確認で防ぐ。
- Account が落ちると全サービスで新規ログインができなくなる（唯一の認証経路になるため）。既存のセッションは ID token の更新が Google 側（identitytoolkit）で完結するので生き続ける。課金停止でプロジェクト全体を止めた場合も同じく新規ログインはできない。

## 6. 各リポジトリの責務と構成

### 6.1 Account（lightlist リポジトリの apps/account / firebase/functions-account）

```
apps/account/            # Vite + React + TypeScript。Workers + static assets で account.lightlist.app に配信。Worker が /api/* を Functions へ中継する
shared/locales/          # 認証・アカウント画面の文言（Lightlist と共通の 1 ファイル。11 言語）
firebase/
  functions-account/     # codebase: account（セッション、認可コード発行・交換、ログアウト）
  firestore.account.rules        # database: account（authCodes・sessions など。クライアントは全拒否）
  firestore.account.indexes.json
  firebase.account.json
  .firebaserc            # 既存のものを使う（dev lightlist-dev / prod lightlist-prod-b0269）
docs/
  account-contract.md    # サービスとの契約（7 章）
  account.md             # Web / Functions の構成・配信
apps/account/AGENTS.md
Justfile                 # ルートの recipe に account-web / check-account / deploy-account を足す
```

所有するもの:

- Firebase プロジェクト全体の設定: Auth（サインイン方法、パスワードポリシー、承認済みドメイン、Email Enumeration Protection、メールテンプレート、メールアクションの URL）、`.firebaserc`、予算（課金停止は Lightlist の `billing-control` が行う）。
- 画面: ログイン、新規登録、パスワードリセット、メールアクション、アカウント管理（メールアドレス・パスワード変更、ログイン中の端末の一覧と端末ごとのログアウト、全サービスからのログアウト）、退会。新規登録で登録済みのメールを入力したときは、`email-already-in-use` を「登録済み。ログインへ」に誘導する（移行後、既存ユーザーが誤って新規登録を選ぶことがあるため）。
- メールアクション: action URL はプロジェクト全体で 1 つなので、すべての mode を処理する。`resetPassword`（新しいパスワードの確定）、`verifyAndChangeEmail`（メールアドレス変更の確認）、`recoverEmail`（変更前のアドレスに届く取り消し。乗っ取られたときの回復手段なので必須）、`verifyEmail`。
  - 完了画面では、元の画面（ログイン画面を開いていたタブ、またはアプリの認証画面）へ戻ってログインするよう案内する。`continueUrl` で `/authorize` を再開しない。`state` / `code_verifier` は認可を始めたブラウザ・アプリにしかないので、メールから開いた別のタブやブラウザで再開しても交換に失敗する。
  - メールアドレスの確認（`verifyEmail`）は必須にしない。登録直後に確認メールを送るだけにし、未確認でもサービスを使える（他人のアドレスで登録されても、持ち主はパスワードリセットで取り戻せる）。
- 保存済みパスワードの引き継ぎ: `lightlist.app` と `account.lightlist.app` を同じ資格情報として扱ってもらう。
  - Google パスワードマネージャー: `scripts/generate-app-links.mjs` が両ホストの `assetlinks.json` を生成する。`lightlist.app` は既存の `handle_all_urls` に加えて `delegate_permission/common.get_login_creds` の Web target `https://account.lightlist.app` を、Account は `get_login_creds` の Web target `https://lightlist.app` を持つ（相互宣言）。Android アプリは Credential Manager を使わず `asset_statements` も持たないが、Auth Tab の https redirect の検証 relation が公式に明記されていないため、アプリの statement には `handle_all_urls` と `get_login_creds` を同じ relation 配列で宣言し、どちらで検証されても通るようにする。
  - Safari / iCloud キーチェーン: `apple/password-manager-resources` の `quirks/shared-credentials.json` に追加を申請する（旧 `websites-with-shared-credential-backends.json` は 2024-11 に削除済み）。ログインが Account へ移り `lightlist.app` のログイン画面が `account.lightlist.app` へ遷移する形になるため、`shared` ではなく `from: ["lightlist.app"]` / `to: ["account.lightlist.app"]` を使う（CONTRIBUTING の `from` / `to` の条件に合う）。
  - dev の `account-dev.lightlist.app` は本番と資格情報を混ぜないため、どちらの宣言にも含めず、dev の build から Account の `assetlinks.json` を除く。
  - 効くかどうかと反映までの期間は 11 章で確かめる。
- 退会: 確認画面で現在のパスワードによる再認証を行ってから、client SDK の `deleteUser` で削除する（`requires-recent-login` の制約を Firebase に任せる。Admin SDK で削除すると、開いたままのセッションから再認証なしで退会できてしまう）。Admin SDK の `deleteUsers` は Auth の `onDelete` を発火しないため使わない。確認画面には、全サービスのデータが削除されることを明記する。
- 課金停止はプロジェクト全体を止めるため、全サービスが止まる。予算は全サービスの合計で設定する。課金停止は Lightlist の `firebase/functions-billing`（codebase `billing-control`）のままとし、移設は取りやめる。

セッション:

- ログイン・新規登録: client SDK を `inMemoryPersistence` で初期化し、`signInWithEmailAndPassword` / `createUserWithEmailAndPassword` の後、ID token をセッション API へ送る。Functions は `verifyIdToken(idToken, true)` で検証し、`auth_time` が 5 分以内であることを確かめてからセッションを作る（盗まれた ID token からセッションを作らせない）。Worker が `Set-Cookie` で返し、その後 client SDK からサインアウトする。
- 保存: `sessions/{sha256(セッション ID)}` に `uid` / `authTime`（ID token の `auth_time`）/ `createdAt` / `lastUsedAt` / `expireAt`（`lastUsedAt` + 90 日）/ 端末の表示名（User-Agent から作る大まかな名前。IP は保存しない）を置く。cookie にはセッション ID だけを入れ、DB にはハッシュだけを置く。TTL policy で `expireAt` を過ぎた文書を削除する。
- 検証: 文書があり `expireAt` を過ぎていないこと、`getUser(uid)` が無効化されていないこと、`authTime` が `tokensValidAfterTime` 以降であることを確かめる（`verifySessionCookie(cookie, true)` と同じ判定）。通ったら `lastUsedAt` / `expireAt` を延ばして cookie を発行し直す。書き込みは 1 日 1 回までに間引く（認可のたびに課金対象の `account` DB へ書かないため）。
- 「続行」の画面に出すメールアドレスは、セッション API がセッションを検証して返す。
- アカウント管理の操作（メールアドレス・パスワード変更、退会）は、現在のパスワードで client SDK にサインインし直してから行う。これで `requires-recent-login` を満たし、cookie の盗用だけではこれらを実行できない。パスキーを入れた後（9 章 Phase 4）は、パスキーでの再認証も受け付ける。

### 6.2 lightlist（既存）

- `firebase/firebase.json` に自分の codebase `default` と `(default)` データベースだけを書く。codebase 名は変えない（変えると配信済みの関数が別の codebase のものとして扱われる）。Account の codebase `account` と database `account` は `firebase/firebase.account.json` で別に配信する。
- 課金停止（`firebase/functions-billing`・`firebase.billing.json`）は Lightlist に残す（Account への移設は取りやめ）。
- 認証画面とアカウント操作を削除し、5 章のフローと「アカウントを管理」へのリンクに置き換える（9 章 Phase 2）。設定のアカウントセクションにはメールアドレス表示と API トークンだけを残し、メールアドレス変更・退会は Account へのリンクにする。
  - Web の `/login`（`html/login/index.html`）は URL を残し、認可フローを始めるページにする（ブックマーク・既存のリンク・PWA のため）。
  - `/auth/callback` と `/auth/app-callback` を Vite の HTML entry に足す（5.3）。
  - Web のログアウトは Account の `/logout` を経由する（5.4）。
  - iOS は Keychain Sharing の entitlement（アクセスグループ `<TeamID>.com.lightlist.shared`）を加え、Firebase の初期化直後に `useUserAccessGroup` を呼ぶ。既存ユーザーのログイン状態は既定の Keychain にあるため、切り替えるときに現在のユーザーを共有のアクセスグループへ移す（`updateCurrentUser`。手順は 11 章で確かめる）。共有されたユーザーがいれば認可フローを使わない。他のアプリでのログアウトは起動中のアプリの `currentUser` に反映されない（Keychain からは消える）ので、前面に戻るたびに `getStoredUser(forAccessGroup:)` が nil で `currentUser` があればサインアウトする。
- 退会時のデータ削除は、既存の `deleteApiTokensOnUserDelete`（`firebase/functions/src/index.ts`、v1 の `auth.user().onDelete`）を拡張して行う。
  - リトライを有効にし（`runWith({ failurePolicy: true })`）、所属リストぶんの transaction を回す処理量に合わせて `maxInstances: 3` / `timeoutSeconds: 300` にした。Auth ユーザーが先に消えるため、onDelete が失敗すると再実行の起点がない。
  - 削除対象: `apiTokens`（既存）、所属リスト、`settings/{uid}`（通知端末 `notificationDevices` を含む）、`taskListOrder/{uid}`。
  - 所属リストは `taskListOrder/{uid}` ではなく `taskLists` の `memberKeys array-contains memberKeyOf(uid)` で列挙する（旧クライアントの退会が途中で失敗すると `taskListOrder` が先に消えていることがあるため）。
  - リストごとに transaction で処理する。transaction の中で `members/{uid}` があるときだけ処理し、なければ何もしない。最後の保持者なら `shareCodes` を含めて実体を削除し、それ以外は `members/{uid}` を削除して `memberCount` を減らし、`memberKeys` から外す（Web `deleteTaskList` と同じ規則）。
  - 何度実行しても同じ結果になるようにする（リトライ・重複配信・旧クライアントのクライアント側削除と並存するため）。
- 初めて来た uid の初期データは、既存の自己修復の経路（`settings/{uid}` の購読で server から不在を確認したときに `ensureInitialUserData` を呼ぶ）で作る。新規登録時の呼び出しは認証画面と一緒になくなるので、この経路だけになる。言語はサービスの現在の表示言語を使う。
  - 自己修復の前に `currentUser.reload()`（Web / iOS / Android とも server への問い合わせ）を呼び、`user-not-found` / `user-disabled` ならログアウトして作らない。通信エラーなら作らず、次の server 確定時に回す。退会後も他の端末の ID token は最大 1 時間有効なので、その間にアプリを起動すると、`onDelete` が消した `settings/{uid}` を不在と判断して作り直してしまう。現行の「一度存在を見た listener は自己修復しない」規則は、起動直後の listener には効かない。他の端末で退会した場合は現行でも起きるので、Account を待たずに直す。
- MCP・API トークンは Lightlist の機能として残す。

### 6.3 lightpad（既存）

- `pad.lightlist.app` で配信する。Web 配信は Cloudflare Pages から Workers + static assets へ移す（Pages の Browser Integrity Check が `/mcp` を `403` にするため。Lightlist と同じ理由）。
- `apps/api`（D1 / Workers）を、名前付きデータベース `lightpad` + codebase `lightpad` へ置き換える。Phase 3 までバックエンドへの投資は控え、画面側の開発に絞る。
- 最初から認証画面を持たないサービスとして作る。現在の Bearer トークン（`LIGHTPAD_TOKEN`）は廃止し、MCP 用は Lightpad の DB に API トークンを持つ。
- iOS は Lightlist と同じアクセスグループで Keychain を共有する（6.2）。Lightlist と同じ Team ID で署名する。
- 退会時のデータ削除は、codebase `lightpad` の v1 `auth.user().onDelete` で行う（6.2 と同じくリトライを有効にし、冪等にする）。Firestore trigger は v2 で `database: "lightpad"` を指定する（v1 と v2 が混在する）。
- 方針を Lightlist に揃える: `CLAUDE.md` を削除して `AGENTS.md` に一本化する、Node の版管理は `.nvmrc` から `.node-version` へ移す、`justfile` を `Justfile` にする。CI・dependabot は残すか削除するかを決める（12 章）。

## 7. サービスとの契約（docs/account-contract.md）

| 項目 | 内容 |
|---|---|
| 識別子 | サービス間で共通の識別子は Firebase Auth の `uid` だけ。メールアドレスをキーにしない |
| ドメイン | 各サービスは `lightlist.app` またはそのサブドメインに置く。`account.lightlist.app` / `account-dev.lightlist.app` は Account の予約 |
| 予約名 | Firestore データベース: `(default)` = Lightlist、`lightpad` = Lightpad、`account` = Account。Functions codebase: `default` / `lightpad` / `account` / `billing-control`。Storage はサービスごとにバケットを分ける |
| 配信 | 各リポジトリの `firebase.json` は自分の codebase・データベース・バケットだけを書く。`.firebaserc` は必須ではない（各リポジトリの配信レシピで project ID を固定する）。プロジェクト全体の設定（Auth）は Account（lightlist リポジトリ）からだけ変更する |
| 認可 | 5 章のフローだけでログインする。サービスは Firebase Auth の email / password API を直接呼ばない |
| iOS のログイン状態 | Keychain のアクセスグループ `<TeamID>.com.lightlist.shared` で Firebase Auth のログイン状態を共有する（`useUserAccessGroup`）。共有されたユーザーがいれば認可フローを使わない。他のアプリでのログアウトは起動中のアプリの `currentUser` に反映されない（Keychain からは消える）ので、前面に戻るたびに `getStoredUser(forAccessGroup:)` が nil で `currentUser` があればサインアウトする。全アプリを同じ Team ID で署名する |
| callback | Web は `/auth/callback`、アプリは `/auth/app-callback`。どちらも Web に実体のあるページを置く。iOS は `webcredentials` を持ち、Android は Auth Tab を使い、App Links の認証の path は `/auth/app-callback` だけにする（`/auth/callback` を含めない） |
| ログアウト | Web は Account の `/logout` を経由する。アプリはサービスのセッションだけを消す（iOS は Keychain を共有する全アプリから消える）。アプリはログアウト後の最初のログインで `prompt=select_account` を付ける |
| 初期化 | 各サービスは「初めて来た uid」に自分の初期データを作る（Lightlist の `ensureInitialUserData` のように冪等にする）。作る前に `currentUser.reload()` で Auth ユーザーの存在を確かめる。Account は各サービスのデータを作らない |
| 退会 | Account が再認証のうえ Auth ユーザーを削除する。各サービスは自分の codebase の Auth `onDelete` で自分のデータを冪等に削除する。応答後の CPU は保証されないので削除は await する。Auth ユーザーが先に消えるため、onDelete はリトライを有効にする |
| 失効 | 全サービスからのログアウトでは Account が `revokeRefreshTokens(uid)` を呼ぶ。サービスは ID token の更新失敗をログアウトとして扱う |
| 可用性 | 認証は Account だけが提供するため、Account の障害中は全サービスで新規ログインができない。既存のセッションは ID token の更新が Google 側（identitytoolkit）で完結するので生き続ける |
| 新規クライアント | Account の allowlist に `client_id` / `redirect_uri` / ログアウト後の戻り先を追加してから、サービスを配布する |

## 8. Lightpad の Firebase 設計（詳細設計で詰める）

- **データベース**: 名前付き DB `lightpad`。クライアントは DB 名を指定して初期化する（Web `getFirestore(app, "lightpad")`、iOS `Firestore.firestore(database:)`、Android `Firebase.firestore(app, "lightpad")`。iOS の API 名は named DB 対応の最新 SDK で確認する）。
- **費用（データベース全体）**: Firestore の無料枠は 1 プロジェクト 1 データベース（最初に作った `(default)`）だけが対象。`lightpad` / `account` は最初の読み書きから課金対象になる。
- **データモデル**: ノート・タグ・本文 JSON ドキュメントの Firestore 表現。
- **書き込み頻度**: 自動保存（0.7 秒 debounce）と、Firestore の「1 ドキュメントあたり持続 1 書き込み/秒」の目安との関係を spike で測る。
- **検索**: クライアントは cache 上の部分一致、MCP の `notes_search` は Functions で全件読み + フィルタが第一候補。個人規模なら費用は小さい。
- **画像**: Firebase Storage（Lightpad 専用バケット）を第一候補にする。Rules・CORS・課金が増える。
- **MCP**: Lightpad の Worker で `/mcp` を中継し、レート制限と中継用の秘密値は Lightlist と分ける。
- **作り直しの前提**: Lightpad は Firebase / Firestore への移行を前提に全面的に作り直す。現行の D1 スキーマには縛られない。

## 9. 進め方

**Phase 0: 前提を検証する（2026-11-21 に simulator / emulator 分を実施済み）**

- 実施内容: 使い捨ての Worker を `account-dev.lightlist.app` に置き（関連付けファイルと、cookie を発行して callback へ戻す仮の Account）、検証用のアプリ（iOS 2 つ・Android 2 つ、本番と別の bundle ID / applicationId）で確かめた。結果は 11 章の各項目に記録した。検証が終わった後、Worker・Firebase dev に登録した検証用 iOS アプリ・テストユーザー・検証用の simulator とコードは削除した（`account-dev.lightlist.app` は空いている）。
- 結論: アプリ間の SSO（iOS / Android）、確認なしの SSO（サーバー側の 302）での App Links の戻り、iOS の Keychain 共有（`GOOGLE_APP_ID` が異なるアプリ間、既存ユーザーの移行）が動き、設計を覆す問題はなかった。設計に反映したのは、iOS で Safari と cookie を共有しないこと（3 章）と、他のアプリでのログアウトが起動中のアプリに伝わらないこと（6.2）の 2 点。
- 前提: 本番の `lightlist.app` には現在 AASA も `assetlinks.json` も配置されていない（`docs/deployment.md` の「未配置の間は共有 URL が Web で開く」）。本番の関連付けは Phase 2 で Team ID と Play App Signing の fingerprint を揃えて初めて配置する。
- 残り（実装の各フェーズの dev で確かめる）:
  - Team ID が要るもの（Apple Developer Program への登録後、実機で）: iOS の https callback（`webcredentials`）、Keychain のアクセスグループの強制、Safari と cookie を共有しないことの実機確認。
  - Android の Auth Tab（Auth Tab 対応の Chrome。emulator なら Play ストアにログインして Chrome を更新する）。
  - サーバー側と Web の項目（`onDelete` のリトライ、カスタムトークン、PWA、`_headers` など）。各フェーズの dev の手順に入れた。
- 保存済みパスワードの引き継ぎ（6.1）の申請は、Apple の一覧への反映に時間がかかるので Phase 2 の前に出す。

検証で使った環境の要点:

- iOS simulator は Xcode 27 の `DeviceHub.app`（`/Applications/Xcode.app/Contents/Applications/`）で操作する。デモアカウントでログイン済みの simulator は使わず、`simctl create` で別の端末を作る。署名のない simulator ビルドでは `$(AppIdentifierPrefix)` が `FAKETEAMID.` になり、`webcredentials` には関連付けされない。
- Android emulator は Play ストア付きのイメージ（`Medium_Phone_API_36.1`）を使う。debug 鍵の fingerprint を検証用ホストの `assetlinks.json` に載せれば App Links は `verified` になる。

**Phase 1: Lightlist をあるべき形にする（Account に依存しないもの。本番へ出す）**

1. Auth `onDelete` によるデータ削除（6.2）と、自己修復の前の `reload()`（6.2）を本番へ出す。クライアント側の削除と並存しても結果が変わらないことを確認する。本番の前に dev で 11 章の `failurePolicy: true` の再実行と、退会直後の他端末での `reload()` を確かめる。
2. Apple Developer Program に登録し、Team ID を `LIGHTLIST_IOS_TEAM_ID` に設定する（Phase 2 の iOS の実装と検証、App Store への提出に要る。現在は未設定で、iOS は未配信）。
3. iOS の最小バージョンを 18.0 に上げる（Lightpad に揃える。`apps/ios/project.yml` の `deploymentTarget`、`AGENTS.md` の「iOS 17+」）。iOS 17 の端末と、iPadOS 18 に上げられない iPad（第 6 世代）・iPad Pro 10.5 インチ・iPad Pro 12.9 インチ（第 2 世代）が対象外になる。

**Phase 2: Account を作り、Lightlist から認証を切り出す**

認可フローを本番で初めて使うのは、ユーザーのいる Lightlist になる。dev での検証を厚くする。失敗しても、旧版アプリのログインと既存のセッションは動き続けるので、影響は新版で新しくログインする人に限られる。

dev:

1. Account の Web（`account-dev.lightlist.app`）・codebase `account`・データベース `account` を、lightlist リポジトリの `apps/account` / `firebase/functions-account` として用意する。
2. ログイン・新規登録・リセット・メールアクション・アカウント管理・退会の画面と、Account のセッション（6.1）を作る。アカウント管理には「ログイン中の端末」を含める。Lightlist の Web 実装と文言（`auth.*`）を移植元にする。
3. セッション・認可コードの発行・交換・ログアウトの API、Worker 経由の公開、レート制限、共有秘密を作る。
4. 課金停止の移設は取りやめ、`firebase/functions-billing` を Lightlist に残す（配信は従来どおり本番だけ）。
5. Lightlist の認証画面とアカウント操作を、5 章のフローと「アカウントを管理」へのリンクに置き換える（6.2）。退会の入口は Account の退会ページへの直接リンクにする。
6. Lightlist の iOS に `webcredentials:lightlist.app` と Keychain の共有（6.2）を、Android に Auth Tab と `/auth/app-callback` の App Links を加え、関連付けファイルを生成し直す（5.1、`scripts/generate-app-links.mjs`、`just app-links`）。`apps/ios/Justfile` の release 検査は associated domains の先頭が `applinks:lightlist.app` であることを見ているので、`webcredentials` は後ろに足す。
7. Lightlist の `docs/authentication.md` を書き換え、`AGENTS.md` から認証画面に関する規則を外す。
8. 11 章の残りの項目を dev で確かめる（iOS の https callback と Keychain の共有は実機、Android の Auth Tab、カスタムトークンの IAM と `currentUser.email`、PWA、`_headers` と `sw.js`、承認済みドメイン、`--only` なしの配信）。

本番:

9. Account を本番へ出し、allowlist に Lightlist のクライアントを登録する。両ホストの `assetlinks.json` に保存済みパスワードの関連付け（6.1）を配信する。
10. メールテンプレートとメールアクションの URL を `account.lightlist.app` へ切り替える。
11. Lightlist の Web を配信し、iOS / Android を提出する。
12. 旧バージョンのアプリが残っている間、旧来のアプリ内ログインが動き続けることを確認する（同一プロジェクトなので Auth の email / password は有効なまま）。最小バージョンに更新できない端末は新しいアプリを受け取れず、旧版を使い続ける。

**Phase 3: Lightpad を載せる（今回は保留）**

Lightpad の Firebase / Firestore 移行（8 章）と合わせて進める。以下は着手時の内容。

1. Web 配信を Workers + static assets へ移し、`pad.lightlist.app` で配信する。
2. 5 章のフローを Web / iOS / Android に実装する（iOS は `webcredentials:pad.lightlist.app` と Keychain の共有）。
3. データを `lightpad` DB と codebase `lightpad` へ移植する。
4. 本番の allowlist に Lightpad のクライアントを登録してから、本番へ出す。

**Phase 4: パスキーを入れる（Phase 2 の後。Phase 3 と並行してよい）**

1. Account の Functions で WebAuthn の登録と検証を行い（RP ID `account.lightlist.app`、公開鍵は `account` DB に保存する）、検証できたら `createCustomToken` を返す。Account の Web は `signInWithCustomToken`（メモリ上）で得た ID token からセッションを作る（6.1）。
2. アカウント管理にパスキーの一覧・登録・削除を置き、パスワードでログインした後にパスキーの登録を勧める。
3. アカウント管理の操作の再認証にパスキーを使えるようにする。

## 10. プラットフォームの前提

- iOS: `ASWebAuthenticationSession` の https callback は iOS 17.4 以上が必要で、これが技術上の下限になる（17.0〜17.3 を残すには custom URL scheme が要るが、使わない方針）。技術上の下限は 17.4 だが、Lightlist は Lightpad（既に 18.0）に揃えて 18.0 にする。iPhone は iOS 17 と iOS 18 で対応機種が同じだが、Lightlist は iPad にも対応しており（`TARGETED_DEVICE_FAMILY` 未指定で universal）、iPadOS 18 では iPad（第 6 世代）・iPad Pro 10.5 インチ・iPad Pro 12.9 インチ（第 2 世代）が対象外になる。
- Android: Auth Tab は `androidx.browser` 1.9 以上と、対応するブラウザが必要。非対応の端末は Custom Tabs + App Links で動かす。
- Firebase Functions: Auth のユーザー削除イベントは v1 `auth.user().onDelete`（Lightlist の既存実装）と v2 `identity.onUserDeleted`（beta）がある。新規の Lightpad は beta を避けて v1 を使う。v1 は Firestore の名前付きデータベースをトリガーできないため、名前付き DB の trigger は v2 で書く。イベントは重複して届きうるので、削除処理は冪等にする。

## 11. 事前に検証すること

- [ ] SSO（実機で確認する。simulator では cookie 共有の挙動が異なるという報告がある）: Account のセッションの cookie が、iOS `ASWebAuthenticationSession`（ephemeral にしない）と Safari の間、Android の Auth Tab / Custom Tabs と Chrome の間で共有されるか。サービス A でログインした後、サービス B へ操作なしで戻れるか（iOS のアプリ同士は Keychain の共有で代えるので、Safari の Web からアプリへの経路で確かめる）。Safari で、Worker が `Set-Cookie` で発行した 90 日の cookie が 7 日に切り詰められないか。
  - 2026-11-21 iOS simulator（iOS 26.5、署名なし、custom scheme の callback で代用）で確認: `ASWebAuthenticationSession`（ephemeral にしない）の cookie はアプリ同士で共有され、アプリ B は操作なしで戻る（OS の「サインインに使用」の確認だけが出る）。Safari とは共有されない（アプリでログインしても Safari では cookie なし、Safari でログインしてもアプリには Safari の cookie が見えない）。実機でも同じなら、Safari の Web だけでログイン済みの人がアプリを使い始めるときはログインが要る。Web の callback では `sessionStorage` の state が残る（同一タブの遷移。PWA は未検証）。
- [ ] iOS: `webcredentials` を加えた状態で、`ASWebAuthenticationSession` の https callback が本番ビルドで確実に戻るか（開発中の `?mode=developer` の扱いを含む）。
- [ ] Android: Auth Tab の https redirect が Digital Asset Links（既存の `assetlinks.json`）の検証を通って戻るか。Custom Tabs の経路で、Account がログイン API の応答後に遷移したとき、App Links でアプリが開くか、`/auth/app-callback` のページに落ちるか。ブラウザで `/auth/callback` へ戻るとき、アプリを入れた端末でもアプリが開かないか。`RESULT_VERIFICATION_TIMED_OUT` から Custom Tabs へ落ち、`RESULT_VERIFICATION_FAILED` でエラー表示になるか。
  - 2026-11-21 エミュレーター（Android 16、Chrome 134、debug 鍵、`account-dev.lightlist.app`）で確認済み: App Links の検証は `path` 完全一致の intent-filter で `verified` になる。Custom Tabs の経路では、ログイン後の JS 遷移（`location.assign`）でも、cookie がある状態のサーバー側 302（確認なしの SSO）でも App Links でアプリが開き、`/auth/app-callback` のページには落ちない。アプリ A でログインした後、アプリ B は操作なしで戻る（Chrome の cookie を共有する）。Chrome 134 は Auth Tab に非対応（`isAuthTabSupported=false`）で、Auth Tab 自体は未検証。
- [ ] Web の PWA: ホーム画面に追加した Lightlist（iOS / Android の standalone）から別 origin の Account へ遷移し、`/auth/callback` で PWA に戻れるか。そのとき `sessionStorage` の `state` / `code_verifier` が残っているか（iOS の standalone は scope 外の遷移を別の表示に切り替える）。
- [ ] v1 `auth.user().onDelete` で `failurePolicy: true` が有効に働くか（失敗させて再実行されることを dev で確認する）。
- [ ] `createCustomToken` の IAM 権限（実行サービスアカウントへの `serviceAccountTokenCreator` の付与）。
- [ ] `signInWithCustomToken` で既存の email / password ユーザーにログインしたとき、`currentUser.email` が取れ、Lightlist の既存機能（設定画面のメールアドレス表示・MCP トークン発行など）が動くか。
- [ ] 退会直後、他の端末で Lightlist を起動したとき、`reload()` でログアウトされ、初期データが作り直されないか。
- [ ] iOS の Keychain 共有: `GoogleService-Info.plist`（`GOOGLE_APP_ID`・API キー）が異なる Lightlist と Lightpad の間で、`useUserAccessGroup` によってログイン状態が共有されるか。Lightpad が Lightlist と同じ Team ID で署名されているか。既存ユーザーを既定の Keychain から共有のアクセスグループへ移す手順（`updateCurrentUser`）で、移行時にログアウトされないか。一方のアプリでログアウトしたとき、もう一方が起動中でも認証状態の変化を受け取るか（受け取らないなら、前面に戻ったときに確かめる）。
  - 2026-11-21 iOS simulator（署名なし、`GOOGLE_APP_ID` が異なる 2 アプリ、API キーは同じ）で確認: 既定の Keychain でログインしたユーザーを `useUserAccessGroup` + `updateCurrentUser` で共有グループへ移せ、移行後もログイン状態が続く。もう一方のアプリは起動時の `useUserAccessGroup` だけで同じ uid としてログイン済みになる。一方でログアウトすると共有グループからは消える（`getStoredUser(forAccessGroup:)` が nil）が、起動中のもう一方の `currentUser` は残り、前面に戻しても変わらない（6.2 の対処が要る）。署名のないアプリは `webcredentials` に関連付けされず、https callback は Team ID を揃えた実機で確かめる。Keychain のアクセスグループの強制も署名なしでは確かめられないので、実機で再確認する。
- [ ] パスワードマネージャー: 宣言・申請（6.1）がなければ、`lightlist.app` に保存した資格情報は `account.lightlist.app` で自動入力されない見込み。Google パスワードマネージャーが `assetlinks.json` の `common.get_login_creds` で Web 同士を関連付けるか、Apple の `quirks/shared-credentials.json` への申請が受理されて Safari / iCloud キーチェーンに反映されるまでの期間を確かめる。効かない場合の再保存を促す案内の文言を決める。
  - 2026-11-21 宣言の生成は実装済み（`just app-links` が両ホストの `assetlinks.json` を生成し、`just app-links-check` で一致を確認できる）。Apple への追加は PR の下書きまで（未提出）。自動入力の挙動と反映期間は未検証。
- [ ] パスキー（Phase 4）: パスキーで `signInWithCustomToken` した直後に、`updatePassword` / `verifyBeforeUpdateEmail` / `deleteUser` が `requires-recent-login` にならないか。
- [ ] ストア審査: アプリ内の退会の入口を、Web の退会ページへの直接リンクにする形が App Store / Google Play の現行ガイドラインを満たすか。
- [ ] Firestore emulator で複数データベースを同時に扱えるか。Account は `firebase/firebase.account.json`、Lightpad は別リポジトリで配信するため 1 つの `firebase.json` に 3 DB が揃わず、emulator を別ポートで起動する形になる。Phase 0 で 3 DB を 1 つの emulator で動かせるかを確かめ、だめなら検証手順を変える。
- [ ] Account の dev 構成: `account-dev.lightlist.app` の Worker から Functions へどう到達するか（dev project に配信するか、emulator を見せるか）。共有秘密と localhost の CORS allowlist も含める。
- [ ] `account.lightlist.app` / `account-dev.lightlist.app` を Auth の承認済みドメインに追加しないと、メールアクションの `continueUrl` が弾かれないか。
- [ ] `_headers` の per-path 指定（`Referrer-Policy` / `Cache-Control`）がグローバルと競合しないか。Lightlist の `sw.js` が `/auth/callback` / `/auth/app-callback` をキャッシュしないこと。Cloudflare Web Analytics の自動挿入がこの 2 パスで止まっているか（`lightlist.app` のゾーン設定を確認する）。
- [ ] 各リポジトリから `--only` を付けずに配信しても、他の codebase・データベースに触れないか（dev で確認。Lightlist の `just deploy-firebase` は `--only` を付けていない。Account は `firebase/firebase.account.json` で別に配信する）。
- [ ] 将来 Account で Google ログインを提供する場合、iOS アプリに Sign in with Apple が求められるか（ガイドライン 4.8）。

## 12. 既存方針との衝突・見直し

- Lightlist `docs/authentication.md` の「メールテンプレートとメールアクションの URL は標準のまま変更しない」は、Account への移行で廃止する。
- Lightlist `docs/authentication.md` の「deep link は共有コードだけを扱う」に、Android の App Links で受ける認可の callback（`/auth/app-callback`）を加える（iOS は `ASWebAuthenticationSession` が受けるので Universal Links は増えない）。custom URL scheme を使わない方針は変えない。
- Lightlist の退会（クライアントが再認証後に自分のデータを削除する）は、Account での退会 + 各サービスの `onDelete` に置き換わる。
- Lightlist `docs/authentication.md` のログアウトの記述に、iOS ではアプリでのログアウトが Keychain を共有する全アプリに及ぶことと、ログアウト後の最初のログインで `prompt=select_account` を付けることを加える。
- Lightlist の「サーバー判定が必要な操作（認証・メールアドレス変更・退会・共有コードの生成 / 解除 / 解決・共有参加）」の規則のうち、認証・メールアドレス変更・退会は Account へ移る。
- Lightlist `docs/analytics.md` の認証イベント（`login` / `sign_up` / `app_delete_account` / `app_password_reset_email_sent` / `app_email_change_requested`）は、Account が送るか、Lightlist から送らなくなるかを決める。
- Lightlist `docs/notifications.md` の「ログアウト時に端末登録を削除してからサインアウトする（最大 3 秒）」は、Web が Account の `/logout` を経由する順序（端末登録の削除 → サービスのサインアウト → Account へ遷移）に合わせて書き換える。
- Lightlist の法的ページ（`apps/web/src/legal/*.json` 11 言語の `accountDeletion`）は、退会の手順と削除範囲が変わるため、`updated` とあわせて更新する（`docs/deployment.md`）。
- `docs/release-android.md` の Data safety の削除 URL と `docs/release-ios.md` の「アプリ内 Settings に実装済み」は、退会が Account へのリンクになることを反映する。
- `docs/data-model.md` の「サーバーでの判定が必要な操作」の一覧から、Account へ移るもの（ログイン / サインアップ / パスワードリセット / メールアドレス変更 / 退会）を外す。同じ箇所の「退会で離脱するリストの batch はサーバー応答を待ってから次の削除へ進む」も、退会時の削除が `onDelete` に移るので削除する。
- `shared/locales/locales.json` は Account と Lightlist で共有したままにする（統合後は同じファイルを使う。`apps/account/scripts/prepare.ts` が Account の bundle を生成する）。Lightlist で使わなくなった `auth.*` / `auth.deleteAccountConfirm.*` / `settings.danger.*` の key は、Phase 2 の本番配信後に整理する。ログアウトは Lightlist に残るので、`auth.signOutConfirm.*` と `settings.danger.signOut` は残す。
- Lightlist `apps/web/AGENTS.md` の「`index` / `404` / `500` では Auth を購読しない」の近くに、callback の 2 ページでは Analytics を初期化しない規則を加える（`/auth/app-callback` は Auth も購読しない）。
- Lightpad の GitHub Actions・dependabot は、Lightlist の方針（CI 品質ゲートなし、検証はローカル）に揃えて削除するか、全リポジトリで方針を見直すかを決める。
- Lightpad の `CLAUDE.md` は `@AGENTS.md` を読み込むだけだが、Lightlist の方針（`CLAUDE.md` を作らない）に揃えて削除する。
- 旧バージョンのアプリは Auth の email / password を直接使えるため、新規登録も Account を経由せずにできる（Identity Toolkit の REST API 直叩きも同様）。Account を唯一の登録経路にはできないので、規約同意やメール検証を必須にするなら `beforeUserCreated` blocking function などで別途担保する。

## 13. 未決事項

- [ ] Account の文言を Lightlist の locale から分離する範囲（`auth.*` 以外にどこまで移すか）
- [ ] `ui_locales` を誰がいつ保存するか（ユーザーの `locale` を Admin SDK で書くか、クライアントの `auth.languageCode` か）。既存ユーザーで未設定のときの既定言語も決める
- [ ] Lightpad のデータモデル・検索・画像（8 章）
- [ ] Lightpad の CI / dependabot の扱い
- [ ] Account で Google / Apple ログインを提供するか（提供時期を含む）。提供する場合は、`authDomain` を `account.lightlist.app` にして `/__/auth/handler` を Worker で中継し、OAuth 同意画面のアプリ名を Lightlist にする
- [ ] 「ログイン中の端末」の表示名の作り方（User-Agent からどこまで出すか）
- [ ] パスキーの実装（WebAuthn の検証ライブラリ、`account` DB の保存形式、登録を勧める時機）
- [ ] Android の dev ビルド（debug 鍵）で認可フローを動かす方法: 本番の `assetlinks.json` に debug 鍵の fingerprint も載せるか、dev ビルドを upload 鍵で署名するか（5.1）
- [ ] Google に近づける追加機能を入れるか: 新しい端末でログインしたときのメール通知（「ログイン中の端末」の表示名を流用できる）と、Account で編集する共通のプロフィール（Firebase Auth の `displayName` / `photoURL`。全サービスが `currentUser` から読める）。どちらも費用は小さい
- [ ] Lightlist の Firebase dev に、用途の分からない iOS アプリ `com.company.lightlist` が登録されている（2026-11-21 時点）。不要なら削除する

## 14. 見送り時に戻したもの（2026-11-22）

実装で得た知見（再開するときに効くもの）:

- `createCustomToken` には、Functions の実行サービスアカウント自身への `roles/iam.serviceAccountTokenCreator` が要る（ないと `auth/insufficient-permission`）。付与後、反映まで数分かかる。
- 既定の送信ドメイン（`<project>.firebaseapp.com`）では、テンプレートのアクション URL をコンソールでも Admin API でも変えられない（`EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`）。送信用の独自ドメイン（`dev.lightlist.app`）を認証・適用した後も変わらなかった。Account にメールアクションを集約するなら、Identity Platform への切り替えか、Admin SDK でリンクを生成して自前で送る方式を検討する。
- Email Enumeration Protection が有効でも、新規登録は登録済みのメールに `EMAIL_EXISTS` を返す。
- Cloudflare Web Analytics の無料プランはルールが 1 つだけで、ホストを絞ってもサブドメインへの自動挿入は止まらない。HTML に `Cache-Control: no-transform` を付けると挿入されない。
- Android: Custom Tabs の提供アプリを見つけるには AndroidManifest の `<queries>` に `CustomTabsService` が要る。Auth Tab の https redirect の Digital Asset Links 検証がどの relation を見るかは公開されていない（`handle_all_urls` と `get_login_creds` の両方を宣言して備えた）。
- i18next で日本語だけを同梱すると、起動直後の `resolvedLanguage` が常に `ja` になる。検出言語は `i18next.language` で読む。
- Play App Signing の SHA-256 は `70:ED:23:23:E0:F1:EA:9E:31:CC:B1:5A:61:F2:D5:EE:57:A9:86:36:B1:86:0C:AB:A1:88:F2:F3:34:70:51:40`（Play Console の「アプリの署名」）。

戻した外部の状態（dev のみ。本番・Play Console は変更していない）:

- Firebase dev（`lightlist-dev`）: Firestore の DB `account`、Functions の codebase `account`（`api`・`deleteAccountDataOnUserDelete`）と Secret `ACCOUNT_PROXY_SECRET` を削除。Lightlist の Functions を main の内容で配信し直した（`deleteApiTokensOnUserDelete` は旧版に戻し、リトライを外した）。Auth の承認済みドメインから `account-dev.lightlist.app` を外し、メールの送信ドメインを既定に戻した。IAM の `roles/iam.serviceAccountTokenCreator` の付与を外した。
- Cloudflare（`lightlist.app` zone）: Worker `account-dev`（`account-dev.lightlist.app`）と、`dev.lightlist.app` の DNS 4 件（SPF・所有確認の TXT、DKIM の CNAME 2 件）を削除。Web Analytics のルールは元（全ホスト・全パス）のまま。
