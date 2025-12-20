#!/usr/bin/env bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/.."

tmp_dir=$(mktemp -d -t lh-XXXXXXXXXX)

cd "$tmp_dir"
npm pack "$LH_ROOT"
mv *.tgz "$LH_ROOT/dist/lighthouse.tgz"

rmdir "$tmp_dir"
