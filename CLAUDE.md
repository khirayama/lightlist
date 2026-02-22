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

## プロジェクト実態（2026-02）

- モノレポ: `apps/web`（Next.js）/ `apps/native`（Expo）/ `packages/sdk`（Firebase 共通ロジック）
- Web 認証ページ: `apps/web/src/pages/login.tsx`
- 共有ページ: `apps/web/src/pages/sharecodes/[sharecode].tsx`
- SDK の Firestore デプロイ: `packages/sdk` の `deploy:firestore` 系スクリプト

## 完了条件

1. 実装と `docs/` の整合を取る（進捗ではなく仕様として記述）。
2. `npm run format` を実行する。
3. `npm run build` と `npm run typecheck` を実行し、エラーなしを確認する。
4. 明示指示がない限りコミットしない。
