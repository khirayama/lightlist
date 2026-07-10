# Firebase App Check

Firestore / Firebase Auth へのリクエストを正規アプリ（Web / iOS / Android）由来に限定するための App Check の構成と必須手順。

## Provider 構成

| プラットフォーム | 本番 Provider | 開発 Provider |
| --- | --- | --- |
| Web | reCAPTCHA v3 | Debug token（env 経由） |
| iOS | App Attest（未対応端末は DeviceCheck） | `AppCheckDebugProviderFactory`（DEBUG build） |
| Android | Play Integrity | `DebugAppCheckProviderFactory`（debug variant） |

### Web

- `apps/web/src/entry.tsx` の `setupAppCheck()` で Firebase app 初期化時に通る。
- `VITE_FIREBASE_APPCHECK_SITE_KEY`（reCAPTCHA v3 の site key）が未設定・空なら App Check は初期化しない（ローカル開発の既定動作）。enforcement 前に本番 env への site key 設定が必須。
- `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` に値があると debug provider として動作する（site key 設定時のみ意味を持つ）。本番 env には設定しない。
- `isTokenAutoRefreshEnabled: true` で token を自動更新する。

### iOS

- `apps/ios/Lightlist/Sources/ContentView.swift` の `LightlistApp.init()` で、`FirebaseApp.configure()` より前に provider factory を設定する（順序は必須）。
- Release build は `DCAppAttestService.shared.isSupported` の端末で `AppAttestProvider`、未対応端末で `DeviceCheckProvider` を使う。DEBUG build は `AppCheckDebugProviderFactory`。
- App Attest には entitlement `com.apple.developer.devicecheck.appattest-environment`（値 `production`）が必要。`Lightlist.entitlements` に設定済み。Apple Developer Portal の App ID で App Attest capability の有効化が必要。DeviceCheck fallback には Apple Developer Portal で作成した DeviceCheck private key が必要。
- SPM 依存は `project.yml` の `FirebaseAppCheck`。

### Android

- `apps/android/app/src/main/java/com/lightlist/app/ContentView.kt` の `MainActivity.onCreate()` で、`FirebaseApp.initializeApp()` 直後に `installAppCheckProviderFactory()` を呼ぶ。
- provider factory は build variant の source set で切り替える（`app/src/debug/.../AppCheckProviderFactorySelector.kt` = Debug provider / `app/src/release/.../AppCheckProviderFactorySelector.kt` = Play Integrity）。
- 依存は `firebase-appcheck`（main）+ `releaseImplementation(firebase-appcheck-playintegrity)` + `debugImplementation(firebase-appcheck-debug)`。すべて Firebase BoM 管理。
- R8 は `proguard-rules.pro` の `ComponentRegistrar` keep ルールで App Check registrar も保持する。

## Firebase Console / 外部サービス側の必須手順

コードからは設定できない手動手順。enforcement 有効化前にすべて完了させる。

### 1. アプリ登録（Firebase Console → 構築 → App Check → アプリ）

- Web: 「reCAPTCHA」（v3）を選択。事前に <https://www.google.com/recaptcha/admin> で site key を作成する（GCP の API 有効化・課金設定は不要。許可ドメインは `lightlist.com` とプレビュー用ドメイン。`localhost` は debug token を使うため不要）。site key を App Check に登録し、同じ値を deploy 環境変数 `VITE_FIREBASE_APPCHECK_SITE_KEY` に、secret key を App Check の登録欄に設定する。
- iOS: 「App Attest」を登録する。Team ID は Apple Developer のものが自動表示される。加えて DeviceCheck provider も登録し、Apple Developer Portal で作成した DeviceCheck private key を設定する。Release build は App Attest 未対応端末で DeviceCheck token を送るため、両方を登録してから enforcement を有効化する。token TTL は既定の 1 時間でよい。
- Android: 「Play Integrity」を選択。事前に Firebase の Android アプリ設定へ release 署名の SHA-256 fingerprint を登録し、アプリが Google Play に（内部テスト以上で）公開されていること。Play Console → 設定 → アプリの完全性 で Play Integrity API をリンクする。

### 2. Debug token の登録（各アプリ → メニュー → デバッグトークンを管理）

- Web: 任意の UUID を生成して console に登録し、同じ値を `apps/web/.env.local` の `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` に設定する。
- iOS: DEBUG build を起動すると Xcode console に `App Check debug token: ...` が出力されるので、その値を登録する。token は端末（simulator）ごとに永続される。
- Android: debug build を起動すると logcat（タグ `DebugAppCheckProvider`）に debug secret が出力されるので、その値を登録する。secret は端末ごとに SharedPreferences へ永続される。

### 3. Enforcement（App Check → API）

1. まず Cloud Firestore を「未適用（モニタリング）」のままにし、メトリクスで「確認済みリクエスト」の割合を確認する。
2. 3 プラットフォームの新バージョンが行き渡り、未確認リクエストが十分減ってから「適用」に切り替える。
3. Authentication の enforcement は Identity Platform へのアップグレードが前提（未アップグレードなら Auth は監視のみ）。Firestore の enforcement だけでも保護効果はある。

## 制約

- App Check は認証とは独立。共有コードによる未認証アクセス（閲覧・編集）も enforcement 後は有効な App Check token が必要だが、正規アプリ経由なら未認証のまま従来どおり動作する（共有権限モデルは変更しない）。
- enforcement 適用後、site key 未設定の Web デプロイや console 未登録の debug build は Firestore アクセスが全拒否される。適用前に全配信チャネルの設定完了を確認する。
- iOS の App Attest は simulator では動作しない（DEBUG build は debug provider のため通常開発に影響なし）。Release 検証は実機で行い、App Attest 対応端末と未対応端末の双方で token が取得できることを確認する。TestFlight / App Store 配布で App Attest を使う場合は production 環境が必要。
- Android の Play Integrity は Google Play 開発者サービスが必要。Play 外配布の release APK（`just build-release` の内部確認用 APK 含む）は attestation に失敗するため、enforcement 後は Play 配布ビルドで確認する。
- reCAPTCHA v3（classic）は課金アカウント不要で利用できる。Firebase の公式推奨は reCAPTCHA Enterprise で、classic の管理画面は将来 GCP console へ統合される可能性があるが、既存 site key は継続して動作する。Enterprise へ移行する場合は `entry.tsx` の provider を `ReCaptchaEnterpriseProvider` へ替え、App Check の登録も Enterprise site key へ差し替える。
