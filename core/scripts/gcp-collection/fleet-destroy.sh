#!/bin/bash

set -euo pipefail

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."
cd $DIRNAME

GCLOUD_USER=$(gcloud config get-value account | awk -F '@' '{gsub("[^a-z]","",$1); print $1}')
INSTANCE_NAME="lighthouse-collection-$GCLOUD_USER"
CLOUDSDK_CORE_PROJECT=${LIGHTHOUSE_COLLECTION_GCLOUD_PROJECT:-lighthouse-lantern-collect}
ZONE=us-central1-a

echo "Fetching instances..."
INSTANCES=$(gcloud --project=$CLOUDSDK_CORE_PROJECT compute instances list | grep "$INSTANCE_NAME" | awk '{print $1}')
for instance in $INSTANCES
do
  printf "Killing $instance...\n"
  gcloud -q --project="$CLOUDSDK_CORE_PROJECT" compute instances delete "$instance" --zone="$ZONE"
  printf "done!\n"
done
