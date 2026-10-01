# データモデル

Cloud Firestore に 4 つのトップレベルコレクションを持つ。ルール本体は `firestore.rules`（リポジトリルート）を正とする。

## コレクション

### settings/{uid}

ユーザー設定。本人のみ読み書き可能。

- `theme`: `"system" | "light" | "dark"`。欠損・`null` は `"system"` として扱う。
- `language`: サポート言語コード。欠損・`null` は `"ja"` として扱う。
- `taskInsertPosition`: `"top" | "bottom"`。欠損・`null` は `"top"` として扱う。
- `autoSort`: `boolean`。新規作成時の既定値は `true`。欠損・`null` も `true` として扱い、明示された `false` はそのまま保持する。
- `startupView`: `"taskList" | "calendar" | "taskLists"`。欠損・不正値は `"taskList"` として扱う。
- `createdAt` / `updatedAt`: 任意の Unix epoch milliseconds。設定の表示・同期に必須ではなく、欠損していても上記の既定値で設定を解決する。

### taskLists/{taskListId}

タスクリスト実体。

- `id`
- `name`
- `tasks`: `{ [taskId]: Task }` のマップ
- `history`: 入力候補の文字列配列（最大 300 件）
- `shareCode`: `string | null`
- `background`: `string | null`
- `memberCount`: そのリストを保持しているユーザー数
- `memberKeys`: 保持ユーザーごとの membership key（`sha256("lightlist-member:" + uid)` の小文字 hex）の配列。`members` サブコレクションと同一 commit で整合させる派生値で、購読クエリと Rules の保持判定に使う。共有コードのプレビュー読み取りにも露出するため、生の uid は置かない
- `createdAt` / `updatedAt`

### taskLists/{taskListId}/members/{uid}

タスクリストへの加入証明。表示順とは独立した認可の正本とする。

- `joinedAt`: 加入時の Unix epoch milliseconds
- `joinCode`: 所有者作成時は `null`、共有コード加入時は加入に使った正規化済みコード

Task の構造:

- `id`
- `text`: 文字列。日付ありまたはピン留めの場合は空文字を許可する
- `completed`
- `date`: 実在する端末ローカルの暦日を表す厳密な `"yyyy-MM-dd" | null`。不正な形式・存在しない日付は読み取り時に日付なしとして扱う
- `order`
- `pinned`

Task は「trim 後に 1 文字以上の `text`」「空でない `date`」「`pinned == true`」のいずれかを満たす。いずれも満たさないデータは不正 task として一覧・カレンダー・件数から除外し、既存 task の更新でこの状態になった場合は `tasks.<id>` を削除する。

Task の decode では `id` / `text` / `completed` / `date` / `order` / `pinned` の全fieldと型を検証する。他端末で削除された task ID へ古い端末がドット記法のfield更新を送ると、Firestore上で一部fieldだけのmapが再生成されることがある。この部分mapは task として表示せず、cache由来でもpending write由来でもないserver確定snapshotで検出した場合に `tasks.<id>` を削除する。

Web は `settings` / `taskListOrder` / `taskLists` / `shareCodes` の購読・単発取得を共通の境界検証へ通し、トップレベルfieldと動的mapの全要素を検証してからドメインモデルへ渡す。不正な `settings` / `taskListOrder` は読み込みエラーとし、不正な `taskLists` document は当該documentだけを表示対象から外す。task map 内の不正要素はリスト全体を無効にせず除外し、server確定snapshotで自動削除する。

iOS / Android の `taskLists` と `settings` の読み取りは型付きFirestoreドキュメントへ変換してからドメインモデルへ渡す。トップレベルの `taskLists` ドキュメントが型不正の場合は当該リストを表示対象から外し、空レコードへ劣化させない。動的なキーを持つ `taskListOrder`、部分mapの検証・削除、ドット記法の差分更新だけはFirestore APIの境界で動的データを使う。`theme` / `language` / `taskInsertPosition` / `autoSort` が不正な型・値の場合は設定画面を読み込みエラーとして扱い、`startupView` の不正値だけは `taskList` に正規化する。

- Android の release R8 縮小後も、リフレクションで変換する `FirestoreSettingsRecord` のクラス名・フィールド・アクセサ・no-arg constructor を保持する。指定は `apps/android/app/proguard-rules.pro` を正とする。

### taskListOrder/{uid}

ユーザーごとの保持リストと表示順。本人のみ読み書き可能。認可の根拠には使わない。

- `{ [taskListId]: { order } }`
- `createdAt` / `updatedAt`

### shareCodes/{shareCode}

共有コードから `taskListId` への逆引き。

- `taskListId`
- `createdAt`

## 参照関係

