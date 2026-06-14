# スクリーンショット

配信用スクリーンショットの生成フロー。

## 入力

- 元画像は `apps/ios/screenshots`、`apps/android/screenshots`、`apps/web/screenshots` に置く。
- 元画像は UI 実画面だけを含め、外枠・説明文・バッジを入れない。

## 生成

- `cd apps/web && npm run screenshots:generate -- <target>` またはルートの `just screenshots <target>`。
- `target` は `all` / `ios` / `android` / `web`。
- 生成スクリプトは `apps/web` の devDependencies の `sharp` を使うため、`apps/web` の依存解決済み環境で実行する。
- 各出力ディレクトリを一度空にしてから連番ファイル名で再生成する。
- リサイズは中央基準の cover crop で行い、余剰部分はトリミングする。余白追加やデバイスフレーム合成は行わない。

## 出力先とサイズ

- iOS App Store: `apps/ios/screenshots/app-store/iphone-6.9/*.png`、`1290x2796`（6.9-inch iPhone portrait）。
- Android Google Play: `apps/android/screenshots/google-play/phone/*.png`、`1080x1920`（phone portrait）。
- Web: `apps/web/public/screenshots/store/wide/*.png`（`1920x1080`）と `apps/web/public/screenshots/store/narrow/*.png`（`750x1334`）。`manifest.webmanifest` が `screenshots` member として参照する。

## 並び順

- iOS: `home detail` → `work detail` → `trip detail` → `shared detail` → `share sheet` → `tasklists` → `settings`
- Android: `home detail` → `tasklists` → `work detail` → `trip detail` → `shared detail` → `share sheet` → `settings`
- Web wide: `home detail` → `work detail` → `trip detail` → `shared detail` → `share modal` → `calendar`
- Web narrow: `mobile home detail` を 1 枚目とする。

## 制約

- 現行フローは iPhone 比率の元画像だけを対象にし、iPad App Store スクリーンショットは生成しない。iPad 用は iPad 実画面の元画像を別途用意してフローを拡張する。
