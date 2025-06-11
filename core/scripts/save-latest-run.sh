#!/bin/bash

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -euo pipefail

# Saves the necessary contents of the `latest-run/` folder to a subfolder for easier A/B comparison.
# Restoring the contents to `latest-run/` is just `cp latest-run/latest-run-bak/* latest-run/`.

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../.."
TARGET_DIR=${1:-latest-run-bak}

cd "$LH_ROOT/latest-run"
mkdir -p "$TARGET_DIR"

for file in *.json ; do
  echo "Copying $file to $TARGET_DIR..."
  cp "$file" "$TARGET_DIR/$file"
done
