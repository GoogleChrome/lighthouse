#!/bin/bash

set -euxo pipefail

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

whoami
export HOME="/home/lighthouse"
cd /home/lighthouse

# Import LIGHTHOUSE_GIT_REF vars
source /home/lighthouse/.env

mkdir src/
cd ./src
git clone https://github.com/GoogleChrome/lighthouse.git
cd ./lighthouse
git checkout -f "$LIGHTHOUSE_GIT_REF"

sudo yarn --frozen-lockfile
sudo yarn build-report
sudo yarn link

cd /home/lighthouse

OLDIFS=$IFS
IFS=$'\n'
for url in $(cat urls.txt)
do
  if [[ "$url" == "#"* ]]; then
    echo "COMMENT: $url"
    continue
  fi

  echo "---------------------------------"
  echo "----- $url -----"
  echo "---------------------------------"
  bash ./run-on-url.sh "$url" || echo "Run on $url failed :("
done
IFS=$OLDIFS

cp urls.txt data/
tar -czf trace-data.tar.gz data/
find data/ -name "lhr.json" -o -name "*.txt" | tar -czf lhr-data.tar.gz -T -

echo "Run complete!"
