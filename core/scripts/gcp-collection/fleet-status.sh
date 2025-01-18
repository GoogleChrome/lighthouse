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

EXTRA_ARG=${1:-nokill}

echo "Fetching instances..."
INSTANCES=$(gcloud --project=$CLOUDSDK_CORE_PROJECT compute instances list | grep "$INSTANCE_NAME" | awk '{print $1}')
for instance in $INSTANCES
do
  printf "Checking status of $instance..."
  COMMAND="bash -c 'tail collect.log | grep \"Run complete\"'"
  if gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh lighthouse@$instance "--command=$COMMAND" --zone="$ZONE" > /dev/null ; then
    printf "Done!\n"

    DATA_DEST="./gcp-data/trace-data-$instance.tar.gz"
    LHR_DEST="./gcp-data/lhr-data-$instance.tar.gz"
    LOGS_DEST="./gcp-data/$instance.log"
    mkdir -p gcp-data/
    if [[ -f "$LHR_DEST" ]]; then
      echo "Data already downloaded for $instance, skipping..."
    else
      printf "Dowloading data..."
      gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp $instance:/home/lighthouse/collect.log "$LOGS_DEST" --zone="$ZONE"
      gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp $instance:/home/lighthouse/trace-data.tar.gz "$DATA_DEST" --zone="$ZONE"
      gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp $instance:/home/lighthouse/lhr-data.tar.gz "$LHR_DEST" --zone="$ZONE"
      printf "done!\n"
    fi

    if [[ "$EXTRA_ARG" == "--kill" ]]; then
      printf "Killing $instance...\n"
      gcloud -q --project="$CLOUDSDK_CORE_PROJECT" compute instances delete "$instance" --zone="$ZONE"
      printf "done!\n"
    fi
  else
    printf "still running :(\n"
  fi
done
