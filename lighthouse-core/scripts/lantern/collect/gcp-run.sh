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
git checkout -f origin/patrick_collect_gcp
yarn install

# Setup xvfb for lighthouse
export DISPLAY=:99
Xvfb $DISPLAY &
sleep 5

# Import WPT_KEY vars
source /home/lighthouse/.env

# Run the collection
DEBUG=1 SAMPLES=9 node --max-old-space-size=4096 ./lighthouse-core/scripts/lantern/collect/collect.js

# Kill xvfb
kill $!
