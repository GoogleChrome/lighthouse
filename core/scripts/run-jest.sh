#!/usr/bin/env bash

##
# @license
# Copyright 2022 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

# This wrapper around jest is only meant to help avoid the "Test environment has been torn down" error
# caused by a bug in v8's compilation cache. In short, due to that bug Jest will randomly use the wrong
# test environment for dynamic imports. It happens less often when fewer tests run, so a hacky workaround
# for now is to re-run the failed tests when this error occurs.
# See https://github.com/facebook/jest/issues/11438#issuecomment-923835189
# and https://bugs.chromium.org/p/v8/issues/detail?id=10284

set -o pipefail

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../.."

EXTRA_FLAGS=()

mkdir -p .tmp

# Repeating once is typically enough, but just in case...
count=5
for i in $(seq $count); do
  # Copy jest stderr to file, while keeping the output in the terminal and not messing up carriage returns.
  # https://unix.stackexchange.com/a/333204
  # https://superuser.com/a/1124144
  exec 3>&1
  node --experimental-vm-modules ./node_modules/jest/bin/jest.js ${EXTRA_FLAGS[*]} $* 2>&1 >&3 | tee >(sed 's/.*\r//' >.tmp/jest-stderr.txt)
  jest_status=$?
  echo "$jest_status"
  if [ $jest_status -eq 0 ];
  then
    exit 0
  fi

  if grep -Fq "Test environment has been torn down" .tmp/jest-stderr.txt
  then
    echo "====================================================="
    echo "Noticed a v8 bug, so re-running just the failed tests"
    echo "====================================================="
    EXTRA_FLAGS=(-f)
  else
    exit $jest_status
  fi
done
