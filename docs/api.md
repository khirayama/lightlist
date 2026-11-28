# 外部 API（MCP）

AI ツールや外部のプログラムからタスクリストとリマインダーを読み書きするための公開 API。MCP（Model Context Protocol）の Streamable HTTP を 1 つのエンドポイントで提供し、REST API は持たない。MCP は JSON-RPC over HTTP なので、MCP クライアント以外のスクリプトからも同じエンドポイントを呼べる。

## エンドポイント

- 本番は `https://lightlist.app/mcp`。Web を配信する Cloudflare Worker（`apps/web/worker/index.ts`）が、prod の Functions `mcp`（`https://asia-northeast1-lightlist-prod-b0269.cloudfunctions.net/mcp`、`firebase/functions` codebase）へメソッド・ヘッダー・本文をそのまま中継する。`cloudfunctions.net` の URL はアプリが表示する URL・設定例に出さない。
- Worker は `assets.run_worker_first` で `/mcp` だけを static assets より先に受ける。
- User-Agent は制限しない（ライブラリ既定の User-Agent でも呼べる）。Cloudflare Pages の custom domain では Browser Integrity Check を外せず Python urllib の既定 User-Agent が `403` になるため、Pages ではなく zone の Custom Domain の Worker で受け、zone の Configuration Rule で `/mcp` の Browser Integrity Check を無効にしている（[deployment.md](./deployment.md)）。
- 開発は `just mcp-local` のローカル URL（`http://127.0.0.1:5001/lightlist-dev/asia-northeast1/mcp`）を使う。アプリが表示するエンドポイントは、Web は dev server（`import.meta.env.DEV`）ならこのローカル URL、build 済みなら `https://lightlist.app/mcp`（`npm run preview` でも同じ）、iOS / Android は Debug ビルドがローカル URL、Release ビルドが `https://lightlist.app/mcp`（iOS は `#if DEBUG`、Android は `BuildConfig.DEBUG` で切り替える）。
- Worker は中継時に `x-lightlist-proxy-secret` ヘッダーへ共有秘密を付ける（Worker secret と Functions の Secret Manager の `MCP_PROXY_SECRET` に同じ値を置く）。Function はこのヘッダーが一致しないリクエストを Firestore を読まずに `403` で拒否するため、project ID から推測できる直接 URL（`cloudfunctions.net` / `run.app`）では使えない。Functions emulator では検査しない。ヘッダーは MCP server へ渡さない。
- stateless。session（`Mcp-Session-Id`）を持たず、リクエストごとに MCP server を作る。2025 年版の stateless 接続と 2026-07-28 版の両方を受け付ける。
- `maxInstances: 1`、`256MiB`、timeout 60 秒。不正利用で費用が膨らむのを instance 数で抑える代わりに、高負荷時は正規の利用者も待たされる。
- 1 リクエストの本文は 1 MiB までとし、超過時は `413` を返す。応答は `Cache-Control: no-store` とする。
- 認証済みのリクエストは同じ uid ごとに Function インスタンス内で 60 秒あたり 240 回に制限し、超過時は `429` と `Retry-After: 60` を返す。インスタンスの再起動でカウンタはリセットされる best-effort の防御で、永続的な課金上限ではない。未認証を含むすべてのリクエストは、Worker の Rate Limiting binding（`MCP_RATE_LIMITER`）で接続元 IP（`CF-Connecting-IP`。Cloudflare が付けるため偽装できない）ごとに 60 秒あたり 300 回（Cloudflare の拠点ごとの近似値）に制限し、超過時は Functions を起動せずに `429` と `Retry-After: 60` を返す。形式だけ正しい偽トークンの連打で Functions の起動と Firestore の読み取りが増えるのを防ぐため。上限は uid ごとの制限より緩くし、同じ IP を共有する正規の利用者を巻き込まないようにする。

## 認証

- `Authorization: Bearer <token>` だけを受け付ける。OAuth は提供しないため、Bearer token をヘッダーで渡せるクライアント（Claude Code、Cursor など）が対象で、OAuth 前提のリモートコネクタ（claude.ai のカスタムコネクタなど）は使えない。
- トークンは `ll_` + 32 bytes の乱数の base64url（43 文字）。形式が違うトークンは Firestore を読まずに `401`（`WWW-Authenticate: Bearer`）を返す。
- 検証は `apiTokens/{sha256(token)}` の `get` 1 回で uid を解決する。平文のトークンはどこにも保存せず、ログにも出さない。
- トークンに権限範囲・有効期限はない。失効は document の削除だけで、削除後のリクエストは `401` になる。

## トークンの発行と失効

