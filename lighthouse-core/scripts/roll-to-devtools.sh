#!/usr/bin/env bash

##
# @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# usage:

#   yarn devtools

# with a custom devtools front_end location:
#   yarn devtools node_modules/temp-devtoolsfrontend/

chromium_dir="$HOME/chromium/src"
check="\033[96m ✓\033[39m"

if [[ -n "$1" ]]; then
  dt_dir="$1"
else
  dt_dir="$chromium_dir/third_party/devtools-frontend/src"
fi

if [[ ! -d "$dt_dir" || ! -a "$dt_dir/front_end/shell.js" ]]; then
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

# copy lighthouse-dt-bundle (potentially stale)
cp -pPR "$lh_bg_js" "$fe_lh_dir/lighthouse-dt-bundle.js"
echo -e "$check (Potentially stale) lighthouse-dt-bundle copied."

# copy report generator + cached resources into $fe_lh_dir
fe_lh_report_assets_dir="$fe_lh_dir/report-assets/"
rsync -avh dist/dt-report-resources/ "$fe_lh_report_assets_dir" --delete
echo -e "$check Report resources copied."

# copy locale JSON files (but not the .ctc.json ones)
lh_locales_dir="lighthouse-core/lib/i18n/locales/"
fe_locales_dir="$fe_lh_dir/locales"

rsync -avh "$lh_locales_dir" "$fe_locales_dir" --exclude="*.ctc.json" --delete
echo -e "$check Locale JSON files copied."

echo ""
echo "Done. To rebase the test expectations, run: "
echo "    yarn --cwd ~/chromium/src/third_party/devtools-frontend/src test 'http/tests/devtools/lighthouse/*.js' --layout-tests-dir test/webtests --reset-results"
echo " (you also need to do `autoninja -C out/Linux chrome blink_tests` in the chromium checkout)"
