#!/usr/bin/env bash

##
# @license Copyright 2025 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../.."
cd $LH_ROOT

set -ex

yarn upgrade --latest \
    axe-core \
    chrome-devtools-frontend \
    chrome-launcher \
    csp_evaluator \
    devtools-protocol \
    js-library-detector \
    lighthouse-logger \
    lighthouse-stack-packs \
    puppeteer \
    puppeteer-core \
    speedline-core \
    third-party-web \

# Do some stuff that may update checked-in files.
yarn build-all
yarn update:sample-json
yarn type-check
yarn lint --fix

# Just print something nice to copy/paste as a PR description.

set +x

echo '```diff'
git diff -U0 package.json | grep -E '^[-] ' | sort
echo
git diff -U0 package.json | grep -E '^[+] ' | sort
echo '```'
