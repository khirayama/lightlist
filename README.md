# Lightlist

シンプルな共有タスクリストアプリ。個人・家族・小チーム向け。

## 構成

| パス           | 説明                                                         |
| -------------- | ------------------------------------------------------------ |
| `apps/web`     | Vite multi-page app + React + TypeScript + 通常 CSS          |
| `apps/ios`     | SwiftUI（iOS 17+）                                           |
| `apps/android` | Kotlin + Jetpack Compose                                     |
| `firebase`     | Firestore Rules と Functions（通知・共有プレビュー・MCP・課金停止） |
| `shared`       | 3 プラットフォーム共通の locale・ライセンス・ブランド資産    |

## 前提

- Web: Node.js 24.19.0、npm 12.0.2
- Functions: Node.js 22、npm 12.0.2
- 対象ディレクトリの `.node-version` に合わせる（fnm があれば `just` が自動で切り替える）。手順は [docs/development.md](./docs/development.md)。

## セットアップ

```bash
cd apps/web && npm ci
cp .env.production.sample .env.development.local  # lightlist-dev の値に書き換える
```

Web の env は Firebase の Web アプリ設定（`VITE_FIREBASE_*`）と Web Push の `VITE_FIREBASE_VAPID_KEY` だけ。dev は `.env.development.local`、本番は `.env.production.local` に置く。

## 主なコマンド

```bash
just dev              # dev の Firebase へ配信し、Web・MCP emulator・Functions の watch を起動
just check-web        # Web の lint / typecheck / knip + production build
just check-functions  # 両 Functions の build
just release          # Firebase（dev → prod）→ Web 配信 → 本番の疎通確認
just ios / just android
```

## ドキュメント

- [`docs/README.md`](./docs/README.md) - ドメイン仕様・必須設定・制約
- [`AGENTS.md`](./AGENTS.md) - 開発ガイドライン
