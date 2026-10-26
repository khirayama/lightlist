# Repository Guidelines

## 基本方針

- 回答・説明・コミットメッセージは日本語で記述する。
- 小さな変更を段階的に進め、各段階で達成を確認する。
- `context7`（ライブラリ仕様）と `serena`（シンボル検索・編集）を使い、推測ではなく実装事実を根拠に判断する。
- コメント追加・テスト追加・後方互換性の考慮は不要。
- 実装はシンプルに保ち、正常系と主要エラー処理に集中する。不要な抽象化・分割・冗長コードを作らず、TypeScript は `any` / `unknown` を避けて厳密に型付けする。
- shell command は `rtk <command>` を先頭に付ける（Codex は `~/.codex/RTK.md` に従う）。
- 明示指示がない限りコミットしない。

## ドキュメントの役割

- `docs/` はドメイン仕様・必須設定・運用制約の正本（索引は `docs/README.md`）。挙動を変えたら仕様として更新する（進捗報告にしない）。
- `AGENTS.md`（ルート + `apps/<app>/AGENTS.md`）は agent の作業ルールと、実装時に踏みやすい落とし穴だけを置く。docs の内容、UI の寸法・色・アニメーション時間などの数値、コンポーネント一覧は複製しない（数値は実装の定数が正）。
- 追記するのは次回以降の別タスクでも参照価値のある恒久的な知見だけ。一時的な調査メモやタスク固有の事情は書かない。
- `CLAUDE.md` / `.claude/CLAUDE.md` / `CLAUDE.local.md` は作らない（あると Claude Code が `AGENTS.md` を読まなくなる）。
- app を変更する前に該当する `apps/<app>/AGENTS.md` を読む。
- `AGENTS.md` / `docs/` と既存コードが食い違うときは、書き方の規約は既存コードに従う。仕様・挙動の食い違いはどちらかへ勝手に揃えず、見つけた食い違いを最終回答ですべて列挙する。

## 構成

| パス | 内容 | 主な実装 |
| --- | --- | --- |
| `apps/web` | Vite multi-page + React + TypeScript + 通常 CSS。Node の manifest・lockfile はここに集約し、ルートに置かない | `src/entry.tsx`（アプリ全体）、`src/lp.ts`（LP） |
| `apps/ios` | SwiftUI（iOS 17+）、XcodeGen `project.yml` | `Lightlist/Sources/ContentView.swift` |
| `apps/android` | Kotlin + Compose + Gradle | `app/src/main/java/com/lightlist/app/ContentView.kt` |
| `firebase/` | `firebase.json` / `firebase.billing.json` / `.firebaserc` / Rules / indexes / `functions/`（通知・共有プレビュー・MCP）/ `functions-billing/`（課金停止） | Firebase CLI は `--config` の設定ファイル位置を基準に相対パスを解決する |
| `shared/` | `locales/locales.json`（文言の唯一の正本）、`assets/`（フォント `gen-interface-jp`・ロゴ `brand/logo.svg`。Web は `apps/web/public/brand/logo.svg` に同じものを置く）、`licenses/manual-licenses.json` | |

- 各 app は実装をほぼ 1 ファイルに集約している。必要がない限り分割しない。
- `.gitignore` はルートに共通生成物、`apps/<app>/.gitignore` に app 固有の生成物だけを置く。
- 識別子: iOS bundle ID / Android applicationId・namespace・Kotlin package は `com.lightlist.app`。本番ドメインは `https://lightlist.app/`（`lightlist.com` は使わない）。Firebase project は dev `lightlist-dev` / prod `lightlist-prod-b0269`。
- 使わないもの: Firebase App Check、CI 品質ゲート、custom URL scheme（deep link は `https://lightlist.app` の Universal Links / App Links だけ）、iOS String Catalog。
- フォントは本文 `Gen Interface JP` の 400 / 500 / 600 / 700 と見出し `Gen Interface JP Display` の 700 だけを同梱する。等幅の意味を持つ表示（共有コード）は monospace のまま。

## 3 プラットフォーム共通ルール

Web（`apps/web/src/entry.tsx`）をアプリ仕様の正とし、iOS / Android は同じ挙動・見た目へ揃える。仕様は docs（`task-lists.md` / `data-model.md` / `sharing.md` / `authentication.md` / `notifications.md` / `api.md`）にある。1 つのプラットフォームを変えたら、他の 2 つと docs も揃える。

