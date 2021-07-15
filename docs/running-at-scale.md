
# Running Lighthouse at Scale

Many Lighthouse users want to collect Lighthouse data for hundreds or thousands of URLs daily. First, anyone interested should understand [how variability plays into web performance measurement](./variability.md) in the lab.

There are three primary options for gathering Lighthouse data at scale.

## Option 1: Using the PSI API

The default quota of the [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started) is 25,000 requests per day. Of course, you can't test localhost or firewalled URLs using the PSI API, unless you use a security-concerning solution like [ngrok](https://ngrok.com/) to web-expose them.

A huge benefit of using the PSI API is that you don't need to create and maintain [a stable testing environment](./variability.md#run-on-adequate-hardware) for Lighthouse to run.  The PSI API has Lighthouse running on Google infrastructure which offers good reproducibility.

* PRO: You don't need to maintain testing hardware.
* PRO: A simple network request returns complete Lighthouse results
* CON: The URLs must be web-accessible.

Approx eng effort: ~5 minutes for the first result. ~30 minutes for a script that evaluates and saves the results for hundreds of URLs.

## Option 2: Using the Lighthouse CLI on cloud hardware

The [Lighthouse CLI](https://github.com/GoogleChrome/lighthouse#using-the-node-cli) is the foundation of most advanced uses of Lighthouse and provides considerable configuration possibilities. For example, you could launch a fresh Chrome in a debuggable state (`chrome-debug --port=9222`) and then have Lighthouse repeatedly reuse the same Chrome. (`lighthouse <url> --port=9222`). That said, we wouldn't recommend this above a hundred loads, as state can accrue in a Chrome profile. Using a fresh profile for each Lighthouse run is the best approach for reproducible results.

Many teams have wrapped around the Lighthouse CLI with bash, python, or node scripts. The npm modules [multihouse](https://github.com/samdutton/multihouse) and [lighthouse-batch](https://www.npmjs.com/package/lighthouse-batch) both leverage this pattern.

You'll be running Lighthouse CLI on your own machines, and we have guidance on the [specs of machines suitable](./variability.md#run-on-adequate-hardware) for running Lighthouse without skewing performance results. The environment must also be able to run either headful Chrome or headless Chrome.

* PRO: Ultimate configurability
* CON: Must create and maintain testing environment

Approx eng effort: 1 day for the first result, after provisioning and setup. Another 2-5 days for calibrating, troubleshooting, handling interaction with cloud machines.

## Option 3: Using Lighthouse CI in the cloud

[Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci#readme) leverages the CLI at its core and it provides a complete experience for those who want to understand how each commit in development affects their Lighthouse results. So while the product is designed for running Lighthouse for every pushed git commit, it's possible to use it for some production monitoring usecases. See [this recipe](https://github.com/GoogleChrome/lighthouse-ci/issues/5#issuecomment-591578507) to fake git commit data while testing production URLs.

* PRO: Easy multiple-run configuration, selection of median run
* PRO: Server UI offers timeseries graphs [(example)](https://lhci-canary.herokuapp.com/app/projects/d1e4b15c-e644-4552-b136-e975f486a2ce/dashboard) supported by [straightforward APIs](https://github.com/GoogleChrome/lighthouse-ci/blob/master/packages/server/src/api/routes/projects.js).
* CON: Must create and maintain testing environment
* CON: Must setup and maintain Lighthouse CI server

Approx eng effort: ½ day for the first result, after provisioning and setup. Another 1-3 days for calibrating, troubleshooting, working with the API/UI.
