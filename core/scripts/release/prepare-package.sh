#!/usr/bin/env bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_PRISTINE_ROOT="$DIRNAME/../../../../lighthouse-pristine"

set -euxo pipefail

bash "$DIRNAME/prepare-pristine.sh"

cd "$LH_PRISTINE_ROOT"

VERSION=$(node -e "console.log(require('./package.json').version)")

if ! git rev-parse "v$VERSION" ; then
  if ! git --no-pager log -n 1 --oneline | grep "v$VERSION" ; then
    echo "Cannot tag a commit other than the version bump!";
    exit 1;
  fi

  git tag -a "v$VERSION" -m "v$VERSION"
fi

git checkout -f "v$VERSION"

# Install the dependencies.
yarn install

# Build everything
yarn build-all

# Verify the npm package won't include unncessary files
npm pack --dry-run
npx pkgfiles

echo "Make sure the files above look good!"

