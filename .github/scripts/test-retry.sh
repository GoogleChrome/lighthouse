#!/usr/bin/env bash

# Ex: bash test-retry.sh yarn test-viewer

##
# @license
# Copyright 2021 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -euxo pipefail

$* || $* --onlyFailures
