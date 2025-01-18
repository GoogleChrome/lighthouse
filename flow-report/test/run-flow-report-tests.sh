#!/usr/bin/env bash

##
# @license
# Copyright 2022 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -eux

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../.."

ARGS=(
  --testMatch='{flow-report/**/*-test.ts,flow-report/**/*-test.tsx}'
  --require="$LH_ROOT/flow-report/test/setup/env-setup.ts"
)

cd "$LH_ROOT"
node --loader=@esbuild-kit/esm-loader core/test/scripts/run-mocha-tests.js ${ARGS[*]} "$@"
