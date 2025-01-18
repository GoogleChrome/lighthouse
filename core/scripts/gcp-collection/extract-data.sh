#!/bin/bash

set -euxo pipefail

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

# Unarchives "lhr-data-*.tar.gz" files inside gcp-data folder, places
# them inside gcp-data/data.

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."
GCP_DATA="$DIRNAME/gcp-data"
OUTPUT_DIR="$GCP_DATA/data"
mkdir -p "$OUTPUT_DIR"

cd "$GCP_DATA"

rm -rf extract_failures.log

# Change this line if you want to extract trace data instead.
i=0
for f in lhr-data-*.tar.gz; do # change to traces-*.tar.gz if extracting trace data
  echo "Extracting $f...\n"
  tar -xzvf $f data || echo "Failed to extract $f\n" >> extract_failures.log
  mv "$OUTPUT_DIR/urls.txt" "$OUTPUT_DIR/urls-$i.txt"
  ((i += 1))
done

echo "Run to analyze data:"
echo   node "$DIRNAME/analyze-lhr-data.js" "$OUTPUT_DIR" '___AUDIT-ID-GOES-HERE___' > "$LH_ROOT/.tmp/analyze-results.json"
