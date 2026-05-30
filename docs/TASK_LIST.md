# タスクリスト

## データモデル

- `taskLists/{taskListId}`
  - `id`
  - `name`
  - `tasks`
  - `history`
  - `shareCode`
  - `background`
  - `memberCount`
  - `createdAt`
  - `updatedAt`
- `taskListOrder/{uid}`
  - `{ [taskListId]: { order } }`
  - `createdAt`
  - `updatedAt`
- `shareCodes/{shareCode}`
  - `taskListId`
  - `createdAt`

## 参照関係

- 表示順は `taskListOrder/{uid}` が正。
- 実体は `taskLists/{taskListId}` が正。
- 共有コードは `shareCodes/{shareCode}` から `taskListId` を引く。
- `memberCount` はそのリストを保持しているユーザー数。

## 購読

- Web は `taskListOrder/{uid}` を購読して対象 `taskListId` を解決する。
- 対象 `taskLists` は 10 件ずつ chunk に分けて購読する。
- 共有ページや未保持リストの詳細表示は、対象 `taskLists/{taskListId}` を個別購読する。
- iOS / Android も `taskListOrder` と `taskLists` を別購読し、順序付きリストを組み立てる。
- Web / iOS / Android の UI 更新系は、listener の反映より先に画面上の編集結果を捨てない。task 本文編集の blur、task 並び替え、taskList 並び替え、日付変更、ピン切り替え、完了切り替えは、Firestore snapshot が同じ内容へ追いつくまで local pending state を優先表示する。
- Web / iOS / Android の task 更新 UI は、`現在表示中 task 群 -> 正規化済み next task 群 -> local pending 表示 -> taskListId 単位 queue 経由の保存` の順で処理する。
- task 一覧の空状態判定も local pending 表示を含む現在表示中 task 群を基準に行い、空リストへの 1 件目追加でも listener 反映待ちに戻さない。

## タスクリスト操作

