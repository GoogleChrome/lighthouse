#!/usr/bin/env bash

##
# @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##


# usage
#    yarn compile-devtools

set -x

# This the text here will override the renderer/ files in in the scripts[] array:
#     https://github.com/ChromeDevTools/devtools-frontend/blob/master/front_end/audits/module.json#L20

# (Currently this doesnt include logger or report-features)
files_to_include="\"lighthouse\/renderer\/util.js\", \"lighthouse\/renderer\/dom.js\", \"lighthouse\/renderer\/category-renderer.js\", \"lighthouse\/renderer\/performance-category-renderer.js\", \"lighthouse\/renderer\/crc-details-renderer.js\", \"lighthouse\/renderer\/details-renderer.js\", \"lighthouse\/renderer\/report-renderer.js\","

# -----------------------------

# paths
local_script_path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
lhroot_path="$local_script_path/../.."
module_path="$lhroot_path/node_modules/lh-compile-devtools"

# extra deep frontend_path used because of the hardcoded os.pardir's here:
# https://github.com/ChromeDevTools/devtools-frontend/blob/157d472fd748/scripts/build/generate_protocol_externs.py#L39-L43
frontend_path="$module_path/two-more/almost-there/devtools-frontend"
protocol_path="$module_path/devtools-protocol"

# clone if they're not there
if [ ! -d "$frontend_path" ]; then
  git clone --depth=1 git://github.com/ChromeDevTools/devtools-frontend.git "$frontend_path"
fi
if [ ! -d "$protocol_path" ]; then
  git clone --depth=1 git://github.com/ChromeDevTools/devtools-protocol.git "$protocol_path"
fi

# update to latest
cd "$frontend_path" && git reset --hard && git fetch origin master && git checkout --quiet --force origin/master
cd "$protocol_path" && git reset --hard && git fetch origin master && git checkout --quiet --force origin/master
# initialize the inspector_protocol submodule
git -C "$protocol_path" submodule update --init

# Copy it to location generate_protocol_externs.py will import the pdl module from
# https://github.com/ChromeDevTools/devtools-frontend/blob/157d472fd748/scripts/build/generate_protocol_externs.py#L39-L44
cp -fRp "$protocol_path/scripts/inspector_protocol" "$module_path"


cd "$lhroot_path" || exit 1
# copy renderer and lh backgrond into this devtools checkout
yarn devtools "$frontend_path/front_end/"

#
# monkeypatch the audits module.json to include any new files we're added that aren't present
#
audit_modulejson_path="$frontend_path/front_end/audits/module.json"
# remove existing renderer file mentions
sed -i='' 's/.*\/renderer\/.*//' $audit_modulejson_path
# add in our hardcoded renderer file mentions
sed -i='' "s/\"AuditsPanel\.js\"/ $files_to_include \"AuditsPanel.js\"/" $audit_modulejson_path

# compile, finally
python "$frontend_path/scripts/compile_frontend.py" --protocol-externs-file "$protocol_path/externs/protocol_externs.js"

# FYI the compile_frontend script deletes externs/protocol_externs.js when it's done.
