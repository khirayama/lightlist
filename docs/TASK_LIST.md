# タスクリスト機能ドキュメント

## 概要

LightList はタスクリスト管理機能を提供しており、複数のタスクリストを作成・管理できます。各タスクリストは個別のタスクを含み、ユーザーが効率的に作業を管理できるように設計されています。

## タスク管理ページ

**ページ:** `apps/web/src/pages/app.tsx`

### 概要

- Shadcn Drawer で左側にタスクリスト一覧と作成フローをまとめ、右側にタスク詳細カルーセルを置く 2 カラム構成。幅 1024px 以上ではドロワー内容を左カラムとして常時表示し、狭い幅ではトリガー付きのオーバーレイ表示に切り替える。
- レイアウトは AppShell の画面100%（`h-dvh`）を基準とし、ページ最上位は `min-h-full w-full` を前提に組み立てる。
- タスクリストとタスクの並び替えはすべて `@dnd-kit` のドラッグハンドルで行う。Firestore への反映は非同期で行い、`appStore` の購読更新で順序が確定し、他ユーザー更新が入った場合も最新状態に追従する。
- モバイルではドラッグ開始時のスクロール競合を避けるため、ドラッグハンドルに `touch-action: none`（Tailwind: `touch-none`）を付与している。
- 並び替えのドラッグは縦方向のみに制限し、`DndContext` の `modifiers` に `restrictToVerticalAxis` を設定している。
- Firebase 認証の状態を監視し、未ログインの場合は `/` にリダイレクト。

### UI 構成

- **ヘッダー / ドロワー:** ページタイトルと Drawer トリガーを配置。幅 1024px 以上ではドロワー内容を左カラムに固定し、より狭い幅では shadcn Drawer（左スライド、オーバーレイ付き）でログインメールを表示し、設定画面へのリンクを提供する。左右ドロワーはタップ操作を優先するため `handleOnly` を有効化し、コンテンツ上でのドラッグ開始を抑止している。
- **タスクリスト一覧（ドロワー内）:** `appStore` から取得したリストを DnD で並び替え。作成ボタンは Dialog で開き、名前と背景色を入力してフォーム送信（`Enter` / 作成ボタン）で `createTaskList` を実行。作成ボタンの隣には「共有リストに参加」ボタンがあり、共有コードを入力する Dialog を開く。コードを入力して参加すると `fetchTaskListIdByShareCode` でリストを特定し、`addSharedTaskListToOrder` で自分のリストに追加する。ヘッダー直下の「カレンダーで確認」ボタンから下部シートを開き、日付付きタスクのカレンダーと一覧を表示する。シートは Drawer より高い z-index で重なり、mobile/desktop ともにより上端まで展開する。カレンダーは `w-full` 前提で表示し、wide layout では左にカレンダー・右にタスクリストを配置する。カレンダー領域はカルーセル表示で、未完了の日付付きタスクが存在する最初の月の前月から最後の月の翌月までを横スクロールで移動できる。初期表示は今月を優先し、必要に応じて今月のスライドを追加する。インジケーターは上部に表示し、カレンダー自体の前月・翌月ボタンは表示しない。各スライドで日付クリックすると該当日付の先頭タスクへスクロールし、同日付のタスク行をハイライトする。タスクがある日付には表示中の月の未完了タスクに限ってタスクリスト色のドットを表示し、一覧も表示中の月の未完了タスクのみを対象とする。一覧は日付順・タスク名順で表示し、1段目は左に日付・右にカラーとタスクリスト名、2段目にタスク名を表示する。タスク行クリックで日付を選択し、タスクリスト名クリックで対象タスクリストへ移動する。リストが長い場合はカレンダーを sticky に保ち、一覧側のみスクロールする。mobile では一覧領域を `flex-1` で確保し、一覧スクロール領域には下端余白と `data-vaul-no-drag` を適用して、最下部タスクの見切れとシートのドラッグ挙動との干渉を抑制する。リストが空のときは `app.emptyState` を表示し、各行には背景色スウォッチとタスク数を併記する。
- **ネイティブ版カレンダー導線:** `apps/native` でも同じ導線を採用し、DrawerPanel の「カレンダーで確認」ボタンからモーダルシートを開く。月移動は矢印ではなく `Carousel` のスワイプと上部インジケーターで行い、`react-native-calendars` の日セルを Web 相当に寄せた配色・サイズで描画する。日付タップで表示中月のタスクリストを該当位置へスクロールし、同日タスクをハイライトし、タスクリスト名タップで対象リストへ遷移する。
- **タスク詳細カルーセル:** 各タスクリストを `Carousel` で横スライド化し、Web ではホイール左右操作や前後ボタン、モバイルではスワイプで切り替える。各スライド内のタスクリストは独立して縦スクロール可能であり、リストが長くなっても画面全体のスクロールは発生しない。AppHeader 直下にドット型の locator を表示し、現在位置を示しつつクリックでリストを切り替えられる。ページ全体に表示中スライドの `TaskList.background` を適用し、内側を可読性の高い半透明のサーフェス（`bg-white/60 dark:bg-gray-900/60` + `backdrop-blur-md`）として構成する。ワイドレイアウトではタスクリストの最大幅を制限し、読みやすさを維持する。`TaskListCard` は共有ページと同じレイアウト（入力欄が上、一覧が下）で完了・日付設定・追加・編集を行う。
- **色と共有:** タスクリストカード右上の編集（edit）/共有（share）アイコンボタンから Dialog を開き、編集Dialogでリスト名と背景色をまとめて変更する（保存はフォーム送信: `Enter` / 保存ボタン）。共有Dialogでコードの生成/停止とクリップボードコピーを行う。
- **削除確認:** リスト編集Dialog内の更新ボタン上部に配置された削除ボタンから `deleteTaskList` を実行。

### カルーセル操作

