# CLAUDE.md

## 必須ルール

- `AGENTS.md` を運用ルールの正本とし、このファイルは要点だけを記載する。プラットフォーム固有の規則は `apps/{web,ios,android}/AGENTS.md`（各 `CLAUDE.md` から import）に置き、app を変更する前に読む。
- 回答・説明・コミットメッセージは日本語で記述する。
- 小さな変更を段階的に進め、各段階で実装事実を確認する。
- `context7` と `serena` を必ず活用し、推測で判断しない。
- コメント追加・テスト追加・後方互換性対応は原則不要とする。
- 実装完了時は `docs/` を仕様として更新する。`docs/` にはドメイン仕様・必須設定・運用制約だけを書き、内部コンポーネント一覧や import 構成を重複管理しない。
- 作業で得た再利用可能な恒久知識は `AGENTS.md` に反映し、`CLAUDE.md` は必要な要点だけ追従させる。進捗やタスク固有のメモは残さない。

## リポジトリ構成

- モノレポは `apps/web`（Vite multi-page app + React + TypeScript）、`apps/ios`（SwiftUI、iOS 17+）、`apps/android`（Kotlin + Gradle）で構成する。
- ルートに Node manifest は置かず、Web の manifest と lockfile は `apps/web` に集約する。Web は TypeScript 7 系を `strict` + `skipLibCheck=false` で使う。npm の標準 peer dependency 検証を有効にし、`legacy-peer-deps` / `--force` で回避しない。
- Web の Vite root / HTML entry は `apps/web/html`、静的 asset は `apps/web/public`、環境変数は `apps/web/.env*` とする。runtime TS/TSX は `apps/web/src/entry.tsx` に集約し、LP だけ `apps/web/src/lp.ts` を使う。
- Web の app page（`login` / `app` / `sharecodes` / `password_reset` / `404` / `500`）は `entry.tsx` を共通 bootstrap とし、各 HTML の `body[data-page]` で切り替える。LP は React / Firebase / i18next から分離し、build 時に言語別の静的ページ（`/`=ja、`/en/` など）へ書き出す。
- Web UI から `firebase/*` を直接 import せず、Firebase 初期化・Auth / Firestore 状態購読・i18n 初期化は `entry.tsx` を正とする。独立 SDK パッケージは持たない。Auth は popup / redirect resolver を含まない `initializeAuth` で初期化する。
- Web の Firestore 読み取りは購読・単発取得ともに共通境界検証へ通し、型 assertion だけでドメイン型へ変換しない。
- `taskListOrder` は有効な `order` map だけを採用し、余分なスカラー field で一覧全体をエラーにしない。ドット記法を set + merge で保存した残存 field は表示順として扱わない。
- iOS は `project.yml` から XcodeGen でプロジェクトを生成する。生成された `Lightlist.xcodeproj` と `xcuserdata` / `xcuserstate` / `build` / `DerivedData` は commit しない（SwiftPM 固定用の `Package.resolved` だけは例外として commit する）。

## Firebase・配信

- Firebase App Check は使用しない。Web / iOS / Android のクライアントで provider を初期化せず、Firebase Console の enforcement も有効化しない。
- Rules が要求する書き込み形をクライアントへ入れる変更は、本番 Rules のデプロイ（必要なら Admin backfill 先行）をアプリ配布より先に行い、本番 ruleset がリポジトリと一致することを確認する。サインアップ初期データは冪等な `ensureInitialUserData` で作成し、settings の不在をサーバー確定 snapshot で検知したら自己修復する。
- Firebase のデプロイ設定（`firestore.rules`、`firebase.json`、`.firebaserc`、`firestore.indexes.json`）はリポジトリルートに置く。
- Web の本番配信は Cloudflare Pages とする。Root directory は `apps/web`、output directory は `dist`、Node.js は `apps/web/.node-version` の `24.19.0`、package manager は `apps/web/package.json` の `npm@12.0.2` に固定する。
- npm 12 の依存 install script は `apps/web/package.json` の完全バージョン付き `allowScripts` で明示承認し、依存更新時は `npm approve-scripts --allow-scripts-pending` で未承認がないことを確認する。
- 本番ドメインは `https://lightlist.app/`。native の共有 URL・パスワードリセット URL・Universal Links / App Links もこのドメインに揃え、`lightlist.com` は使わない。
- Cloudflare Pages の build では `LIGHTLIST_IOS_TEAM_ID` と `LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT` を使って AASA / Digital Asset Links を `dist/.well-known/` に生成する。`cf:preview` / `cf:deploy` は両環境変数を必須とし、Git integration は両方を設定するまで `npm run build`、設定後は `npm ci && npm run cf:build` を build command にする。
- Web の production response headers はアプリ内でなく配信基盤側で管理する。PII（特にメールアドレス）を `console.error` や Analytics parameter に含めない。

