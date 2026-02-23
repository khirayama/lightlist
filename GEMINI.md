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

## 3. 現在の構成

- モノレポ: Turbo + npm workspaces
- `apps/web`: Next.js Pages Router
  - 認証: `apps/web/src/pages/login.tsx`
  - 共有: `apps/web/src/pages/sharecodes/[sharecode].tsx`
- `apps/native`: Expo + React Native + NativeWind
- `packages/sdk`: Firebase Auth / Firestore と共通ロジック

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
- SDK: `cd packages/sdk && npm run deploy:firestore`
