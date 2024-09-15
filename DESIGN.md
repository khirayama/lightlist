-   event handlerの命名
    -   eventオブジェクトが引数に渡される場合はonXXX
    -   eventオブジェクトが引数に渡される場合はhandleXXX

## ディレクトリ構成

```
- hooks
    - app: servicesなどを扱い、documentなどブラウザ環境に依存しない
    - ui: documentなどブラウザ環境やcomponents/primitivesでの利用が想定されるがapp hooksは利用しない
    - composites: app hooksに依存してよく、documentやelementも扱って良い
- components
    - app: app hooksを利用するコンポーネント。primitivesコンポーネントに依存して良い
    - primitives: primitiveなコンポーネント。ui hooksのみ依存して良い
- common
```

-   hooksに関して
    -   documentやelementを扱う場合はuiディレクトリに配置する
    -   documentやelementを扱い、app hooksを利用する場合はcommonディレクトリに配置する
