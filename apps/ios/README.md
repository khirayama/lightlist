# Lightlist iOS

```sh
just build          # xcodegen generate + Debug build（simulator）
just simulator      # simulator を起動して DeviceHub で表示（既定は iPhone 17）
just run            # 起動中の simulator へインストールして起動（複数起動中は名前か UDID を指定）
just build-release  # Release build（simulator）
just archive        # App Store 提出用 IPA（build-archive/export/Lightlist.ipa）
just upload         # App Store Connect へアップロード
```

Firebase の `GoogleService-Info.plist` は `Lightlist/Resources/Firebase/{Debug,Release}/` に置く（gitignore 対象）。提出手順は [docs/release-ios.md](../../docs/release-ios.md) を参照する。
