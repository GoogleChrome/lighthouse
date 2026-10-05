#!/bin/bash

set -euxo pipefail

whoami
export HOME="/home/lighthouse"

cd /home/lighthouse
mkdir -p ./src
cd ./src

if [[ ! -d ./lighthouse ]]; then
  git clone https://github.com/GoogleChrome/lighthouse.git
fi

cd ./lighthouse

git fetch origin
# git checkout -f origin/main
git checkout -f origin/lantern-traces-2026
yarn install
yarn build-report

# Run the collection (includes golden generation and archiving)
CHROME_PATH=/usr/bin/google-chrome-canary DEBUG=1 xvfb-run node --max-old-space-size=4096 ./core/scripts/lantern/collect/collect.js

