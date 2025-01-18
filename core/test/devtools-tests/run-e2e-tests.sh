#!/usr/bin/env bash

##
# @license
# Copyright 2022 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_FOLDER="${BUILD_FOLDER:-LighthouseIntegration}"
export LH_ROOT="$SCRIPT_DIR/../../.."

cd "$DEVTOOLS_PATH"

TEST_PATTERN="${1:-test/e2e/lighthouse/*}"
vpython3 third_party/node/node.py --output scripts/run_on_target.mjs gen/test/run.js "$TEST_PATTERN" --target=$BUILD_FOLDER
