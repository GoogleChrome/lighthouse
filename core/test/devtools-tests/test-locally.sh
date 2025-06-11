#!/usr/bin/env bash

##
# @license
# Copyright 2022 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

# Runs the devtools e2e tests in third-party/devtools-tests using the latest
# Lighthouse and DevTools

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source "$SCRIPT_DIR/setup.sh"
bash "$SCRIPT_DIR/roll-devtools.sh"
bash "$SCRIPT_DIR/run-e2e-tests.sh" $*
