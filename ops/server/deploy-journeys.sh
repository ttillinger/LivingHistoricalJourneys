#!/usr/bin/env bash
# Auto-deploy poller for the journeys-web frontend container (mirrors TheNewsRoom's
# deploy-newsroom.sh). wjaegle's crontab on nateception-server runs this copy, in the
# checkout, so a change to this file takes effect once it has itself been deployed.
#
# Pulls main only when the remote moved AND GitHub's checks on that commit are green,
# then rebuilds the container. Because `up -d --build` only swaps the container if the
# new image builds, a broken commit can't take the site down. The compose file is at
# the repo root.
set -euo pipefail

REPO="$HOME/projects/living-journeys"
LOG="$HOME/logs/journeys-deploy.log"
HOLD="$HOME/.journeys-deploy-hold"
GITHUB_REPO="ttillinger/LivingHistoricalJourneys"
# The CI jobs a commit must pass (job names in .github/workflows/ci.yml).
REQUIRED="verify e2e"
mkdir -p "$(dirname "$LOG")"

cd "$REPO"
git fetch -q origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
[ "$LOCAL" = "$REMOTE" ] && exit 0

# Nothing lands on the server before its checks pass. Anything other than a clear
# "success" for every required job — still running, failed, GitHub unreachable —
# holds the deploy until a later tick. The repo is public, so no token is needed.
STATE=""
if CHECKS=$(curl -fsS -m 20 -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$GITHUB_REPO/commits/$REMOTE/check-runs?per_page=100" 2>/dev/null); then
  for job in $REQUIRED; do
    result=$(jq -r --arg n "$job" \
      '[.check_runs[] | select(.name == $n)] | sort_by(.started_at) | last
       | if . == null then "missing" else (.conclusion // .status) end' <<<"$CHECKS")
    STATE="$STATE $job=$result"
  done
else
  STATE=" github=unreachable"
fi

GREEN=""
for job in $REQUIRED; do GREEN="$GREEN $job=success"; done
if [ "$STATE" != "$GREEN" ]; then
  # One log line per change of state, not one per tick.
  NOTE="$REMOTE$STATE"
  if [ "$(cat "$HOLD" 2>/dev/null || true)" != "$NOTE" ]; then
    echo "[$(date -Is)] holding ${REMOTE:0:7}: checks not green ($STATE )" >>"$LOG"
    echo "$NOTE" >"$HOLD"
  fi
  exit 0
fi
rm -f "$HOLD"

{
  echo "[$(date -Is)] deploying $LOCAL -> $REMOTE"
  git pull -q --ff-only origin main
  docker compose up -d --build
  docker image prune -f
  echo "[$(date -Is)] deploy OK ($(git rev-parse --short HEAD))"
} >>"$LOG" 2>&1