- Web / iOS / Android の設定画面の「アカウント」セクションの「API トークン」から開く（Web と Android はダイアログ、iOS は設定から push する画面）。
- 発行は端末で乱数とハッシュを作り、クライアントが `apiTokens/{hash}` を Rules 経由で直接作成する。発行用の API は持たない。名前は任意で、前後の空白を除いた 50 文字（UTF-16）以内。入力欄も 50 文字までに制限する。
- 書き込みがサーバーに確定してから平文を 1 回だけ表示し、エンドポイントと「AI ツールの設定例」を添える。設定例は Claude Code / Codex / Cursor / VS Code / Gemini CLI のクライアントごとに開閉式の一覧で並べ、トークンを埋め込んだ状態でコピーできる（内容は次節と同じ。3 プラットフォームの `mcpClientExamples` / `buildMcpClientExamples` で揃える）。画面を閉じると平文は再表示できない。
- 発行と削除はオンライン必須の操作で、オフライン中は無効化して `common.requiresConnection` を表示する。一覧はオフラインでも cache から表示する。
- 退会で Auth ユーザーが削除されると、Functions `deleteApiTokensOnUserDelete`（1st gen の Auth `onDelete` trigger）がその uid のトークンをすべて削除する。

## クライアントの設定

いずれも Streamable HTTP と `Authorization: Bearer` ヘッダーで接続する。アプリはトークンを埋め込んだ形で表示する。

公開用の設定手順は `https://lightlist.app/docs/#mcp`（他言語は LP と同じ言語 prefix）に置く。トークン発行 → クライアント設定 → 接続を有効にして依頼、の順に案内し、Claude Code / Codex / Cursor / VS Code / Gemini CLI の設定例は本節とアプリに揃える。Muse はカスタムコネクターの接続先と Authorization ヘッダーを案内する。公開ページでは実トークンを受け取らず、`ll_...` を置き換える例だけを表示する。全参加リストへの読み書き権限、有効期限なし、OAuth 非対応、トークン削除による失効、401 の対処も記載する。

Claude Code（ターミナル）:

```sh
claude mcp add --transport http lightlist https://lightlist.app/mcp --header "Authorization: Bearer ll_..."
```

Codex（`~/.codex/config.toml`。`codex mcp add` には Bearer token の指定がないため設定ファイルに書く。設定ファイルにトークンを残したくない場合は `http_headers` の代わりに `bearer_token_env_var = "LIGHTLIST_API_TOKEN"` で環境変数から渡す）:

```toml
[mcp_servers.lightlist]
url = "https://lightlist.app/mcp"
http_headers = { "Authorization" = "Bearer ll_..." }
```

Cursor（`~/.cursor/mcp.json`。`${env:NAME}` で環境変数も使える）:

```json
{
  "mcpServers": {
    "lightlist": {
      "url": "https://lightlist.app/mcp",
      "headers": {
        "Authorization": "Bearer ll_..."
      }
    }
  }
}
```

VS Code（コマンドパレットの「MCP: Open User Configuration」で開く `mcp.json`。`${input:...}` で初回起動時に入力させることもできる）:

```json
{
  "servers": {
    "lightlist": {
      "type": "http",
      "url": "https://lightlist.app/mcp",
      "headers": {
        "Authorization": "Bearer ll_..."
      }
    }
  }
}
```

Gemini CLI（ターミナル。`--scope user` で全プロジェクトに登録する）:

```sh
gemini mcp add --scope user --transport http --header "Authorization: Bearer ll_..." lightlist https://lightlist.app/mcp
```

MCP クライアントを使わない呼び出し（initialize は不要。`Accept` に `application/json` と `text/event-stream` の両方が必要で、片方だけだと `406`）:

```sh
curl -sS https://lightlist.app/mcp \
  -H "Authorization: Bearer $LIGHTLIST_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_task_lists","arguments":{}}}'
```

応答は SSE の `data:` 行に JSON-RPC の結果が入り、ツールの結果は `result.content[0].text` に JSON 文字列で入る。エラーは `result.isError: true` と説明文で返す。

## ツール

| tool | 内容 |
|---|---|
| `list_task_lists` | 保持しているタスクリストを `taskListOrder` の順で返す（`id` / `name` / `shared` / `openTaskCount`）。 |
| `get_tasks` | 1 リストの task を表示順で返す。`autoSort` の値も返す。 |
| `add_task` | `text` / `date` / `pinned` で task を追加する。 |
| `update_task` | `text` / `completed` / `date`（`null` で解除）/ `pinned` を更新する。 |
| `move_task` | task を `get_tasks` の表示順の `index`（0 始まり）へ移す。 |
| `list_reminders` | 本人のリマインダーをアプリと同じ順（`time` → `createdAt`）で返す。`notifyReminders` の値も `notificationsEnabled` として返す。 |
| `add_reminder` | `text` / `date` / `time` / `repeat` / `timeZone` / `taskListId`（配信と同時にタスクを追加する先）でリマインダーを作成する。 |
| `update_reminder` | `text` / `date` / `time` / `repeat` / `timeZone` / `taskListId`（`null` で解除）/ `enabled`（一時停止・再開）を更新する。 |
| `delete_reminder` | リマインダーを削除する。 |

