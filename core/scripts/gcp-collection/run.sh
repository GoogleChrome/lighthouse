#!/bin/bash

set -euxo pipefail

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."
cd $DIRNAME

GCLOUD_USER=$(gcloud config get-value account | awk -F '@' '{gsub("[^a-z]","",$1); print $1}')
INSTANCE_SUFFIX=${1:-instance0}
INSTANCE_NAME="lighthouse-collection-$GCLOUD_USER-$INSTANCE_SUFFIX"
CLOUDSDK_CORE_PROJECT=${LIGHTHOUSE_COLLECTION_GCLOUD_PROJECT:-lighthouse-lantern-collect}
LIGHTHOUSE_GIT_REF=${TARGET_GIT_REF:-main}
NUMBER_OF_RUNS=${TARGET_RUNS:-1}
BASE_LIGHTHOUSE_FLAGS="--max-wait-for-load=90000 ${LIGHTHOUSE_FLAGS:-}"
ZONE=us-central1-a

gcloud --project="$CLOUDSDK_CORE_PROJECT" compute instances create $INSTANCE_NAME \
  --image-family=ubuntu-1804-lts --image-project=ubuntu-os-cloud \
  --zone="$ZONE" \
  --boot-disk-size=200GB \
  --machine-type=n1-standard-2

cat > .tmp_env <<EOF
export NUMBER_OF_RUNS=$NUMBER_OF_RUNS
export LIGHTHOUSE_GIT_REF=$LIGHTHOUSE_GIT_REF
export BASE_LIGHTHOUSE_FLAGS="$BASE_LIGHTHOUSE_FLAGS"
EOF

# Instance needs time to start up.
until gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./.tmp_env $INSTANCE_NAME:/tmp/lhenv --zone="$ZONE" --scp-flag="-o ConnectTimeout=5"
do
  echo "Waiting for start up (scp connection errors are expected for ~30s) ..."
  sleep 10
done
rm .tmp_env

gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./gcp-setup.sh $INSTANCE_NAME:/tmp/setup-machine.sh --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./urls.txt $INSTANCE_NAME:/tmp/urls.txt --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./gcp-run.sh $INSTANCE_NAME:/tmp/run.sh --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./gcp-run-on-url.sh $INSTANCE_NAME:/tmp/run-on-url.sh --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh $INSTANCE_NAME --command="bash /tmp/setup-machine.sh" --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh lighthouse@$INSTANCE_NAME --command="sh -c 'nohup /home/lighthouse/run.sh > /home/lighthouse/collect.log 2>&1 < /dev/null &'" --zone="$ZONE"

set +x

echo "Collection has started."
echo "Check-in on progress anytime by running..."
echo "  $ bash core/scripts/gcp-collection/fleet-status.sh"
echo "  $ gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh lighthouse@$INSTANCE_NAME --command='tail -f collect.log' --zone=$ZONE"

TRACE_COPY_COMMAND="gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp $INSTANCE_NAME:/home/lighthouse/trace-data.tar.gz ./trace-data.tar.gz --zone=$ZONE"
LHR_COPY_COMMAND="gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp $INSTANCE_NAME:/home/lighthouse/lhr-data.tar.gz ./lhr-data.tar.gz --zone=$ZONE"
LOGS_COPY_COMMAND="gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp $INSTANCE_NAME:/home/lighthouse/collect.log ./collect.log --zone=$ZONE"
DELETE_INSTANCE_COMMAND="gcloud --project="$CLOUDSDK_CORE_PROJECT" compute instances delete $INSTANCE_NAME --zone=$ZONE"
echo "When complete run..."
echo "  For LHR + trace data for -A replication"
echo "  $ bash .tmp/gcp/$INSTANCE_NAME-copy-traces.sh"
echo "  For LHR data for smaller transfer sizes replication"
echo "  $ bash .tmp/gcp/$INSTANCE_NAME-copy-lhrs.sh"
echo "  To delete the instance"
echo "  $ bash .tmp/gcp/$INSTANCE_NAME-delete.sh"

cd $LH_ROOT
mkdir -p .tmp/gcp/
echo "$LOGS_COPY_COMMAND" > ".tmp/gcp/$INSTANCE_NAME-copy-logs.sh"
echo "$TRACE_COPY_COMMAND" > ".tmp/gcp/$INSTANCE_NAME-copy-traces.sh"
echo "$LHR_COPY_COMMAND" > ".tmp/gcp/$INSTANCE_NAME-copy-lhrs.sh"
echo "$DELETE_INSTANCE_COMMAND" > ".tmp/gcp/$INSTANCE_NAME-delete.sh"
