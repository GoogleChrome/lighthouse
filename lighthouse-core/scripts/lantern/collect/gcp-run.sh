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
git checkout -f origin/master
yarn install

# Import WPT_KEY vars
source /home/lighthouse/.env

# Run the collection
DEBUG=1 xvfb-run node --max-old-space-size=4096 ./lighthouse-core/scripts/lantern/collect/collect.js

# Create golden
DEBUG=1 node --max-old-space-size=4096 ./lighthouse-core/scripts/lantern/collect/golden.js

# Kill xvfb
kill $!
