# Usage

By default, the instance will be called `lighthouse-collection-$gcloudusername-instance0` but you can replace `instance0` by supplying an arg to `run.sh`.

1. Googlers: [set up ssh to gcloud](go/common-fw-policy-flows).
1. Spin up machines and start the collection.
   1. (Prerequiste) Install GCloud SDK and authenticate locally, Run `brew install google-cloud-sdk && gcloud auth login`
    1. (Prerequiste Googlers only) Ensure you're on the corp VPN or you won't be able to SSH into a Google-owned instance (run `gcert`).
   1. (Optional) Run `export TARGET_GIT_REF=<a lighthouse git ref that has been pushed> ` if wanting to run on anything but main.
   1. (Optional) Run `export TARGET_RUNS=<a number> ` if needing more than 1 run per URL.
   1. (Optional) Run `export LIGHTHOUSE_FLAGS=...` to configure Lighthouse CLI.
   1. (Optional) Run `export LIGHTHOUSE_COLLECTION_GCLOUD_PROJECT=<project name> ` to set your GCloud project.
   1. Run `bash core/scripts/gcp-collection/fleet-create.sh path/to/your/url/list.txt` from the repo root.
1. Check status of collection, download data, and kill machines on completion.
   1. Run `bash core/scripts/gcp-collection/fleet-status.sh` to check on status and download the data.
   1. Run `bash core/scripts/gcp-collection/fleet-status.sh --kill` to check on the status and terminate finished instances.
1. Analyze the results
   1. Bespoke for now :)
   1. Example [analysis](https://docs.google.com/document/d/1uoLYWlhRXHo-kCKnte0HZcCjy5VWOStDe0X78XlIf1o/edit?ts=602c4fd1&resourcekey=0-_FA55GhVpUYqfNsnCVzPdw)

## Future Work

- Collect a more comprehensive URL set for `urls.txt`
- Autodetermine the instance collect instance by n+1 the existing instances
- Add analysis scripts (similar to [`preprocess.sh`](https://github.com/patrickhulce/dzl-lighthouse/blob/60447f652dc15cacfa603fdf7c88b1add4229d1d/cwv/analyze/preprocess.sh) and [`analyze-ab-test.js`](https://github.com/patrickhulce/dzl-lighthouse/blob/60447f652dc15cacfa603fdf7c88b1add4229d1d/cwv/analyze/analyze-ab-test.js))
