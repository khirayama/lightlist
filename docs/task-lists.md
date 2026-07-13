# タスクリストとタスク

データ構造は [data-model.md](./data-model.md)、共有は [sharing.md](./sharing.md) を参照。UI の寸法・レイアウトの細部は `AGENTS.md` を正とする。

## キーボード操作

- Web の compact layout とタスクリスト carousel は、現在表示中の画面・スライドだけを Tab 順と accessibility tree に含める。画面外へ移動した入力欄やボタンへフォーカスを移さない。
- Web の compact layout で画面を切り替えたときは main landmark へフォーカスを移し、遷移先の先頭から操作を再開できるようにする。初回表示ではフォーカスを奪わない。
- Web のタスク / タスクリスト並び替えは、drag handle へフォーカスして Space または Enter で開始し、矢印キーで移動、Space または Enter で確定、Escape でキャンセルできる。操作方法と移動結果は読み上げへ通知する。
- iOS / Android のタスク / タスクリスト並び替えは、drag handle の VoiceOver / TalkBack custom action で上・下へ移動できる。ハードウェアキーボードでは drag handle へフォーカスし、iOS は Option + 上下矢印、Android は Alt + 上下矢印で移動する。修飾なしの矢印キーは通常のフォーカス移動に使う。

## タスクリスト操作

- `createTaskList(name, background)`: `taskLists` 実体の作成と `taskListOrder` への追加を同時に行う。新規作成時の背景色は未設定（`null`）を既定とする。
- `updateTaskList()`: `name` と `background` を更新する。
- `updateTaskListOrder()`: 並び替え後に `1.0` 始まりの連番へ振り直す。連続操作時は listener 由来の旧順ではなく、ドラッグ開始時に表示していた pending を含む順序へ今回の移動を適用する。
- `deleteTaskList()`: 事前 read 後の batch write で次を行う。transaction は使わない。
  - 自分の `taskListOrder` から対象を外す。
  - `memberCount` を 1 減らす。
  - `memberCount` が 1 以下のときだけ `taskLists` 実体を削除する。
  - `shareCode` があれば対応する `shareCodes/{code}` も同じ batch で削除する。
  - `taskListOrder` ドキュメント自体は空になっても削除せず、対象 field だけ削除する。
- `background` は選択中タスクリスト詳細の背景として使う。一覧ペインや split 境界線へは広げない。未設定時は各プラットフォームの通常背景へフォールバックする。

## タスク操作

- `tasks` は `id` / `text` / `completed` / `date` / `order` / `pinned` を持つ。`pinned` 未設定の既存 task は `false` として扱う。
- 順序の唯一の正本は `order`。`pinOrder` のような別フィールドは持たない。
- `addTask()`: 入力先頭を解析して `text` / `date` / `pinned` に分離する。`order` は top で「先頭 `order` - 1」、bottom で「末尾 `order` + 1」。`taskInsertPosition` の既定（settings 未取得・欠損時）は `top`。
- `updateTask()`: 対象 task の変更だけを反映する。`pinned` 解除時は未完了 unpinned グループの先頭へ入るよう再採番する。
- `deleteCompletedTasks()`: 完了済みを削除し、残りを再採番する。
- Firestore へは差分だけ書き込む。新規 task は full object、削除 task は `tasks.<id>` delete、既存 task は変化した field と `order` だけ。

## タスク action

- task action はピン留め切替、日付選択、日付クリアを同じ sheet / dialog にまとめる。
- sheet / dialog の表示順は、右寄せの閉じる操作、ピン留め行、左寄せの日付クリア、月カレンダーとする。ピン留め行とカレンダーはボーダーレスの淡い面・角丸 12 でまとめ、日付クリアは destructive 色にせず補助テキスト action として表示する。
- visible title と task 名は表示せず、用途は sheet / dialog のアクセシビリティ名で伝える。閉じる操作、ピン留め行、日付クリアは Web / iOS で 44pt/px 以上、Android で 48dp 以上の操作領域を確保する。
- 日付クリアは対象 task に `date` がある場合だけ実行可能にする。日付未設定 task では disabled とし、no-op の保存を発生させない。
- ピン留め切替、日付選択、日付クリアはいずれも即時保存し、成功時に sheet / dialog を閉じる。失敗時は local pending を解放し、同じ画面上で汎用エラーを表示して再操作できる状態へ戻す。

