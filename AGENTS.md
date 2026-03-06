# Repository Guidelines

## 基本方針

- 回答・説明・コミットメッセージは日本語で記述する。
- 小さな変更を段階的に進め、各段階で達成を確認する。
- 必ず `context7` と `serena` を活用し、推測ではなく実装事実を根拠に判断する。
- コメント追加は不要。テスト追加は不要。後方互換性は考慮不要。
- 変更後は `docs/` を実装に合わせて更新し、進捗報告ではなく仕様として記述する。
- agent 向けドキュメント（`AGENTS.md` / `CLAUDE.md` / `GEMINI.md`）は作業で得た恒久的な知見を蓄積する場所として扱い、完了時に必要な更新があれば行う。

## 実装スタンス

- 実装はシンプルで見通しよく、正常系と主要エラー処理に集中する。
- 不要な抽象化や過剰な分割は避け、冗長コードは削除する。
- TypeScript で厳密に型付けし、`any` / `unknown` は極力使わない。
- UI は i18next 前提・テーマ（system/light/dark）前提で実装する。
- Web/iOS/Android で自然な操作感を優先し、アクセシビリティ（色覚、キーボード、読み上げ）に配慮する。

## Agentドキュメント運用

- `AGENTS.md` を運用ルールの正本とし、`CLAUDE.md` / `GEMINI.md` は要点を揃えて整合させる。
- 作業完了時に、今回の変更で再利用価値のある恒久ルール・手順・コマンド・構成差分が増えた場合は、agent ドキュメントを更新する。
- 一時的な調査メモ、進捗報告、タスク固有の事情は agent ドキュメントに書かない。
- 更新判断に迷う場合は「次回以降の別タスクでも参照価値があるか」で判断する。

## プロジェクト構成

- モノレポ: npm workspaces + Turbo (`turbo.json`)
- React系依存（`react` / `react-dom` / `@types/react*`）は各 app (`apps/web`, `apps/native`) で管理し、ルート `overrides` では固定しない。共有ライブラリ (`packages/sdk`) は React を `peerDependencies` で要求する。
- `packages/sdk` は `src` を `dist` へ build して apps へ配布する workspace package として扱う。apps から `packages/sdk/src/*` への path alias や source 直参照を足さない。公開 env が必要な SDK 初期化は apps の entry で `@lightlist/sdk/config` の `initializeSdk()` に渡す。
- Firebase 初期化モジュールは `packages/sdk/src/firebase/` に閉じ込め、apps は `firebase/*` と `@lightlist/sdk/firebase` を import しない。認証・設定・タスクリストの購読は `@lightlist/sdk/session` / `@lightlist/sdk/settings` / `@lightlist/sdk/taskLists` を使い、apps から `@lightlist/sdk/store` を直接 import しない。
- Web: `apps/web`（Next.js Pages Router + TypeScript + Tailwind）
- Native: `apps/native`（Expo + React Native + NativeWind）
- SDK: `packages/sdk`（Firebase Auth/Firestore、共通状態管理・ミューテーション）
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は「`taskListOrder` から外す」を基本とする。`memberCount` が 0 になった場合のみ `taskLists` 実体を削除する。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を仕様として固定する。production readiness 評価で挙がった認可モデル再設計（item1）は 2026-03 時点で対応不要とする。
- パスワードリセットURLは `NEXT_PUBLIC_PASSWORD_RESET_URL`（Web）または `EXPO_PUBLIC_PASSWORD_RESET_URL`（Native）が必須。未設定時はエラー。prod 設定で `localhost` を使わない。
- Native のディープリンク scheme は `APP_ENV` に応じて `lightlist` / `lightlist-staging` / `lightlist-dev` を使う。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。
- `apps/web/src/locales/*.json` と `apps/native/src/locales/*.json` は同一キー構造を維持し、英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- Web は言語切替時に `document.documentElement.lang` と `dir` を同期する。`ar` は RTL、それ以外は LTR。
- Web の `StartupSplash` は hydration mismatch を避けるため、読み上げラベルを i18n の初期言語解決に依存させず固定文字列（`読み込み中`）で扱う。
- Web の `Carousel` は `direction` prop を必須運用し、RTL 時の `scrollLeft` はブラウザ差分（positive/negative）を正規化して index を算出する。
- Native は言語設定に応じて LTR/RTL を即時に切り替える。再起動は不要。
- Native の方向判定は `I18nManager` ではなく `settings.language` 由来の `uiDirection` を使用し、Expo Go / Development Build / 本番で同一挙動にする。
- Native の `Carousel` は `uiDirection` 変更時に `PagerView` を再マウントし、`setPageWithoutAnimation(currentIndex)` で外部 index と表示ページを再同期する。
- Web の主要ページ:
  - `apps/web/src/pages/index.tsx`（ランディング）
  - `apps/web/src/pages/login.tsx`（サインイン/サインアップ/リセット依頼）
  - `apps/web/src/pages/app.tsx`
  - `apps/web/src/pages/settings.tsx`
  - `apps/web/src/pages/password_reset.tsx`
  - `apps/web/src/pages/sharecodes/[sharecode].tsx`
  - `apps/web/src/pages/404.tsx`（カスタム404ページ）
  - `apps/web/src/pages/500.tsx`（カスタム500ページ）
