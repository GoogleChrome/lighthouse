#!/bin/bash

# This script is assumed to be run from the LH_ROOT directory.

set -euxo pipefail

CLOUDSDK_CORE_PROJECT=lighthouse-lantern-collect
ZONE=us-central1-a

gcloud --project="$CLOUDSDK_CORE_PROJECT" compute instances create lantern-collect-instance \
  --image-family=ubuntu-1804-lts --image-project=ubuntu-os-cloud \
  --zone="$ZONE" \
  --boot-disk-size=100GB \
  --machine-type=n1-standard-2

echo "export WPT_KEY=\"$WPT_KEY\"" > .tmp_wpt_key
echo "export WPT_URL=\"$WPT_URL\"" >> .tmp_wpt_key
# Instance needs time to start up.
until gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./.tmp_wpt_key lantern-collect-instance:/tmp/wpt-key --zone="$ZONE"
do
  echo "Waiting for start up ..."
  sleep 10
done
rm .tmp_wpt_key

gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./core/scripts/lantern/collect/gcp-setup.sh lantern-collect-instance:/tmp/gcp-setup.sh --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp ./core/scripts/lantern/collect/gcp-run.sh lantern-collect-instance:/tmp/gcp-run.sh --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh lantern-collect-instance --command="bash /tmp/gcp-setup.sh" --zone="$ZONE"
gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh lighthouse@lantern-collect-instance --command="sh -c 'nohup /home/lighthouse/gcp-run.sh > /home/lighthouse/collect.log 2>&1 < /dev/null &'" --zone="$ZONE"

set +x

echo "Collection has started."
echo "Check-in on progress anytime by running..."
echo "  $ gcloud --project="$CLOUDSDK_CORE_PROJECT" compute ssh lighthouse@lantern-collect-instance --command='tail -f collect.log' --zone=$ZONE"

echo "When complete run..."
echo "  $ gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp lantern-collect-instance:/home/lighthouse/src/lighthouse/dist/collect-lantern-traces.zip ./collect-lantern-traces.zip"
echo "  $ gcloud --project="$CLOUDSDK_CORE_PROJECT" compute scp lantern-collect-instance:/home/lighthouse/src/lighthouse/dist/golden-lantern-traces.zip ./golden-lantern-traces.zip"
echo "  $ gcloud --project="$CLOUDSDK_CORE_PROJECT" compute instances delete lantern-collect-instance"
