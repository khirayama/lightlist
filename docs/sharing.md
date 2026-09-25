# 共有

タスクリストを共有コード経由で他ユーザーへ開く仕組み。データ構造は [data-model.md](./data-model.md) を参照。

## 共有コード

- 8 文字の英大文字・数字を暗号学的乱数で生成する。Web は `crypto.getRandomValues`、iOS は `SecRandomCopyBytes`、Android は `SecureRandom`。
- `generateShareCode()`: 既存コードがあれば削除してから新しいコードへ置き換える。生成試行は最大 10 回。
- `removeShareCode()`: `taskLists.shareCode` を `null` に戻し、対応する `shareCodes` ドキュメントを削除する。
- 生成・削除は transaction ではなく、サーバーから現在のリストを取得した後の batch write で `shareCodes` と `taskLists.shareCode` を更新する。既存 `shareCode` の doc は正規化（trim + uppercase）した ID で同 batch 削除する。Rules も更新・解除・リスト実体削除時に旧コード文書の削除を要求する。同時操作で前提が変わった書き込みは失敗し、画面のエラーを確認して再実行する。
- リスト実体削除（アカウント削除を含む）でも、残った `shareCode` に対応する `shareCodes` doc を残さない。
- 共有コードの解決ではコード文書と対象リストをサーバーから取得し、リストの現在のコードとの一致を確認する。Rules もリストから参照されない既存コード文書の取得を拒否する。古いコード文書が残っていても共有先を解決できず、共有コードを新たに開くには接続が必要になる。
- 外部入力、deep link、既存の `taskLists.shareCode` から Firestore document path を作る前に、trim + uppercase 後の完全一致 `^[A-Z0-9]{8}$` を必ず検証する。不正な値は未検出として扱い、不正な document path を作らない。
- 共有ダイアログのコピー操作は、コード文字列ではなく共有 URL（Web は `${origin}/sharecodes/?code=CODE`、native は `https://lightlist.app/sharecodes/?code=CODE`）をクリップボードへ入れる。コード自体は読み取り専用の等幅フィールドに表示する。
- 1 リストにつき有効な `shareCodes` doc は最大 1 件。`shareCodes/{code}` の作成は、同一 commit で `taskLists/{taskListId}.shareCode == code` になることを rules が要求する。`taskLists` から辿れない共有コードは発行できないため、共有解除で必ず全コードが失効する。
- `taskLists.shareCode` へ書けるのは `null` か `^[A-Z0-9]{8}$` のみ。新しいコードを設定する場合は同一 commit で対応する `shareCodes` doc を作る必要がある。

## リストへの参加

- `addSharedTaskListToOrder()`: 事前 read 後の batch write で次を行う。
  - 自分の `taskListOrder` に末尾追加する。
  - `taskLists/{taskListId}/members/{uid}` に共有コード加入の証明を作る。
  - `memberCount` を `+1` する。
  - `taskListOrder/{uid}` が欠損していても merge 書き込みで自動作成する。
  - 既に追加済みなら no-op とし、`memberCount` を重複加算しない。

## 共有権限モデル

- 共有 URL を知っているユーザーは、未認証でも共有リストをプレビュー閲覧できる。
- 共有コードはプレビュー取得用の bearer credential として扱う。対象リストの `name` / `tasks` / `history` / `background` の更新には membership document が必要で、未参加のコード保持者による編集は Rules で拒否する。
- ただし共有コードの発行・再生成・失効は `shareCodes` への書き込みを伴うため、認証済みかつ membership document を持つユーザーだけが行える。コード保持者が任意のコードを勝手に張り替えることはできない。
- 自分の一覧へ追加する操作だけは認証が必要。
- `taskListOrder/{uid}` は表示順専用であり、認証済みユーザーが任意の `taskListId` を追加しても権限は付与されない。加入時は、正しい共有コードを含む membership document を同一 batch で作成する。

## 画面導線

- 共有コードプレビューは未認証でも開く。未参加ユーザーの native / Web preview は task の追加・完了・編集・並び替えを含む編集 UI を表示せず、読み取り専用で扱う。編集と共有コード管理、タスクリスト削除の導線は membership document を持つユーザーにだけ表示する。ログイン済みかつ未参加のときだけ加入導線を表示する。
- Web / HTTPS: `https://lightlist.app/sharecodes/?code=CODE`
- iOS: `lightlist://sharecodes/CODE`、HTTPS 正規形
- Android: `lightlist://sharecodes/CODE`、HTTPS 正規形