- `createTaskList(name, background)` は `taskLists` 実体の作成と `taskListOrder` への追加を同時に行う。
- `updateTaskList()` は `name` と `background` を更新する。
- Android のリスト編集ダイアログには `taskList.deleteList` 導線を含め、確認ダイアログを経由して「一覧から外す」を実行できる。
- `background` は Web / iOS / Android で、選択中タスクリスト詳細の背景として使う。compact 幅は画面全体、regular 幅は右ペインの外周と本文にだけ適用し、左ペインと split 境界線には影響させない。未設定時は各プラットフォームの通常背景色へフォールバックする。
- Web / iOS / Android のタスクリスト詳細画面は、ページャーのインジケータだけを固定表示し、タスクリスト名、タスク追加欄、並び替え・完了済み削除操作、タスク一覧は同じスクロール領域に含める。
- Web の compact 幅タスクリスト詳細の横ページャーは 1 回の横スワイプで 1 タスクリストずつ snap し、途中で複数ページをまたいで進まない。
- Web の task row の drag handle は、タスク並び替えの操作中およびハンドル接触中に親カルーセルの横スクロールを発火させない。
- Web を基準に、タスクリスト一覧のサイドバーは外周 `16pt/dp` の余白を持つコンテナとして扱い、メール行、カレンダーボタン、一覧、作成/参加ボタンの順に積む。選択中行のハイライトは行自身の角丸背景にだけ付与し、外側コンテナへ広げない。
- iOS のサイドバーにある「カレンダーで確認」ボタンは、枠線で示した横幅いっぱいの領域全体を押下可能範囲として扱う。
- Web / iOS / Android の「カレンダーで確認」は sheet/modal ではなく通常の page/screen として開く。compact 幅は一覧から通常遷移で開き、regular/tablet 幅は左 sidebar を維持したまま右 pane に表示する。
- Android の「カレンダーで確認」画面は詳細/設定と同じ top bar 系統に載せ、月移動ヘッダーを本文先頭へ置く。タスク一覧の区切り線は左 `16dp` の inset を持つ。
- Android の「カレンダーで確認」画面は上端に `WindowInsets.safeDrawing` を反映し、戻るボタンと月移動ボタンはステータスバーと重ならない。日付ドットは背景色未設定のリストでも枠線付きで可視化し、一覧行を押した時は該当日付をカレンダー側でも選択状態にしつつ対象タスクリスト詳細へ遷移する。
- iOS / Android のタスクリスト詳細本文は、背景色を画面側で保持したまま、本文だけに左右 `16pt/dp` の余白を付ける。wide/regular 幅の本文最大幅は Web の `max-w-3xl` に合わせて約 `768pt/dp` とする。
- iOS / Android のページャー内の各タスクリスト詳細ページは背景を持たず透過とする。背景色は選択中タスクリストに応じた親コンテナだけが保持し、横スクロール中にページ単位で色面が切り替わらないようにする。
- iOS / Android のタスクリスト詳細ヘッダーとページャーインジケータは、背景を持たない前景レイヤーとして重ねる。タスクリスト背景は画面上端から塗り、本文スクロール領域側でその前景分の上余白を確保して見た目位置を維持する。
- Android の `TaskListDetailPagerScreen` のページインジケータは、固定ヘッダー直下に隙間なく接続する横幅いっぱいのフラットな背景帯として描画する。背景色は選択中タスクリストの `background` と同じ解決色をそのまま使い、角丸・枠線・影・透明度差は付けない。
- iOS / Android の compact 幅タスクリスト詳細は、戻るボタン行とページャーインジケータ行を縦に分け、タイトル行・入力欄・操作列・タスク行までの余白を詰めて単票リファレンスに近い密度で配置する。入力欄の追加ボタンは入力文字がある時だけ表示し、未完了トグルは薄い枠線円、完了トグルは薄いグレー塗り円で表現する。
- iOS / Android の compact/regular 共通タスクリスト詳細は、本文の文字サイズと視覚余白を iOS に近い密度へ寄せつつ、編集・共有・追加・日付・完了・ドラッグ操作のタップ領域は iOS `44pt` 前後、Android `48dp` を維持する。global theme は変えず、`TaskListDetailPage` ローカルの metrics で調整する。iOS のアプリ内アイコンの視覚サイズは `ContentView.swift` の metrics で用途別に統一し、標準アクションとナビゲーションは `22pt`、テキスト横の補助アクションは `18pt`、詳細画面の小型アクションは `20pt` を基準とする。Android のアプリ内アイコンの視覚サイズは `ContentView.kt` の metrics で用途別に統一し、標準アクションは `24dp`、テキスト横の補助アクションは `18dp`、詳細画面の小型アクションは `20dp` を基準とする。
- Android の `TaskListDetailPage` では、ヘッダー右上 action、操作列 icon、task row 右端 action、drag handle の見た目サイズと左右端の x 軸整列を同じ local metrics で管理する。個別 `offset` に頼らず、各 icon は `48dp` 前後の hit area 内で視覚的に一直線に見える配置を正とする。
- Android の `TaskListDetailPage` の本文系テキスト（新規入力欄、task 本文、インライン編集欄、日付ラベル）は、共通の local `TextStyle` を基準に `includeFontPadding = false` と固定 line height を使う。日本語 UI で英字や数字を入力しても行ボックスの高さを変えず、新規入力欄はローカル metrics の最小高さを維持する。
- Web / iOS / Android の完了 task row は、打ち消し線と muted 色に加えて行全体へ標準強度の透明度を掛け、日付ラベル・完了トグル・本文・日付ボタン・ドラッグハンドルをまとめて減衰させる。共有コードプレビューの task 行も同じ完了表現に揃える。
- Android の `TaskListDetailPage` は、タイトル・入力欄・操作列のセクション間余白、操作列とタスク一覧の区切り余白、タスク行同士の余白を別メトリクスで管理する。タスク行間はセクション間より詰め、一覧密度を上げても各操作の `48dp` タップ領域は維持する。
- Android のタスクリスト一覧ヘッダー、詳細ヘッダー、設定ヘッダーは `WindowInsets.safeDrawing` を考慮して上端へ配置し、メールアドレス、設定導線、戻るボタン、タイトルがステータスバーにかからず、ヘッダー本体の固定高さ内でクリップされないようにする。
- Android の inline task 編集中は、hardware keyboard の矢印キーと Enter を編集欄内で完結させる。`←` / `→` は caret 移動だけを行い、`↑` / `↓` は no-op として consume し、pager 切替や近傍要素への focus 移動を起こさない。Enter は task を確定して編集終了するだけで、一覧表示や戻る導線を発火させない。
- iOS / Android の task row は、drag handle・完了トグル・本文の縦方向中心を揃える。Android は `task.text` の 1 行目中心を基準とし、複数行でもその基準を維持する。日付がある場合も `task.text` / 編集中の入力欄の縦位置は変えず、補助ラベルとして同じ本文領域内の直上へ近接配置する。iOS は日付ラベル下の余白を負方向に少し詰め、本文領域の中心線を基準に揃える。
- Web の task row は、`task.text === ""` の場合も本文表示要素で 1 行分の最小高さを維持し、空本文でも行の高さを潰さない。
- Android の task row は、drag handle と完了トグルの間隔をやや詰め、完了トグルと本文開始位置の間隔はそれより少し広く取る。`drag handle`・完了トグル・`task.text` は本文 1 行目の中心線で揃え、本文が複数行でも基準は 1 行目とする。日付ラベルは同じ本文領域内で `offset` によりわずかに上へ寄せ、本文や完了トグルの縦位置を押し下げない。
- Android の `TaskListDetailPage` の task row は、`alignBy` に依存しない単純な `Row + Column` 構成を使い、非ドラッグ行では drag 用 transform を載せない。`LazyColumn` の task item は `contentType = "task"` を付け、header / input / actions / empty state と分けて composition reuse を安定させる。
- Android の task row / task list row の handle 並び替えは、pointer を離すまで同じ drag session を維持し、1 回 swap した直後に gesture detector を再生成しない。`TaskListDetailPage` の task row handle は中央寄せした `24dp` 幅の hit area を持ち、アイコンを見切らせない。
- Web / iOS / Android の task 右端 action は、task ごとの sheet / dialog でピン留め切替・日付選択・日付クリアをまとめて扱う。ピン留め切替・日付選択・日付クリアは即時保存し、保存後は sheet を閉じる。
- task action sheet / dialog の visible UI には `pages.tasklist.setDate` タイトルや task 名を表示しない。用途説明はアクセシビリティ名として保持する。
- Android の task action は `ModalBottomSheet` と Compose Material3 `DatePicker` を使い、sheet 本文は縦スクロール可能にする。`DatePicker` の title / headline / mode toggle は表示しない。Web は狭幅で actual bottom sheet・広幅で centered dialog、iOS は `sheet` + graphical `DatePicker` を使う。
- Web の task action は route hash を変えずに `history.state` を 1 段積み、ブラウザ/端末の戻る操作で先に sheet を閉じる。`Esc` や overlay dismiss 後も起点ボタンへ focus を戻す。
- 3平台とも可能な限りキーボードのみ操作を維持する。
- `updateTaskListOrder()` は並び替え後に `1.0` 始まりの連番へ振り直す。
- `deleteTaskList()` は事前 read 後の batch write で次を行う。
  - 自分の `taskListOrder` から対象を外す。
  - `memberCount` を 1 減らす。
  - 現在の `memberCount` が 1 以下の場合だけ `taskLists` 実体を削除する。
  - 現在の `shareCode` があれば `shareCodes/{code}` も削除する。
  - `taskListOrder` ドキュメント自体は空になっても削除せず、対象 field の削除だけを行う。

