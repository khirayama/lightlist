# Repository Guidelines

## 基本方針

- 回答・説明・コミットメッセージは日本語で記述する。
- 小さな変更を段階的に進め、各段階で達成を確認する。
- 必ず `context7` と `serena` を活用し、推測ではなく実装事実を根拠に判断する。
- コメント追加は不要。テスト追加は不要。後方互換性は考慮不要。
- 変更後は `docs/` を実装に合わせて更新し、進捗報告ではなく仕様として記述する。
- `docs/` は内部コンポーネント一覧や import 構成の重複管理を避け、ドメイン仕様・必須設定・運用上の制約に絞る。
- agent 向けドキュメント（`AGENTS.md` / `CLAUDE.md`）は作業で得た恒久的な知見を蓄積する場所として扱い、完了時に必要な更新があれば行う。

## 実装スタンス

- 実装はシンプルで見通しよく、正常系と主要エラー処理に集中する。
- 不要な抽象化や過剰な分割は避け、冗長コードは削除する。
- TypeScript で厳密に型付けし、`any` / `unknown` は極力使わない。
- UI は i18next 前提・テーマ（system/light/dark）前提で実装する。
- Web/iOS/Android で自然な操作感を優先し、アクセシビリティ（色覚、キーボード、読み上げ）に配慮する。

## Agentドキュメント運用

- `AGENTS.md` を運用ルールの正本とし、`CLAUDE.md` は要点を揃えて整合させる。
- 作業完了時に、今回の変更で再利用価値のある恒久ルール・手順・コマンド・構成差分が増えた場合は、agent ドキュメントを更新する。
- 一時的な調査メモ、進捗報告、タスク固有の事情は agent ドキュメントに書かない。
- 更新判断に迷う場合は「次回以降の別タスクでも参照価値があるか」で判断する。

## プロジェクト構成

- プラットフォーム固有の規則は `apps/web/AGENTS.md` / `apps/ios/AGENTS.md` / `apps/android/AGENTS.md` に置く。app を変更する前に該当ファイルを必ず読み、3 プラットフォーム共通の仕様はこのファイルに置く。

