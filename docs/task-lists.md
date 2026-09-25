# タスクリストとタスク

データ構造は [data-model.md](./data-model.md)、共有は [sharing.md](./sharing.md) を参照。UI の寸法・レイアウトの細部は `AGENTS.md` を正とする。

## キーボード操作

- Web の compact layout とタスクリスト carousel は、現在表示中の画面・スライドだけを Tab 順と accessibility tree に含める。画面外へ移動した入力欄やボタンへフォーカスを移さない。
- Web の compact layout で画面を切り替えたときは main landmark へフォーカスを移し、遷移先の先頭から操作を再開できるようにする。初回表示ではフォーカスを奪わない。
- Web のタスク / タスクリスト並び替えは、drag handle へフォーカスして Space または Enter で開始し、矢印キーで移動、Space または Enter で確定、Escape でキャンセルできる。操作方法と移動結果は読み上げへ通知する。
- iOS / Android のタスク / タスクリスト並び替えは、drag handle の VoiceOver / TalkBack custom action で上・下へ移動できる。ハードウェアキーボードでは drag handle へフォーカスし、iOS は Option + 上下矢印、Android は Alt + 上下矢印で移動する。修飾なしの矢印キーは通常のフォーカス移動に使う。

## アクセシビリティ

- Web / iOS / Android は WCAG 2.2 AA 相当を満たす。文字は 4.5:1、識別に必要なアイコン・枠線・状態表示は 3:1 以上のコントラストを、light / dark とタスクリスト背景色のすべての組み合わせで確保する。
- 完了タスクは行全体を薄くせず、本文の muted 色 + 取り消し線と塗りつぶしたトグル円で表す。
- スクリーンリーダーでは、完了トグルをタスク本文を名前に持つチェック操作として読み上げ、完了 / 未完了の状態を伝える。
- Web は画面ごとに「画面名 - Lightlist」の文書タイトルを付け、すべてのページに skip link の遷移先となる main 領域を置く。
- 操作対象の最小サイズは 24 × 24 以上とし、タスク行の操作は iOS 44pt / Android・Web 48 を維持する。
- 文字サイズの拡大（Web のブラウザ拡大、iOS の Dynamic Type、Android の font scale）で文字を切らず、行の高さを伸ばして表示する。

## タスクリスト操作

- `createTaskList(name, background)`: `taskLists` 実体、作成者の membership、`taskListOrder` への追加を同一 batch で行う。新規作成時の背景色は未設定（`null`）を既定とする。
- `updateTaskList()`: `name` と `background` を更新する。
- `updateTaskListOrder()`: 並び替え後に `1.0` 始まりの連番へ振り直す。連続操作時は listener 由来の旧順ではなく、ドラッグ開始時に表示していた pending を含む順序へ今回の移動を適用する。
- `deleteTaskList()`: 事前 read 後の batch write で次を行う。transaction は使わない。
  - 自分の `taskListOrder` から対象を外す。
  - 自分の `taskLists/{taskListId}/members/{uid}` を削除する。
  - `memberCount` を 1 減らす。
  - `memberCount` が 1 以下のときだけ `taskLists` 実体を削除する。
  - `shareCode` があれば対応する `shareCodes/{code}` も同じ batch で削除する。
  - `taskListOrder` ドキュメント自体は空になっても削除せず、対象 field だけ削除する。
