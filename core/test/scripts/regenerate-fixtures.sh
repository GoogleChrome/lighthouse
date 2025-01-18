#!/bin/bash

# Regenerates all the trace fixtures from their user flow scripts.

set -e

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT_PATH="$DIRNAME/../../.."
cd $LH_ROOT_PATH

for f in core/test/fixtures/artifacts/*/regenerate.js; do
  echo "running $f"
  node $f
done
