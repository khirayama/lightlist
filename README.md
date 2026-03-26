# Lightlist

シンプルな共有タスクリストアプリ。個人・家族・小チーム向け。

## 構成

| パス | 説明 |
|---|---|
| `apps/web` | Next.js（Pages Router）+ Tailwind |
| `apps/ios` | SwiftUI（iOS 16+） |
| `apps/android` | Kotlin + Gradle |

SDK（Firebase Auth / Firestore 共通ロジック）は `apps/web/src/lib/` に統合。

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

## 開発

```bash
# Web 起動
cd apps/web && npm run dev
```

## ビルド / チェック

```bash
cd apps/web && npm run build      # ビルド
cd apps/web && npm run typecheck  # 型チェック
cd apps/web && npm run lint       # Lint
cd apps/web && npm run format     # フォーマット
cd apps/web && npm run knip       # 未使用コード検査
```

## Firestore デプロイ

```bash
just deploy-firestore        # staging
just deploy-firestore-prod   # production
```

`just` の deploy recipe は、PATH 上で解決できる global `firebase` CLI を前提にしています。

## ドキュメント

- [`docs/`](./docs/) - 設計ドキュメント
- [`AGENTS.md`](./AGENTS.md) - 開発ガイドライン
