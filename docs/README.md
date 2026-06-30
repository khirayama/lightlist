# Lightlist ドキュメント

`docs/` はドメイン仕様・必須設定・制約を置く場所。アプリの挙動、見落としやすい前提、維持したい制約を、利用者視点と実装制約の両方から簡潔に書く。

実装メトリクスやファイル構成の細部、作業ルールは `AGENTS.md` と `CLAUDE.md` を正とする。ここでそれらを重複管理しない。

## ドメイン仕様

- [data-model.md](./data-model.md) — Firestore のコレクション構造、参照関係、ルール
- [task-lists.md](./task-lists.md) — タスク / タスクリストの挙動、並び替え、入力解析
- [sharing.md](./sharing.md) — 共有コードと共有権限モデル
- [authentication.md](./authentication.md) — 認証方式、必須環境変数、初期データ、パスワードリセット

## 設定・運用

- [app-check.md](./app-check.md) — Firebase App Check の構成と Console 手順
- [analytics.md](./analytics.md) — Analytics イベント設計
- [deployment.md](./deployment.md) — Web 配信、PWA、Cloudflare Pages、Firestore デプロイ
- [legal.md](./legal.md) — ライセンス表記
- [screenshots.md](./screenshots.md) — 配信用スクリーンショット生成

## リリース

- [release-ios.md](./release-ios.md) — iOS App Store リリース準備
- [release-android.md](./release-android.md) — Android Google Play リリース準備

## 前提

- モノレポ構成。`apps/web`（Vite + React + TypeScript）/ `apps/ios`（SwiftUI, iOS 17+）/ `apps/android`（Kotlin + Gradle）。
- Web は `apps/web` の実装をアプリケーション仕様の正とし、iOS / Android は同じドメイン仕様へ揃える。
- 3 プラットフォームとも Firebase Authentication + Cloud Firestore を直接使う。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。

## 書くこと / 書かないこと

- 書く: 現在のアプリ挙動、必須設定、維持したい制約、実装変更時に見落としやすい前提。
- 書かない: 内部コンポーネント一覧や import 構成、UI の寸法メトリクス、進捗メモ、`AGENTS.md` の作業ルールの重複。
- 更新時は実装を確認し、存在する画面・機能・設定だけを書く。
