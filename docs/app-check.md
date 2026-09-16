# Firebase App Check

Lightlist は Firebase App Check を使用しない。Web / iOS / Android のクライアントは App Check provider を初期化せず、Firebase Auth / Firestoreへ直接接続する。

Firebase ConsoleでApp Checkのenforcementを有効にしない。debug token、reCAPTCHA site key、App Attest、DeviceCheck、Play Integrityの登録も不要とする。