- リポジトリ直下に Node の manifest は置かず、Web の Node ツール・lockfile は `apps/web` に集約する。
- Web: `apps/web`（Vite multi-page app + React + TypeScript + 通常 CSS）
- iOS: `apps/ios`（SwiftUI, iOS 17+）— XcodeGen (`project.yml`) でプロジェクト生成
- Android: `apps/android`（Kotlin + Gradle）
- Firebase App Check は使用しない。Web / iOS / Android のクライアントで provider を初期化せず、Firebase Console の enforcement も有効化しない。
- UI 配色は Web のモノクロ（Tailwind gray 系）パレットを 3 プラットフォーム共通の正本とする。light は背景 `#FFFFFF` / 文字 `#111827` / muted `#4B5563` / 枠線 `#D1D5DB` / 強調面 `#F9FAFB`、dark は背景 `#030712` / 面（sheet / dialog） `#111827` / 文字 `#F9FAFB` / muted `#D1D5DB` / 枠線 `#374151`〜`#4B5563`。アクセント色は持たず、primary（選択日・ピン留め・選択リング・主ボタン）は light `#111827` / dark `#F9FAFB`、エラー・危険操作の文字は light `#DC2626` / dark `#F87171`、破壊的操作の塗りボタンは両テーマとも `#DC2626` + 白文字（iOS の system alert は system red を許容）。タスクリスト背景色の選択肢（`#F87171` `#FBBF24` `#34D399` `#38BDF8` `#818CF8` `#A78BFA`）はテーマ非依存で共通、未設定リストの色ドットは theme 既定色 + 枠線（または separator 相当のグレー）で表す。
- 設定画面の視覚階層は Android の Material パレット割当を 3 プラットフォーム共通の正とする。淡いページ背景（light `#F9FAFB` / dark `#030712`）の上に **ボーダーレス** の面カード（radius 12、light `#FFFFFF` / dark `#111827`、padding 16。Web / Android は行の最小高 48 を含めるため縦 padding 12）を置き、枠線・影は付けない。カード内セクション見出しは muted 色（light `#4B5563` / dark `#D1D5DB`）・小さめ semibold で先頭に置き、行間は hairline divider（light `#D1D5DB` / dark `#374151`）だけで区切る。Android は `surfaceDim` / `surfaceContainer` / `outlineVariant` / `onSurfaceVariant`、Web は gray-50/white/gray-300/gray-600（dark: gray-950/gray-900/gray-700/gray-300）、iOS は `ContentView.swift` の `AppPalette`（pageBackground / cardSurface / mutedText は `Assets.xcassets` の Light/Dark named color、primary / onPrimary / border / fieldBackground / subtleIcon / subtleText / rowActive / danger などは `dynamicColor(light, dark)` で Web の gray 系 token と同値に定義。system grouped background は使わない）で表現し、設定行の 44pt / 48dp 以上の操作領域を維持する。
- 設定画面のセクション順は 3 プラットフォーム共通で「アカウント（`settings.userInfo.title`：メール表示 + メールアドレス変更行）→ 表示と動作（言語・テーマ・起動画面・追加位置・autoSort）→ 法的情報 → アカウント操作」とする。起動画面行は `settings.startupView.*`（`taskList` / `calendar` / `taskLists`）を使い、選択 UI は言語・テーマと同じ行 + ピッカー / ダイアログ形式で統一する。autoSort 行は `settings.autoSort.title`（本文）+ `settings.autoSort.enable`（説明・muted）の 2 行 + スイッチで統一する。アカウント操作はボタンではなく他の設定行と同じ**テキスト行**（ログアウト = 通常文字色、アカウント削除 = error 色、間に hairline divider）で表し、枠線・塗りボタンにしない。文言キーは `settings.danger.signOut` / `settings.danger.deleteAccount`、実行中表示は `settings.signingOut` / `settings.deletingAccount` を 3 プラットフォーム共通で使う。
- カレンダー画面は 3 プラットフォーム共通で、淡いページ背景上に月ナビ + 曜日・日グリッド・タスク一覧を直置きする。タスク一覧全体には囲い・角丸・面の背景色を付けず、行間の divider も表示しない。月ナビの前後ボタンは枠なしのアイコンボタン、曜日ヘッダーは muted 色。日セルは選択 = primary 塗りの円（40pt/40dp 相当、Web は `ll-rounded-full`）、当日 = 枠線のみの円で統一し、日セルの高さは幅連動の正方形にせず円 + ドット行ぶんの固定高（Android 48dp、iOS 48pt）とする。カレンダー画面の縦余白は最小限（各ブロック間 2〜8 相当）に詰め、日付ドットに縁取りは付けない（背景色未設定リストのみ outline 円で表す）。タスク一覧はカレンダーグリッドと横幅を揃える。タスク行は座標 offset を使わない 2 段構成とし、上段は左に日付 + ピン、右に色ドット + リスト名、下段は左から完了操作・本文・編集操作を並べる。上段は高さ 24 相当（日付・リスト名の操作領域を 24 以上にする）、下段の操作領域は Android / Web 48、iOS 44 を維持したまま各要素を上寄せし、行末に 4 相当の余白を置く。上段の日付は下段の本文、リスト名は編集操作と同じ列に配置し、Android / Web は完了操作と本文の間に余分な horizontal spacing を設けず、iOS は 8pt の間隔を置く。選択日ハイライトは light `#FFFFFF` / dark `#111827`（ページ背景上の面色、Web は角丸 12）。日付なしタスクは一覧末尾にまとめて `pages.tasklist.noDate` 見出しを 1 回だけ置き、行ごとの「日付なし」ラベルは表示しない。日付・本文タップ = その日付を選択（ハイライト + 先頭タスクへスクロール。一覧は月内全件のまま絞り込まない）、リスト名タップ = 該当タスクリストを開く、を全プラットフォームで揃える。
- カレンダーのタスク追加・タスク編集は共通のタスクシート（「タイトル + 閉じる → 追加先タスクリスト → 本文入力 → 『日付クリア（左端）+ ピン留め（右端）』の 1 行 → 月カレンダー → 横幅いっぱいの確定ボタン（追加 / 保存）」）で行う。確定ボタンはスクロール領域の外でシート下部に固定し、タスクリスト選択に可視ラベルは付けない（アクセシビリティ名のみ）。スタイルはタスクリスト詳細の task action sheet を正とし、変更は確定ボタンで一括保存する。追加モードは選択日をシート内カレンダーの初期値にし、日付付きタスクが0件でも追加可能にする。通常追加と同じ settings・履歴・taskList 単位 mutation queue を使い、シートのピン留め・日付は parser の解決結果より優先し、listener 反映までは同じ taskId の楽観表示を維持する。編集で追加先タスクリストを変えた場合は、元リストの `tasks.<id>` 削除と移動先への挿入を 1 つの batch write で行いリスト間移動する。
- 3 プラットフォームのタスク行は追加約 240ms（fade、Web / iOS は move(top) も併用）、削除約 120ms（fade のみ）、並び替え約 220ms 相当の減衰した spring / ease-out で揃える。ドラッグ中の task 行は opacity `0.8` + scale `1.03`、タスクリスト行は Web と同じ opacity `0.5` + scale `1.03`。Web のドラッグ中と autoSort 等のドラッグ外配置変更は dnd-kit `useSortable.transition`（`idle: true`）の Web Animations API に一本化し、独自の `transform` FLIPを重ねない。`ll-anim-task-enter` / `ll-anim-task-exit` は追加・削除に使う。iOS / Android の完了済み削除は `exitingTaskIds` で行 alpha を先に 0 へ動かし、約 120ms 後に pending task 群と保存差分から外す。iOS の通常配置変更は `setPendingTasks` の spring + 行 `.transition`、Android は `Modifier.animateItem(fadeInSpec / placementSpec / fadeOutSpec)` を使う。OS の reduce motion 設定（Web `prefers-reduced-motion` / iOS `accessibilityReduceMotion` / Android `reduceMotion`）時は無効化する。完了トグルの塗り scale + spring、行 alpha のフェード、ピン/カレンダーアイコンの切替、追加ボタンの表示切替も同設定を尊重し、iOS のアイコン切替は `contentTransition(.symbolEffect(.replace))`、Android は `Crossfade` を使う。
- iOS / Android はタスク操作で触覚フィードバックを返し、両プラットフォームで挙動を揃える。対象は完了トグル・ピン切替・タスク追加・完了済み削除・ドラッグ開始・並び替え中の入れ替え（task / taskList 共通）。iOS は `UIImpactFeedbackGenerator`（完了/ピン/追加 = `.light`、ドラッグ開始 = `.medium`）と `UISelectionFeedbackGenerator`（並び替え入れ替え）と `UINotificationFeedbackGenerator`（完了済み削除 = `.warning`）、Android は `LocalHapticFeedback` の `HapticFeedbackType`（完了/ピン = `ToggleOn`/`ToggleOff`、追加 = `Confirm`、完了済み削除 = `Reject`、ドラッグ開始 = `GestureThresholdActivate`、入れ替え = `SegmentFrequentTick`）を使う。
- カレンダーの日付選択は 3 プラットフォーム共通で選択円を約 240ms の spring / scale、該当タスク行の背景色を約 180ms で切り替える。Web は `prefers-reduced-motion`、iOS は `accessibilityReduceMotion`、Android は `rememberReduceMotion()` に従い、reduce motion 時は即時反映する。iOS / Android の日付・タスク行からの選択は selection feedback（iOS `UISelectionFeedbackGenerator`、Android `SegmentFrequentTick`）を返すが、月移動に伴う選択解除では返さない。
- Firebase デプロイ設定（`firestore.rules`, `firebase.json`, `.firebaserc`, `firestore.indexes.json`）はリポジトリルートに配置。
- `.gitignore` はルートで共通ローカル生成物（OS / editor / Node / Firebase 設定）を管理し、`apps/web/.gitignore` / `apps/ios/.gitignore` / `apps/android/.gitignore` は各アプリ固有の生成物だけを管理する。
- Web の task 更新系は Firestore `tasks` map の列挙順を順序根拠に使わず、必ず `order` 昇順の配列へ直してから追加・自動並び替え・D&D 並び替え・完了済み削除を計算する。
- Web / iOS / Android の UI 更新系 Firestore 書き込みでは transaction を使わず、task 本文 blur・task 並び替え・taskList 並び替え・日付変更・ピン切替・完了切替の保存後も、listener が同じ内容へ追いつくまで local pending state を優先表示して旧表示への瞬間的な逆戻りを防ぐ。Web の local pending task 表示は `autoSort` 有効時は `未完了 pinned -> 未完了 unpinned -> 完了` と各グループ内 `date -> order` へ、無効時は操作後の全 task 配列順へ正規化して保持する。
- Web / iOS / Android の task 更新は同一 `taskListId` の操作順で Firestore SDK へ投入し、サーバー応答待ちで後続操作を止めない。Web は投入用キューと応答追跡用キューを分け、キュー内の操作は `committed` Promise を包んで返す（`await updateDoc` / `await batch.commit` で投入用キューを止めない）。iOS / Android は MainActor / main thread 上で completion API / SDK Task を同期的に取得し、完了は別途監視する。複数リストへの移動は 1 batch の投入を両リストの応答追跡に登録する。Web の optimistic task 追加は Firestore 保存と同じ `taskId` を使う。
- Web / iOS / Android の task 更新 UI は、各操作ごとに直接 Firestore payload を組み立てず、`現在表示中 task 群 -> 正規化済み next task 群 -> pending 表示 -> queue 経由の差分保存` の順で処理する。正規化と pending 反映は操作ごとに一度だけ行い、同じ next task 群から保存差分を作る。Firestore へは新規 task の full object、削除 task の `tasks.<id>` delete、既存 task の変更 field と変化した `order` だけを書き込む。完了・ピン切替は event closure の task 値ではなく pending を含む現在表示値から反転する。
- Web / iOS / Android の task pending（楽観的 overlay）は操作世代を持ち、最新世代の taskListId 単位 mutation queue がドレインした時だけ解放する。内容一致だけでは過去の同一状態を示す listener snapshot と最新 pending を区別できないため、書き込み中の listener 一致を fast-path に使わない。taskList 並び替えの pending も最新書き込みのコミット完了で必ず解放し、別端末の listener 更新を shadow し続けない。Android の mutation queue は Composition 内の `rememberCoroutineScope` ではなくプロセス内の taskListId 登録で保持し、画面移動で待機中書き込みをキャンセルしない。
- Web / iOS / Android の表示優先順は `dragOrdered* -> pending* -> listener由来`。ドラッグ開始時は pending を含む現在表示順を固定し、その順序へ移動を適用する。最優先 overlay（`dragOrderedTasks` / `dragOrderedTaskLists`）は `onDragCancel` だけでなく**正常終了（iOS `.onEnded` / Android `onDragEnd`）でも必ず `nil`/`null` に戻す**。永続化を呼んだ後に overlay を解放し、並び替え有無はドラッグ開始時の ID 順と終了時の ID 順を比較する。task / taskList の表示順は同順位時に `id` を最終比較条件とし、同じ `order` があっても決定的にする。
- Web / iOS / Android の task 一覧の空状態判定も pending 表示を含む現在表示中 task 群を基準にし、空リストへの 1 件目追加を listener 反映待ちにしない。
- `addTask()` の order は top 挿入で `先頭 task の order - 1`、bottom 挿入で `末尾 task の order + 1` を新規 task に与え、正規化（autoSort 無効時は配列順の連番再採番）後の差分だけを保存する。Web / iOS / Android で同一実装とする。
- 3 プラットフォームの taskLists chunk listener の失敗は部分劣化とし、読み込めた chunk の表示と正常な購読を維持する。settings / taskListOrder / 各 chunk の再試行状態は独立させ、失敗した参照だけを 1 秒から最大 30 秒へ指数的に再購読する。cache snapshot と別参照の成功では失敗状態・待機時間をリセットしない。購読対象が変わるときは旧参照の再試行も解除する。全画面エラーは settings / taskListOrder の失敗か、taskLists を 1 件も読めない場合だけにする。
- Firestore でドット記法の field path（`tasks.<id>.text` や `<taskListId>.order`）を書き込むときは必ず update 系 API（Web `updateDoc`、iOS `updateData`、Android `update`）を使う。set + merge はドットを field path として解釈しないため使用禁止。`deleteField()` を含む top-level キーの merge set は可。
- タスクの `yyyy-MM-dd` 日付文字列は実在する暦日だけを厳密に受け入れ、不正値は日付なしへ正規化する。3 プラットフォームとも端末ローカルの暦日として解釈・生成し（formatter / parser に UTC を指定しない、Web で `new Date("yyyy-mm-dd")` を使わない）。UTC 変換の例外は持たない。iOS / Android の `yyyy-MM-dd` 生成は gregorian calendar の年月日成分からの数値整形で行い、呼び出しごとに `DateFormatter` / `SimpleDateFormat` を生成しない（parse は ASCII 数字の分解 + 暦日検証）。表示用の locale 別 formatter は言語（と skeleton）ごとにキャッシュし、iOS で `yyyy-MM-dd` 用 formatter を使う場合は `en_US_POSIX` と gregorian calendar を必ず指定する。
- settings doc が存在しないユーザーでも設定画面を永久ローディングにせず、既定値（`system` / `ja` / `top` / `autoSort=true` / `startupView="taskList"`）で表示する。`autoSort` の欠損値も `true` として扱い、明示された `false` は保持する。`startupView` は欠損・不正値を 3 プラットフォームとも `taskList` へ正規化する。
- iOS / Android の task mutation queue は view / Composable 単位ではなく `TaskListMutationQueues`（taskListId キーのプロセス内登録）で保持する。iOS の `CalendarViewModel` は RootView 常駐ではなく `CalendarScreenView` が自身で bind し、`OrderedTaskListViewModel` は `deinit` で listener を解放する。
- Web / iOS / Android の `deleteTaskList()` と `addSharedTaskListToOrder()` も transaction を使わず、事前 read 後の batch write で `taskListOrder` と `taskLists.memberCount` を更新する。共有参加は `taskListOrder/{uid}` 欠損時でも merge 書き込みで自動作成し、既に追加済みなら no-op にする。
- Web / iOS / Android のタスク入力候補は `taskLists.history` を共通の正本として使い、履歴更新はタスク追加時と本文変更時に行う。候補表示条件は trim 後 2 文字以上の部分一致・最大 20 件・完全一致除外で Web 仕様に揃える。
- task のピン留めは `tasks.*.pinned` だけを追加し、`pinOrder` は持たない。`autoSort` 有効時の表示順は `未完了 pinned -> 未完了 unpinned -> 完了`、各グループ内は `date -> order` 昇順とする。無効時は全 task を `order` 昇順で表示し、完了・ピン状態・日付にかかわらず任意の task 間を手動並び替えできる。並び替え保存は操作終了時の全 task ID 順を正とし、ID の欠落・重複・未知 ID がある順序は保存しない。pinned task の右端 action はカレンダーではなくピンアイコンを表示し、強めの本文 weight で通常 task と区別する。本文 weight は Web を正とし 通常（および完了）= Medium、`pinned && !completed` = Bold（Web は `ll-font-medium` / `ll-font-bold`、編集中の入力欄も同じ weight）。完了トグルも 3 platform 共通で「未完了 = 薄い枠線円 / 完了 = 薄いグレーの塗り円（チェックマークは表示しない）」とし、Web も塗り円で表現する。
- タスク入力先頭の日付読み取り仕様は Web の `apps/web/src/entry.tsx` を正本とし、iOS / Android も対応言語・数字正規化・先頭一致ルールを揃える。`mm-dd` / `mm/dd` / `mm.dd` の月日指定は当年として解釈し、今日より過去なら翌年へ繰り上げる。
- `taskInsertPosition` の既定（settings 未取得・フィールド欠損時）は Web / iOS / Android ともに `top` とする。
- `taskLists.history` は重複（小文字比較）を除いて先頭追加し、最大 300 件を保持する。Web / iOS / Android で同一仕様とする。
- task 入力 parser は、先頭の日付表現に加えて各対応言語の短い pin prefix も扱う。`ja: ピン`, `es: fijar`, `de: anheften`, `fr: epingler/épingler`, `ko: 고정`, `zh-CN: 置顶`, `hi: पिन`, `ar: تثبيت`, `pt-BR: fixar`, `id: sematkan` に加え、全言語で `pin` / `pinned` を許可し、`pin 04/24 task1` と `04/24 pin task1` の両方を解釈する。本文編集では prefix 付与時だけ `pinned = true` にし、prefix 不在で自動解除しない。
- task は「本文が trim 後 1 文字以上」「日付あり」「ピン留め」のいずれかを満たす場合に保存する。日付あり・ピン留めなら空本文を許可し、一覧・カレンダー・タスクリスト件数にも含める。既存 task の更新で本文・日付・ピンがすべて空相当になった場合は `tasks.<id>` を削除する。カレンダーの編集シートでも空相当の保存を許可し、移動先変更時も空タスクは移動先へ作らない。新規追加の空相当だけは確定を無効にする。
- 共有taskは他端末削除後の古いfield path更新で部分mapとして再生成され得るため、readerは `id` / `text` / `completed` / `date` / `order` / `pinned` の全fieldと型が揃うtaskだけを受理する。不足mapは表示せず、metadata changesを含むlistenerのserver確定snapshot（cache由来でなくpending writeなし）で確認した場合だけtaskList単位queueから削除する。
- task 入力 parser の日付表現は、設定言語の相対表現に加えて全言語で英語相対表現（`today` / `tomorrow` / `day after tomorrow` / `in N days` / `N days later` / 英語曜日）も解釈する。
- locale の正本は `shared/locales/locales.json` 1 ファイルとし、Web / iOS / Android はその JSON を各 app 起動前または build 時にローカル resource へ同期して読む。String Catalog (.xcstrings) は採用しない。iOS の `apps/ios/Lightlist/Resources/locales.json` は自動同期スクリプトを持たない手動コピーのため、`shared/locales/locales.json` を変更したら `cp` で必ず追従させる。Web の `apps/web/scripts/sync-shared-locales.mjs` は言語別の `src/locales/<lang>.json` 生成に加え、LP 用 subset を `src/lp-locales.json` へ生成する。
- iOS / Android の認証 UI は `signin` / `signup` / `reset` の 3 導線を持ち（`reset` はタブではなく `signin` からの独立導線）、認証前でも言語切替を行える。ネイティブ側で Firebase Auth と Firestore 初期データ作成を完結させる。
- Web / iOS / Android のメール/パスワードログインは Firebase Auth 応答待ちを 10 秒で打ち切り、loading state を必ず戻して汎用認証エラーを表示する。
- iOS / Android の tablet regular 幅は、左 360pt 前後のサイドバーにタスクリスト一覧と主要操作を置き、右ペインにタスクリスト詳細または設定を表示する。詳細の pager (`TabView(.page)` / `HorizontalPager`) とサイドバー選択状態は双方向同期する。
- Web / iOS / Android のタスクリスト詳細ページャーは、追加入力欄がフォーカス中にスワイプまたはスクロールで別リストへ切り替わる場合、切替先リストの追加入力欄へフォーカスを引き継ぐ。追加入力欄が非フォーカス時にページ切替だけで新たにフォーカスしない。
- Web / iOS / Android の task 右端 action は、task ごとの sheet / dialog でピン留め切替・日付選択・日付クリアをまとめて扱う。ピン留め切替・日付選択・日付クリアは即時保存し、保存後は sheet を閉じる。
- task action sheet / dialog の visible UI は Web / iOS / Android で「タスク本文（空なら `pages.tasklist.setDate`）+ 閉じる」のヘッダー → 「日付クリア（開始側）+ ピン留めトグル（終了側）」の 1 行 → 月カレンダーの順とする。ピン留めトグルは未設定時トーン面（Web `ll-pin-toggle`、iOS `PinToggleButton`、Android `AppPinToggleButton`）・設定時 primary 塗り。カレンダーはボーダーレス・淡い面（Web light gray-50 / dark gray-950 で角丸 16、iOS `AppPalette.pageBackground` で角丸 16、Android `surfaceDim` で角丸 16）で揃える。日付クリアは error 色や枠付きボタンにせず muted のテキスト action とし、閉じる・ピン・クリアは Web / iOS で 44pt/px 以上、Android で 48dp 以上の操作領域を持たせる。
- 日付クリア action は対象 task に日付がある場合だけ有効にし、日付未設定 task では disabled として no-op 保存を発生させない。
- task action の用途説明（`pages.tasklist.setDate`）はアクセシビリティ名（Web の sr-only title / description、Android の `paneTitle`）として保持する。
- iOS / Android / Web の task action sheet は、可能な限りキーボードのみで操作できる構成を維持する。
- タスクリスト詳細の右端 action（ヘッダー共有・操作列ゴミ箱・task row のカレンダー/ピン・追加ボタン）は 3 プラットフォームともアイコン中心線を 1 本に揃える。iOS は Web と同じく 48pt の列（ヘッダーの編集・共有は 48pt の `AppIconButtonStyle`）をコンテンツ右端から外側へ `edgeActionOverhang`（12pt）はみ出させ、操作列のゴミ箱は 24pt アイコン枠を行末に置いて中心線を 12pt に揃える。Android も Web と同じく 48dp の列を `Modifier.bleed(end = 12.dp)` で外側へはみ出させ、操作列のゴミ箱は 24dp 枠で 12dp に揃え、Web は header・行 action とも 48px ボタン + 外側へ `-12px` のはみ出し（`ll-task-card-actions` / `ll-task-row`）、操作列のゴミ箱は 24px アイコン枠を行末に置いて 12px に揃える。Web / iOS / Android の追加ボタンは入力欄の内側末尾に送信アイコン（iOS は `paperplane.fill` を 45° 回転、Android は `Icons.AutoMirrored.Filled.Send`）で置き、入力文字がある時だけ opacity で表示する（入力欄の幅は変えない）。drag handle は並び替えアイコンと glyph 中心線を揃え（Web は drag span に手動 offset を足さない。iOS は handle 列 24pt と並び替えアイコン枠 24pt をコンテンツ左端に置く）、iOS のドットは `4pt`（spacing 3pt、全高 18pt）、Android は Web と同じ `Icons.Default.DragIndicator` を 20dp の muted icon で描く。
- iOS / Android の compact 幅タスクリスト詳細は、戻るボタン行とページャーインジケータ行を分離し、入力欄の追加ボタンは入力文字がある時だけ表示する。未完了トグルは薄い枠線円、完了トグルは薄いグレー塗り円で描画し、参考画面に近い密度へ寄せる。
- タスクリスト詳細の共通視覚定数は 3 プラットフォームで揃える: タスク追加入力欄は角丸 14 / padding 14×10 / 最小高 44 / 背景は不透明度 0.92（リスト背景色をわずかに透かす）/ 枠線は gray-300 相当を減光なしで使う（iOS は `AppPalette.border`、Android は `outlineVariant`）。完了 task は行の不透明度を下げず、本文を muted text 色 + 取り消し線、完了トグル円を塗り（light gray-300 / dark gray-700）で表す。未完了トグル円は塗りなし（透明）で 20pt/dp/px、ページャーインジケータのドットは 8 で非選択は muted icon 色。認証・共有プレビューのカードは角丸 24 + 1px 枠線（Web `ll-rounded-24px` + gray-300、iOS `cornerRadius 24` + `AppPalette.border`、Android `RoundedCornerShape(24.dp)` + `outlineVariant`、カード面は light 白 / dark gray-900 = Android `surfaceContainer`）。
- iOS / Android の task row は drag handle・完了トグル・本文の縦方向中心を揃える。Android は Web と同じく日付なしの行を中央揃え、日付ありの行を本文領域（最小高 48）の下揃えにする。日付ラベルは本文や編集欄の縦位置を押し下げず、同じ本文領域内の直上へ近接表示する。iOS は日付ラベル下の余白を負方向に少し詰め、本文領域の中心線を基準に揃える。
- Web / iOS / Android の task 本文インライン編集は、編集開始時にキャレットを本文末尾へ置く（全選択にしない）。iOS / Android は `TextRange(length)` 相当、Web は `setSelectionRange(end, end)` で揃える。
- task 本文の編集中に別 task へ移る場合は、旧 task の編集値を確定してから新 task の本文で編集状態を初期化する。遅延した blur / focus loss の確定処理は現在の `editingTaskId` と対象 task ID が一致する場合だけ受理し、新 task の編集値を旧 task へ保存しない。
- task 行一覧の密度はやや詰めた行間を正とする。タップ領域（iOS の completion / drag / trailing `48pt`、Android の各操作 `48dp`）は据え置き、行間メトリクス（iOS `taskRowVerticalPadding` = 2 で行ピッチ 52、行同士の gap は 0 とし並び替えの swap 判定も `taskRowGap` を使う、Android `TaskListDetailMetrics.rowVerticalPadding` = 2 で行ピッチ 52（行間 0、swap 判定の spacing も 0）、Web は task 行の `padding-block`）だけで密度を調整する。
- iOS / Android の `TaskListDetailPage` は、タスク追加・完了切替・本文編集・日付変更・ピン切替ごとに local pending 表示へ入れた正規化済み task 集合を保持し、Firestore へは変更前後の差分 field だけを保存する。`autoSort` 有効時はグループ・日付順、無効時は操作後の全 task 配列順で再採番したうえで、変化した `order` だけを書き込む。
- 3 プラットフォームのアクセシビリティ文言は shared locale の `a11y.*` キー（`listPosition` / `moveUp` / `moveDown` / `today` / `hasTasks` / `addTask` / `editTask` / `drag*`）と既存 key を正本とし、固定言語文字列を直接書かない。iOS はアイコンのみのボタンに `accessibilityLabel`、画面・セクションタイトルに `.isHeader` trait、Android は `semantics { heading() }` を設定する。
- 並び替えはドラッグ操作に加えてスクリーンリーダーとハードウェアキーボード向け代替手段を必ず提供する。Web は dnd-kit `KeyboardSensor` と `DndContext` の `accessibility` prop（`buildDndAccessibility()` で `a11y.drag*` をローカライズ）、iOS は drag handle の `accessibilityAction(named:)` + Option + 上下矢印、Android は drag handle semantics の `customActions` + Alt + 上下矢印で `a11y.moveUp` / `a11y.moveDown` 相当の移動を提供する。修飾なしの上下矢印は通常のフォーカス移動に残し、実行不能な方向のスクリーンリーダー action は表示しない。実装は表示順配列を swap した ID 配列を既存の commit / persist 関数へ渡す。
- 3 プラットフォームの文字・アイコンは WCAG 2.2 AA のコントラスト（文字 4.5:1、識別に必要なアイコン・枠線・状態表示 3:1）を light / dark とタスクリスト背景色の全組み合わせで満たす。補助色は前景色の透過で表し、muted text は light 0.64 / dark 0.68、muted icon は light 0.5 / dark 0.45 とする。light テーマで背景色付きタスクリスト上（とそのページャーインジケータ）は muted text 0.84 / muted icon 0.66 に上げ（Web `[data-colored-background]`、iOS `AppPalette.subtleTextOnColor` / `subtleIconOnColor`、Android `LocalOnColoredBackground`）、sheet / dialog 内は通常値に戻す。入力欄の placeholder とカレンダーの月外日は muted text、当日リング・色未設定の枠線は `#6B7280` とする。状態を行全体の opacity で表して文字コントラストを下げない。
- 完了トグルの読み上げ名はタスク本文とし、完了状態は Web の checkbox `checked`、iOS の `accessibilityValue`（`pages.tasklist.markComplete` / `markIncomplete`）、Android の semantics `toggleableState` で公開する。アイコン付きの操作（カレンダー行の編集など）は操作名 + タスク本文を読み上げ名にし、テキスト付きボタン内の装飾アイコンは読み上げ対象から外す（iOS `.accessibilityHidden(true)`、Web `aria-hidden`、Android `contentDescription = null`）。複数要素を連結する読み上げラベルの区切りは `, ` とし、言語固有の句読点を固定で使わない。
- ページャーインジケータのドットはタスクリスト名 + `a11y.listPosition` を読み上げラベルにし、選択状態（iOS `.isSelected` trait / Android semantics `selected`）を公開する。カレンダー日セルは日番号 + `a11y.today` / `a11y.hasTasks` + 選択状態を公開する。
- iOS の bundle identifier と Android の applicationId は `com.lightlist.app` を正とする。Android の Gradle `namespace` と Kotlin パッケージも `com.lightlist.app` に揃える。
- 本番 Web ドメインは `https://lightlist.app/`（Cloudflare Pages）を正とし、native の共有 URL（`https://lightlist.app/sharecodes/?code=CODE`）・パスワードリセット URL（`https://lightlist.app/password_reset`）・Universal Links / App Links の host、LP の canonical / `og:url` をこのドメインに揃える。`lightlist.com` は Lightlist の配信先ではないため使わない。
- UI フォントの正本は `shared/assets/fonts/gen-interface-jp` とし、本文は `Gen Interface JP`、主要見出しは `Gen Interface JP Display` を使う。共有コードなど等幅の意味を持つ表示は monospace を維持する。
- ライセンス表記の手動管理対象は `shared/licenses/manual-licenses.json` を正本とし、Web は `apps/web/scripts/generate-licenses.mjs`、iOS は `LicensePlist` build tool plugin、Android は Google OSS Licenses plugin で依存ライセンスを生成する。iOS の LicensePlist は `apps/ios/license_plist.yml` を必須設定として読み、生成物コピーの run script は plugin 出力 directory を input、DerivedData 内の完了 marker を output に宣言して Xcode の依存解析警告を出さない。Android の runtime library は従来版 Activity を含む `play-services-oss-licenses:17.2.2` に固定し、アプリ本体の Compose BOM と競合する Compose ベースの v2 Activity（17.4.0 以降）は使わない。従来版が runtime scope で要求する古い AppCompat を置き換え、Activity の superclass を compile classpath に公開するため、`androidx.appcompat:appcompat:1.7.1` を直接依存に含める。Android の Google OSS Licenses plugin は runtime classpath を設定時に解決するため、Google Play 提出物を作る `bundleRelease` / `bundle-play` のときだけ適用する。Crashlytics Gradle plugin は SDK の初期化に必要な build ID を注入するため全 variant に適用し、mapping upload だけを `bundleRelease` のときに有効にする。iOS の build tool plugin は初回 build 時に Xcode の trust が必要で、CLI では必要に応じて `xcodebuild -skipPackagePluginValidation` を使う。
- ブランドロゴの現行 SVG は `shared/assets/brand/logo.svg` と `apps/web/public/brand/logo.svg` を正とする。
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は「`taskListOrder` から外す」を基本とする。現在の `memberCount` が 1 以下の場合のみ `taskLists` 実体を削除する。
- アカウント削除は「全タスクリストの離脱/削除 → settings + taskListOrder の削除 → `deleteUser`」の順を維持する。auth 削除後は Firestore Rules で書き込みできないため逆順にはできず、`requires-recent-login` で `deleteUser` だけ失敗した場合はエラー表示して再ログイン後の再実行に任せる。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でもプレビュー閲覧可、編集は membership 保持者のみ」とする。共有URLを知っていることはプレビュー取得用の bearer credential として扱う。
- `taskLists/{taskListId}/members/{uid}` を保持権限の正本とし、`taskListOrder/{uid}` は表示順専用にする。新規作成・共有参加・離脱では membership、order、`memberCount` を同一 batch で更新する。
- 新規タスクリストの `background` 既定値は `null` とし、カレンダーの同日タスクはタスクリスト順、次にリスト内表示順で並べる。
- 共有コード生成は 8 文字の英大文字・数字を暗号学的乱数で作る。Web は `crypto.getRandomValues`、iOS は `SecRandomCopyBytes`、Android は `SecureRandom` を使い、生成・削除は事前 read 後の batch write で `shareCodes` と `taskLists.shareCode` を更新する。生成の試行回数は 3 プラットフォームとも最大 10 回で、既存 `shareCode` がある場合は trim + uppercase 正規化した doc ID で旧 `shareCodes` doc を同じ batch で削除する。外部入力・deep link・既存値から Firestore document path を組み立てる前に、trim + uppercase 後の完全一致 `^[A-Z0-9]{8}$` を必ず検証し、不正な path を作らない。
- `memberCount <= 1` のタスクリスト実体削除（リスト削除・アカウント削除の両方）では、`taskLists.shareCode` が残っていれば対応する `shareCodes` doc も同じ batch で削除し、削除済みリストを指す共有コードを残さない。
- `taskListOrder/{uid}` は本人が任意の `taskListId` を追加できるが、その追加自体を保持権限付与として扱わない。共有参加時は正規化済み `joinCode` を持つ membership document を同一 batch で作成する。
- `taskLists` / `taskListOrder` / `shareCodes` の `createdAt` / `updatedAt` は Firestore Rules の `int` 型検証と pending snapshot の安定性に合わせ、server timestamp ではなく Unix epoch milliseconds の number を書き込む。Web の `taskLists` 読み取りは既存データや pending snapshot に timestamp-like 値が混在しても `estimate` として解決する。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。
- `shared/locales/locales.json` は英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- 配信用スクリーンショットの元画像は `apps/ios/screenshots` / `apps/android/screenshots` / `apps/web/screenshots` に置き、生成は `cd apps/web && npm run screenshots:generate -- <target>` またはルートの `just screenshots <target>` で行う。出力は iOS が `apps/ios/screenshots/app-store/iphone-6.9`、Android が `apps/android/screenshots/google-play/phone`、Web が `apps/web/public/screenshots/store/{wide,narrow}`。変換は中央基準の cover crop を使い、iOS App Store は `1290x2796`、Google Play phone は `1080x1920`、Web manifest screenshots は wide `1920x1080` / narrow `750x1334` を正とする。現行フローは iPhone 比率の元画像だけを対象にし、iPad App Store スクリーンショットは別途 iPad 実画面の元画像追加が必要。

