set shell := ["zsh", "-cu"]

default:
  @just --list

android:
  cd apps/android && just build && just run

ios:
  cd apps/ios && just build && just run

native:
  just android
  just ios

web:
  cd apps/web && npm run dev

screenshots target='all':
  cd apps/web && npm run screenshots:generate -- {{target}}

run-all:
  just android
  just ios
  just web

deploy-firestore:
  firebase --config ./firebase.json deploy --only firestore:rules,firestore:indexes

deploy-firestore-prod:
  firebase --config ./firebase.json deploy --only firestore:rules,firestore:indexes --project prod

loc:
  @echo "Web (TypeScript/TSX):"
  @find apps/web/src apps/web/html -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "apps/web/src/lp.ts" -exec cat {} + | wc -l
  @echo "Android (Kotlin/XML):"
  @find apps/android/app/src/main -type f \( -name "*.kt" -o -name "*.xml" \) -exec cat {} + | wc -l
  @echo "iOS (Swift):"
  @find apps/ios/Lightlist/Sources -type f -name "*.swift" -exec cat {} + | wc -l
