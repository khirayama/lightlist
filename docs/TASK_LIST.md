# タスクリスト機能ドキュメント

## 概要

LightList はタスクリスト管理機能を提供しており、複数のタスクリストを作成・管理できます。各タスクリストは個別のタスクを含み、ユーザーが効率的に作業を管理できるように設計されています。

## タスク管理ページ

**ページ:** `apps/web/src/pages/app/index.page.tsx`

### 概要

- Shadcn Drawer で左側にタスクリスト一覧と作成フローをまとめ、右側にタスク詳細カルーセルを置く 2 カラム構成。幅 1024px 以上ではドロワー内容を左カラムとして常時表示し、狭い幅ではトリガー付きのオーバーレイ表示に切り替える。
- レイアウトは AppShell の画面100%（`h-dvh`）を基準とし、ページ最上位は `min-h-full w-full` を前提に組み立てる。
- タスクリストとタスクの並び替えはすべて `@dnd-kit` のドラッグハンドルで行う。UI はドロップ直後にローカルで順序を即時反映（optimistic）し、Firestore への反映は非同期で追従する。`appStore` の購読更新で順序が確定し、他ユーザー更新が入った場合も最新状態に追従する。
- モバイルではドラッグ開始時のスクロール競合を避けるため、ドラッグハンドルに `touch-action: none`（Tailwind: `touch-none`）を付与している。
- 並び替えのドラッグは縦方向のみに制限し、`DndContext` の `modifiers` に `restrictToVerticalAxis` を設定している。
- Firebase 認証の状態を監視し、未ログインの場合は `/` にリダイレクト。

### UI 構成

- **ヘッダー / ドロワー:** ページタイトルと Drawer トリガーを配置。幅 1024px 以上ではドロワー内容を左カラムに固定し、より狭い幅では shadcn Drawer（左スライド、オーバーレイ付き）でログインメールを表示し、設定画面へのリンクを提供する。左右ドロワーはタップ操作を優先するため `handleOnly` を有効化し、コンテンツ上でのドラッグ開始を抑止している。
- **タスクリスト一覧（ドロワー内）:** `appStore` から取得したリストを DnD で並び替え。作成ボタンは Dialog で開き、名前と背景色を入力して `createTaskList` を実行。リストが空のときは `app.emptyState` を表示し、各行には背景色スウォッチとタスク数を併記する。
- **タスク詳細カルーセル:** 各タスクリストを `Carousel` (Embla) で横スライド化し、ホイール左右操作や前後ボタン、スワイプで切り替える。AppHeader 直下にドット型の locator を表示し、現在位置を示しつつクリックでリストを切り替えられる。表示中スライドの `TaskList.background` を外枠アクセントとして適用し、内側を可読性の高いサーフェス（ライト/ダーク対応）として構成する。`TaskListPanel` は `variant="card"` を使用し、共有ページと同じレイアウト（入力欄が上、一覧が下）で完了・削除・追加・編集を行う。
- **色と共有:** タスクリストカード右上の編集/共有アイコンボタンから Dialog を開き、編集Dialogでリスト名と背景色をまとめて変更する。共有Dialogでコードの生成/停止とクリップボードコピーを行う。
- **削除確認:** リスト編集Dialog内の削除ボタンから `deleteTaskList` を実行。

### カルーセル操作

- `embla-carousel-wheel-gestures` を有効化し、ホイールで左右にスクロールするとスライドが切り替わり、`selectedTaskListId` を同期する。
- タスク並び替え中は `TaskListPanel` からの sorting 状態を受け取り、カルーセルのホイール操作とドラッグを無効化して横スクロールを抑制する。
- リスト一覧での選択や Dialog オープン時は対象リストを事前に選択し、カルーセル位置とフォーム入力を一致させる。
- locator（ドット）をクリックして `selectedTaskListId` を切り替え、カルーセル位置を同期する。

### 並び替え

- **タスクリスト:** `updateTaskListOrder(draggedTaskListId, targetTaskListId)` で全リストの order を再採番。
- **タスク:** `updateTasksOrder(taskListId, draggedTaskId, targetTaskId)` でタスク順を更新。`autoSort` が有効な場合、`updateTask` 内でも完了状態と日付に基づき order を再計算する。
- **UI の順序確定:** ドロップ直後は local の並び替えオーバーレイを表示し、`appStore` の更新（`taskListOrderUpdatedAt` / `TaskList.updatedAt`）で確定・解除する。

