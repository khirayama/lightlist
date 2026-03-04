# 開発コマンド

## ルート（モノレポ）

- `npm run dev`: 全ワークスペースの開発サーバー起動
- `npm run build`: 全ワークスペースのビルド
- `npm run format`: 全ワークスペースの整形
- `npm run lint`: 全ワークスペースの lint
- `npm run knip`: 未使用の依存関係・export・ファイル検出
- `npm run typecheck`: 全ワークスペースの型チェック
- `npm run deploy:firestore`: SDK の Firestore ルール/インデックスをデプロイ（dev）
- `npm run deploy:firestore:prod`: SDK の Firestore ルール/インデックスをデプロイ（prod）

## 依存関係運用（React系）

- `react` / `react-dom` / `@types/react` / `@types/react-dom` はルート `package.json` の `overrides` で固定しない。
- `apps/web` と `apps/native` がそれぞれの `package.json` で React 系バージョンを管理する。
- 共有ライブラリ（`packages/sdk`）は React を `peerDependencies` として要求し、利用側アプリが実体を提供する。

## agentドキュメント運用

- `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` は、作業ごとの進捗ではなく、今後も使う運用ルール・手順・コマンド・構成情報を蓄積するためのドキュメントとして扱う。
- 作業完了時に再利用価値のある恒久知見が増えた場合は更新する。
- `AGENTS.md` を正本とし、`CLAUDE.md` / `GEMINI.md` は要点を揃えて追従する。

## apps/web

- `cd apps/web`
- `npm run dev`
- `npm run build`
- `npm run build:prod`
- `npm run format`
- `npm run lint`
- `npm run start`
- `npm run start:prod`
- `npm run typecheck`

## apps/native

- `cd apps/native`
- `npm run dev`（Expo Go / Tunnel）
- `npm run dev:lan`（Expo Go / LAN）
- `npm run dev:local`（Expo Go / Localhost）
- `npm run start`（Expo Go / Tunnel）
- `npm run start:lan`（Expo Go / LAN）
- `npm run start:local`（Expo Go / Localhost）
- `npm run android`
- `npm run ios`
- `npm run format`
- `npm run lint`
- `npm run typecheck`

## packages/sdk

