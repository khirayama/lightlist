# コンポーネント構成

## Web

- `apps/web/src/components/ui`
  - 複数画面で再利用する汎用 UI を置く。
  - 現在は `Alert`、`AppIcon`、`BrandLogo`、`Calendar`、`Carousel`、`ColorPicker`、`Dialog`、`Drawer`、`Spinner` がある。
- `apps/web/src/components/app`
  - タスクドメインの共有 UI を置く。
  - 現在は `TaskListCard.tsx` のみ。
- `apps/web/src/pages`
  - 画面専用 UI をページへ近接配置する。
  - `app.tsx` は `DrawerPanel`、`AppHeader`、`CalendarSheet` などページ専用 UI を同居させている。
  - `login.tsx`、`password_reset.tsx`、`settings.tsx` も専用フォームをファイル内に持つ。
- `apps/web/src/pages/_app.tsx`
  - `ErrorBoundary`、PWA 用 `<Head>`、テーマ反映、言語方向同期、service worker 登録を担当する。

## Web の固定ルール

- Firebase / Firestore へ直接触るロジックは `@/lib/*` に寄せる。
- 再利用前提の UI だけ `components/*` に置く。
- 画面専用 UI / helper / hook は無理に分離しない。

## iOS

- 現在の iOS UI は `apps/ios/Lightlist/Sources/ContentView.swift` に集約している。
- アプリ起動と Firebase 初期化は `apps/ios/Lightlist/Sources/LightlistApp.swift`。
- Analytics は `apps/ios/Lightlist/Sources/Analytics.swift`。
- 翻訳ロードは `apps/ios/Lightlist/Sources/Translations.swift`。

## Android

- 現在の Android UI は `apps/android/app/src/main/java/com/example/lightlist/ContentView.kt` に集約している。
- Activity 起動処理は `apps/android/app/src/main/java/com/example/lightlist/MainActivity.kt`。
- Analytics は `apps/android/app/src/main/java/com/example/lightlist/Analytics.kt`。
- 翻訳ロードは `apps/android/app/src/main/java/com/example/lightlist/Translations.kt`。
