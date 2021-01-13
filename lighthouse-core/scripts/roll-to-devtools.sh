#!/usr/bin/env bash

##
# @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# You will need a DevTools Frontend checkout
# See https://chromium.googlesource.com/devtools/devtools-frontend/+/HEAD/docs/workflows.md

# usage:

# default to checkout at ~/src/devtools/devtools-frontend
#   yarn devtools

# with a custom devtools location (could be path to standalone checkout):
#   yarn devtools ~/code/devtools/devtools-frontend

check="\033[96m ✓\033[39m"

if [[ -n "$1" ]]; then
  dt_dir="$1"
else
  dt_dir="$HOME/src/devtools/devtools-frontend"
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

# copy locale JSON files
lh_locales_dir="dist/dt-locales/"
fe_locales_dir="$fe_lh_dir/locales"
rsync -avh "$lh_locales_dir" "$fe_locales_dir" --delete
echo -e "$check Locale JSON files copied."

# copy webtests
lh_webtests_dir="third-party/chromium-webtests/webtests/http/tests/devtools/lighthouse/"
fe_webtests_dir="$dt_dir/test/webtests/http/tests/devtools/lighthouse"
rsync -avh "$lh_webtests_dir" "$fe_webtests_dir" --exclude="OWNERS" --delete

echo ""
echo "Done. To run the webtests: " 
echo "    DEVTOOLS_PATH=\"$dt_dir\" yarn test-devtools"
