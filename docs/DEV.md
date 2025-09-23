# 開発ガイド

## 目次

- [ディレクトリ構成](#ディレクトリ構成)
- [利用技術](#利用技術)
- [環境設定](#環境設定)
- [開発](#開発)

## ディレクトリ構成

```text
.
├── apps/
│   ├── api/                    # Node.js/Express API サーバー
│   └── native/                 # React Native/Expo モバイルアプリ
├── packages/                   # 共通ライブラリやコンポーネント
│   └── sdk/                    # 共通SDKライブラリ(APIラッパーな側面が強い)
├── docs/                       # ドキュメント
├── .prettierrc                 # Prettier 設定
├── turbo.json                  # Turborepo 設定
└── package.json                # ルート package.json (ワークスペース)
```

## 利用技術

### apps/api

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- Zod
- JWT (jsonwebtoken)
- bcryptjs
- express-rate-limit
- express-validator
- helmet
- cors
- Prettier
- Vitest
- Supertest
- Docker Compose

### apps/native

- React Native
- TypeScript
- Expo
- NativeWind（Tailwind CSSライクなスタイリング）
- Expo Router
- i18next
- Prettier
- Vitest

NativeWind設定：

- packages/stylesの共通Tailwind設定を使用
- babel.config.jsでnativewind/babelプラグインを設定
- metro.config.jsでwithNativeWindを設定
- src/styles/global.cssでTailwindディレクティブを設定

## 環境設定

### 前提条件

- Node.js 18+
- Docker Desktop
- npm

**注意:** Supabase CLIはプロジェクトのdevDependenciesに含まれているため、グローバルインストールは不要です。

### 初期セットアップ

1. 依存関係のインストール

   ```bash
   npm install
   ```

2. 環境ファイルのセットアップ

   ```bash
   npm run setup
   ```

   このコマンドは以下を実行します：
   - apps/api: .envファイル作成
   - apps/native: .envファイル作成

3. データベースのセットアップ

   ```bash
   # 開発用データベースの起動とセットアップ（推奨）
   npm run setup:dev

   # または個別に実行
   npm run supabase:start    # Supabaseローカル環境起動
   npm run db:setup          # スキーマ適用とクライアント生成
   ```

### データベース管理

#### Supabaseローカル環境

```bash
# Supabaseローカル環境の起動
npm run supabase:start

# Supabaseローカル環境の停止
npm run supabase:stop

# データベースのリセット（全データ削除・再作成）
npm run supabase:reset

# Supabaseローカル環境の状態確認
npm run supabase:status

# スキーマ適用とPrismaクライアント生成
npm run db:setup

# 開発用環境の完全セットアップ
npm run setup:dev
```

#### Supabase Studio（管理画面）

Supabaseローカル環境が起動していると、以下でアクセス可能：

- URL: http://localhost:54323
- データベース管理、認証設定、ユーザー管理が可能

#### セットアップオプション

```bash
# 最小セットアップ（環境ファイルのみ）
npm run setup

# 開発環境の完全セットアップ
npm run setup:dev
```

### 環境変数

#### apps/api/.env

```env
# Database (Supabase Local)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?schema=public"

# Server
PORT=3001
NODE_ENV=development

# Supabase Local
SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Rate Limiting
API_RATE_LIMIT_MAX=100
API_RATE_LIMIT_WINDOW_MS=900000
```

#### apps/native/.env

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

## 開発

### 開発サーバーの起動

```bash
# 全体開発サーバー起動（推奨）
npm run dev
```

これにより、以下のサーバーが同時に起動します：

- APIサーバー: http://localhost:3001
- Nativeアプリ: http://localhost:8081

**注意:** 開発前に必ずSupabaseローカル環境を起動してください：

```bash
npm run supabase:start
```

起動後、以下のURLでアクセス可能：

- Supabase API: http://localhost:54321
- Supabase Studio: http://localhost:54323
- PostgreSQL: localhost:54322

### 個別起動

```bash
# APIサーバーのみ
npm run dev --filter=@lightlist/api

# モバイルアプリのみ
npm run dev --filter=@lightlist/native
```

### その他のコマンド

```bash
# ビルド（全パッケージ）
npm run build

# テスト実行
npm run test

# Lint & 型チェック
npm run check

# クリーンアップ
npm run clean
```

### テスト実行

#### 通常のテスト実行

```bash
# 全テストを実行（Supabaseローカル環境使用）
npm run test

# APIのテストのみ実行
npm run test --filter=@lightlist/api
```

#### テスト用環境の事前準備

テストを実行する前にSupabaseローカル環境を起動：

```bash
# 1. Supabaseローカル環境を起動
npm run supabase:start

# 2. データベースのマイグレーション
npm run db:setup

# 3. テスト実行
npm run test --filter=@lightlist/api
```

#### 環境変数オプション

- Supabaseローカル環境では開発・テスト環境が統一
- テスト実行時にもPrismaマイグレーションが自動適用

### Nativeアプリのプラットフォーム別起動

```bash
cd apps/native

# iOSシミュレーター
npm run ios

# Androidエミュレーター
npm run android
```

### テスト実行の詳細

#### 統合テストの並列実行

packages/sdkの統合テストは並列実行に対応しており、実行時間を大幅に短縮できます。

```bash
# 並列統合テストの実行（推奨）
cd packages/sdk
npm run test:integration

# 実行時間: 約20-25秒（従来の1/3～1/2に短縮）
# 並列数: 2（maxConcurrency: 2）
# 特徴: グローバルセットアップでAPIサーバーを共有
```

#### 統合テストの仕組み

- **グローバルセットアップ**: APIサーバー（ポート3002）を1回だけ起動
- **並列実行**: 複数テストファイルが同時実行（最大2つ）
- **データ分離**: 各テストで独立したユーザーデータを使用
- **接続確認**: 複数のフォールバック機能で堅牢性を確保

#### 並列実行の制限

- 一部のテストで競合が発生する可能性があります
- 成功率: 約85%（49/57テスト）
- 失敗の主な原因: JWT競合、タスクリスト競合

#### トラブルシューティング

```bash
# テスト用データベースの手動確認
docker-compose up -d db-test

# APIサーバーが起動していない場合
cd packages/sdk
# globalSetupでAPIサーバーが自動起動されます

# より詳細なログが必要な場合
DEBUG_INTEGRATION=true npm run test:integration
```