### 入力とエラー

- 追加ボタンは入力が空白のときに無効化。
- Firebase 由来のエラーコードは `AppError` を渡して `resolveErrorMessage` で i18n キーに変換し、`Alert` で表示する。

### アクセシビリティ

- DnD ハンドルには `title` と `aria-label` を付与し、`Spinner` は `aria-busy` を持つ。
- 編集/共有はアイコンボタンだが、`aria-label` と `sr-only` を付与してスクリーンリーダーでも操作できる。
- Drawer は shadcn コンポーネントを利用し、`DrawerTitle`/`DrawerDescription` と `aria-labelledby`/`aria-describedby` を関連付ける。

## 状態管理

### ページレベルの状態

```typescript
const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
  null,
);
const [state, setState] = useState<AppState | null>(null);
const [error, setError] = useState<string | null>(null);

const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
const [editingTaskText, setEditingTaskText] = useState("");
const [newTaskText, setNewTaskText] = useState("");
const [editListName, setEditListName] = useState("");
const [editListBackground, setEditListBackground] = useState(colors[0]);
const [showEditListDialog, setShowEditListDialog] = useState(false);
const [deletingList, setDeletingList] = useState(false);
const [showShareDialog, setShowShareDialog] = useState(false);
const [shareCode, setShareCode] = useState<string | null>(null);
const [generatingShareCode, setGeneratingShareCode] = useState(false);
const [removingShareCode, setRemovingShareCode] = useState(false);
const [shareCopySuccess, setShareCopySuccess] = useState(false);
const [createListInput, setCreateListInput] = useState("");
const [createListBackground, setCreateListBackground] = useState(colors[0]);
const [showCreateListDialog, setShowCreateListDialog] = useState(false);
const [taskListCarouselApi, setTaskListCarouselApi] =
  useState<CarouselApi | null>(null);
const [isDrawerOpen, setIsDrawerOpen] = useState(false);
const [isWideLayout, setIsWideLayout] = useState(false);
const [optimisticTaskListOrder, setOptimisticTaskListOrder] = useState<{
  ids: string[];
  startedAt: number;
} | null>(null);
const [optimisticTaskOrder, setOptimisticTaskOrder] = useState<{
  taskListId: string;
  ids: string[];
  startedAt: number;
} | null>(null);
```

**ドロワー状態の詳細:**

- `isDrawerOpen`: Drawer の開閉状態。幅が狭いときのみ利用し、タスクリストを選択したタイミングで閉じてカルーセル表示にフォーカスを移す。
- `isWideLayout`: 画面幅 1024px 以上で左カラムを常時表示するかどうかを判定する。真の場合、Drawer は閉じたままオーバーレイを使用しない。
- 狭い幅で Drawer を開いている間は `router.beforePopState` で「戻る」操作をフックし、ページ遷移ではなく Drawer を閉じる。履歴にダミーエントリを積まないため、設定画面などへの遷移と競合しない。
- `selectedTaskListId`: 現在選択中のタスクリスト ID。マウント時に最初のリストを選択し、Drawer 内の選択やカルーセルスクロールに合わせて同期する。

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

## API インターフェース

### createTaskList(name: string, background?: string): Promise<string>

新しいタスクリストを作成します。

**パラメータ:**

- `name`: タスクリスト名（必須）
- `background`: 背景色（オプション、デフォルト: `"#ffffff"`）

**戻り値:**

- 作成されたタスクリスト ID

**動作:**

1. ローカルストアを楽観的に更新
2. Firestore に新規リストドキュメントを作成
3. `taskListOrder` に新規リストの順序情報を追加
4. `updatedAt` タイムスタンプを自動設定
5. ストアの変更をリスナーに通知

**例外:**

- Firebase Firestore のエラーをスロー
- ユーザーログイン状態を確認し、ログインしていない場合はエラーをスロー

### updateTaskListOrder(draggedTaskListId: string, targetTaskListId: string): Promise<void>

タスクリストの順序を更新します（ドラッグ&ドロップ時）。

**パラメータ:**

- `draggedTaskListId`: ドラッグされたタスクリスト ID
- `targetTaskListId`: ドロップ先のタスクリスト ID（この位置に移動）

**例:**

```typescript
await updateTaskListOrder("list-id-1", "list-id-3");
// list-id-1 が list-id-3 の位置に移動（list-id-3 より下へ移動する場合は直後に配置）
```

