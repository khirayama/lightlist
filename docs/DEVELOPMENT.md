# 開発

## このディレクトリの役割

- `docs/` は実装を正とした仕様を置く。
- 現在のアプリ挙動、必須設定、維持したい制約を書く。
- 一時的な設計メモ、ファイル分割の棚卸し、進捗報告は書かない。

## docs ですること

- `apps/web` `apps/ios` `apps/android` の共通仕様や差分を、利用者視点と実装制約の両方から簡潔に書く。
- 環境変数、deep link、データモデル、セキュリティヘッダのように、実装変更時に見落としやすい前提を残す。
- ドキュメント更新時は、実装を調べて存在する画面・機能・設定だけを書く。

## docs でしないこと

- 現在のコンポーネント一覧や内部 import 構成を、そのまま別資料として重複管理しない。
- 実装詳細を必要以上に列挙しない。
- すでに `AGENTS.md` で管理している作業ルールを重複して増やさない。

## リポジトリ構成

- ルートに Node の manifest は置かない。
- Web の Node ツールと lockfile は `apps/web` に集約する。
- Web は Next.js Pages Router + TypeScript + Tailwind。
- iOS は SwiftUI + XcodeGen。
- Android は Kotlin + Gradle。
- Firebase デプロイ設定はリポジトリルートに置く。

## 主要パス

- `apps/web`
- `apps/web/src/lib`
- `apps/ios/Lightlist/Sources`
- `apps/android/app/src/main/java/com/example/lightlist`
- `docs`

## Web の前提

- Firebase 初期化と App Check 初期化は `apps/web/src/lib/firebase.ts` に集約する。
- Web UI から `firebase/*` を直接 import せず、認証・設定・タスクリストは `@/lib/*` を通す。
- i18n 初期化、対応言語、言語正規化、方向判定、翻訳依存のエラー解決とバリデーションは `apps/web/src/lib/translation.ts` に集約する。
- 本番 build は `next build --webpack` を使う。
- 本番レスポンスヘッダは `apps/web/next.config.js` で管理する。

## Native の前提

- iOS / Android は Firebase Auth / Firestore を直接使う。
- iOS の Firebase Auth callback と auth state listener から SwiftUI state を更新する処理は MainActor 上で行い、ログイン completion で `error` と `result` がともに空の場合も汎用認証エラーを表示する。
- iOS / Android は `apps/web/src/locales/*.json` と同じキー構造の locale JSON を同梱して使う。
- iOS は `LightlistApp.swift` が app entry と Firebase 初期化、`ContentView.swift` が UI・翻訳ロード・analytics helper を持つ。
- Android は `MainActivity.kt` が app entry と deep link 変換、`ContentView.kt` が UI・翻訳ロード・analytics helper を持つ。
- Android app module は `BuildConfig.DEBUG` と `BuildConfig.PASSWORD_RESET_URL` を使うため `buildFeatures.buildConfig = true` を維持する。
- iOS / Android の識別子は `com.lightlist.app` を正とする。
- iOS の AppIcon は `apps/web/public/brand/logo.svg` を元に、白背景の不透明な正方形 PNG として `apps/ios/Lightlist/Resources/Assets.xcassets/AppIcon.appiconset` の全スロットへ配置する。
- Android の launcher icon は `apps/web/public/icons/maskable-512.png` を正とし、70% に縮小して中央配置した素材から adaptive icon と density 別 mipmap を生成する。themed icon 用の monochrome layer は同じ意匠の単色 vector を使う。

## 主要コマンド

- ルート: `just deploy-firestore` / `just deploy-firestore-prod`
- Web: `cd apps/web && npm run dev`
- Web: `cd apps/web && npm run format && npm run lint && npm run build && npm run typecheck`
- iOS: `cd apps/ios && just build`
- iOS: `cd apps/ios && xcodegen generate`
- Android: `cd apps/android && just lint && just build`
- Android: `just android` は `apps/android` の debug build を端末へ上書きインストールして起動する。通常はアプリデータと Firebase Auth セッションを保持する。
- Android: 上書きインストールに失敗した場合のみ `just android` は `com.lightlist.app` をアンインストールしてから debug APK を入れ直す。この場合はアプリデータが消えるためログイン状態も消える。
- Android: 明示的にクリーン再インストールしたい場合は `cd apps/android && just run-clean` を使う。

## 品質確認

- 実装変更後の確認は、変更があった app だけ実行する。
- Web は `format` `lint` `build` `typecheck` を正本とする。
- iOS は `just build` を正本とする。
- Android は `just lint` と `just build` を正本とする。
- CI による品質ゲートは置かず、ローカル検証を正本とする。