## タスク操作

- `tasks` は `id`, `text`, `completed`, `date`, `order`, `pinned` を持つ。
- `pinned` 未設定の既存 task は `false` として扱う。`pinOrder` のような別順序フィールドは持たず、`order` を task 順序の唯一の正本にする。
- Web / iOS / Android の `addTask()` は入力先頭の日付表現と pin prefix を解析し、`text` / `date` / `pinned` に分離する。
- pin prefix は各言語の短い代表語（`ja: ピン`, `es: fijar`, `de: anheften`, `fr: epingler/épingler`, `ko: 고정`, `zh-CN: 置顶`, `hi: पिन`, `ar: تثبيت`, `pt-BR: fixar`, `id: sematkan`）に加え、全言語で `pin` / `pinned` を許可する。
- 日付解析は `yyyy-mm-dd` / `mm-dd` / `mm/dd` / `mm.dd` と各言語の相対表現を扱い、全言語で英語の相対表現（`today` / `tomorrow` / `day after tomorrow` / `in N days` / `N days later` / 英語曜日名）も併用許可する。
- 数字はアラビア数字に加えてアラビア語、ペルシャ語、デーヴァナーガリー数字を正規化する。
- Web の parser 仕様を正本とし、iOS / Android も対応言語・先頭一致ルール・解釈順序を揃える。
- parser は先頭から最大 2 つの修飾子を順不同で剥がし、`pin-prefix -> date -> text` と `date -> pin-prefix -> text` の両方を許可する。
- Web / iOS / Android の本文編集確定時も同じ parser を通し、先頭日付表現を認識できた場合だけ `date` を更新する。pin prefix を認識できた場合だけ `pinned` を `true` に更新し、prefix がないことを理由に自動解除しない。
- 本文編集で日付表現を取り除いた結果 `text` が空になる場合は、既存 `text` を維持したまま `date` だけ更新する。
- `taskInsertPosition` が `top` の場合は先頭、`bottom` の場合は末尾へ追加する。
- Android のタスク追加後は、自動スクロールで追加位置へ移動しない。追加前のスクロール位置を維持する。
- Android のタスク追加後は入力欄の focus を維持したまま IME を閉じない。
- Android のタスク入力欄の送信アイコンは Web と同様に入力欄 focus 中だけ横方向アニメーションで表示し、入力文字が空の間は disabled のまま保つ。
- 表示順は `未完了 pinned -> 未完了 unpinned -> 完了` とし、各グループ内は `order` 昇順を使う。
- pinned task は Web / iOS / Android のタスク行で強めの本文 weight を使って通常 task と区別する。右端の task action はカレンダーアイコンではなくピンアイコンを表示し、同じ sheet / dialog からピン切替・日付設定・日付クリアを開く。
- pinned 内や unpinned 内の D&D は `order` を更新する。異なる表示グループをまたぐ D&D は行わず、グループ移動はピン切替または完了切替で行う。
- iOS の task ハンドル D&D は、ドラッグ開始前の表示順とドロップ後の表示順を比較し、差分がある場合だけ `tasks.*.order` を保存する。
- `autoSort` 有効時は `未完了 pinned -> date -> order`、`未完了 unpinned -> date -> order`、`完了 -> date -> order` の順で並べ直す。
- `autoSort` 無効時に pinned を解除した task は、未完了 unpinned グループの先頭へ入るよう `order` を再採番する。`autoSort` 有効時は通常の自動並び替えルールに従う。
- Web の task 更新系は Firestore の `tasks` map の列挙順を信用せず、常に `order` 昇順の配列へ直してから追加・並び替え・自動並び替え・完了済み削除を計算する。
- iOS / Android の `TaskListDetailPage` でも `autoSort` 有効時は、タスク追加、完了切替、本文編集、日付変更、完了済み削除のたびに同じ順序で再採番して Firestore へ保存する。
- `history` は重複を除きつつ先頭追加し、最大 300 件を保持する。
- Web / iOS / Android のタスク入力欄は `taskLists.history` を候補元として共有し、trim 後 2 文字以上の部分一致だけを最大 20 件表示する。完全一致候補は出さず、候補選択時は入力欄への挿入ではなくその文言を即追加する。iOS の候補 UI は本文上の overlay ではなく `popover` presentation で表示し、本文操作と hit area を分離する。
- Web の `sortTasks()` と `updateTasksOrder()` は順序系操作のたびに全 task を連番で再採番して保存し、既存の `order` 不整合もその操作時に補正する。
- `updateTask()` は `autoSort: false` では対象 task の項目だけを更新する。ただし pinned 解除時は未完了 unpinned 先頭へ入るよう task 集合を再構成して保存する。`autoSort: true` のときは自動並び替え順で task 集合を再構成して保存する。
- `deleteCompletedTasks()` は完了済み task を削除し、残りを再採番する。
- UI 更新系では transaction を使わない。並び替えや本文編集の保存要求後も、listener が旧 snapshot を返している間は local pending state を表示し続け、旧 `task.text` や旧 order を一瞬再表示しない。Web の local pending state も `autoSort` 有効時は `未完了 pinned -> 未完了 unpinned -> 完了` と各グループ内 `date -> order` に正規化して保持する。
- Web / iOS / Android の task 更新系書き込みは、同一 `taskListId` 内でクライアントごとに直列化する。追加直後の完了切替・本文編集・日付変更・ピン切替・並び替え・完了済み削除が前の保存を追い越さないようにし、追加直後の task も同じ `taskId` を optimistic 表示と Firestore 保存で共有する。
- local pending state の解放判定は、listener 側 task 群も同じ正規化へ通した結果と比較し、一致した時だけ行う。
- Web の optimistic task 追加は `taskInsertPosition` をその場の pending 表示にも反映し、`top` は先頭、`bottom` は末尾へ挿入した状態から正規化する。

