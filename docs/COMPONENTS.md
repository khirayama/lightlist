# コンポーネント

## ディレクトリ

- `apps/web/src/components/ui`
  - Web の汎用 UI。`Alert`、`Dialog`、`Drawer`、`Spinner`、`Carousel`、`Calendar`、`ColorPicker` など。
- `apps/web/src/components/app`
  - Web のタスクドメイン UI。共有が残るものだけを置き、2026-03 時点では `TaskListCard` を主対象とする。
- `apps/web/src/pages`
  - 画面専用 UI はページへ近接配置する。`app.tsx` は drawer / calendar sheet を内包し、`_app.tsx` は `ErrorBoundary` と `StartupSplash` を内包する。`login.tsx` / `password_reset.tsx` / `settings.tsx` も専用入力 UI や確認 dialog をページ内に持つ。
- `apps/web/src/lib`
  - 共有状態・Firebase 連携・購読・mutation を置く。1 ファイル専用 utility は専用側へ戻し、2026-03 時点ではタスク追加時の日付抽出を `lib/mutations/app.ts` 内へ内包する。

## 固定ルール

- Firebase や appStore に触る UI は `app` 側へ置きます。
- 汎用 UI は `ui` 側へ置きます。
- Web / iOS で共通にしたい props 名はできるだけ揃えます。
- 画面固有、または 1〜2 箇所でしか使わない UI / helper / hook は無理に切り出さず、ページまたは直近のドメインファイルへ寄せます。

## Web

- `_app.tsx` 内の `ErrorBoundary` はクラスコンポーネントなので `withTranslation()` で i18n を注入します。
- `_app.tsx` 内の `StartupSplash` は固定ラベル `読み込み中` を使います。
- `Carousel` は `direction` を受け取り、RTL の `scrollLeft` 差分を吸収します。
- `pages/app.tsx` は app ドメインの drawer / task list index / calendar sheet をまとめて持ち、`TaskListCard` だけを共有コンポーネントとして使います。
- `TaskListCard` はタスク行、候補ポップオーバー、日付選択 popover を内包し、`components/app` 配下で自己完結させます。

## iOS

- `apps/ios/Lightlist/Views/App/SideDrawer.swift` は compact 幅専用の汎用オーバーレイドロワーです。`layoutDirection` に応じて左右を反転し、`DrawerPanel` を包み、本体コンテンツとドロワーを縦方向も上揃えで配置します。
- `DrawerPanel` は iPhone の `SideDrawer` と iPad の `NavigationSplitView` サイドバーで共用します。
- `apps/ios/Lightlist/Views/Main/MainView.swift` は `GeometryReader` のサイズを親レイアウトと `TabView(.page)` の各ページへ固定し、内部の LazyView / HostingView を含むタスクリスト画面が上下中央寄せにならないよう全高を維持します。
- `MainView` は compact 幅では `Color(.systemBackground)` を画面全体と `TabView(.page)` コンテナ背景へ適用し、status bar 直下から下端まで白い本文面を連続させます。regular 幅のみ現在選択中のタスクリスト背景色を外周背景として使います。
- compact 幅のタスクリスト画面は `TaskListView` 自身を full screen コンテナとして扱い、最外層に `Color(.systemBackground)` を `ignoresSafeArea()` で全面へ敷きます。本体は画面いっぱいの `VStack` を同じ白背景で満たし、上部 chrome の操作 UI だけ `GeometryReader.safeAreaInsets.top` 起点で status bar を避け、タスク行は full-width の `ScrollView + LazyVStack` でカード化せず edge-to-edge に描画します。
- `SettingsView` と `ShareCodeView` は sheet ではなく `RootView` 配下の全画面ルートとして扱います。
- `SafeAreaNavigationHeader` は iPhone の全画面画面と sheet / dialog で使う共通ヘッダーです。標準ナビゲーションバーを使わず、背景だけをノッチ下まで伸ばしたまま操作 UI を safe area に保持します。
- iOS の全画面ルートは `RootView` を含めて `frame(maxWidth: .infinity, maxHeight: .infinity)` を維持し、背景ビュー側だけで `ignoresSafeArea()` を使って画面全体を埋めます。
- `apps/ios/Lightlist/LightlistApp.swift` は hidden `UIViewRepresentable` の `WindowSceneConfigurator` で attach 済み `UIWindow` を監視し、window 背景色と root view controller の safe area / layout margins を初期化します。
- `AuthView` / `PasswordResetView` のような `ScrollView` ベースの全画面フォームは、カードラッパーを持たずに画面直下の full screen コンテナとして構成します。必要な余白はコンテンツ内部の `padding` で与え、外側の `maxWidth` 制約や `RoundedRectangle` でカード化しません。
- iOS の custom header 付き画面と sheet / dialog は、header を `safeAreaInset(edge: .top)` に載せ、本文 root も `frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)` で detent / 画面高いっぱいまで広げます。header inset と二重になる本文先頭の大きな `padding(.top)` は避け、視覚余白は最小限に保ちます。
