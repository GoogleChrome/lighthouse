#!/usr/bin/env bash

##
# @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

pwd="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
lhroot_path="$pwd/../.."
lh_tmp_path="$lhroot_path/.tmp"
mkdir -p "$lh_tmp_path"

purple='\033[1;35m'
red='\033[1;31m'
green='\033[1;32m'
colorText() {
  printf "\\n$2$1%b\\n" '\033[0m'
}

samplev2Path="$lhroot_path/lighthouse-core/test/results/sample_v2.json";
goldenLHRPath="$lh_tmp_path/golden_lhr.json";
freshLHRPath="$lh_tmp_path/fresh_lhr.json";

# always run this before exiting
function teardown { rm -f "$goldenLHRPath" "$freshLHRPath"; }
trap teardown EXIT

colorText "Generating a fresh LHR..." "$purple"
set -x
node "$lhroot_path/lighthouse-cli" -A="$lhroot_path/lighthouse-core/test/results/artifacts" --config-path="$lhroot_path/lighthouse-core/test/results/sample-config.js" --quiet --output=json --output-path="$freshLHRPath"
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
