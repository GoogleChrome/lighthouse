#!/bin/bash

# Downloads the latest golden lantern data from gcloud.

set -e

VERSION="2019-12-17-v2"

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT_PATH="$DIRNAME/../../.."
cd $LH_ROOT_PATH

if ! [[ -f lantern-data/version ]] || [[ "$VERSION" != "$(cat lantern-data/version)" ]]; then
  if ! [[ "$CI" ]]; then
    echo "Version out of date. About to delete ./lantern-data..."
    echo "Press Space to continue, Ctrl+C to exit"
    read -n 1 -r unused_variable
  fi
  echo "Deleting old lantern data."
  rm -rf lantern-data/
fi

if [[ -f lantern-data/site-index-plus-golden-expectations.json ]] && ! [[ "$FORCE" ]]; then
  echo "Lantern data already detected, done."
  exit 0
fi

rm -rf lantern-data/
mkdir -p lantern-data/ && cd lantern-data

curl -o golden-lantern-traces.zip -L https://storage.googleapis.com/lh-lantern-data/golden-lantern-traces-$VERSION.zip

unzip -q golden-lantern-traces.zip
rm golden-lantern-traces.zip
echo $VERSION > version
