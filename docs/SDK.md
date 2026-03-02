# Lightlist SDK Documentation

`@lightlist/sdk` は、Lightlist アプリケーション（Web および Native）の共通ロジック、状態管理、およびデータアクセス層を提供するパッケージです。

## 概要

この SDK は以下の責務を担います：

- **Firebase の隠蔽**: アプリケーション層から Firebase/Firestore の直接的な依存を排除（または最小化）し、抽象化された API を提供します。
- **状態管理 (State Management)**: アプリケーション全体のデータ（ユーザー、設定、タスクリスト）を一元管理し、リアルタイムで同期します。
- **データ整合性**: タスクの追加、更新、並び替えなどのデータ操作におけるビジネスロジックと整合性を保証します。
- **型定義**: アプリケーション全体で使用される共通の TypeScript 型定義を提供します。

## 依存関係ポリシー

- `react` は `peerDependencies` で要求し、利用側アプリ（`apps/web` / `apps/native`）が提供する。
- SDK 内の型チェック・ローカル開発のために `devDependencies` に `react` を持つ。
- `react-dom` は SDK 実装で使用していないため、SDK の `dependencies` / `peerDependencies` には含めない。
- `@lightlist/sdk/firebase` の `exports` はプラットフォーム別に解決し、Web は `src/firebase/index.ts`、React Native は `src/firebase/index.native.ts` を使う。

## アーキテクチャ

### ストア (Store)

`src/store.ts` で実装されている `appStore` は、アプリケーションの単一の真実のソース（Single Source of Truth）です。

#### 設計思想

- **シングルトン**: アプリケーション全体で共有される単一のインスタンス。
- **サブスクリプションベース**: リスナーパターンを採用し、データの変更をコンポーネントに通知します。
- **データの正規化**: Firestore から取得した生データ（`DataStore`）を、アプリケーションで扱いやすい形式（`AppState`）に変換（`transform`）して提供します。
- **最適化された購読**: 必要なデータのみを Firestore から購読し、読み取りコストとネットワーク通信を最適化します。

#### 内部構造

1.  **DataStore (Internal State)**
    - Firestore のドキュメント構造に近い形式でデータを保持します。
    - `settings`, `taskListOrder`, `taskLists` に加え、`authStatus`, `settingsStatus`, `taskListOrderStatus`, `startupError` を含みます。

2.  **AppState (Public State)**
    - アプリケーションが利用する形式に整形されたデータです。
    - `taskLists` は `taskListOrder` に基づいてソート済みで提供されます。
    - `sharedTaskListsById` は、自分のオーダーに含まれない共有リストを分離して保持します。
    - 初期化中とエラーを判定するため、認証・購読のステータスを公開します。

#### Firestore 購読戦略（詳細仕様）

`appStore` は Firestore の `onSnapshot` を使用してリアルタイム同期を行いますが、以下の高度な最適化が施されています。

1.  **動的なタスクリスト購読**:
    - ユーザーの `taskListOrder` ドキュメントを監視し、そこに登録されている `taskListId` のリストを取得します。
    - オーダーが変更されると、自動的に必要なタスクリストの購読を追加・削除します。

2.  **チャンク分割読み込み**:
    - Firestore の `in` クエリには「最大10個まで」等の制約（またはパフォーマンス上の推奨）があるため、タスクリストIDのリストを10個ずつのチャンクに分割します。
    - 各チャンクごとにクエリを発行し、`snapshot.docChanges()` で差分適用します。これにより、大量のタスクリストを持つユーザーでも不要な再マージを抑えます。

3.  **共有リストの独立購読**:
    - 自分のリストに含まれない（共有コード経由でアクセスした）リストは、`subscribeToSharedTaskList` メソッドを通じて個別に購読されます。これにより、メインのリスト同期ロジックとは独立して管理されます。

4.  **変更検知と通知**:
    - `commit` は `user` / `authStatus` / `settingsStatus` / `taskListOrderStatus` / `taskListOrderUpdatedAt` / `startupError` / `settings` / `taskLists` / `sharedTaskListsById` を段階的に比較し、変更がない場合のみ通知をスキップします。
    - `transform` は `taskListOrder`・`settings`・各 `taskList` の変換結果をキャッシュし、同一入力参照に対して再計算せず参照を再利用します。
    - `settings` / `taskListOrder` の `onSnapshot` エラー時は対応する status を `error` に更新し、`startupError` に原因を保存します。

### ミューテーション (Mutations)

データの更新は `src/mutations/` 配下の関数を通じて行います。これらは Firestore への書き込み操作をカプセル化しています。

- **`mutations/auth.ts`**: 認証、サインアップ時の初期データ作成、アカウント削除など。
- **`mutations/app.ts`**: タスクおよびタスクリストの CRUD、並び替え、共有機能など。

