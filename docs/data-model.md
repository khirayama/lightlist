# データモデル

Cloud Firestore に 6 つのトップレベルコレクションを持つ。ルール本体は `firebase/firestore.rules`を正とする。

## コレクション

### settings/{uid}

ユーザー設定。本人のみ読み書き可能。

- `theme`: `"system" | "light" | "dark"`。欠損・`null` は `"system"` として扱う。
- `language`: サポート言語コード。欠損・`null` は `"ja"` として扱う。
- `taskInsertPosition`: `"top" | "bottom"`。欠損・`null` は `"top"` として扱う。
- `autoSort`: `boolean`。新規作成時の既定値は `true`。欠損・`null` も `true` として扱い、明示された `false` はそのまま保持する。
- `startupView`: `"taskList" | "calendar" | "taskLists"`。欠損・不正値は `"taskList"` として扱う。
- `notifySharedListUpdates`: `boolean`。共有タスクリストの他メンバーによる変更通知。欠損・不正値は `false` として扱う。
- `notificationDevices`: `{ [deviceId]: { token, platform, updatedAt } }`。本人の端末ごとの FCM 登録。端末ごとの UUID をキーとし、ログアウト時にその端末の登録だけを削除する。登録内容が変わらない限り書き直さない。
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

Web は `settings` / `taskListOrder` / `taskLists` / `shareCodes` の購読・単発取得を共通の境界検証へ通し、トップレベルfieldと動的mapの全要素を検証してからドメインモデルへ渡す。不正な `settings` と `taskListOrder` の必須時刻 field は読み込みエラーとし、不正な `taskLists` document は当該documentだけを表示対象から外す。3 プラットフォームの `taskListOrder` の動的要素は、有効な document ID（空文字・`/` を含む ID は除外）と有限の数値 `order` を持つ map だけを採用し、不正な要素やドットを含む余分な数値 field は無視する。bool は数値として扱わない。task map 内の不正要素はリスト全体を無効にせず除外し、server確定snapshotで自動削除する。

iOS / Android の `taskLists` と `settings` の読み取りは型付きのレコード（iOS は `Codable`、Android は map から手で組み立てる record）へ変換してからドメインモデルへ渡す。トップレベルの `taskLists` ドキュメントが型不正の場合は当該リストを表示対象から外し、空レコードへ劣化させない。動的なキーを持つ `taskListOrder`、部分mapの検証・削除、ドット記法の差分更新だけはFirestore APIの境界で動的データを使う。`theme` / `language` / `taskInsertPosition` / `autoSort` が不正な型・値の場合は設定画面を読み込みエラーとして扱い、`startupView` の不正値だけは `taskList` に正規化する。

- Android はリフレクション変換（`toObject()`）を使わないため、release の R8 keep 指定（`apps/android/app/proguard-rules.pro`）は Firebase component registrar の no-arg constructor だけを保持する。

### taskListOrder/{uid}

ユーザーごとの保持リストと表示順。本人のみ読み書き可能。認可の根拠には使わない。

- `{ [taskListId]: { order } }`
- `createdAt` / `updatedAt`

新しく追加するリストの `order` は 3 プラットフォームとも既存の最大値 + 1 とし、件数 + 1 を使わない。並び替えの field path 更新は他端末で外した ID を復活させることがあるため、order に残る非メンバーのリスト ID は表示から外すだけでエラーにしない。リスト削除・退会では、membership がない（`permission-denied` または `memberKeys` に自分の key がない）リストの order エントリーだけを外す。欠損時の作成・共有参加は merge 書き込みで `createdAt` も入れる。

### shareCodes/{shareCode}

共有コードから `taskListId` への逆引きと、未参加者向けのプレビュー。

- `taskListId`
- `createdAt`
- `preview`: 通知 Functions がリストの書き込みのたびに Admin SDK で書く表示用の写し。`name` / `background` / `tasks`（完全な task だけ）/ `syncedAt`（書き込みイベントの時刻。古いイベントで上書きしない）。`history` / `memberKeys` / `memberCount` は含めない。クライアントは書き込まない。

### notificationThrottles/{taskListId}_{actorUid}

共有リスト更新通知の、タスクリストと変更者の組ごとの抑制記録。変更者を特定できない書き込みは `{taskListId}` を document ID にする。Admin SDK だけが読み書きし、Rules ではクライアントからのアクセスを許可しない。

- `notifiedAt`: 最後に通知を配信した Unix epoch milliseconds。

### apiTokens/{tokenHash}

外部 API（MCP）用のトークン（[api.md](./api.md)）。document ID はトークン平文の SHA-256（小文字 hex 64 文字）で、平文は保存しない。

- `uid`: 発行したユーザー
- `name`: 任意の名前（50 文字以内）
- `createdAt`: Unix epoch milliseconds

Rules はクライアントに本人の uid での作成（3 field だけ）、`uid` で絞った一覧、本人の削除だけを許可し、更新と ID 指定の `get` は許可しない。検証は Functions が Admin SDK で行う。Auth ユーザーの削除時に Functions が削除する。

## 参照関係

- 表示順は `taskListOrder/{uid}` が正。保持権限は `taskLists/{taskListId}/members/{uid}` が正。
- リスト実体は `taskLists/{taskListId}` が正。
- 共有コードは `shareCodes/{shareCode}` から `taskListId` を引く。未参加者のプレビューは `shareCodes/{shareCode}.preview` だけを読み、`taskLists/{taskListId}` は読まない。
- `taskListOrder` と `taskLists` は別管理する。一方だけで順序と実体を兼ねない。加入・離脱時は order と membership、`memberCount`、`memberKeys`（自分の key だけを `arrayUnion` / `arrayRemove`）を同一 batch で更新する。

## 同期モデル