- ブラウザのネイティブスクロールと CSS Snap Points を活用し、ホイールやスワイプでスムーズにスライドが切り替わり、`selectedTaskListId` を同期する。
- モバイルのスワイプでインデックスが更新された場合は同期スクロールを即時適用し、不要な再アニメーションを避ける。
- ページ全体の背景色は `selectedTaskListId` の変更に合わせて即座に切り替わる。
- タスク並び替え中は `TaskListCard` からの sorting 状態を受け取り、カルーセルのスクロール操作を無効化して横スクロールを抑制する。
- ネイティブでは `Carousel`（`react-native-pager-view` ベース）の `scrollEnabled` を並び替え状態と連動させ、通常時は横スワイプを優先し、タスクアイテムの drag_indicator ハンドルからドラッグを開始した場合のみ横スワイプを無効化する。ハンドル起点のドラッグは長押し不要で開始できる。index 確定は `onPageSelected` で行い、ローカル index と外部通知を同期する。外部 index 変更はページャーへ直接反映して連続スワイプ時の不安定な戻りを防ぐ。
- リスト一覧での選択や Dialog オープン時は対象リストを事前に選択し、カルーセル位置とフォーム入力を一致させる。
- locator（ドット）をクリックして `selectedTaskListId` を切り替え、カルーセル位置を同期する。locator は背景に `bg-white/40 dark:bg-black/40` と `backdrop-blur-md` を備えたカプセル状のバーに配置され、常に高い視認性を保つ。

### 並び替え

- **タスクリスト:** `updateTaskListOrder(draggedTaskListId, targetTaskListId, traceId?)` で全リストの order を再採番。
- **タスク:** `updateTasksOrder(taskListId, draggedTaskId, targetTaskId)` でタスク順を更新。通常はドラッグ対象 1 件の `order` のみ更新し、前後ギャップが不足した場合のみ全体を再採番する。`autoSort` が有効な場合、`updateTask` 内でも完了状態と日付に基づき order を再計算する。
- **ネイティブのドラッグ終了処理:** タスクのドラッグでは `onDragStart` / `onDragEnd` で並び替え中フラグを管理し、順序更新は `onReorder` の単一経路で実行する。タスクリストも同様に `onReorderTaskList` の単一経路で `updateTaskListOrder` を実行する。いずれもハンドルは `onPressIn` 起点で長押し不要とし、`panGesture` の `activeOffsetY: [-12, 12]` / `failOffsetX: [-24, 24]` で感度を緩和する。
- **UI の順序確定:** タスクリストの並び替えは `taskListOrderUpdatedAt`、タスクの並び替えは各 `TaskListCard` が監視する `TaskList.updatedAt` を基準に、`appStore` の更新で反映される。

### 入力とエラー

- 追加ボタンは入力が空白のときに無効化。
- タスク追加の挿入位置は `settings.taskInsertPosition` を参照して SDK 側で決定し、`TaskListCard` の props では制御しない。
- 新規作成/編集/追加の確定はフォーム送信（`Enter` / 送信ボタン）に統一し、キー操作とクリック操作で同じ処理を実行する。
- タスク追加は送信中表示を出さず、入力欄はフォーカスを維持したまま次の入力を受け付ける。失敗時はエラーを表示する。
- Firebase 由来のエラーコードは `AppError` を渡して `resolveErrorMessage` で i18n キーに変換し、`Alert` で表示する。

### アクセシビリティ

- DnD ハンドルには `title` と `aria-label` を付与し、`Spinner` は `aria-busy` を持つ。
- 編集/共有は Material Icons（edit/share）のアイコンボタンだが、`aria-label` と `sr-only` を付与してスクリーンリーダーでも操作できる。
- タスク追加は送信（send）アイコンボタンだが、`aria-label` と `sr-only` を付与してスクリーンリーダーでも操作できる。入力欄がフォーカスされている時のみ表示される。
- メニュー（menu）アイコンは `app.openMenu` を `aria-label` / `title` に設定する。
- Drawer は shadcn コンポーネントを利用し、`DrawerTitle`/`DrawerDescription` と `aria-labelledby`/`aria-describedby` を関連付ける。

## 状態管理

### ページレベルの状態

`apps/web/src/pages/app.tsx` で管理される状態：

```typescript
const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
  null,
);
const state = useSyncExternalStore(
  appStore.subscribe,
  appStore.getState,
  appStore.getServerSnapshot,
);
const [error, setError] = useState<string | null>(null);

const [editListName, setEditListName] = useState("");
const [editListBackground, setEditListBackground] = useState(colors[0].value);
const [showEditListDialog, setShowEditListDialog] = useState(false);
const [deletingList, setDeletingList] = useState(false);
const [showShareDialog, setShowShareDialog] = useState(false);
const [shareCode, setShareCode] = useState<string | null>(null);
const [generatingShareCode, setGeneratingShareCode] = useState(false);
const [removingShareCode, setRemovingShareCode] = useState(false);
const [shareCopySuccess, setShareCopySuccess] = useState(false);
const [createListInput, setCreateListInput] = useState("");
const [createListBackground, setCreateListBackground] = useState(
  colors[0].value,
);
const [showCreateListDialog, setShowCreateListDialog] = useState(false);
const [isDrawerOpen, setIsDrawerOpen] = useState(false);
const [isWideLayout, setIsWideLayout] = useState(false);
const [isTaskSorting, setIsTaskSorting] = useState(false);
```

**ドロワー状態の詳細:**

- `isDrawerOpen`: Drawer の開閉状態。幅が狭いときのみ利用し、タスクリストを選択したタイミングで閉じてカルーセル表示にフォーカスを移す。
- `isWideLayout`: 画面幅 1024px 以上で左カラムを常時表示するかどうかを判定する。真の場合、Drawer は閉じたままオーバーレイを使用しない。
- 狭い幅で Drawer を開いている間は `window.history.pushState` と `popstate` で「戻る」操作をフックし、ページ遷移ではなく Drawer を閉じる。カレンダーシートも同じ仕組みで履歴と連携し、戻る操作・ジェスチャーでシートを閉じる。
- `selectedTaskListId`: 現在選択中のタスクリスト ID。マウント時に最初のリストを選択し、Drawer 内の選択やカルーセルスクロールに合わせて同期する。
- `isTaskSorting`: `TaskListCard` の DnD 並び替え中フラグ。`Carousel` の横スワイプとホイールジェスチャーを抑止して誤操作を防ぐ。
- タスクの追加/編集入力（`newTaskText` / `editingTaskId` / `editingTaskText` など）は、各 `TaskListCard` に閉じ込めて管理する（リスト間でフォーム状態を共有しない）。

### アプリケーション状態（Store）

タスクリストデータは `appStore` から取得されます：

