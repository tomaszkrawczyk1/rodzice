#!/usr/bin/env bash
# Wdrożenie na serwer (SSH: alias "srv"). Parametry edytowane w panelu admina (data/parametry.json) NIE są nadpisywane.
set -euo pipefail
HOST=${HOST:-srv}; BASE=${BASE:-/home/srv/rodzice}
cd "$(dirname "$0")/.."
npm run build
rm -rf .deploy && mkdir -p .deploy/.next
cp -r .next/standalone/. .deploy/
cp -r .next/static .deploy/.next/static
cp -r public .deploy/public
ssh "$HOST" "mkdir -p $BASE/app $BASE/data $BASE/proxy"
rsync -az --delete .deploy/ "$HOST:$BASE/app/"
rsync -az data/personas data/scenariusze.json "$HOST:$BASE/data/"
rsync -az --ignore-existing data/parametry.json "$HOST:$BASE/data/"
rsync -az proxy/ "$HOST:$BASE/proxy/"
ssh "$HOST" "sudo systemctl restart rodzice rodzice-llm && sleep 2 && systemctl is-active rodzice rodzice-llm"
echo "OK: wdrożono"
