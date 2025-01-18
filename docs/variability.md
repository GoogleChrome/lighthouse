# Score Variability

## Summary

Lighthouse performance scores will change due to inherent variability in web and network technologies, even if there hasn't been a code change. Run Lighthouse multiple times and beware of variability before drawing conclusions about a performance-impacting change.

## Sources of Variability

Variability in performance measurement is introduced via a number of channels with different levels of impact. Below is a table containing several common sources of metric variability, the typical impact they have on results, and the extent to which they are likely to occur in different environments.

| Source                      | Impact | Typical End User | PageSpeed Insights | Controlled Lab |
| --------------------------- | ------ | ---------------- | ------------------ | -------------- |
| Page nondeterminism         | High   | LIKELY           | LIKELY             | LIKELY         |
| Local network variability   | High   | LIKELY           | UNLIKELY           | UNLIKELY       |
| Tier-1 network variability  | Medium | POSSIBLE         | POSSIBLE           | POSSIBLE       |
| Web server variability      | Low    | LIKELY           | LIKELY             | LIKELY         |
| Client hardware variability | High   | LIKELY           | UNLIKELY           | UNLIKELY       |
| Client resource contention  | High   | LIKELY           | POSSIBLE           | UNLIKELY       |
| Browser nondeterminism      | Medium | CERTAIN          | CERTAIN            | CERTAIN        |

Below are more detailed descriptions of the sources of variance and the impact they have on the most likely combinations of Lighthouse runtime + environment. While DevTools throttling and simulated throttling approaches could be used in any of these three environments, the typical end user uses simulated throttling.

### Page Nondeterminism

Pages can contain logic that is nondeterministic that changes the way a user experiences a page, i.e. an A/B test that changes the layout and assets loaded or a different ad experience based on campaign progress. This is an intentional and irremovable source of variance. If the page changes in a way that hurts performance, Lighthouse should be able to identify this case. The only mitigation here is on the part of the site owner in ensuring that the exact same version of the page is being tested between different runs.

### Local Network Variability

Local networks have inherent variability from packet loss, variable traffic prioritization, and last-mile network congestion. Users with cheap routers and many devices sharing limited bandwidth are usually the most susceptible to this. _DevTools_ throttling partially mitigates these effects by applying a minimum request latency and maximum throughput that masks underlying retries. _Simulated_ throttling mitigates these effects by replaying network activity on its own.

### Tier-1 Network Variability

Network interconnects are generally very stable and have minimal impact but cross-geo requests, i.e. measuring performance of a Chinese site from the US, can start to experience a high degree of latency introduced from tier-1 network hops. _DevTools_ throttling partially masks these effects with network throttling. _Simulated_ throttling mitigates these effects by replaying network activity on its own.

### Web Server Variability

Web servers have variable load and do not always respond with the same delay. Lower-traffic sites with shared hosting infrastructure are typically more susceptible to this. _DevTools_ throttling partially masks these effects by applying a minimum request latency in its network throttling. _Simulated_ throttling is susceptible to this effect but the overall impact is usually low when compared to other network variability.

### Client Hardware Variability

The hardware on which the webpage is loading can greatly impact performance. _DevTools_ throttling cannot do much to mitigate this issue. _Simulated_ throttling partially mitigates this issue by capping the theoretical execution time of CPU tasks during simulation.

### Client Resource Contention

Other applications running on the same machine while Lighthouse is running can cause contention for CPU, memory, and network resources. Malware, browser extensions, and anti-virus software have particularly strong impacts on web performance. Multi-tenant server environments (such as Travis, AWS, etc) can also suffer from these issues. Running multiple instances of Lighthouse at once also typically distorts results due to this problem. _DevTools_ throttling is susceptible to this issue. _Simulated_ throttling partially mitigates this issue by replaying network activity on its own and capping CPU execution.

### Browser Nondeterminism

Browsers have inherent variability in their execution of tasks that impacts the way webpages are loaded. This is unavoidable for devtools throttling as at the end of the day they are simply reporting whatever was observed by the browser. _Simulated_ throttling is able to partially mitigate this effect by simulating execution on its own, only re-using task execution times from the browser in its estimate.

### Effect of Throttling Strategies

Below is a table containing several common sources of metric variability, the typical impact they have on results, and the extent to which different Lighthouse throttling strategies are able to mitigate their effect. Learn more about different throttling strategies in our [throttling documentation](./throttling.md).

| Source                      | Impact | Simulated Throttling | DevTools Throttling  | No Throttling |
| --------------------------- | ------ | -------------------- | -------------------  | ------------- |
| Page nondeterminism         | High   | NO MITIGATION        | NO MITIGATION        | NO MITIGATION |
| Local network variability   | High   | MITIGATED            | PARTIALLY MITIGATED  | NO MITIGATION |
| Tier-1 network variability  | Medium | MITIGATED            | PARTIALLY MITIGATED  | NO MITIGATION |
| Web server variability      | Low    | NO MITIGATION        | PARTIALLY MITIGATED  | NO MITIGATION |
| Client hardware variability | High   | PARTIALLY MITIGATED  | NO MITIGATION        | NO MITIGATION |
| Client resource contention  | High   | PARTIALLY MITIGATED  | NO MITIGATION        | NO MITIGATION |
| Browser nondeterminism      | Medium | PARTIALLY MITIGATED  | NO MITIGATION        | NO MITIGATION |

