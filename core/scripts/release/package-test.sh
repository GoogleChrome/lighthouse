#!/usr/bin/env bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."

set -euxo pipefail

echo "Testing a fresh local install..."
VERSION=$(node -e "console.log(require('./package.json').version)")
npm pack

# Start pristine's static-server for smokehouse run below.
yarn static-server &
# Kill static-server on exit (see https://github.com/GoogleChrome/lighthouse/pull/12446#discussion_r627589729).
trap "trap - SIGTERM && kill -- -$$ || true" SIGINT SIGTERM EXIT

rm -rf /tmp/lighthouse-local-test || true
mkdir -p /tmp/lighthouse-local-test
cd /tmp/lighthouse-local-test

npm init -y
npm install "$LH_ROOT/lighthouse-$VERSION.tgz"
npm explore lighthouse -- npm run fast -- http://example.com --chrome-flags=--headless=new

# Packaged smokehouse/lighthouse using root's static-server and test fixtures.
# This is because we don't have access to any of the dev dependencies.
CI="" yarn smokehouse --tests-path="$LH_ROOT/cli/test/smokehouse/core-tests.js" --retries=2 $*

cd "$LH_ROOT"
rm -rf /tmp/lighthouse-local-test
rm "lighthouse-$VERSION.tgz"

echo "Test finished successfully"
