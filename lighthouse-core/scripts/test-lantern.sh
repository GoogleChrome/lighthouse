#!/usr/bin/env bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../.."
cd $LH_ROOT

set -e

# Testing lantern can be expensive, we'll only run the tests if we touched files that affect the simulations.
CHANGED_FILES=""
if [[ "$CI" ]]; then
  CHANGED_FILES=$(git --no-pager diff --name-only $TRAVIS_COMMIT_RANGE)
else
  CHANGED_FILES=$(git --no-pager diff --name-only master)
fi

printf "Determined the following files have been touched:\n\n$CHANGED_FILES\n\n"

if ! echo $CHANGED_FILES | grep -E 'dependency-graph|metrics|lantern|predictive-perf' > /dev/null; then
  echo "No lantern files affected, skipping lantern checks."
  exit 0
fi

# Google Drive will sometimes respond with a bad result, so we repeat until it works.
for i in {1..5}; do
  printf "Lantern files affected!\n\nDownloading test set...\n"
  "$LH_ROOT/lighthouse-core/scripts/lantern/download-traces.sh" && break || sleep 15;
  echo "failed to download"
done

printf "\n\nRunning lantern on all sites...\n"
"$LH_ROOT/lighthouse-core/scripts/lantern/run-on-all-assets.js"

printf "\n\n"
"$LH_ROOT/lighthouse-core/scripts/lantern/print-correlations.js"

printf "\n\nComparing to master computed values...\n"
"$LH_ROOT/lighthouse-core/scripts/lantern/assert-master-lantern-values-unchanged.js"