## 共通仕様

- locale の正本は `shared/locales/locales.json`。Web は sync script で言語別の `src/locales/<lang>.json` と LP 用 `src/lp-locales.json` を生成し（UI 翻訳は `ja` だけ静的同梱、他言語は dynamic import）、英語相対日付の解析用 `src/english-date-patterns.json` も生成して静的同梱する。iOS は `apps/ios/Lightlist/Resources/locales.json` を手動同期、Android は build 時に asset 化する。対応言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`、fallback は `ja`。
- UI は 3 プラットフォーム共通のモノクロ palette と system/light/dark theme を使う。アクセント色を追加せず、iOS は `AccentColor.colorset` と `AppPalette`（named color + `dynamicColor`）、Android は明示的な Material palette、Web は通常 CSS を正とする。各プラットフォームの標準部品と標準の操作（戻る・並び替え・長押しメニュー・シートのドラッグ）を優先し、配色・角丸・書体・余白だけをアプリのスタイルへ寄せる。自前で描くのは月カレンダーなど標準では見た目・仕様を保てない部品に限る。iOS は標準ナビゲーションバー・`List`（タスクリスト一覧）・`Form` を使い（タスク一覧だけは行頭ハンドルと横ページャーのため自前の並び替え）、ボタン / 入力欄 / ダイアログ / 月カレンダーは `ContentView.swift` の共通部品（`AppButtonStyle` / `.appField()` / `AppDialog` / `MonthCalendarView`）で組む。Android は Material 3 の標準部品を包んだ `ContentView.kt` の共通部品（`AppButton` / `AppIconButton` / `AppTextField` / `AppDialog` / `AppSheet` / `AppSwitch`）と `AppMonthCalendar` で組み、Material の `DatePicker` は使わない。行の横スワイプ操作はタスクリスト詳細の横ページャーと競合するため導入せず、長押しメニューと 1 件削除の専用操作も持たない。並び替えハンドルは 3 プラットフォームとも常時表示し、タスク行は行頭、タスクリスト行は行末に置く。タスクリスト一覧は Web のサイドバーパネル、tablet の右ペインは Web のワイド表示（page title・最大幅・2 カラムのカレンダー）に揃える。詳細な色・寸法・motion は `AGENTS.md` を参照する。
- 空状態・全完了・初回読み込みは3プラットフォームで区別する。空状態はアイコン + 見出し + 次の操作への案内、全完了は完了済み行の末尾にチェック + 見出し + ねぎらい文言。0件を全完了として扱わず、空リストでは並び替え・完了済み削除の操作列を隠す。編集不可のプレビューでは入力への案内を表示しない。読み込み中は骨組み + ローカライズ済みの読み込み文言とし、未取得を空状態として表示しない。カレンダーへ外部のリストを渡す場合も loading / error 状態を一緒に渡す。Web の skeleton pulse は Reduce Motion 時に停止する。
- 設定画面のセクション順は「アカウント → 表示と動作 → 法的情報 → アカウント操作」。カレンダーは日グリッドとタスク一覧を同じ横幅で直置きし、月カレンダーと「タスクを追加」は固定して一覧だけをスクロールさせ、タスク一覧全体に囲い・角丸・面の背景色・行間 divider を付けない。タスク行は offset なしの 2 段構成（上段: 日付 + ピン / リスト名、下段: 完了操作 / 本文 / 編集操作）とし、下段の要素を上寄せして行末に 4 相当の余白を置く。操作領域は iOS 44pt / Android 48dp 以上を維持し、完了操作と編集操作は Web と同じ 48 の列に置く。カレンダーの「タスクを追加」は常時表示する。
- `yyyy-MM-dd` は実在する暦日だけを厳密に受け入れ、不正値は日付なしへ正規化する。端末ローカルの暦日として扱い、Web の `new Date("yyyy-mm-dd")` や UTC formatter を使わない。UTC 変換の例外は持たず、iOS / Android の `yyyy-MM-dd` 生成は gregorian の年月日成分から整形して formatter を都度生成しない。
- 月カレンダーの週開始は `es` / `de` / `fr` / `zh-CN` / `id` が月曜、`ar` が土曜、それ以外は日曜に固定する。内部の日付計算は端末既定暦に依存させない。英語相対日付の解析は英語 UI 翻訳の読み込み状態に依存させない。
- 入力 parser は Web の `entry.tsx` を正本とし、日付・相対表現・pin prefix・数字正規化を iOS / Android でも揃える。`taskInsertPosition` の既定は `top`、履歴は小文字比較で重複除去して最大 300 件とする。
- タスクの表示順は `order` を根拠に配列化する。`autoSort` 有効時は pinned 未完了 → unpinned 未完了 → 完了の各グループ内を日付順にし、無効時は状態にかかわらず全 task を任意順で扱う。同順位は `id` で決定的にする。`pinOrder` は持たない。手動並び替えは `autoSort` 有効時だけ同じ表示グループ・日付内に制限し、無効時は全 task 間で許可する。drag handle と本文の長押し（タッチのみ、iOS は 18 以降）のどちらからでも開始できる。操作終了時の全 task ID 順を保存する。
- task は本文・日付・ピンのいずれかが有効なら保存する。日付あり・ピン留めなら空本文を許可し、3 項目すべてが空相当になった task は削除する。
- 共有taskの他端末競合で必須field不足の部分mapが再生成される場合があるため、全task fieldを厳格decodeし、server確定snapshotでだけ部分mapを自動削除する。
- Firestore の UI 更新は transaction を使わず、表示中の task 群を正規化して pending overlay に反映する。SDK への投入順とサーバー応答待ちを分離し、オフライン中も後続操作を SDK の永続キャッシュへ渡す。表示優先順は drag overlay → pending → listener。書き込み中の内容一致だけで pending を解放せず、同一リストの応答追跡が完了した時に解放する。
- taskLists は `memberKeys`（`sha256("lightlist-member:" + uid)` の hex。生の uid は置かない）の `array-contains` 単一クエリで購読し、membership の事前読み取りや chunk 分割を持ち込まない。listener の再試行は settings / taskListOrder / taskLists ごとに独立させ、正常な購読を解除しない。他の購読の成功で失敗状態・再試行間隔をリセットしない。
- カレンダー編集は本文・日付・ピンがすべて空になっても保存でき、そのタスクを削除する。空タスクの新規追加は禁止する。
- 共有コードの生成・解除はサーバーの現在値を読み、Rules で旧コード文書の同時削除を保証する。コードの解決時もリストの現在コードと照合する。共有コードは未認証プレビューの読み取りに限り、taskList の更新には membership document を要求する。リストから参照されないコード文書は Rules で取得を拒否する。
- 退会は確認画面のパスワードで `EmailAuthProvider` 再認証に成功してから Firestore を削除し、Auth ユーザー削除を最後に行う。パスワードは永続化・ログ出力しない。
- Web の chunk group は `includeDependenciesRecursively: false`。明示 group の UI 依存は、group 外へ残った推移依存から entry へ戻る import が発生しないよう同じ group に含め、生成物の import 循環を確認する。date-fns の locale を通常 group へ入れず、英語の既定値と共通 helper は専用 group、他言語は言語別 dynamic import とする。Analytics とカレンダー翻訳の遅延分離を生成 HTML でも確認する。
- Firestore の field path（`tasks.<id>.*` など）は update 系 API（Web `updateDoc` / iOS `updateData` / Android `update`）だけで書き込む。taskList の削除・共有参加も事前 read 後の batch write とする。
- 起動は cache-first とし、Web / iOS / Android の設定・taskListOrder・taskLists cache を listener の live snapshot より先に利用できるようにする。taskLists のクエリは taskListOrder に依存しないため、両方の購読を起動時に同時に開始する。Web は listener の初回 cache snapshot を hydrate に使って同一参照の cache get を重ねず、iOS の warm-up は cache read を並列化する。cache の古い内容は後続 listener で更新する。Web の app page は表示専用の起動スナップショット（localStorage）で初回描画を先行させ、listener の初回応答まで操作を受け付けない。iOS は UserDefaults、Android は SharedPreferences に保存した設定値を初回フレームから使う。
- Web の compact layout / carousel は表示中の画面だけを Tab 順と accessibility tree に含め、画面切替時は main landmark へフォーカスを移す（初回表示を除く）。認証は signin / signup の選択中タブだけを Tab 順に含め、左右矢印・Home / End で切り替える。並び替えはスクリーンリーダーとハードウェアキーボードでも実行できる。
- Web の build は Vite 8 / Rolldown の `codeSplitting.groups` を使い、フォントは通常 400 / 500 / 600 / 700 と表示 700 だけを非同期配信する。
- 削除系の確認は 3 プラットフォームともアプリの確認ダイアログで行い、Web で `window.confirm` を使わない。オフライン中は各 app のルートに置いた `OfflineNotice` で画面下部に `common.offline` を表示し、同じ場所にサーバーに拒否された書き込みの `common.syncFailed` も表示する。
- オフライン対応は Firestore の永続 cache とローカル書き込みに任せ、UI は書き込みのサーバー応答を待たずに SDK 投入時点で閉じる・遷移する。サーバー応答は pending の解放と同期失敗通知だけに使う。書き込み前の読み取りは cache 優先とし、サーバー判定が必要な操作（認証・メール変更・退会・共有コード・共有参加）はオフライン中に無効化して `common.requiresConnection` を表示する。ログアウトは `waitForPendingWrites` で未送信を確認して警告し、cache は削除しない。詳細は `AGENTS.md`。
- 3 プラットフォームは WCAG 2.2 AA のコントラスト（文字 4.5:1、アイコン・枠線・状態表示 3:1）を light / dark と背景色付きタスクリストを含めて満たす。補助色は前景色の透過で表し、背景色付きリスト上では濃くする。完了 task は行の opacity でなく muted 文字色 + 取り消し線で表し、完了トグルはタスク本文を名前にして状態を公開する。詳細値は `AGENTS.md` を参照する。
- Web / iOS / Android の motion は Reduce Motion を尊重する。iOS / Android のタスク操作には共通方針の触覚 feedback を返す。autoSort の完了切替は行を約 200ms 元の位置に留めてから移動し、位置保持は描画用の配列だけに適用して保存・pending の基準配列に混ぜない。
- Web の並び替えは現行 `@dnd-kit/react` / `@dnd-kit/dom` / `@dnd-kit/abstract` を使い、旧 dnd-kit package 群を混在させない。

## プラットフォーム固有の制約

- iOS の Firebase plist は `Lightlist/Resources/Firebase/{Debug,Release}/GoogleService-Info.plist` にローカル配置し、build configuration に応じて app bundle には標準名を 1 つだけコピーする。entitlements は `Lightlist/Lightlist.entitlements`、App Store 提出物は `just archive`（署名検証込み）→ `just upload` とし、Team ID と任意の App Store Connect API key 識別子は gitignore 対象の `apps/ios/.env.local`（雛形は `apps/ios/.env.sample`）に置く。証明書・profile は automatic signing に任せ、リポジトリに置かない。詳細は `docs/release-ios.md`。
- Android の bundle identifier / Gradle namespace / Kotlin package は `com.lightlist.app`。Firebase 設定は debug / release variant ごとに分け、Firebase BoM v34 以降では main module を使う。release の R8 keep rule（Firebase component registrar と `FirestoreSettingsRecord` / `FirestoreTaskListRecord` / `FirestoreTaskRecord` のリフレクション変換対象）、`isMinifyEnabled = true`、`allowBackup = false`、`androidx.profileinstaller` を維持する。Crashlytics Gradle plugin は build ID 注入のため全 variant に適用し、mapping upload は `bundleRelease` のときだけ有効にする。upload key は `just keystore-create` でリポジトリ外に作成し、keystore パスと alias は `apps/android/.env.local`（雛形は `apps/android/.env.sample`）、パスワードは login Keychain に置く。版数は `apps/android/gradle.properties` の `LIGHTLIST_VERSION_CODE` / `LIGHTLIST_VERSION_NAME` を正とする。
- Android の Google OSS Licenses runtime は従来版 Activity を含む `play-services-oss-licenses:17.2.2` に固定し、アプリ本体の Compose BOM と競合する Compose ベースの v2 Activity は使わない。従来版 Activity 用に AppCompat `1.7.1` を直接依存に含める。
- Android の `just run` は通常上書きインストール、データを消す再インストールは `just run-clean`。Play 提出物は署名設定と versionCode を確認した `just bundle-play` の AAB とする。詳細は `docs/release-android.md`。
- CI 品質ゲートは設定せず、変更した app のローカル検証を正とする。

## 主要コマンド

- ルート: `just web` / `just ios` / `just android` / `just screenshots` / `just deploy-firebase`（既定 dev）/ `just deploy-firebase prod` / `just loc`
- Web: `cd apps/web && npm run dev`、`npm run build`、`npm run lint`、`npm run typecheck`、`npm run knip`、`npm run check`（前処理 1 回 + lint / typecheck / knip）。`dev` / `build` / `lint` / `typecheck` は `prepare:assets`（shared locale 同期と license 生成）を前処理として実行する。
- Web 配信: `cd apps/web && npm run cf:preview` / `npm run cf:deploy`。必要な環境変数は上記の Cloudflare Pages 仕様に従う。
- iOS: `cd apps/ios && just lint` / `just format` / `just build` / `just build-release` / `just archive` / `just upload` / `just signing-report`
- Android: `cd apps/android && just lint` / `just build` / `just build-release` / `just bundle-play` / `just keystore-create` / `just signing-report` / `just run` / `just run-clean`
- エージェントの shell command は `/Users/khirayama/.codex/RTK.md` に従い、`rtk <command>` を先頭に付ける。

## 完了条件

1. 実装と `docs/` の仕様を整合させる。
2. 恒久的な知見が増えた場合は、まず `AGENTS.md` を更新する。
3. 変更があった app だけ、対応する npm script / Justfile の検証を実行する。
4. 明示指示がない限りコミットしない。
