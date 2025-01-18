#!/usr/bin/env bash

##
# @license Copyright 2017 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

# Download chrome inside of our CI env.
# Takes one arg - the location to extract ToT chrome to. Defaults to .tmp/chrome-tot
# If already exists, this script does nothing.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT_DIR="$SCRIPT_DIR/../.."

chrome_out=${1:-"$LH_ROOT_DIR/.tmp/chrome-tot"}
mkdir -p "$LH_ROOT_DIR/.tmp"

if [ -e "$chrome_out" ]; then
  echo "cached chrome found"
  exit 0
fi

unameOut="$(uname -s)"
case "${unameOut}" in
  Linux*)     machine=Linux;;
  Darwin*)    machine=Mac;;
  MINGW*)     machine=MinGw;;
  *)          machine="UNKNOWN:${unameOut}"
esac

# Only set this to true when actual ToT is broken and we can't fix it yet.
should_hardcode_ci=false

if [[ "${CI:-}" ]] && [ "$should_hardcode_ci" == true ]; then
  rev=1228630
  if [ "$machine" == "MinGw" ]; then
    url="http://commondatastorage.googleapis.com/chromium-browser-snapshots/Win_x64/$rev/chrome-win.zip"
  elif [ "$machine" == "Linux" ]; then
    url="http://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/$rev/chrome-linux.zip"
  elif [ "$machine" == "Mac" ]; then
    arch="$(uname -m)"
    if [ "$arch" == "arm64" ]; then
      url="http://commondatastorage.googleapis.com/chromium-browser-snapshots/Mac_Arm/$rev/chrome-mac.zip"
    else
      url="http://commondatastorage.googleapis.com/chromium-browser-snapshots/Mac/$rev/chrome-mac.zip"
    fi
  else
    echo "unsupported platform"
    exit 1
  fi
else
  if [ "$machine" == "MinGw" ]; then
    url="https://download-chromium.appspot.com/dl/Win?type=snapshots"
  elif [ "$machine" == "Linux" ]; then
    url="https://download-chromium.appspot.com/dl/Linux_x64?type=snapshots"
  elif [ "$machine" == "Mac" ]; then
    arch="$(uname -m)"
    if [ "$arch" == "arm64" ]; then
      url="https://download-chromium.appspot.com/dl/Mac_Arm?type=snapshots"
    else
      url="https://download-chromium.appspot.com/dl/Mac?type=snapshots"
    fi
  else
    echo "unsupported platform"
    exit 1
  fi
fi

echo "downloading $url"

mkdir -p .tmp-download && cd .tmp-download
curl "$url" -Lo chrome.zip && unzip -q chrome.zip && rm chrome.zip
mv * "$chrome_out"
cd - && rm -rf .tmp-download

echo "OUTPUT DIR: $chrome_out"
ls "$chrome_out"

echo "";
echo "Verifying CHROME_PATH...";

if ! [ -f $CHROME_PATH ]; then
  echo "CHROME_PATH does not point to a valid file"
  exit 1
else
  echo "CHROME_PATH is good!"
fi

# TODO: Find a convenient way to check the version in windows
if [ "$machine" != "MinGw" ]; then
  echo "CHROME_PATH version:"
  $CHROME_PATH --version
fi