- 表示順は `taskListOrder/{uid}` が正。保持権限は `taskLists/{taskListId}/members/{uid}` が正。
- リスト実体は `taskLists/{taskListId}` が正。
- 共有コードは `shareCodes/{shareCode}` から `taskListId` を引く。
- `taskListOrder` と `taskLists` は別管理する。一方だけで順序と実体を兼ねない。加入・離脱時は order と membership、`memberCount`、`memberKeys`（自分の key だけを `arrayUnion` / `arrayRemove`）を同一 batch で更新する。

## 同期モデル

- 保持している `taskLists` は `where("memberKeys", "array-contains", <自分の key>)` の単一クエリで購読する。membership document の事前読み取り、ID の chunk 分割、`taskListOrder` の変化による再購読は行わない。表示は `taskListOrder` の順に、クエリ結果にある ID だけを並べる。
- 3 プラットフォームとも、taskListOrder と taskLists の購読は uid ごとに 1 組とし、並び替え・作成・名前変更で張り直さない。
- Firestore のローカルキャッシュに実データがある場合は、placeholder / skeleton より cache hydrate 済み実データ表示を優先する。
- 起動時は永続 Firestore cache を有効にし、settings / taskListOrder / taskLists の cache 読み取りを初回 UI 構築と並行して開始する。iOS は cache 読み取りを並列実行し、Android は翻訳 JSON の preload と同じ background thread から開始する。
- taskLists の購読は taskListOrder に依存しないため、起動時は taskListOrder と taskLists のクエリを同時に開始する。
- Web の通常購読は listener が返す初回 cache snapshot をそのまま hydrate に使い、同じ参照への明示的な cache get を重ねない。起動前 warm-up の cache get は IndexedDB と Firestore client の初期化だけを目的とする。
- settings listener は metadata change を受け取り、cache snapshot で即時表示を更新する。server 確定かつ pending write なしの snapshot だけを同期復旧・通常のキャッシュ更新の確定点とする。iOS の `startupView` だけは設定選択時に起動用 UserDefaults も即時更新し、書き込み失敗時は直前値へ戻す。設定変更はサーバー応答を待たずに次の変更を受け付け、書き込み失敗は後述の同期失敗通知で知らせる。
- `taskLists` クエリは cache / live snapshot とも snapshot 全体で置き換える（差分適用しない）。
- Firestore listener がエラーを返した場合は、現在の購読を解除して同じ参照を再登録する。再試行は 1 秒から始め、2 倍ずつ最大 30 秒まで待ち、画面・ユーザーの購読スコープが終了するまで継続する。cache snapshot は復旧扱いにせず、server snapshot の受信で待ち時間を初期化する。
- UI 更新系は listener 反映より先に画面上の編集結果を捨てない。保存後も Firestore が同じ内容へ追いつくまで local pending 表示を優先する。詳細は [task-lists.md](./task-lists.md)。
- 書き込み前の読み取り（task mutation の基準・リスト作成時の順序・リスト削除時の `memberCount`）は、listener が最新に保っている cache を優先し、cache にない場合だけ SDK の既定取得を使う。共有コードの生成・解除・解決、共有参加、退会、サインアップ初期データはサーバー値を読む。
- taskLists listener はmetadata changeを受け取り、部分mapの自動除去は `isFromCache/fromCache == false` かつ `hasPendingWrites == false` のsnapshotだけで行う。cacheの古い状態を根拠にserverデータを削除しない。

## オフライン

- Firestore の永続 cache（Web / iOS は容量無制限、Android も `CACHE_SIZE_UNLIMITED`）を正とし、オフライン中も閲覧・タスク操作・リスト作成 / 名前 / 背景 / 並び替え / 削除・設定変更を行える。書き込みは SDK が端末へ即時反映し、未送信分は再起動後も保持して再接続時に自動送信する。
- UI は書き込みを SDK へ投入した時点で完了として扱い、sheet / dialog を閉じ、画面遷移する。サーバー応答（Web の write Promise、iOS の completion、Android の Task）は後から監視し、UI を待たせない。local pending / 楽観表示だけは従来どおりサーバー応答（queue のドレイン）まで保持し、listener への反映前に旧表示へ戻さない。
- 再接続後に Rules などでサーバーが書き込みを拒否した場合、SDK が端末上の変更を取り消す。3 プラットフォームともルートの `OfflineNotice` に `common.syncFailed` を閉じるボタン付きで表示し、スクリーンリーダーへ通知する。自動実行の部分 map 除去の失敗は通知しない。
- サーバーでの判定が必要な操作（ログイン / サインアップ / パスワードリセット、メールアドレス変更、退会、共有コードの生成・解除・解決、共有参加）はオフライン中に無効化し、`common.requiresConnection` を表示する。退会で離脱するリストの batch はサーバー応答を待ってから次の削除へ進む。
- 新規作成したリストは、一覧の listener に現れてから詳細を開く（現れる前に開くとページャーが先頭リストへ選択を戻すため）。書き込み失敗を受け取った場合は待機を解除する。
- ログアウト前に SDK の `waitForPendingWrites` を 1 秒だけ待ち、完了しなければ確認ダイアログを `auth.signOutConfirm.unsyncedMessage` に切り替える。未送信の書き込みは uid ごとに端末へ残り、同じユーザーがその端末で再ログインすると送信されるため、ログアウト時に Firestore の cache は削除しない。
- Web の Firestore は Firebase Auth の初期化完了（保存済みユーザーのサーバー再検証を含む）まで cache 読み取りと書き込みを開始しない。完全なオフラインでは再検証が即座に失敗して進むが、通信が極端に不安定な環境では Auth のタイムアウト（最大 30 秒）まで表示が遅れる。iOS / Android の Auth は保存済みユーザーを同期的に復元するため影響しない。

