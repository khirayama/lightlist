# LightList SDK Documentation

`@lightlist/sdk` は、LightList アプリケーション（Web および Native）の共通ロジック、状態管理、およびデータアクセス層を提供するパッケージです。

## 概要

この SDK は以下の責務を担います：

- **Firebase の隠蔽**: アプリケーション層から Firebase/Firestore の直接的な依存を排除（または最小化）し、抽象化された API を提供します。
- **状態管理 (State Management)**: アプリケーション全体のデータ（ユーザー、設定、タスクリスト）を一元管理し、リアルタイムで同期します。
- **データ整合性**: タスクの追加、更新、並び替えなどのデータ操作におけるビジネスロジックと整合性を保証します。
- **型定義**: アプリケーション全体で使用される共通の TypeScript 型定義を提供します。

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
    - `settings`, `taskListOrder`, `taskLists` などを含みます。

2.  **AppState (Public State)**
    - アプリケーションが利用する形式に整形されたデータです。
    - `taskLists` は `taskListOrder` に基づいてソート済みで提供されます。
    - `sharedTaskListsById` は、自分のオーダーに含まれない共有リストを分離して保持します。

#### Firestore 購読戦略（詳細仕様）

`appStore` は Firestore の `onSnapshot` を使用してリアルタイム同期を行いますが、以下の高度な最適化が施されています。

1.  **動的なタスクリスト購読**:
    - ユーザーの `taskListOrder` ドキュメントを監視し、そこに登録されている `taskListId` のリストを取得します。
    - オーダーが変更されると、自動的に必要なタスクリストの購読を追加・削除します。

2.  **チャンク分割読み込み**:
    - Firestore の `in` クエリには「最大10個まで」等の制約（またはパフォーマンス上の推奨）があるため、タスクリストIDのリストを10個ずつのチャンクに分割します。
    - 各チャンクごとにクエリを発行し、結果をマージします。これにより、大量のタスクリストを持つユーザーでも正常に動作します。

3.  **共有リストの独立購読**:
    - 自分のリストに含まれない（共有コード経由でアクセスした）リストは、`subscribeToSharedTaskList` メソッドを通じて個別に購読されます。これにより、メインのリスト同期ロジックとは独立して管理されます。

4.  **変更検知と通知**:
    - `fast-deep-equal` を使用して、変換後の `AppState` が前回と実質的に異なる場合のみリスナーに通知を行い、React コンポーネントの不要な再レンダリングを防ぎます。
    - 変換後に `settings` / `taskLists` / `sharedTaskListsById` が前回と等価な場合は参照を再利用し、`useSyncExternalStore` の selector 購読で無関係な再レンダーを抑制します。

### ミューテーション (Mutations)

データの更新は `src/mutations/` 配下の関数を通じて行います。これらは Firestore への書き込み操作をカプセル化しています。

- **`mutations/auth.ts`**: 認証、サインアップ時の初期データ作成、アカウント削除など。
- **`mutations/app.ts`**: タスクおよびタスクリストの CRUD、並び替え、共有機能など。

#### 主要なロジック

- **楽観的更新**: ストア自体はサーバーデータを正としますが、各ミューテーション関数内では、書き込み完了を待たずにUIへの反映（または完了後の速やかな反映）を意識した設計となっています。
- **自動ソート (Auto Sort)**: `settings.autoSort` が有効な場合、タスクの更新時に「未完了 > 日付 > オーダー」の優先順位で自動的に並び替えが行われます。
- **オーダー管理**: タスクおよびリストの並び順は `order` (number) フィールドで管理され、浮動小数点数を利用して挿入時の再採番コストを低減、または必要に応じてリバランス（連番の再割り当て）を行います。

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
  settings: Settings | null;   // ユーザー設定（テーマ、言語など）
  taskLists: TaskList[];       // ユーザーのオーダー順にソートされたタスクリスト
  taskListOrderUpdatedAt: number | null; // オーダー更新タイムスタンプ
  sharedTaskListsById: Record<string, TaskList>; // 閲覧中の共有リスト
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
  createdAt: number;
  updatedAt: number;
};
```
