#!/usr/bin/env bash
# Post-deploy smoke checks. Usage: scripts/smoke.sh <base-url>
# Checks content, not only status, so an SPA HTML fallback cannot pass as an asset.
# Sends no mail: the contact check posts {} and expects a validation error.
set -euo pipefail
base=${1:?usage: smoke.sh <base-url>}
body=$(mktemp)
fail=0

# check <name> <expected-status> <grep-pattern> <curl args...>
check() {
  local name=$1 want=$2 pattern=$3; shift 3
  local got
  got=$(curl -sS --max-time 20 -o "$body" -w '%{http_code}' "$@") || got=curl-error
  if [[ $got == "$want" ]] && LC_ALL=C grep -aq -- "$pattern" "$body"; then
    echo "ok   $name"
  else
    echo "FAIL $name: status $got, want $want and /$pattern/"
    fail=1
  fi
}

check /                 200 '<title>TaiwanHaul'        "$base/"
check /privacy          200 '<title>Privacy Notice'    "$base/privacy"
check /robots.txt       200 '^User-agent:'             "$base/robots.txt"
check /llms.txt         200 '^# TaiwanHaul'            "$base/llms.txt"
check font              200 '^wOF2'                    "$base/assets/fonts/TwemojiCountryFlags.woff2"
# Search: parse the JSON; an empty results array is valid (no match, or no collected data).
meta=$(curl -sS --max-time 20 -o "$body" -w '%{http_code} %{content_type}' "$base/api/search?q=pineapple%20cake&locale=en&market=SG") || meta=curl-error
type=${meta#* }; type=$(tr '[:upper:]' '[:lower:]' <<<"${type%%;*}")
if [[ ${meta%% *} == 200 && $type =~ ^[[:space:]]*application/json[[:space:]]*$ ]] \
  && jq -se 'length == 1 and (.[0].results | type == "array")' "$body" >/dev/null 2>&1; then
  echo "ok   /api/search"
else
  echo "FAIL /api/search: got $meta, want 200 application/json with one JSON document holding a results array"
  fail=1
fi
check /api/contact      400 '"error":"validation"'     -X POST -H 'Content-Type: application/json' -H "Origin: $base" -d '{}' "$base/api/contact"

exit $fail