## createdAt / updatedAt

- `settings` / `taskLists` / `taskListOrder` / `shareCodes` の `createdAt` / `updatedAt` は Unix epoch milliseconds の number で書き込む。`settings` の時刻 field だけは表示・同期に必須ではない。
- server timestamp は使わない。Firestore Rules の `int` 型検証と pending snapshot の安定性に合わせるため。
- 読み取り側は timestamp-like 値が混在しても `estimate` として解決し、UI へ `null` を流さない。

## Firestore ルール

- `settings/{uid}` と `taskListOrder/{uid}` は本人のみ読み書き可能。
- `shareCodes/{shareCode}` は `get` のみ誰でも可能で、`list` は不可。作成は認証済みかつ対象リストを保持しているユーザーに限り、さらに同一 commit で `taskLists/{taskListId}.shareCode == shareCode` になることを要求する。更新は不可。
- `taskLists/{taskListId}` は、`memberKeys` に自分の key があるか、自分の membership document が存在するか、有効な `shareCode` がある場合に読み書きできる。`memberKeys` の判定を先に評価し、通常の読み書きで membership document の `exists()`（課金対象の読み取り）を発生させない。
- `memberKeys` は作成時は自分の key 1 件だけ、参加時（`memberCount` +1・membership 作成）は自分の key の追加だけ、離脱時（`memberCount` -1・membership 削除）は自分の key の除去だけを許可し、それ以外の更新では変更を禁止する。重複した key は許可しない。
- `taskLists/{taskListId}` は共有コードを知っているだけでは更新できない。共有コードは未参加ユーザーのプレビュー読み取りに限り、更新には membership document が必要。
- `taskLists.shareCode` は `null` か `^[A-Z0-9]{8}$` のみ許可し、新しい値は同一 commit で作成される `shareCodes` doc と一致していなければならない。新規作成時は `null` 固定。
- `taskListOrder/{uid}` は表示順だけを保持し、本人の書き込み内容が `taskLists/{taskListId}` のアクセス権を付与することはない。新規作成・共有コード加入時は membership document の作成を同一 batch に含める。
- `taskLists` の削除は最後の保持者（`memberCount <= 1`）のみ可能。
- `memberCount` は参加時 `+1`、離脱時 `-1` のみ許可する。

## membership 移行

membership document 導入前に作成された既存リストには、信頼できる管理用 Admin SDK から `taskListOrder/{uid}` と `taskLists/{taskListId}.memberCount` を照合して、保持ユーザーごとの `taskLists/{taskListId}/members/{uid}` を backfill する。`taskListOrder` に残る実体不明の ID は membership を作成せず、実体の `memberCount` は backfill した membership 数へ補正する。

移行完了と件数照合を確認してから Firestore Rules をデプロイする。クライアント SDK には既存リストを安全に認定する権限がないため、Rules デプロイを先行すると既存ユーザーのリストが読めなくなる。

## memberKeys 移行

`memberKeys` は `members` サブコレクションを正として Admin 権限で backfill する（dry-run で差分と `memberCount` 不一致を確認してから適用し、書き込みは `updateTime` 前提条件付き）。旧 Rules は `memberKeys` を許可しないため、次の順で行う。

1. 移行用 Rules（Phase 1）をデプロイする。`memberKeys` を持たない旧クライアントの作成・参加も許可し、離脱だけは key の除去を必須にして離脱後の読み取り権を残さない。
2. backfill を適用し、再実行で差分 0 を確認する。
3. `memberKeys` クエリを使うクライアントを配布する。
4. backfill を再実行して移行期間中の旧クライアント書き込みを補正し、差分 0 を確認してから、旧クライアント向け分岐を削除した Rules（Phase 2）をデプロイする。
