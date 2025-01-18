#!/usr/bin/env bash

##
# @license
# Copyright 2018 Google LLC
# SPDX-License-Identifier: Apache-2.0
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
node "$lhroot_path/core/scripts/i18n/collect-strings.js" || exit 1
set +x

colorText "Diff'ing committed strings against the fresh strings" "$purple"
git --no-pager diff --color=always --exit-code "$lhroot_path/shared/localization/locales/"

# Use the return value from last command
retVal=$?

if [ $retVal -eq 0 ]; then
  colorText "✅  PASS. All strings have been collected." "$green"
else
  colorText "❌  FAIL. Strings have changed." "$red"
  echo "Check shared/localization/locales/ for unexpected string changes."
fi
exit $retVal