**動作:**

1. 現在の order を昇順で取得し、ドラッグ対象を配列から一度除外
2. 対象リストの位置にドラッグ対象を挿入し（上方向は直前、下方向は直後）、1 からの連番で再採番
3. Firestore の `taskListOrder` ドキュメントをまとめて更新し、`updatedAt` を設定
4. ストアの変更をリスナーに通知

**技術仕様：**

- **order フィールド:** 1.0 からの連番
- **更新範囲:** 並び替え後の全リストに対して order を再採番
- **更新方法:** Firestore の単一アップデートで一括反映

**例外:**

- Firebase Firestore のエラーをスロー
- 指定されたタスクリストが見つからない場合はエラーをスロー

## 翻訳キー

タスクリスト機能の UI テキストは i18next を使用して多言語対応されています。

**メッセージキー:**

```
app:
  title: タスクページのタイトル（"タスク" / "Tasks"）
  emptyState: タスクリストがない状態のメッセージ
  createNew: 新規作成ボタンのテキスト
  createTaskList: モーダルタイトル
  taskListName: リスト名入力フィールドのラベル
  taskListNamePlaceholder: 入力フィールドのプレースホルダー
  create: 作成ボタンのテキスト
  creating: 作成中の状態表示テキスト
  cancel: キャンセルボタンのテキスト
  error: エラーメッセージ（汎用）
  moveUp: 上へ移動ボタンのテキスト
  moveDown: 下へ移動ボタンのテキスト
  dragHint: ドラッグして並び替え
  openMenu: メニューを開く（ハンバーガーアイコンのツールチップ/スクリーンリーダー用）
  drawerTitle: ドロワーのタイトル表示
  drawerSignedIn: ログインメール表示用ラベル
  drawerNoEmail: メールが未設定の場合のラベル
taskList:
  taskCount: タスク件数の表示（{{count}} 形式）
  editDetails: 編集ダイアログのタイトルとボタン文言
  shareTitle: 共有ダイアログタイトル
  shareDescription: 共有ダイアログ本文
  selectColor: 色選択ラベル
```

詳細は `locales/ja.json` および `locales/en.json` を参照してください。

## デザイン仕様

### タスクリストカード

- **背景（外枠アクセント）:** 選択中のタスクリストに設定された `background` をカード外枠のアクセントとして反映
- **コンテンツ面:** 内側はライト/ダークで可読性が担保されるサーフェス（カード）として扱い、ヘッダー情報・操作ボタン・タスク一覧を同一カード内で構成する
- **カラー表示:** タスクリストの背景色を示すスウォッチと、色コード（`background`）を併記する
- **操作要素:** ボタン/入力は Tailwind のユーティリティクラスで最低限の見た目と focus-visible を付与し、キーボード操作とダークテーマでの視認性を担保する

## 順序管理

- タスクリスト・タスクともに並び替え後は 1.0 からの連番で order を再採番します。
- 並び替えは昇順に並べ替えた配列を再構成し、Firestore へまとめて反映します。
- 追加時も挿入位置を確定してから全体を再採番するため、挿入位置がずれません。

## パフォーマンス考慮事項

### 最適化

1. **グリッドレスポンシブ:** Tailwind CSS ブレークポイントで効率的に実装
2. **リスト表示:** React の `map` で効率的にレンダリング
3. **状態更新:** 必要な状態変更のみトリガー
4. **order 更新:** 浮動小数により、並び替え時の更新件数を最小化

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

メインコンテンツエリアは、統合ドロワーレイアウトの右側に表示される領域です。サイドバーで選択されたタスクリスト内のすべてのタスクを表示・管理します。タスクの作成、編集、削除、完了状態の切り替え、および並び替え機能を提供します。

### 後方互換性

**旧ページ:** `/tasklists/[id].tsx` → `/app` へリダイレクト

既存のブックマークやリンク（例：`/tasklists/list-id`）の互換性を保つため、自動的に `/app` にリダイレクトされます。ユーザーは統合されたドロワーレイアウトで同じタスク管理機能を利用できます。

### 主要機能

#### 1. タスク一覧表示

**仕様:**

- タスクリスト内のすべてのタスクをリスト形式で表示
- 各タスクアイテムは以下の情報を含む：
  - ドラッグハンドル（≡アイコン）：タスクの並び替えに使用
  - チェックボックス：完了状態の切り替え
  - タスク内容テキスト：クリックして編集モードに切り替え
  - 削除ボタン：タスクを削除
