#!/usr/bin/env bash

##
# @license
# Copyright 2022 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -e

PWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$PWD/../.."
BASELINE_RESULT_PATH="$LH_ROOT/core/test/fixtures/user-flows/reports/sample-flow-result.json"
TMP_PATH="$LH_ROOT/.tmp"
FRESH_RESULT_PATH="$TMP_PATH/fresh_flow_result.json"

purple='\033[1;35m'
red='\033[1;31m'
green='\033[1;32m'
colorText() {
  printf "\\n$2$1%b\\n" '\033[0m'
}

colorText "Generating fresh flow result" "$purple"
yarn update:flow-sample-json --output-path "$TMP_PATH/fresh_flow_result.json"

colorText "Diff'ing baseline flow result against the fresh flow result" "$purple"

set +e
git --no-pager diff --color=always --no-index "$BASELINE_RESULT_PATH" "$FRESH_RESULT_PATH"
retVal=$?
set -e

if [ $retVal -eq 0 ]; then
  colorText "✅  PASS. No change in the flow result." "$green"
else
  colorText "❌  FAIL. Flow result has changed." "$red"
  echo "Run \`yarn update:flow-sample-json\` to rebaseline the flow result."
fi
exit $retVal
