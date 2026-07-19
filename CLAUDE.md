# CLAUDE.md

## 必須ルール

- `AGENTS.md` を運用ルールの正本とし、このファイルは要点だけを記載する。
- 回答・説明・コミットメッセージは日本語で記述する。
- 小さな変更を段階的に進め、各段階で実装事実を確認する。
- `context7` と `serena` を必ず活用し、推測で判断しない。
- コメント追加・テスト追加・後方互換性対応は原則不要とする。
- 実装完了時は `docs/` を仕様として更新する。`docs/` にはドメイン仕様・必須設定・運用制約だけを書き、内部コンポーネント一覧や import 構成を重複管理しない。
- 作業で得た再利用可能な恒久知識は `AGENTS.md` に反映し、`CLAUDE.md` は必要な要点だけ追従させる。進捗やタスク固有のメモは残さない。

## リポジトリ構成

- モノレポは `apps/web`（Vite multi-page app + React + TypeScript）、`apps/ios`（SwiftUI、iOS 17+）、`apps/android`（Kotlin + Gradle）で構成する。
- ルートに Node manifest は置かず、Web の manifest と lockfile は `apps/web` に集約する。Web は TypeScript 7 系で、`apps/web/.npmrc` の `legacy-peer-deps=true` を維持する。
- Web の Vite root / HTML entry は `apps/web/html`、静的 asset は `apps/web/public`、環境変数は `apps/web/.env*` とする。runtime TS/TSX は `apps/web/src/entry.tsx` に集約し、LP だけ `apps/web/src/lp.ts` を使う。
- Web の app page（`login` / `app` / `sharecodes` / `password_reset` / `404` / `500`）は `entry.tsx` を共通 bootstrap とし、各 HTML の `body[data-page]` で切り替える。LP は React / Firebase / i18next から分離する。
- Web UI から `firebase/*` を直接 import せず、Firebase 初期化・Auth / Firestore 状態購読・i18n 初期化は `entry.tsx` を正とする。独立 SDK パッケージは持たない。
- iOS は `project.yml` から XcodeGen でプロジェクトを生成する。生成された `Lightlist.xcodeproj` と `xcuserdata` / `xcuserstate` / `build` / `DerivedData` は commit しない。

## Firebase・配信

- Firebase App Check は Web（reCAPTCHA v3）、iOS（Release は App Attest 優先、非対応端末は DeviceCheck、DEBUG は debug provider）、Android（Release は Play Integrity、debug は debug provider）で有効化する。Console 手順と enforcement の制約は `docs/app-check.md` を正とする。
- Firebase のデプロイ設定（`firestore.rules`、`firebase.json`、`.firebaserc`、`firestore.indexes.json`）はリポジトリルートに置く。
- Web の本番配信は Cloudflare Pages とする。Root directory は `apps/web`、output directory は `dist`、Node.js は `apps/web/.node-version` の `24.18.0`、package manager は `apps/web/package.json` の `npm@12.0.1` に固定する。
- Cloudflare Pages の build では `LIGHTLIST_IOS_TEAM_ID` と `LIGHTLIST_ANDROID_SHA256_CERT_FINGERPRINT` を使って AASA / Digital Asset Links を `dist/.well-known/` に生成する。Git integration / `cf:preview` / `cf:deploy` に両環境変数を設定する。
- Web の production response headers はアプリ内でなく配信基盤側で管理する。PII（特にメールアドレス）を `console.error` や Analytics parameter に含めない。

## 共通仕様

