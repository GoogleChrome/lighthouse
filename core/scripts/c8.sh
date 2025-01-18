#!/usr/bin/env bash

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -euxo pipefail

echo $*

node node_modules/.bin/c8 \
  --include '{core,cli,viewer,treemap,build/plugins,report,flow-report}' \
  --exclude third_party \
  --exclude '**/test/' \
  --exclude '**/scripts/' \
  --exclude 'core/lib/page-functions.js' \
  --exclude 'core/util-commonjs.js' \
  $*

# util-commonjs is a copy of renderer/util, which has its own test coverage.
# Admittedly, util-commonjs is used in different ways, but we don't expect it to also have complete
# coverage as some methods are renderer-specific.  Ideally, we'd combine the coverage, but in the
# meantime we'll ignore coverage requirements for this file.
