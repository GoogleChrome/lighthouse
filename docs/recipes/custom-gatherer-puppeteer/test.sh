#!/usr/bin/env bash

# Make sure we're in this `docs/recipes/customer-gatherer-puppeteer` directory
cd "$(dirname "$0")"

node node_modules/.bin/lighthouse --chrome-flags=--headless=new --config-path=custom-config.js https://www.example.com --output=json |
  jq '.audits["custom-audit"].score' |
  grep -q 1
