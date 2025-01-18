#!/usr/bin/env bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../.."
cd $LH_ROOT

set -e

# This test can be expensive, we'll only run the tests if we touched files that affect the simulations.
CHANGED_FILES=""
if [[ "$CI" ]]; then
  if [[ -z "$GITHUB_ACTIONS_COMMIT_RANGE" ]]; then echo "No commit range available!" && exit 1 ; fi
  CHANGED_FILES=$(git --no-pager diff --name-only "$GITHUB_ACTIONS_COMMIT_RANGE")
else
  CHANGED_FILES=$(git --no-pager diff --name-only main)
fi

printf "Determined the following files have been touched:\n\n$CHANGED_FILES\n\n"

if ! echo $CHANGED_FILES | grep -E 'legacy-javascript|js-bundles|source-map|SourceMap' > /dev/null; then
  echo "No legacy-javascript files affected, skipping test."
  exit 0
fi

printf "\n\nRunning test...\n"
cd "$LH_ROOT/core/scripts/legacy-javascript"
yarn

# This script will update the summary sizes file with the latest data.
node run.js

# We want to fail in CI if there are any changes.
if [[ -n "$CI" ]]; then
  git add summary-sizes.txt && git diff --cached --exit-code
fi

cd -
node core/scripts/legacy-javascript/create-polyfill-size-estimation.js