- リスト削除（一覧から外す）と完了タスクの一括削除は、実行前に確認ダイアログ（タイトル `taskList.deleteListConfirm.title` / `pages.tasklist.deleteCompletedConfirmTitle`、本文、キャンセル + 破壊的操作の削除ボタン）を 3 プラットフォーム共通で表示する。Web もブラウザ標準の confirm ではなくアプリの確認ダイアログを使う。
- `background` は選択中タスクリスト詳細の背景として使う。一覧ペインや split 境界線へは広げない。未設定時は淡いページ背景（light `#F9FAFB` / dark `#030712`）で描画する。Web / iOS / Android の dark theme では明るい背景色の上で本文が読めなくなるため、選択色を 26% だけページ背景（`#030712`）へ oklab で混ぜた暗い色面として描画する（light theme は選択色そのまま）。一覧のドットやカレンダーの日付ドットは混色せず選択色そのものを使う。
- Web の wide layout ではタスクリスト詳細の縦スクロール領域を本文 `main` に置き、最大幅で中央寄せしたタスクカードや carousel 自体は縦スクロールさせない。スクロールバーは本文ペインの右端に表示する。wide layout ではサイドバーが選択中タスクリストを示すため carousel indicator を表示せず、タスクリスト名から本文と一緒にスクロールさせる。iOS の regular 幅（タブレット）も同様に indicator を表示せず、上端 40 の余白の下にタスクリスト名を置き、本文列は最大 672 で中央寄せする。背景色は詳細ペインの上下端まで敷き、サイドバーへは広げない。
- Web / iOS / Android のタスクリスト一覧（wide / regular のサイドバー / compact の一覧画面）は、先頭にロゴ + アプリ名（`title`）と設定ボタン、次にカレンダーへのナビゲーション行、`app.drawerTitle` 見出し付きのタスクリスト行、その下に「新規作成」「リストに参加」を枠線なしのトーンボタン（`ll-btn-tonal`）で横並びに置く。メールアドレスは一覧に表示せず設定画面だけに表示する。タスクリスト行は「色ドット（10） → 名前 + 未完了タスク数（`taskList.remainingCount`） → 終了側の drag handle」とし、選択中の行・画面（カレンダー / 設定）は面色で示す。compact layout と共有コードのプレビューは、それぞれの画面内の親スクロール領域を使う。

## タスク操作

- `tasks` は `id` / `text` / `completed` / `date` / `order` / `pinned` を持つ。`pinned` 未設定の既存 task は `false` として扱う。
- 順序の唯一の正本は `order`。`pinOrder` のような別フィールドは持たない。
- `addTask()`: 入力先頭を解析して `text` / `date` / `pinned` に分離する。解析後の `text` が空でも `date` がある、または `pinned == true` なら追加する。3 項目すべてが空相当なら追加しない。`order` は top で「先頭 `order` - 1」、bottom で「末尾 `order` + 1」。`taskInsertPosition` の既定（settings 未取得・欠損時）は `top`。
- `updateTask()`: 対象 task の変更だけを反映する。`pinned` 解除時は未完了 unpinned グループの先頭へ入るよう再採番する。
- `deleteCompletedTasks()`: 完了済みを削除し、残りを再採番する。
- Firestore へは差分だけ書き込む。新規 task は full object、削除 task は `tasks.<id>` delete、既存 task は変化した field と `order` だけ。

## タスク action

- task action はピン留め切替、日付選択、日付クリアを同じ sheet / dialog にまとめる。
- Web / iOS / Android の sheet / dialog は「タスク本文（空なら `pages.tasklist.setDate`）+ 閉じる」のヘッダー → 「日付クリア（開始側）+ ピン留めトグル（終了側）」の 1 行 → 淡い面・角丸 16 の月カレンダーの順とする。日付クリアは destructive 色にせず muted のテキスト action、ピン留めトグルは未設定時がトーン面・設定時が primary 塗りのボタンとする。用途はアクセシビリティ名でも伝える。閉じる操作、ピン留め、日付クリアは Web / iOS で 44pt/px 以上、Android で 48dp 以上の操作領域を確保する。
- 月カレンダーの選択済み日付をもう一度選ぶと選択を解除し、task action では日付クリアとして即時保存する。
- 日付クリアは対象 task に `date` がある場合だけ実行可能にする。日付未設定 task では disabled とし、no-op の保存を発生させない。
- ピン留め切替、日付選択、日付クリアはいずれも即時保存し、成功時に sheet / dialog を閉じる。失敗時は local pending を解放し、同じ画面上で汎用エラーを表示して再操作できる状態へ戻す。

## ページ切替時の入力フォーカス

- タスクリストのページャーをスワイプまたはスクロールして別のリストへ切り替えるときは、現在の入力フォーカスを解除する。
- ページ切替によって切替先リストの追加入力欄やタスク本文を自動的にフォーカスしない。

## 追加入力欄のフォーカス解除

- Web / iOS / Android の追加入力欄は、入力欄と追加操作以外の画面領域をタップしたときに入力を終了し、フォーカスとソフトウェアキーボードを解除する。
- 入力欄内のタップ、履歴候補の選択、追加操作ではフォーカスを維持し、連続入力できる状態を保つ。
- Android のタスクリスト詳細では、IME が表示中から閉じたときに入力欄を含む現在の Compose フォーカスを解除する。タスク本文編集中はこのフォーカス解除を編集終了として扱う。
- Android のタスクリスト詳細は、`Scaffold` の既定 inset と本文側の IME / safe drawing inset を重複適用せず、ソフトウェアキーボード直上までを表示領域とする。

