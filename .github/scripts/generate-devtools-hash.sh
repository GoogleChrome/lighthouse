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
find core/test/devtools-tests/ -type f -print0 | xargs -0 md5sum
find third-party/devtools-tests/ -type f -name "*.*" -print0 | xargs -0 md5sum