```typescript
const state: AppState = {
  user: User | null,
  settings: Settings | null,
  taskLists: TaskList[], // 順序付きリスト
  taskListOrderUpdatedAt: number | null,
  sharedTaskListsById: Record<string, TaskList>,
};
```

`taskListOrder` のスナップショット更新ごとに `taskLists` の購読対象 ID を再評価し、同一のID集合なら購読を維持します。削除は pending 中でも反映し、追加はコミット後に購読します。

## API インターフェース

### createTaskList(name: string, background?: string | null): Promise<string>

新しいタスクリストを作成します。

**パラメータ:**

- `name`: タスクリスト名（必須）
- `background`: 背景色（オプション、デフォルト: `null`。テーマカラーを使用）

**戻り値:**

- 作成されたタスクリスト ID

**動作:**

1. ローカルストアの `taskListOrder` を参照し、現在の最大 `order` 値を取得。
2. `newOrder = maxOrder + 1.0` として新しい順序値を算出（リストが空の場合は `1.0`）。
3. Firestore でバッチ書き込みを実行：
   - `taskLists/{newId}` ドキュメントを作成。
   - `taskListOrder/{uid}` ドキュメントに `{ [newId]: { order: newOrder } }` を追加更新。
4. `updatedAt` タイムスタンプを自動設定。

**例外:**

- Firebase Firestore のエラーをスロー。
- ユーザーログイン状態を確認し、ログインしていない場合はエラーをスロー。

### updateTaskList(taskListId: string, updates: Partial<TaskList>): Promise<void>

タスクリストの詳細（名前、背景色）を更新します。

**パラメータ:**

- `taskListId`: 更新対象のタスクリスト ID
- `updates`: 更新内容（`name`、`background`）

**動作:**

1. `updates` に含まれるフィールドを Firestore のドキュメントに反映。
2. `updatedAt` タイムスタンプを自動設定。
3. `background` に `null` を指定すると、背景色が解除されテーマカラー（デフォルト）に戻ります。

**例外:**

- Firebase Firestore のエラーをスロー。

### updateTaskListOrder(draggedTaskListId: string, targetTaskListId: string, traceId?: string): Promise<void>

タスクリストの順序を更新します（ドラッグ&ドロップ時）。

**パラメータ:**

- `draggedTaskListId`: ドラッグされたタスクリスト ID
- `targetTaskListId`: ドロップ先のタスクリスト ID（この位置に移動）

**動作:**

1. 現在の order を昇順で取得し、ドラッグ対象を配列から一度除外。
2. 対象リストの位置にドラッグ対象を挿入し（上方向は直前、下方向は直後）、`1.0` からの連番で再採番（Re-indexing）。
3. Firestore の `taskListOrder` ドキュメントをまとめて更新し、`updatedAt` を設定。

**技術仕様：**

- **更新範囲:** 並び替え発生時、全リストに対して `1.0` からの連番で order を再設定します。これにより浮動小数点の桁あふれ等を防ぎます。
- **更新方法:** Firestore の単一アップデートで一括反映。

**例外:**

- Firebase Firestore のエラーをスロー
- 指定されたタスクリストが見つからない場合はエラーをスロー

## 翻訳キー

タスクリスト機能の UI テキストは i18next を使用して多言語対応されています。

**メッセージキー:**

```
app:
  emptyState: タスクリストがない状態のメッセージ
  createNew: 新規作成ボタンのテキスト
  createTaskList: モーダルタイトル
  taskListName: リスト名入力フィールドのラベル
  taskListNamePlaceholder: 入力フィールドのプレースホルダー
  create: 作成ボタンのテキスト
  cancel: キャンセルボタンのテキスト
  error: エラーメッセージ（汎用）
  dragHint: ドラッグして並び替え
  openMenu: メニューを開く（menu アイコンのツールチップ/スクリーンリーダー用）
  drawerTitle: ドロワーのタイトル表示
  drawerNoEmail: メールが未設定の場合のラベル
  joinList: リストに参加ボタンのテキスト
  joinListTitle: 参加ダイアログのタイトル
  joinListDescription: 参加ダイアログの説明
  shareCodePlaceholder: 共有コード入力のプレースホルダー
  join: 参加ボタンのテキスト
  joining: 参加中ボタンのテキスト
  calendarNoDatedTasks: 日付付きタスクが存在しないときの表示
taskList:
  taskCount: タスク件数の表示（{{count}} 形式）
  editDetails: 編集ダイアログのタイトルと更新ボタン文言
  shareTitle: 共有ダイアログタイトル
  shareDescription: 共有ダイアログ本文
  shareCode: 共有コード表示ラベル
  generateShare: 共有コード生成ボタン
  removeShare: 共有停止ボタン
  selectColor: 色選択ラベル
  backgroundNone: 背景色「なし（テーマカラー）」のラベル
  backgroundNoneShort: スウォッチ用の短縮ラベル
```

詳細は `apps/web/src/locales/ja.json` および `apps/web/src/locales/en.json` を参照してください。

## ネイティブアプリ

**画面:** `apps/native/src/screens/AppScreen.tsx`（起点: `apps/native/src/App.tsx`）

### 概要

- Web の app ページを参照し、タスクリスト一覧と選択中リストのタスクを同一画面で管理する構成
- タスクリストの作成（名前＋色）、編集（名前＋色）、削除、ドロワー内の左端 drag_indicator アイコンで順序変更を提供
- 共有コードの生成/停止を提供
- タスクの追加、編集（テキスト/期限）、完了切り替え、削除、ドラッグハンドルによる並び替え、ソート、完了タスク削除に対応
- 画面文言は `app` / `taskList` / `pages.tasklist` の翻訳キーを使用

### UI 構成

