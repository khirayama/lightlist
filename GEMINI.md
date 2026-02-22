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
3. 変更後は `docs/` と agent ドキュメントを実装に合わせて更新する。
4. 最後に `npm run format` → `npm run build` → `npm run typecheck` を実行する。
5. 明示指示がない限りコミットしない。

## 5. 主要コマンド

- ルート: `npm run dev` / `npm run build` / `npm run format` / `npm run typecheck`
- Web: `cd apps/web && npm run dev`
- Native: `cd apps/native && npm run dev`
- SDK: `cd packages/sdk && npm run deploy:firestore`
