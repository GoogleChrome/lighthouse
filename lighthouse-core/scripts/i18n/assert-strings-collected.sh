#!/usr/bin/env bash

##
# @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# Runs collect-strings and checks if
# - some changed UIStrings have not been collected and committed
# - some changed locale files have been pruned but not committed

pwd="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
lhroot_path="$pwd/../../.."

purple='\033[1;35m'
red='\033[1;31m'
green='\033[1;32m'
colorText() {
  printf "\\n$2$1%b\\n" '\033[0m'
}

colorText "Collecting strings..." "$purple"
set -x
node "$lhroot_path/lighthouse-core/scripts/i18n/collect-strings.js" || exit 1
set +x

colorText "Diff'ing committed strings against the fresh strings" "$purple"
git --no-pager diff --color=always --exit-code "$lhroot_path/lighthouse-core/lib/i18n/locales/"

# Use the return value from last command
retVal=$?

if [ $retVal -eq 0 ]; then
  colorText "✅  PASS. All strings have been collected." "$green"
else
  colorText "❌  FAIL. Strings have changed." "$red"
  echo "Check lighthouse-core/lib/i18n/locales/ for unexpected string changes."
fi
exit $retVal