## ページ切替時の入力フォーカス

- タスクリストの追加入力欄がフォーカス中にページャーをスワイプまたはスクロールして別のリストへ切り替えた場合、切替先リストの追加入力欄へフォーカスを引き継ぐ。
- 追加入力欄がフォーカス中でない場合、ページ切替によって追加入力欄を新たにフォーカスしない。

## タスク本文の編集切替

- タスク本文の編集中に別のタスクを選択した場合、切替前のタスクへその時点の編集内容を確定してから、切替先の本文で編集状態を初期化する。
- フォーカス移動後に遅れて届く旧タスクの確定イベントは、現在の編集対象 ID と一致する場合だけ処理する。切替先の本文を旧タスクへ保存しない。

## 表示順

- `未完了 pinned -> 未完了 unpinned -> 完了` の順。各グループ内は `order -> id` 昇順とし、同じ `order` が存在しても端末ごとに順序を変えない。
- `autoSort` 有効時は各グループ内を `date -> order -> id` で再採番する。
- D&D はグループ内のみ。グループ移動はピン切替・完了切替で行う。
- pinned task は強めの本文 weight で区別し、右端の task action はカレンダーではなくピンアイコンを表示する。
- Web / iOS の task 本文は URL などの長い連続文字列でも行幅内で折り返し、右端 action や周辺レイアウトを横方向へ押し出さない。

## 追加・削除・並び替えの演出

- タスク追加は約 240ms で fade in し、Web / iOS は上端から短く移動させる。Android は追加行の fade と既存行の layout spring を組み合わせる。
- 完了済みタスクの削除は約 120ms の fade out 完了後に表示と保存対象から外す。削除方向を示す横移動は付けない。
- 並び替えで押し退けられる行は約 220ms 相当の減衰した spring / ease-out で新しい位置へ移動する。ドラッグ中の行は opacity `0.8`、scale `1.03` で 3 プラットフォームを揃える。
- `autoSort` による完了切替・ピン切替・日付変更で配置が変わる場合も、ドラッグ並び替えと同じ約 220ms の移動を適用する。
- Web のoptimistic表示が同じ配置のlistener表示へ切り替わる場合、進行中の配置アニメーションを再生成・途中終了しない。
- OS / ブラウザの Reduce Motion 設定が有効な場合、追加・削除・並び替えの演出は無効化し、状態と配置を即時反映する。

## 入力解析

Web の parser を正本とし、iOS / Android も対応言語・数字正規化・先頭一致ルールを揃える。本文編集の確定時も同じ parser を通す。

