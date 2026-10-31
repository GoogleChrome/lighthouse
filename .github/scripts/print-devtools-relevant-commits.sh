#!/usr/bin/env bash

##
# @license
# Copyright 2021 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../.."
CDT_DIR="$LH_ROOT/.tmp/chromium-web-tests/devtools/devtools-frontend"

if [ -d "$CDT_DIR" ]
then
  cd "$CDT_DIR"
  git fetch origin main
elif [ -d "$LH_ROOT/.tmp/cdt-repo-for-hash/devtools-frontend" ]
then
  cd "$LH_ROOT/.tmp/cdt-repo-for-hash/devtools-frontend"
  git fetch --depth=1 origin main
else
  mkdir -p "$LH_ROOT/.tmp/cdt-repo-for-hash"
  cd "$LH_ROOT/.tmp/cdt-repo-for-hash"
  git clone --no-checkout --depth=1 --filter=blob:none https://chromium.googlesource.com/devtools/devtools-frontend.git
  cd devtools-frontend
fi

git rev-parse \
  origin/main:front_end/panels/lighthouse \
  origin/main:front_end/third_party/lighthouse \
  origin/main:front_end/entrypoints/lighthouse_worker
