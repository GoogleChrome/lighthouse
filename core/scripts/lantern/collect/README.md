# Lantern Collect Traces

Collects many traces using a local machine (optionally on GCP).

Each URL is processed one a time: first as unthrottled (but still with mobile UA/viewport emulation), then again right after but with DevTools applied throttling. The runs are done back-to-back to avoid potential variance introduced by a site changing its content.

These traces are used to evaluate changes to the Lantern network and CPU emulation. The unthrottled results are run through Lantern, and we snapshot how closely they match against the results that were throttled (via `yarn test-lantern`).

Historical note: we used to collect the mobile traces from WebPageTest, however their API no longer supports real mobile devices.

## Verify URLs

```sh
node --input-type=module -e "import urls from './urls.js'; console.log(urls.join('\n'))" |\
  xargs -P 10 -I{} curl -A 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3694.0 Mobile Safari/537.36 Chrome-Lighthouse' -o /dev/null -s --write-out '%{http_code} {} (if redirect: %{redirect_url})\n' {} |\
  sort
```

Note: some good URLs will 4xx b/c the site blocks such usages of `curl`.

## Run locally

```sh
DEBUG=1 node --max-old-space-size=4096 collect.js
```

Output will be in `dist/collect-lantern-traces`, and zipped at `dist/collect-lantern-traces.zip`.

But - don't upload this for official updates to the test traces. Run from GCP instead.

## Run in GCP

```sh
core/scripts/lantern/collect/gcp-create-and-run.sh
```

Rename the zip with the current date (ex: `golden-lantern-traces-2026-10-10.zip`), upload it to http://go/lhsth and the `lantern-test-data` GitHub release (`gh release upload lantern-test-data golden-lantern-traces-$VERSION.zip`), and update `VERSION` in `download-traces.sh`.

## Historical trace databases

### December 2019

There are 9 runs for each URL in the big zip. The golden zip contains just the median runs (by performance score), along with a dump of the `metrics` collected by Lighthouse. This sampling method was dropped for future trace database updates. The mobile traces here came from a Moto G4 via WPT.

[Download all](https://drive.google.com/open?id=17WsQ3CU0R1072sezXw5Np2knV_NvGAfO) traces (3.2GB zipped, 19GB unzipped).
[Download golden](https://drive.google.com/open?id=1aQp-oqX7jeFq9RFwNik6gkEZ0FLtjlHp) traces (363MB zipped, 2.1GB unzipped).
