# Lightlist

シンプルな共有タスクリストアプリ。個人・家族・小チーム向け。

## 構成

| パス | 説明 |
|---|---|
| `apps/web` | Next.js（Pages Router）+ Tailwind |
| `apps/native` | Expo（React Native）+ NativeWind |
| `packages/sdk` | Firebase Auth / Firestore 共通ロジック |

## 前提

- Node.js 24+
- npm 11+
- Firebase プロジェクト（Auth + Firestore）

## セットアップ

```bash
npm install
```

### 環境変数

**`apps/web/.env.local`**

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_PASSWORD_RESET_URL=https://your-domain.com/password_reset
```

**`apps/native/.env`**

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_PASSWORD_RESET_URL=https://your-domain.com/password_reset
```

## 開発

```bash
# Web + Native 同時起動
npm run dev

# Web のみ
cd apps/web && npm run dev

# Native のみ
cd apps/native && npm run dev
```

## ビルド / チェック

```bash
npm run build        # 全パッケージビルド
npm run typecheck    # 型チェック
npm run lint         # Lint
npm run format       # フォーマット
```

## Firestore デプロイ

```bash
npm run deploy:firestore        # staging
npm run deploy:firestore:prod   # production
```

## ドキュメント

- [`docs/`](./docs/) - 設計ドキュメント
- [`AGENTS.md`](./AGENTS.md) - 開発ガイドライン
