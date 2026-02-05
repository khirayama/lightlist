# Lightlist POC

## モバイルアプリ (apps/native) の開発・ビルド環境

本プロジェクトでは、Expo Go から **EAS Dev Client** および **EAS Build** を利用した検証環境へ移行しています。

### 1. 検証環境の概要

- **EAS Dev Client**: ネイティブモジュールを含む開発用クライアント。実機での高度な検証が可能です。
- **Preview Build**: GitHub Actions により PR 作成時に自動生成される検証用ビルドです。
- **Environment Separation**: `APP_ENV` 変数により、開発 (dev)、検証 (staging)、本番 (production) の設定を切り替えています。
  - アプリ名や Bundle ID が環境ごとに変わるため、1台の端末に共存可能です。

### 2. セットアップ手順 (初回のみ)

1. **EAS CLI のインストール**
   ```bash
   npm install -g eas-cli
   ```

2. **Expo アカウントへのログイン**
   ```bash
   eas login
   ```

3. **プロジェクトの初期化 (projectId の取得)**
   ```bash
   cd apps/native
   eas init
   ```
   ※ `app.config.ts` の `projectId` が自動更新されます。

4. **GitHub Secrets の設定**
   GitHub リポジトリの Settings > Secrets and variables > Actions に以下を追加してください。
   - `EXPO_TOKEN`: Expo の管理画面から発行したアクセストークン。

### 3. 開発フロー

1. **ローカル開発 (Dev Client)**
   ネイティブコードに変更があった場合や、初回はビルドが必要です。
   ```bash
   cd apps/native
   # iOS (macOSのみ)
   npx expo run:ios
   # Android
   npx expo run:android
   ```
   起動後は `npx expo start --dev-client` で開発サーバーを立ち上げます。

2. **検証用ビルドの自動生成 (Preview Build)**
   - GitHub で `apps/native` または `packages/sdk` に変更を含む PR を作成します。
   - GitHub Actions (`.github/workflows/preview.yml`) が起動し、`eas build --profile preview` を実行します。
   - ビルド完了後、Expo Dashboard または PR のコメント（設定時）から QR コードを取得し、実機にインストールして確認します。

3. **手動での検証ビルド作成**
   ```bash
   cd apps/native
   eas build --profile preview --platform all
   ```

### 4. 環境の切り替え

`app.config.ts` 内で `process.env.APP_ENV` を参照しています。
EAS Build では `eas.json` の `env` セクションで定義されています。

- `production`: 本番用 (App Store / Play Store 配信)
- `staging`: 検証用 (内部配布用)
- `development`: ローカル開発用
