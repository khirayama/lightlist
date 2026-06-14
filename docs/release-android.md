# Android Google Play リリース準備

## 判断事項

### applicationId / package name

- Google Play に出す `applicationId` / package name は `com.lightlist.app` を正とする。
- 公開後の package name は実質変更不可。別 package name にしたい場合は、別アプリとして新規作成する前提になる。
- Firebase Android app、Play Console、deep link / app link の設定は `com.lightlist.app` に揃える。
- Gradle の `namespace`、Kotlin パッケージ、`applicationId` はいずれも `com.lightlist.app` に揃える。

### 無料 / 有料

- Play Console の無料 / 有料は、アプリのダウンロード自体に課金するかどうかの設定。
- Lightlist は無料アプリとして公開する前提。無料で公開した後にダウンロード有料へは変更できない。
- 無料のまま、後からサブスクリプションやアプリ内課金を追加することは可能。販売する場合は Google Play Billing を使う。
- サブスクリプション / アプリ内商品の product ID は作成後に変更・再利用できないため、命名は公開前に決める。

## あなたがやること

### 1. Play Console の初期設定

- Google Play Developer account を用意し、developer identity / contact information の確認を完了する（公開後も正確な状態で維持する）。
- Play Console で新規アプリを作成する。package name は `com.lightlist.app`。
- アプリ名、既定言語、アプリ / ゲーム区分、無料 / 有料を決める。無料公開で開始する場合は後からダウンロード有料にできないことを確認する。
- 新規個人デベロッパーアカウントの場合は、production access 申請前に closed testing で 12 人以上の tester が 14 日間連続 opt-in している必要がある。

### 2. Play App Signing

- Play App Signing を有効化する。
- upload key 用 keystore を作成し、安全に保管する。
- Play Console の app signing 画面で app signing key と upload key の SHA-1 / SHA-256 を確認する。
- upload key の情報を AAB 生成時に環境変数または Gradle property として渡せるようにする。

```sh
cd apps/android
LIGHTLIST_ANDROID_KEYSTORE=/path/to/upload.jks \
LIGHTLIST_ANDROID_KEYSTORE_PASSWORD=... \
LIGHTLIST_ANDROID_KEY_ALIAS=... \
LIGHTLIST_ANDROID_KEY_PASSWORD=... \
just bundle-play
```

### 3. Firebase 設定

- Firebase Android app の package name が `com.lightlist.app` であることを確認する。
- Play App Signing の app signing certificate fingerprint を Firebase Android app に追加する。必要に応じて upload certificate fingerprint も追加する。
- release 用 `google-services.json` を Firebase から取得し、`apps/android/app/src/release/google-services.json` に置く。package name が `com.lightlist.app` であることを確認する。

### 4. App Links / deep links

- `https://lightlist.com/sharecodes/CODE` と `https://lightlist.com/password_reset?oobCode=...` を release build で確認する。
- App Links の自動検証を有効にする場合は `https://lightlist.com/.well-known/assetlinks.json` を配置し、`com.lightlist.app` と Play App Signing の SHA-256 certificate fingerprint を設定する。
- `lightlist://password-reset?oobCode=...` と `lightlist://sharecodes/CODE` の custom scheme も確認する。

### 5. Store listing

- アプリ名、短い説明、詳細説明、アプリアイコン、Feature Graphic、phone screenshots を用意する。
- カテゴリを選ぶ。サポート連絡先メールと Privacy Policy URL を設定する。

### 6. App content

- Data safety を入力する。
- Privacy Policy を公開 URL で提供する（PDF 不可、地域制限やログイン必須にしない）。store listing の developer / company / app name と整合する主体名を記載する。
- App access、Ads（現状なし）、Content rating questionnaire、Target audience を入力する。
- News / Government / Financial features など該当有無を確認する。
- Account deletion / data deletion を入力する。アプリ内の削除導線に加えて、アプリ外からアカウント削除をリクエストできる Web URL を用意し、Data safety form に入力する。URL はアプリ名または developer 名に紐づくページとし、削除依頼導線を明確に表示する。
- 将来サブスクリプションを導入し、削除前に解約が必要なら、その手順を削除 Web ページと Privacy Policy に明記する。

### 7. Release build

- `apps/android/app/build.gradle.kts` の `versionCode` を、Play Console にアップロード済みの値より大きくする。
- `versionName` をユーザー向け表記として必要に応じて更新する。
- 確認コマンドを実行する。

```sh
cd apps/android
just lint
just build
just build-release
just bundle-play
```

- Google Play 提出用 AAB は `apps/android/app/build/outputs/bundle/release/app-release.aab`。
- `just build-release` の APK は内部確認用で、Google Play 提出物ではない。

### 8. Test track → Production rollout

- 最初は internal testing track に AAB をアップロードする。新規個人デベロッパーアカウントで production access が未解放の場合は、closed testing で 12 人以上の tester に 14 日間連続 opt-in してもらってから production access を申請する。
- Firebase Auth / Firestore / Crashlytics / Analytics、deep link、パスワードリセット、共有コードの未認証プレビューとログイン済み参加導線、主要言語、RTL、端末テーマ、tablet 幅を確認する。
  - `lightlist://password-reset?oobCode=...`
  - `lightlist://sharecodes/CODE`
  - `https://lightlist.com/sharecodes/CODE`
  - `https://lightlist.com/password_reset?oobCode=...`
- 問題がなければ production release を staged rollout で小さく公開する。Crashlytics、Play Console Android vitals、Firebase Analytics を確認し、段階的に rollout 率を上げる。

## 後から変更しづらいもの

- `applicationId` / package name: 実質変更不可。
- Play App Signing の app signing key: 自由な差し替え前提にしない。
- 無料アプリからダウンロード有料アプリへの変更: 不可。
- `versionCode`: 一度アップロードした値は再利用不可。
- サブスクリプション / アプリ内商品の product ID: 作成後に変更・再利用不可。
- developer account の国や支払い profile: 変更に制約や再確認が入るため、公開主体と住所・連絡先は最初に確認する。
- Privacy Policy / Data safety: 変更可能だが、実装と申告がズレると審査リスクが高い。
- アプリ名・ストア文言: 変更可能だが、審査・検索・ブランドへの影響がある。

## 参照

- Create and set up your app: https://support.google.com/googleplay/android-developer/answer/9859152
- Use Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- Upload your app to the Play Console: https://developer.android.com/studio/publish/upload-bundle
- Sign your app: https://developer.android.com/studio/publish/app-signing
- Set up your app's prices: https://support.google.com/googleplay/android-developer/answer/6334373
- Google Play Billing: https://developer.android.com/google/play/billing
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- App account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111
- App testing requirements for new personal developer accounts: https://support.google.com/googleplay/android-developer/answer/14151465
- User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
