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

TEST_PATTERN="${1:-lighthouse/*}"
vpython3 third_party/node/node.py --output scripts/test/run_test_suite.js --config=test/e2e/test-runner-config.json "$TEST_PATTERN" --target=$BUILD_FOLDER