- **ヘッダー:** アプリタイトル、ドロワー開閉、共有コード、サインアウト操作を配置
- **ドロワー:** 設定画面へのリンクとタスクリスト一覧をまとめ、選択時はドロワーを閉じてタスク操作に戻る。タスクリスト一覧は左端の drag_indicator アイコンで並び替えできる。「リストに参加」ボタンは Dialog で開き、共有コードを入力して参加する。
- **作成フォーム:** リスト名と背景色を入力して作成。背景色は「なし（テーマカラー）」が先頭かつデフォルト
- **編集ダイアログ:** 編集ボタンから Dialog を開き、リスト名と背景色の更新・削除を行う
- **タスク:** 入力欄で追加し、追加中も入力欄を無効化せず、追加後もフォーカスを維持する（追加ボタンやEnterでもキーボードを閉じない）。一覧で編集（テキスト/期限）に入るとテキスト入力へ自動フォーカスし、完了切り替え・ドラッグハンドルで並び替え・削除が可能。ヘッダー操作でソートと完了タスク削除を行う
- **ジェスチャ競合対策:** 通常のスワイプ操作はカルーセル遷移を優先し、タスクアイテムの drag_indicator ハンドルから開始したときのみ並び替えを優先する。`TaskListCard` から親へ sorting 状態を通知し、`AppScreen` 側でドラッグ中のみカルーセルの横スワイプを停止する。`ReorderableList` の `panGesture` は縦方向でのみアクティブ化し、横方向移動は失敗扱いにしてカルーセルへ譲る。

### デザイン仕様

#### タスクリストカード

- **背景:** `TaskList.background` はカルーセル内のタスクリスト領域に適用し、ヘッダー領域には適用しない。背景未設定（`null`）時はテーマ背景色（light: `#F9FAFB` / dark: `#030712`）を使用する。
- **アイテム:** タスクアイテム（`TaskItem`）には個別の背景色を付けず、親要素の背景が透けるように透明にする（ホバー時の背景色も適用しない）。
- **コンテンツ面:** 内側はライト/ダークで可読性が担保されるサーフェスとして扱い、ヘッダー情報・操作ボタン・タスク一覧を構成する。入力フィールドやチェックボックスなど、操作上必要な要素のみ適切な背景色を持つ。

## 順序管理

- タスクリスト並び替えは 1.0 からの連番で order を再採番します。
- タスク並び替えは原則ドラッグ対象 1 件の `order` のみ更新し、前後ギャップが不足した場合のみ再採番します。
- 並び替えは昇順配列を再構成して挿入位置を確定し、Firestore へ反映します。
- 追加時も挿入位置を確定してから全体を再採番するため、挿入位置がずれません。

## パフォーマンス考慮事項

### 最適化

1. **グリッドレスポンシブ:** Tailwind CSS ブレークポイントで効率的に実装
2. **リスト表示:** `TaskListCard` は ID ベースの参照マップを事前計算し、`DrawerPanel` は `renderItem` の `index` を直接利用して効率的にレンダリング
3. **状態更新:** 必要な状態変更のみトリガーし、`AppScreen` / `AppScreenContent` のストア二重購読を避けて再レンダー範囲を抑制
4. **描画関数の安定化:** `FlatList` / `ReorderableList` の `keyExtractor` / `renderItem` / `onReorder` を安定化し、不要な再生成を抑制
5. **order 更新:** 浮動小数により、並び替え時の更新件数を最小化
6. **ネイティブのカルーセル描画:** 選択中リストと隣接リストのみ `TaskListCard` を描画し、非表示リストのレンダー負荷を抑える

### 注意点

- リストが大量の場合、仮想スクロール導入を検討
- タスク数が多い場合、ページングを検討
- 非常に多くの並び替え操作が発生する場合、reindex 実行をモニタリング

## トラブルシューティング

### タスクリストが表示されない

1. ユーザーがログインしているか確認
2. Firebase の認証状態が正しいか確認
3. Firestore のデータ構造が正しいか確認
4. ブラウザの開発者ツールでコンソールエラーを確認

### 新規作成ができない

1. インターネット接続を確認
2. Firebase のセキュリティルールを確認（書き込み権限があるか）
3. リスト名が空でないか確認
4. ローディング状態が正しくリセットされているか確認

### モーダルが閉じない

1. キャンセルボタンをクリック
2. ブラウザを刷新してセッションをリセット

## メインコンテンツエリア（タスク詳細表示）

### 概要

メインコンテンツエリアは、統合ドロワーレイアウトの右側に表示される領域です。サイドバーで選択されたタスクリスト内のすべてのタスクを表示・管理します。タスクの作成、編集、日付設定、完了状態の切り替え、および並び替え機能を提供します。

### 主要機能

#### 1. タスク一覧表示

**仕様:**

- タスクリスト内のすべてのタスクをリスト形式で表示
- 各タスクアイテムは以下の情報を含む：
  - ドラッグハンドル（drag_indicator アイコン）：タスクの並び替えに使用
  - チェックボックス：完了状態の切り替え
  - コンテンツエリア：
    - 日付表示（設定時）：タスク内容の上に「月/日(曜日)」形式（ローカライズ対応）で表示
    - タスク内容テキスト：クリックして編集モードに切り替え
  - 日付設定ボタン：常に表示される calendar_today アイコン（設定状態によらずアイコンのみ表示）
- 完了したタスクは取り消し線で表示される

**エラーハンドリング:**

- 認証されていないユーザーはリダイレクト処理により、`/` へ移動

#### 2. タスクの並び替え（ドラッグ&ドロップ）

**機能:**

各タスクアイテムの左側にあるドラッグハンドル（drag_indicator アイコン）をドラッグして、タスクの順序を変更できます。

**ユーザー操作:**

1. ドラッグハンドルを押下してドラッグを開始（Web はポインタ移動距離 8px、Native は `onPressIn` で即時開始）
2. ポインタまたは指を上下に移動してタスクの順序を変更
3. ポインタまたは指を離すと新しい順序が保存される

**キーボード操作:**

- `arrow-up/down` キーでもドラッグハンドルをフォーカス後に順序変更が可能（アクセシビリティ対応）

**処理フロー:**

```
1. ユーザーがドラッグハンドルをドラッグ開始
   ↓
2. ドラッグ中はタスクが半透明表示
   ↓
3. ドラッグ終了時にドラッグされたタスクと対象タスクを特定
   ↓
4. 配列からドラッグ対象を一度除外し、対象タスク位置に挿入
   ↓
5. 前後タスクの order からドラッグ対象の新しい order を計算（通常は 1 件更新、必要時のみ再採番）
   ↓
6. `updateTasksOrder(taskListId, draggedTaskId, targetTaskId)` を呼び出し
   ↓
7. Firestore の `tasks[draggedTaskId].order` を更新（ギャップ不足時は一括更新）
   ↓
8. ストアが更新され、自動的に画面に反映
```

