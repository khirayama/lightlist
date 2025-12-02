# Repository Guidelines

- 必ず日本語で回答してください。
- 計画を確実に一つずつ進行して欲しいです。小さな変更を積み重ねて、最終的な目標を達成してください。大きな変更は避け、段階的に進めることを心がけてください。段階を進めるごとに達成できているか確認しながら進めてください。

- 常にcontext7とserenaを利用してください
- コメントは不要です。
- テストは不要です。
- 後方互換性は考慮する必要はありません。

- 実装方針
  - できるだけ素直で見通しがよく、正常系と主要なエラー処理にフォーカスした実戦投入レベルのシンプルな実装を心がけてください。
  - ファイルや関数は基本的に分割しないでください。完全に役割・振る舞いが同じときのみ、分割してまとめるようにしてください。
  - シンプル化は思い切りよく行ってください。不要になった処理や関数、ファイルの削除も積極的に行ってください。
  - 不必要なライブラリの利用は避ける一方、利用を決めたライブラリはしっかり活用してください。
- コード品質
  - 素直で見通しがよく、可読性が高いこと
  - 冗長なコードは避け、明瞭で簡潔であること
  - スタイルは一貫性を優先し、プロジェクト全体で統一されていること
- TypeScriptの扱い
  - TypeScriptを使用し、型を厳密に定義してください。
  - anyやunknownの使用は避け、可能な限り具体的な型を定義してください。
- コミット
  - コミットは明確な指示がない限り、勝手に行わないでください。
  - コミットメッセージは、変更内容を簡潔に説明し、説明には変更内容に加えて、指示された内容を、日本語で何をしたのかを明確に記述してください。コンベンショナルコミットのようなプレフィックスは使用しないでください。
- その他
  - 作業終了後、確認作業として、変更内容を分析した上で評価し、改めて無駄な変数や関数、ファイル分割が行われていないか、問題ないことを確認してください。
  - 確認作業後、Prettierでコードを整形してください。npm run buildとtype checkを行い、エラーがないことを確認してください。
  - 変更を加えたら、docs配下のファイルに可能な限り細かく変更を適用してください。特に実装との整合性を保つため、ドキュメントの更新は非常に重要です。進捗状況は含まないでください。変更する際は、既存のドキュメントを参考にし、書き方やフォーマットを統一してください。

## PRODUICT & DESIGN

- テーマ(システム、ライト、ダーク)の設定を前提に、アプリケーションのスタイルを柔軟に変更できるようにしてください。
- 多言語対応を前提に、アプリケーションのテキストはすべてi18nextを使用して管理してください。
- Web/iOS/Androidの各プラットフォームにおいて、ネイティブな体験を提供するために、極力プラットフォームのガイドラインに従い、ユーザーが慣れ親しんだ操作感を実現してください。そのための差異は、必要に応じて許容されます。
- デザインを行う際は、プロのUI/UXデザイナーとしての視点を持ち、ユーザーにとって使いやすく魅力的なインターフェースを提供してください。
- 極力シンプルでクリーンなUIを心がけ、ユーザーが直感的に操作できるようにしてください。
- アクセシビリティを意識し、色覚対応、キーボード操作、読み上げへの配慮を必ず行ってください。

## Project Structure & Module Organization
- Monorepo managed by Turbo (`turbo.json`) with npm workspaces.
- App code lives in `apps/web` (Next.js pages router, TypeScript, Tailwind); shared SDK for Firebase Auth/Firestore lives in `packages/sdk` with exports in `package.json`.
- Reusable components, utilities, and translations are under `apps/web/src/{components,utils,lib,locales}`. Import app code via `@/*` and SDK code via `@lightlist/sdk/*`.
- Reference background docs in `docs/` (e.g., authentication flow) before changing domain logic.

## Build, Test, and Development Commands
- `npm run dev` — runs `turbo run dev`; by default starts `apps/web` locally at http://localhost:3000.
- `npm run build` — Turbo build; runs `next build` for the web app and any package `build` tasks.
- `npm run format` — Prettier write across workspaces.
- `npm run deploy:firestore` — deploys Firestore rules/indexes from `packages/sdk` (requires Firebase CLI auth).
- Inside a workspace you can scope commands, e.g., `cd apps/web && npm run dev`.

## Coding Style & Naming Conventions
- TypeScript with `strict` mode; favor typed props and return values instead of `any`.
- Prettier is the source of truth; keep the default 2-space indentation, double quotes, and semicolons. Run before pushing.
- React components and files use PascalCase (`FormInput.tsx`); helper functions/constants use `camelCase`/`SCREAMING_SNAKE_CASE`.
- Prefer functional components with hooks; keep Firebase interactions inside `@lightlist/sdk` rather than directly in the app.
- Keep UI class composition readable (Tailwind + `clsx`/`cva`), grouping layout before state styles.

## Testing Guidelines
- No automated suite is wired yet. When adding tests, colocate them near code as `*.test.ts(x)` and add the command to workspace `package.json` plus Turbo.
- For auth flows, manually verify sign-in, sign-up, and password reset against the configured Firebase project before merging.
- Add sanity checks for regression-prone pieces (validation, error mapping in `apps/web/src/utils`).

## Commit & Pull Request Guidelines
- Follow the existing history style: short, imperative summaries (e.g., “Add auth reset flow”).
- PRs should include: scope/intent summary, linked issue/task, screenshots or recordings for UI changes, and manual test notes.
- Keep changes focused and small; call out schema/config updates (Firebase rules, environment keys) explicitly in the description.

## Security & Configuration
- Firebase config sits in `apps/web/.env.local`; use `.env.local` for local overrides and avoid committing real secrets.
- Deploys and emulator work require Firebase CLI auth (`firebase login`); be mindful of target project IDs before running deploy commands.
