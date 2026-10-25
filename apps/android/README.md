# Lightlist Android

```sh
just build          # debug APK
just run            # 接続中の端末・emulator へ上書きインストールして起動
just build-release  # 内部確認用 release APK（app/build/outputs/apk/release/app-release.apk）
just bundle         # Google Play 提出用 AAB（app/build/outputs/bundle/release/app-release.aab）
```

署名情報の管理は [docs/release-android.md](../../docs/release-android.md) を参照する（keystore のパスと alias は `apps/android/.env.local`、パスワードは login Keychain）。
