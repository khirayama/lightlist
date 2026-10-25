set shell := ["zsh", "-cu"]

default:
  @just --list

web:
  just _node apps/web npm --prefix apps/web run dev

ios:
  cd apps/ios && just build && just run

android:
  cd apps/android && just build && just run

dev:
  #!/usr/bin/env zsh
  set -eu
  just deploy-firebase dev
  pids=()
  trap 'kill $pids 2>/dev/null; wait' EXIT INT TERM
  just _node firebase/functions firebase/functions/node_modules/.bin/tsc -p firebase/functions --watch --preserveWatchOutput &
  pids+=($!)
  just _node firebase/functions firebase --config firebase/firebase.json emulators:start --only functions --project lightlist-dev &
  pids+=($!)
  just web &
  pids+=($!)
  wait

mcp-local:
  just _node firebase/functions npm --prefix firebase/functions run build
  just _node firebase/functions firebase --config firebase/firebase.json emulators:start --only functions --project lightlist-dev

check-web:
  just _node apps/web npm --prefix apps/web run check
  just _node apps/web npm --prefix apps/web run build

check-functions:
  just _node firebase/functions npm --prefix firebase/functions run build
  just _node firebase/functions-billing npm --prefix firebase/functions-billing run build

audit-web:
  just _node apps/web npm --prefix apps/web audit

audit-functions:
  #!/usr/bin/env zsh
  audit_status=0
  just _node firebase/functions npm --prefix firebase/functions audit || audit_status=1
  just _node firebase/functions-billing npm --prefix firebase/functions-billing audit || audit_status=1
  exit "$audit_status"

screenshots target='all':
  just _node apps/web npm --prefix apps/web run screenshots -- {{target}}

deploy-firebase environment='dev':
  #!/usr/bin/env zsh
  set -eu
  project="$(just _firebase-project {{environment}})"
  just _node firebase/functions firebase --config firebase/firebase.json deploy --project "$project"

deploy-billing:
  just _node firebase/functions-billing firebase --config firebase/firebase.billing.json deploy --only functions:billing-control --project lightlist-prod-b0269 --force

deploy-web:
  #!/usr/bin/env zsh
  set -eu
  grep -q '^VITE_FIREBASE_PROJECT_ID="\{0,1\}lightlist-prod-b0269' apps/web/.env.production.local \
    || { echo "apps/web/.env.production.local に本番の Firebase 設定を置いてください（雛形: .env.production.sample）" >&2; exit 1; }
  just _node apps/web npm --prefix apps/web run deploy

release:
  #!/usr/bin/env zsh
  set -eu
  [[ "$(git branch --show-current)" == main ]] || { echo "main ブランチで実行してください" >&2; exit 1; }
  [[ -z "$(git status --porcelain)" ]] || { echo "未コミットの変更があります" >&2; exit 1; }
  git fetch --quiet origin main
  [[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] || { echo "HEAD を origin/main と一致させてください" >&2; exit 1; }
  just check-functions
  just _node apps/web npm --prefix apps/web run check
  just deploy-firebase dev
  just deploy-firebase prod
  just deploy-web
  just verify-release

verify-release:
  #!/usr/bin/env zsh
  set -u
  for attempt in {1..12}; do
    mcp="$(curl -sS -o /dev/null -w '%{http_code}' -A 'Python-urllib/3.12' -X POST https://lightlist.app/mcp || true)"
    if [[ "$mcp" == 401 ]]; then
      echo "本番の /mcp を確認しました"
      exit 0
    fi
    sleep 5
  done
  echo "確認に失敗しました: /mcp=$mcp（401 を期待）" >&2
  exit 1

loc:
  @echo "Web (TypeScript/TSX):"
  @find apps/web/src -type f -name "*.tsx" -exec cat {} + | wc -l
  @echo "Android (Kotlin):"
  @find apps/android/app/src/main -type f -name "*.kt" -exec cat {} + | wc -l
  @echo "iOS (Swift):"
  @find apps/ios/Lightlist/Sources -type f -name "*.swift" -exec cat {} + | wc -l

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
