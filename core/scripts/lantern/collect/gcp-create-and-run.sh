#!/bin/bash

# This script is assumed to be run from the LH_ROOT directory.

set -euxo pipefail

CLOUDSDK_CORE_PROJECT=lighthouse-lantern-collect
ZONE=us-central1-a

if ! gcloud --project="$CLOUDSDK_CORE_PROJECT" compute instances list >/dev/null 2>&1; then
  export CLOUDSDK_AUTH_ACCESS_TOKEN=$(gcloud auth application-default print-access-token)
fi

gcloud --project="$CLOUDSDK_CORE_PROJECT" compute instances create lantern-collect-instance \
  --image-family=ubuntu-2204-lts --image-project=ubuntu-os-cloud \
  --zone="$ZONE" \
  --boot-disk-size=200GB \
  --boot-disk-type=pd-standard \
  --machine-type=n1-standard-4

# Instance needs time to start up.
echo "ok" > .tmp_connected
until gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./.tmp_connected lantern-collect-instance:/tmp/.tmp_connected --zone="$ZONE"
do
  echo "Waiting for start up ..."
  sleep 10
done
rm .tmp_connected

gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./core/scripts/lantern/collect/gcp-setup.sh lantern-collect-instance:/tmp/gcp-setup.sh --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./core/scripts/lantern/collect/gcp-run.sh lantern-collect-instance:/tmp/gcp-run.sh --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh lantern-collect-instance --command="bash /tmp/gcp-setup.sh" --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh lantern-collect-instance --command="sudo -u lighthouse -H sh -c 'TEST_URLS=\"${TEST_URLS:-}\" nohup /home/lighthouse/gcp-run.sh > /home/lighthouse/collect.log 2>&1 < /dev/null &'" --zone="$ZONE"

set +x

echo "Collection has started."
echo "Check-in on progress anytime by running..."
echo "  $ gcloud --project=$CLOUDSDK_CORE_PROJECT compute ssh lantern-collect-instance --command='tail -f /home/lighthouse/collect.log' --zone=$ZONE"

echo "When complete run..."
echo "  $ gcloud --project=$CLOUDSDK_CORE_PROJECT compute scp lantern-collect-instance:/home/lighthouse/src/lighthouse/dist/collect-lantern-traces.zip ./collect-lantern-traces.zip --zone=$ZONE"
echo "  $ gcloud --project=$CLOUDSDK_CORE_PROJECT compute instances delete lantern-collect-instance --zone=$ZONE"
