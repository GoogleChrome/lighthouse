# Lantern Dataset Update — Next Steps (2026)

Tracking issue: https://github.com/GoogleChrome/lighthouse/issues/15150

## Prerequisites (Completed)

- [x] **Chromium**: Throttled `LoadTimingInfo::receive_headers_start` under DevTools network latency emulation ([CL 8518525](https://chromium-review.googlesource.com/c/chromium/src/+/8518525), landed at `#1711946`).
- [x] **Chromium**: Added script location data (`url`, `scriptId`, etc.) to `v8.evaluateModule` trace events ([CL 8508745](https://chromium-review.googlesource.com/c/chromium/src/+/8508745), landed at `#1715309`).
- [x] **Chrome Canary (`157.0.8095.0+` / `#1715444`)**: Contains both Chromium CLs and is configured in `core/scripts/lantern/collect/gcp-setup.sh` and `gcp-run.sh` (`google-chrome-canary`).
- [x] **DevTools / `@paulirish/trace_engine@0.0.66`**: Upgraded in Lighthouse (#17307) with Lantern fixes for `renderBlocking`, HTTP/3 connection multiplexing, connectionless requests, module compilation/evaluation trace events, same-frame text LCP/FCP graphs, negative `CPUNode` duration, and `addDependencyOnUrl`.
- [x] **Lighthouse**: Fixed simulated `LCPBreakdown` `lcpLoadDelay` / `lcpLoadDuration` calculation (#17269) and `INTERNAL_LANTERN_USE_TRACE` test assertions (#17314).

---

## Step-by-Step Dataset Update Process

### 1. (Optional) Local Smoke Test of `collect.js`
Verify the collection script on a single URL before launching the GCP job:

```bash
rm -rf dist/collect-lantern-traces*
TEST_URLS="https://www.example.com" DEBUG=1 node --max-old-space-size=4096 ./core/scripts/lantern/collect/collect.js
```

Verify that `dist/collect-lantern-traces/site-index-plus-golden-expectations.json` and `dist/collect-lantern-traces.zip` are generated with non-empty `wpt3g` (`firstContentfulPaint`, `timeToConsistentlyInteractive`, `speedIndex`, `largestContentfulPaint`, `timeToFirstByte`, `lcpLoadDelay`, `lcpLoadDuration`) and `unthrottled` paths.

### 2. Collect Traces on GCP
Make sure this branch (`lantern-traces-2026`) is pushed to `origin`, then create the GCE instance and start collection:

```bash
./core/scripts/lantern/collect/gcp-create-and-run.sh
```

Monitor progress:

```bash
export CLOUDSDK_AUTH_ACCESS_TOKEN=$(gcloud auth application-default print-access-token)
gcloud --project=lighthouse-lantern-collect compute ssh lantern-collect-instance --command='tail -f /home/lighthouse/collect.log' --zone=us-central1-a
```

When complete, download the zip and delete the VM:

```bash
export CLOUDSDK_AUTH_ACCESS_TOKEN=$(gcloud auth application-default print-access-token)
gcloud --project=lighthouse-lantern-collect compute scp lantern-collect-instance:/home/lighthouse/src/lighthouse/dist/collect-lantern-traces.zip ./collect-lantern-traces.zip --zone=us-central1-a
gcloud --project=lighthouse-lantern-collect compute instances delete lantern-collect-instance --zone=us-central1-a
```

### 3. Archive & Unpack the Dataset
1. Set a version string (e.g. `VERSION="2026-10-10"`):
   - Rename `collect-lantern-traces.zip` to `golden-lantern-traces-$VERSION.zip` and upload it to the `lantern-test-data` GitHub release (`gh release upload lantern-test-data golden-lantern-traces-$VERSION.zip`) and `gs://lh-lantern-data/` (`http://go/lhsth`).
   - Update `VERSION` in `core/scripts/lantern/download-traces.sh`.
2. Unpack locally into `./lantern-data/`:
   ```bash
   rm -rf lantern-data
   mkdir -p lantern-data
   unzip -q collect-lantern-traces.zip -d lantern-data
   echo "$VERSION" > lantern-data/version
   ```

### 4. Run Lantern on the New Dataset & Evaluate Accuracy
Run Lantern across all collected unthrottled traces:

```bash
node ./core/scripts/lantern/run-on-all-assets.js
```

Generate the baseline computed values and accuracy files so `print-correlations.js` has a baseline for the new URL set:

```bash
yarn update:lantern-baseline
node ./core/scripts/lantern/print-correlations.js
```

Review the output of `print-correlations.js`:
- Check Spearman's rho, MAPE, and p50/p90/p95 error percentiles for `FCP`, `TTI`, `SI`, `LCP`, `TTFB`, `lcpLoadDelay`, and `lcpLoadDuration`.
- Inspect any sites in the "worst 10 sites" lists for outliers or broken pages that should be excluded or investigated.
- Optionally compare trace-engine Lantern vs. `devtoolsLog` Lantern across the dataset:
  ```bash
  INTERNAL_LANTERN_USE_TRACE=1 node ./core/scripts/lantern/run-on-all-assets.js
  node ./core/scripts/lantern/print-correlations.js
  ```

### 5. Finalize Baseline & Open PR
1. Run `yarn update:lantern-baseline` to write the final `core/test/fixtures/lantern-baseline-computed-values.json` and `core/test/fixtures/lantern-baseline-accuracy.json`.
2. Verify that `node ./core/scripts/lantern/assert-baseline-lantern-values-unchanged.js` passes.
3. Restore `git checkout -f origin/main` in `core/scripts/lantern/collect/gcp-run.sh` and delete this `TODO.md` before merging to `main`.
