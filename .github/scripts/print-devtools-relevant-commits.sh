#!/usr/bin/env bash

##
# @license
# Copyright 2021 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../.."
CDT_DIR="$LH_ROOT/.tmp/chromium-web-tests/devtools/devtools-frontend"

if [ -d "$CDT_DIR" ]
then
  cd "$CDT_DIR"
elif [ -d "$LH_ROOT/.tmp/cdt-repo-for-hash/devtools-frontend" ]
then
  cd "$LH_ROOT/.tmp/cdt-repo-for-hash/devtools-frontend"
else
  mkdir -p "$LH_ROOT/.tmp/cdt-repo-for-hash"
  cd "$LH_ROOT/.tmp/cdt-repo-for-hash"
  git clone --depth=1 https://chromium.googlesource.com/devtools/devtools-frontend.git
  cd devtools-frontend
fi

git fetch
git --no-pager log -1 origin/main -- front_end/panels/lighthouse
git --no-pager log -1 origin/main -- front_end/third_party/lighthouse
git --no-pager log -1 origin/main -- front_end/entrypoints/lighthouse_worker
