# タスク管理アプリ SDK設計書

## 目次

- [概要](#概要)
- [1. 型定義](#1-型定義)
- [2. Services層（API通信層）](#2-services層api通信層)
- [3. Actions層（ビジネスロジック層）](#3-actions層ビジネスロジック層)
- [4. 内部アーキテクチャ（CRDT統合（lib/crdt）とCollaborative機能）](#4-内部アーキテクチャcrdt統合libcrdtとcollaborative機能)
- [5. Store層（状態管理）](#5-store層状態管理)
- [6. エラーハンドリングとリカバリー機能](#6-エラーハンドリングとリカバリー機能)
- [7. メインSDKインターフェース](#7-メインsdkインターフェース)
- [8. 使用例](#8-使用例)
- [9. 実装上の注意点](#9-実装上の注意点)

## 概要

- SDKはReact/React Nativeに依存しません。プラットフォーム依存点（Platform.OS, AppState）はアダプタ経由で注入します。
- Androidエミュレータのlocalhost解決は configure({ platformOS: 'android' }) 指定時のみ10.0.2.2へ切替。
- AppState監視は configure({ appStateSubscribe }) により任意の環境で有効化できます。

## 5. Store層（状態管理）

- store.configure(options)
  - getToken?: () => Promise<string | null>
  - baseUrl?: string
  - platformOS?: 'android' | 'ios' | 'web' | 'node'
  - appStateSubscribe?: (handler: (state: 'active' | 'inactive' | 'background' | string) => void) => { remove: () => void }
- startPolling({ intervalMs?: number, appState?: boolean })
  - appState=true かつ appStateSubscribe が提供されている場合のみ、active遷移で自動リフレッシュ。

## 7. メインSDKインターフェース

- settingsStore.configure({ getToken, baseUrl, platformOS })
- taskListsStore.configure({ getToken, baseUrl, platformOS })
- store.configure({ getToken, baseUrl, platformOS, appStateSubscribe })

## 使用例（React Native側でのアダプタ注入）

```ts
import { store } from '@lightlist/sdk';
import { AppState, Platform } from 'react-native';

store.configure({
  platformOS: Platform.OS as 'android' | 'ios' | 'web' | 'node',
  appStateSubscribe: handler => AppState.addEventListener('change', handler),
});
```
