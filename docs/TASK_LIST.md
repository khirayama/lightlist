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
- 共有ページは `subscribeToSharedTaskList(taskListId)` で個別購読する。
- iOS / Android も `taskListOrder` と `taskLists` を別購読し、順序付きリストを組み立てる。

## タスクリスト操作

- `createTaskList(name, background)` は `taskLists` 実体の作成と `taskListOrder` への追加を同時に行う。
- `updateTaskList()` は `name` と `background` を更新する。
- Android のリスト編集ダイアログには `taskList.deleteList` 導線を含め、確認ダイアログを経由して「一覧から外す」を実行できる。
- `background` は Web / iOS / Android で、選択中タスクリスト詳細の背景として使う。compact 幅は画面全体、regular 幅は右ペインの外周と本文にだけ適用し、左ペインと split 境界線には影響させない。未設定時は各プラットフォームの通常背景色へフォールバックする。
- Web / iOS / Android のタスクリスト詳細画面は、ページャーのインジケータだけを固定表示し、タスクリスト名、タスク追加欄、並び替え・完了済み削除操作、タスク一覧は同じスクロール領域に含める。
- Web を基準に、タスクリスト一覧のサイドバーは外周 `16pt/dp` の余白を持つコンテナとして扱い、メール行、カレンダーボタン、一覧、作成/参加ボタンの順に積む。選択中行のハイライトは行自身の角丸背景にだけ付与し、外側コンテナへ広げない。
- iOS のサイドバーにある「カレンダーで確認」ボタンは、枠線で示した横幅いっぱいの領域全体を押下可能範囲として扱う。
- Android の「カレンダーで確認」シートは iOS に寄せ、ドラッグハンドルを出さず、上部に `閉じる` ボタンと中央タイトル、その下に月移動ヘッダーを置く。タスク一覧の区切り線は左 `16dp` の inset を持つ。
- Android の「カレンダーで確認」シートは上端に `WindowInsets.safeDrawing` を反映し、閉じるボタンと月移動ボタンはステータスバーと重ならない。日付ドットは背景色未設定のリストでも枠線付きで可視化し、一覧行を押した時は該当日付をカレンダー側でも選択状態にする。
- iOS / Android のタスクリスト詳細本文は、背景色を画面側で保持したまま、本文だけに左右 `16pt/dp` の余白を付ける。wide/regular 幅の本文最大幅は Web の `max-w-3xl` に合わせて約 `768pt/dp` とする。
- iOS / Android のページャー内の各タスクリスト詳細ページは背景を持たず透過とする。背景色は選択中タスクリストに応じた親コンテナだけが保持し、横スクロール中にページ単位で色面が切り替わらないようにする。
- iOS / Android のタスクリスト詳細ヘッダーとページャーインジケータは、背景を持たない前景レイヤーとして重ねる。タスクリスト背景は画面上端から塗り、本文スクロール領域側でその前景分の上余白を確保して見た目位置を維持する。
- iOS / Android の compact 幅タスクリスト詳細は、戻るボタン行とページャーインジケータ行を縦に分け、タイトル行・入力欄・操作列・タスク行までの余白を詰めて単票リファレンスに近い密度で配置する。入力欄の追加ボタンは入力文字がある時だけ表示し、未完了トグルは薄い枠線円、完了トグルは薄いグレー塗り円で表現する。
- iOS / Android の compact/regular 共通タスクリスト詳細は、本文の文字サイズと視覚余白を iOS に近い密度へ寄せつつ、編集・共有・追加・日付・完了・ドラッグ操作のタップ領域は iOS `44pt` 前後、Android `48dp` を維持する。global theme は変えず、詳細画面ローカルの metrics で調整する。iOS のアプリ内アイコンの視覚サイズは `ContentView.swift` の metrics で用途別に統一し、標準アクションとナビゲーションは `22pt`、テキスト横の補助アクションは `18pt`、詳細画面の小型アクションは `20pt` を基準とする。Android のアプリ内アイコンの視覚サイズは `ContentView.kt` の metrics で用途別に統一し、標準アクションは `24dp`、テキスト横の補助アクションは `18dp`、詳細画面の小型アクションは `20dp` を基準とする。
- Android の `TaskListDetailPage` は、タイトル・入力欄・操作列のセクション間余白、操作列とタスク一覧の区切り余白、タスク行同士の余白を別メトリクスで管理する。タスク行間はセクション間より詰め、一覧密度を上げても各操作の `48dp` タップ領域は維持する。
- Android のタスクリスト一覧ヘッダー、詳細ヘッダー、設定ヘッダーは `WindowInsets.safeDrawing` を考慮して上端へ配置し、メールアドレス、設定導線、戻るボタン、タイトルがステータスバーにかからず、ヘッダー本体の固定高さ内でクリップされないようにする。
- Android の inline task 編集中は、hardware keyboard の矢印キーと Enter を編集欄内で完結させる。`←` / `→` は caret 移動だけを行い、`↑` / `↓` は no-op として consume し、pager 切替や近傍要素への focus 移動を起こさない。Enter は task を確定して編集終了するだけで、一覧表示や戻る導線を発火させない。
- iOS / Android の task row は、drag handle・完了トグル・本文の縦方向中心を揃える。日付がある場合も `task.text` / 編集中の入力欄の縦位置は変えず、補助ラベルとして同じ本文領域内の直上へ近接配置する。iOS は日付ラベル下の余白を負方向に少し詰め、本文領域の中心線を基準に揃える。
- Android の task row は、drag handle と完了トグルの間隔をやや詰め、完了トグルと本文開始位置の間隔はそれより少し広く取る。日付表示がある行でも `drag handle`・完了トグル・`task.text` の中心軸は揃えたまま、日付ラベル側をわずかに上へ寄せて `task.text` との視覚間隔を広げる。
- Android の task 日付設定ダイアログは platform `DatePickerDialog` を使い、positive button は `pages.tasklist.setDateShort`、neutral button は `pages.tasklist.clearDateShort` を使って 3 ボタンを横並びに収める。Compose Material3 `DatePicker` と custom 月間カレンダーは使わない。
- `updateTaskListOrder()` は並び替え後に `1.0` 始まりの連番へ振り直す。
- `deleteTaskList()` は次を transaction で行う。
  - 自分の `taskListOrder` から対象を外す。
  - `memberCount` を 1 減らす。
  - `memberCount` が 0 以下になる場合だけ `taskLists` 実体を削除する。
  - 現在の `shareCode` があれば `shareCodes/{code}` も削除する。

