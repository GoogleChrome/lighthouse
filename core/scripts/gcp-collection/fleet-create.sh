#!/bin/bash

set -euxo pipefail

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."
cd $DIRNAME

node fleet-create-directories.js $@

cd "$LH_ROOT/.tmp/gcp-instances"

trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

for instance in $(ls)
do
  cd "$instance"
  bash run.sh "$instance" &
  cd ..
done

wait
