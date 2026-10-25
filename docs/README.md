# Lightlist ドキュメント

`docs/` はドメイン仕様・必須設定・制約を置く場所。アプリの挙動、見落としやすい前提、維持したい制約を、利用者視点と実装制約の両方から簡潔に書く。

UI の寸法・色・アニメーション時間などの数値は各実装の定数を正とし、作業ルールと実装上の落とし穴は `AGENTS.md` に置く。ここでそれらを重複管理しない。

## ドメイン仕様

- [development.md](./development.md) — 開発環境の必須バージョン、依存 script の承認、ローカル検証・脆弱性の判定
- [data-model.md](./data-model.md) — Firestore のコレクション構造、参照関係、ルール
- [task-lists.md](./task-lists.md) — タスク / タスクリストの挙動、並び替え、入力解析
- [sharing.md](./sharing.md) — 共有コードと共有権限モデル
- [authentication.md](./authentication.md) — 認証方式、必須環境変数、初期データ、パスワードリセット
- [notifications.md](./notifications.md) — 共有リスト更新通知、端末登録、配信設定
- [api.md](./api.md) — 外部 API（MCP）、API トークン、ツールと書き込み規則

## 設定・運用

- [analytics.md](./analytics.md) — Analytics イベント設計
- [deployment.md](./deployment.md) — Web 配信、PWA、Cloudflare Workers、Firebase デプロイ
- [billing-control.md](./billing-control.md) — 費用監視と課金停止
- [legal.md](./legal.md) — ライセンス表記
- [screenshots.md](./screenshots.md) — 配信用スクリーンショット生成

## 開発用起動

- Android Emulator は `cd apps/android && just emulator <AVD名>`、iOS Simulator は `cd apps/ios && just simulator <デバイス名またはUDID>` で起動し、ルートの `just android` / `just ios` でビルドしてインストールする。

## リリース

- [release-ios.md](./release-ios.md) — iOS App Store リリース準備
- [release-android.md](./release-android.md) — Android Google Play リリース準備

## 前提

- モノレポ構成。`apps/web`（Vite + React + TypeScript）/ `apps/ios`（SwiftUI, iOS 17+）/ `apps/android`（Kotlin + Gradle）。
- Web は `apps/web` の実装をアプリケーション仕様の正とし、iOS / Android は同じドメイン仕様へ揃える。
- 3 プラットフォームとも Firebase Authentication + Cloud Firestore を直接使う。外部 API（MCP）だけは Functions が Admin SDK で Firestore を読み書きする。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。

## 書くこと / 書かないこと

- 書く: 現在のアプリ挙動、必須設定、維持したい制約、実装変更時に見落としやすい前提。
- 書かない: 内部コンポーネント一覧や import 構成、UI の寸法メトリクス、進捗メモ、`AGENTS.md` の作業ルールの重複。
- 更新時は実装を確認し、存在する画面・機能・設定だけを書く。
