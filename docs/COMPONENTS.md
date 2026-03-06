# コンポーネント

## ディレクトリ

- `apps/web/src/components/ui`
  - Web の汎用 UI。`Alert`、`Dialog`、`Drawer`、`FormInput`、`Spinner`、`StartupSplash`、`Carousel` など。
- `apps/web/src/components/app`
  - Web のタスクドメイン UI。`TaskListCard`、`TaskItem`、`DrawerPanel`、`CalendarSheet`。
- `apps/native/src/components/ui`
  - Native の汎用 UI。`Dialog`、`AppIcon`、`StartupSplash`、`Carousel`、`ErrorBoundary`。
- `apps/native/src/components/app`
  - Native のタスクドメイン UI。`TaskListCard`、`TaskItem`、`DrawerPanel`、`CalendarSheet`。

## 固定ルール

- Firebase や appStore に触る UI は `app` 側へ置きます。
- 汎用 UI は `ui` 側へ置きます。
- Web / Native で共通にしたい props 名はできるだけ揃えます。
- 画面固有でしか使わないものは無理に切り出しません。

## Web

- `ErrorBoundary` はクラスコンポーネントなので `withTranslation()` で i18n を注入します。
- `StartupSplash` は固定ラベル `読み込み中` を使います。
- `Carousel` は `direction` を受け取り、RTL の `scrollLeft` 差分を吸収します。
- `AppShell` はスキップリンクと `main#main-content` を前提にします。

## Native

- `Carousel` は `AppDirectionProvider` の `uiDirection` を使います。
- `Pressable` ベースのカスタム操作には `accessibilityRole` と `accessibilityLabel` を付けます。
- `Dialog` の背景スクラムは既定で読み上げ対象外です。
