# Gemini CLI Guidelines for lightlist-poc

このドキュメントは、Gemini CLI エージェントが本プロジェクトで作業する際の指針をまとめたものです。

## 1. 基本行動原則 (Core Principles)

- **言語**: 回答や説明はすべて**日本語**で行ってください。
- **進行**: 計画を立て、一つずつ確実に実行してください（Step-by-step）。大きな変更は避け、検証可能な単位で段階的に進めてください。
- **ツール活用**: `context7` や `serena` などの利用可能なツールを積極的に活用し、推測ではなく事実に基づいたコーディングを行ってください。
- **安全性**: 破壊的な変更を行う前には必ずユーザーの確認をとってください。

## 2. 技術スタックとプロジェクト構造 (Stack & Structure)

- **構成**: Turbo (`turbo.json`) を使用した Monorepo 構成 (npm workspaces)
  - `apps/web`: Next.js (Pages router), TypeScript, Tailwind CSS
  - `apps/native`: Expo (React Native), NativeWind v4
  - `packages/sdk`: Firebase Auth/Firestore, 共有ロジック
- **依存関係**: アプリ側のロジックは `@/*`、SDKのロジックは `@lightlist/sdk/*` でインポートします。

## 3. 実装ガイドライン (Implementation Guidelines)

- **シンプルさ**: 可読性を最優先し、"Keep It Simple" を心がけてください。過度な抽象化やファイル分割は避け、役割が完全に独立する場合のみ分割してください。
- **TypeScript**: 厳格な型定義を行ってください。`any` や `unknown` は避け、具体的な型定義を行ってください。
- **クリーンアップ**: 不要になったコードやファイルは積極的に削除し、技術的負債を残さないようにしてください。
- **スタイル**: プロジェクトの一貫性を重視し、既存のフォーマット（Prettier）や命名規則に従ってください。

## 4. プロダクト & デザイン (Product & Design)

- **i18n**: テキストはハードコードせず、必ず `i18next` (`locales/`) を使用して多言語対応してください。
- **テーマ**: ライト/ダークモードおよびシステム設定に対応し、柔軟にスタイルを変更できるようにしてください。
- **UX/UI**:
  - Web/iOS/Android それぞれのプラットフォームの慣習（Human Interface Guidelines / Material Design）を尊重してください。
  - プロのデザイナー視点で、シンプルかつクリーンで、アクセシビリティ（色覚、操作性）に配慮したUIを構築してください。

## 5. ワークフロー (Workflow)

1.  **理解**: タスク着手前に `docs/` 配下のドキュメントや関連コードを確認してください。
2.  **実装**: テストは必須ではありませんが、動作確認は確実に行ってください。
3.  **確認**: 作業完了後は、無駄な変更がないか自己レビューを行い、`npm run format` (Prettier) とビルド/型チェックを行ってください。
4.  **ドキュメント**: 実装に合わせて `docs/` 配下のドキュメントを更新してください。
5.  **コミット**: 明確な指示がない限り自動コミットは避け、コミットする場合は「何をしたか（日本語）」を簡潔に記述してください。

## 6. 主要コマンド (Commands)

- `npm run dev`: 開発サーバー起動
- `npm run build`: ビルド（Next.js およびパッケージ）
- `npm run format`: Prettierによるコード整形
- `npm run type-check`: 型チェック（各ワークスペース内）