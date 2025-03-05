#!/usr/bin/env bash

##
# @license
# Copyright 2025 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

yarn
yarn upgrade --latest core-js caniuse-lite
node create-polyfill-module-data.js
node run.js # needed for next step
node create-polyfill-size-estimation.js
