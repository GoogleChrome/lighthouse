#!/usr/bin/env bash

##
# @license
# Copyright 2021 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

# Prints to stdout text that, when it changes, indicates that the devtools tests
# should rebuild the devtools frontend.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../.."

cd "$LH_ROOT"
bash .github/scripts/print-devtools-relevant-commits.sh
md5sum \
  core/test/devtools-tests/* \
  third-party/devtools-tests/e2e/**/*.*