- initialize の `instructions` で、Lightlist が利用者のタスク・ToDo とリマインダーの置き場所であること（日本語の言い回しを含む）、タスクは `list_task_lists` から始めること、リマインダーはタスクリストとは別の、時刻に通知を出すもので、時刻に通知してほしい依頼に使うこと（task の日付では通知されないこと、`taskListId` を指定すると通知と同時にそのリストへタスクが追加されること）、相対日付・時刻をクライアント側で解決することを伝え、サービス名を言わない依頼でもツールが選ばれるようにする。各ツールには `title` を付ける。
- task の削除・共有・タスクリストの作成や変更のツールは持たない。ただし `update_task` で本文・日付・ピンがすべて空になった task は、アプリと同じく削除する。
- 入力の自然言語解析（相対日付・pin prefix）は行わない。本文はそのまま保存し、日付は利用者の端末ローカルの暦日として `yyyy-MM-dd` で受け取る。実在しない日付は入力検証で拒否する。
- ID は `[A-Za-z0-9_-]` の 1〜128 文字だけを受け付け、field path に `.` が入らないようにする。
- 返す `date` は日付なしを `null` とする。部分 map など不正な task は返さず、削除もしない（削除はクライアントの server 確定 snapshot に任せる）。
- 共有リストの本文は他のメンバーが書いた内容をそのまま返す。ツールの説明で、指示ではなくデータとして扱うよう AI に伝える。

## リマインダー

- 対象は `ownerUid` が API 利用者本人のリマインダーだけで、他人のものは存在しないものとして扱う。保存形式と規則はアプリと同じ（[reminders.md](./reminders.md)、[data-model.md](./data-model.md)）。Admin SDK は Rules を通らないため、Rules が要求する全 field を揃えて書く（作成は `create`、`nextFireAt: null`。更新は変わった field と `updatedAt` だけを `update` で書く）。`nextFireAt` は書かず、書き込み trigger に計算させる。
- `repeat` は `freq` だけを必須とし、`interval` の既定は 1、`weekly` の `weekdays` の既定は `date` の曜日、`monthly` の `monthlyBy` の既定は `"day"`。`freq` に関係しない値は保存時に正規化する（`weekly` 以外の `weekdays` は空配列、`monthly` 以外の `monthlyBy` は `"day"`、`none` の `interval` は 1）。`update_reminder` の `repeat` は map ごと置き換える。
- `timeZone` は IANA 名だけを受け付け、正規の表記（`asia/tokyo` → `Asia/Tokyo`）で保存する。UTC オフセット（`+09:00`）は拒否する。`add_reminder` で省略したときは、本人の `updatedAt` が最も新しいリマインダーの `timeZone` を使い、1 件もなければエラーにする。`update_reminder` で省略したときは変更しない（アプリと異なり端末のタイムゾーンへ更新しない）。
- 日時が過去の繰り返さないリマインダーは作成できない。更新後に日時が過去の繰り返さないリマインダーになる変更（「終了」のリマインダーの本文だけの変更・`enabled: true` を含む）もアプリの保存ボタンと同じく拒否する。過去・終了の判定は保存する `timeZone` の現地時刻で行う。
- `enabled` を省略した更新はアプリの編集 sheet と同じく `enabled` を変えず、「終了」だったリマインダーを未来の日時か繰り返しへ変えたときだけ `enabled: true` にする。新規作成は `enabled: true`。
- 結果の `status` は `scheduled` / `paused` / `ended`（繰り返さないリマインダーの日時が過去）、`nextFireAt` は `scheduled` のときの次回の配信時刻（UTC の ISO 8601、それ以外は `null`）。保存済みの `nextFireAt`（配信期限の 1 時間を含む内部値）ではなく、応答時点の現在時刻から同じ規則で計算する。
- `taskListId` は保存時に `list_task_lists` と同じ判定で本人が参加中のタスクリストか確認し、参加していなければエラーにする。結果の `taskListId` は保存値をそのまま返す（配信時に参加していなければ追加だけ飛ばす。[reminders.md](./reminders.md)）。
- 通知の許可要求はできないため、`notifyReminders` がオフでもリマインダーは保存し、`notificationsEnabled: false` を返して AI から利用者へ設定を案内させる。
- 値が変わらない `update_reminder` は書き込まない。

