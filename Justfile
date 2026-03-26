set shell := ["zsh", "-cu"]

run-android:
  cd apps/android && just build && just run

run-ios:
  cd apps/ios && just build && just run

run-native:
  just run-android
  just run-ios

run-web:
  cd apps/web && npm run dev

run-all:
  just run-android
  just run-ios
  npm run dev

deploy-firestore:
  firebase --config ./firebase.json deploy --only firestore:rules,firestore:indexes

deploy-firestore-prod:
  firebase --config ./firebase.json deploy --only firestore:rules,firestore:indexes --project prod
