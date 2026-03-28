# 開発

## リポジトリ構成

- ルートに Node の manifest は置かない。
- Web の Node ツールと lockfile は `apps/web` に集約する。
- Web は Next.js Pages Router + TypeScript + Tailwind。
- iOS は SwiftUI + XcodeGen。
- Android は Kotlin + Gradle。
- Firebase デプロイ設定はリポジトリルートに置く。

## 主要ディレクトリ

- `apps/web`
  - Web アプリ本体
- `apps/web/src/lib`
  - Firebase 初期化、購読、mutation、analytics
- `apps/ios/Lightlist/Sources`
  - iOS アプリ本体
- `apps/android/app/src/main/java/com/example/lightlist`
  - Android アプリ本体
- `docs`
  - 実装を正とする仕様書

## コマンド

- ルート
  - `just deploy-firestore`
  - `just deploy-firestore-prod`
- Web
  - `cd apps/web && npm run dev`
  - `cd apps/web && npm run format`
  - `cd apps/web && npm run lint`
  - `cd apps/web && npm run knip`
  - `cd apps/web && npm run build`
  - `cd apps/web && npm run typecheck`
- iOS
  - `cd apps/ios && just build`
  - `cd apps/ios && xcodegen generate`
  - `cd apps/ios && xcodebuild -scheme Lightlist -destination 'platform=iOS Simulator,...'`
- Android
  - `cd apps/android && just lint`
  - `cd apps/android && just build`

## Web 実装上の前提

- Firebase 初期化は `apps/web/src/lib/firebase.ts` が担当する。
- `apps/web/src/lib/firebase.ts` は `process.env.NEXT_PUBLIC_FIREBASE_*` を直接読む。
- Firestore は `persistentLocalCache` + `persistentMultipleTabManager` を使う。
- i18n は `apps/web/src/utils/i18n.ts` で初期化する。
- 言語検出順は `querystring -> localStorage -> navigator -> htmlTag`。
- `document.documentElement.lang` と `dir` は `_app.tsx` で現在言語へ同期する。
- `public/` 配下の静的ファイルはルートパスから参照する。

## Native 実装上の前提

- iOS / Android とも Firebase Auth / Firestore を直接利用する。
- iOS / Android とも locale JSON を同梱して読み込む。
- Android app module は `BuildConfig.DEBUG` を参照するため `buildFeatures.buildConfig = true` を維持する。

## 品質ゲート

- Web の `lint` は `eslint . --max-warnings=0`。
- 実装変更後の確認は、変更があった app のみ実行する。
- `apps/web` を変更した場合は `npm run format` / `npm run lint` / `npm run build` / `npm run typecheck` を実行する。
- `apps/ios` を変更した場合は `just build` を実行する。iOS 専用の `lint` / `format` は現状未設定。
- `apps/android` を変更した場合は `just lint` / `just build` を実行する。Android 専用の `format` は現状未設定。
- CI では `npm audit --audit-level=high` を維持する。
- 実装変更後は `docs/` を実装に合わせて更新する。
