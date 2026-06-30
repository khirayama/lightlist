# ライセンス表記

Web / iOS / Android はアプリ内設定画面からライセンス表記へ遷移できる。ライセンス情報は「依存ライブラリの自動収集」と「配布物に同梱する手動管理資産」の 2 系統で管理する。

## 自動収集

- Web は `apps/web/scripts/generate-licenses.mjs` を使い、`package-lock.json` と `node_modules` から依存ライブラリの名称・バージョン・ライセンス名・本文を `apps/web/public/licenses/licenses.json` に生成する。
- iOS は `LicensePlist` の Swift Package build tool plugin を使い、Swift Package 依存の acknowledgements HTML を build 時に生成して app bundle に含める。
- Android は `com.google.android.gms.oss-licenses-plugin` と `com.google.android.gms:play-services-oss-licenses` を使い、依存ライブラリのライセンス一覧を `OssLicensesMenuActivity` で表示する。`oss-licenses-plugin` は runtime classpath を設定時に解決するため、Google Play 提出物を作る `bundleRelease` / `bundle-play` でだけ適用し、Debug build / lint / 内部確認用の `assembleRelease` では適用しない。

## 手動管理

- 手動管理が必要な同梱資産は `shared/licenses/manual-licenses.json` を正本とする。
- 現在の対象は `Gen Interface JP` フォントで、SIL Open Font License 1.1 の表記を保持する。
- Web / iOS / Android は同じ `manual-licenses.json` を読み、自動収集結果とは別セクションで表示する。

## 運用

- Web のライセンス JSON 生成は `npm run dev` / `build` / `lint` / `typecheck` の前処理に含める。前処理は毎回 `shared/locales/locales.json` の同期とライセンス JSON の再生成を行う。
- iOS の `LicensePlist` build tool plugin は初回 build 時に Xcode 上で trust が必要になる。
- iOS の unattended build で plugin trust dialog を回避する場合は `xcodebuild` に `-skipPackagePluginValidation` を付ける。
- Android の Debug build と `assembleRelease` では OSS licenses の生成リソースが存在しない場合がある。設定画面から `OssLicensesMenuActivity` を開けない場合は汎用のライセンス読み込みエラーを表示し、Google Play 提出用 AAB では生成済みリソースで表示する。