## 書き込みの規則

- 認可はクライアントの購読と同じく、`taskLists.memberKeys` に `sha256("lightlist-member:" + uid)` が含まれるかで判定する。含まれないリストは存在しないものとして扱う。
- `taskInsertPosition` / `autoSort` は API 利用者本人の `settings/{uid}` を使い、欠損時は `top` / `true` とする。並び順・`order` の振り直し・`autoSort` 中の移動制限・差分の書き込みは Web と同じ規則にする（[task-lists.md](./task-lists.md)）。
- 書き込みは field path の `update` に `updatedAt` を添え、読み取った document の `updateTime` を前提条件にする。前提条件が崩れたら読み直して最大 3 回試し、それでも競合したらツールのエラーとして返す。
- `history`（入力候補）は更新しない。

## 共有リストの通知

- 通知 trigger は、書き込んだ主体（`authId`）がそのリストのメンバー（書き込み前の `memberKeys` に含まれる）である書き込みだけを通知する。Admin SDK による書き込みは変更者の uid を特定できないため trigger では通知せず（共有プレビューの同期は続ける）、API が書き込みの後に利用者の uid を変更者として通知処理を呼ぶ。
- 値が変わらない更新（同じ値の `update_task`、現在位置への `move_task`）は書き込まず、通知もしない。
- 通知の対象・抑制は trigger と同じ（[notifications.md](./notifications.md)）。`move_task` は表示順だけの変更なので通知しない。通知の失敗はツールの結果に影響させない。

## 1 リクエストあたりの Firestore 操作

- 認証: 読み取り 1 回。
- `list_task_lists`: 保持リスト数 + 1 回の読み取り。`get_tasks`: 2 回。
- task の書き込み系: 読み取り 2 回（並列。競合時は再試行ごとに 1 回追加）と書き込み 1 回（値が変わらなければ 0 回）。共有リストでは通知の操作が加わる。
- `list_reminders`: リマインダー数 + 1 回の読み取り（0 件でもクエリ 1 回分）。`add_reminder`: settings の読み取り 1 回と書き込み 1 回（`timeZone` を省略するとリマインダー数分の読み取りが加わる）。`update_reminder` / `delete_reminder`: 読み取り 1 回と書き込み 1 回（値が変わらなければ 0 回）。`taskListId` を指定・変更すると追加先の読み取り 1 回が加わる。書き込み後は書き込み trigger が `nextFireAt` を書く。

## 開発中の確認

通常は `just dev` を使う。`just dev` は `just deploy-firebase dev` で手元の Rules・indexes・Functions（通知 trigger を含む）を dev へ反映してから、Functions の `tsc --watch`、Functions emulator（`mcp`）、Web の dev server を同時に起動する（Ctrl-C でまとめて止まる）。Functions のソースを保存すると `lib/` が再生成され、emulator が読み直す。

`just mcp-local` は MCP だけを起動する。Functions を build し、Functions emulator だけを `lightlist-dev` で起動する。ローカルの `mcp` が dev の Firestore を読み書きするため（認証は firebase CLI のログイン情報）、Functions を配信せずに、`just web` や Debug ビルドのアプリで発行したトークンと dev のデータで確かめられる。開発中のアプリはこのローカル URL を設定例に表示する。

- dev の Rules に `apiTokens` が反映されていないと、アプリからの発行は拒否される。
- 書き込みは dev の実データに入る。dev の通知 trigger は最後に配信した版のまま動く（`just dev` は起動時に配信する）。
- Firestore emulator を起動しないため、通知 trigger と `deleteApiTokensOnUserDelete` はローカルでは読み込まれない。prod には接続しない。
- dev の実データに触れずに確かめるときは、`firebase --config firebase/firebase.json emulators:start --only functions,firestore --project demo-lightlist`（`demo-` の project は実在の resource に接続しない）で起動し、Firestore emulator の REST API（`Authorization: Bearer owner`）で `apiTokens/{sha256(token)}` を作ってから呼ぶ。リマインダーの書き込み trigger も動く。
- 中継の Worker は `cd apps/web && npm run preview`（`wrangler dev`）で確かめられる。中継先は常に prod の Functions。

## 配信

- Rules（`apiTokens`）と Functions（`mcp` / `deleteApiTokensOnUserDelete` / 通知 trigger の変更）を `just deploy-firebase <env>` で配信してから、トークン発行 UI を含む Web / iOS / Android を配布する。