## 共有

- `generateShareCode()` は 8 文字の英数字大文字コードを暗号学的乱数で生成する。Web は `crypto.getRandomValues`、iOS は `SecRandomCopyBytes`、Android は `SecureRandom` を使う。
- 既存共有コードがあれば削除してから新しいコードへ置き換える。
- `removeShareCode()` は `taskLists.shareCode` を `null` に戻し、対応する `shareCodes` ドキュメントを削除する。
- 共有コードの生成・削除は transaction ではなく、事前 read 後の batch write で `shareCodes` と `taskLists.shareCode` を更新する。
- `fetchTaskListIdByShareCode()` は共有コードから `taskListId` を解決する。
- `addSharedTaskListToOrder()` は事前 read 後の batch write で次を行う。
  - 自分の `taskListOrder` に末尾追加する。
  - `memberCount` を `+1` する。
  - `taskListOrder/{uid}` が欠損している場合は merge 書き込みで自動作成する。
  - 既に追加済みの場合は no-op とし、`memberCount` を重複加算しない。

## 共有権限

- 共有 URL を知っているユーザーは、未認証でも共有リストを閲覧・編集できる。
- 共有コードは bearer credential として扱い、コードを知っている利用者は認証状態に関わらず対象リストの `name` `tasks` `history` `background` `shareCode` を更新できる。
- 自分の一覧へ追加する操作だけは認証が必要。
- 認証済みユーザーは、自分の `taskListOrder/{uid}` へ `taskListId` を追加することで、そのリストを自分の保持リストとして扱う。これは共有済み・参加済みリストを自分の一覧へ取り込むための意図した権限付与手段とする。

