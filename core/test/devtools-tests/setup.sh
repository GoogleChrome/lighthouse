#!/usr/bin/env bash

##
# @license
# Copyright 2022 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

# Setup dependencies for devtools e2e tests.
# Set SKIP_DOWNLOADS to skip all the downloading and just export variables.
# Set BUILD_FOLDER to use a folder other than 'LighthouseIntegration' (ex: Default to use out/Default).

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../../.."
TEST_DIR="$LH_ROOT/.tmp/chromium-web-tests"

export DEPOT_TOOLS_PATH="$TEST_DIR/depot-tools"
export DEVTOOLS_PATH=${DEVTOOLS_PATH:-"$TEST_DIR/devtools/devtools-frontend"}
export BUILD_FOLDER="${BUILD_FOLDER:-LighthouseIntegration}"

if [ -z ${SKIP_DOWNLOADS+x} ]
then
  echo "========================================"
  echo "Downloading latest DevTools"
  echo "To skip this step, set SKIP_DOWNLOADS=1"
  echo "========================================"
  echo

  bash "$SCRIPT_DIR/download-depot-tools.sh"
  bash "$SCRIPT_DIR/download-devtools.sh"
fi