**視覚的フィードバック:**

- ドラッグハンドルはホバー時に色が濃くなる（`hover:text-gray-600`）
- ドラッグ中のタスクは半透明表示（`opacity-50`）
- ドラッグハンドルは `cursor-grab` から `cursor-grabbing` に変更

**技術詳細:**

- ライブラリ: `@dnd-kit/core` と `@dnd-kit/sortable` を使用
- ポインタセンサーとキーボードセンサーの両方に対応
- 最も近い衝突検出アルゴリズムを使用（`closestCenter`）

**補助操作（ボタン）:**

- **並び替え（Sort）:** 未完了タスクを優先し、日付 → 現在の order の順で整列したうえで order を再採番して保存する（`sortTasks(taskListId)`）。
- **完了タスク削除:** 完了済みタスクを確認ダイアログの後に一括削除し、残りタスクの order を再採番して保存する（`deleteCompletedTasks(taskListId)`）。

#### 3. タスクの作成

**フォーム:**

- タスク入力フィールド：テキスト入力、履歴補完対応
- send アイコンボタン：タスクを追加（フォーカス時のみ表示）

**自然言語による日付設定:**

タスク入力時に、先頭に以下のキーワードを入力すると、自動的に期限日が設定されます（キーワードはタスク名から除去されます）。

- **日本語:** 「今日」「明日」「明後日」「X日後」「月曜」「月」など ＋ スペース
- **英語:** "today", "tomorrow", "next monday" など ＋ スペース
- **日付指定:** `2025/01/03`, `2025-01-03`, `1/3` など ＋ スペース（年省略時は近い未来の日付として解釈）

例：「明日 会議の準備」 → 日付：明日の日付、タスク名：「会議の準備」
例：「1/10 支払い」 → 日付：今年の1月10日（過去なら来年）、タスク名：「支払い」

**操作:**

1. 入力フィールドにタスク内容を入力
2. `Enter` キーを押すか send アイコンボタンをクリック
3. タスクがリストに追加される（デフォルトは先頭に追加。設定により末尾への変更が可能）

**履歴補完:**

- 入力フィールドは shadcn/ui の Combobox（`cmdk` ベース）で補完候補を表示
- 過去に作成されたタスクテキストが候補として表示される
- リアルタイムでマッチしたテキストを候補リストから選択可能

**エラーハンドリング:**

- 空の入力は無効化（ボタンが disabled 状態）

#### 4. タスクの編集

**操作:**

1. タスク内容テキストをクリック
2. 編集モードに切り替わり、入力フィールドが表示される
3. テキストを編集（作成時と同様、日付キーワードによる日付更新も可能）
4. `Enter` キーで保存、`Escape` キーでキャンセル

#### 5. タスクの日付設定

**操作:**

1. タスクアイテム右端の日付設定ボタン（カレンダーアイコン）をクリック
2. Date Picker を開いて日付を選択
3. 日付が保存され、`autoSort` が有効な場合は並び順にも反映される

#### 6. タスクの完了状態切り替え

**操作:**

1. チェックボックスをクリック
2. タスクの完了状態が切り替わる
3. 完了したタスクは取り消し線で表示される

#### 7. タスクリスト情報の編集

**リスト名の編集:**

1. リスト名をクリック
2. 編集モードに切り替わり、入力フィールドが表示される
3. テキストを編集
4. `Enter` キーで保存、`Escape` キーでキャンセル

**リストの背景色変更:**

1. 「色を変更」ボタンをクリック
2. カラーピッカーモーダルが表示される
3. 色を選択して保存

#### 8. タスクリストの削除

**操作:**

1. 「リストを削除」ボタンをクリック
2. 確認モーダルが表示される
3. 削除を確認するとタスクリストとすべてのタスクが削除される

#### 9. タスクリストの共有

**機能:**

このタスクリストを他の人と共有できます。認証不要でshareCodeを使用して、誰でもタスクの閲覧・編集が可能です。shareCode は `shareCodes` コレクションで予約し、一意性を担保しています。

**操作:**

1. 「共有」ボタンをクリック
2. 共有モーダルが表示される
3. 「共有コードを生成」ボタンをクリックして共有コードを生成
4. 生成されたコードをコピーするか、共有URLをコピーして相手に送信
5. 共有を停止するには「共有を停止」ボタンをクリック

ネイティブアプリではタスクリスト画面の共有セクションから共有コードの生成/停止を行い、表示された共有コードを相手に伝えます。

**共有コードの仕様:**

- 英数大文字のみで8文字
- ユニーク性を確保するためにFirestoreで検証
- 複数回生成することで異なるコードを取得可能
- 共有を停止するとコードは無効化される
- `shareCodes` コレクションは、有効なコードを指定した取得（get）のみが誰でも可能です。一括取得（list）はセキュリティのため禁止されています。
- 共有コードの作成・削除は、`taskListOrder` に含まれる認証済みユーザーのみ許可する

### 状態管理

`apps/web/src/pages/app.tsx` は、タスクリスト選択・Drawer/Carousel・各 Dialog（リスト編集/共有/作成）などページ横断の状態を管理する。タスク追加/編集入力やタスク操作のエラーは各 `TaskListCard` に閉じ込める。

```typescript
const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
  null,
);
const [state, setState] = useState<AppState | null>(null);
const [error, setError] = useState<string | null>(null);

const [editListName, setEditListName] = useState("");
const [editListBackground, setEditListBackground] = useState(colors[0].value);
const [showEditListDialog, setShowEditListDialog] = useState(false);
const [deletingList, setDeletingList] = useState(false);
const [showShareDialog, setShowShareDialog] = useState(false);
const [shareCode, setShareCode] = useState<string | null>(null);
const [generatingShareCode, setGeneratingShareCode] = useState(false);
const [removingShareCode, setRemovingShareCode] = useState(false);
const [shareCopySuccess, setShareCopySuccess] = useState(false);
const [createListInput, setCreateListInput] = useState("");
const [createListBackground, setCreateListBackground] = useState(
  colors[0].value,
);
const [showCreateListDialog, setShowCreateListDialog] = useState(false);
const [isDrawerOpen, setIsDrawerOpen] = useState(false);
const [isWideLayout, setIsWideLayout] = useState(false);
const [isTaskSorting, setIsTaskSorting] = useState(false);
```

