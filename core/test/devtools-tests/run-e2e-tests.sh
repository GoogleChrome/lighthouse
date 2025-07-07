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

# Don't let console.errors() like 'Unknown VE Context' fail the build
sed -i 's| fatalErrors.push(message);|/*fatalErrors.push(message)*/|' test/conductor/events.ts
autoninja -C "out/$BUILD_FOLDER"

vpython3 third_party/node/node.py --output scripts/run_on_target.mjs gen/test/run.js "$TEST_PATTERN" --target=$BUILD_FOLDER --skip-ninja
