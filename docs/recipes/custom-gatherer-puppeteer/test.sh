#!/usr/bin/env bash

# Make sure we're in this `docs/recipes/customer-gatherer-puppeteer` directory
cd "$(dirname "$0")"

yarn
node node_modules/.bin/lighthouse --config-path=custom-config.js https://www.example.com --output=json |
  jq '.audits["custom-audit"].score' |
  grep -q 1
