#!/usr/bin/env bash

# requires a ghtoken set as GIT3PO_GH_TOKEN
# likely invocation:
#     env GIT3PO_GH_TOKEN=<token> lighthouse-core/scripts/run-git3po.sh

set -ex

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIRNAME"

START_AT="$(date +%s -d '1 day ago')000"

npm install -g git3po

find git3po-rules/*.yaml -exec git3po --start-at="$START_AT" -c {} \;
