# iOS App Store リリース準備

## 判断事項

### bundle identifier

- App Store に出す bundle identifier は `com.lightlist.app` を正とする。
- 一度 App Store Connect でアプリに紐づけた bundle identifier は実質変更不可。変更したい場合は別アプリとして新規作成する前提になる。
- Firebase iOS app、App Store Connect、Universal Links / custom scheme の設定は `com.lightlist.app` に揃える。

### 対応デバイスと言語

- `TARGETED_DEVICE_FAMILY` は `1,2`（iPhone + iPad）。iPad 対応として提出するため、App Store Connect には iPad 用スクリーンショットも必要。
- 対応言語は `Lightlist/Info.plist`（`project.yml` の `info:` から生成）の `CFBundleLocalizations` で宣言する: `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-Hans` / `hi` / `ar` / `pt-BR` / `id`。development region は `ja`。

### 暗号化輸出規制 / プライバシー

- `ITSAppUsesNonExemptEncryption: NO` を Info.plist で申告済み（標準 HTTPS のみ）。提出ごとの輸出コンプライアンス質問は不要になる。
- Privacy Manifest は `Lightlist/Resources/PrivacyInfo.xcprivacy` を正とする（メールアドレス、クラッシュデータ、Product Interaction、UserDefaults API、トラッキングなし）。
- App Store Connect の「App のプライバシー」回答は PrivacyInfo.xcprivacy と整合させる。

## あなたがやること

### 1. Apple Developer / App Store Connect の初期設定

- Apple Developer Program に登録する。
- Team ID を確認し、`LIGHTLIST_IOS_TEAM_ID` として archive 時に渡せるようにする。
- App Store Connect で新規 App を作成する。bundle ID は `com.lightlist.app`、プラットフォームは iOS。
- App 名、プライマリ言語、SKU を決める。価格は無料で開始する想定。

### 2. 署名

- 署名は automatic signing（`CODE_SIGN_STYLE=Automatic` + `-allowProvisioningUpdates`）を使う。
- archive を実行する Mac に App Store Connect へアクセスできる Apple ID を Xcode へログインしておく。

### 3. Firebase 設定

- Firebase iOS app の bundle ID が `com.lightlist.app` であることを確認する。
- release 用 `GoogleService-Info.plist` を Firebase から取得し、`apps/ios/Lightlist/Resources/Firebase/Release/GoogleService-Info.plist` に置く（gitignore 対象）。

### 4. Universal Links / deep links

- associated domains は `applinks:lightlist.com`（`Lightlist/Lightlist.entitlements`）。
- Universal Links を有効にするには `https://lightlist.com/.well-known/apple-app-site-association` を配置する（Content-Type: `application/json`、リダイレクトなし）。
- AASA の `appIDs` は `<TEAM_ID>.com.lightlist.app` とし、paths は `/sharecodes/*` と `/password_reset` を対象にする。
- `lightlist://password-reset?oobCode=...` と `lightlist://sharecodes/CODE` の custom scheme も確認する。
- AASA 未配置でも審査はブロックされない（https リンクは Web へフォールバックする）。

### 5. App Store 提出物の生成

- `MARKETING_VERSION`（ユーザー向け版数）と `CURRENT_PROJECT_VERSION`（ビルド番号）は `apps/ios/project.yml` で管理する。同じ `MARKETING_VERSION` で再アップロードする場合は `CURRENT_PROJECT_VERSION` を上げる。

```sh
cd apps/ios
LIGHTLIST_IOS_TEAM_ID=XXXXXXXXXX just archive
```

- 出力 IPA は `apps/ios/build-archive/export/Lightlist.ipa`。
- アップロードは Xcode Organizer、Transporter app、または `xcrun altool` / `xcrun notarytool` 相当の `xcodebuild -exportArchive` 後に Transporter で行う。
- export 設定は `apps/ios/ExportOptions.plist`（method `app-store-connect`、automatic signing、dSYM upload あり）。

### 6. Store listing

- App 名・サブタイトル・説明文・キーワードを用意する。
- iPhone 6.9 インチスクリーンショットは `apps/ios/screenshots/app-store/iphone-6.9`（生成は `just screenshots ios`）。
- iPad 13 インチスクリーンショットは iPad 実画面の元画像を追加してから生成する（未整備）。
- サポート URL と Privacy Policy URL を設定する。
- カテゴリ（Productivity 想定）と年齢区分質問票を完了する。

### 7. App Review 対応

- アプリ内アカウント作成があるため、App Review には動作確認用のデモアカウント（メール + パスワード）を提供する。
- アカウント削除導線はアプリ内 Settings に実装済み（App Store 必須要件）。
- 共有コードの未認証閲覧・編集は仕様であることを Review Notes に記載すると審査がスムーズ。

### 8. TestFlight → 公開

- まず TestFlight 内部テストに配布し、Firebase Auth / Firestore / Crashlytics / Analytics、deep link、パスワードリセット、主要言語、RTL、iPad 幅を確認する。
- 問題がなければ審査へ提出し、公開方法（自動 / 手動 / 段階的リリース）を選ぶ。

## 後から変更しづらいもの

- bundle identifier: 実質変更不可。
- SKU: 作成後変更不可。
- 無料から有料への変更: 可能だが既存ユーザー影響があるため最初に決める。
- `CFBundleShortVersionString` / build number: 一度アップロードした組は再利用不可。
- App 名: 変更可能だが他アプリと重複不可で、審査対象。

## 参照

- App Store Connect Help: https://developer.apple.com/help/app-store-connect/
- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Privacy Manifest: https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
- Supporting associated domains: https://developer.apple.com/documentation/xcode/supporting-associated-domains
- Account deletion requirement: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Export compliance: https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations
