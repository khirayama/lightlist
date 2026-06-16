# タスクリストとタスク

データ構造は [data-model.md](./data-model.md)、共有は [sharing.md](./sharing.md) を参照。UI の寸法・レイアウトの細部は `AGENTS.md` を正とする。

## タスクリスト操作

- `createTaskList(name, background)`: `taskLists` 実体の作成と `taskListOrder` への追加を同時に行う。
- `updateTaskList()`: `name` と `background` を更新する。
- `updateTaskListOrder()`: 並び替え後に `1.0` 始まりの連番へ振り直す。
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
- 日付クリアは対象 task に `date` がある場合だけ実行可能にする。日付未設定 task では disabled とし、no-op の保存を発生させない。
- ピン留め切替、日付選択、日付クリアはいずれも即時保存し、成功時に sheet / dialog を閉じる。失敗時は local pending を解放し、同じ画面上で汎用エラーを表示して再操作できる状態へ戻す。

## 表示順

- `未完了 pinned -> 未完了 unpinned -> 完了` の順。各グループ内は `order` 昇順。
- `autoSort` 有効時は各グループ内を `date -> order` で再採番する。
- D&D はグループ内のみ。グループ移動はピン切替・完了切替で行う。
- pinned task は強めの本文 weight で区別し、右端の task action はカレンダーではなくピンアイコンを表示する。

## 入力解析

Web の parser を正本とし、iOS / Android も対応言語・数字正規化・先頭一致ルールを揃える。本文編集の確定時も同じ parser を通す。

- 先頭から最大 2 つの修飾子を順不同で剥がす。`pin prefix -> date -> text` と `date -> pin prefix -> text` の両方を許可する。
- 日付表現は `yyyy-mm-dd` / `mm-dd` / `mm/dd` / `mm.dd` と各言語の相対表現を扱う。全言語で英語相対表現（`today` / `tomorrow` / `day after tomorrow` / `in N days` / `N days later` / 英語曜日名）も許可する。
- `mm-dd` / `mm/dd` / `mm.dd` は当年として解釈し、解決結果が今日より過去なら翌年の同月日へ繰り上げる。
- 数字はアラビア数字に加えてアラビア語・ペルシャ語・デーヴァナーガリー数字を正規化する。
- pin prefix は各言語の短い代表語（`ja: ピン`, `es: fijar`, `de: anheften`, `fr: epingler/épingler`, `ko: 고정`, `zh-CN: 置顶`, `hi: पिन`, `ar: تثبيت`, `pt-BR: fixar`, `id: sematkan`）に加え、全言語で `pin` / `pinned` を許可する。
- 本文編集では prefix 付与時だけ `pinned` を `true` にし、prefix 不在を理由に自動解除しない。日付表現を取り除いた結果 `text` が空になる場合は、既存 `text` を維持して `date` だけ更新する。
- `date` の `"yyyy-MM-dd"` 文字列は 3 プラットフォームとも端末ローカルの暦日として解釈・生成する（formatter / parser に UTC を指定しない）。例外は Android Material3 `DatePicker` の millis 変換のみ。

## 入力候補（history）

- `history` は重複（小文字比較）を除いて先頭追加し、最大 300 件を保持する。更新はタスク追加時と本文変更時。
- 候補は `taskLists.history` を正本に、trim 後 2 文字以上の部分一致だけを最大 20 件、完全一致を除外して表示する。候補選択は入力欄への挿入ではなく、その文言を即追加する。
- 候補の絞り込みは入力欄の文字反映をブロックしない。候補リストの表示は入力より遅れて更新されてもよいが、選択時は表示中の候補文字列をそのまま追加する。

## 同期の制約

- task 更新は `現在表示中 task 群 -> 正規化済み next task 群 -> local pending 表示 -> taskListId 単位 queue 経由の差分保存` の順で処理する。
- 同一 `taskListId` の書き込みはクライアント内で直列化する。追加直後の更新が先行保存を追い越さないようにする。
- local pending は listener 一致（同じ正規化を通して比較）で解放するほか、`taskListId` 単位 queue のコミット完了でも必ず解放する。一致だけだと別端末の並行編集で固着するため。
- 表示優先順は `ドラッグ overlay -> local pending -> listener`。ドラッグ overlay はキャンセルだけでなく正常終了でも必ず解放する。
- 空状態判定も pending を含む現在表示中 task 群を基準にし、空リストへの 1 件目追加を listener 反映待ちにしない。
- UI 更新系で transaction は使わない。
- listener 失敗は読み込めているデータを維持して部分劣化させる。全画面エラーにするのは設定・保持リスト順序の失敗、または taskLists を 1 件も表示できない場合だけ。
- taskList 名・背景・共有コードなどの sheet / dialog 内保存は、失敗時に閉じず、同じ sheet / dialog 内に汎用エラーを表示する。
