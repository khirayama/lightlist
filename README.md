# Lightlist

シンプルな共有タスクリストアプリ。個人・家族・小チーム向け。

## 構成

| パス           | 説明                                                |
| -------------- | --------------------------------------------------- |
| `apps/web`     | Vite multi-page app + React + TypeScript + 通常 CSS |
| `apps/ios`     | SwiftUI（iOS 17+）                                  |
| `apps/android` | Kotlin + Gradle                                     |

Web の Firebase Auth / Firestore 実装は `apps/web/src/entry.tsx` に統合。

## 前提

- Web: Node.js 24.19.0、npm 12.0.2
- Functions: Node.js 22.23.4、npm 12.0.2
- Firebase プロジェクト（Auth + Firestore）

対象ディレクトリの `.node-version` に合わせて Node.js を選択する。必須設定と依存 script の承認手順は [開発環境](./docs/development.md) を参照。

## セットアップ

```bash
cd apps/web
npm ci
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
just check-web                  # Web の一括検証 + production build
just check-functions            # Node.js 22 で両 Functions を build
just audit-web                  # Web の依存監査（対象外の指摘は docs 参照）
just audit-functions            # 両 Functions の依存監査
cd apps/web && npm run build      # ビルド
cd apps/web && npm run typecheck  # 型チェック
cd apps/web && npm run lint       # Lint
cd apps/web && npm run format     # フォーマット
cd apps/web && npm run knip       # 未使用コード検査
```

## Firebase デプロイ

```bash
just deploy-firebase         # dev (default): all resources in firebase/firebase.json
just deploy-firebase prod    # prod: all resources in firebase/firebase.json
```

`just` の deploy recipe は、PATH 上で解決できる global `firebase` CLI を前提にしています。

## ドキュメント

- [`docs/README.md`](./docs/README.md) - ドメイン仕様・必須設定・制約
- [`AGENTS.md`](./AGENTS.md) - 開発ガイドライン