- 先頭から最大 2 つの修飾子を順不同で剥がす。`pin prefix -> date -> text` と `date -> pin prefix -> text` の両方を許可する。
- 日付表現は `yyyy-mm-dd` / `mm-dd` / `mm/dd` / `mm.dd` と各言語の相対表現を扱う。全言語で英語相対表現（`today` / `tomorrow` / `day after tomorrow` / `in N days` / `N days later` / 英語曜日名）も許可する。
- `mm-dd` / `mm/dd` / `mm.dd` は当年として解釈し、解決結果が今日より過去なら翌年の同月日へ繰り上げる。
- 数字はアラビア数字に加えてアラビア語・ペルシャ語・デーヴァナーガリー数字を正規化する。
- pin prefix は各言語の短い代表語（`ja: ピン`, `es: fijar`, `de: anheften`, `fr: epingler/épingler`, `ko: 고정`, `zh-CN: 置顶`, `hi: पिन`, `ar: تثبيت`, `pt-BR: fixar`, `id: sematkan`）に加え、全言語で `pin` / `pinned` を許可する。
- 本文編集では prefix 付与時だけ `pinned` を `true` にし、prefix 不在を理由に自動解除しない。日付表現を取り除いた結果 `text` が空になる場合は、既存 `text` を維持して `date` だけ更新する。
- `date` の `"yyyy-MM-dd"` 文字列は 3 プラットフォームとも端末ローカルの暦日として解釈・生成する（formatter / parser に UTC を指定しない）。例外は Android Material3 `DatePicker` の millis 変換のみ。
- Web の日付設定とカレンダー確認で使う月表示は、利用可能な横幅を7曜日へ均等配分する。日付ボタンの大きさは固定し、各列の中央へ配置する。
- カレンダーの同日タスクは、タスクリスト順、次にそのリスト内の表示順で並べる。
- カレンダーの日付選択は、選択円を約 240ms の短い spring / scale で表示し、対応するタスク行の背景色を約 180ms で切り替える。iOS / Android は日付の直接選択時に selection feedback も返す。
- カレンダーの選択演出は OS / ブラウザの Reduce Motion 設定に従い、無効時はアニメーションせず即時に状態を反映する。
- カレンダーで日付を選択すると、「選択日の表示 + タスクを追加」の主ボタンを表示する。主ボタンは「選択日 + 閉じる → 追加先タスクリスト → 本文 → 横幅いっぱいの追加ボタン」の順で構成した sheet / dialog を開き、選択日は変更せず固定する。角丸・入力面・余白・文字階層は Web を正として 3 プラットフォームで揃え、日付付きタスクがない月でも追加できる。
- カレンダーからの追加も通常のタスク追加と同じ `taskInsertPosition` / `autoSort` / pin prefix / `history` / taskList 単位 mutation queue を使う。追加したタスクは listener 反映前からカレンダーへ楽観表示し、保存失敗時だけ取り除く。

## 入力候補（history）

- `history` は重複（小文字比較）を除いて先頭追加し、最大 300 件を保持する。更新はタスク追加時と本文変更時。
- 候補は `taskLists.history` を正本に、trim 後 2 文字以上の部分一致だけを最大 20 件、完全一致を除外して表示する。候補選択は入力欄への挿入ではなく、その文言を即追加する。
- 候補の絞り込みは入力欄の文字反映をブロックしない。候補リストの表示は入力より遅れて更新されてもよいが、選択時は表示中の候補文字列をそのまま追加する。

## 同期の制約

- task 更新は `現在表示中 task 群 -> 正規化済み next task 群 -> local pending 表示 -> taskListId 単位 queue 経由の差分保存` の順で処理する。正規化と pending 反映は操作ごとに一度だけ行い、その同じ task 群から保存差分を作る。
- 同一 `taskListId` の task 書き込みと同一ユーザーの taskList 順書き込みはクライアント内で直列化する。キューは画面の mount / Composition より長く保持し、画面移動で待機中の書き込みをキャンセルしない。
- local pending は操作世代を持ち、最新世代の queue がドレインした時だけ解放する。内容一致だけでは古い listener snapshot と最新 pending を区別できないため、listener 一致を理由に書き込み中の pending を早期解放しない。
- 表示優先順は `ドラッグ overlay -> local pending -> listener`。ドラッグは開始時の表示順を基準にし、overlay はキャンセルだけでなく正常終了でも必ず解放する。最新書き込み完了後は pending も必ず解放し、別端末の listener 更新を覆い続けない。
- 完了・ピン切替はイベント発生時に描画されていた値ではなく、pending を含む現在表示中 task の値から反転する。
- 空状態判定も pending を含む現在表示中 task 群を基準にし、空リストへの 1 件目追加を listener 反映待ちにしない。
- UI 更新系で transaction は使わない。
- listener 失敗は読み込めているデータを維持して部分劣化させる。全画面エラーにするのは設定・保持リスト順序の失敗、または taskLists を 1 件も表示できない場合だけ。
- taskList 名・背景・共有コードなどの sheet / dialog 内保存は、失敗時に閉じず、同じ sheet / dialog 内に汎用エラーを表示する。