- 完了したタスクは取り消し線で表示される

**エラーハンドリング:**

- 認証されていないユーザーはリダイレクト処理により、`/` へ移動

#### 2. タスクの並び替え（ドラッグ&ドロップ）

**機能:**

各タスクアイテムの左側にあるドラッグハンドル（≡アイコン）をドラッグして、タスクの順序を変更できます。

**ユーザー操作:**

1. ドラッグハンドルをマウスで押下（ポインタ感度: 8px）
2. マウスを上下に移動してタスクの順序を変更
3. マウスボタンを放すと新しい順序が保存される

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
5. 1 からの連番で order を再採番
   ↓
6. `updateTasksOrder(taskListId, draggedTaskId, targetTaskId)` を呼び出し
   ↓
7. トランザクションで Firestore の `tasks[taskId].order` を一括更新
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

#### 3. タスクの作成

**フォーム:**

- タスク入力フィールド：テキスト入力、履歴補完対応
- 追加ボタン：タスクを追加

**操作:**

1. 入力フィールドにタスク内容を入力
2. `Enter` キーを押すか「追加」ボタンをクリック
3. タスクがリストの最後に追加される

**履歴補完:**

- 入力フィールドは HTML の `datalist` を使用した補完機能を提供
- 過去に作成されたタスクテキストが候補として表示される
- リアルタイムでマッチしたテキストを候補リストから選択可能

**エラーハンドリング:**

- 空の入力は無効化（ボタンが disabled 状態）

#### 4. タスクの編集

**操作:**

1. タスク内容テキストをクリック
2. 編集モードに切り替わり、入力フィールドが表示される
3. テキストを編集
4. `Enter` キーで保存、`Escape` キーでキャンセル

#### 5. タスクの削除

**操作:**

1. タスクアイテムの削除ボタンをクリック
2. タスクが即座に削除される

#### 6. タスクの完了状態切り替え

**操作:**

1. チェックボックスをクリック
2. タスクの完了状態が切り替わる
3. 完了したタスクは取り消し線で表示される

#### 7. タスクリスト情報の編集

**リスト名の編集:**

1. リスト名をクリック
2. 編集モードに切り替わる
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

**共有コードの仕様:**

- 英数大文字のみで8文字
- ユニーク性を確保するためにFirestoreで検証
- 複数回生成することで異なるコードを取得可能
- 共有を停止するとコードは無効化される
- `shareCodes` コレクションは誰でも読み取り可能で、タスクリストへのアクセス判定に使用する
- 共有コードの作成・削除は、`taskListOrder` に含まれる認証済みユーザーのみ許可する

### 状態管理

app/index.page.tsx では以下のように状態を一元管理しています。

```typescript
const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(
  null,
);
const [state, setState] = useState<AppState | null>(null);
const [error, setError] = useState<string | null>(null);
const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
const [editingTaskText, setEditingTaskText] = useState("");
const [newTaskText, setNewTaskText] = useState("");
const [showEditListModal, setShowEditListModal] = useState(false);
const [editListName, setEditListName] = useState("");
const [editingListName, setEditingListName] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [showShareModal, setShowShareModal] = useState(false);
const [shareCode, setShareCode] = useState<string | null>(null);
const [generatingShareCode, setGeneratingShareCode] = useState(false);
const [removingShareCode, setRemovingShareCode] = useState(false);
const [shareCopySuccess, setShareCopySuccess] = useState(false);
const [showCreateListForm, setShowCreateListForm] = useState(false);
const [createListInput, setCreateListInput] = useState("");
```

- `selectedTaskListId`: 表示対象のタスクリスト ID。初回ロード時に最初のリストを自動選択し、Embla の select イベントでカルーセルと Drawer 選択を片方向同期する。
- `state`: `appStore` から購読した `AppState`。ユーザー、設定、タスクリストを保持。
- `error`: 画面上部に表示するエラーメッセージ。
- `editingTaskId`/`editingTaskText`: インライン編集中のタスク識別と内容。
- `newTaskText`: タスク追加フォームの入力内容。
- `showEditListModal` ほかのフラグ: 色選択、削除確認、共有モーダルなどの開閉制御。
- `shareCode` とコピー関連のフラグ: 共有コードの生成・削除・コピー状態を保持。
- `showCreateListForm`/`createListInput`: タスクリスト作成フォームの表示と入力値。