- `selectedTaskListId`: 表示対象のタスクリスト ID。初回ロード時に最初のリストを自動選択し、Embla の select イベントでカルーセルと Drawer 選択を片方向同期する。
- `state`: `appStore` から購読した `AppState`。ユーザー、設定、タスクリストを保持。
- `error`: ページ上部に表示するページレベルのエラーメッセージ（リスト作成/編集/削除/共有など）。
- `isTaskSorting`: `TaskListCard` からの sorting 状態を受け取り、カルーセルの横スワイプとホイールジェスチャーを抑止する。
- タスク操作（追加/編集/完了/日付設定/並び替え）の状態とエラーは `TaskListCard` が担当し、リストごとに独立して保持する。

### API インターフェース

#### addTask(taskListId: string, text: string, date?: string, id?: string, traceId?: string): Promise<string>

タスクを追加します。自然言語による日付解析と入力履歴の更新を自動的に行います。

**パラメータ:**

- `taskListId`: タスクリスト ID（必須）
- `text`: タスク内容（必須）
- `date`: タスクの日付（オプション）

**戻り値:**

- 作成されたタスク ID

**動作:**

1. **日付解析と正規化**:
   - `parseDateFromText(text)` を実行し、テキスト内の日付キーワード（例：「明日」「来週月曜」）を抽出。
   - 日付が検出された場合、その日付を優先して設定し、キーワードを除去したテキストをタスク名とします。
   - `text` が空文字の場合はエラーをスローします。

2. **挿入位置の決定**:
   - `settings.taskInsertPosition` を参照し、「先頭 (`top`)」または「末尾 (`bottom`)」を決定します。

3. **タスクオブジェクト作成**:
   - 新しいタスク ID を生成。
   - `completed: false`, `order: 0` で初期化。

4. **ソートと Order 計算**:
   - **`autoSort` 有効時**: 全タスクを「未完了 > 日付（昇順） > Order」の優先順位で並び替え、`1.0` からの連番で `order` を再設定します。
   - **`autoSort` 無効時**: 指定された挿入位置にタスクを追加し、全タスクを `1.0` からの連番で `order` を再設定します。

5. **入力履歴 (`history`) の更新**:
   - 入力されたテキストを履歴に追加します。
   - **重複排除**: 既存の履歴に同じテキスト（大文字小文字無視、trim済み）がある場合、古いものを削除して先頭に追加します。
   - **件数制限**: 最大 300 件まで保持し、超過分は末尾から削除されます。

6. **Firestore 更新**:
   - `tasks` マップへのタスク追加、再計算された `order` の更新、`history` の更新を一度の `updateDoc` で実行します。

#### updateTask(taskListId: string, taskId: string, updates: Partial<Task>, traceId?: string): Promise<void>

タスクを更新します。

**パラメータ:**

- `taskListId`: タスクリスト ID
- `taskId`: タスク ID
- `updates`: 更新する内容（テキスト、完了状態など）

**動作:**

1. **テキスト更新時の日付再解析**:
   - `updates.text` が含まれる場合、再度 `parseDateFromText` を実行します。
   - 新たに日付が検出された場合、`date` フィールドも同時に更新し、テキストからキーワードを除去します。

2. **ソートと更新**:
   - **`autoSort` 無効時**: 対象タスクのフィールドのみを更新します。
   - **`autoSort` 有効時**: 更新内容を反映した上で、全タスクを再ソート（未完了 > 日付 > Order）し、全タスクの `order` を再採番して一括更新します。

**例外:**

- テキストが空文字になる更新はエラーをスローします。
- タスクが存在しない場合はエラーをスローします。

#### deleteTask(taskListId: string, taskId: string): Promise<void>

タスクを削除します。

**パラメータ:**

- `taskListId`: タスクリスト ID
- `taskId`: タスク ID

**動作:**

1. **削除と再構成**:
   - **`autoSort` 無効時**: 対象フィールドを `deleteField()` で削除します。
   - **`autoSort` 有効時**: 対象タスクを除外した後、残りのタスクを再ソート（未完了 > 日付 > Order）し、`order` を再採番して一括更新します。

#### updateTasksOrder(taskListId: string, draggedTaskId: string, targetTaskId: string, traceId?: string): Promise<void>

タスクの順序を更新します（ドラッグ&ドロップ時）。

**パラメータ:**

- `taskListId`: タスクリスト ID
- `draggedTaskId`: ドラッグされたタスク ID
- `targetTaskId`: ドロップ先のタスク ID（この位置に移動）

**例:**

```typescript
await updateTasksOrder(taskListId, "task-1", "task-3");
// task-1 が task-3 の位置に移動（task-3 より下へ移動する場合は直後に配置）
```

**動作:**

1. ストアに対象タスクリストが存在しない場合は Firestore から取得して最新データを使用
2. 現在の order を昇順で取得し、ドラッグ対象を配列から除外
3. 対象タスクの位置に挿入したときの前後タスクを特定し、ドラッグ対象の `order` を計算
4. 前後ギャップが確保できる場合は `tasks[draggedTaskId].order` のみ更新
5. 前後ギャップが不足する場合のみ、全タスクを 1.0 から連番で再採番して一括更新
6. `updatedAt` タイムスタンプを自動設定
7. ストアの変更をリスナーに通知

**技術仕様：**

- **order フィールド:** 浮動小数の order を維持
- **更新件数:** 通常はドラッグ対象 1 件のみ更新、ギャップ不足時のみ全件再採番

#### sortTasks(taskListId: string, traceId?: string): Promise<void>

タスクを「未完了 → 日付 → 現在の order」優先で整列し、order を再採番して保存します。

**パラメータ:**

- `taskListId`: タスクリスト ID

**動作:**

- タスク数が 2 件未満の場合は何もしない
- 未完了を優先し、日付（未設定は後ろ）→ 現在の order の順で整列
- order を 1.0 から連番で再採番し、`tasks[taskId].order` をまとめて更新

#### deleteCompletedTasks(taskListId: string, traceId?: string): Promise<number>

完了済みタスクを一括削除し、残りタスクの order を再採番して保存します。

**パラメータ:**

- `taskListId`: タスクリスト ID

**戻り値:**

