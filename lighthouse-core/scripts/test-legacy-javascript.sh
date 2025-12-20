#!/usr/bin/env bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../.."
cd $LH_ROOT

set -e

# This test can be expensive, we'll only run the tests if we touched files that affect the simulations.
CHANGED_FILES=""
if [[ "$CI" ]]; then
  CHANGED_FILES=$(git --no-pager diff --name-only $TRAVIS_COMMIT_RANGE)
else
  CHANGED_FILES=$(git --no-pager diff --name-only master)
fi

printf "Determined the following files have been touched:\n\n$CHANGED_FILES\n\n"

if ! echo $CHANGED_FILES | grep -E 'legacy-javascript' > /dev/null; then
  echo "No legacy-javascript files affected, skipping test."
  exit 0
fi

printf "\n\nRunning test...\n"
cd "$LH_ROOT/lighthouse-core/scripts/legacy-javascript"
yarn
node run.js
