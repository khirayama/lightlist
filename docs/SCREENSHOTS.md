# Screenshots

## 実装範囲

- 配信用スクリーンショットの元画像は `apps/ios/screenshots`、`apps/android/screenshots`、`apps/web/screenshots` に置く。
- 配信用の整形は `cd apps/web && npm run screenshots:generate -- <target>` またはルートの `just screenshots <target>` で行う。
- 生成スクリプトは `apps/web` の devDependencies に含まれる `sharp` を使うため、`apps/web` の依存解決済み環境で実行する。
- `target` は `all` / `ios` / `android` / `web` を受け付ける。
- 生成時は各出力ディレクトリを一度空にしてから、連番ファイル名で再生成する。
- 生成時のリサイズは中央基準の `cover` で行い、余剰部分はトリミングする。余白追加やデバイスフレーム合成は行わない。

## 出力先

- iOS App Store 向け出力: `apps/ios/screenshots/app-store/iphone-6.9/*.png`
- Android Google Play 向け出力: `apps/android/screenshots/google-play/phone/*.png`
- Web 配信用出力: `apps/web/public/screenshots/store/wide/*.png` と `apps/web/public/screenshots/store/narrow/*.png`

## サイズ仕様

- iOS App Store 向けは 6.9-inch iPhone portrait の `1290x2796` を正とする。
- Android Google Play 向け phone は portrait の `1080x1920` を正とする。
- Web の manifest screenshots は wide を `1920x1080`、narrow を `750x1334` とする。
- Web の `manifest.webmanifest` は `apps/web/public/screenshots/store/` 配下の生成物を `screenshots` member として参照する。

## 並び順

- iOS は `home detail` → `work detail` → `trip detail` → `shared detail` → `share sheet` → `tasklists` → `settings` の順で出力する。
- Android は `home detail` → `tasklists` → `work detail` → `trip detail` → `shared detail` → `share sheet` → `settings` の順で出力する。
- Web wide は `home detail` → `work detail` → `trip detail` → `shared detail` → `share modal` → `calendar` の順で出力する。
- Web narrow は `mobile home detail` を 1 枚目として出力する。

## 運用上の制約

- iOS の自動生成は現状 phone 比率の元画像だけを対象にし、iPad App Store スクリーンショットは生成しない。iPad 用を追加する場合は iPad 実画面の元画像を別途用意してフローを拡張する。
- 生成元の元画像は UI 実画面だけを含め、外枠・説明文・バッジを入れない。
