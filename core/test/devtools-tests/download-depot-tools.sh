#!/usr/bin/env bash

set -euo pipefail

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

# Install depot_tools.

if command -v fetch &> /dev/null
then
  echo "depot_tools already installed"
  exit 0
fi

git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git "$DEPOT_TOOLS_PATH"