## タスク本文の編集切替

- タスク本文の編集中に別のタスクを選択した場合、切替前のタスクへその時点の編集内容を確定してから、切替先の本文で編集状態を初期化する。
- フォーカス移動後に遅れて届く旧タスクの確定イベントは、現在の編集対象 ID と一致する場合だけ処理する。切替先の本文を旧タスクへ保存しない。

## 表示順

- `autoSort` 有効時は `未完了 pinned -> 未完了 unpinned -> 完了` の順。各グループ内は `date -> order -> id` 昇順とする。
- `autoSort` 無効時は pinned / unpinned / completed のグループ分けをせず、全 task を `order -> id` 昇順で表示する。日付・完了状態・ピン状態の変更だけでは表示位置を変更しない。設定切替だけで既存 task の順序を変更しない。
- 画面下部の「並び替え」は明示操作として、設定値に関係なく `未完了 pinned -> 未完了 unpinned -> 完了` の各グループ内を日付順へ整列する。
- D&D / キーボード操作は、`autoSort` 有効時は同じグループかつ同じ `date` の task 間だけ、無効時は全 task 間で許可する。
- 並び替えの保存値は操作終了時に表示している全 task ID の順序を正とし、保存直前の listener 順へ drag 操作だけを再適用しない。ID の欠落・重複・未知 ID がある順序は保存しない。
- 空または空白だけの `text` でも、日付あり・ピン留めの task はタスク一覧・カレンダー・タスクリスト件数に含める。本文・日付・ピンのすべてが空相当の task だけを除外する。
- pinned task は強めの本文 weight で区別し、右端の task action はカレンダーではなくピンアイコンを表示する。
- Web / iOS / Android の task 本文は URL などの長い連続文字列でも行幅内で折り返し、右端 action や周辺レイアウトを横方向へ押し出さない。
- Web / iOS / Android のタスクリスト詳細では、drag handle・完了 checkbox・本文 1 行目・右端の日時 action を同じ縦の中心線へ揃え、行ピッチは 48 + 上下 2 の 52 とする。ヘッダーの共有・操作列のゴミ箱・行末の日時 action は、本文列の終了端から 12 はみ出した 48 幅の同じ列に中心を揃え、drag handle と並び替えアイコンも開始側の同じ列に揃える。追加ボタンは入力欄の内側末尾に置き、入力文字がある時だけ表示する。日付なし task は空の日付行を表示せず本文を 48px の操作領域中央へ置き、日付あり task は上段 20px の日付表示 + 下段 48px の本文・操作領域とする。日付・本文は行の開始側（LTR は左、RTL は右）へ揃え、handle・checkbox・本文の操作領域は 48px を保ちつつ、隣接する見た目の間隔は詰める。Web の wide layout かつマウス等の精密ポインタでは drag handle を本文列の外側（開始側の余白）へ出し、行の hover / focus 時だけ表示する。それ以外（compact・タッチ）は常時表示する。未完了 task の本文は medium、ピン留めは bold で表示する。
- Web / iOS / Android の完了 checkbox は、未完了を前景色の半透明（light `#111827` 42% / dark `#F9FAFB` 45%）の 1px 枠、完了を gray-300 / gray-700 の塗り（枠なし）で表示し、drag handle などの補助アイコンと同じ半透明色に揃える。システムのアクセント色は使わない。

## 追加・削除・並び替えの演出

- タスク追加は約 240ms で fade in し、Web / iOS は上端から短く移動させる。Android は追加行の fade と既存行の layout spring を組み合わせる。
- 完了済みタスクの削除は約 120ms の fade out 完了後に表示と保存対象から外す。削除方向を示す横移動は付けない。
- 並び替えで押し退けられる行は約 220ms 相当の減衰した spring / ease-out で新しい位置へ移動する。ドラッグ中の行は opacity `0.8`、scale `1.03` で 3 プラットフォームを揃える。
- `autoSort` による完了切替・ピン切替・日付変更で配置が変わる場合も、ドラッグ並び替えと同じ約 220ms の移動を適用する。
- Web のドラッグ中と autoSort 等のドラッグ外配置変更は同じ sortable layout animation で処理し、独自の transform animation を重ねない。optimistic表示が同じ配置のlistener表示へ切り替わる場合は新しい配置アニメーションを生成しない。
- OS / ブラウザの Reduce Motion 設定が有効な場合、追加・削除・並び替えの演出は無効化し、状態と配置を即時反映する。

