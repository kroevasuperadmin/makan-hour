#!/usr/bin/env bash
# Builds the web app and deploys dist + api + vercel.json to Vercel project makan-hour-app (production).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/makan-hour" && npx expo export --platform web
OUT="$(mktemp -d)"; mkdir -p "$OUT/app"; cp -r dist/. "$OUT/app/"; cp -r api "$OUT/api"; cp vercel.json "$OUT/"
mkdir -p "$OUT/.vercel"; echo '{"projectId":"prj_HXRDI1NW0YZ0IKWyNik0PexYRWGl","orgId":"team_kVMAGlmk40feE1HSiBSaml9L"}' > "$OUT/.vercel/project.json"
cd "$OUT" && vercel deploy --prod --yes ${VERCEL_TOKEN:+--token "$VERCEL_TOKEN"}
