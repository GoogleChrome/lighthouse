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
# TODO: this test broke somehow from a puppeteer change - can't resolve types.
# node_modules/puppeteer/lib/types.d.ts:8:25 - error TS2307: Cannot find module 'chromium-bidi/protocol/protocol.js' or its corresponding type declarations.
# yarn type-checking-test
