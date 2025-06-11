#!/usr/bin/env bash

##
# @license Copyright 2017 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

# You will need a DevTools Frontend checkout
# See https://chromium.googlesource.com/devtools/devtools-frontend/+/HEAD/docs/workflows.md

# usage:

# default to checkout at ~/src/devtools/devtools-frontend
#   yarn devtools

# with a custom devtools location (could be path to standalone checkout):
#   yarn devtools ~/code/devtools/devtools-frontend


set -euo pipefail

check="\033[96m ✓\033[39m"

dt_dir="${1:-$HOME/src/devtools/devtools-frontend}"

if [[ ! -d "$dt_dir" || ! -a "$dt_dir/front_end/OWNERS" ]]; then
  echo -e "\033[31m✖ Error!\033[39m"
  echo "This script requires a devtools frontend folder. We didn't find one here:"
  echo "    $dt_dir"
  exit 1
else
  echo -e "$check Chromium folder in place."
fi

fe_lh_dir="$dt_dir/front_end/third_party/lighthouse"
mkdir -p "$fe_lh_dir"

lh_bg_js="dist/lighthouse-dt-bundle.js"

yarn build-report
yarn build-devtools

# copy lighthouse-dt-bundle
cp -pPR "$lh_bg_js" "$fe_lh_dir/lighthouse-dt-bundle.js"
echo -e "$check lighthouse-dt-bundle copied."

# generate bundle.d.ts
npx tsc --allowJs --declaration --emitDeclarationOnly dist/report/bundle.esm.js

# Exports of report/clients/bundle.js can possibly be mistakenly overridden by tsc.
# Funky sed inplace command so we support both GNU sed and BSD sed (used by GHA devtools runner on macos)
#     https://stackoverflow.com/a/22084103/89484
sed -i.bak 's/export type DOM = any;//' dist/report/bundle.esm.d.ts
sed -i.bak 's/export type ReportRenderer = any;//' dist/report/bundle.esm.d.ts
sed -i.bak 's/export type ReportUIFeatures = any;//' dist/report/bundle.esm.d.ts


# copy report code $fe_lh_dir
fe_lh_report_dir="$fe_lh_dir/report/"
cp dist/report/bundle.esm.js "$fe_lh_report_dir/bundle.js"
cp dist/report/bundle.esm.d.ts "$fe_lh_report_dir/bundle.d.ts"
echo -e "$check Report code copied."

# copy report generator + cached resources into $fe_lh_dir
fe_lh_report_assets_dir="$fe_lh_dir/report-assets/"
rsync -avh dist/dt-report-resources/ "$fe_lh_report_assets_dir" --delete
echo -e "$check Report resources copied."

# copy locale JSON files (but not the .ctc.json ones)
lh_locales_dir="shared/localization/locales/"
fe_locales_dir="$fe_lh_dir/locales"
rsync -avh "$lh_locales_dir" "$fe_locales_dir" --exclude="*.ctc.json" --delete
echo -e "$check Locale JSON files copied."

# copy e2e tests
lh_e2e_dir="third-party/devtools-tests/e2e/lighthouse/"
fe_e2e_dir="$dt_dir/test/e2e/lighthouse"
rsync -avh "$lh_e2e_dir" "$fe_e2e_dir" --exclude="OWNERS" --delete
lh_e2e_res_dir="third-party/devtools-tests/e2e/resources/lighthouse/"
fe_e2e_res_dir="$dt_dir/test/e2e/resources/lighthouse"
rsync -avh "$lh_e2e_res_dir" "$fe_e2e_res_dir" --exclude="OWNERS" --delete

PKG_VERSION=$(node -e "console.log(require('./package.json').version)")
REVISION=$(git rev-parse HEAD)
echo "Name: Lighthouse
Short Name: lighthouse
Version: $PKG_VERSION
Revision: $REVISION
URL: https://github.com/GoogleChrome/lighthouse
License: Apache License 2.0
License File: LICENSE
Security Critical: no
Shipped: yes

This directory contains Chromium's version of the lighthouse report assets, including renderer." > "$fe_lh_dir/README.chromium"

echo ""
echo "Done. To run the e2e tests: "
echo "    DEVTOOLS_PATH=\"$dt_dir\" yarn test-devtools"
