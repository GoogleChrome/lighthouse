# Lantern Dataset Update — Next Steps (2026)

Tracking issue: https://github.com/GoogleChrome/lighthouse/issues/15150

## Prerequisites (Completed)

- [x] **Chromium**: Throttled `LoadTimingInfo::receive_headers_start` under DevTools network latency emulation ([CL 8518525](https://chromium-review.googlesource.com/c/chromium/src/+/8518525), landed at `#1711946`).
- [x] **Chromium**: Added script location data (`url`, `scriptId`, etc.) to `v8.evaluateModule` trace events ([CL 8508745](https://chromium-review.googlesource.com/c/chromium/src/+/8508745), landed at `#1715309`).
- [x] **Chrome Canary (`157.0.8095.0+` / `#1715444`)**: Contains both Chromium CLs and is configured in `core/scripts/lantern/collect/gcp-setup.sh` and `gcp-run.sh` (`google-chrome-canary`).
- [x] **DevTools / `@paulirish/trace_engine@0.0.67`**: Upgraded in Lighthouse (#17307, #17379) with Lantern fixes for `renderBlocking`, HTTP/3 connection multiplexing, connectionless requests, module compilation/evaluation trace events, same-frame text LCP/FCP graphs, negative `CPUNode` duration, `addDependencyOnUrl`, and cross-origin redirect URLs scrubbed to origin in trace ([DevTools CL 8544953](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/8544953)).
- [x] **Lighthouse**: Fixed simulated `LCPBreakdown` `lcpLoadDelay` / `lcpLoadDuration` calculation (#17269) and `INTERNAL_LANTERN_USE_TRACE` test assertions (#17314).
- [x] **Lighthouse**: Restored `yarn test-lantern` in CI (#17316), fixed test blind spots (#17322), and renamed `LCPNetworkRecord` to include `Media` requests (#17324).

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

---

## Accuracy Comparison (2019 Baseline vs. 2026 Sample Run) & Future Improvements

### Sample Run Comparison (`devtoolsLog` / `TraceEngine`)

Comparison of `print-correlations.js` `roughEstimate*` error percentiles (`|estimated - wpt3g| / wpt3g`) between the existing 2019 dataset baseline (`core/test/fixtures/lantern-baseline-accuracy.json`, 77 sites) and the 2026 GCP 12-URL sample run (11 sites completed):

| Metric (`roughEstimate*`) | 2019 Baseline (77 sites) **p50** | 2026 Sample (11 sites) **p50** | 2019 Baseline **p90** | 2026 Sample **p90** | 2019 Baseline **p95** | 2026 Sample **p95** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **FCP** (`roughEstimateOfFCP`) | `29.1%` | `32.6%` / `32.6%` | `48.8%` | `47.5%` / `47.5%` | `51.9%` | `96.3%` / `96.3%` |
| **TTI** (`roughEstimateOfTTI`) | `27.4%` | `25.0%` / `22.7%` | `58.4%` | `46.0%` / `47.7%` | `72.6%` | `171.5%` / `171.5%` |
| **SI** (`roughEstimateOfSI`) | `24.9%` | `39.2%` / `36.6%` | `55.7%` | `146.6%` / `146.6%` | `65.2%` | `242.2%` / `242.2%` |
| **LCP** (`roughEstimateOfLCP`) | `20.6%` | `37.6%` / `41.2%` | `61.9%` | `346.0%` / `346.0%` | `88.8%` | `391.3%` / `391.3%` |
| **TTFB** (`roughEstimateOfTTFB`) | *(not tracked)* | `3.6%` / `3.6%` | *(not tracked)* | `52.1%` / `52.1%` | *(not tracked)* | `59.2%` / `59.2%` |
| **LCP Load Delay** (`roughEstimateOfLCPLoadDelay`) | *(not tracked)* | `145.1%` / `145.1%` | *(not tracked)* | `809.5%` / `809.5%` | *(not tracked)* | `809.5%` / `809.5%` |
| **LCP Load Duration** (`roughEstimateOfLCPLoadDuration`) | *(not tracked)* | `85.3%` / `85.3%` | *(not tracked)* | `98.3%` / `98.3%` | *(not tracked)* | `98.3%` / `98.3%` |
| **Overall (`roughEstimate*` pooled)** | **`26.0%`** *(4 metrics)* | **`34.5%` / `32.2%`** *(7 metrics)* | **`55.7%`** | **`146.6%` / `146.6%`** | **`67.1%`** | **`346.0%` / `346.0%`** |

### Role of the Dataset & Why the Numbers Look This Way

1. **Regression Guard vs. Accuracy Benchmark**:
   - **In CI (`yarn test-lantern`)**: `assert-baseline-lantern-values-unchanged.js` only checks that Lantern produces the exact same values as `lantern-baseline-computed-values.json` within `0.05%`—it does not assert on `wpt3g` error percentiles. Its primary CI value is catching unintended changes and crashes across real-world traces.
   - **During Lantern development (`print-correlations.js`)**: Comparing against `wpt3g` golden values is used to evaluate relative improvements/regressions (`↑` / `↓`) when changing graph construction or simulator parameters, and to surface extreme outliers (`>100%–300%` error) that reveal real bugs or blind spots.
2. **Why the Pooled `Overall Error Percentiles` Are Higher**:
   - **Pooling 3 new metrics**: `print-correlations.js` now includes `roughEstimateOfTTFB`, `roughEstimateOfLCPLoadDelay`, and `roughEstimateOfLCPLoadDuration` in `allEvaluations`. Because `lcpLoadDelay` and `lcpLoadDuration` are small sub-intervals (often ~50–150 ms), small absolute ms differences produce huge relative `%` errors (`145.1%` and `85.3%` at `p50`), pulling up the pooled summary.
   - **Small sample size (`N = 11`)**: At `N = 11`, `p90` and `p95` reflect the single worst outlier site in the sample (`sfbay.craigslist.org` / `posit.cloud`).

### Ideas for Improving Lantern Accuracy

1. **Use Lantern's Simulated `nodeTimings` for `LCPBreakdown` (`core/computed/metrics/lcp-breakdown.js`)**:
   - Currently, `LCPBreakdown` computes simulated `loadStart` and `loadEnd` by uniformly scaling the unthrottled timestamps by `throttleRatio = metricLcp / observedLcp`.
   - On an unthrottled 10 Gbps GCP VM, an LCP image often downloads in `1–3 ms` (`observedLoadDuration ≈ 2 ms`), whereas under simulated 3G it takes `500–1,500 ms`. Scaling `2 ms` by a `~4x` overall LCP ratio yields a simulated `loadDuration` of `~8 ms` (`~95%` underestimate) and dumps all remaining simulated time into `loadDelay` (`145%–809%` overestimate).
   - **Fix**: Look up `lcpRecord` in `LanternLargestContentfulPaint`'s simulated `nodeTimings` (`optimisticEstimate.nodeTimings` / `pessimisticEstimate.nodeTimings`) to get the simulator's actual `startTime` and `endTime` for the LCP network request.
2. **Investigate LCP / SI Outliers on the Full Dataset**:
   - **Unthrottled "fast-finish" over-inclusion (`sfbay.craigslist.org`, `wpt3g` LCP `1.2s` vs. Lantern `5.2s`)**: `FirstContentfulPaint.getFirstPaintBasedGraph` includes any network request whose unthrottled `endTime` is before `observedLcp` (unless flagged as non-critical XHR/image). On a fast unthrottled VM, async scripts or secondary resources can finish before `observedLcp` and get treated as LCP dependencies in the 3G simulation.
   - **Large JS / SPA waterfalls (`posit.cloud`, `wpt3g` LCP `4.2s` vs. Lantern `20.8s`)**: Inspect with `debug-url.js` once the full dataset is collected to see if pessimistic CPU/network dependency edges are over-serializing tasks.
3. **Re-evaluate Metric Coefficients (`intercept`, `optimistic`, `pessimistic`)**:
   - Once the full ~100-site 2026 dataset is collected, evaluate whether the static linear combination weights in `FirstContentfulPaint.ts`, `LargestContentfulPaint.ts`, `SpeedIndex.ts`, and `Interactive.ts` (originally tuned on the 2018/2019 HTTP/1.1 & HTTP/2 dataset) benefit from re-tuning for modern HTTP/3 and JS bundle patterns.

