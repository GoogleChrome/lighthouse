#!/usr/bin/env bash

# requires a ghtoken set as GIT3PO_GH_TOKEN
# likely invocation:
#     env GIT3PO_GH_TOKEN=<token> core/scripts/run-git3po.sh

set -ex

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIRNAME"

START_AT="$(date +%s -d '1 day ago')000"

# Only install if the version has bumped
installed_version=$(git3po --version)
latest_version=$(npm info git3po version)
if [[ "$installed_version" != "$latest_version" ]]; then
  npm install -g git3po
fi

find git3po-rules/*.yaml -exec git3po --start-at="$START_AT" -c {} \;