- 保持している `taskLists` は `where("memberKeys", "array-contains", <自分の key>)` の単一クエリで購読する。membership document の事前読み取り、ID の chunk 分割、`taskListOrder` の変化による再購読は行わない。表示は `taskListOrder` の順に、クエリ結果にある ID だけを並べる。
- 3 プラットフォームとも、taskListOrder と taskLists の購読は uid ごとに 1 組とし、並び替え・作成・名前変更で張り直さない。
- Firestore のローカルキャッシュに実データがある場合は、placeholder / skeleton より cache hydrate 済み実データ表示を優先する。
- 起動時は永続 Firestore cache を有効にし、settings / taskListOrder / taskLists の cache 読み取りを初回 UI 構築と並行して開始する。iOS は cache 読み取りを並列実行し、Android は翻訳 JSON の preload と同じ background thread から開始する。
- taskLists の購読は taskListOrder に依存しないため、起動時は taskListOrder と taskLists のクエリを同時に開始する。
- Web の通常購読は listener が返す初回 cache snapshot をそのまま hydrate に使い、同じ参照への明示的な cache get を重ねない。起動前 warm-up の cache get は IndexedDB と Firestore client の初期化だけを目的とする。
- Web の認証後シェルは、直近の settings / taskListOrder / taskLists を端末の localStorage に起動スナップショットとして保存し、次回起動の初回描画に使う（Firestore の cache 読み取りが認証の再検証を待つ間も内容を表示するため）。スナップショットは表示専用とし、表示中は操作を受け付けず、Firestore の購読が初回の内容またはエラーを返した時点で通常の表示へ切り替える。保存は認証済みかつ全購読が読み込み済みのときだけ行い、ログアウト・別ユーザー・不正な内容・保存失敗では破棄する。
- settings listener は metadata change を受け取り、cache snapshot で即時表示を更新する。server 確定かつ pending write なしの snapshot だけを同期復旧・通常のキャッシュ更新の確定点とする。iOS の `startupView` だけは設定選択時に起動用 UserDefaults も即時更新し、書き込み失敗時は直前値へ戻す。Android は起動用にテーマ・言語・追加位置・autoSort・起動画面を端末へ保存し、初回フレームの表示と起動画面の判定に使う。保存値は cache / pending を含む存在する settings snapshot に追従させ、書き込みがサーバーに拒否された場合も後続 snapshot で元へ戻る。設定変更はサーバー応答を待たずに次の変更を受け付け、書き込み失敗は後述の同期失敗通知で知らせる。
- `taskLists` クエリは cache / live snapshot とも snapshot 全体で置き換える（差分適用しない）。
- Firestore listener がエラーを返した場合は、現在の購読を解除して同じ参照を再登録する。再試行は 1 秒から始め、2 倍ずつ最大 30 秒まで待ち、画面・ユーザーの購読スコープが終了するまで継続する。cache snapshot と pending write を含む snapshot は復旧扱いにせず、server 確定かつ pending write なしの snapshot の受信で、その参照だけの失敗状態と待ち時間を初期化する。順序とリストの listener は metadata change も受け取る。
- 背景から前景へ戻ったときの接続の張り直しは SDK ごとに異なる。iOS の SDK は前景復帰のたびに張り直す。Android の SDK は自身を接続中と判定している間は張り直さず、Web の SDK はブラウザーの online / offline だけを契機にするため、背景中に切れた接続に気付くまで他端末の更新が届かず、書き込みの応答も返らない。Android は Activity が 30 秒以上停止した後の再開時、Web は page が 30 秒以上 hidden だった後に visible へ戻ったときに、`disableNetwork` → `enableNetwork` で接続を張り直す。listener と未送信の書き込みは維持され、張り直しの間は cache 由来の snapshot が届く。iOS には追加しない。
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

## Firestore ルール

- `settings/{uid}` と `taskListOrder/{uid}` は本人のみ読み書き可能。
- `shareCodes/{shareCode}` は `get` のみ誰でも可能で、`list` は不可。リストの現在のコードと一致しない文書の取得は拒否する。作成は認証済みかつ対象リストを保持しているユーザーに限り、キーは `taskListId` / `createdAt` だけ、さらに同一 commit で `taskLists/{taskListId}.shareCode == shareCode` になることを要求する。クライアントからの更新は不可（`preview` は Functions だけが書く）。
- `taskLists/{taskListId}` は `memberKeys` に自分の key がある場合だけ読み書きできる（参加の commit だけは同時に作る自分の membership document で判定する）。`memberKeys` は必須 field。共有コードの有無では読み取りを許可しない（`taskListId` を知っているだけの旧コード保持者や元メンバーが、コードの再発行後も読み続けられないようにするため）。
- `memberKeys` は作成時は自分の key 1 件だけ、参加時（`memberCount` +1・membership 作成）は自分の key の追加だけ、離脱時（`memberCount` -1・membership 削除）は自分の key の除去だけを許可し、それ以外の更新では変更を禁止する。重複した key は許可しない。
- `taskLists/{taskListId}` は共有コードを知っているだけでは読み書きできない。共有コードで読めるのは `shareCodes/{shareCode}.preview` だけで、更新には membership document が必要。
- `taskLists.shareCode` は `null` か `^[A-Z0-9]{8}$` のみ許可し、新しい値は同一 commit で作成される `shareCodes` doc と一致していなければならない。新規作成時は `null` 固定。
- `taskListOrder/{uid}` は表示順だけを保持し、本人の書き込み内容が `taskLists/{taskListId}` のアクセス権を付与することはない。新規作成・共有コード加入時は membership document の作成を同一 batch に含める。
- `taskLists` の削除は最後の保持者（`memberCount <= 1`）のみ可能。
- `memberCount` は参加時 `+1`、離脱時 `-1` のみ許可する。
