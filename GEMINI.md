# Gemini CLI Guidelines for lightlist-poc

## 1. 基本行動

- 日本語で回答する。
- 段階的に進め、1ステップずつ確認する。
- `context7` と `serena` を必ず利用する。
- 破壊的変更は事前確認を行う。

## 2. 実装ルール

- シンプルで見通しの良い実装を優先する。
- コメント追加は不要、テスト追加は不要、後方互換性は考慮不要。
- TypeScript を厳密に扱い、`any` / `unknown` を避ける。
- i18next による文言管理とテーマ（system/light/dark）対応を維持する。
- `apps/native` の依存更新後（特に `npm audit fix --force` 後）は `npx expo install --check` を実行し、不整合時は `npx expo install --fix` で Expo SDK 互換版へ再整列する。

## 3. 現在の構成

- モノレポ: Turbo + npm workspaces
- React系依存は app ごとに管理し、共有ライブラリ（`packages/sdk`）は `react` を `peerDependencies` で要求する。
- `packages/sdk` は `dist` 配布の workspace package として扱い、apps から `packages/sdk/src/*` を直接参照しない。公開 env が必要な SDK 初期化は apps の entry で `initializeSdk()` に渡す。
- Firebase 初期化は `packages/sdk/src/firebase/` の内部実装に限定し、apps は `firebase/*` と `@lightlist/sdk/firebase` を import しない。認証・設定・タスクリストの購読は `@lightlist/sdk/session` / `@lightlist/sdk/settings` / `@lightlist/sdk/taskLists` を使い、apps から `@lightlist/sdk/store` を直接 import しない。
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は `taskListOrder` からの離脱を基本とする（`memberCount` が 0 のときのみ実体削除）。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を固定仕様とし、production readiness 評価の item1（認可モデル再設計）は 2026-03 時点で対応不要とする。
- パスワードリセットURLは `NEXT_PUBLIC_PASSWORD_RESET_URL`（Web）または `EXPO_PUBLIC_PASSWORD_RESET_URL`（Native）が必須。prod 設定で `localhost` を使わない。
- Native のディープリンク scheme は `APP_ENV` ごとに `lightlist` / `lightlist-staging` / `lightlist-dev` を使う。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。
- `apps/web/src/locales/*.json` と `apps/native/src/locales/*.json` は同一キー構造を維持し、英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- Web は言語切替時に `document.documentElement.lang` と `dir` を同期する。`ar` は RTL、それ以外は LTR。
- Web の `StartupSplash` は hydration mismatch 回避のため、読み上げラベルを i18n の初期言語解決に依存させず固定文字列（`読み込み中`）で扱う。
- Web の `Carousel` は `direction` prop で方向を受け取り、RTL 時の `scrollLeft` はブラウザ差分を正規化して index を管理する。
- Native は言語設定に応じて LTR/RTL を即時に切り替える。再起動は不要。
- Native の方向判定は `I18nManager` ではなく `settings.language` 由来の `uiDirection` を使用し、Expo Go / Development Build / 本番で同一挙動にする。
- Native の `Carousel` は `uiDirection` 変更時に `PagerView` を再マウントし、`setPageWithoutAnimation(currentIndex)` で index 同期を維持する。
- `apps/web`: Next.js Pages Router
  - 認証: `apps/web/src/pages/login.tsx`
  - 共有: `apps/web/src/pages/sharecodes/[sharecode].tsx`
- `apps/native`: Expo + React Native + NativeWind
- `packages/sdk`: Firebase Auth / Firestore と共通ロジック
- Web の本番 env は Next.js 標準の `.env.production` / `.env.production.local` または deploy 環境変数で供給し、build/start 前に `.env` をコピーしない。

## 4. 作業フロー

1. 実装コードを先に確認し、実装を正として判断する。
2. 小さな単位で修正する。
3. 変更後は `docs/` を実装に合わせて仕様として更新する。
4. 作業完了時に、恒久的に再利用できる知見（ルール、手順、コマンド、構成差分）が増えた場合は `AGENTS.md` を先に更新し、必要に応じて `GEMINI.md` / `CLAUDE.md` へ反映する。
5. 進捗報告やタスク固有メモは agent ドキュメントに書かない。
6. 最後に `npm run format` → `npm run build` → `npm run typecheck` を実行する。
7. 明示指示がない限りコミットしない。

## 5. 主要コマンド

- ルート: `npm run dev` / `npm run build` / `npm run format` / `npm run typecheck`
- Web: `cd apps/web && npm run dev`
- Native: `cd apps/native && npm run dev`
- SDK: `cd packages/sdk && npm run build`
