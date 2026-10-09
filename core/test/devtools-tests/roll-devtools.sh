#!/usr/bin/env bash

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../../.."
BUILD_FOLDER="${BUILD_FOLDER:-LighthouseIntegration}"
CI="${CI:-}"

roll_devtools() {
  # Roll devtools. Besides giving DevTools the latest lighthouse source files,
  # this also copies over the e2e tests.
  cd "$LH_ROOT"
  yarn devtools "$DEVTOOLS_PATH"
  cd -
}

cd "$DEVTOOLS_PATH"
git --no-pager log -1
roll_devtools

if [[ "$CI" ]]; then
  GN_ARGS='is_debug=false'
else
  GN_ARGS='is_debug=true'
fi

if [[ ! -f "out/$BUILD_FOLDER/build.ninja" ]] || [[ "$(cat "out/$BUILD_FOLDER/args.gn" 2>/dev/null)" != "$GN_ARGS" ]]; then
  gn gen "out/$BUILD_FOLDER" --args="$GN_ARGS"
fi

# Patch RecordingPlayer.ts to fix CdpBrowser vs Browser type error from puppeteer update in DevTools.
if ! grep -q 'super(browser as any' front_end/panels/recorder/models/RecordingPlayer.ts; then
  sed -i.bak 's/super(browser, page, {timeout});/super(browser as any, page as any, {timeout});/' front_end/panels/recorder/models/RecordingPlayer.ts
  rm -f front_end/panels/recorder/models/RecordingPlayer.ts.bak
fi

# Don't let console.errors() like 'Unknown VE Context' fail the build
if ! grep -q '/\*fatalErrors.push(message)\*/' test/conductor/events.ts; then
  sed -i.bak 's| fatalErrors.push(message);|/*fatalErrors.push(message)*/|' test/conductor/events.ts
  rm -f test/conductor/events.ts.bak
fi

# Build devtools frontend and e2e test runner targets.
autoninja -C "out/$BUILD_FOLDER" devtools_frontend_resources test:run test/e2e scripts/hosted_mode
cd -
