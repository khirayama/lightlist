-   event handlerの命名
    -   eventオブジェクトが引数に渡される場合はonXXX
    -   eventオブジェクトが引数に渡される場合はhandleXXX

## ディレクトリ構成

```
- app: ビジネスロジックやドメインを扱う。
    - hooks: servicesなどを扱い、documentなどブラウザ環境に依存しない
    - components: app hooksを利用するコンポーネント。uiコンポーネントに依存して良い
    - services: 外部APIとの通信を行う
- ui: ユーザに提供するインターフェースを扱う。appには依存しない
    - hooks: app hooksを利用しないhooks
    - components: ui hooksを利用するコンポーネント
- common: 上記以外、上記を跨ぐ、上記で共通するものを扱う。appに依存してもよい、appに依存されてもよい
    - hooks: app hooksを利用するhooks
```

-   hooksに関して
    -   documentやelementを扱う場合はuiディレクトリに配置する
    -   documentやelementを扱い、app hooksを利用する場合はcommonディレクトリに配置する
