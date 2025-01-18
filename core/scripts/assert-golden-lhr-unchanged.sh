#!/usr/bin/env bash

##
# @license
# Copyright 2018 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

pwd="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
lhroot_path="$pwd/../.."
lh_tmp_path="$lhroot_path/.tmp"
lh_tmp_artifacts_path="$lh_tmp_path/artifacts"
lh_src_artifacts_path="$lhroot_path/core/test/results/artifacts"

mkdir -p "$lh_tmp_path"
rm -rf "$lh_tmp_artifacts_path"
cp -R "$lh_src_artifacts_path" "$lh_tmp_artifacts_path"

purple='\033[1;35m'
red='\033[1;31m'
green='\033[1;32m'
colorText() {
  printf "\\n$2$1%b\\n" '\033[0m'
}

samplev2Path="$lhroot_path/core/test/results/sample_v2.json";
goldenLHRPath="$lh_tmp_path/golden_lhr.json";
freshLHRPath="$lh_tmp_path/fresh_lhr.json";

# always run this before exiting
function teardown { rm -f "$goldenLHRPath" "$freshLHRPath"; }
trap teardown EXIT

colorText "Generating a fresh LHR..." "$purple"
set -x
node "$lhroot_path/cli" -A="$lh_tmp_artifacts_path" --config-path="$lhroot_path/core/test/results/sample-config.js" --quiet --output=json --output-path="$freshLHRPath"
set +x

# remove timing from both
cp "$samplev2Path" "$goldenLHRPath"
node "$pwd/cleanup-LHR-for-diff.js" "$goldenLHRPath"
node "$pwd/cleanup-LHR-for-diff.js" "$freshLHRPath"

colorText "Diff'ing golden LHR against the fresh LHR" "$purple"
git --no-pager diff --color=always --no-index "$goldenLHRPath" "$freshLHRPath"

# Use the return value from last command
retVal=$?
if [ $retVal -eq 0 ]; then
  colorText "✅  PASS. No change in LHR." "$green"
else
  colorText "❌  FAIL. LHR has changed." "$red"
  echo "Run \`yarn update:sample-json\` to rebaseline the golden LHR."
fi
exit $retVal
