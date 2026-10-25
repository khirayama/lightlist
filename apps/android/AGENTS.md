# Android（apps/android）

ルートの `AGENTS.md` を前提に、Android 固有の規則と落とし穴をまとめる。提出手順は `docs/release-android.md`。

## ビルド・設定

- Firebase 設定は variant ごとに分ける: debug は `app/google-services.json`、release は `app/src/release/google-services.json`（package 名 `com.lightlist.app`）。Firebase BoM は v34 以降で、`firebase-*-ktx` ではなく main module を使う。
- `buildFeatures.buildConfig = true` を維持する（analytics helper と URL の切り替えが `BuildConfig.DEBUG` を参照する）。URL などの固定値は `BuildConfig` field や Gradle property にせず Kotlin の定数で持つ。
- release は `isMinifyEnabled = true`・`allowBackup = false`。Firestore の読み取りは map から手で record へ変換し（`taskListRecordFromMap` / `settingsRecordFromMap`）、`toObject()` のリフレクション変換を使わない。そのため R8 の keep（`proguard-rules.pro`）は Firebase component registrar の no-arg constructor だけでよい。
- ライセンス表示は従来版 Activity を含む `play-services-oss-licenses:17.2.2` に固定する（17.4.0 以降は Compose 依存が本体の Compose BOM と競合する）。従来版の古い AppCompat を置き換えるため `androidx.appcompat:appcompat:1.8.0` を直接依存に含め、OSS licenses plugin は全 variant に適用する。
- Crashlytics Gradle plugin は SDK の初期化に必要な build ID を注入するため全 variant に適用し、mapping の upload だけを upload key で署名する build で有効にする。
- `androidx.profileinstaller` で library baseline profile を適用する。独自の Baseline Profile は未導入（導入する場合、instrumentation がアプリをアンインストールするためログイン後画面の計測には自動ログインが必要）。
- `settings.gradle.kts` を変えたら configuration cache を消してから build する。
- 版数は `gradle.properties` の `LIGHTLIST_VERSION_CODE` / `LIGHTLIST_VERSION_NAME`。Play Console のアップロード済みの値より大きくしてから `just bundle` する。upload key はリポジトリ外（`just keystore-create`）に置き、パスワードは環境変数か login Keychain から渡してファイルに書かない。
- launcher icon は `shared/assets/brand/maskable-512.png` を 70% に縮小した素材から生成する（themed icon は単色 vector）。

## UI 部品・テーマ

- dynamic color を使わず、`ContentView.kt` の `LightColorScheme` / `DarkColorScheme` を明示定義する（`surfaceContainer*` も指定する）。起動 window theme は `values/themes.xml` / `values-night/themes.xml`。`res/values/colors.xml` のテンプレート色を復活させない。
- 共通部品は `ContentView.kt` にあり、画面ごとに独自スタイルを作らない: `AppButton` / `AppIconButton` / `AppTextField` / `AppFieldLabel` / `AppAlert` / `AppSwitch` / `AppListDot` / `AppColorPicker` / `AppDialog` / `AppConfirmDialog` / `AppSheet` / `AppSheetHeader` / `AppMonthCalendar` / `DetailScreenScaffold`。押下表現は Material の ripple に任せて独自の scale を重ねない。Material の `DatePicker` は使わない。
- シートは `AppSheet` だけで出す（640dp 未満は `ModalBottomSheet`、以上は中央の `Dialog`）。`ModalBottomSheet` は既定の `contentWindowInsets`（status bar を含む）だと背の高い content が全画面へ広がるため、`contentWindowInsets = { WindowInsets(0) }` を渡し、content 側で `navigationBarsPadding()` + `imePadding()` と最大高を指定する。
- `AppDialog` は `usePlatformDefaultWidth = false` + 最大幅で組む（既定の幅だと `footerStart` の文言が切れる）。
- 背景色付きの詳細と共有プレビューは `TaskListColorScope`（`LightColorScheme` の `MaterialTheme`）で包み、そこから開く `AppDialog` / `AppSheet` / `DropdownMenu` などの popup は `AppThemeScope` でアプリのテーマに戻す。compact は `ColoredSystemBarsEffect` でシステムバーのアイコンを暗色にする。`DetailScreenScaffold` に配色外の `containerColor` を渡すときは `contentColor` を `onBackground` で明示する（省略すると黒になり dark で読めない）。
- 詳細の `HorizontalPager` は `DetailScreenScaffold(contentBehindTopBar = true)` で画面全体に広げ、各ページが自分の背景色を描く。各ページは `safeDrawing` 上端 + ヘッダー高 + インジケータ行（`indicatorContentInset`）を自分で確保し、タスクがインジケータの下へスクロールしないようにする。インジケータは `currentPage + currentPageOffsetFraction` を draw phase で読み、再コンポーズを起こさない。
- 上部クロームは `WindowInsets.safeDrawing` を外側コンテナで確保し、戻るボタンやタイトルの固定高さと inset を共有しない。
- task row の幾何は `TaskListDetailMetrics` に集約し、個別の `offset` で位置を合わせない。本文系テキストは共通の `TextStyle`（`includeFontPadding = false` + 固定 line height）で言語・font fallback による高さの揺れを吸収する。
- 取り消し線は `StrikethroughText`（`drawWithContent` + `TextLayoutResult` の行ごと描画）、件数は `RollingCountText`、行の追加・削除・配置は `Modifier.animateItem`、アイコン切替は `Crossfade`。
- task action は `AppSheet` + `AppMonthCalendar` で、TalkBack 用に `paneTitle` を設定する。
- 件数・設定値・アクセシビリティ文言も shared locale の key で解決する（`taskList.remainingCount_one` / `_other` の複数形を含む）。`system` / `top` などの raw value を表示しない。

