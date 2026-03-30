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

run-all:
  just android
  just ios
  just web

deploy-firestore:
  firebase --config ./firebase.json deploy --only firestore:rules,firestore:indexes

deploy-firestore-prod:
  firebase --config ./firebase.json deploy --only firestore:rules,firestore:indexes --project prod
