#!/usr/bin/env bash

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -euxo pipefail

DATE=$(date --date=yesterday '+%Y%m%d')
PKG_VERSION=$(node -e "console.log(require('./package.json').version)")
BASE_VERSION="$PKG_VERSION-dev.$DATE"
VERSION="$BASE_VERSION"

i=0
while npx version-exists@0.0.4 lighthouse "$VERSION"
do
  ((i++))
  VERSION="$BASE_VERSION-$i"
done

node core/scripts/release/bump-versions.js "$VERSION"