### API インターフェース

#### addTask(taskListId: string, text: string, date?: string): Promise<string>

タスクを追加します。

**パラメータ:**

- `taskListId`: タスクリスト ID（必須）
- `text`: タスク内容（必須）
- `date`: タスクの日付（オプション）

**戻り値:**

- 作成されたタスク ID

**動作:**

1. 新しいタスク ID を生成
2. 既存タスクを order 昇順に並べ、挿入位置に新タスクを挿入
3. `autoSort` が有効な場合は未完了・日付・現在の order 優先で再ソートしつつ order を再採番、無効な場合は挿入位置に基づいて 1.0 から連番で再採番
4. トランザクション内で以下を実行：
   - Firestore にタスクを保存
   - order の一括更新
   - history フィールドを更新（重複排除、最大300件保持）
5. `updatedAt` タイムスタンプを設定

**history 管理:**

- タスク作成時にテキストが既に history に存在しない場合のみ追加
- 新しいテキストは history の先頭に挿入（新しい順）
- history の件数が300を超えた場合、最古のテキストを削除
- 重複なし：同じテキストは複数回登録されない

#### updateTask(taskListId: string, taskId: string, updates: Partial<Task>): Promise<void>

タスクを更新します。

**パラメータ:**

- `taskListId`: タスクリスト ID
- `taskId`: タスク ID
- `updates`: 更新する内容（テキスト、完了状態など）

**動作:**

- `autoSort` 無効時は指定フィールドのみ更新し、`updatedAt` を設定
- `autoSort` 有効時は対象タスクの存在を検証し、更新内容を反映した配列を未完了・日付・現在の order 優先で並べ替えて order を再採番した上でトランザクション更新
- ストアに対象タスクリストがない場合は Firestore から取得して同じ検証と更新を行う

#### deleteTask(taskListId: string, taskId: string): Promise<void>

タスクを削除します。

**パラメータ:**

- `taskListId`: タスクリスト ID
- `taskId`: タスク ID

**動作:**

- `autoSort` 無効時はタスクを削除し、`updatedAt` のみ更新
- `autoSort` 有効時は対象タスクの存在を検証し、削除後のタスクを未完了・日付・現在の order 優先で並び替えて再採番し、トランザクションでまとめて反映
- ストアに対象タスクリストがない場合は Firestore から取得して同じ検証と更新を行う

#### updateTasksOrder(taskListId: string, draggedTaskId: string, targetTaskId: string): Promise<void>

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
3. 対象タスクの位置に挿入し（上方向は直前、下方向は直後）、全タスクを 1.0 から連番で再採番
4. トランザクションを使用して Firestore の `tasks[taskId].order` を一括更新
5. `updatedAt` タイムスタンプを自動設定
6. ストアの変更をリスナーに通知

**技術仕様：**

- **order フィールド:** 1.0 からの連番
- **更新件数:** 並び替え後の全タスクに対して order を再採番
- **トランザクション処理:** 並行更新時の安全性を確保

### 翻訳キー

タスク詳細ページの UI テキストは i18next を使用して多言語対応されています。

**メッセージキー:**

```
taskList:
  taskCount: タスク数表示
  editColor: 色変更ボタンのテキスト
  addTask: 追加ボタンのテキスト
  addTaskPlaceholder: タスク入力フィールドのプレースホルダー
  selectColor: カラーピッカーのタイトル
  deleteList: リスト削除ボタンのテキスト
  deleteConfirm: 削除確認メッセージ
  dragHint: ドラッグハンドルのツールチップ
```

詳細は `locales/ja.json` および `locales/en.json` を参照してください。

### デザイン仕様

#### タスクアイテム

- **背景:** 個別の背景色は付けず、親セクションの色に従う
- **シャドウ:** 標準シャドウ（`shadow`）
- **コーナー:** 丸角（`rounded-lg`）
- **内部構造:**
  - ドラッグハンドル、チェックボックス、テキスト、削除ボタンが左から右へ配置
  - ドラッグハンドルは `cursor-grab`、ドラッグ中は `cursor-grabbing`
- **ホバー効果:**
  - シャドウ増加（`shadow-md`）
  - スムーズなトランジション（`transition-shadow`）
- **ドラッグ中:**
  - 半透明表示（`opacity-50`）

#### ドラッグハンドル

