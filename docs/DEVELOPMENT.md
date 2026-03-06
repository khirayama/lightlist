# 開発

## モノレポ

- npm workspaces + Turbo を使います。
- workspace は `apps/web`、`apps/native`、`packages/sdk` です。

## コマンド

- ルート
  - `npm run dev`
  - `npm run build`
  - `npm run format`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run deploy:firestore`
  - `npm run deploy:firestore:prod`
- Web
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run typecheck`
- Native
  - `npm run dev`
  - `npm run dev:lan`
  - `npm run dev:local`
  - `npm run lint`
  - `npm run typecheck`
- SDK
  - `npm run build`
  - `npm run dev`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run deploy:firestore`
  - `npm run deploy:firestore:prod`

## React 依存

- `react` / `react-dom` / `@types/react*` は各 app が管理します。
- ルート `overrides` で React 系は固定しません。
- SDK は `react` を `peerDependencies` で要求します。

## Web 実装上の前提

- `@lightlist/sdk` は `packages/sdk/dist` を配布境界にした workspace package として扱います。
- Web / Native は起動エントリで `initializeSdk()` を呼び、公開 env を SDK へ明示的に渡します。
- `next/font/google` を使うため、Web build はネットワーク到達性が前提です。
- Next.js の環境変数は標準の `.env.production` / `.env.production.local` または deploy 環境変数で供給します。build/start 前に `.env` をコピーしません。
- i18n の言語検出順は `querystring -> localStorage -> navigator -> htmlTag` です。
- `document.documentElement.lang` と `dir` は現在言語へ同期します。

## Native 実装上の前提

- Expo Go を基本にします。
- 起動モードの比較が必要な場合だけ `dev:lan` / `dev:local` を使います。
- `APP_ENV` で app name、bundle id、deep link scheme を切り替えます。
- `APP_ENV` ごとの設定は [app.config.ts](/home/khirayama/Works/lightlist-poc/apps/native/app.config.ts) の typed config map で管理します。

## Turbo 実行順

- `build` は依存 workspace の `build` を先に実行します。
- `dev` は依存 workspace の `build` を先に実行した上で persistent task を起動します。
- `typecheck` は依存 workspace の `build` と `typecheck` を先に実行します。
- `lint` は source を直接検査し、`build` には依存しません。

## 品質ゲート

- `lint` は各 workspace で `eslint . --max-warnings=0` です。
- CI は `build`、`lint`、`typecheck`、`npm audit --audit-level=high` を前提にします。

## 固定仕様

- 共有 URL を知っている未認証ユーザーの閲覧・編集を許可する認可モデルを維持します。
- `apps/web/src/locales/*.json` と `apps/native/src/locales/*.json` は同一キー構造を保ちます。
- agent ドキュメントは恒久的な運用知識だけを書き、進捗や一時メモは書きません。