- 共通 import:
  - Web アプリ内: `@/*`
  - SDK: `@lightlist/sdk/*`
- Analytics/Crashlytics の実装詳細は `packages/sdk/src/analytics/` に隠蔽し、apps は `@lightlist/sdk/analytics` 経由で利用する。PII をパラメータに含めない。
  - Web 実装: `index.ts`（`firebase/analytics`）
  - Native 実装: `index.native.ts`（`@react-native-firebase/analytics` + Expo Go 条件分岐）
  - `packages/sdk/tsconfig.json` は `**/*.native.ts` を `exclude` に含め、Web typecheck で Native 専用モジュールのエラーを回避する。
  - `@react-native-firebase/*` は `packages/sdk/dependencies` に含め、apps からの追加インストールは不要。ただし Native ビルド設定には `apps/native/app.config.ts` の `plugins` 追加が必要。`@react-native-firebase/app` と `@react-native-firebase/crashlytics` のみ `app.plugin.js` を持つため plugins に記載する。`@react-native-firebase/analytics` は `app.plugin.js` がないため plugins に含めない（含めると `PluginError` になる）。
  - イベント設計・関数一覧は `docs/ANALYTICS.md` を参照。

## 主要コマンド

- ルート:
  - `npm run dev`（`turbo run dev`。依存 workspace の build 後に `apps/web` / `apps/native` と必要な watcher を起動）
  - `npm run build`
  - `npm run format`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run deploy:firestore`
  - `npm run deploy:firestore:prod`
- `apps/web`:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run typecheck`
- `apps/native`:
  - `npm run dev`
  - `npm run dev:lan`
  - `npm run dev:local`
  - `npm run lint`
  - `npm run typecheck`
  - `npx expo install --check`（依存更新後の Expo SDK 互換性確認）
  - `npx expo install --fix`（`npm audit fix --force` 等で Expo 互換性が崩れた場合の再整列）
- `packages/sdk`:
  - `npm run build`
  - `npm run dev`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run deploy:firestore`
  - `npm run deploy:firestore:prod`

## セキュリティ・品質ルール

- `console.error` にユーザーメール等の PII（個人識別情報）を含めない。`userEmail` は必ずログから除外する。
- `taskLists.ts` は `taskListOrder` 購読と taskList chunk 購読を別々に管理する。固定 index 前提の購読解除配列は持ち込まない。
- `ErrorBoundary` はクラスコンポーネントのため `withTranslation()` HOC で i18next を注入する（`useTranslation` フック不可）。
- CI（`.github/workflows/quality.yml`）の `npm audit --audit-level=high` は必須ステップ。削除しない。

## 作業完了チェック

1. 変更内容を見直し、無駄な変数・関数・分割がないことを確認する。
2. `docs/` を実装に合わせて更新し、仕様として記述する。
3. agent 向けドキュメント（`AGENTS.md` / `CLAUDE.md` / `GEMINI.md`）に恒久的な知見の追記・修正が必要か確認し、必要なら更新する。
4. `npm run format` を実行する。
5. `npm run build` と `npm run typecheck` を実行し、エラーがないことを確認する。
6. 明示指示がない限りコミットしない。
