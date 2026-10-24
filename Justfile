set shell := ["zsh", "-cu"]

default:
  @just --list

android:
  cd apps/android && just build && just run

bundle:
  cd apps/android && just bundle

emulator target='Pixel_9_API_35':
  cd apps/android && just emulator "{{target}}"

ios:
  cd apps/ios && just build && just run

simulator target='DEACF1DB-C035-439D-BB01-D07B25C7B8A7':
  cd apps/ios && just simulator "{{target}}"

native:
  just android
  just ios

web:
  just _node apps/web npm --prefix apps/web run dev

check-web:
  just _node apps/web npm --prefix apps/web run check
  just _node apps/web npm --prefix apps/web run build

check-functions:
  just _node functions npm --prefix functions run build
  just _node functions-billing npm --prefix functions-billing run build

audit-web:
  just _node apps/web npm --prefix apps/web audit

audit-functions:
  #!/usr/bin/env zsh
  audit_status=0
  just _node functions npm --prefix functions audit || audit_status=1
  just _node functions-billing npm --prefix functions-billing audit || audit_status=1
  exit "$audit_status"

screenshots target='all':
  just _node apps/web npm --prefix apps/web run screenshots:generate -- {{target}}

run-all:
  just android
  just ios
  just web

deploy-firebase environment='dev':
  #!/usr/bin/env zsh
  set -eu
  project="$(just _firebase-project {{environment}})"
  just _node functions firebase --config ./firebase.json deploy --project "$project"

backfill-share-previews environment='dev':
  #!/usr/bin/env zsh
  set -eu
  project="$(just _firebase-project {{environment}})"
  just _node functions npm --prefix functions run build
  just _node functions node functions/scripts/backfill-share-previews.mjs "$project"

_firebase-project environment:
  #!/usr/bin/env zsh
  case '{{environment}}' in
    dev) echo lightlist-dev ;;
    prod) echo lightlist-prod-b0269 ;;
    *) echo "環境は dev または prod を指定してください" >&2; exit 1 ;;
  esac

_node directory +command:
  #!/usr/bin/env zsh
  set -eu
  if command -v fnm >/dev/null; then
    exec fnm exec --using={{directory}}/.node-version -- {{command}}
  fi
  exec {{command}}

loc:
  @echo "Web (TypeScript/TSX):"
  @find apps/web/src apps/web/html -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -path "apps/web/src/lp.ts" -exec cat {} + | wc -l
  @echo "Android (Kotlin/XML):"
  @find apps/android/app/src/main -type f \( -name "*.kt" -o -name "*.xml" \) -exec cat {} + | wc -l
  @echo "iOS (Swift):"
  @find apps/ios/Lightlist/Sources -type f -name "*.swift" -exec cat {} + | wc -l
