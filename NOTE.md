## TODO

- [x] /
    - [x] i18nサポート
- [x] /login
    - [x] i18nサポート
- [x] /reset-password
    - [x] 実装する
- [ ] /new#/home
    - [ ] paramsのtaskListIdに合わせてtasklistをスクロール
    - [ ] 並び替えがなんかバグってるぽい？たまに変
    - [ ] mobileで、2つめ以降のtask listで、taskをソートした時、スクロールxが0になる
- [x] /new#/menu
- [ ] /new#/settings
    - [x] i18nの定義
    - [ ] change passwordを実装
    - [ ] logoutを実装
    - [ ] delete accountを実装
- [ ] /new#/sharing/:taskListId
    - [ ] shareCodeの更新
    - [ ] 他のアプリで共有の動作確認
- [x] /new#/task-lists/:taskListId/tasks/:taskId/date
- [ ] /new#/404
    - [ ] 実装する
- [ ] /share
    - [ ] 実装する
- [ ] 全体
    - [ ] i18nの見直し
    - [ ] themeの見直し
    - [ ] tailwindの見直し https://future-architect.github.io/articles/20250314a/

## Platform & Devices

- desktop
    - MacOS
    - Windows
- tablet
    - iPadOS
    - Android
    - Windows
- mobile
    - iOS
    - Android

## UI

mouse, touch, keyboard, software keyboard, screensize

## 想像すべきデバイス

- MacBook
- iPad
- iPhone
- タッチパネルのWindows
- キーボード、マウスを接続したiPad

## リストの仕様

### 一般

- [ ] タスクを下に追加
- [ ] タスクを上に追加
- [ ] タスクの完了
- [ ] カーソル移動
- [ ] タスクの並び替え
- [ ] タスクの更新
- [ ] タスクに日付を追加
- [ ] タスクの日付を削除
- [ ] タスクのソート
- [ ] 完了タスクの削除

### ショートカット

- [ ] タスクを下に追加
- [ ] タスクを上に追加
- [ ] タスクの完了
- [ ] カーソル移動
- [ ] タスクの並び替え
- [ ] タスクに日付を追加
- [ ] タスクの日付を削除
- [ ] タスクのソート
- [ ] 完了タスクの削除

## ノート

### 設計

- components配下で、components/primitiviesに含まれないcomponentsは、globalStateを直接参照することができる

### 参考

- [dnd-kitを使ってリストの並び替えを実装する](https://zenn.dev/wintyo/articles/d39841c63cc9c9)
- [yjsのCRDT論](https://zenn.dev/miyanokomiya/scraps/32b096c2252cd2)
- [Getting started | React Navigation](https://reactnavigation.org/docs/hello-react-navigation?config=static)
- [File-based routing - Expo Documentation](https://docs.expo.dev/develop/file-based-routing/)
