# Lightlist

シンプルな共有タスクリストアプリ。個人・家族・小チーム向け。

## 構成

| パス | 説明 |
|---|---|
| `apps/web` | Vite multi-page app + React + TypeScript + Tailwind |
| `apps/ios` | SwiftUI（iOS 17+） |
| `apps/android` | Kotlin + Gradle |

Web の Firebase Auth / Firestore 実装は `apps/web/src/entry.tsx` に統合。

## 前提

- Node.js 24+
- npm 11+
- Firebase プロジェクト（Auth + Firestore）

## セットアップ

```bash
cd apps/web
npm install
```

### 環境変数

**`apps/web/.env.local`**

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_PASSWORD_RESET_URL=https://your-domain.com/password_reset
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