- 削除した完了タスク件数

**動作:**

- 完了タスクが 0 件の場合は何もしない（0 を返す）
- 完了タスクを削除し、残りタスクの order を再採番してまとめて更新
- `autoSort` が有効な場合は「未完了 → 日付 → 現在の order」優先で整列したうえで再採番する

#### 計測ログ（SDK）

- `packages/sdk/src/mutations/app.ts` は各更新 API で `traceId?: string` を受け取り、`mutation.start` / `mutation.before_write` / `mutation.after_write` を出力します。
- `packages/sdk/src/store.ts` は pending trace を `scopeKey` 単位で保持し、対応する `onSnapshot` 受信時に `snapshot.received`、反映時に `store.commit.*` を出力します。
- 画面側（Web/Native）は通常 `traceId` を明示的に渡さず呼び出し、SDK 側で生成された `traceId` により mutation から store 反映までを追跡します。

### 翻訳キー

タスク詳細ページの UI テキストは i18next を使用して多言語対応されています。

**メッセージキー:**

```
pages:
  tasklist:
    addTaskPlaceholder: タスク入力フィールドのプレースホルダー
    setDate: 日付設定ボタンのラベル
    noTasks: タスクが空のときの表示
    dragHint: ドラッグハンドルのツールチップ
    sort: 並び替え（整列）ボタンのテキスト
    deleteCompleted: 完了タスク削除ボタンのテキスト
    deleteCompletedConfirm: 完了タスク削除の確認メッセージ
  sharecode:
    deleteError: 完了タスク削除の失敗メッセージ
```

詳細は `apps/web/src/locales/ja.json` および `apps/web/src/locales/en.json` を参照してください。

### デザイン仕様

#### タスクアイテム

- **背景:** 個別の背景色は付けず、親セクションの色に従う
- **シャドウ:** 標準シャドウ（`shadow`）
- **コーナー:** 丸角（`rounded-lg`）
- **内部構造:**
  - ドラッグハンドル、チェックボックス、コンテンツ（日付+テキスト）、日付設定ボタンが左から右へ配置
  - 日付はテキストの上に配置され、少しトーンを下げて表示
  - ドラッグハンドルは `cursor-grab`、ドラッグ中は `cursor-grabbing`
- **ホバー効果:**
  - シャドウ増加（`shadow-md`）
  - スムーズなトランジション（`transition-shadow`）
- **ドラッグ中:**
  - 半透明表示（`opacity-50`）

#### ドラッグハンドル

- **アイコン:** drag_indicator アイコン（6ドット）
- **色:** グレー（`text-gray-400`）
- **ホバー色:** より濃いグレー（`hover:text-gray-600`）
- **カーソル:** `cursor-grab` / `cursor-grabbing`

#### チェックボックス

- **スタイル:** 標準 HTML チェックボックス
- **サイズ:** `w-5 h-5`
- **色:** インディゴ（フォーカス時）

#### タスクテキスト

- **完了時:** 取り消し線（`line-through`）、グレー色（`text-gray-600` / `dark:text-gray-400`）
- **未完了:** 通常の色（`text-gray-900` / `dark:text-gray-50`）
- **ホバー:** 下線（`hover:underline`）
- **編集モード:** 入力フィールド（`input`）は通常表示のテキストと同じスタイル（フォント、色、取り消し線、行間）を維持し、背景やボーダーを表示しないシームレスな編集体験を提供する。

#### 日付設定ボタン

- **表示:** 常に calendar_today アイコンを表示（設定状態によらず）
- **ホバー:** 薄いグレー背景（`hover:bg-gray-100` / `dark:hover:bg-gray-800`）
- **ツールチップ:** 設定済みの場合は「日付を設定: 月/日」（ローカライズされた日付）を表示

## 翻訳キー（タスクリスト一覧ページ）

タスクリスト一覧ページの UI テキストは i18next を使用して多言語対応されています。

**メッセージキー:**

```
common:
  add: 追加
  delete: 削除

app:
  dragHint: ドラッグハンドルのツールチップ

pages:
  tasklist:
    addTaskPlaceholder: タスク追加の入力プレースホルダー
    setDate: 日付設定ボタンの `aria-label` / `title`
    dragHint: ドラッグハンドルのツールチップ
    noTasks: 空状態テキスト
```

詳細は `apps/web/src/locales/ja.json` および `apps/web/src/locales/en.json` を参照してください。

## 共有ページ

**ページ:** `apps/web/src/pages/sharecodes/[sharecode].tsx`
**画面:** `apps/native/src/screens/ShareCodeScreen.tsx`

### 概要

shareCodeを使用して、認証なしでタスクリストを閲覧・編集できるページです。オーナーと同じUIでタスクの操作が可能であり、自分のリストに追加することもできます。

ネイティブアプリでは共有コードを入力して読み込み、共有リストの閲覧・タスク追加・完了切り替え・削除・ドラッグ並び替え・日付設定ボタンからのDate Pickerによる日付設定・自分のリストへの追加に対応します。

### 主要機能

#### 1. 共有リストの表示

**仕様:**

- URLのshareCodeパラメータから自動的にタスクリストを読み込む
- タスクの一覧をリスト形式で表示
- タスクリストの背景色を反映

**エラーハンドリング:**

- shareCodeが無効な場合はエラーメッセージを表示
- 読み込み中はローディング表示を表示

#### 2. タスク操作

**可能な操作:**

- タスク追加：新規タスク入力と send アイコンボタン
- タスク編集：テキストをクリックして編集モード
- タスクの日付設定：右側の日付設定ボタンからDate Pickerを開いて更新
- 完了状態切り替え：チェックボックスをクリック
- タスク並び替え：ドラッグ&ドロップ

認証不要であり、誰でもこのリスト上のタスクを操作できます。

#### 3. 自分のリストに追加

**仕様:**

- ページ右上に「自分のリストに追加」ボタンを表示（ログイン済みユーザーのみ）
- クリックするとこのタスクリストが自分の`taskListOrder`に追加される
- 追加後、`/app`ページへリダイレクト

**エラーハンドリング:**

- 既に自分のリストに存在する場合はエラーメッセージを表示
- ログインしていない場合はボタンを表示しない

### 状態管理

**ページレベルの状態:**

