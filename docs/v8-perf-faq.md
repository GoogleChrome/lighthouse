# v8.0 Performance FAQ

### Give me a summary of the perf score changes in v8.0. What's new/different?

First, it may be useful to refresh on [the math behind Lighthouse's metric
scores and performance score.](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)

In [Lighthouse v8.0](https://github.com/GoogleChrome/lighthouse/releases/tag/v8.0.0), we updated the score curves for FCP and TBT measurements,
making both a bit more strict. CLS has been updated to its new, [windowed
definition](https://web.dev/articles/evolving-cls). Additionally, the Performance
Score's weighted average was
[rebalanced](https://googlechrome.github.io/lighthouse/scorecalc/#FCP=3000&SI=5800&FMP=4000&TTI=7300&FCI=6500&LCP=4000&TBT=600&CLS=0.25&device=mobile&version=8&version=6&version=5),
giving more weight to CLS and TBT than before, and slightly decreasing the
weights of FCP, SI, and TTI.

From an analysis of HTTP Archive's latest [crawl of the
web](https://httparchive.org/faq#how-does-the-http-archive-decide-which-urls-to-test),
we project that the performance score for the majority of sites will stay the
same or improve in Lighthouse 8.0.
- ~20% of sites may see a drop of up to 5 points, though likely less
- ~20% of sites will see little detectable change
- ~30% of sites should see a moderate improvement of a few points
- ~30% could see a significant improvement of 5 points or more

The biggest drops in scores are due to TBT scoring becoming stricter and the
metric's slightly higher weight. The biggest improvements in scores are also due
to TBT changes in the long tail and the windowing of CLS, and both metrics'
higher weights.

### What are the exact score weighting changes?

#### Changes by metric

| metric                         | v6 weight | v8 weight | Δ |
|--------------------------------|-----------|-----------|----------|
| First Contentful Paint (FCP)   | 15        | **10**    | -5       |
| Speed Index (SI)               | 15        | **10**    | -5       |
| Largest Contentful Paint (LCP) | 25        | **25**    | 0        |
| Time To Interactive (TTI)        | 15        | **10**    | -5       |
| Total Blocking Time (TBT)        | 25        | **30**    | 5        |
| Cumulative Layout Shift (CLS)    | 5         | **15**    | 10       |

#### Changes by phase

| phase          | metric                         | v6 phase weight | v8 phase weight | Δ   |
|----------------|--------------------------------|-----------------|-----------------|-----|
| early          | First Contentful Paint (FCP)   | 15              | 10              | -5  |
| mid            | Speed Index (SI)               | 40              | 35              | -5  |
|                | Largest Contentful Paint (LCP) |                 |                 |     |
| interactivity  | Time To Interactive (TTI)      | 40              | 40              | 0   |
|                | Total Blocking Time (TBT)      |                 |                 |     |
| predictability | Cumulative Layout Shift (CLS)  | 5               | 15              | 10  |

### Why did the weight of CLS go up?

When introduced in Lighthouse v6, it was still early days for the metric.
There've been [many improvements and
bugfixes](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/speed/metrics_changelog/cls.md)
to the CLS metric since then. Now, given its maturity and established placement in Core
Web Vitals, the weight increases from 5% to 15%.

### Why are the Core Web Vitals metrics weighted differently in the performance score?

The Core Web Vitals metrics are [independent signals in the Page Experience
ranking
update](https://support.google.com/webmasters/thread/104436075/core-web-vitals-page-experience-faqs-updated-march-2021).
Lighthouse weighs each lab equivalent metric based on what we believe creates
the best incentives to improve overall page experience for users.

LCP, CLS, and TBT are [very good
metrics](https://chromium.googlesource.com/chromium/src/+/lkgr/docs/speed/good_toplevel_metrics.md)
and that's why they are the three highest-weighted metrics in the performance
score.

### How should I think about the Lighthouse performance score in relation to Core Web Vitals?

[Core Web Vitals](https://web.dev/articles/vitals) refer to a specific set of key user
experience metrics, their passing thresholds, and percentile at which they're measured.
In general, CWV's primary focus is field data.

The Lighthouse score is a means to understand the degree of opportunity
available to improve critical elements of user experience. The lower the score,
the more likely the user will struggle with load performance, responsiveness, or
content stability.

Lighthouse's lab-based data overlaps with Core Web Vitals in a few key ways.
Lighthouse features two of the three core vitals (LCP and CLS) with the exact
same passing thresholds. There's no user input in a Lighthouse run, so it cannot
compute FID. Instead, we have TBT, which you can consider a proxy metric for
FID, and though they measure two different things they are both signals about a
page's interactivity.

_So CWV and Lighthouse have commonalities, but are different. How can you
rationalize paying attention to both?_

Ultimately, a combination approach is most effective. Use field data for the
long-term overview of your user's experience, and use lab data to iterate your
way to the best experience possible for your users. CrUX data summarizes [the
most recent 28
days](https://developers.google.com/web/tools/chrome-user-experience-report/api/reference#data-pipeline),
so it'll take some time to confidently determine that any change has definite
impact.

Lighthouse's analysis allows you to debug and optimize in an environment that is
repeatable with an immediate feedback loop. In addition, lab-based tooling can
provide significantly more detail than field instrumentation, as it's not
limited to web-exposed APIs and cross-origin restrictions.

The exact numbers of your lab and field metrics aren't expected to match, but
any substantial improvement to your lab metrics should be observable in the
field once it's been deployed. The higher the Lighthouse score, the less you're
leaving up to chance in the field.

### What blindspots from the field can lab tooling illuminate?

Field data analyzes all successful page loads. But if failed and aborted loads
are excluded, or reporting is blocked by extensions, the collected field data
can suffer from survivorship bias. Users who have better experiences use your
site more; that's why we care about performance in the first place! Lab tooling
shows you the quality of the experience for these users that field data might be
[missing entirely](https://blog.chriszacharias.com/page-weight-matters).

Lighthouse mobile reports emulate a slow 4G connection on a mid-tier Android
device. While field data might not indicate these conditions are especially
common for your site, analyzing how your site performs in these tougher
conditions helps expand your site's audience. Lighthouse identifies the worst
experiences, experiences you can't see in the field because they were so bad the
user never came back (or waited around in the first place).

As always, using both lab and field data to understand and optimize your user
experience is best practice. [Read more about field & lab](https://developers.google.com/web/fundamentals/performance/speed-tools).

### How should I work to optimize CLS differently given that it has been updated?

The [windowing adjustment](https://web.dev/articles/evolving-cls)
will likely not have much effect for the lab measurement, but instead will have
a large effect on the field CLS for long-lived pages.

Lighthouse 8 introduces another adjustment to our CLS definition: including
layout shift contributions from subframes. This brings our implementation in
line with how CrUX computes field CLS. This comes with the implication that
iframes (including ones you may not control) may be adding layout shifts which
ultimately affect your CLS score. Keep in mind that the subframe contributions
are [weighted by the in-viewport
portion](https://github.com/WICG/layout-instability#cumulative-scores) of the
iframe.

### Why don't the numbers for TBT and FID match, if TBT is a proxy metric for FID?

The commonality between TBT (collected in a lab environment) and FID (collected
in a field context) is that they measure the impact on input responsiveness from
long tasks on the main thread. Beyond that, they're quite different. FID
captures the delay in handling the first input event of the page, whenever that
input happened.  TBT roughly captures how dangerous the length of all the main
thread's tasks are.

It's very possible to have a page that does well on FID, but poorly on TBT.  And
it's slightly harder, but possible, to do well on TBT but poorly on FID\*.   So,
you shouldn't expect your TBT and FID measurements to correlate strongly. A
large-scale analysis found their [Spearman's
ρ](https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient) at
about 0.40, which indicates a connection, but not one as strong as many would
prefer.

From the Lighthouse project's perspective, the current passing threshold for FID
is quite lenient but more importantly, the percentile-of-record for FID (75th
percentile) is not sufficient for detecting issues. The 95th percentile is a
much stronger indicator of problematic interactions for this metric. We
encourage user-centric teams to focus on the 95th percentile of all input delays
(not just the first) in their field data in order to identify and address
problems that surface just 5% of the time.

\*Aside: the [Chrome 91 FID change for
double-tap-to-zoom](https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/docs/speed/metrics_changelog/2021_05_fid.md)
fixes a lot of high FID / low TBT cases and may be observable in your field
metrics, with higher percentiles improving slightly. Most remaining high FID /
low TBT cases are likely due to incorrect meta viewport tags, which [Lighthouse
will flag](https://developer.chrome.com/docs/lighthouse/pwa/viewport/).
Delivering a mobile-friendly viewport, reducing main-thread blocking JS, and
keeping your TBT low is the best defense against bad FID in the field.

### Overall, what motivated the changes to the performance score?

As with all Lighthouse score updates, changes are made to reflect
the latest in how to measure user-experience quality holistically and accurately,
and to focus attention on key priorities.

Heavy JS and long tasks are a problem for the web that's
[worsening](https://httparchive.org/reports/state-of-javascript#bytesJs). Field
FID is currently too lenient and not sufficiently incentivizing action to
address the problem. Lighthouse has historically weighed its interactivity
metrics at 40-55% of the performance score and—as interactivity is key to user
experience—we maintain a 40% weighting (TBT and TTI together) in Lighthouse
8.0.

[FCP's score curve was
adjusted](https://github.com/GoogleChrome/lighthouse/pull/12556) to align with
the current de facto ["good" threshold](https://web.dev/articles/fcp#what_is_a_good_fcp_score),
and as a result will score a bit more strictly.

The curve for TBT was made stricter to [more closely
approach](https://github.com/GoogleChrome/lighthouse/pull/12576) the ideal score
curve. TBT has had (and still has) a more lenient curve than our methodology
dictates, but the new curve is more linear which means there's a larger range
where improvements in the metric are rewarded with improvements in the score. If
your page currently scores poorly with TBT, the new curve will be more
responsive to changes as page performance incrementally improves.

FCP's weight drops slightly from 15% to 10% because it's fairly gameable and is also partly
captured by Speed Index.

### What's the story with TTI?

TTI serves a useful role as it's the largest metric value reported (often &gt;10
seconds) and helps anchor perceptions.

We see TBT as a stronger metric for evaluating the health of your main thread
and its impact on interactivity, plus it [has lower
variability](https://docs.google.com/document/d/1xCERB_X7PiP5RAZDwyIkODnIXoBk-Oo7Mi9266aEdGg/edit).
 TTI serves as a nice complement that captures the cost of long tasks, often
from heavy JavaScript. That said, we expect to continue to reduce the weight
of TTI and will likely remove it in a future major Lighthouse release.

### How does the Lighthouse Perf score get calculated? What is it based on?

The Lighthouse perf score is calculated from a weighted, blended set of
performance metrics. You can see the current and previous Lighthouse score
compositions (which metrics we are blending together, and at what weights) in
the [score
calculator](https://googlechrome.github.io/lighthouse/scorecalc/#FCP=3000&SI=5800&FMP=4000&TTI=7300&FCI=6500&LCP=4000&TBT=600&CLS=0.25&device=mobile&version=8&version=6&version=5),
and learn more about the [calculation specifics
here](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/).

### What is the most exciting update in LH v8?

We're really excited about the [interactive
treemap](https://github.com/GoogleChrome/lighthouse/releases/tag/v7.5.0#:~:text=We%20are%20releasing%20the%20Lighthouse%20Treemap),
[filtering audits by
metric](https://github.com/GoogleChrome/lighthouse/releases/tag/v8.0.0#:~:text=The%20report%20includes%20a-,new%20metric%20filter,-.%20Pick%20a%20metric),
and the new [Content Security Policy
audit](https://web.dev/articles/strict-csp#adopting_a_strict_csp), which was a
collaboration with the Google Web Security team.