## ジェスチャー

- `pointerInput` の key や detector 本体に再コンポーズごとに変わる lambda を渡さない。callback は `rememberUpdatedState` で参照し、`onDragEnd = { currentOnDragEnd() }` のように lambda 内で呼ぶ（`onDragEnd = currentOnDragEnd` と値で渡すと開始時の callback に固定され、古い `displayTasks` から差分を作って並び替えが元に戻る）。
- 本文の長押し並び替えは、本文の `clickable` より後ろに `pointerInput` + `detectDragGesturesAfterLongPress` を置く（後ろの modifier が先に up を消費して編集開始の click を止める）。長押し成立前の `LazyColumn` / `HorizontalPager` の移動で長押しは取り消されるため、スクロールやページ切替を別途止めない。
- `detectDragGesturesAfterLongPress` は coroutine が取り消されても `onDragCancel` を呼ぶため、自動スクロールで画面外の行が破棄されるとその行の `onDragCancel` が届く。`onDragCancel` は `draggingTaskId` が自分の task のときだけドラッグ状態を解除する。

## 状態・Firebase

- `MainActivity.onCreate` の `configureFirestore()` で `PersistentCacheSettings`（`CACHE_SIZE_UNLIMITED`）を設定する。設定は Firestore の初回利用前に 1 回だけ（Activity の再生成で再設定すると例外になる）。
- 起動: `warmUpStartupData()` が background thread で `Translations.preload()` と cache の先読みを行う。設定値は `StartupSettingsCache`（SharedPreferences `lightlist.startup`、uid 付き）から初回フレームで使い、起動時の分岐は `isStartupPending` だけを待つ。起動時の自動遷移（`isInitialAutoNavigation()`）にはスライドアニメーションを付けない。`Translations` は初回描画前にロード済みのインスタンスを `CompositionLocal` で渡す（翻訳 key の生表示を避ける）。
- `subscribeToOrderedTaskLists` は order の snapshot で taskLists の購読を張り直さない。tablet ではルートの settings と一覧の購読を子へ渡し、二重に購読しない。
- task の mutation queue は Composition の `rememberCoroutineScope` ではなく `TaskListMutationQueues`（プロセス内の taskListId 登録）で保持する（画面移動で待機中の書き込みをキャンセルしない）。書き込みの `Task` を Composition の scope で `await` して UI を待たせない。
- カレンダーの pending は `taskListId` ごとの全タスク配列と履歴を保持し、連続操作の差分を listener の旧配列から計算しない。日付計算は `currentGregorianCalendar()` を使い、`Calendar.getInstance()` に戻さない。
- 前景復帰: SDK は自身を online と判定している間は接続を張り直さないため、`onStop` から 30 秒以上経った `onStart` で `restartFirestoreNetworkAfterBackground` を実行する（Activity が作り直されても効くようプロセス内の変数で保持する）。
- オンライン判定は `rememberIsOnline()`（manifest に `ACCESS_NETWORK_STATE`）、同期失敗は `SyncFailureState.report()`、queue 外の batch は `commitReportingFailure`。
- 認証フォームの `AuthTextField` には Autofill 用の `contentType` を必ず設定する（サインインは既存資格情報、サインアップ / リセットは新規資格情報）。
- 通知端末の登録はルートの認証・設定の確定を起点に更新する（`onNewToken()` だけでは token が変わらない再ログインを検知できない）。

## 主要コマンド

- `just lint` / `just build` / `just build-release`（内部確認用 APK。署名情報がなければ debug keystore）
- `just bundle`（Play 提出用 AAB を upload key で署名し `just verify-bundle` で検証）
- `just run`（上書きインストールでログインを保持）/ `just run-clean`（アプリデータを消して入れ直す）
- `just emulator <AVD名>` / `just emulator-list`、`just screenshot`
- `just keystore-create` / `just signing-report`