- `cd packages/sdk`
- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run deploy:firestore`
- `npm run deploy:firestore:prod`

## 本番デプロイ準備（web）

- `apps/web/.env.prod` を用意する
- `npm run build:prod`: `.env.prod` を `.env.production` にコピーしてビルド
- `npm run start:prod`: `.env.prod` を `.env.production` にコピーして起動
- 必要な環境変数は `docs/AUTHENTICATION.md` を参照する
- `NEXT_PUBLIC_PASSWORD_RESET_URL` は必須。`localhost` は本番設定として使用しない

## 品質ゲート

- 各 workspace の `lint` は `eslint . --max-warnings=0` を実行する
- CI は `.github/workflows/quality.yml` で `npm run lint` / `npm run typecheck` / `npm run build` を実行する

## Production Readiness 方針（2026-03）

- 共有権限モデル（共有URLを知っている未認証ユーザーの閲覧・編集を許可）は現行仕様として維持する
- production readiness 評価で挙がった「認可モデル再設計（item1）」は現時点で対応不要とし、この方針を仕様として固定する
- `next/font/google` はビルド時に外部取得が必要なため、Web build にはネットワーク到達性が前提となる

## Firestore 購読

- `taskListOrder` のスナップショット更新時に、購読対象の `taskLists` を再計算して購読を更新する
- `taskLists` は `memberCount` で保持ユーザー数を管理する。`addSharedTaskListToOrder` で `+1`、`deleteTaskList`（一覧から外す）で `-1` し、0 になった場合のみリスト実体を削除する

## 状態管理の最適化 (SDK)

- `appStore.commit()` は `user` / `taskListOrderUpdatedAt` / `settings` / `taskLists` / `sharedTaskListsById` を段階的に比較し、変更がない場合はリスナー通知をスキップします。
- `transform` は `taskListOrder`・`settings`・各 `taskList` の変換結果をキャッシュし、入力参照が同一のときは再計算と参照再生成を避けます。
- `taskLists` の Firestore 同期は `snapshot.docChanges()` を使って差分適用し、削除されたドキュメントもストアから除去します。

## エラーハンドリングとロギング

- SDK (`packages/sdk/src/store.ts`) 内の Firestore リスナー (`onSnapshot`) には、必ずエラーコールバックを設定する。
- エラーコールバックでは、`logSnapshotError` ヘルパーなどを使用して、以下の情報を構造化ログとして出力する：
  - エラー発生箇所（コンテキスト）
  - エラーコード (`code`)
  - エラーメッセージ (`message`)
  - 発生時のユーザー情報（UID, Email）
- これにより、長時間放置後のトークン期限切れやネットワーク切断による権限エラー (`permission-denied` 等) を特定しやすくする。
- Webアプリ (`apps/web`) では `ErrorBoundary` コンポーネントを使用し、予期せぬエラーによる画面のホワイトアウト（White Screen of Death）を防ぐ。

## 未使用コード検出

- ルートの `knip.json` でワークスペースごとのエントリを定義し、`npm run knip` で未使用コードを検出する。
- コンポーネント内でのみ利用する型・interfaceは `export` せず、ファイルローカル定義にする。
- `apps/native` の `babel.config.js` / `metro.config.js`、`apps/web/public/sw.js`、`packages/sdk/src/firebase/index.native.ts` は慣習的エントリとして検査対象に含める。
- Expo 設定ファイル由来の `unlisted` は `knip.json` の `ignoreIssues` で管理する。

## 起動性能の実装方針（web）

- `/app` は `taskListOrderUpdatedAt` を待って全画面スピナーを維持しない。認証確認後はシェルを先に表示し、タスクリスト同期中はコンテンツ領域のみローディングを表示する。
- `TaskListCard` / `DrawerPanel` / `Carousel` / `ConfirmDialog` は `next/dynamic` で遅延ロードし、初期バンドル評価を分散する。
- ランディングページ (`/`) は `getServerSideProps` を使わず静的配信し、言語切り替えはクエリ (`?lang=`) をクライアント側で同期する。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。i18next の `fallbackLng` は `ja` を使用する。
- `apps/web/src/locales/*.json` と `apps/native/src/locales/*.json` は同一キー構造を維持し、英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- Web は `document.documentElement.lang` と `document.documentElement.dir` を言語に同期する。`ar` は `dir="rtl"`、それ以外は `dir="ltr"`。
- Web の `Carousel` は `direction` prop（`ltr` / `rtl`）で表示方向を受け取り、`scrollLeft` をブラウザ差分（positive/negative）込みで正規化して index を算出する。RTL では index 0 を右端に配置し、外部 index は配列順のまま扱う。
- Native は言語設定に応じて LTR/RTL を即時に切り替える。再起動は不要。
- Native の方向判定は `I18nManager` ではなく `settings.language` 由来の `uiDirection` を使用し、Expo Go / Development Build / 本番で同一挙動にする。
- Native の `Carousel` は `react-native-pager-view` の `layoutDirection` を `uiDirection` で制御し、方向変更時は `key` 再マウントと `setPageWithoutAnimation` で現在 index を再同期する。
- フォントは `_document.tsx` の外部 CSS 読み込みを廃止し、`_app.tsx` の `next/font/google` に統一する。Portal 配下の UI も `font-sans` が同じ変数を参照できるよう、`body` にフォント変数クラスを付与する。

## アクセシビリティ監査

- Web の手動確認対象ページ: `/login` / `/app` / `/settings` / `/password_reset` / `/sharecodes/[sharecode]`
- Web の確認項目:
  - キーボードのみで主要操作が完結できる（スキップリンク、フォーム、ダイアログ、カルーセル切り替え）
  - スキップリンクから `main#main-content` に移動できる
  - エラー通知は即時、成功/情報通知は過剰に割り込まず読み上げられる
  - 非表示カルーセルスライドがスクリーンリーダーで優先的に読まれない
- Web の自動監査運用:
  - 開発サーバー起動後に Lighthouse の Accessibility を主要ページで確認する
  - axe 系ツール（ブラウザ拡張、または Playwright/axe の手元スクリプト）で重大な violation がないことを確認する
- Native の手動確認項目:
  - VoiceOver（iOS）/ TalkBack（Android）で主要画面を確認する
  - カスタム `Pressable` 追加時は `accessibilityRole` / `accessibilityLabel` / `accessibilityState` の3点を必ず確認する