```typescript
const storeState = useSyncExternalStore(
  appStore.subscribe,
  appStore.getState,
  appStore.getServerSnapshot,
);
const [sharedTaskListId, setSharedTaskListId] = useState<string | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [user, setUser] = useState<typeof auth.currentUser>(null);
const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
// ... その他のタスク編集状態
```

**データ同期:**

- shareCode は `fetchTaskListIdByShareCode(shareCode)` で `taskListId` を解決し、`appStore.subscribeToSharedTaskList(taskListId)` で Firestore を購読する。
- 画面描画は `appStore.subscribe()` で購読した `AppState` の `sharedTaskListsById[taskListId]`（もしくは `taskLists`）を参照し、常に最新状態に追従する。

### API インターフェース

#### fetchTaskListIdByShareCode(shareCode: string): Promise<string | null>

指定された shareCode から `taskListId` を取得します。

**パラメータ:**

- `shareCode`: 共有コード（必須）

**戻り値:**

- 対応する taskListId、または見つからない場合は null

**動作:**

1. `shareCodes/{shareCode}` ドキュメントを取得し、紐づく `taskListId` を確認
2. shareCode が登録されていない場合は null を返す

#### fetchTaskListByShareCode(shareCode: string): Promise<TaskListStore | null>

指定された shareCode でタスクリストを取得します。

**パラメータ:**

- `shareCode`: 共有コード（必須）

**戻り値:**

- TaskListStore オブジェクト、または見つからない場合は null

**動作:**

1. `shareCodes/{shareCode}` ドキュメントを取得し、紐づく `taskListId` を確認
2. 対応する `taskLists/{taskListId}` を取得して返却
3. shareCode または taskList が存在しない場合は null を返す

#### addSharedTaskListToOrder(taskListId: string): Promise<void>

ログイン中のユーザーが共有されたタスクリストを自分のorderに追加します。

**パラメータ:**

- `taskListId`: タスクリスト ID（必須）

**動作:**

1. 現在のユーザーがログインしているか確認
2. 既に追加されているか確認
3. 新しい order 値を計算（最大order + 1.0）
4. `taskListOrder/{uid}` ドキュメントに追加
5. `/app` ページへリダイレクト

### 翻訳キー

共有ページの UI テキストは i18next を使用して多言語対応されています。

**メッセージキー:**

```
pages:
  sharecode:
    notFound: このタスクリストが見つかりません
    error: タスクリストを読み込めませんでした
    addTaskError: タスクを追加できませんでした
    updateError: タスクを更新できませんでした
    reorderError: タスクの順序を変更できませんでした
    addToOrderError: このタスクリストを追加できませんでした
    addToOrder: 自分のリストに追加
```

詳細は `apps/web/src/locales/ja.json` および `apps/web/src/locales/en.json` を参照してください。

### セキュリティ考慮事項

**現在の仕様:**

- 認証なしでタスクの閲覧・編集が可能（共有URLを知っている場合）
- shareCodeの推測は困難（8文字のランダム英数大文字）
- **Firestore セキュリティルールによる検証**: 単に `shareCode` フィールドの有無を確認するのではなく、サーバー側で `shareCodes` コレクション内のデータと突き合わせを行い、有効な紐付けがある場合のみアクセスを許可しています。
- 共有を停止（shareCodeの削除）すると、即座にアクセス権が失効します。

**将来の改善:**

- 一定時間でコードの自動失効機能
- アクセスログの記録機能

## Firestoreセキュリティルール

タスクリスト機能はFirestoreセキュリティルールによって保護されています。以下のルールが適用されます。

### 読み取り権限（Read）

以下のいずれかを満たす場合にタスクリストを読み取り可能です：

1. **自分のtaskListOrderに登録されている場合**
   - ユーザーが作成したタスクリスト、または他者から共有されたタスクリストを自分のリストに追加した場合
   - ユーザーのtaskListOrderドキュメント内にtaskListIdが含まれている
   - ※認証済みユーザー本人のみがアクセス可能です。

2. **有効な共有コード（shareCode）を知っている場合**
   - 対象のタスクリストに `shareCode` が設定されており、かつそのコードが `shareCodes` コレクション内に正しく存在し、対象の `taskListId` を指している場合。
   - この場合、認証の有無に関わらず読み取り（および更新）が許可されます。
   - ※`shareCode` が存在するかのみを確認するのではなく、実在する共有コードとの整合性をサーバー側で厳格に検証しています。

### 書き込み権限（Update / Delete）

- **Update**: 自分の `taskListOrder` に登録されているか、または「有効な共有コード」を知っている場合に許可されます。不変フィールド（`id`、`createdAt`）の変更は防止されます。
- **Delete**: 自分の `taskListOrder` に登録されている（＝オーナーである）場合のみ許可されます。共有ユーザーによるリスト自体の削除はできません。

### 作成権限（Create）

認証済みユーザーであれば誰でもタスクリストを作成できます：

- 必須フィールド（`id`、`name`、`tasks`、`history`、`shareCode`、`background`、`createdAt`、`updatedAt`）の存在確認
- idがドキュメントのパスパラメータと一致することを確認
- createdAtとupdatedAtが整数型（ミリ秒タイムスタンプ）であることを確認

### 削除権限（Delete）

タスクリストの削除は、自分のtaskListOrderに登録されている場合のみ可能です：

- deleteBatchでtaskListOrderからも同時に削除される前提

### パフォーマンス考慮事項

- 各操作時にtaskListOrderまたはshareCodesドキュメントをget()関数で参照（1回の追加読み取り）。
- セキュリティと引き換えにわずかな読み取りコストが発生しますが、不正アクセスを確実に防止します。

### 潜在的なリスク

認証済みユーザーは誰でもタスクリストを作成できるため、以下のような孤立ドキュメントが発生する可能性があります：

- taskListOrderに追加せずにtaskListのみを作成した場合
- 作成後は自分のtaskListOrderに含まれていないため、読み取り・更新・削除ができない
- 実質的に孤立したドキュメントとなり、ストレージを消費
- セキュリティ上の問題はない（アクセス不可のため）

## 今後の拡張機能

- カスタム背景色選択の拡張
- タスクのカテゴリ分類機能
- 優先度の設定機能
- タスクのフィルタリング・検索機能
- 共有コード有効期限設定機能
- 読み取り専用共有モード
