#!/usr/bin/env bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."
cd $LH_ROOT

set -euxo pipefail

# Setup a pristine git environment
cd ../

if [[ ! -e lighthouse-pristine/ ]]; then
  git clone git@github.com:GoogleChrome/lighthouse.git lighthouse-pristine
fi

cd lighthouse-pristine/

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Pristine repo has changes to the files! Commit or stash the changes to continue."
  exit 1
fi

git fetch origin
git fetch --tags
git checkout -f master
git reset --hard origin/master
git clean -fdx # Forcibly clean all untracked files and directories, including `.gitignore`d ones.