## 入力解析

Web の parser を正本とし、iOS / Android も対応言語・数字正規化・先頭一致ルールを揃える。本文編集の確定時も同じ parser を通す。

- 先頭から最大 2 つの修飾子を順不同で剥がす。`pin prefix -> date -> text` と `date -> pin prefix -> text` の両方を許可する。
- 日付表現は `yyyy-mm-dd` / `mm-dd` / `mm/dd` / `mm.dd` と各言語の相対表現を扱う。全言語で英語相対表現（`today` / `tomorrow` / `day after tomorrow` / `in N days` / `N days later` / 英語曜日名）も許可する。
- `mm-dd` / `mm/dd` / `mm.dd` は当年として解釈し、解決結果が今日より過去なら翌年の同月日へ繰り上げる。
- 数字はアラビア数字に加えてアラビア語・ペルシャ語・デーヴァナーガリー数字を正規化する。
- pin prefix は各言語の短い代表語（`ja: ピン`, `es: fijar`, `de: anheften`, `fr: epingler/épingler`, `ko: 고정`, `zh-CN: 置顶`, `hi: पिन`, `ar: تثبيت`, `pt-BR: fixar`, `id: sematkan`）に加え、全言語で `pin` / `pinned` を許可する。
- 本文編集では prefix 付与時だけ `pinned` を `true` にし、prefix 不在を理由に自動解除しない。日付表現を取り除いた結果 `text` が空になる場合は、既存 `text` を維持して `date` だけ更新する。
- `date` は実在する暦日を表す厳密な `"yyyy-MM-dd"` だけを有効とし、不正な形式・存在しない日付は日付なしとして扱う。3 プラットフォームとも端末ローカルの暦日として解釈・生成する（formatter / parser に UTC を指定しない）。
- Web の日付設定とカレンダー確認で使う月表示は、利用可能な横幅を7曜日へ均等配分する。日付ボタンは Web 40px / iOS 40pt / Android 40dp の固定円、日セルはドット行を含む Web 48px / iOS 48pt / Android 48dp とし、各列の中央へ配置する。Web / iOS / Android は前後月の日付（月外日）を薄いグレーで表示し、週は表示月に必要な行数だけ描画する。日付ドットは日付ボタン内の下部に置く。当日は gray-400（dark gray-500）の 1px リング、選択日は primary 塗りの円とする。月移動ボタンの操作領域は Web 44px / iOS 44pt / Android 48dp 以上とする。
- カレンダーのタスク一覧は未完了タスクをすべて表示し、日付なしタスクも含める。並び順は「ピン留め → 日付（日付なしは最後） → タスクリスト順 → リスト内の表示順」とする。日付ありは表示月で絞り込み、日付なしは月に関わらず常に表示する。一覧全体と行間には囲い・角丸・面の背景色・divider を付けず、カレンダーグリッドと同じ横幅で表示する。タスク行は位置補正用の offset を使わない 2 段構成とし、上段の左に日付 + ピン、右に色ドット + タスクリスト名、下段に完了操作 + 本文 + 編集操作を並べる。上段は高さ 24 相当、下段は「完了操作 48 / 本文 / 編集操作 48」の列構成で各要素を上寄せし、行末に 4 相当の余白を置く。日付と本文、タスクリスト名と編集操作は同じ列に置き、完了操作と本文の間に余分な horizontal spacing を設けない。日付なしタスクは日付ありタスクの後ろにまとめ、先頭に `pages.tasklist.noDate`（日付なし）の見出しを 1 回だけ muted 色で表示する。日付なしタスクの行は上段の日付ラベルを空にし、日付選択（ハイライト・スクロール）の対象にしない。選択日に該当する行のハイライトは light `#FFFFFF` / dark `#111827` の角丸面とする。カレンダー下の「タスクを追加」ボタンは常に表示し、日付選択中はその日付を、未選択時は今日をタスクシートの初期日付にする。ピン留めタスクは日付ラベルの後ろに muted 色のピンマークを表示する。カレンダーの日付ドットは日付ありタスクだけを対象にする。
- Web / iOS / Android のカレンダー画面は、月カレンダーと「タスクを追加」ボタンを画面上端（2 カラムでは左列）に固定し、タスク一覧だけをその下でスクロールする。日付選択時は、固定カレンダーに隠れない範囲の中央へ該当タスクをスクロールする。
- カレンダーの日付選択は、選択円を約 240ms の短い spring / scale で表示し、対応するタスク行の背景色を約 180ms で切り替える。iOS / Android は日付の直接選択時に selection feedback も返す。
- カレンダーの選択演出は OS / ブラウザの Reduce Motion 設定に従い、無効時はアニメーションせず即時に状態を反映する。
- カレンダーのタスク追加とタスク編集は共通のタスクシートを使う。構成は「タイトル + 閉じる → 追加先タスクリスト → 本文入力 → 『日付クリア（左端）+ ピン留め（右端）』の 1 行 → 月カレンダー → 横幅いっぱいの確定ボタン（追加 / 保存）」の順とし、確定ボタンはスクロール領域の外でシート下部に固定して常に表示する。タスクリスト選択に可視ラベルは付けず、アクセシビリティ名だけで用途を伝える。角丸・入力面・余白・文字階層はタスクリスト詳細の task action sheet を正として 3 プラットフォームで揃える。
- カレンダー下の主ボタンは常に表示し、日付選択中は「選択日の表示 + タスクを追加」、未選択時は「タスクを追加」とする。主ボタンはタスクシートを追加モードで開き、選択日（未選択時は今日）をシート内カレンダーの初期値にする。日付付きタスクがない月でも追加できる。
- タスクシートの変更（追加先タスクリスト・本文・ピン留め・日付）は確定ボタンでまとめて保存する。日付クリアはシート内の選択状態だけを消し、確定時に `date` を空にする。新規追加では本文・日付・ピンがすべて空の場合は確定できない。既存編集では確定でき、そのタスクを削除する。移動先を変えていても空タスクは移動先へ作らない。
- 追加は通常のタスク追加と同じ `taskInsertPosition` / `autoSort` / pin prefix / `history` / taskList 単位 mutation queue を使い、シートで指定したピン留め・日付は parser の解決結果より優先する。日付付きで追加したタスクは listener 反映前からカレンダーへ楽観表示し、保存失敗時だけ取り除く。
- カレンダーのタスク行は先頭に完了操作、末尾に編集操作を持つ。完了操作はタスクを完了にし（カレンダーは未完了タスクだけを表示するため行は一覧から消える）、編集操作はタスクシートを編集モード（現在のタスクリスト・本文・ピン留め・日付を初期値）で開く。
- 編集の保存はタスクリスト詳細の本文編集と同じ入力 parser と `history` 更新を使い、シートで指定した `date` / `pinned` は明示値として適用する。追加先タスクリストを変更した場合はタスクをリスト間移動する（元リストの `tasks.<id>` を削除し、移動先へ `taskInsertPosition` / `autoSort` に従って挿入、`history` は移動先へ追加。1 つの batch write で行い、送信元・移動先の両 `taskListId` をID順に取得した mutation queue で3プラットフォーム共通に直列化する）。失敗時は画面内にエラーを表示する。

