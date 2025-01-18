#!/usr/bin/env bash

##
# @license
# Copyright 2022 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -eux

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Locally, make sure dist/lighthouse.tgz is the latest code.
if [ -z "${CI:-}" ]; then
  yarn --cwd ../.. build-pack
fi

yarn install-all
yarn integration-test
yarn custom-gatherer-puppeteer-test
yarn type-checking-test
