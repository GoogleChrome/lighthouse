#!/usr/bin/env bash

TXT_BOLD=$(tput bold)
TXT_DIM=$(tput setaf 245)
TXT_RESET=$(tput sgr0)

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."
cd "$LH_ROOT"

set -euxo pipefail

if [[ "$#" -ne 1 ]]; then
  echo "You must specify the version to prepare a commit for!"
  exit 1
fi

OLD_VERSION=$(node -e "console.log(require('./package.json').version)")
NEW_VERSION=$1
BRANCH_NAME="bump_$NEW_VERSION"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Repo has changes to the files! Commit or stash the changes to continue."
  exit 1
fi

# Checkout a new branch for the version commit
git fetch origin main
git checkout origin/main
git log -n 1
git branch -D "$BRANCH_NAME" || true
git checkout -b "$BRANCH_NAME"

# Install the dependencies.
yarn install

# Bump the version in package.json and others.
node core/scripts/release/bump-versions.js $NEW_VERSION

# Update the fixtures with the new version
yarn update:sample-json

# Create the changelog entry
yarn changelog

# Add new contributors to changelog
NEW_CONTRIBUTORS=$(node core/scripts/print-contributors.js v${OLD_VERSION} HEAD)

set +x

if [[ $(echo "$NEW_CONTRIBUTORS" | wc -l) -ge 1 ]]; then
  printf "Thanks to our new contributors 👽🐷🐰🐯🐻! \n$NEW_CONTRIBUTORS\n" | cat - changelog.md > tmp-changelog
  mv tmp-changelog changelog.md
fi

git add changelog.md core/test/results/ proto/
git commit -m "v$NEW_VERSION"

echo "Version bump commit ready on the ${TXT_BOLD}$BRANCH_NAME${TXT_RESET} branch!"

echo "${TXT_DIM}Press Space to see the git diff, CTRL+C to exit...${TXT_RESET}"
read -n 1 -r unused_variable
git diff HEAD^
echo "${TXT_DIM}Press Space to push to GitHub, CTRL+C to exit...${TXT_RESET}"
read -n 1 -r unused_variable
git push -u origin "$BRANCH_NAME"