- 共有コードの生成・解除はサーバーから現行リストを読んで batch を組み、Rules でも旧コード文書の同時削除を要求する。コード解決はサーバーの現在値と照合し、Rules もリストから参照されない既存コード文書の get を拒否する。競合失敗は画面で通知し、再実行時に再取得する。
- 退会は 3 プラットフォームとも確認画面で現在のパスワードを入力し、`EmailAuthProvider` による再認証が成功するまで Firestore データを削除しない。パスワードは永続化・ログ出力しない。Auth ユーザー削除はデータ削除後に行う。

- オフライン表示は 3 プラットフォームともルートに 1 つだけ置く `OfflineNotice`（Web は `AppWrapperBody`、iOS は `RootView` と fullScreenCover の overlay、Android は `RootScreen` の `BoxWithConstraints` 末尾）で行い、画面ごとに追加しない。Android は `ACCESS_NETWORK_STATE` を manifest に宣言する。

## 主要コマンド

- ルート:
  - `just deploy-firestore`
  - `just deploy-firestore-prod`
- app ごとのコマンドは各 `apps/<app>/AGENTS.md` を参照する。

## セキュリティ・品質ルール

- `console.error` にユーザーメール等の PII（個人識別情報）を含めない。`userEmail` は必ずログから除外する。
- CI による品質ゲートは設定しない。品質確認は変更があった app のローカル検証コマンド実行を正本とする。

## 作業完了チェック

1. 変更内容を見直し、無駄な変数・関数・分割がないことを確認する。
2. `docs/` を実装に合わせて更新し、仕様として記述する。
3. agent 向けドキュメント（`AGENTS.md` / `CLAUDE.md`）に恒久的な知見の追記・修正が必要か確認し、必要なら更新する。
4. 変更があった app ごとに検証を実行する。`apps/web` は `npm scripts`、`apps/ios` / `apps/android` は `Justfile` を正本として扱う。
5. `apps/web` を変更した場合は `cd apps/web && npm run format && npm run lint && npm run build && npm run typecheck` を実行する。
6. `apps/ios` を変更した場合は `cd apps/ios && just format && just lint && just build && just build-release` を実行する。
7. `apps/android` を変更した場合は `cd apps/android && just lint && just build` を実行する。現状 Android 専用の `format` は未設定のため要求しない。
8. 明示指示がない限りコミットしない。
