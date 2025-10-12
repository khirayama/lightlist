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
│   ├── lib/                    # lib/crdt（CRDT実装）
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
- 認証: Better Auth（apps/api/src/auth.ts, Prisma Adapter）。Cookieセッションを基本とし、Bearerも許容。
- CORS: CORS_ORIGINをカンマ区切りで指定。空の場合は'\*'かつcredentials=false。
- helmet, cors, express-rate-limit
- CRDT (packages/lib)
- Prettier, Vitest, Supertest
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

```
# 開発環境
$ npx supabase start
$ npm run setup
$ npm run dev

# dbリセット
$ npx supabase db reset
$ npm run setup
```