- locale の正本は `shared/locales/locales.json`。Web は sync script で `src/locales.json` と LP 用 `src/lp-locales.json` を生成し、iOS は `apps/ios/Lightlist/Resources/locales.json` を手動同期、Android は build 時に asset 化する。対応言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`、fallback は `ja`。
- UI は 3 プラットフォーム共通のモノクロ palette と system/light/dark theme を使う。アクセント色を追加せず、iOS は `AccentColor.colorset`、Android は明示的な Material palette、Web は通常 CSS を正とする。詳細な色・寸法・motion は `AGENTS.md` を参照する。
- 設定画面のセクション順は「アカウント → 表示と動作 → 法的情報 → アカウント操作」。カレンダーは日グリッドとタスク一覧を同じ横幅で直置きし、タスク一覧全体に囲い・角丸・面の背景色・行間 divider を付けない。タスク行は offset なしの 2 段構成（上段: 日付 + ピン / リスト名、下段: 完了操作 / 本文 / 編集操作）とし、下段の要素を上寄せして行末に 4 相当の余白を置く。操作領域は iOS 44pt / Android 48dp 以上を維持し、iOS の完了操作と本文の間には 8pt の間隔を置く。
- `yyyy-MM-dd` は端末ローカルの暦日として扱い、Web の `new Date("yyyy-mm-dd")` や UTC formatter を使わない。Android Material3 `DatePicker` の millis 変換だけ UTC を許可し、iOS formatter は `en_US_POSIX` + gregorian を使う。
- 入力 parser は Web の `entry.tsx` を正本とし、日付・相対表現・pin prefix・数字正規化を iOS / Android でも揃える。`taskInsertPosition` の既定は `top`、履歴は小文字比較で重複除去して最大 300 件とする。
- タスクの表示順は `order` を根拠に配列化し、pinned 未完了 → unpinned 未完了 → 完了の順にする。同順位は `id` で決定的にする。`pinOrder` は持たない。手動並び替えは同じ表示グループ内、`autoSort` 有効時は同じ日付内だけ許可し、操作終了時の全 task ID 順を保存する。
- task は本文・日付・ピンのいずれかが有効なら保存する。日付あり・ピン留めなら空本文を許可し、3 項目すべてが空相当になった task は削除する。
- 共有taskの他端末競合で必須field不足の部分mapが再生成される場合があるため、全task fieldを厳格decodeし、server確定snapshotでだけ部分mapを自動削除する。
- Firestore の UI 更新は transaction を使わず、表示中の task 群を正規化して pending overlay に反映し、taskListId 単位の mutation queue で直列化する。表示優先順は drag overlay → pending → listener。書き込み中の内容一致だけで pending を解放しない。
- Firestore の field path（`tasks.<id>.*` など）は update 系 API（Web `updateDoc` / iOS `updateData` / Android `update`）だけで書き込む。taskList の削除・共有参加も事前 read 後の batch write とする。
- 起動は cache-first とし、Web / iOS / Android の設定・taskListOrder・taskLists cache を listener の live snapshot より先に利用できるようにする。cache の古い内容は後続 listener で更新する。
- Web の compact layout / carousel は表示中の画面だけを Tab 順と accessibility tree に含め、画面切替時は main landmark へフォーカスを移す（初回表示を除く）。認証は signin / signup の選択中タブだけを Tab 順に含め、左右矢印・Home / End で切り替える。並び替えはスクリーンリーダーとハードウェアキーボードでも実行できる。
- Web / iOS / Android の motion は Reduce Motion を尊重する。iOS / Android のタスク操作には共通方針の触覚 feedback を返す。

## プラットフォーム固有の制約

- iOS の Firebase plist は `Lightlist/Resources/Firebase/{Debug,Release}/GoogleService-Info.plist` にローカル配置し、build configuration に応じて app bundle には標準名を 1 つだけコピーする。entitlements は `Lightlist/Lightlist.entitlements`、App Store archive は `LIGHTLIST_IOS_TEAM_ID=<Team ID> just archive` を使う。詳細は `docs/release-ios.md`。
- Android の bundle identifier / Gradle namespace / Kotlin package は `com.lightlist.app`。Firebase 設定は debug / release variant ごとに分け、Firebase BoM v34 以降では main module を使う。release の R8 keep rule、`isMinifyEnabled = true`、`allowBackup = false`、`androidx.profileinstaller` を維持する。
- Android の `just run` は通常上書きインストール、データを消す再インストールは `just run-clean`。Play 提出物は署名設定と versionCode を確認した `just bundle-play` の AAB とする。詳細は `docs/release-android.md`。
- CI 品質ゲートは設定せず、変更した app のローカル検証を正とする。

## 主要コマンド

- ルート: `just web` / `just ios` / `just android` / `just screenshots` / `just deploy-firestore` / `just deploy-firestore-prod` / `just loc`
- Web: `cd apps/web && npm run dev`、`npm run build`、`npm run lint`、`npm run typecheck`、`npm run knip`。`dev` / `build` / `lint` / `typecheck` は shared locale 同期と license 生成を前処理として実行する。
- Web 配信: `cd apps/web && npm run cf:preview` / `npm run cf:deploy`。必要な環境変数は上記の Cloudflare Pages 仕様に従う。
- iOS: `cd apps/ios && just build` / `just build-release` / `LIGHTLIST_IOS_TEAM_ID=<Team ID> just archive`
- Android: `cd apps/android && just lint` / `just build` / `just build-release` / `just bundle-play` / `just run` / `just run-clean`
- エージェントの shell command は `/Users/khirayama/.codex/RTK.md` に従い、`rtk <command>` を先頭に付ける。

## 完了条件

1. 実装と `docs/` の仕様を整合させる。
2. 恒久的な知見が増えた場合は、まず `AGENTS.md` を更新する。
3. 変更があった app だけ、対応する npm script / Justfile の検証を実行する。
4. 明示指示がない限りコミットしない。
