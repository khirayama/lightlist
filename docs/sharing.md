# 共有

タスクリストを共有コード経由で他ユーザーへ開く仕組み。データ構造は [data-model.md](./data-model.md) を参照。

## 共有コード

- 8 文字の英大文字・数字を暗号学的乱数で生成する。Web は `crypto.getRandomValues`、iOS は `SecRandomCopyBytes`、Android は `SecureRandom`。
- `generateShareCode()`: 既存コードがあれば削除してから新しいコードへ置き換える。生成試行は最大 10 回。
- `removeShareCode()`: `taskLists.shareCode` を `null` に戻し、対応する `shareCodes` ドキュメントを削除する。
- 生成・削除は transaction ではなく、事前 read 後の batch write で `shareCodes` と `taskLists.shareCode` を更新する。既存 `shareCode` の doc は正規化（trim + uppercase）した ID で同 batch 削除する。
- リスト実体削除（アカウント削除を含む）でも、残った `shareCode` に対応する `shareCodes` doc を残さない。
- `fetchTaskListIdByShareCode()`: 共有コードから `taskListId` を解決する。

## リストへの参加

- `addSharedTaskListToOrder()`: 事前 read 後の batch write で次を行う。
  - 自分の `taskListOrder` に末尾追加する。
  - `memberCount` を `+1` する。
  - `taskListOrder/{uid}` が欠損していても merge 書き込みで自動作成する。
  - 既に追加済みなら no-op とし、`memberCount` を重複加算しない。

## 共有権限モデル

固定仕様。認可モデルの再設計は現時点で対応しない。

- 共有 URL を知っているユーザーは、未認証でも共有リストを閲覧・編集できる。
- 共有コードは bearer credential として扱う。コードを知る利用者は認証状態に関わらず、対象リストの `name` / `tasks` / `history` / `background` / `shareCode` を更新できる。これは `shareCode` フィールド自体の書き換えも含む（コード保持者がコードを再生成・削除する操作に相当）。
- 自分の一覧へ追加する操作だけは認証が必要。
- 認証済みユーザーが `taskListOrder/{uid}` へ `taskListId` を追加することが、保持リストとしての権限付与の正本になる。

## 画面導線

- 共有コードプレビューは未認証でも開く。ログイン済みかつ未参加のときだけ `taskListOrder` へ追加する導線を表示する。
- Web: `/sharecodes/?code=CODE`
- iOS: `lightlist://sharecodes/CODE`、`https://lightlist.com/sharecodes/CODE`
- Android: `lightlist://sharecodes/CODE`、`https://lightlist.com/sharecodes/CODE`
