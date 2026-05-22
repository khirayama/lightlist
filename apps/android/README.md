```sh
just build
just build-release
just bundle-play
just emulator Pixel_9_API_35
just run

just run emulator-5554
just emulator Medium_Phone_API_36.1
```

- `just build-release` は内部配布確認用の署名済み release APK を生成する。
- 生成物は `apps/android/app/build/outputs/apk/release/app-release.apk`。
- `just bundle-play` は Google Play 提出用の署名済み release AAB を生成する。
- 生成物は `apps/android/app/build/outputs/bundle/release/app-release.aab`。
- `just bundle-play` は `LIGHTLIST_ANDROID_KEYSTORE`、`LIGHTLIST_ANDROID_KEYSTORE_PASSWORD`、`LIGHTLIST_ANDROID_KEY_ALIAS`、`LIGHTLIST_ANDROID_KEY_PASSWORD` を Gradle property または環境変数として必要とする。
- App Check は release 扱いのままなので、Firebase 通信は Play Integrity 前提で動作する。

## Current UI

- The app opens on the `TaskLists` page after login.
- The `TaskLists` page subscribes to Firestore `taskListOrder/{uid}` and `taskLists/{taskListId}` and shows task lists in that order.
- Tapping a task list opens `TaskList` details at the selected list, and the detail page supports horizontal paging across neighboring task lists.
- The `TaskList` page subscribes to the same ordered task lists, shows tasks in each list, and keeps the selected page in sync with the current task list.
- The `TaskLists` page allows navigation to `Settings`.
