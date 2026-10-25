# 開発環境と依存の安全性

## 必須ツール

| 対象 | ローカル Node.js | npm |
| --- | --- | --- |
| Web | `apps/web/.node-version` の 24.19.0 | 12.0.2 |
| 通知 Functions | `firebase/functions/.node-version` の 22.23.4 | 12.0.2 |
| 課金停止 Functions | `firebase/functions-billing/.node-version` の 22.23.4 | 12.0.2 |

各ディレクトリで Node.js を切り替えてから `npm ci` を実行する。fnm を使う場合は `fnm use --install-if-missing` で `.node-version` を適用し、必要なら選択した Node.js に `npm install --global npm@12.0.2` で npm を導入する。

`devEngines` は `npm install` / `npm ci` / `npm run` の実行前に Node.js と npm を検証する。Web は Node.js `^24.19.0 || >=26.0.0`、Functions は `^22.22.2` を受け入れ、npm は 12.0.2 に固定する。Functions の配信 runtime は Node.js 22 とし、Cloud Build にも `engines.npm` で npm 12.0.2 を指定する。

## install script

3つの Node.js プロジェクトで `.npmrc` の `strict-allow-scripts=true` を有効にする。依存パッケージの install script は `package.json` の `allowScripts` に完全バージョン付きで承認し、未確認の script があればインストールを停止する。

依存を更新するときは `npm install --ignore-scripts` で script を実行せずに依存と lockfile を更新し、script と配布元を確認したパッケージだけ `npm approve-scripts <pkg>` で承認する。`npm approve-scripts --allow-scripts-pending` で未承認がないことを確認して `npm ci` を実行する。一括承認や `--dangerously-allow-all-scripts` で回避しない。

## ローカル起動

リポジトリルートの `just dev` で、手元の状態をまとめて動かす。`just deploy-firebase dev` で Rules・indexes・Functions を dev へ反映した後、Web の dev server（`apps/web/.env.development.local` の `lightlist-dev`）、MCP の Functions emulator（`http://127.0.0.1:5001/lightlist-dev/asia-northeast1/mcp`）、Functions の `tsc --watch` を同時に起動し、Ctrl-C でまとめて止める。Firestore / Auth は emulator ではなく dev の実プロジェクトを使い、prod には接続しない。iOS / Android の Debug ビルドも同じ dev とローカルの MCP URL を使う。詳細は [api.md](./api.md)。

## ローカル検証

リポジトリルートから実行する。Functions 系の recipe（`check-functions` / `audit-functions` / `deploy-firebase` / `deploy-billing`）は fnm があれば各ディレクトリの `.node-version` へ自動で切り替える。Web と fnm のない環境では、対象に対応する Node.js / npm を選択して実行する。

| コマンド | 検証対象 |
| --- | --- |
| `just check-web` | locale・license 生成、lint、アプリ・Vite 設定の型チェック、未使用コード、production build |
| `just check-functions` | 通知 Functions と課金停止 Functions の TypeScript build |
| `just audit-web` | Web の開発用依存を含む npm 監査 |
| `just audit-functions` | 両 Functions の npm 監査 |

Web の整形は `npm run format` を使う。生成された locale・license とローカル agent 設定は整形対象から除外する。

Web のみを確認する場合は `apps/web` の `npm run check` / `npm run build` でも同じ検証を行える。CI 品質ゲートは設けず、変更対象のローカル検証を必須とする。

## 脆弱性の判定

npm の監査結果は依存経路と実行環境を合わせて判断する。Web の Firestore が依存する `@grpc/grpc-js` は Node.js 専用で、ブラウザ bundle には含まれない。[証明書の認可判定](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j)と[サーバーエラーの情報漏洩](https://github.com/grpc/grpc-node/security/advisories/GHSA-f596-whhp-79r4)は Web アプリの実行環境では対象外とする。この指摘は監査出力から隠さず、`npm audit` が非ゼロで終了する場合も advisory の内容を確認する。Firestore の指定を `overrides` で変更したり、`npm audit fix --force` で Firebase を降格させたりしない。Web プロジェクトで Node.js 向け Firestore や gRPC サーバーを使う場合は、この対象外判定を再評価する。

iOS は `Package.resolved` の revision、Android は `libs.versions.toml` の Maven 座標・固定版を OSV API で照合する。カタログに版がない BoM 管理の実ライブラリや native binary の内部依存まですべて監査した結果として扱わない。