## タスク操作

- `tasks` は `id`, `text`, `completed`, `date`, `order` を持つ。
- Web の `addTask()` は入力先頭の日付表現を解析し、`text` と `date` に分離する。
- 日付解析は `yyyy-mm-dd` / `mm-dd` / `mm/dd` / `mm.dd` と各言語の相対表現を扱う。
- 数字はアラビア数字に加えてアラビア語、ペルシャ語、デーヴァナーガリー数字を正規化する。
- `taskInsertPosition` が `top` の場合は先頭、`bottom` の場合は末尾へ追加する。
- Android のタスク追加後は、自動スクロールで追加位置へ移動しない。追加前のスクロール位置を維持する。
- Android のタスク追加後は入力欄の focus を維持したまま IME を閉じない。
- Android のタスク入力欄の送信アイコンは Web と同様に入力欄 focus 中だけ横方向アニメーションで表示し、入力文字が空の間は disabled のまま保つ。
- `autoSort` 有効時は `未完了 -> date -> order` の順で並べ直す。
- iOS / Android の `TaskListDetailPage` でも `autoSort` 有効時は、タスク追加、完了切替、本文編集、日付変更、完了済み削除のたびに同じ順序で再採番して Firestore へ保存する。
- `history` は重複を除きつつ先頭追加し、最大 300 件を保持する。
- `updateTasksOrder()` は通常は対象 task の `order` だけを更新し、必要時のみ再採番する。
- `deleteCompletedTasks()` は完了済み task を削除し、残りを再採番する。

## 共有

- `generateShareCode()` は 8 文字の英数字大文字コードを生成する。
- 既存共有コードがあれば削除してから新しいコードへ置き換える。
- `removeShareCode()` は `taskLists.shareCode` を `null` に戻し、対応する `shareCodes` ドキュメントを削除する。
- `fetchTaskListIdByShareCode()` は共有コードから `taskListId` を解決する。
- `addSharedTaskListToOrder()` は transaction で次を行う。
  - 自分の `taskListOrder` に末尾追加する。
  - `memberCount` を `+1` する。

## 共有権限

- 共有 URL を知っているユーザーは、未認証でも共有リストを閲覧・編集できる。
- 自分の一覧へ追加する操作だけは認証が必要。

## Firestore ルール

- `settings/{uid}` と `taskListOrder/{uid}` は本人のみ読み書き可能。
- `shareCodes/{shareCode}` は `get` のみ誰でも可能で、`list` は不可。
- `taskLists/{taskListId}` は、自分の `taskListOrder` に含まれるか、有効な `shareCode` がある場合に読み書きできる。
- `taskLists` の削除は最後の保持者のみ可能。
- `memberCount` は通常据え置きで、参加時 `+1`、離脱時 `-1` のみ許可する。

## すること

- タスクリスト仕様を変える時は `taskListOrder` と `taskLists` を別管理する前提を崩さない。
- 削除仕様は「一覧から外す」を基本にし、`memberCount` が 0 になった時だけ実体削除する。
- `autoSort` 有効時は Web / iOS / Android で `未完了 -> date -> order` を揃える。
- 背景色は選択中タスクリスト詳細の背景として扱い、一覧ペインや split 境界線へ広げない。

## しないこと

- `taskLists` だけでユーザーごとの並び順を管理する前提を書かない。
- 共有 URL を知る未認証ユーザーが閲覧・編集できない前提に変えない。
- Android の件数表示を固定文字列で説明しない。`taskCount_one` / `taskCount_other` を使う。
