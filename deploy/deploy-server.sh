#!/usr/bin/env bash
# Uruchamiane NA SERWERZE przez webhook: pobiera main, testuje, buduje i podmienia aplikację.
# Parametry edytowane w panelu admina (data/parametry.json) nie są nadpisywane.
set -euo pipefail
BASE=/home/srv/rodzice; SRC=$BASE/src
REPO=${REPO_URL:-https://github.com/tomaszkrawczyk1/rodzice.git}
[ -d "$SRC/.git" ] || git clone --depth 50 "$REPO" "$SRC"
cd "$SRC"
git fetch --depth 50 origin main && git reset --hard origin/main
echo "commit: $(git log --oneline -1)"
npm ci --no-audit --no-fund
npm test | tail -1
npm run weryfikuj | tail -1
npm run build
rm -rf .deploy && mkdir -p .deploy/.next
cp -r .next/standalone/. .deploy/
cp -r .next/static .deploy/.next/static
cp -r public .deploy/public
mkdir -p $BASE/app $BASE/data $BASE/proxy
rsync -a --delete .deploy/ $BASE/app/
rsync -a data/personas data/scenariusze.json $BASE/data/
rsync -a --ignore-existing data/parametry.json $BASE/data/
rsync -a proxy/ $BASE/proxy/
sudo systemctl restart rodzice rodzice-llm
sleep 2; systemctl is-active rodzice rodzice-llm
echo "OK: wdrożono $(date -Is)"
