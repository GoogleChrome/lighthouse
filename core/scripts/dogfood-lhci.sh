#!/bin/bash

set -eox pipefail

# This script requires LHCI_CANARY_SERVER_URL and LHCI_CANARY_SERVER_TOKEN variables to be set.

if [[ -z "$LHCI_CANARY_SERVER_TOKEN" ]]; then
  echo "No server token available, skipping.";
  exit 0;
fi

NODE_VERSION=$(node --version)
if [[ "$NODE_VERSION" != "v14"* ]]; then
  echo "Not running dogfood script on node versions other than 14";
  exit 0;
fi


SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT_DIR="$SCRIPT_DIR/../.."

# Testing lhci takes time and the server ain't massive, we'll only run the tests if we touched files that affect the report.
CHANGED_FILES=""
if [[ "$CI" ]]; then
  if [[ -z "$GITHUB_ACTIONS_COMMIT_RANGE" ]]; then echo "No commit range available!" && exit 1 ; fi
  CHANGED_FILES=$(git --no-pager diff --name-only "$GITHUB_ACTIONS_COMMIT_RANGE")
else
  CHANGED_FILES=$(git --no-pager diff --name-only main)
fi

printf "Determined the following files have been touched:\n\n$CHANGED_FILES\n\n"

if ! echo "$CHANGED_FILES" | grep -E 'report|lhci' > /dev/null; then
  echo "No report files affected, skipping lhci checks."
  exit 0
fi

# Generate HTML reports in ./dist/sample-reports
yarn vercel-build

# Install LHCI
npm install -g @lhci/cli@next
# Collect our LHCI results.
lhci collect --staticDistDir=./dist/sample-reports/english
# Upload the results to our canary server.
lhci upload \
  --serverBaseUrl="$LHCI_CANARY_SERVER_URL" \
  --token="$LHCI_CANARY_SERVER_TOKEN" \
  --github-token="$BUNDLESIZE_GITHUB_TOKEN" \
  --ignoreDuplicateBuildFailure
