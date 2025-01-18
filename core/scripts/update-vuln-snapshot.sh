#!/usr/bin/env bash

##
# @license Copyright 2017 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

# Download latest snyk snapshot

url="https://snyk.io/partners/api/v2/vulndb/clientside.json"

wget "$url" -O snyk-snapshot.json && mv snyk-snapshot.json ./third-party/snyk/snapshot.json
node ./core/scripts/cleanup-vuln-snapshot.js ./third-party/snyk/snapshot.json
