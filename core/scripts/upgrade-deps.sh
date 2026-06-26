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
    @paulirish/trace_engine \
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
    tldts-icann \
    web-features \

node -e "
    const fs = require('fs');
    const cp = require('child_process');

    const pkg = require('$LH_ROOT/package.json');
    const ver = pkg.dependencies['devtools-protocol'].replace('^', '');
    pkg.resolutions['puppeteer/**/devtools-protocol'] = ver;
    pkg.resolutions['puppeteer-core/**/devtools-protocol'] = ver;
    fs.writeFileSync('$LH_ROOT/package.json', JSON.stringify(pkg, null, 2) + '\n');

    const webFeaturesVer = pkg.dependencies['web-features'].replace(/[\^~]/, '');
    const timeJson = JSON.parse(cp.execSync('npm info web-features time --json').toString());
    const dateStr = timeJson[webFeaturesVer];
    if (dateStr) {
      const date = dateStr.split('T')[0];
      const metadataPath = '$LH_ROOT/core/lib/baseline/web-features-metadata.json';
      fs.writeFileSync(metadataPath, JSON.stringify({date}, null, 2) + '\n');
    }
"

# Do some stuff that may update checked-in files.
yarn generate-insight-audits
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