#### 主要なロジック

- **楽観的更新**: ストア自体はサーバーデータを正としますが、各ミューテーション関数内では、書き込み完了を待たずにUIへの反映（または完了後の速やかな反映）を意識した設計となっています。
- **トランザクション非使用の方針**: `mutations/app.ts` のタスク操作（追加・更新・削除・並び替え）では、Firestore トランザクション（`runTransaction`）を意図的に使用しない。理由は `onSnapshot` の挙動保護のため。トランザクション内で Firestore ドキュメントを読み取ると、完了前に `onSnapshot` がキャンセル・リセットされ、UI の一時的なちらつきやデータ欠落が発生する。これを避けるため、直接の `updateDoc` / `writeBatch` による書き込みを採用している。今後もこの設計を変更しないこと（トランザクション導入は禁止）。
- **並び替えフックの契約**: `useOptimisticReorder` の戻り値は `items` / `reorder` の 2 つで、呼び出し側からローカル配列を直接差し替える API は持たせない。
- **並び替え同期の最適化**: `useOptimisticReorder` は通常時に `initialItems` を直接参照し、並び替え中のみローカルの optimistic state を保持することで、非並び替え更新時の不要な再レンダーを抑制します。
- **ドラッグ中同期の抑制**: `useOptimisticReorder` は `suspendExternalSync` オプションで外部同期の取り込みを一時停止でき、Native のタスクドラッグ中に snapshot が差し替わるケースの表示競合を防ぎます。
- **タスク並び替え書き込みの最小化**: `updateTasksOrder` は通常ドラッグ対象 1 件の `order` のみを書き込み、前後ギャップが不足する場合だけ全体を再採番します。
- **自動ソート (Auto Sort)**: `settings.autoSort` が有効な場合、タスクの更新時に「未完了 > 日付 > オーダー」の優先順位で自動的に並び替えが行われます。
- **オーダー管理**: タスクおよびリストの並び順は `order` (number) フィールドで管理され、浮動小数点数を利用して挿入時の再採番コストを低減、または必要に応じてリバランス（連番の再割り当て）を行います。
- **保持者管理 (`memberCount`)**: `TaskListStore.memberCount` でタスクリスト保持ユーザー数を管理します。`addSharedTaskListToOrder` は transaction で `memberCount` を +1、`deleteTaskList` は `taskListOrder` から離脱させて `memberCount` を -1 し、0 になった場合のみ `taskLists` 実体と `shareCodes` を削除します。
- **共有権限ポリシー**: 共有URLを知っているユーザーは、認証の有無にかかわらず共有リストを閲覧・編集できます（現行仕様）。
- **Production Readiness 方針（item1）**: 認可モデル再設計（`taskListOrder` 依存の権限モデルの見直し）は、2026-03 時点では対応不要と判断し、現行仕様を維持します。

## モジュール構成

```
packages/sdk/src/
├── auth.ts                  # Firebase Auth インスタンスのエクスポート
├── firebase/                # Firebase 初期化ロジック
│   ├── index.ts             # Web 用
│   └── index.native.ts      # React Native 用
├── hooks/                   # React Hooks
│   └── useOptimisticReorder.ts # 並び替えの楽観的更新用フック
├── mutations/               # データ更新関数群
│   ├── app.ts               # アプリケーションロジック（タスク等）
│   └── auth.ts              # 認証ロジック
├── store.ts                 # 状態管理 (appStore)
├── types.ts                 # 共通型定義
└── utils/                   # ユーティリティ
    └── dateParser.ts        # 自然言語日付解析
```

## 型定義 (Type Definitions)

主要な型定義 (`src/types.ts`) の概要です。

### AppState

アプリケーションが利用する状態オブジェクト。

```typescript
export type AppState = {
  user: User | null;           // ログイン中のユーザー
  authStatus: AuthStatus;      // 認証初期化状態
  settings: Settings | null;   // ユーザー設定（テーマ、言語など）
  settingsStatus: DataLoadStatus; // settings購読状態
  taskLists: TaskList[];       // ユーザーのオーダー順にソートされたタスクリスト
  taskListOrderStatus: DataLoadStatus; // taskListOrder購読状態
  taskListOrderUpdatedAt: number | null; // オーダー更新タイムスタンプ
  sharedTaskListsById: Record<string, TaskList>; // 閲覧中の共有リスト
  startupError: string | null; // 初期化失敗時の識別子
};
```

### TaskList

タスクリストのデータモデル。

```typescript
export type TaskList = {
  id: string;
  name: string;
  tasks: Task[];       // オーダー順にソートされたタスク
  history: string[];   // 入力履歴（最大300件）
  shareCode: string | null;
  background: string | null;
  memberCount: number; // このリストを保持しているユーザー数
  createdAt: number;
  updatedAt: number;
};
```
