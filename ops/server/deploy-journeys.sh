#!/usr/bin/env bash
# Auto-deploy poller for the journeys-web frontend container (mirrors TheNewsRoom's
# deploy-newsroom.sh). Installed in wjaegle's crontab on nateception-server.
#
# Pulls main only when the remote moved, then rebuilds the container. Because
# `up -d --build` only swaps the container if the new image builds, a broken
# commit can't take the site down. The compose file is at the repo root.
set -euo pipefail

REPO="$HOME/projects/living-journeys"
LOG="$HOME/logs/journeys-deploy.log"
mkdir -p "$(dirname "$LOG")"

cd "$REPO"
git fetch -q origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
[ "$LOCAL" = "$REMOTE" ] && exit 0

{
  echo "[$(date -Is)] deploying $LOCAL -> $REMOTE"
  git pull -q --ff-only origin main
  docker compose up -d --build
  docker image prune -f
  echo "[$(date -Is)] deploy OK ($(git rev-parse --short HEAD))"
} >>"$LOG" 2>&1