## Firestore ルール

- `settings/{uid}` と `taskListOrder/{uid}` は本人のみ読み書き可能。
- `shareCodes/{shareCode}` は `get` のみ誰でも可能で、`list` は不可。
- `taskLists/{taskListId}` は、自分の `taskListOrder` に含まれるか、有効な `shareCode` がある場合に読み書きできる。
- `taskListOrder/{uid}` の本人書き込み内容は制限せず、対象 `taskListId` を保持リストへ追加した時点で `taskLists/{taskListId}` へのアクセス根拠として扱う。
- `taskLists` の削除は最後の保持者のみ可能。
- `memberCount` は通常据え置きで、参加時 `+1`、離脱時 `-1` のみ許可する。

## すること

- タスクリスト仕様を変える時は `taskListOrder` と `taskLists` を別管理する前提を崩さない。
- 削除仕様は「一覧から外す」を基本にし、現在の `memberCount` が 1 以下の場合だけ実体削除する。
- `autoSort` 有効時は Web / iOS / Android で `未完了 pinned -> 未完了 unpinned -> 完了` と各グループ内の `date -> order` を揃える。
- 背景色は選択中タスクリスト詳細の背景として扱い、一覧ペインや split 境界線へ広げない。

## しないこと

- `taskLists` だけでユーザーごとの並び順を管理する前提を書かない。
- 共有 URL を知る未認証ユーザーが閲覧・編集できない前提に変えない。
- Android の件数表示を固定文字列で説明しない。`taskCount_one` / `taskCount_other` を使う。
