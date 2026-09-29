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

    // Update axe-core rule links in accessibility audits to match the installed version.
    const axePkg = require('$LH_ROOT/node_modules/axe-core/package.json');
    const [axeVer] = /^\d+\.\d+/.exec(axePkg.version);
    const accessibilityDir = '$LH_ROOT/core/audits/accessibility';
    for (const file of fs.readdirSync(accessibilityDir)) {
      if (!file.endsWith('.js')) continue;
      const filePath = accessibilityDir + '/' + file;
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('dequeuniversity.com/rules/axe/')) {
        content = content.replace(/dequeuniversity\.com\/rules\/axe\/\d+\.\d+/g, 'dequeuniversity.com/rules/axe/' + axeVer);
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
"

# Do some stuff that may update checked-in files.
yarn generate-insight-audits
yarn update:ard-spec
yarn build-ard-schema
yarn build-all
yarn update:sample-json
yarn type-check
yarn lint --fix

set +x

echo "----------"
echo """
1. Test in google3

Test this in Lightrider: roll to google3 and run all the tests in the Lightrider folder. Dependency
updates, especially for Puppeteer, have potential to break us there.

Roll:

blaze run //chrome/headless/lightrider/util/import_tool:import -- --apply=local

Test:

blaze test --test_output=errors --force_citc_update -- //chrome/headless/lightrider/...

Note: Don't actually make a CL / land this - we only update from main branch. Just roll and run the tests for validation.
"""

echo
echo """
2. Open PR on GitHub

Once validated in google3, open a PR to Lighthouse with the following PR description:
"""
echo "- [ ] Validated against Lightrider"
echo
echo '```diff'
git diff -U0 package.json | grep -E '^[-] ' | sort
echo
git diff -U0 package.json | grep -E '^[+] ' | sort
echo '```'
