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
- Web は Vite multi-page app + React + TypeScript + Tailwind。
- Web の Vite HTML entry は `apps/web/html` に集約し、`apps/web/src` は React/TypeScript コード専用とする。
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

- Firebase 初期化、App Check 初期化、i18n、認証・設定・タスクリスト関連の Web runtime 実装は `apps/web/src/entry.tsx` に集約する。
- Web の状態購読は `apps/web/src/entry.tsx` の `AppStateProvider` を正とし、Auth / settings / taskLists は `Context + useEffect` で購読する。
- Web UI から `firebase/*` を直接 import せず、共通実装は `apps/web/src/entry.tsx` に集約する。
- Web の Vite root は `apps/web/html` とし、静的 asset は `apps/web/public`、env は `apps/web/.env*` を使う。
- Web の本番静的配信は Cloudflare Pages を正とし、Vite の `base` は `/`、build 出力は `apps/web/dist` を使う。
- Web の HTML entry は `apps/web/src/entry.tsx` 1 本を共通 bootstrap とし、各 HTML の `body[data-page]` で描画する page を切り替える。`apps/web/html/index.html` と `apps/web/html/404.html` / `500.html` は `../src/entry.tsx`、`apps/web/html/*/index.html` は `../../src/entry.tsx` を使う。Vite 設定の `/src` alias は維持する。
- Web 直下で管理対象にする route source は `html/*` と `src/entry.tsx` で、runtime `TS/TSX` は `entry.tsx` 1 ファイルに集約する。`apps/web/app` `apps/web/login` `apps/web/password_reset` `apps/web/sharecodes` のような直下 route 名ディレクトリは置かない。`dist` `.next` `node_modules` `*.tsbuildinfo` はローカル生成物として保持しない。
- Web の認証後シェルは `apps/web/src/entry.tsx` 内の app page 実装を単一入口とし、`/app/#/task-lists` を stack root、`/app/#/task-lists/:taskListId` を task list 詳細、`/app/#/settings` を設定画面として扱う。`/app/` は bootstrap alias として client mount 後に `#/task-lists` を積み、初期 task list があれば `#/task-lists/:taskListId` を push する。`/settings` の独立 route は持たない。mobile では tasklists root・detail・settings を同じシェル内の stack と横スライドで扱う。
- Web のトップページ（`/`）は `IndexPage` を正とし、`apps/web/public/brand/logo.svg` をブランドロゴに使う。旧ロゴは `apps/web/public/brand/logo_legacy.svg` と `shared/assets/brand/logo_legacy.svg` に退避する。LP は白背景を基調に、sticky header 内のロゴ・言語選択・`Login` ボタン、センター配置のヒーローコピー、大きいデスクトップ screenshot と重ねたモバイル screenshot、3 つの feature card、単色 CTA で構成する。
- 開発サーバーと本番 build は `vite` / `vite build` を使う。
- 本番レスポンスヘッダは配信基盤側で管理する。

## Native の前提

- iOS / Android は Firebase Auth / Firestore を直接使う。
- iOS の Firebase Auth callback と auth state listener から SwiftUI state を更新する処理は MainActor 上で行い、ログイン completion で `error` と `result` がともに空の場合も汎用認証エラーを表示する。
- locale の正本は `shared/locales/locales.json` とし、Web / iOS / Android はそれを各 app の local resource へ同期して参照する。
- iOS は `ContentView.swift` に `LightlistApp` / `RootView`、Firebase 初期化、UI、翻訳ロード、analytics helper を集約する。
- Android は `ContentView.kt` に `MainActivity` / `RootScreen`、UI、翻訳ロード、analytics helper を同居させる。
- Android app module は `BuildConfig.DEBUG` と `BuildConfig.PASSWORD_RESET_URL` を使うため `buildFeatures.buildConfig = true` を維持する。
- iOS / Android の識別子は `com.lightlist.app` を正とする。
- Android の Firebase 設定ファイルは build variant ごとに分け、debug は `apps/android/app/google-services.json`、release は `apps/android/app/src/release/google-services.json` を使う。
- Android の release APK は R8 縮小後も Firebase component registrar の no-arg constructor を保持する。`apps/android/app/proguard-rules.pro` の `ComponentRegistrar` keep ルールを削除しない。
- iOS の AppIcon は `shared/assets/brand/logo.svg` を元に、白背景の不透明な正方形 PNG として `apps/ios/Lightlist/Resources/Assets.xcassets/AppIcon.appiconset` の全スロットへ配置する。
- Android の launcher icon は `shared/assets/brand/maskable-512.png` を正とし、70% に縮小して中央配置した素材から adaptive icon と density 別 mipmap を生成する。themed icon 用の monochrome layer は同じ意匠の単色 vector を使う。

## 主要コマンド

- ルート: `just deploy-firestore` / `just deploy-firestore-prod`
- Web: `cd apps/web && npm run dev`
- Web: `cd apps/web && npm run format && npm run lint && npm run build && npm run typecheck`
- Web: `cd apps/web && npm run cf:preview`
- Web: `cd apps/web && npm run cf:deploy`
- iOS: `cd apps/ios && just build`
- iOS: `cd apps/ios && xcodegen generate`
- Android: `cd apps/android && just lint && just build`
- Android: `cd apps/android && just build-release`
- Android の `just build-release` は内部配布確認用の署名済み release APK（`app/build/outputs/apk/release/app-release.apk`）を生成する。Play Store 提出用の正式 release 署名ではない。
- Android: `just android` は `apps/android` の debug build を端末へ上書きインストールして起動する。通常はアプリデータと Firebase Auth セッションを保持する。
- Android: 上書きインストールに失敗した場合のみ `just android` は `com.lightlist.app` をアンインストールしてから debug APK を入れ直す。この場合はアプリデータが消えるためログイン状態も消える。
- Android: 明示的にクリーン再インストールしたい場合は `cd apps/android && just run-clean` を使う。

## 品質確認

- 実装変更後の確認は、変更があった app だけ実行する。
- Web は `format` `lint` `build` `typecheck` を正本とする。
- iOS は `just build` を正本とする。
- Android は `just lint` と `just build` を正本とする。
- CI による品質ゲートは置かず、ローカル検証を正本とする。
