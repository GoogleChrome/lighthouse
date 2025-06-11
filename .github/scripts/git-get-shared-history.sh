#!/usr/bin/env bash

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -euxo pipefail

# Overview:
# - build-tracker (https://lh-build-tracker.herokuapp.com/) relies on a common commit that's shared between HEAD and main.
# - Lighthouse runs on pull_request, not push, so the checkout is not the branch with shared history, but the result of a merge.
# - checkout@v2 uses a merge remote (eg. remotes/pull/9605/merge) that often has just a single commit.
# - This script creates a new branch that matches the current checkout, but does have a shared history.

# See also
# - https://github.com/paularmstrong/build-tracker/issues/106
# - https://github.com/paularmstrong/build-tracker/issues/200

if [[ -z "$BT_API_AUTH_TOKEN" ]]; then
  echo "Build tracker auth token not available, skipping git deepening."
  exit 0
fi

# We can always use some more history
git -c protocol.version=2 fetch --deepen=100
echo "History is deepened."

if git merge-base HEAD origin/main > /dev/null; then
  echo "We have a common commit w/ origin/main. Skipping this script…";
  exit 0
else
  echo "We don't have a common commit w/ origin/main. We'll checkout the associated branch, merge main, and then we'll be good"
fi

# get the human readable remote name
checkout_name=$(git describe --all --exact-match HEAD)


# We only want to keep going if it's a 'remotes/pull/{*}/merge'
if [[ $checkout_name != remotes/pull/*/merge  ]]; then
  echo "Don't know how to handle this checkout ($checkout_name). 🤔 Bailing.";
  exit 0;
fi

# Extract 9605 from 'remotes/pull/9605/merge'
pr_num=${checkout_name//[!0-9]/}

lsremote_hash=$(git ls-remote origin "refs/pull/$pr_num/head" | cut -f1)

if [ -z "$lsremote_hash" ]; then
  echo "ls-remote failed to find this PR's branch. 🤔 Bailing.";
  exit 0;
fi

# Checkout our PR branch
git checkout --progress --force "$lsremote_hash"

# Branch off, for safekeeping
mergebranch_name="_bt_mergebranch-$pr_num"
git checkout -b "$mergebranch_name"

# Merge 'n commit
git -c "user.name=LH GH Action bot" -c "user.email=ghbot@lighthouse.repo" merge --no-verify \
    -m "Merge remote-tracking branch 'origin/main' into $mergebranch_name" origin/main

# If there's a diff aginst where we started.. we fucked up
if git --no-pager diff --color=always --exit-code "$checkout_name" > /dev/null; then
  echo "No diff, good!"
else
  echo "Unexpected difference between $mergebranch_name and $checkout_name. Bailing";
  exit 0;
fi

# Lastly, now we should definitely have a merge-base.
if git merge-base HEAD origin/main > /dev/null; then
  echo "Merge-base found. Perfect. 👌"
else
  echo "No diff, but still no merge-base. Very unexpected. 🤔"
fi
