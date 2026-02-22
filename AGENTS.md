# Repository Guidelines

## 基本方針

- 回答・説明・コミットメッセージは日本語で記述する。
- 小さな変更を段階的に進め、各段階で達成を確認する。
- 必ず `context7` と `serena` を活用し、推測ではなく実装事実を根拠に判断する。
- コメント追加は不要。テスト追加は不要。後方互換性は考慮不要。
- 変更後は `docs/` を実装に合わせて更新し、進捗報告ではなく仕様として記述する。

## 実装スタンス

- 実装はシンプルで見通しよく、正常系と主要エラー処理に集中する。
- 不要な抽象化や過剰な分割は避け、冗長コードは削除する。
- TypeScript で厳密に型付けし、`any` / `unknown` は極力使わない。
- UI は i18next 前提・テーマ（system/light/dark）前提で実装する。
- Web/iOS/Android で自然な操作感を優先し、アクセシビリティ（色覚、キーボード、読み上げ）に配慮する。

## プロジェクト構成

- モノレポ: npm workspaces + Turbo (`turbo.json`)
- Web: `apps/web`（Next.js Pages Router + TypeScript + Tailwind）
- Native: `apps/native`（Expo + React Native + NativeWind）
- SDK: `packages/sdk`（Firebase Auth/Firestore、共通状態管理・ミューテーション）
- Web の主要ページ:
  - `apps/web/src/pages/index.tsx`（ランディング）
  - `apps/web/src/pages/login.tsx`（サインイン/サインアップ/リセット依頼）
  - `apps/web/src/pages/app.tsx`
  - `apps/web/src/pages/settings.tsx`
  - `apps/web/src/pages/password_reset.tsx`
  - `apps/web/src/pages/sharecodes/[sharecode].tsx`
- 共通 import:
  - Web アプリ内: `@/*`
  - SDK: `@lightlist/sdk/*`

## 主要コマンド

- ルート:
  - `npm run dev`（`turbo run dev`。`apps/web` と `apps/native` の dev を起動）
  - `npm run build`
  - `npm run format`
  - `npm run typecheck`
  - `npm run deploy:firestore`
  - `npm run deploy:firestore:prod`
- `apps/web`:
  - `npm run dev`
  - `npm run build`
  - `npm run typecheck`
- `apps/native`:
  - `npm run dev`
  - `npm run dev:lan`
  - `npm run dev:local`
  - `npm run typecheck`
- `packages/sdk`:
  - `npm run typecheck`
  - `npm run deploy:firestore`
  - `npm run deploy:firestore:prod`

## 作業完了チェック

1. 変更内容を見直し、無駄な変数・関数・分割がないことを確認する。
2. `docs/` と agent 向けドキュメント（`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`）を必要に応じて更新する。
3. `npm run format` を実行する。
4. `npm run build` と `npm run typecheck` を実行し、エラーがないことを確認する。
5. 明示指示がない限りコミットしない。