### UI

- 各プラットフォームの標準部品と標準操作（戻る・並び替え・シートのドラッグ）を使い、配色・角丸・書体・余白だけをアプリに寄せる。自前実装は標準では仕様を保てない場合（月カレンダーなど）に限り、その場合も標準操作は残す。
- 行の横スワイプ操作・タスク行の長押しメニュー・1 件削除の専用操作は持たない（横ページャーと競合するため。個別操作は行末の task action sheet に集約する）。
- デザインはフラットにする。アクセント色を持たないモノクロ（Tailwind gray 系）とし、枠線・影・囲いは最小限、淡いページ背景 + ボーダーレスの面カードで階層を表す。色・寸法の正本は Web `globals.css` / `compiled-styles.css`、iOS `AppPalette` / `AppMetrics`、Android `LightColorScheme` / `DarkColorScheme` / `TaskListDetailMetrics` / `AppIconMetrics`。
- タスクリストの背景色付き領域は dark テーマでも light の配色で描き、そこから開く sheet / dialog / メニューはアプリのテーマへ戻す（Web `[data-colored-background]`、iOS `taskListColorScheme`、Android `TaskListColorScope` / `AppThemeScope`）。
- 文字・アイコンは WCAG 2.2 AA（文字 4.5:1、識別に必要なアイコン・枠線 3:1）を light / dark と全背景色の組み合わせで満たす。状態を行全体の opacity で表して文字のコントラストを下げない。
- アニメーション・押下フィードバック・触覚は 3 プラットフォームで揃え、reduce motion（Web `prefers-reduced-motion` / iOS `accessibilityReduceMotion` / Android `rememberReduceMotion()`）のときはすべて無効化する。
- 並び替えは drag handle と本文の長押しの 2 経路で開始し、開始後は同じ関数を通す。スクリーンリーダーの custom action とハードウェアキーボード（Web `KeyboardSensor`、iOS Option + 上下、Android Alt + 上下）の代替手段も必ず用意し、表示順を swap した ID 配列を既存の commit 関数へ渡す。
- 文言・アクセシビリティ名は shared locale の key（`a11y.*` など）を使う。固定言語の文字列や SDK のエラーメッセージ（`localizedDescription` / `message`）を直接表示せず、対応のないエラーは `auth.error.general` にする。読み上げラベルの連結区切りは `, `。

### データ・同期（Firestore）

- ドット記法の field path（`tasks.<id>.text`、`<taskListId>.order`）は update 系 API（Web `updateDoc` / iOS `updateData` / Android `update`）だけで書く。set + merge はドットを field path と解釈しない。
- UI からの書き込みで transaction を使わない（オフラインで動かない）。事前 read + batch write にする。
- UI は書き込みのサーバー応答を待たない。SDK へ投入した時点で sheet / dialog を閉じ、応答は taskListId 単位の mutation queue で追跡して、pending の解放と同期失敗の通知（ルートの `OfflineNotice`）にだけ使う。サーバー判定が必要な操作（認証・メールアドレス変更・退会・共有コードの生成 / 解除 / 解決・共有参加）だけはオンライン必須にして応答を待つ。
- task 更新は「現在表示中の task 群（pending を含む）→ 正規化済みの next 群 → pending 表示 → queue 経由の差分保存」を操作ごとに 1 回だけ行う。完了・ピンの反転も現在の表示値から計算する。`tasks` map の列挙順は順序に使わず、必ず `order` 順の配列にしてから計算する。
- 表示の優先順は `dragOrdered* → pending* → listener`。pending は操作世代を持ち、最新世代の queue がドレインしたときだけ解放する（listener の内容一致で早期解放しない）。drag overlay はキャンセルだけでなく正常終了でも必ず解放する。
- autoSort の完了直後の位置保持（`holdTaskPositions`）は描画用の配列だけに適用し、pending・保存差分・並び替え可否の基準配列に混ぜない（混ぜると保持中の順序が `order` として保存される）。
- 書き込み前の読み取りは cache 優先（Web `getDocFromCache` → `getDoc`、iOS / Android `cacheFirstDocument`）。server read はサーバー判定が必要な操作だけに使う。
- taskLists は `memberKeys` の `array-contains` 単一クエリで購読し、taskListOrder の変化で張り直さない。listener の再試行は共通部品（Web `listenWithRetry` / iOS `ListenerRetryScheduler` / Android `SyncListenerRetryController`）を使い、同じ参照を同じ画面ツリーで二重に購読しない。
- `createdAt` / `updatedAt` は server timestamp ではなく epoch milliseconds の number で書く（Rules の `int` 検証のため）。
- Rules が要求する書き込み形を増やしたら、本番 Rules のデプロイを app 配布より先に行う（古い Rules のままだと batch 全体が `permission-denied` になる。2026-09 に発生）。
- ログアウトで Firestore の cache を削除しない（未送信の書き込みは同じユーザーの再ログインで再送される）。

