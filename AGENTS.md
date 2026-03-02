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
- `packages/sdk` の `@lightlist/sdk/firebase` は package `exports` の `react-native` 条件で `src/firebase/index.native.ts` を解決し、Web では `src/firebase/index.ts` を解決する。
- Web: `apps/web`（Next.js Pages Router + TypeScript + Tailwind）
- Native: `apps/native`（Expo + React Native + NativeWind）
- SDK: `packages/sdk`（Firebase Auth/Firestore、共通状態管理・ミューテーション）
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は「`taskListOrder` から外す」を基本とする。`memberCount` が 0 になった場合のみ `taskLists` 実体を削除する。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を仕様として固定する。production readiness 評価で挙がった認可モデル再設計（item1）は 2026-03 時点で対応不要とする。
- パスワードリセットURLは `NEXT_PUBLIC_PASSWORD_RESET_URL`（Web）または `EXPO_PUBLIC_PASSWORD_RESET_URL`（Native）が必須。未設定時はエラー。prod 設定で `localhost` を使わない。
- Native のディープリンク scheme は `APP_ENV` に応じて `lightlist` / `lightlist-staging` / `lightlist-dev` を使う。
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

## 主要コマンド

- ルート:
  - `npm run dev`（`turbo run dev`。`apps/web` と `apps/native` の dev を起動）
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
  - `npm run typecheck`
  - `npm run lint`
  - `npm run deploy:firestore`
  - `npm run deploy:firestore:prod`

## セキュリティ・品質ルール

- `console.error` にユーザーメール等の PII（個人識別情報）を含めない。`userEmail` は必ずログから除外する。
- `store.ts` の `unsubscribers` 配列は 0 番目が settings、1 番目が taskListOrder の購読解除関数で固定。2 番目以降がタスクリスト用。`TASK_LIST_UNSUBSCRIBERS_START_INDEX = 2` 定数でインデックスを管理する。
- `ErrorBoundary` はクラスコンポーネントのため `withTranslation()` HOC で i18next を注入する（`useTranslation` フック不可）。
- CI（`.github/workflows/quality.yml`）の `npm audit --audit-level=high` は必須ステップ。削除しない。

## 作業完了チェック

1. 変更内容を見直し、無駄な変数・関数・分割がないことを確認する。
2. `docs/` を実装に合わせて更新し、仕様として記述する。
3. agent 向けドキュメント（`AGENTS.md` / `CLAUDE.md` / `GEMINI.md`）に恒久的な知見の追記・修正が必要か確認し、必要なら更新する。
4. `npm run format` を実行する。
5. `npm run build` と `npm run typecheck` を実行し、エラーがないことを確認する。
6. 明示指示がない限りコミットしない。
