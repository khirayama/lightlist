# CLAUDE.md

## 必須ルール

- 日本語で回答する。
- 小さな変更を段階的に進め、各ステップで確認する。
- `context7` と `serena` を必ず使う。
- コメント追加は不要。テスト追加は不要。後方互換性は考慮不要。
- `docs/` は内部構成の重複説明ではなく、ドメイン仕様・必須設定・制約を書く。

## 実装方針

- 過度な抽象化を避け、素直で可読性の高い実装を優先する。
- 正常系と主要なエラー処理に集中する。
- TypeScript で厳密に型付けし、`any` / `unknown` の使用を避ける。
- 不要な処理・関数・ファイルは積極的に削除する。
- 文言は i18next で管理し、テーマ（system/light/dark）対応を維持する。

## プロジェクト実態（2026-03）

- モノレポ: `apps/web`（Vite multi-page app）/ `apps/ios`（SwiftUI）/ `apps/android`（Kotlin）
- Web の Vite HTML entry は `apps/web/html` に集約し、`apps/web/src` は React/TypeScript コード専用とする。
- SDK（Firebase Auth/Firestore、状態管理・ミューテーション）は `apps/web/src/entry.tsx` に統合済み。独立パッケージは廃止。
- Firebase 初期化は `apps/web/src/entry.tsx` に閉じ、`import.meta.env.VITE_FIREBASE_*` を直接読む。
- Firebase App Check は 3 プラットフォームで有効化する（Web: reCAPTCHA v3 / iOS: App Attest / Android: Play Integrity、開発時は各 debug provider）。Web は `VITE_FIREBASE_APPCHECK_SITE_KEY` 未設定なら無効。Console 手順と enforcement 制約は `docs/app-check.md` を正とする。
- Web の Vite root は `apps/web/html` を正とし、静的 asset は `apps/web/public`、env は `apps/web/.env*` を使う。
- Web のアプリ側 HTML entry（`login` / `app` / `sharecodes` / `password_reset` / `404` / `500`）は `apps/web/src/entry.tsx` 1 本を共通 bootstrap とし、各 HTML の `body[data-page]` で描画 page を切り替える。LP（`apps/web/html/index.html`）はアプリと完全分離し、ja 本文直書きの静的 HTML + `apps/web/src/lp.ts`（vanilla TS。react / firebase / i18next 非依存）で構成する。script path は各 HTML ファイル自身の配置位置を基準に相対指定し、Vite 設定の `/src` alias を維持する。
- Web は外部スタイル生成ライブラリを使わず、`apps/web/src/styles/globals.css` の通常 CSS と `apps/web/src/styles/compiled-styles.css` でスタイルを保持する。モーションは `globals.css` の `ll-anim-*` / `ll-pressable` 等の named class で管理し、3 プラットフォームとも OS / ブラウザの reduce motion 設定を尊重する。フォント CSS は bundle に巻き込まず、各 HTML entry の `<link rel="stylesheet" href="/fonts/gen-interface-jp/*.css">` で public asset として読む。新規スタイルは通常 CSS または既存の named class を優先する。
- Web UI は `firebase/*` を直接 import しない。Web のアプリ側 runtime TS/TSX 実装は `apps/web/src/entry.tsx` に集約する（LP のみ `apps/web/src/lp.ts`）。
- タスク入力先頭の日付読み取り仕様は Web の `apps/web/src/entry.tsx` を正本とし、iOS / Android も対応言語・数字正規化・先頭一致ルールを揃える。`mm/dd` 等の月日指定は当年として解釈し、今日より過去なら翌年へ繰り上げる。`taskInsertPosition` の既定は全プラットフォームで `top`、`taskLists.history` は小文字比較で重複除去し最大 300 件。
- task 入力 parser は各対応言語の短い pin prefix も扱い、全言語で `pin` / `pinned` を併用許可する。`pin 04/24 task1` と `04/24 pin task1` を同じ規則で解釈し、本文編集では prefix 付与時だけ `pinned = true` にする。
- task 入力 parser の日付表現は設定言語に加えて全言語で英語相対表現（`today` / `tomorrow` / `day after tomorrow` / `in N days` / `N days later` / 英語曜日）も許可する。
- Firebase デプロイ設定（`firestore.rules`, `firebase.json`, `.firebaserc`）はリポジトリルートに配置。
- `.gitignore` はルートで共通ローカル生成物を管理し、`apps/web` / `apps/ios` / `apps/android` 配下は各アプリ固有の生成物だけを管理する。
- `apps/ios` では `xcuserdata` / `xcuserstate` / `build` / `build-*` / `DerivedData` と `apps/ios/Lightlist/Resources/Firebase/{Debug,Release}/GoogleService-Info.plist` を commit しない。
- iOS の entitlements は `apps/ios/Lightlist/Lightlist.entitlements`、Privacy Manifest は `apps/ios/Lightlist/Resources/PrivacyInfo.xcprivacy` を正とする。
- iOS の Info.plist は xcodegen の `info:`（`project.yml`）で `Lightlist/Info.plist` へ生成し、`CFBundleLocalizations` / `CFBundleURLTypes` / `UIAppFonts` / `PASSWORD_RESET_URL` は `info.properties` 側に書く。配列・辞書・カスタムキーを `INFOPLIST_KEY_*` で渡しても built product に入らない。development language は `ja`。
- iOS の App Store 提出物は `cd apps/ios && LIGHTLIST_IOS_TEAM_ID=<Team ID> just archive` で生成する IPA（`apps/ios/build-archive/export/Lightlist.ipa`）を正とする。export 設定は `apps/ios/ExportOptions.plist`、手順は `docs/release-ios.md`。再アップロード時は `project.yml` の `CURRENT_PROJECT_VERSION` を上げる。
- iOS の bundle identifier と Android の applicationId は `com.lightlist.app` を正とする。Android の Gradle `namespace` と Kotlin パッケージも `com.lightlist.app` に揃える。
- iOS の Firebase 設定は `apps/ios/Lightlist/Resources/Firebase/Debug/GoogleService-Info.plist` と `apps/ios/Lightlist/Resources/Firebase/Release/GoogleService-Info.plist` を build configuration ごとに切り替え、app bundle には標準名 `GoogleService-Info.plist` だけを配置する。
- iOS の Firebase Auth callback と auth state listener から SwiftUI state を更新する処理は MainActor 上で行い、ログイン completion で `error` と `result` がともに空の場合も汎用認証エラーを表示する。
- Web / iOS / Android のメール/パスワードログインは Firebase Auth 応答待ちを 10 秒で打ち切り、loading state を必ず戻して汎用認証エラーを表示する。
- iOS の AppIcon は `shared/assets/brand/logo.svg` を元に、白背景の不透明な正方形 PNG として `apps/ios/Lightlist/Resources/Assets.xcassets/AppIcon.appiconset` の全スロットへ配置する。
- Android の launcher icon は `shared/assets/brand/maskable-512.png` を正とし、70% に縮小して中央配置した素材から adaptive icon と density 別 mipmap を生成する。themed icon 用の monochrome layer は同じ意匠の単色 vector を使う。
- UI 配色は Web のモノクロ（Tailwind gray 系）パレットを 3 プラットフォーム共通の正本とする（light: 背景 `#FFFFFF` / 文字 `#111827` / 枠線 `#D1D5DB`、dark: 背景 `#030712` / 面 `#111827` / 文字 `#F9FAFB` / 枠線 `#374151`）。アクセント色は持たず primary は light `#111827` / dark `#F9FAFB`。Android は dynamic color を使わず `ContentView.kt` の明示カラースキーム + `values-night/themes.xml`、iOS は system semantic color で表現し `Color.accentColor` は使わない。
- UI フォントの正本は `shared/assets/fonts/gen-interface-jp` とし、本文は `Gen Interface JP`、主要見出しは `Gen Interface JP Display` を使う。共有コードなど等幅の意味を持つ表示は monospace を維持する。
- ライセンス表記の手動管理対象は `shared/licenses/manual-licenses.json` を正本とし、Web は `apps/web/scripts/generate-licenses.mjs`、iOS は `LicensePlist` build tool plugin、Android は Google OSS Licenses plugin で依存ライセンスを生成する。iOS の build tool plugin は初回 build 時に Xcode の trust が必要で、CLI では必要に応じて `xcodebuild -skipPackagePluginValidation` を使う。
- ブランドロゴの現行 SVG は `shared/assets/brand/logo.svg` と `apps/web/public/brand/logo.svg` を正とし、差し替え前の旧ロゴは `logo_legacy.svg` に退避する。
- タスクリストは `taskLists.memberCount` で保持ユーザー数を管理し、削除操作は `taskListOrder` からの離脱を基本とする（現在の `memberCount` が 1 以下のときのみ実体削除）。
- 共有権限モデルは「共有URLを知っているユーザーは未認証でも閲覧・編集可」を固定仕様とし、production readiness 評価の item1（認可モデル再設計）は 2026-03 時点で対応不要とする。
- 共有コードは bearer credential として扱い、有効な共有コード保有者は未認証でも `taskLists` の `name` `tasks` `history` `background` `shareCode` を更新できる。
- 共有コード生成は 8 文字の英大文字・数字を暗号学的乱数で作る。Web は `crypto.getRandomValues`、iOS は `SecRandomCopyBytes`、Android は `SecureRandom` を使い、生成・削除は事前 read 後の batch write で `shareCodes` と `taskLists.shareCode` を更新する。試行は最大 10 回で、既存 shareCode の doc は正規化（trim + uppercase）した ID で同 batch 削除する。リスト実体削除（アカウント削除含む）でも `shareCodes` doc を残さない。
- `taskListOrder/{uid}` は本人が任意の `taskListId` を追加でき、その追加自体を共有済み・参加済みリストの保持権限付与として扱う。
- `taskLists` / `taskListOrder` / `shareCodes` の `createdAt` / `updatedAt` は Firestore Rules の `int` 型検証と pending snapshot の安定性に合わせ、server timestamp ではなく Unix epoch milliseconds の number を書き込む。Web の `taskLists` 読み取りは既存データや pending snapshot に timestamp-like 値が混在しても `estimate` として解決する。
- iOS の認証済み画面遷移は `RootView` の `AppRoute` と `NavigationStack` / `NavigationSplitView` で管理し、compact 幅は `TaskListsView` から `TaskListDetailPagerView` / `SettingsView` / `CalendarScreenView` へ遷移し、regular 幅は 360pt サイドバーと `RegularTaskListDetailPagerView` / `SettingsView` / `CalendarScreenView` の detail pane で表示する。
- iOS の `TaskListDetailPagerView` / `RegularTaskListDetailPagerView` は、選択中タスクリストの `background` を詳細画面背景として使う。compact 幅は safe area を含む全面、regular 幅は detail column 内だけに適用し、sidebar と split 境界線には広げない。各 `TaskListDetailPage` 本文も同じ色を使い、未設定時だけ `Color(.systemBackground)` にフォールバックする。
- iOS の compact 幅タスクリスト詳細は `TaskListDetailPagerView` 自体を full screen コンテナとして描画し、最外層背景は選択中タスクリストの `background` を `ignoresSafeArea()` で全面へ敷く。本体は画面いっぱいの `VStack` を同じ背景で満たす。ページャーのインジケータだけを固定表示し、タスクリスト名、タスク追加欄、並び替え・完了済み削除操作、タスク行は同じ `ScrollView + LazyVStack` に載せて edge-to-edge にスクロールさせる。regular 幅では detail 側の背景を clip し、divider は sidebar 側の通常背景で固定する。
- Android の `TaskListDetailPagerScreen` は選択中タスクリストの `background` を詳細ペイン背景として使う。compact 幅は画面全体、regular 幅は右ペインだけに適用し、左ペインと split 境界線は `MaterialTheme.colorScheme.background` / `outlineVariant` で固定する。`TaskListDetailPage` はページャーのインジケータだけを固定表示し、タスクリスト名、タスク追加欄、並び替え・完了済み削除操作、タスク一覧を同じ `LazyColumn` に含める。
- Android の `TaskListDetailPagerScreen` のページインジケータは、固定ヘッダー直下に隙間なく接続する横幅いっぱいのフラットな背景帯として描画する。背景色は選択中タスクリストの `background` と同じ解決色をそのまま使い、角丸・枠線・影・透明度差は付けない。
- Android の一覧ヘッダー、詳細ヘッダー、設定ヘッダー、カレンダー確認画面の上部クロームは `WindowInsets.safeDrawing` を反映し、ステータスバーと重ねない。詳細/設定/カレンダーの共通ヘッダーは safe area 分を外側コンテナで確保し、戻るボタンやタイトルの固定高さを inset と共有しない。
- Android のタスクリスト詳細の密度調整は global typography ではなく `TaskListDetailPage` ローカルの metrics で行い、iOS に近い視覚バランスへ寄せつつ edit/share/add/date/complete/drag の `48dp` タップ領域は維持する。
- Android の `TaskListDetailPage` の icon 配置は local metrics を正とし、ヘッダー右上 action・操作列 icon・task row 右端 action・drag handle の見た目サイズと左右端の x 軸整列を揃える。個別 `offset` ではなく hit area と列幅で視覚的な一直線を作る。
- Android の `TaskListDetailPage` の本文系テキスト（新規入力欄、task 本文、インライン編集欄、日付ラベル）は local `TextStyle` を共有し、`includeFontPadding = false` と固定 line height で言語や font fallback による高さ揺れを吸収する。新規入力欄は local metrics の最小高さを持たせる。
- Web / iOS / Android の task 右端 action は、task ごとの sheet / dialog でピン留め切替・日付選択・日付クリアをまとめて扱う。ピン留め切替・日付選択・日付クリアは即時保存し、保存後は sheet を閉じる。
- task action の visible UI には `pages.tasklist.setDate` タイトルや task 名を表示しない。用途説明はアクセシビリティ名として保持する。
- Android の task action は `ModalBottomSheet` と Compose Material3 `DatePicker` を使い、TalkBack では `paneTitle` を設定して別ペインとして読ませる。sheet 本文は縦スクロール可能にし、`DatePicker` の title / headline / mode toggle は表示しない。
- Web の task action は狭幅で actual bottom sheet、広幅で centered dialog を使う。route hash は変えずに `history.state` を 1 段積み、戻る操作と `Esc`/dismiss のどちらでも閉じて起点ボタンへ focus を戻す。
- iOS / Android / Web の task action sheet は、可能な限りキーボードのみで操作できる構成を維持する。
- iOS / Android はタスク操作（完了/ピン切替・追加・完了済み削除・ドラッグ開始・並び替え入れ替え）で触覚フィードバックを返し、両プラットフォームで挙動を揃える。iOS は `UIImpactFeedbackGenerator` / `UISelectionFeedbackGenerator` / `UINotificationFeedbackGenerator`、Android は `LocalHapticFeedback` の `HapticFeedbackType` を使う。詳細は `AGENTS.md` を正とする。
- iOS のアプリ内アイコンは `ContentView.swift` の metrics を正とし、標準アクションとナビゲーション `22pt`、テキスト横の補助アクション `18pt`、詳細画面の小型アクション `20pt` を基準に目視サイズを揃える。AppIcon 資産とは分けて扱う。タスクリスト詳細の右端 action（ヘッダー共有・操作列ゴミ箱・task row のカレンダー/ピン）は `trailingDateButtonWidth`（48pt）の列幅で中心線を揃え、drag handle のドットは `4pt` で補助アクションと目視サイズを揃える。
- Android のアプリ内アイコンは `ContentView.kt` の metrics を正とし、標準アクション `24dp`、テキスト横の補助アクション `18dp`、詳細画面の小型アクション `20dp` を基準に目視サイズを揃える。launcher icon 資産とは分けて扱う。
- Android の `TaskListDetailPage` は、タイトル・入力欄・操作列のセクション間余白と、タスク行同士の余白を別メトリクスで管理する。タスク行間はセクション間より詰める。
- iOS / Android の compact 幅タスクリスト詳細は、戻るボタン行とページャーインジケータ行を分離し、入力欄の追加ボタンは入力文字がある時だけ表示する。未完了トグルは薄い枠線円、完了トグルは薄いグレー塗り円で描画し、参考画面に近い密度へ寄せる。
- Android Compose の handle 並び替えでは、`pointerInput` に再 compose ごとに変わる gesture lambda を直接渡さず、drag session 中も detector を維持する。更新が必要な callback は `rememberUpdatedState` 経由で参照する。
- iOS / Android の `TaskListDetailPage` は、タスク追加・完了切替・本文編集・日付変更・ピン切替ごとに local pending 表示へ入れた正規化済み task 集合を保持し、Firestore へは変更前後の差分 field だけを保存する。`autoSort` 有効時も同じ順序で再採番したうえで、変化した `order` だけを書き込む。
- iOS の SwiftUI 並び替えドラッグは、移動中の行の local 座標系ではなく親 `ScrollView` の named coordinate space を基準に追跡し、swap 判定は `GeometryReader` で収集した行高さだけを使う。`frame(in:)` の位置監視を drag state に戻さない。
- iOS の全画面ルートと sheet / dialog は `frame(maxWidth: .infinity, maxHeight: .infinity)` を維持しつつ、背景ビュー側だけで safe area を無視する。標準ナビゲーションバーを使わない iPhone ヘッダーは `SafeAreaNavigationHeader` と `safeAreaInset(edge: .top)` を使う。`ContentView.swift` 内の `LightlistApp` は hidden `UIViewRepresentable` の `WindowSceneConfigurator` で attach 済み `UIWindow` を初期化し、window 背景色と root view controller の safe area / layout margins も全画面前提に揃える。`ScrollView` ベースの全画面フォームはカードラッパーを持たず、外側 `maxWidth` 制約や `RoundedRectangle` でカード化しない。
- iOS の custom header 付き画面と sheet / dialog は、header を `safeAreaInset(edge: .top)` に載せ、本文 root も `frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)` で画面高または detent 高いっぱいまで広げる。header inset と重複する大きな `padding(.top)` は本文側で足さず、追加の視覚余白は最小限に留める。
- パスワードリセットURLは `VITE_PASSWORD_RESET_URL`（Web）が必須。prod 設定で `localhost` を使わない。
- iOS のパスワードリセット URL は Info.plist の `PASSWORD_RESET_URL`、Android は `BuildConfig.PASSWORD_RESET_URL` を使い、既定値は `https://lightlist.com/password_reset` とする。
- Android の認証フォームは Compose Autofill を有効にするため `ContentView.kt` の `OutlinedTextField` に `contentType` を必ず設定し、サインインは既存資格情報、サインアップ/パスワードリセットは新規資格情報として宣言する。
- Android の未ログイン起動時の認証画面は、保存済み settings が無い場合に端末ロケールをサポート言語へ丸めて初回表示言語として使い、`Translations` は初回描画前にロード済みインスタンスを `CompositionLocal` へ渡して翻訳キーの生表示を避ける。`zh-*` は `zh-CN`、`pt-*` は `pt-BR` に丸め、それ以外の未対応ロケールは `ja` にフォールバックする。
- iOS / Android の認証 UI は `signin` / `signup` / `reset` の 3 導線を持ち、認証前でも言語切替を行える。共有コード deep link は未認証でも共有リストプレビューを開き、ログイン済みかつ未参加のときだけ `taskListOrder` 追加導線を出す。Android の deep link は `lightlist://password-reset?...`、`lightlist://sharecodes/...`、`https://lightlist.com/sharecodes/...`、`https://lightlist.com/password_reset?...` を処理する。
- iOS の認証状態監視と認証画面表示は `RootView` に集約し、子 view に auth listener や認証用 full screen cover を分散させない。子 view は `currentUserId` を引数で受けて `onAppear` / `onChange` で bind し、`TaskListsView` は `onDisappear` で listener を解除しない。
- Web の本番 security headers は配信基盤側で管理する。
- Android の release build は `isMinifyEnabled = true`、`allowBackup = false` を維持する。
- Android の `just build-release` は debug keystore 署名の内部配布確認用 release APK（`apps/android/app/build/outputs/apk/release/app-release.apk`）を生成する。正式配布用 keystore 署名は別途用意する。
- Android の Google Play 提出物は `cd apps/android && just bundle-play` で生成する release AAB（`apps/android/app/build/outputs/bundle/release/app-release.aab`）を正とする。release upload key 署名は `LIGHTLIST_ANDROID_KEYSTORE` / `LIGHTLIST_ANDROID_KEYSTORE_PASSWORD` / `LIGHTLIST_ANDROID_KEY_ALIAS` / `LIGHTLIST_ANDROID_KEY_PASSWORD` を Gradle property または環境変数で渡し、`versionCode` は既定 1 で `LIGHTLIST_VERSION_CODE` を Gradle property または環境変数で渡して上書きでき、Play Console にアップロード済みの値より大きくしてから生成する。
- サポート言語は `ja` / `en` / `es` / `de` / `fr` / `ko` / `zh-CN` / `hi` / `ar` / `pt-BR` / `id`。`fallbackLng` は `ja`。
- `shared/locales/locales.json` は英語で残す文言はブランド名（`title` / `app.name`）とマスク文字（`auth.placeholder.password`）のみとする。
- Web の翻訳資産は `shared/locales/locales.json` を `apps/web/scripts/sync-shared-locales.mjs` で `apps/web/src/locales.json` へ同期して使う。同スクリプトは LP 用 subset（`pages.index.*` + `copyright` + `common.skipToMain` の flat key 辞書）を `apps/web/src/lp-locales.json` へ生成する。
- Android の翻訳資産は `shared/locales/locales.json` を build 時に asset 化して使い、件数表示は `taskList.taskCount_one` / `taskList.taskCount_other` を `count` 付きで解決する。
- iOS / Android の設定値表示やアクセシビリティ文言も shared locale key を正とし、`system` / `top` / `Settings` / 固定曜日名のような raw value や固定言語文字列を直接表示しない。アクセシビリティ専用文言は `a11y.*` キーを使う。
- task / taskList の並び替えはドラッグに加えてスクリーンリーダー代替手段を提供する。Web は dnd-kit `KeyboardSensor` + `DndContext accessibility`（`a11y.drag*`）、iOS は `accessibilityAction(named:)`、Android は semantics `customActions` で `a11y.moveUp` / `a11y.moveDown` を出す。ページャーインジケータとカレンダー日セルは読み上げラベルと選択状態を公開する。
- タスクの `yyyy-MM-dd` 日付文字列は 3 プラットフォームとも端末ローカルの暦日として解釈・生成する（formatter に UTC を指定しない、Web で `new Date("yyyy-mm-dd")` を使わない）。例外は Android Material3 `DatePicker` の millis 変換のみ。iOS の `yyyy-MM-dd` formatter は `en_US_POSIX` + gregorian を必ず指定する。
- Firestore のドット記法 field path 書き込みは update 系 API（`updateDoc` / `updateData` / `update`）のみで行い、set + merge に渡さない。
- Web の i18n 初期化、対応言語定義、言語正規化、方向判定、翻訳依存のエラー解決・バリデーションは `apps/web/src/entry.tsx` に集約する。LP の `apps/web/src/lp.ts` は `normalizeLanguage` 等の言語ヘルパを同名のまま意図的に複製し、言語選択は `localStorage.i18nextLng` 経由でアプリ側 i18next と引き継ぎ合う。
- Web の Auth / settings / taskLists の状態購読は `apps/web/src/entry.tsx` の `AppStateProvider` と hook を正とし、`useSyncExternalStore` ベースの独自 store は持ち込まない。context は `SessionContext` / `SettingsContext` / `TaskListsContext` の 3 分割を維持し、taskLists chunk 購読は ID 集合キー変化時のみ張り直す（順序変更で再購読しない）。
- Web の Firestore IndexedDB cache に `settings` / `taskListOrder` / `taskLists` の実データがある場合は、placeholder / skeleton より cache hydrate 済み実データ表示を優先する。Web / iOS / Android の `taskLists` chunk は cache snapshot / live snapshot ともに `docChanges()` ではなく snapshot 全体を chunk 単位で反映し、chunk 内の既存保持分を一度外してから snapshot documents で再構築する。
- Web の task 更新系は Firestore `tasks` map の列挙順を順序根拠に使わず、必ず `order` 昇順の配列へ直してから追加・自動並び替え・D&D 並び替え・完了済み削除を計算する。
- Web / iOS / Android の UI 更新系 Firestore 書き込みでは transaction を使わず、task 本文 blur・task 並び替え・taskList 並び替え・日付変更・ピン切替・完了切替の保存後も、listener が同じ内容へ追いつくまで local pending state を優先表示して旧表示への瞬間的な逆戻りを防ぐ。Web の local pending task 表示も `autoSort` 有効時は `未完了 pinned -> 未完了 unpinned -> 完了` と各グループ内 `date -> order` へ正規化して保持する。
- Web / iOS / Android の task 更新系 Firestore 書き込みは同一 `taskListId` ごとにクライアント内で直列化し、task 追加直後の後続更新が先行保存を追い越さないようにする。Web の optimistic task 追加は Firestore 保存と同じ `taskId` を使う。
- Web / iOS / Android の task 更新 UI は、`表示中 task 群 -> 正規化済み next task 群 -> pending 表示 -> queue 経由の差分保存` の順で統一し、pending 解放判定も listener 側 task 群を同じ正規化へ通して比較する。Firestore へは新規 task の full object、削除 task の `tasks.<id>` delete、既存 task の変更 field と変化した `order` だけを書き込む。
- iOS / Android の task pending（楽観的 overlay）は listener 一致判定だけで解放しない。一致判定は即時解放の fast-path として残し、さらにリスト単位 mutation queue のドレイン（投入済み書き込みの全件コミット完了 = `onIdle`）でも必ず解放する。別端末の並行編集で一致が永久に成立せず View が固着するのを防ぐため。`pendingTaskListOrder` も並び替え書き込みのコミット完了で解放する。
- iOS / Android の表示優先順は `ドラッグ overlay -> pending -> listener`。ドラッグ並び替えの overlay（`dragOrderedTasks` / `dragOrderedTaskLists`）は `onDragCancel` だけでなく正常終了（`.onEnded` / `onDragEnd`）でも必ず `nil`/`null` に戻す。戻し忘れると並び替え後に追加・編集・完了切替・listener 更新が overlay に隠れて固着する。並び替え有無は overlay ではなく listener 由来の原順と比較して判定する。
- Web / iOS / Android の task 一覧の空状態判定も pending 表示を含む現在表示中 task 群を基準にし、空リストへの 1 件目追加を listener 反映待ちにしない。
- Web の task mutation は taskList read をキャッシュ優先（`getDocFromCache` → 失敗時 `getDoc`）で行い、settings は UI の購読済み値を `ResolvedTaskSettings` として引数で渡す。`addTask()` の order は top で `先頭 - 1`、bottom で `末尾 + 1` を 3 プラットフォーム共通とする。
- Web の taskLists chunk listener の失敗は部分劣化とし、全画面エラーは settings / taskListOrder 失敗か taskLists が 1 件も読めない場合だけにする。`index` / `404` / `500` / `password_reset` ページでは Firebase Auth を購読しない。
- iOS の task mutation queue は `TaskListMutationQueues`（taskListId キー）で保持し、`CalendarViewModel` は `CalendarScreenView` が表示中だけ bind する。
- Web / iOS / Android の `deleteTaskList()` と `addSharedTaskListToOrder()` も transaction を使わず、事前 read 後の batch write で `taskListOrder` と `taskLists.memberCount` を更新する。共有参加は `taskListOrder/{uid}` 欠損時でも merge 書き込みで自動作成し、既に追加済みなら no-op にする。
- Web / iOS / Android のタスク入力候補は `taskLists.history` を共通の正本として使い、履歴更新はタスク追加時と本文変更時に行う。候補表示条件は trim 後 2 文字以上の部分一致・最大 20 件・完全一致除外で Web 仕様に揃える。
- task のピン留めは `tasks.*.pinned` だけを追加し、`pinOrder` は持たない。表示順は `未完了 pinned -> 未完了 unpinned -> 完了`、各グループ内は `order` 昇順を正とする。`autoSort` 有効時は各グループ内を `date -> order` で再採番する。pinned task の右端 action はカレンダーではなくピンアイコンを表示し、強めの本文 weight で通常 task と区別する。
- Web の認証後シェルは `apps/web/src/entry.tsx` 内の app page 実装を単一入口とし、`/app/#/task-lists` を stack root、`/app/#/task-lists/:taskListId` を task list 詳細、`/app/#/settings` を設定画面として扱う。`/app/` は bootstrap alias として client mount 後に `#/task-lists` を積み、taskLists 解決まで詳細スケルトン表示のまま待ってから前回選択リスト（localStorage `lightlist.lastTaskList`）か先頭リストの `#/task-lists/:taskListId` を push する。横スライドアニメーションは初期 route 確定後に有効化する。`/settings` の独立 route は持たない。
- Web の本番静的配信は Cloudflare Pages を正とし、root path 配信を前提に Vite `base` は `/` を維持する。build 出力は `apps/web/dist`、Cloudflare Pages 用 response headers は `apps/web/public/_headers` に置く。
- iOS / Android の translation loader と analytics helper は `ContentView.swift` / `ContentView.kt` に同居させる。
- Android の app module は `ContentView.kt` 内の analytics helper が `BuildConfig.DEBUG` を参照するため、`apps/android/app/build.gradle.kts` の `buildFeatures.buildConfig = true` を維持する。
- Android の Firebase 設定は build variant ごとに `google-services.json` を分け、debug は `apps/android/app/google-services.json`、release は `apps/android/app/src/release/google-services.json` を使う。release 用ファイルの package 名は `com.lightlist.app` と一致させる。
- Android の Firebase BoM は v34 以降を前提にし、`firebase-*-ktx` ではなく `firebase-auth` / `firebase-firestore` / `firebase-analytics` / `firebase-crashlytics` の main module を使う。
- Android の release APK は R8 縮小後も Firebase component registrar の no-arg constructor を保持する必要があるため、`apps/android/app/proguard-rules.pro` の `ComponentRegistrar` keep ルールを維持する。
- Android の `just run` は通常上書きインストールで Firebase Auth セッションを保持し、失敗時のみアンインストールして入れ直す。明示的なクリーン再インストールは `just run-clean` を使う。
- CI による品質ゲートは設定しない。品質確認は変更があった app のローカル検証コマンド実行を正本とする。
- Web は言語切替時に `document.documentElement.lang` と `dir` を同期する。`ar` は RTL、それ以外は LTR。
- Web の `StartupSplash` は hydration mismatch 回避のため、読み上げラベルを i18n の初期言語解決に依存させず固定文字列（`読み込み中`）で扱う。
- Web の `Carousel` は `direction` prop で方向を受け取り、RTL 時の `scrollLeft` はブラウザ差分を正規化して index を管理する。
- Web の開発サーバーと production build は `vite` / `vite build` を使う。
- iOS / Android の task row は drag handle・完了トグル・本文の縦方向中心を揃える。Android は `task.text` の 1 行目中心を基準とし、複数行でもその基準を維持する。日付ラベルは本文や編集欄の縦位置を押し下げず、同じ本文領域内の直上へ近接表示する。iOS は日付ラベル下の余白を負方向に少し詰め、本文領域の中心線を基準に揃える。
- 配信用スクリーンショットの元画像は `apps/ios/screenshots` / `apps/android/screenshots` / `apps/web/screenshots` に置き、生成は `cd apps/web && npm run screenshots:generate -- <target>` または `just screenshots <target>` で行う。出力は iOS が `apps/ios/screenshots/app-store/iphone-6.9`、Android が `apps/android/screenshots/google-play/phone`、Web が `apps/web/public/screenshots/store/{wide,narrow}`。中央基準の cover crop で、iOS は `1290x2796`、Android phone は `1080x1920`、Web manifest screenshots は wide `1920x1080` / narrow `750x1334` を使う。iPad App Store スクリーンショットは別途 iPad 実画面の元画像追加が必要。
- `apps/web` では画面固有、または 1〜2 箇所でしか使わない UI / helper / hook も含めてアプリ側 runtime TS/TSX を `apps/web/src/entry.tsx` に集約する。LP のみ `apps/web/src/lp.ts` を使う。
- Web 認証ページ実装: `apps/web/src/entry.tsx`（HTML entry は `apps/web/html/login/index.html`）
- 共有ページ実装: `apps/web/src/entry.tsx`（HTML entry は `apps/web/html/sharecodes/index.html`）
- Firestore デプロイ: ルートの `just deploy-firestore` / `just deploy-firestore-prod`
- Cloudflare Pages ローカル確認: `cd apps/web && npm run cf:preview`
- Cloudflare Pages Direct Upload: `cd apps/web && npm run cf:deploy`
- Web の本番 env は Vite の `.env.production` / `.env.production.local` または deploy 環境変数で供給し、build 前に `.env` をコピーしない。
- Android: `cd apps/android && just lint` / `cd apps/android && just build` / `cd apps/android && just build-release` / `cd apps/android && just bundle-play`

## agentドキュメント更新

- 作業完了時に再利用価値のある恒久的な知見（ルール、手順、コマンド、構成差分）が増えた場合は、まず `AGENTS.md` を更新する。
- `CLAUDE.md` は `AGENTS.md` の要点と矛盾しないように必要最小限で追従更新する。
- 進捗報告やタスク固有メモは書かない。

## 完了条件

1. 実装と `docs/` の整合を取る（進捗ではなく仕様として記述）。
2. agent ドキュメント（少なくとも `AGENTS.md`）に恒久知見の更新が必要か確認し、必要なら反映する。
3. 変更があった app だけ検証する。`apps/web` は npm scripts、`apps/ios` / `apps/android` は `Justfile` を使う。
4. `apps/web` を変更した場合は `cd apps/web && npm run format && npm run lint && npm run build && npm run typecheck` を実行する。
5. `apps/ios` を変更した場合は `cd apps/ios && just build && just build-release` を実行する。iOS の `lint` / `format` は現状未設定。
6. `apps/android` を変更した場合は `cd apps/android && just lint && just build` を実行する。Android の `format` は現状未設定。
7. 明示指示がない限りコミットしない。