- **アイコン:** ≡ アイコン（6ドット）
- **色:** グレー（`text-gray-400`）
- **ホバー色:** より濃いグレー（`hover:text-gray-600`）
- **カーソル:** `cursor-grab` / `cursor-grabbing`

#### チェックボックス

- **スタイル:** 標準 HTML チェックボックス
- **サイズ:** `w-5 h-5`
- **色:** インディゴ（フォーカス時）

#### タスクテキスト

- **完了時:** 取り消し線（`line-through`）、グレー色（`text-gray-400`）
- **未完了:** 通常の色（`text-gray-800`）
- **ホバー:** 薄いグレー背景（`hover:bg-gray-100`）

#### 削除ボタン

- **背景:** 薄い赤（`bg-red-50`）
- **テキスト色:** 赤（`text-red-600`）
- **ホバー:** より濃い背景（`hover:bg-red-100`）

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
    dragHint: ドラッグハンドルのツールチップ
    noTasks: 空状態テキスト
```

詳細は `locales/ja.json` および `locales/en.json` を参照してください。

## 共有ページ

**ページ:** `src/pages/sharecodes/[sharecode].page.tsx`

### 概要

shareCodeを使用して、認証なしでタスクリストを閲覧・編集できるページです。オーナーと同じUIでタスクの操作が可能であり、自分のリストに追加することもできます。

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

- タスク追加：新規タスク入力と「追加」ボタン
- タスク編集：テキストをクリックして編集モード
- タスク削除：削除ボタンをクリック
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
const [storeState, setStoreState] = useState<AppState>(() =>
  appStore.getState(),
);
const [sharedTaskListId, setSharedTaskListId] = useState<string | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [user, setUser] = useState<typeof auth.currentUser>(null);
const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
// ... その他のタスク編集状態
const [optimisticTaskOrder, setOptimisticTaskOrder] = useState<{
  ids: string[];
  startedAt: number;
} | null>(null);
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
    deleteError: タスクを削除できませんでした
    reorderError: タスクの順序を変更できませんでした
    addToOrderError: このタスクリストを追加できませんでした
    addToOrder: 自分のリストに追加
```

詳細は `locales/ja.json` および `locales/en.json` を参照してください。

### セキュリティ考慮事項

**現在の仕様:**

- 認証なしでタスクの閲覧・編集が可能
- shareCodeの推測は困難（8文字のランダム英数大文字）
- ただし、shareCodeが漏洩すると誰でもアクセス可能

**将来の改善:**

- Firestore セキュリティルールで shareCode の検証
- 一定時間でコードの自動失効機能
- アクセスログの記録機能

## Firestoreセキュリティルール

タスクリスト機能はFirestoreセキュリティルールによって保護されています。以下のルールが適用されます。

### 読み取り権限（Read）

認証済みユーザーが以下のいずれかを満たす場合にタスクリストを読み取り可能です：

1. **自分のtaskListOrderに登録されている場合**
   - ユーザーが作成したタスクリスト、または他者から共有されたタスクリストを自分のリストに追加した場合
   - ユーザーのtaskListOrderドキュメント内にtaskListIdが含まれている

2. **shareCodeが設定されている場合**
   - 認証済みユーザーは、shareCodeが設定されているタスクリストを読み取り可能
   - 共有コードを知っている他のユーザーによる閲覧を許可

### 書き込み権限（Update）

タスクリストの更新は、自分のtaskListOrderに登録されている場合のみ可能です：

- 不変フィールド（`id`、`createdAt`）の変更は防止
- shareCodeの変更は許可（共有機能のため）
- 共有されたタスクリストも、自分のtaskListOrderに追加済みなら編集可能

### 作成権限（Create）

認証済みユーザーであれば誰でもタスクリストを作成できます：

- 必須フィールド（`id`、`name`、`tasks`、`history`、`shareCode`、`background`、`createdAt`、`updatedAt`）の存在確認
- idがドキュメントのパスパラメータと一致することを確認
- createdAtとupdatedAtが整数型（ミリ秒タイムスタンプ）であることを確認

### 削除権限（Delete）

タスクリストの削除は、自分のtaskListOrderに登録されている場合のみ可能です：

- deleteBatchでtaskListOrderからも同時に削除される前提

### パフォーマンス考慮事項

- 各操作時にtaskListOrderドキュメントをget()関数で参照（1回の追加読み取り）
- ユーザーごとにtaskListOrderは1ドキュメントのみのため、コスト増は最小限

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
