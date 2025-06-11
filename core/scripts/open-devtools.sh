#!/usr/bin/env bash

set -euo pipefail

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

# 1) Builds DevTools with current Lighthouse
# 2) Opens $CHROME_PATH using new devtools frontend build, passing any additional args to Chrome.
#
# Specify `$DEVTOOLS_PATH` to use a different devtools repo.
# Specify `$BUILD_FOLDER` to use a build other than 'LighthouseIntegration' (ex: Default to use out/Default).

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../.."

if [ -z "${CHROME_PATH:-}" ]; then
  echo 'Must set $CHROME_PATH'
  exit 1
fi

# If using the default .tmp devtools checkout, make sure it's up to date first.
if [ -z "${DEVTOOLS_PATH:-}" ]; then
  source "$LH_ROOT/core/test/devtools-tests/setup.sh"
fi

echo "CHROME_PATH: $CHROME_PATH"

export BUILD_FOLDER="${BUILD_FOLDER:-LighthouseIntegration}"
bash "$LH_ROOT/core/scripts/build-devtools.sh"

"$CHROME_PATH" --custom-devtools-frontend=file://"$DEVTOOLS_PATH"/out/"$BUILD_FOLDER"/gen/front_end $*
