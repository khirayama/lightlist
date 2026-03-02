# CLAUDE.md

## 必須ルール

- 日本語で回答する。
- 小さな変更を段階的に進め、各ステップで確認する。
- `context7` と `serena` を必ず使う。
- コメント追加は不要。テスト追加は不要。後方互換性は考慮不要。

## 実装方針

- 過度な抽象化を避け、素直で可読性の高い実装を優先する。
- 正常系と主要なエラー処理に集中する。
- TypeScript で厳密に型付けし、`any` / `unknown` の使用を避ける。
- 不要な処理・関数・ファイルは積極的に削除する。
- 文言は i18next で管理し、テーマ（system/light/dark）対応を維持する。
- `apps/native` の依存更新後（特に `npm audit fix --force` 後）は `npx expo install --check` で Expo SDK 互換性を確認し、不整合時は `npx expo install --fix` で再整列する。

## プロジェクト実態（2026-02）

- モノレポ: `apps/web`（Next.js）/ `apps/native`（Expo）/ `packages/sdk`（Firebase 共通ロジック）
- React系依存は `apps/web` / `apps/native` で個別管理し、`packages/sdk` は `react` を `peerDependencies` で要求する。
- `@lightlist/sdk/firebase` は package `exports` の `react-native` 条件で `src/firebase/index.native.ts`、それ以外で `src/firebase/index.ts` を解決する。
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は `taskListOrder` からの離脱を基本とする（`memberCount` が 0 のときのみ実体削除）。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を固定仕様とし、production readiness 評価の item1（認可モデル再設計）は 2026-03 時点で対応不要とする。
- パスワードリセットURLは `NEXT_PUBLIC_PASSWORD_RESET_URL`（Web）または `EXPO_PUBLIC_PASSWORD_RESET_URL`（Native）が必須。prod 設定で `localhost` を使わない。
- Native のディープリンク scheme は `APP_ENV` ごとに `lightlist` / `lightlist-staging` / `lightlist-dev` を使う。
- Web 認証ページ: `apps/web/src/pages/login.tsx`
- 共有ページ: `apps/web/src/pages/sharecodes/[sharecode].tsx`
- SDK の Firestore デプロイ: `packages/sdk` の `deploy:firestore` 系スクリプト

## agentドキュメント更新

- 作業完了時に再利用価値のある恒久的な知見（ルール、手順、コマンド、構成差分）が増えた場合は、まず `AGENTS.md` を更新する。
- `CLAUDE.md` は `AGENTS.md` の要点と矛盾しないように必要最小限で追従更新する。
- 進捗報告やタスク固有メモは書かない。

## 完了条件

1. 実装と `docs/` の整合を取る（進捗ではなく仕様として記述）。
2. agent ドキュメント（少なくとも `AGENTS.md`）に恒久知見の更新が必要か確認し、必要なら反映する。
3. `npm run format` を実行する。
4. `npm run build` と `npm run typecheck` を実行し、エラーなしを確認する。
5. 明示指示がない限りコミットしない。
