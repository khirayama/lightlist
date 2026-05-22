# Android Google Play リリース準備

## 判断事項

### applicationId / package name

- Google Play に出す `applicationId` / package name は `com.lightlist.app` を正とする。
- `com.lightlist.app` は reverse DNS 形式で、ブランド名と公開アプリ用途が明確なため適切。
- 公開後の package name は実質変更不可。別 package name にしたい場合は、別アプリとして新規作成する前提になる。
- Firebase Android app、Play Console、App Check、deep link / app link の設定は `com.lightlist.app` に揃える。
- Android Gradle の `namespace = "com.example.lightlist"` は Kotlin/R class 用の namespace で、公開 package name は `applicationId = "com.lightlist.app"` が正本。

### 無料 / 有料

- Play Console の無料/有料は、アプリのダウンロード自体に課金するかどうかの設定。
- Lightlist は最初は無料アプリとして公開する前提が自然。
- 無料アプリとして公開した後に、ダウンロード有料アプリへ変更することはできない。
- 無料アプリのまま、後からサブスクリプションやアプリ内課金を追加することは可能。
- デジタル機能・デジタルコンテンツ・サブスクリプションをアプリ内で販売する場合は Google Play Billing を使う。
- Play Console で billing 関連機能を有効にするには、Google Play Billing Library を含むアプリ版を公開する必要がある。
- サブスクリプションやアプリ内商品の product ID は作成後に変更・再利用できないため、命名は公開前に決める。

## あなたがやること

### 1. Play Console の初期設定

- Google Play Developer account を用意する。
- Play Console で新規アプリを作成する。
- package name は `com.lightlist.app` にする。
- アプリ名、既定言語、アプリ/ゲーム区分、無料/有料を決める。
- 無料公開で開始する場合は、後からダウンロード有料にはできないことを確認してから進める。

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
- Play App Signing の app signing certificate fingerprint を Firebase Android app に追加する。
- 必要に応じて upload certificate fingerprint も Firebase Android app に追加する。
- App Check の Play Integrity provider が release app 用に設定されていることを確認する。
- release 用 `google-services.json` を Firebase から取得し、`apps/android/app/src/release/google-services.json` に置く。
- release 用 `google-services.json` の package name が `com.lightlist.app` であることを確認する。

### 4. Store listing

- アプリ名を確定する。
- 短い説明を用意する。
- 詳細説明を用意する。
- アプリアイコンを用意する。
- Feature Graphic を用意する。
- phone screenshots を用意する。
- カテゴリを選ぶ。
- サポート連絡先メールを設定する。
- Privacy Policy URL を設定する。

### 5. App content

- Data safety を入力する。
- Privacy policy を入力する。
- App access を入力する。
- Ads は現状なしとして入力する。
- Content rating questionnaire を完了する。
- Target audience を入力する。
- News apps / Government apps / Financial features など該当有無を確認する。
- Account deletion / data deletion の要件を確認し、必要な URL やアプリ内導線を用意する。

### 6. Release build

- `apps/android/app/build.gradle.kts` の `versionCode` を、Play Console にアップロード済みの値より大きくする。
- `versionName` をユーザー向け表記として必要に応じて更新する。
- Android の確認コマンドを実行する。

```sh
cd apps/android
just lint
just build
just build-release
just bundle-play
```

- Google Play 提出用 AAB は `apps/android/app/build/outputs/bundle/release/app-release.aab`。
- `just build-release` の APK は内部確認用で、Google Play 提出物ではない。

### 7. Test track

- 最初は internal testing track に AAB をアップロードする。
- Firebase Auth、Firestore、App Check、Crashlytics、Analytics の動作を確認する。
- deep link を確認する。
  - `lightlist://password-reset?oobCode=...`
  - `lightlist://sharecodes/CODE`
  - `https://lightlist.com/sharecodes/CODE`
  - `https://lightlist.com/password_reset?oobCode=...`
- パスワードリセットを確認する。
- 共有コードの未認証プレビューとログイン済み参加導線を確認する。
- 主要言語、RTL、端末テーマ、tablet 幅を確認する。

### 8. Production rollout

- internal testing で問題がなければ production release を作成する。
- 最初は staged rollout で小さく公開する。
- Crashlytics、Play Console Android vitals、Firebase Analytics を確認する。
- 問題がなければ段階的に rollout 率を上げる。

## 後から変更しづらいもの

- `applicationId` / package name: 実質変更不可。
- Play App Signing の app signing key: 自由な差し替え前提にしない。
- 無料アプリからダウンロード有料アプリへの変更: 不可。
- `versionCode`: 一度アップロードした値は再利用不可。
- サブスクリプション / アプリ内商品の product ID: 作成後に変更・再利用不可。
- Privacy Policy / Data safety: 変更可能だが、実装と申告がズレると審査リスクが高い。
- アプリ名・ストア文言: 変更可能だが、審査・検索・ブランドへの影響がある。

## 参照

- Create and set up your app: https://support.google.com/googleplay/android-developer/answer/9859152
- Use Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- Upload your app to the Play Console: https://developer.android.com/studio/publish/upload-bundle
- Sign your app: https://developer.android.com/studio/publish/app-signing
- Set up your app's prices: https://support.google.com/googleplay/android-developer/answer/6334373
- Google Play Billing: https://developer.android.com/google/play/billing
- In-app product catalog: https://support.google.com/googleplay/android-developer/answer/14590082
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
