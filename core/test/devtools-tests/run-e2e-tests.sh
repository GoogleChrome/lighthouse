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

if ! command -v vpython3 &> /dev/null; then
  SHIM_DIR="$(mktemp -d)"
  trap 'rm -rf "$SHIM_DIR"' EXIT
  ln -s "$(command -v python3)" "$SHIM_DIR/vpython3"
  export PATH="$SHIM_DIR:$PATH"
fi

cd "$DEVTOOLS_PATH"

TEST_PATTERN="${1:-test/e2e/lighthouse/*}"

python3 third_party/node/node.py --output scripts/run_on_target.mjs gen/test/run.js "$TEST_PATTERN" --target=$BUILD_FOLDER --skip-ninja