## 入力候補（history）

- `history` は重複（小文字比較）を除いて先頭追加し、最大 300 件を保持する。更新はタスク追加時と本文変更時。
- 候補は `taskLists.history` を正本に、trim 後 2 文字以上の部分一致だけを最大 20 件、完全一致を除外して表示する。候補選択は入力欄への挿入ではなく、その文言を即追加する。
- Web の候補は上下キーで選択し、選択中に Enter を押すと入力欄の省略文字列ではなく候補の全文を即追加する。選択していない状態の Enter は入力欄の文字列を追加する。
- 候補の絞り込みは入力欄の文字反映をブロックしない。候補リストの表示は入力より遅れて更新されてもよいが、選択時は表示中の候補文字列をそのまま追加する。

## 起動画面（startupView）

- 設定 `startupView` で、画面指定のない通常起動時の初期画面を切り替える。`taskList`（既定。選択中または先頭タスクリストの詳細）/ `calendar` / `taskLists`（タスクリスト一覧）。
- どの選択肢でも戻る階層の root はタスクリスト一覧とする（Web は history stack、iOS は NavigationStack path、Android は back stack）。`taskLists` は root に留まり自動遷移しない。
- 起動判定は cache-first とする。Web は settings の読込完了（cache 含む）後に初期遷移を確定し、iOS は UserDefaults cache（`lightlist.startupView`。settings listener で更新、ログアウトで削除）から同期的に初期 path / ペインを決める。Android は settings listener の初回 snapshot 後に自動遷移し、起動時の自動遷移は画面切替アニメーションを付けない。
- Android は Firebase Auth の初回 state 通知を認証復元完了として扱い、通知前は認証画面を表示しない。UID が変わった場合は既存の back stack をタスクリスト一覧 root へ戻してから、そのユーザーの起動画面を判定する。
- deep link（共有コード / パスワードリセット / Web の URL ハッシュ指定）は `startupView` より優先する。
- タブレット / wide layout では `calendar` のときだけ初期表示ペインをカレンダーにする。`taskList` / `taskLists` は通常のタスクリスト詳細ペインとする。