### Functions

- task の並び順・`order` 採番・内容判定・日付検証は Web `entry.tsx` が正本で、MCP 用に `firebase/functions/src/tasks.ts` へ同じ規則を複製している。変えるときは両方を揃える。
- Functions は応答後の CPU が保証されないため、通知などの後処理は応答前に await する。
- ユーザー入力の key で object を引くときは `Object.hasOwn`、field path には `FieldPath` を使う。
- MCP の設定例（`buildMcpClientExamples` / `mcpClientExamples`）と表示 URL は 3 プラットフォームと `docs/api.md` で揃え、`cloudfunctions.net` の URL を表示しない。

### 日付・言語

- `yyyy-MM-dd` は端末ローカルの gregorian 暦日として厳密に扱い、UTC を指定しない（Web で `new Date("yyyy-mm-dd")` を使わない）。iOS / Android は formatter を呼び出しごとに生成せず、数値整形 + 暦日検証で扱う。
- 週の開始曜日は言語ごとに固定し、端末の locale に委ねない（`docs/task-lists.md`）。
- 文言は `shared/locales/locales.json` だけを編集する（Web は `apps/web/scripts/prepare.ts` で生成、iOS / Android は同ファイルを直接 bundle する）。英語のまま残すのはブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）だけ。サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`、`fallbackLng` は `ja`、`ar` は RTL。

### セキュリティ

- ログ・Crashlytics・Analytics にメールアドレスなどの PII、パスワード、生のユーザー入力を含めない。パスワードは永続化しない。
- 外部入力から Firestore の path を作る前に検証する（共有コードは trim + uppercase 後に `^[A-Z0-9]{8}$`、MCP の ID は `[A-Za-z0-9_-]`）。
- taskList document に生の uid やメールアドレスを置かない（共有プレビューで露出する）。

## 主要コマンド（ルートの Justfile）

| コマンド | 内容 |
| --- | --- |
| `just dev` | dev へ Firebase を配信した後、Functions の watch・MCP emulator・Web dev server を同時に起動 |
| `just web` / `just ios` / `just android` | 各 app の起動 |
| `just check-web` / `just check-functions` | ローカル検証 |
| `just audit-web` / `just audit-functions` | npm 監査（native は OSV で照会。`docs/development.md`） |
| `just deploy-firebase [prod]` | Rules / indexes / Functions の配信（既定は dev）。課金停止は `just deploy-billing`（本番のみ） |
| `just release` | 検証 → Firebase dev → prod → Web（`wrangler deploy`）→ `/mcp` の 401 確認。iOS / Android の提出は含まない |
| `just mcp-local` | MCP の Functions emulator だけを dev の Firestore で起動 |
| `just screenshots <target>` | 配信用スクリーンショットの生成（`docs/screenshots.md`） |

- Functions 系の recipe は fnm があれば `<dir>/.node-version` に切り替える（既定の Node.js のままだと `EBADDEVENGINES`）。Node.js / npm の版と install script の承認手順は `docs/development.md`。

## 作業完了チェック

1. 無駄な変数・関数・分割がないか見直す。
2. `docs/` と、恒久的な知見があれば `AGENTS.md` を更新する。
3. 変更した app ごとに検証する（ビルドは重いので 1 つずつ実行する）。
   - Web: `cd apps/web && npm run format && npm run check && npm run build`
   - iOS: `cd apps/ios && just format && just lint && just build && just build-release`
   - Android: `cd apps/android && just lint && just build`
   - Functions: `just check-functions`
