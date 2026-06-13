# Firebase App Check

Firestore / Firebase Auth へのリクエストを正規のアプリ（Web / iOS / Android）由来に限定するための App Check の仕様と必須設定。

## Provider 構成

| プラットフォーム | 本番 Provider | 開発 Provider |
| --- | --- | --- |
| Web | reCAPTCHA v3 | Debug token（env 経由） |
| iOS | App Attest | `AppCheckDebugProviderFactory`（DEBUG build） |
| Android | Play Integrity | `DebugAppCheckProviderFactory`（debug variant） |

### Web

- 実装は `apps/web/src/entry.tsx` の `setupAppCheck()`。Firebase app 初期化時に必ず通る。
- `VITE_FIREBASE_APPCHECK_SITE_KEY`（reCAPTCHA v3 の site key）が未設定・空の場合、App Check は初期化されない（ローカル開発の既定動作）。enforcement を有効化する前に、本番 env へ site key の設定が必須。
- `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` に値があると `FIREBASE_APPCHECK_DEBUG_TOKEN` グローバルへ設定され、debug provider として動作する（site key 設定時のみ意味を持つ）。本番 env には絶対に設定しない。
- `isTokenAutoRefreshEnabled: true` で token を自動更新する。

### iOS

- 実装は `apps/ios/Lightlist/Sources/ContentView.swift` の `LightlistApp.init()`。`FirebaseApp.configure()` より前に provider factory を設定する（この順序は必須）。
- Release build は `AppAttestProvider`、DEBUG build は `AppCheckDebugProviderFactory` を使う。
- App Attest には entitlement `com.apple.developer.devicecheck.appattest-environment`（値 `production`）が必要。`apps/ios/Lightlist/Lightlist.entitlements` に設定済み。Apple Developer Portal 側で App ID に App Attest capability の有効化が必要。
- SPM 依存は `project.yml` の `FirebaseAppCheck`。

### Android

- 実装は `apps/android/app/src/main/java/com/example/lightlist/ContentView.kt` の `MainActivity.onCreate()`。`FirebaseApp.initializeApp()` 直後に `installAppCheckProviderFactory()` を呼ぶ。
- provider factory は build variant の source set で切り替える: `app/src/debug/.../AppCheckProviderFactorySelector.kt`（Debug provider）/ `app/src/release/.../AppCheckProviderFactorySelector.kt`（Play Integrity）。
- 依存は `firebase-appcheck`（main）+ `releaseImplementation(firebase-appcheck-playintegrity)` + `debugImplementation(firebase-appcheck-debug)`。すべて Firebase BoM 管理。
- R8 は既存の `proguard-rules.pro` の `ComponentRegistrar` keep ルールで App Check registrar も保持される。

## Firebase Console / 外部サービス側の必須手順

コードからは設定できない手動手順。enforcement 有効化前にすべて完了させる。

### 1. アプリ登録（Firebase Console → 構築 → App Check → アプリ）

- **Web**: 「reCAPTCHA」（v3）を選択。事前に <https://www.google.com/recaptcha/admin> で reCAPTCHA v3 の site key を作成（GCP 側の API 有効化・課金設定は不要。許可ドメイン: `lightlist.com` とプレビュー用ドメイン。`localhost` は debug token を使うため不要）。作成した site key を App Check に登録し、同じ値を deploy 環境変数 `VITE_FIREBASE_APPCHECK_SITE_KEY` に、secret key を App Check の登録欄に設定する。
- **iOS**: 「App Attest」を選択。Team ID は Apple Developer のものが自動表示される。token TTL は既定の 1 時間でよい。
- **Android**: 「Play Integrity」を選択。事前に Firebase の Android アプリ設定へ release 署名の SHA-256 fingerprint を登録し、アプリが Google Play に（内部テスト以上で）公開されていること。Play Console → 設定 → アプリの完全性 で Play Integrity API をリンクする。

### 2. Debug token の登録（各アプリ → メニュー → デバッグトークンを管理）

- **Web**: 任意の UUID を生成して console に登録し、同じ値を `apps/web/.env.local` の `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` に設定する。
- **iOS**: DEBUG build を起動すると Xcode console に `App Check debug token: ...` が出力されるので、その値を登録する。token は端末（simulator）ごとに永続される。
- **Android**: debug build を起動すると logcat（タグ `DebugAppCheckProvider`）に debug secret が出力されるので、その値を登録する。secret は端末ごとに SharedPreferences へ永続される。

### 3. Enforcement（App Check → API）

1. まず **Cloud Firestore** を「未適用（モニタリング）」のままにし、メトリクスで「確認済みリクエスト」の割合を確認する。
2. 3 プラットフォームの新バージョンが行き渡り、未確認リクエストが十分減ってから「適用」に切り替える。
3. **Authentication** の enforcement は Identity Platform へのアップグレードが前提（未アップグレードの場合、Auth は監視のみ）。Firestore の enforcement だけでも保護効果はある。

## 制約

- App Check は認証とは独立。共有コードによる未認証アクセス（閲覧・編集）も enforcement 後は有効な App Check token が必要だが、正規アプリ経由であれば未認証のまま従来どおり動作する（共有権限モデルは変更しない）。
- enforcement 適用後、site key 未設定の Web デプロイや console 未登録の debug build は Firestore アクセスが全拒否される。適用前に全配信チャネルの設定完了を確認する。
- iOS の App Attest は simulator では動作しない（DEBUG build は debug provider のため通常開発に影響なし）。Release 検証を実機で行う場合も TestFlight / App Store 配布であれば production 環境の App Attest が使われる。
- Android の Play Integrity は Google Play 開発者サービスが必要。Play 外配布の release APK（`just build-release` の内部確認用 APK 含む）は attestation に失敗するため、enforcement 後は Play 配布ビルドで確認する。
- reCAPTCHA v3（classic）は課金アカウント不要で利用できる。Firebase の公式推奨は reCAPTCHA Enterprise であり、classic の管理画面は将来 GCP console へ統合される可能性があるが、既存 site key は継続して動作する。Enterprise へ移行する場合は `entry.tsx` の provider を `ReCaptchaEnterpriseProvider` へ替え、App Check の登録も Enterprise site key へ差し替える。