## 同期の制約

- task 更新は `現在表示中 task 群 -> 正規化済み next task 群 -> local pending 表示 -> taskListId 単位 queue 経由の差分保存` の順で処理する。正規化と pending 反映は操作ごとに一度だけ行い、その同じ task 群から保存差分を作る。
- Web / iOS / Android のカレンダー上の完了・本文・日付・ピン変更とタスクリスト移動は、listener の反映を待たず同じ taskListId 単位の local pending として表示し、最新世代の書き込み完了・失敗時に解放する。完了は一覧から即時に外し、本文変更・追加で更新する入力候補履歴も同じ pending 世代で保持する。
- 同一リストのタスク更新と同一ユーザーのリスト順更新は、操作順に Firestore SDK へ投入する。サーバーの応答待ちは後続操作の投入を止めず、オフライン中の連続操作も SDK の永続キャッシュに保持する。書き込み完了・失敗の監視は画面より長く保持し、画面移動ではキャンセルしない。
- local pending は操作世代を持ち、最新世代の queue がドレインした時だけ解放する。内容一致だけでは古い listener snapshot と最新 pending を区別できないため、listener 一致を理由に書き込み中の pending を早期解放しない。
- 表示優先順は `ドラッグ overlay -> local pending -> listener`。ドラッグは開始時の表示順を基準にし、overlay はキャンセルだけでなく正常終了でも必ず解放する。最新書き込み完了後は pending も必ず解放し、別端末の listener 更新を覆い続けない。
- Web のドロップ確定位置は sortable operation の開始 index と最終 index を正とする。collision target の ID から位置を再計算せず、dnd feedback が示した位置と楽観表示を一致させてドロップ直後の旧位置への戻りを発生させない。
- task 並び替えは pending を含む操作終了時の全 ID 順を同じ task 群へ再採番して保存する。連続操作でも listener の旧順から再計算せず、各 queue 操作は直前の pending 順との差分だけを書き込む。
- 空本文 task から最後の日付またはピンを外して本文・日付・ピンがすべて空相当になった場合は、pending から除外し、同じ差分保存で `tasks.<id>` を削除する。
- 他端末削除と古い端末のfield更新が競合して `tasks.<id>` に必須field不足の部分mapが再生成された場合、readerはそのmapを表示・件数計上しない。metadata changeを含むlistenerのserver確定snapshotで同じ部分mapを確認した端末が、taskList単位mutation queueからfield deleteを行う。
- 完了・ピン切替はイベント発生時に描画されていた値ではなく、pending を含む現在表示中 task の値から反転する。
- 空状態判定も pending を含む現在表示中 task 群を基準にし、空リストへの 1 件目追加を listener 反映待ちにしない。
- UI 更新系で transaction は使わない。
- listener 失敗は読み込めているデータを維持して部分劣化させ、失敗した参照だけを 1 秒、2 秒、4 秒…最大 30 秒の間隔で再購読する。設定・リスト順・各リスト取得チャンクの再試行状態は独立し、正常な購読を解除しない。cache snapshot や別チャンクの成功では再試行間隔・失敗状態をリセットしない。購読対象の変更・終了時に対応する再試行も停止する。全画面エラーにするのは設定・保持リスト順序の失敗、または taskLists を 1 件も表示できない場合だけ。
- taskList 名・背景・共有コードなどの sheet / dialog 内保存は、失敗時に閉じず、同じ sheet / dialog 内に汎用エラーを表示する。
- 端末がオフラインの間は、画面下部中央に `common.offline`（変更は再接続時に同期される旨）を primary 塗りのピル型表示で出し、操作は妨げない（タップを透過する）。表示・非表示は reduce motion 設定時を除き約 160ms でフェードし、表示時はスクリーンリーダーへ通知する。判定は Web が `navigator.onLine` と `online` / `offline` イベント、iOS が `NWPathMonitor`、Android が `ConnectivityManager` の default network callback を使う。
