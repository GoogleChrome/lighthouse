#!/usr/bin/env bash

##
# @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# Download chrome inside of our CI env.

if [ "$APPVEYOR" == "True" ]; then
  url="https://download-chromium.appspot.com/dl/Win?type=snapshots"
else
  url="https://download-chromium.appspot.com/dl/Linux_x64?type=snapshots"
fi

if [ x"$CHROME_PATH" == x ]; then
  echo "Error: Environment variable CHROME_PATH not set"
  exit 1
fi

if [ -e "$CHROME_PATH" ]; then
  echo "cached chrome found"
else
  wget "$url" --no-check-certificate -q -O chrome.zip && unzip -q chrome.zip
fi
