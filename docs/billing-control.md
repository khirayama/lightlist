# Lightlistの費用監視と課金停止

## 監視対象

予算名は `Lightlist dev + prod monthly JPY 100`、予算IDは `80977236-bfe3-482a-8e44-17e4b5374896`、通貨は JPY、月額は100円。対象は `lightlist-dev` と `lightlist-prod-b0269` の全サービスの合計で、他プロジェクトを含めない。請求先は `006AFA-A3102C-9CBA02`。割引・クレジットを差し引いた実績費用を監視する。

予算の実績通知を本番プロジェクトの Pub/Sub topic `lightlist-budget-stop` に配信し、本番に配置した `stopLightlistBilling` が処理する。予測額では停止しない。現在の月の通知で、予算名・通貨・100円の予算額が一致し、実績額が100円以上の場合だけ停止対象とする。

## 停止動作と制約

停止対象の通知を受けると、開発プロジェクトの課金を先に無効化し、本番を最後に無効化する。停止前に請求先を照合し、異なる請求先に変更されたプロジェクトは処理を失敗させる。既に無効なプロジェクトはスキップする。開発停止に失敗した場合は本番の停止へ進まず、Pub/Subイベントを再試行する。本番の停止で実行元自身も停止するため、その後の自動処理・再試行は保証されない。

予算通知には数時間以上の遅延があり、未集計分を含めて100円を超える請求は防ぎきれない。停止処理自体の運用費も本番プロジェクトの費用に含まれる。停止処理・通知配信の障害や権限の変更によって停止できない場合がある。厳密な課金上限ではない。

課金無効化はサービス単位の一時停止とは異なる。無料枠を含むGoogle Cloudサービスが停止し、リソースが削除されて復旧できない可能性がある。Firebaseの通知・データ同期などの継続利用を前提にしない。Googleの[課金無効化手順](https://docs.cloud.google.com/billing/docs/how-to/disable-billing-with-notifications)の制約に従う。

## 必須設定

- 実行用service accountは `lightlist-budget-stop@lightlist-prod-b0269.iam.gserviceaccount.com`。秘密鍵ファイルは作成しない。
- 各対象プロジェクトにカスタムroleを作り、`resourcemanager.projects.get` と `resourcemanager.projects.deleteBillingAssignment` だけを実行用service accountに付与する。請求先account全体の管理権限は付与しない。
- 本番の実行用service accountには `roles/logging.logWriter` をプロジェクトに、`roles/run.invoker` を `stoplightlistbilling` の Cloud Run service だけに付与する。trigger も同じ service account で Function を呼ぶため、invoker がないと予算通知が 403 で届かない（Firebase CLI は付与しない）。Pub/Sub topic `lightlist-budget-stop` の `roles/pubsub.publisher` は予算通知サービス（`billing-budget-alert@system.gserviceaccount.com`）だけに付与し、一般ユーザーには公開しない。
- 本番でCloud Billing API・Cloud Billing Budget APIとFunctions・Eventarc・Pub/Subの実行に必要なAPIを有効にする。
- 予算には両プロジェクトのfilterとPub/Sub topic（`notificationsRule.pubsubTopic` = `projects/lightlist-prod-b0269/topics/lightlist-budget-stop`、schema `1.0`）を設定する。予算名だけで範囲を保証できないため、filterも確認する。

## 配信と再開

停止処理は通常の通知Functionsとは独立したcodebaseに配置する。リポジトリルートで `npm --prefix firebase/functions-billing ci` の後、`just deploy-billing` を実行する（`retry: true` の非対話配信に必要な `--force` を付ける。この codebase 以外の Function は削除されない）。開発プロジェクトには配信しない。配信後は、請求先 ID が一致しない属性のメッセージを topic へ publish し、Cloud Run のログが 2xx になることで停止させずに経路を確認できる。

月替わりの自動再開は行わない。再開には両プロジェクトの請求先を手動で再接続し、サービスとデータの状態を確認する。同じ月に再開すると、100円以上の実績通知によって再び停止する。再開前に予算と停止処理の条件を変更する。
