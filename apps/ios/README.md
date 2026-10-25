# Lightlist iOS

```sh
just build          # xcodegen generate + Debug build（simulator）
just run            # 起動中の simulator へインストールして起動
just build-release  # Release build（simulator）
just archive        # App Store 提出用 IPA（build-archive/export/Lightlist.ipa）
just upload         # App Store Connect へアップロード
```

Firebase の `GoogleService-Info.plist` は `Lightlist/Resources/Firebase/{Debug,Release}/` に置く（gitignore 対象）。提出手順は [docs/release-ios.md](../../docs/release-ios.md) を参照する。
