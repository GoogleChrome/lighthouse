#!/bin/bash

set -euxo pipefail

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

URL=$1
JS_REPLACE=".replace(/[^a-z0-9]+/g, '_').replace(/^https?_/, '')"
SAFE_URL=$(node -e "console.log('$URL'$JS_REPLACE)")

whoami
export HOME="/home/lighthouse"

cd /home/lighthouse
mkdir -p ./data
cd ./data

# Import NUMBER_OF_RUNS vars
source /home/lighthouse/.env

EXTRA_LIGHTHOUSE_FLAGS=${BASE_LIGHTHOUSE_FLAGS:-}

for (( i = 0; i < $NUMBER_OF_RUNS; i++ ))
do
  FOLDER_NAME="$SAFE_URL/$i"
  echo "Run $i on $URL..."
  if [[ -f "$FOLDER_NAME" ]]; then
    echo "$FOLDER_NAME already exists, skipping"
    continue
  fi

  LIGHTHOUSE_FLAGS="$EXTRA_LIGHTHOUSE_FLAGS --output=json --output-path=lhr.json -GA"

  xvfb-run lighthouse "$URL" $LIGHTHOUSE_FLAGS ||
    xvfb-run lighthouse "$URL" $LIGHTHOUSE_FLAGS ||
    xvfb-run lighthouse "$URL" $LIGHTHOUSE_FLAGS

  mv lhr.json ./latest-run
  mkdir -p "$SAFE_URL"
  mv ./latest-run "$FOLDER_NAME"
done

ls "$SAFE_URL"/*