## Strategies for Dealing With Variance

### Run on Adequate Hardware

Loading modern webpages on a modern browser is not an easy task. Using appropriately powerful hardware can make a world of difference when it comes to variability.

- Minimum 2 dedicated cores (4 recommended)
- Minimum 2GB RAM (4-8GB recommended)
- Avoid non-standard Chromium flags (`--single-process` is not supported, `--no-sandbox` and `--headless` should be OK, though educate yourself about [sandbox tradeoffs](https://github.com/GoogleChrome/lighthouse-ci/tree/fbb540507c031100ee13bf7eb1a4b61c79c5e1e6/docs/recipes/docker-client#--no-sandbox-issues-explained))
- Avoid function-as-a-service infrastructure (Lambda, GCF, etc)
- Avoid "burstable" or "shared-core" instance types (AWS `t` instances, GCP shared-core N1 and E2 instances, etc)

AWS's `m5.large`, GCP's `n2-standard-2`, and Azure's `D2` all should be sufficient to run a single Lighthouse run at a time (~$0.10/hour for these instance types, ~30s/test, ~$0.0008/Lighthouse report). While some environments that don't meet the requirements above will still be able to run Lighthouse and the non-performance results will still be usable, we'd advise against it and won't be able to support those environments should any bugs arise. Remember, running on inconsistent hardware will lead to inconsistent results!

**DO NOT** collect multiple Lighthouse reports at the same time on the same machine. Concurrent runs can skew performance results due to resource contention. When it comes to Lighthouse runs, scaling horizontally is better than scaling vertically (i.e. run with 4 `n2-standard-2` instead of 1 `n2-standard-8`).

### Isolate External Factors

- Isolate your page from third-party influence as much as possible. It’s never fun to be blamed for someone else's variable failures.
- Isolate your own code’s nondeterminism during testing. If you’ve got an animation that randomly shows up, your performance numbers might be random too!
- Isolate your test server from as much network volatility as possible. Use localhost or a machine on the same exact network whenever stability is a concern.
- Isolate your client environment from external influences like anti-virus software and browser extensions. Use a dedicated device for testing when possible.

If your machine has really limited resources or creating a clean environment has been difficult, use a hosted lab environment like PageSpeed Insights or WebPageTest to run your tests for you. In continuous integration situations, use dedicated servers when possible. Free CI environments and “burstable” instances are typically quite volatile.

### Run Lighthouse Multiple Times

When creating your thresholds for failure, either mental or programmatic, use aggregate values like the median, 90th percentile, or even min/max instead of single test results.

The median Lighthouse score of 5 runs is twice as stable as 1 run. There are multiple ways to get a Lighthouse report, but the simplest way to run Lighthouse multiple times and also get a median run is to use [lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci/).

```bash
npx -p @lhci/cli lhci collect --url https://example.com -n 5
npx -p @lhci/cli lhci upload --target filesystem --outputDir ./path/to/dump/reports
```

> Note: you must have [Node](https://nodejs.org/en/download/package-manager/) installed.

You can then process the reports that are output to the filesystem. Read the [Lighthouse CI documentation](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md#outputdir) for more.

```js
const fs = require('fs');
const lhciManifest = require('./path/to/dump/reports/manifest.json');
const medianEntry = lhciManifest.find(entry => entry.isRepresentativeRun)
const medianResult = JSON.parse(fs.readFileSync(medianEntry.jsonPath, 'utf-8'));
console.log('Median performance score was', medianResult.categories.performance.score * 100);
```

You can also direct `lighthouse-ci` to use PageSpeedInsights:

```bash
npx -p @lhci/cli lhci collect --url https://example.com -n 5 --mode psi --psiApiKey xXxXxXx
npx -p @lhci/cli lhci upload --target filesystem --outputDir ./path/to/dump/reports
```

If you're running Lighthouse directly via node, you can use the `computeMedianRun` function to determine the median using a blend of the performance metrics.

```js
const spawnSync = require('child_process').spawnSync;
const lighthouseCli = require.resolve('lighthouse/cli');
const {computeMedianRun} = require('lighthouse/core/lib/median-run.js');

const results = [];
for (let i = 0; i < 5; i++) {
  console.log(`Running Lighthouse attempt #${i + 1}...`);
  const {status = -1, stdout} = spawnSync('node', [
    lighthouseCli,
    'https://example.com',
    '--output=json'
  ]);
  if (status !== 0) {
    console.log('Lighthouse failed, skipping run...');
    continue;
  }
  results.push(JSON.parse(stdout));
}

const median = computeMedianRun(results);
console.log('Median performance score was', median.categories.performance.score * 100);
```

## Related Documentation

- [Lighthouse Variability and Accuracy Analysis](https://docs.google.com/document/d/1BqtL-nG53rxWOI5RO0pItSRPowZVnYJ_gBEQCJ5EeUE/edit?usp=sharing)
- [Throttling documentation](./throttling.md)
- [Why is my Lighthouse score different from PageSpeed Insights?](https://www.debugbear.com/blog/why-is-my-lighthouse-score-different-from-pagespeed-insights)
