<a name="12.3.0"></a>
# 12.3.0 (2024-12-12)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v12.2.3...v12.3.0)

We expect this release to ship in the DevTools of [Chrome 133](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Sebastian Neuner @sebastian9er

## New Audits

This release adds new security audits. These audits are informative and won't affect your best practices score.

* Ensure proper origin isolation with COOP ([#16275](https://github.com/GoogleChrome/lighthouse/pull/16275))
* Use a strong HSTS policy ([#16257](https://github.com/GoogleChrome/lighthouse/pull/16257))

## Core

* font-size: exclude invisible text ([#16281](https://github.com/GoogleChrome/lighthouse/pull/16281))

## Deps

* upgrade puppeteer to v23.10.4 ([#16279](https://github.com/GoogleChrome/lighthouse/pull/16279))
* upgrade `trace_engine` to 0.0.38 ([#16269](https://github.com/GoogleChrome/lighthouse/pull/16269))

## I18n

* import ([#16283](https://github.com/GoogleChrome/lighthouse/pull/16283))
* inject strings from trace engine npm package ([#16272](https://github.com/GoogleChrome/lighthouse/pull/16272))

## Docs

* update releasing instructions ([#16252](https://github.com/GoogleChrome/lighthouse/pull/16252))

## Tests

* update network target type expectations ([#16273](https://github.com/GoogleChrome/lighthouse/pull/16273))
* devtools: sync e2e ([#16253](https://github.com/GoogleChrome/lighthouse/pull/16253))

<a name="12.2.3"></a>
# 12.2.3 (2024-12-02)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v12.2.2...v12.2.3)

This release is only for PageSpeed Insights and we expect it to ship within 2 weeks.

## Notable Changes

The CPU throttling factor for PageSpeed Insights has been adjusted ([#16256](https://github.com/GoogleChrome/lighthouse/pull/16256)) to account for the low CPU performance benchmarks typical in PageSpeed production environments. In general, TBT metric times for all sites should improve when testing with PageSpeed Insights.

All other Lighthouse clients (Lighthouse CLI, the Node API, Lighthouse panel in DevTools, etc) should not be affected by this change.

## Tests

* inline-fs: fix error in Node 20 ([#16262](https://github.com/GoogleChrome/lighthouse/pull/16262))

 <a name="12.2.2"></a>
# 12.2.2 (2024-11-14)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v12.2.1...v12.2.2)

We expect this release to ship in the DevTools of [Chrome 133](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Nate @servusdei2018
- Gareth Jones @G-Rath
- JDev @JWebDev

## Core

* network-monitor: treat EventSource as non-critical ([#16225](https://github.com/GoogleChrome/lighthouse/pull/16225))
* target-manager: ignore target if type is unknown ([#16221](https://github.com/GoogleChrome/lighthouse/pull/16221))

## CLI

* create writeFile destination if necessary ([#15990](https://github.com/GoogleChrome/lighthouse/pull/15990))

## Deps

* upgrade puppeteer to 23.8.0 ([#16248](https://github.com/GoogleChrome/lighthouse/pull/16248))
* upgrade `third-party-web` to 0.26.1 ([#16219](https://github.com/GoogleChrome/lighthouse/pull/16219))
* upgrade puppeteer to 23.5.2 ([#16220](https://github.com/GoogleChrome/lighthouse/pull/16220))
* lighthouse-stack-packs: upgrade to 1.12.2 ([#16242](https://github.com/GoogleChrome/lighthouse/pull/16242))
* lodash: migrate lodash to lodash-es ([#16211](https://github.com/GoogleChrome/lighthouse/pull/16211))
* sentry: upgrade to v7 ([#16215](https://github.com/GoogleChrome/lighthouse/pull/16215))

## Clients

* lr: set CPU throttling based on benchmark ([#16226](https://github.com/GoogleChrome/lighthouse/pull/16226))
* lr: fix wrong render-blocking-resources transfer size ([#16190](https://github.com/GoogleChrome/lighthouse/pull/16190))

## I18n

* import ([#16250](https://github.com/GoogleChrome/lighthouse/pull/16250))

## Docs

* readme: add `lighthouse-matchers` to related projects ([#16239](https://github.com/GoogleChrome/lighthouse/pull/16239))
* readme: add Guardius to services list ([#16235](https://github.com/GoogleChrome/lighthouse/pull/16235))

## Tests

* smoke: fix devtools test runner & a11y errors ([#16236](https://github.com/GoogleChrome/lighthouse/pull/16236))

## Misc

* ci: upgrade old actions ([#16191](https://github.com/GoogleChrome/lighthouse/pull/16191))

<a name="12.2.1"></a>
# 12.2.1 (2024-09-06)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v12.2.0...v12.2.1)

We expect this release to ship in the DevTools of [Chrome 130](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## Core

* third-party-cookies: update description for 3PCD updates ([#16177](https://github.com/GoogleChrome/lighthouse/pull/16177), [#16158](https://github.com/GoogleChrome/lighthouse/pull/16158))
* uses-text-compression: ignore percent threshold for large savings ([#16165](https://github.com/GoogleChrome/lighthouse/pull/16165))

## Deps

* upgrade puppeteer to 23.3.0 ([#16178](https://github.com/GoogleChrome/lighthouse/pull/16178), [#16161](https://github.com/GoogleChrome/lighthouse/pull/16161))
* upgrade `axe-core` to 4.10.0 ([#16162](https://github.com/GoogleChrome/lighthouse/pull/16162))

## Clients

* devtools: require third-party-web to be provided ([#16166](https://github.com/GoogleChrome/lighthouse/pull/16166))

## I18n

* support reusing the same placeholder for ICU ([#16159](https://github.com/GoogleChrome/lighthouse/pull/16159))

## Tests

* pass logger to smokehouse runners to get log even on timeout ([#16175](https://github.com/GoogleChrome/lighthouse/pull/16175))
* update BUILD.gn due to upstream CDT change ([#16171](https://github.com/GoogleChrome/lighthouse/pull/16171))
* devtools: sync e2e ([#16174](https://github.com/GoogleChrome/lighthouse/pull/16174))
* devtools: sync e2e ([#16160](https://github.com/GoogleChrome/lighthouse/pull/16160))

## Misc

* format lighthouse-result.proto ([#16170](https://github.com/GoogleChrome/lighthouse/pull/16170))

<a name="12.2.0"></a>
# 12.2.0 (2024-08-07)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v12.1.0...v12.2.0)

We expect this release to ship in the DevTools of [Chrome 129](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## Core

* import lantern from trace engine ([#16092](https://github.com/GoogleChrome/lighthouse/pull/16092))
* long-tasks: link to latest guidance ([#16138](https://github.com/GoogleChrome/lighthouse/pull/16138))
* stylesheets: disable transient stylesheet detection ([#16121](https://github.com/GoogleChrome/lighthouse/pull/16121))
* third-party-summary: correct blocking time calculation ([#16117](https://github.com/GoogleChrome/lighthouse/pull/16117))
* trace-engine-result: disable invalidations handler ([#16142](https://github.com/GoogleChrome/lighthouse/pull/16142))

## Deps

* upgrade `trace_engine` to 0.0.32 ([#16143](https://github.com/GoogleChrome/lighthouse/pull/16143))
* upgrade puppeteer to 22.15.0 ([#16139](https://github.com/GoogleChrome/lighthouse/pull/16139))
* upgrade `third-party-web` to 0.24.5 ([#16140](https://github.com/GoogleChrome/lighthouse/pull/16140))
* upgrade puppeteer to 22.13.1 ([#16123](https://github.com/GoogleChrome/lighthouse/pull/16123))
* upgrade typescript to 5.5.3 ([#16091](https://github.com/GoogleChrome/lighthouse/pull/16091))

## Tests

* devtools: sync e2e ([#16120](https://github.com/GoogleChrome/lighthouse/pull/16120))
* treemap: ignore cookie deprecation error ([#16141](https://github.com/GoogleChrome/lighthouse/pull/16141))

## Misc

* remove alertdesk from README ([#16133](https://github.com/GoogleChrome/lighthouse/pull/16133))
* build: update README.chromium when rolling devtools ([#16144](https://github.com/GoogleChrome/lighthouse/pull/16144))

<a name="12.1.0"></a>
# 12.1.0 (2024-06-18)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v12.0.0...v12.1.0)

We expect this release to ship in the DevTools of [Chrome 128](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Hamir Mahal @hamirmahal
- angad-sethi @angad-sethi
- Junaid Ramzan @ajuni880

## Notable Changes

* remove first-meaningful-paint metric ([#16047](https://github.com/GoogleChrome/lighthouse/pull/16047))

## Core

* move simulator creation and network analysis to lib/lantern ([#16003](https://github.com/GoogleChrome/lighthouse/pull/16003))
* handle target crash at any point ([#15985](https://github.com/GoogleChrome/lighthouse/pull/15985))
* aria-allowed-role: fix title and description ([#16042](https://github.com/GoogleChrome/lighthouse/pull/16042))
* inspector-issues: add shared dictionary issue ([#15993](https://github.com/GoogleChrome/lighthouse/pull/15993))
* lantern: refactor to DevTools modules convention ([#16071](https://github.com/GoogleChrome/lighthouse/pull/16071))
* lantern: rename files to PascalCase ([#16068](https://github.com/GoogleChrome/lighthouse/pull/16068))
* lantern: remove last usages of Lighthouse NetworkRequest ([#16067](https://github.com/GoogleChrome/lighthouse/pull/16067))
* lantern: remove usage of Lighthouse constants module ([#16062](https://github.com/GoogleChrome/lighthouse/pull/16062))
* lantern: remove all LH types ([#16061](https://github.com/GoogleChrome/lighthouse/pull/16061))
* lantern: move tbt-util.js to lib/lantern ([#16058](https://github.com/GoogleChrome/lighthouse/pull/16058))
* lantern: separate TraceEngine specific code ([#16051](https://github.com/GoogleChrome/lighthouse/pull/16051))
* lantern: extract main thread events w/o TraceProcessor ([#16049](https://github.com/GoogleChrome/lighthouse/pull/16049))
* lantern: remove usage of Lighthouse's ProcessedNavigation ([#16048](https://github.com/GoogleChrome/lighthouse/pull/16048))
* lantern: use LCP instead of FMP for TTI simulation bounds ([#16046](https://github.com/GoogleChrome/lighthouse/pull/16046))
* lantern: use computed artifact to create graph using trace ([#16040](https://github.com/GoogleChrome/lighthouse/pull/16040))
* lantern: rename NetworkRequest record to rawRequest ([#16037](https://github.com/GoogleChrome/lighthouse/pull/16037))
* lantern: resolve some differences when using trace ([#16033](https://github.com/GoogleChrome/lighthouse/pull/16033))
* lantern: create network graph from trace (experimental) ([#16026](https://github.com/GoogleChrome/lighthouse/pull/16026))
* network: align headers end time with send when no data received ([#16044](https://github.com/GoogleChrome/lighthouse/pull/16044))
* network: fix time units in network quiet calc ([#16013](https://github.com/GoogleChrome/lighthouse/pull/16013))
* test: add generatable squoosh trace ([#15997](https://github.com/GoogleChrome/lighthouse/pull/15997))
* test: add generatable trace for paint metrics ([#15994](https://github.com/GoogleChrome/lighthouse/pull/15994))
* test: add generatable iframe trace ([#15995](https://github.com/GoogleChrome/lighthouse/pull/15995))
* types: add missing fields to `Result.Category` and `NodeDetails` ([#16006](https://github.com/GoogleChrome/lighthouse/pull/16006))

## CLI

* stop treating chrome launcher kill() as async ([#15998](https://github.com/GoogleChrome/lighthouse/pull/15998))

## Deps

* upgrade puppeteer to 22.11.1 ([#16070](https://github.com/GoogleChrome/lighthouse/pull/16070))
* upgrade `chrome-launcher` to 1.1.2 ([#16069](https://github.com/GoogleChrome/lighthouse/pull/16069))
* upgrade puppeteer to 22.10.0 ([#16054](https://github.com/GoogleChrome/lighthouse/pull/16054))
* upgrade `third-party-web` to 0.24.3 ([#16055](https://github.com/GoogleChrome/lighthouse/pull/16055))
* upgrade `axe-core` to 4.9.1 ([#16056](https://github.com/GoogleChrome/lighthouse/pull/16056))

## I18n

* import ([#16080](https://github.com/GoogleChrome/lighthouse/pull/16080))

## Docs

* remove await from chrome.kill() ([#15982](https://github.com/GoogleChrome/lighthouse/pull/15982))

## Tests

* use newer traces in network-analyzer-test.js ([#16043](https://github.com/GoogleChrome/lighthouse/pull/16043))
* default to 0 for network trace data length ([#16041](https://github.com/GoogleChrome/lighthouse/pull/16041))
* update remaining old traces for Lantern ([#16039](https://github.com/GoogleChrome/lighthouse/pull/16039))
* use new trace in metrics-test for pwa ([#16025](https://github.com/GoogleChrome/lighthouse/pull/16025))
* update many test traces, support .json.gz ([#16007](https://github.com/GoogleChrome/lighthouse/pull/16007))
* add timeout to runSmokeTest ([#16017](https://github.com/GoogleChrome/lighthouse/pull/16017))
* fix devtools e2e test runner ([#16018](https://github.com/GoogleChrome/lighthouse/pull/16018))
* reduce expected value of render-blocking-requests smoke ([#16011](https://github.com/GoogleChrome/lighthouse/pull/16011))
* update interactive test trace ([#16001](https://github.com/GoogleChrome/lighthouse/pull/16001))
* use new button class name for devtools run script ([#15999](https://github.com/GoogleChrome/lighthouse/pull/15999))
* ci: remove reference to deleted smoke test ([#16010](https://github.com/GoogleChrome/lighthouse/pull/16010))
* lantern: fix some tests not running ([#16073](https://github.com/GoogleChrome/lighthouse/pull/16073))
* lantern: refactor to DevTools test convention ([#16072](https://github.com/GoogleChrome/lighthouse/pull/16072))
* lantern: remove usage of devtoolsLog in simulator tests ([#16065](https://github.com/GoogleChrome/lighthouse/pull/16065))
* lantern: remove usage of computed SpeedIndex ([#16064](https://github.com/GoogleChrome/lighthouse/pull/16064))
* lantern: remove usage of computed PageDependencyGraph ([#16063](https://github.com/GoogleChrome/lighthouse/pull/16063))
* lantern: use TraceEngine directly in test fixtures ([#16057](https://github.com/GoogleChrome/lighthouse/pull/16057))
* lantern: remove Speedline from Lantern unit test for now ([#16060](https://github.com/GoogleChrome/lighthouse/pull/16060))
* lantern: remove devtools log from tests ([#16050](https://github.com/GoogleChrome/lighthouse/pull/16050))

## Misc

* change connectionId from string to number ([#15983](https://github.com/GoogleChrome/lighthouse/pull/15983))
* ci: fix deprecated node usage in checkout@v3 ([#16022](https://github.com/GoogleChrome/lighthouse/pull/16022))
* strings: fix WebAuthetication typo ([#16028](https://github.com/GoogleChrome/lighthouse/pull/16028))

<a name="12.0.0"></a>
# 12.0.0 (2024-04-22)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v11.7.1...v12.0.0)

We expect this release to ship in the DevTools of [Chrome 126](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Ashley Rich @A5hleyRich
- MrAdib @JohnAdib

## Notable Changes

### PWA Category Removal

As per [Chrome’s updated Installability Criteria](https://developer.chrome.com/blog/update-install-criteria), Lighthouse [has removed the PWA category](https://github.com/GoogleChrome/lighthouse/pull/15455). For future PWA testing, users will be directed to use the [updated PWA documentation](https://developer.chrome.com/docs/devtools/progressive-web-apps/).

### SEO Category Reorganization

The SEO category has been updated to reflect the priorities of Google search in 2024. As such, several audits have been removed or moved to other categories:

* The `is-crawlable` audit is now weighted high enough to fail the SEO category on its own. ([#15933](https://github.com/GoogleChrome/lighthouse/pull/15933))
* The `viewport` and `font-size` audits are no longer priorities for SEO, but are still important for UX in general so they have been moved to the best practices category. ([#15930](https://github.com/GoogleChrome/lighthouse/pull/15930))
* The `plugins` audit is no longer a priority for SEO and has been removed. ([#15928](https://github.com/GoogleChrome/lighthouse/pull/15928))
* The `tap-targets` audit is no longer a priority for SEO and has been replaced with the `target-size` audit in accessibility. ([#15906](https://github.com/GoogleChrome/lighthouse/pull/15906))

### Overall Savings Deprecation

The `overallSavingsMs` value on performance diagnostic audits has been deprecated ([#15902](https://github.com/GoogleChrome/lighthouse/pull/15902)). We recommend using `metricSavings.LCP` or `metricSavings.FCP` to understand the estimated metric savings of performance diagnostics.

### 🆕 New Audits

* The [`aria-conditional-attr`](https://dequeuniversity.com/rules/axe/4.9/aria-conditional-attr), [`aria-deprecated-role`](https://dequeuniversity.com/rules/axe/4.9/aria-deprecated-role) and [`aria-prohibited-attr`](https://dequeuniversity.com/rules/axe/4.9/aria-prohibited-attr) Axe checks have been added to the Lighthouse accessibility category. ([#15963](https://github.com/GoogleChrome/lighthouse/pull/15963))
* The `redirects-http` audit has been brought back, but will only passively check for a http -> https redirect if the provided URL happens to be on http ([#13548](https://github.com/GoogleChrome/lighthouse/pull/13548))

### Other Audit Changes

* The `layout-shifts-elements` audit is removed. Improved layout shift information can be found in the `layout-shifts` audit. ([#15931](https://github.com/GoogleChrome/lighthouse/pull/15931))
* The `no-unload-listeners` audit is removed. Unload listeners are deprecated and are still flagged in the `deprecations` and `bf-cache` audits. ([#15874](https://github.com/GoogleChrome/lighthouse/pull/15874))
* The `duplicate-id-active` audit is removed because it's corresponding Axe check is deprecated. ([#15900](https://github.com/GoogleChrome/lighthouse/pull/15900))
* The `uses-rel-preload` and `preload-fonts` audits have been moved to the experimental config. Preload advice is still on hold and these audits were already in a disabled state. ([#15876](https://github.com/GoogleChrome/lighthouse/pull/15876))

## 💥 Breaking Changes

* split up `CSSUsage` artifact ([#15952](https://github.com/GoogleChrome/lighthouse/pull/15952))
* remove budgets ([#15950](https://github.com/GoogleChrome/lighthouse/pull/15950))
* remove relevant audits lists from config ([#15878](https://github.com/GoogleChrome/lighthouse/pull/15878))
* remove `ScriptElements` artifact ([#15879](https://github.com/GoogleChrome/lighthouse/pull/15879))
* config: use explicit diagnostic group ([#15901](https://github.com/GoogleChrome/lighthouse/pull/15901))
* service-worker: remove `service-worker` gatherer ([#15942](https://github.com/GoogleChrome/lighthouse/pull/15942))

## Core

* remove pre-v10 compat for page graph construction ([#15948](https://github.com/GoogleChrome/lighthouse/pull/15948))
* a11y: re-enable target-size hidden audit ([#15888](https://github.com/GoogleChrome/lighthouse/pull/15888))
* driver: add sendCommandAndIgnore ([#15913](https://github.com/GoogleChrome/lighthouse/pull/15913))
* gather: handle crash if CDP target crashes ([#11840](https://github.com/GoogleChrome/lighthouse/pull/11840))
* lantern: always use flexible network ordering ([#14612](https://github.com/GoogleChrome/lighthouse/pull/14612))
* lantern: remove LR statistics ([#15946](https://github.com/GoogleChrome/lighthouse/pull/15946))
* lantern: inline rtt constant ([#15944](https://github.com/GoogleChrome/lighthouse/pull/15944))
* lantern: add LanternError and adapter to LH error ([#15937](https://github.com/GoogleChrome/lighthouse/pull/15937))
* lantern: correct overlapping tasks in CPU nodes ([#15938](https://github.com/GoogleChrome/lighthouse/pull/15938))
* lantern: duplicate isNonNetworkProtocol in lib/lantern ([#15936](https://github.com/GoogleChrome/lighthouse/pull/15936))
* lantern: replace usage of LH.Artifacts.ProcessedTrace ([#15905](https://github.com/GoogleChrome/lighthouse/pull/15905))
* lantern: move lantern metrics to lib/lantern ([#15875](https://github.com/GoogleChrome/lighthouse/pull/15875))
* metric: remove gatherContext mode check ([#15899](https://github.com/GoogleChrome/lighthouse/pull/15899))
* render-blocking: use trace engine as the source of truth ([#15839](https://github.com/GoogleChrome/lighthouse/pull/15839))
* runner: use early return for readability ([#15914](https://github.com/GoogleChrome/lighthouse/pull/15914))
* seo: support Persian in link-text audit ([#15949](https://github.com/GoogleChrome/lighthouse/pull/15949))
* target-size: use binary display mode ([#15910](https://github.com/GoogleChrome/lighthouse/pull/15910))

## Report

* fix hidden audit handling for non-perf categories ([#15968](https://github.com/GoogleChrome/lighthouse/pull/15968))

## Deps

* upgrade `tldts-icann` to 6.1.16 ([#15967](https://github.com/GoogleChrome/lighthouse/pull/15967))
* upgrade `third-party-web` to 0.24.2 ([#15966](https://github.com/GoogleChrome/lighthouse/pull/15966))
* upgrade puppeteer to 22.6.5 ([#15951](https://github.com/GoogleChrome/lighthouse/pull/15951))

## Clients

* viewer: stop using legacy DOM api ([#15964](https://github.com/GoogleChrome/lighthouse/pull/15964))

## I18n

* import ([#15958](https://github.com/GoogleChrome/lighthouse/pull/15958))

## Docs

* bug-report: require users to read FAQs ([#14383](https://github.com/GoogleChrome/lighthouse/pull/14383))
* readme: add DeploymentHawk to the list of integrations ([#15847](https://github.com/GoogleChrome/lighthouse/pull/15847))

## Tests

* refresh sample artifacts ([#15962](https://github.com/GoogleChrome/lighthouse/pull/15962))
* invalidate devtools build cache ([#15947](https://github.com/GoogleChrome/lighthouse/pull/15947))
* update network target type expectations ([#15916](https://github.com/GoogleChrome/lighthouse/pull/15916))

## Misc

* deduplicate all the dom helpers ([#15960](https://github.com/GoogleChrome/lighthouse/pull/15960))
* merge changelog from branch-11 ([#15957](https://github.com/GoogleChrome/lighthouse/pull/15957))
* remove `BenchmarkIndexes` base artifact ([#15941](https://github.com/GoogleChrome/lighthouse/pull/15941))
* update public gatherer list ([#15940](https://github.com/GoogleChrome/lighthouse/pull/15940))
* remove residual `lighthouse-cli` file ([#15935](https://github.com/GoogleChrome/lighthouse/pull/15935))
* use "processing duration" instead of "processing time" for INP ([#15893](https://github.com/GoogleChrome/lighthouse/pull/15893))
* treemap: fix column sorting when some values are blank ([#15959](https://github.com/GoogleChrome/lighthouse/pull/15959))

<a name="11.7.1"></a>
# 11.7.1 (2024-04-08)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v11.7.0...v11.7.1)

We expect this release to ship in the DevTools of [Chrome 125](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- lauren n. liberda @selfisekai

## Core

* network-request: recognize zstd compression algorithm ([#15883](https://github.com/GoogleChrome/lighthouse/pull/15883))
* trace-elements: add sentry debugging for `impactedNodes` ([#15915](https://github.com/GoogleChrome/lighthouse/pull/15915))
* trace-processor: correct overlapping tasks ([#15921](https://github.com/GoogleChrome/lighthouse/pull/15921))

## Report

* remove use of innerHTML to empty elements ([#15911](https://github.com/GoogleChrome/lighthouse/pull/15911))

## Deps

* upgrade `trace_engine` to 0.0.19 ([#15926](https://github.com/GoogleChrome/lighthouse/pull/15926))
* upgrade axe-core to 4.9.0 ([#15887](https://github.com/GoogleChrome/lighthouse/pull/15887))

## Tests

* remove Access-Control-Allow-Origin for robots.txt ([#15895](https://github.com/GoogleChrome/lighthouse/pull/15895))
* devtools: sync e2e ([#15917](https://github.com/GoogleChrome/lighthouse/pull/15917))

## Misc

* correct .npmignore for node >=18.20 ([#15924](https://github.com/GoogleChrome/lighthouse/pull/15924))
* proto: ensure all strings are well-formed ([#15909](https://github.com/GoogleChrome/lighthouse/pull/15909))

<a name="11.7.0"></a>
# 11.7.0 (2024-03-20)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v11.6.0...v11.7.0)

We expect this release to ship in the DevTools of [Chrome 125](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## Notable Changes

* The publisher ads plugin is out of date and will not be supported in Chrome DevTools M125 ([#15843](https://github.com/GoogleChrome/lighthouse/pull/15843))

## Core

* fix regression in internal chrome error messages ([#15853](https://github.com/GoogleChrome/lighthouse/pull/15853))
* a11y: disable target-size hidden audit ([#15854](https://github.com/GoogleChrome/lighthouse/pull/15854))
* css-usage: prevent late stylesheet additions ([#15865](https://github.com/GoogleChrome/lighthouse/pull/15865))
* driver: don't await cleanup in PAGE_HUNG case ([#15833](https://github.com/GoogleChrome/lighthouse/pull/15833))
* driver: fix protocol timeout being ignored for isolated eval ([#15826](https://github.com/GoogleChrome/lighthouse/pull/15826))
* emulation: remove Lighthouse from client hint brand ([#15856](https://github.com/GoogleChrome/lighthouse/pull/15856))
* full-page-screenshot: emit screenshot commands in parallel ([#15862](https://github.com/GoogleChrome/lighthouse/pull/15862))
* full-page-screenshot: revise logic for determining dimensions ([#14920](https://github.com/GoogleChrome/lighthouse/pull/14920))
* gather: gatherFn refactor ([#15830](https://github.com/GoogleChrome/lighthouse/pull/15830))
* installable-manifest: add `manifest-parsing-or-network-error` ([#15849](https://github.com/GoogleChrome/lighthouse/pull/15849))
* lantern: move types to lib/lantern ([#15859](https://github.com/GoogleChrome/lighthouse/pull/15859))
* lantern: move LanternMetric in lib/lantern ([#15857](https://github.com/GoogleChrome/lighthouse/pull/15857))
* lantern: refactor LH.Gatherer.Simulation ([#15852](https://github.com/GoogleChrome/lighthouse/pull/15852))
* lantern: move PageDependencyGraph to lib/lantern ([#15851](https://github.com/GoogleChrome/lighthouse/pull/15851))
* lantern: put types in namespace ([#15850](https://github.com/GoogleChrome/lighthouse/pull/15850))
* lantern: rename lib/dependency-graph to lib/lantern ([#15844](https://github.com/GoogleChrome/lighthouse/pull/15844))
* lantern: add interface for network request ([#15845](https://github.com/GoogleChrome/lighthouse/pull/15845))
* lantern: use rendererStartTime instead of networkRequestTime ([#15834](https://github.com/GoogleChrome/lighthouse/pull/15834))
* navigation-runner: only run `getArtifact` phase once ([#15827](https://github.com/GoogleChrome/lighthouse/pull/15827))
* network-request: use rendererStartTime for initiator candidates ([#15832](https://github.com/GoogleChrome/lighthouse/pull/15832))
* responsiveness: remove fallback trace event pre m103 ([#15866](https://github.com/GoogleChrome/lighthouse/pull/15866))

## Deps

* upgrade `chrome-launcher` to 1.1.1 ([#15871](https://github.com/GoogleChrome/lighthouse/pull/15871))
* upgrade puppeteer to 22.5.0 ([#15867](https://github.com/GoogleChrome/lighthouse/pull/15867))
* bump ip from 1.1.8 to 1.1.9 ([#15863](https://github.com/GoogleChrome/lighthouse/pull/15863))

## I18n

* import ([#15872](https://github.com/GoogleChrome/lighthouse/pull/15872))

## Tests

* devtools: use `is_debug = true` for local builds ([#15860](https://github.com/GoogleChrome/lighthouse/pull/15860))
* devtools: skip type checking in local builds ([#15858](https://github.com/GoogleChrome/lighthouse/pull/15858))
* devtools: sync e2e ([#15837](https://github.com/GoogleChrome/lighthouse/pull/15837))
* full-page-screenshot: add node verification and debug tool ([#15324](https://github.com/GoogleChrome/lighthouse/pull/15324))

<a name="11.6.0"></a>
# 11.6.0 (2024-02-21)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v11.5.0...v11.6.0)

We expect this release to ship in the DevTools of [Chrome 124](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## Notable Changes

* trace: disable JS samples ([#15819](https://github.com/GoogleChrome/lighthouse/pull/15819))

## Core

* driver: add verbose logs for wait-for page load components ([#15818](https://github.com/GoogleChrome/lighthouse/pull/15818))

## Deps

* upgrade puppeteer to 22.1.0 ([#15822](https://github.com/GoogleChrome/lighthouse/pull/15822))
* upgrade trace_engine and drop manually written types ([#15810](https://github.com/GoogleChrome/lighthouse/pull/15810))
* upgrade `axe-core` to 4.8.4 ([#15805](https://github.com/GoogleChrome/lighthouse/pull/15805))
* upgrade puppeteer to 22.0.0 ([#15803](https://github.com/GoogleChrome/lighthouse/pull/15803))

## I18n

* import ([#15821](https://github.com/GoogleChrome/lighthouse/pull/15821))

## Tests

* dbw: revert expectations for unload handler removal ([#15802](https://github.com/GoogleChrome/lighthouse/pull/15802))

## Misc

* reword pwa banner ([#15800](https://github.com/GoogleChrome/lighthouse/pull/15800))
* do not double report artifact dep error to sentry ([#15777](https://github.com/GoogleChrome/lighthouse/pull/15777))

<a name="11.5.0"></a>
# 11.5.0 (2024-01-23)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v11.4.0...v11.5.0)

We expect this release to ship in the DevTools of [Chrome 123](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- EvilKarter @EvilKarter

## Notable Changes

* New layout-shifts audit shows estimated root causes for layout shifts. This replaces the layout-shift-elements audit which only shows elements impacted by layout shifts. ([#15703](https://github.com/GoogleChrome/lighthouse/pull/15703), [#15730](https://github.com/GoogleChrome/lighthouse/pull/15730))
* Informative audits now have a score of 1 instead of null ([#15689](https://github.com/GoogleChrome/lighthouse/pull/15689))
* Added a warning for [PWA deprecation](https://developer.chrome.com/blog/update-install-criteria?hl=en) ([#15741](https://github.com/GoogleChrome/lighthouse/pull/15741))

## Core

* bump guidance level of top CWV recommendations ([#15695](https://github.com/GoogleChrome/lighthouse/pull/15695))
* lower guidance level of unused- audits ([#15718](https://github.com/GoogleChrome/lighthouse/pull/15718))
* create separate product savings type ([#15726](https://github.com/GoogleChrome/lighthouse/pull/15726))
* round metric savings to remove false precision ([#15721](https://github.com/GoogleChrome/lighthouse/pull/15721))
* fix mistake preventing gather/audit phases from sharing cache ([#15710](https://github.com/GoogleChrome/lighthouse/pull/15710))
* cumulative-layout-shift: experiment with new shared trace engine ([#15702](https://github.com/GoogleChrome/lighthouse/pull/15702))
* legacy-javascript: detect es-shims polyfills ([#15738](https://github.com/GoogleChrome/lighthouse/pull/15738))
* network-request: consider secondary headers for content encoded check ([#15708](https://github.com/GoogleChrome/lighthouse/pull/15708))
* render-blocking-resources: reduce metric savings if LCP is an image ([#15694](https://github.com/GoogleChrome/lighthouse/pull/15694))
* target-manager: warn on errors while attaching to workers ([#15740](https://github.com/GoogleChrome/lighthouse/pull/15740))
* trace: enable JS samples for advanced workflows ([#15542](https://github.com/GoogleChrome/lighthouse/pull/15542))
* unused-css: exclude header size for estimating wasted bytes ([#15671](https://github.com/GoogleChrome/lighthouse/pull/15671))
* viewport: include meta viewport string in debugDetails ([#15727](https://github.com/GoogleChrome/lighthouse/pull/15727))

## Report

* small renderAudit simplification ([#15725](https://github.com/GoogleChrome/lighthouse/pull/15725))
* fix filmstrip wrap ([#15693](https://github.com/GoogleChrome/lighthouse/pull/15693))
* performance: use metric savings for metric filter ([#15540](https://github.com/GoogleChrome/lighthouse/pull/15540))

## Deps

* upgrade puppeteer to 21.7.0 ([#15724](https://github.com/GoogleChrome/lighthouse/pull/15724))
* upgrade esbuild to 0.19.11 ([#15731](https://github.com/GoogleChrome/lighthouse/pull/15731))

## Clients

* lr: include flag for ignoring bad page status code ([#15764](https://github.com/GoogleChrome/lighthouse/pull/15764))

## Docs

* update deprecated link to shared flags ([#15722](https://github.com/GoogleChrome/lighthouse/pull/15722))
* user-flows: update complete flow example ([#15690](https://github.com/GoogleChrome/lighthouse/pull/15690))

## Tests

* check for console errors and warnings in pptr tests ([#15516](https://github.com/GoogleChrome/lighthouse/pull/15516))
* fix ToT chrome install path ([#15753](https://github.com/GoogleChrome/lighthouse/pull/15753))
* ci: stop using xvfb ([#15707](https://github.com/GoogleChrome/lighthouse/pull/15707))
* dbw: update expectations for unload handler removal ([#15765](https://github.com/GoogleChrome/lighthouse/pull/15765))
* dbw: fix server latency flake ([#15729](https://github.com/GoogleChrome/lighthouse/pull/15729))
* mocha: fix snapshot expectations in retries ([#15735](https://github.com/GoogleChrome/lighthouse/pull/15735))

## Misc

* build: set line limit to 1000 ([#15733](https://github.com/GoogleChrome/lighthouse/pull/15733))
* lighthouse-logger: add repo to package.json ([#15768](https://github.com/GoogleChrome/lighthouse/pull/15768))

<a name="11.4.0"></a>
# 11.4.0 (2023-12-11)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v11.3.0...v11.4.0)

We expect this release to ship in the DevTools of [Chrome 122](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- avinash-sd @avinash-sd

## New Audits

Chrome plans to remove support for third-party cookies which can be detected using a new Lighthouse audit. [Learn more about phasing out third-party cookies](https://developer.chrome.com/en/docs/privacy-sandbox/third-party-cookie-phase-out/). ([#15632](https://github.com/GoogleChrome/lighthouse/pull/15632))

## Core

* reintroduce resource-summary as a hidden audit ([#15597](https://github.com/GoogleChrome/lighthouse/pull/15597))
* move transfer ratio estimate to script-helpers.js ([#15665](https://github.com/GoogleChrome/lighthouse/pull/15665))
* set network responseHeadersText from extra info event ([#15639](https://github.com/GoogleChrome/lighthouse/pull/15639))
* fix check for presence of all URL artifact fields ([#15648](https://github.com/GoogleChrome/lighthouse/pull/15648))
* fix worker request expectations for M121 ([#15601](https://github.com/GoogleChrome/lighthouse/pull/15601))
* aria-allowed-role: fix typo in learn more link ([#15633](https://github.com/GoogleChrome/lighthouse/pull/15633))
* bf-cache: add warning and hide when using old headless ([#15577](https://github.com/GoogleChrome/lighthouse/pull/15577))
* bf-cache: change to use binary scoring mode ([#15581](https://github.com/GoogleChrome/lighthouse/pull/15581))
* bootup-time: exclude _lighthouse-eval.js ([#15678](https://github.com/GoogleChrome/lighthouse/pull/15678))
* byte-efficiency: replace pessimistic graph with optimistic ([#15651](https://github.com/GoogleChrome/lighthouse/pull/15651))
* css-usage: exclude empty stylesheets ([#15679](https://github.com/GoogleChrome/lighthouse/pull/15679))
* duplicated-javascript: exclude header size for estimating wasted bytes ([#15667](https://github.com/GoogleChrome/lighthouse/pull/15667))
* emulation: bump chrome UA to m119 ([#15661](https://github.com/GoogleChrome/lighthouse/pull/15661))
* entity-classification: update tldts package to icann subset ([#15660](https://github.com/GoogleChrome/lighthouse/pull/15660))
* entity-classification: integrate public-suffix-list into LH ([#15641](https://github.com/GoogleChrome/lighthouse/pull/15641))
* lantern: refactor fcp graph method signatures ([#15572](https://github.com/GoogleChrome/lighthouse/pull/15572))
* layout-shift-elements: mention windowing in description ([#15680](https://github.com/GoogleChrome/lighthouse/pull/15680))
* layout-shift-elements: aggregate all remaining elements ([#15593](https://github.com/GoogleChrome/lighthouse/pull/15593))
* legacy-javascript: exclude header size for estimating wasted bytes ([#15640](https://github.com/GoogleChrome/lighthouse/pull/15640))
* minification-estimator: add `else` to punctuation ([#15624](https://github.com/GoogleChrome/lighthouse/pull/15624))
* mpfid: add list of loaf durations to debugdata ([#15685](https://github.com/GoogleChrome/lighthouse/pull/15685))
* mpfid: add max LoAFs to debugdata ([#15684](https://github.com/GoogleChrome/lighthouse/pull/15684))
* third-party-summary: expands the audit to include all urls ([#15611](https://github.com/GoogleChrome/lighthouse/pull/15611))
* trace-elements: remove element score field ([#15677](https://github.com/GoogleChrome/lighthouse/pull/15677))
* unminified-javascript: exclude header size for estimating wasted bytes ([#15670](https://github.com/GoogleChrome/lighthouse/pull/15670))
* unused-javascript: exclude header size for estimating wasted bytes ([#15668](https://github.com/GoogleChrome/lighthouse/pull/15668))
* uses-http2: include multiplexable assets when 1p is a known 3p origin ([#15638](https://github.com/GoogleChrome/lighthouse/pull/15638))

## Report

* blend impact and guidance level to sort audits ([#15669](https://github.com/GoogleChrome/lighthouse/pull/15669))
* fix sticky table if no sticky header ([#15666](https://github.com/GoogleChrome/lighthouse/pull/15666))
* occupy entire viewport ([#15664](https://github.com/GoogleChrome/lighthouse/pull/15664))
* remove accidental console.log() ([#15635](https://github.com/GoogleChrome/lighthouse/pull/15635))
* prevent shift when hovering third party row ([#15628](https://github.com/GoogleChrome/lighthouse/pull/15628))
* add timespan/snapshot mode labels to footer ([#15589](https://github.com/GoogleChrome/lighthouse/pull/15589))

## Deps

* upgrade `third-party-web` to 0.24.1 ([#15683](https://github.com/GoogleChrome/lighthouse/pull/15683))
* upgrade puppeteer to 21.5.2 ([#15645](https://github.com/GoogleChrome/lighthouse/pull/15645))

## Clients

* lr: modify puppeteer connector to work with new tab targets ([#15674](https://github.com/GoogleChrome/lighthouse/pull/15674))

## I18n

* import ([#15682](https://github.com/GoogleChrome/lighthouse/pull/15682))

## Tests

* lower bootup-time threshold in api-test-pptr.js ([#15649](https://github.com/GoogleChrome/lighthouse/pull/15649))
* use bash instead of sh to call test-recipes.sh ([#15647](https://github.com/GoogleChrome/lighthouse/pull/15647))
* ci: resume using ToT chrome ([#15655](https://github.com/GoogleChrome/lighthouse/pull/15655))
* ci: hardcode ToT revision to unblock ci for now ([#15653](https://github.com/GoogleChrome/lighthouse/pull/15653))
* dbw: add unload handler deprecation ([#15608](https://github.com/GoogleChrome/lighthouse/pull/15608))

## Misc

* improve download-chrome.sh usability ([#15646](https://github.com/GoogleChrome/lighthouse/pull/15646))
* support mac arm64 in download-chrome.sh ([#15650](https://github.com/GoogleChrome/lighthouse/pull/15650))
* treemap: remove unused firebase ([#15617](https://github.com/GoogleChrome/lighthouse/pull/15617))

<a name="11.3.0"></a>
# 11.3.0 (2023-11-02)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v11.2.0...v11.3.0)

We expect this release to ship in the DevTools of [Chrome 121](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Max Coplan @vegerot
- Barry Pollard @tunetheweb

## Notable Changes

* core: add `clearStorageTypes` option ([#15508](https://github.com/GoogleChrome/lighthouse/pull/15508))
* core: create flag to prevent fatal error on bad status code ([#15494](https://github.com/GoogleChrome/lighthouse/pull/15494))
* clients(extension): add locale selector ([#15574](https://github.com/GoogleChrome/lighthouse/pull/15574))
* clients(extension): always show settings, add psi frontend ([#15526](https://github.com/GoogleChrome/lighthouse/pull/15526))

## Core

* remove config navigations ([#15397](https://github.com/GoogleChrome/lighthouse/pull/15397))
* accessibility: hide experimental axe rules ([#15543](https://github.com/GoogleChrome/lighthouse/pull/15543))
* inspector-issues: add cookie deprecation issue ([#15553](https://github.com/GoogleChrome/lighthouse/pull/15553))

## Report

* use normal gauge if performance score is null ([#15554](https://github.com/GoogleChrome/lighthouse/pull/15554))

## Deps

* upgrade puppeteer to 21.5.0 ([#15582](https://github.com/GoogleChrome/lighthouse/pull/15582))
* upgrade `lighthouse-stack-packs` to 1.12.1 ([#15566](https://github.com/GoogleChrome/lighthouse/pull/15566))
* upgrade puppeteer to 21.4.0 ([#15557](https://github.com/GoogleChrome/lighthouse/pull/15557))

## Clients

* devtools: default to ignore fatal errors ([#15558](https://github.com/GoogleChrome/lighthouse/pull/15558))

## I18n

* import ([#15579](https://github.com/GoogleChrome/lighthouse/pull/15579))

## Docs

* plugins: add link to GitHub repo template ([#15539](https://github.com/GoogleChrome/lighthouse/pull/15539))

## Tests

* use --headless=new for all smoketests ([#14419](https://github.com/GoogleChrome/lighthouse/pull/14419))
* devtools: extend protocol timeout for load ([#15555](https://github.com/GoogleChrome/lighthouse/pull/15555))
* devtools: sync e2e ([#15550](https://github.com/GoogleChrome/lighthouse/pull/15550))

## Misc

* update web.dev URLs ([#15534](https://github.com/GoogleChrome/lighthouse/pull/15534))

<a name="11.2.0"></a>
# 11.2.0 (2023-10-09)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v11.1.0...v11.2.0)

We expect this release to ship in the DevTools of [Chrome 120](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## Notable Changes

This update includes an overhaul to the performance category. Performance insights are now scored and prioritized based on their estimated impact to the performance metrics. Additionally, the performance score gauge includes more detailed information about how each metric affects the score.

* core: align performance audit score with metric savings ([#15447](https://github.com/GoogleChrome/lighthouse/pull/15447))
* report: sort performance audits based on impact ([#15445](https://github.com/GoogleChrome/lighthouse/pull/15445))
* report: add explodey gauge for performance category ([#15396](https://github.com/GoogleChrome/lighthouse/pull/15396))

## Core

* asset-saver: fix handling of undefined trace ([#15451](https://github.com/GoogleChrome/lighthouse/pull/15451))
* csp: use monospace for technical terms in strings ([#15511](https://github.com/GoogleChrome/lighthouse/pull/15511))
* driver: attach to worker targets ([#14212](https://github.com/GoogleChrome/lighthouse/pull/14212))
* inspector-issues: add `propertyRuleIssue` ([#15491](https://github.com/GoogleChrome/lighthouse/pull/15491))
* installable-manifest: use monospace for technical terms in strings ([#15513](https://github.com/GoogleChrome/lighthouse/pull/15513))
* long-tasks: compute TBT impact ([#15197](https://github.com/GoogleChrome/lighthouse/pull/15197))
* mainthread-work-breakdown: add TBT savings ([#15201](https://github.com/GoogleChrome/lighthouse/pull/15201))
* tags-blocking-first-paint: ignore malformed link tags ([#15489](https://github.com/GoogleChrome/lighthouse/pull/15489))

## CLI

* sentry: set useful tags from resolved config ([#15485](https://github.com/GoogleChrome/lighthouse/pull/15485))

## Report

* redefine gauge percentage positioning ([#15486](https://github.com/GoogleChrome/lighthouse/pull/15486))

## Deps

* upgrade puppeteer to v21.3.6 ([#15490](https://github.com/GoogleChrome/lighthouse/pull/15490))
* pin puppeteer version ([#15458](https://github.com/GoogleChrome/lighthouse/pull/15458))
* upgrade `axe-core` to 4.8.1 ([#15446](https://github.com/GoogleChrome/lighthouse/pull/15446))
* chrome-launcher: upgrade to 1.1.0 ([#15517](https://github.com/GoogleChrome/lighthouse/pull/15517))

## Clients

* viewer: fix preload links ([#15515](https://github.com/GoogleChrome/lighthouse/pull/15515))

## I18n

* upgrade to latest icu formatter ([#13834](https://github.com/GoogleChrome/lighthouse/pull/13834))

## Docs

* plugins: minor corrections ([#15449](https://github.com/GoogleChrome/lighthouse/pull/15449))
* readme: edit description of the PageVitals tool ([#15395](https://github.com/GoogleChrome/lighthouse/pull/15395))

## Tests

* use new headless for puppeteer tests ([#15374](https://github.com/GoogleChrome/lighthouse/pull/15374))
* dbw: increase wasted ms threshold ([#15483](https://github.com/GoogleChrome/lighthouse/pull/15483))
* devtools: remove usage of frontend globals ([#15518](https://github.com/GoogleChrome/lighthouse/pull/15518))
* devtools: ensure Lighthouse starts in smoke tests ([#15459](https://github.com/GoogleChrome/lighthouse/pull/15459))
* devtools: fix viewport in smoke tests ([#15454](https://github.com/GoogleChrome/lighthouse/pull/15454))
* devtools: sync e2e ([#15444](https://github.com/GoogleChrome/lighthouse/pull/15444))

## Misc

* tweak dependabot ecosystem value ([#15521](https://github.com/GoogleChrome/lighthouse/pull/15521))
* have dependabot check github actions deps ([#15496](https://github.com/GoogleChrome/lighthouse/pull/15496))
* adopt minimal license headers ([#15456](https://github.com/GoogleChrome/lighthouse/pull/15456))
* bot: delete stale git bot rules ([#14915](https://github.com/GoogleChrome/lighthouse/pull/14915))
* ci: use commit sha for markdown action ([#15493](https://github.com/GoogleChrome/lighthouse/pull/15493))

<a name="11.1.0"></a>
# 11.1.0 (2023-09-06)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v11.0.0...v11.1.0)

We expect this release to ship in the DevTools of [Chrome 119](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Tortitas @TortitasT
- Ian Kilpatrick @bfgeek
- GLI @tobyglei

## Core

* add TBT savings to `bootup-time` ([#15431](https://github.com/GoogleChrome/lighthouse/pull/15431))
* add guidance level to performance audits ([#15025](https://github.com/GoogleChrome/lighthouse/pull/15025))
* add TBT impact to third party audits ([#15385](https://github.com/GoogleChrome/lighthouse/pull/15385))
* fix `index.cjs` types ([#15387](https://github.com/GoogleChrome/lighthouse/pull/15387))
* asset-saver: use new `DevtoolsLog` and `Trace` artifacts ([#15345](https://github.com/GoogleChrome/lighthouse/pull/15345))
* crawlable-anchors: consider empty `rawHref` crawlable ([#15406](https://github.com/GoogleChrome/lighthouse/pull/15406))
* dom-size: add TBT savings ([#15307](https://github.com/GoogleChrome/lighthouse/pull/15307))
* image-aspect-ratio: loosen aspect ratio threshold ([#15328](https://github.com/GoogleChrome/lighthouse/pull/15328))
* installable-manifest: update available installability errors ([#15388](https://github.com/GoogleChrome/lighthouse/pull/15388))
* largest-contentful-paint-element: add LCP savings ([#15178](https://github.com/GoogleChrome/lighthouse/pull/15178))
* lcp-lazy-loaded: add LCP savings estimate ([#15064](https://github.com/GoogleChrome/lighthouse/pull/15064))
* main-resource: fix protocol error when page is reloaded ([#14520](https://github.com/GoogleChrome/lighthouse/pull/14520))
* redirects: score only on wasted ms ([#15401](https://github.com/GoogleChrome/lighthouse/pull/15401))
* timespan-runner: warn if a navigation is detected ([#15407](https://github.com/GoogleChrome/lighthouse/pull/15407))
* viewport-meta: include initial-scale value condition ([#15394](https://github.com/GoogleChrome/lighthouse/pull/15394))

## Report

* fix category highlight in DevTools ([#15413](https://github.com/GoogleChrome/lighthouse/pull/15413))

## Deps

* upgrade `third-party-web` to 0.24.0 ([#15354](https://github.com/GoogleChrome/lighthouse/pull/15354))
* upgrade `axe-core` to 4.8.0 ([#15430](https://github.com/GoogleChrome/lighthouse/pull/15430))
* upgrade puppeteer to 21.1.1 ([#15403](https://github.com/GoogleChrome/lighthouse/pull/15403))
* upgrade puppeteer to 20.0.3 ([#15375](https://github.com/GoogleChrome/lighthouse/pull/15375))

## Clients

* extension: update some properties for manifest v3 ([#15347](https://github.com/GoogleChrome/lighthouse/pull/15347))

## I18n

* import ([#15443](https://github.com/GoogleChrome/lighthouse/pull/15443))

## Docs

* update explainer for devtools build ([#15414](https://github.com/GoogleChrome/lighthouse/pull/15414))
* add a guide to running Lighthouse at scale ([#10511](https://github.com/GoogleChrome/lighthouse/pull/10511))
* readme: fix chrome-launcher import example ([#15428](https://github.com/GoogleChrome/lighthouse/pull/15428))
* readme: add Lighthouse Metrics China to services list ([#15256](https://github.com/GoogleChrome/lighthouse/pull/15256))
* releasing: update cadence section ([#15392](https://github.com/GoogleChrome/lighthouse/pull/15392))
* releasing: remove instructions covered by automated tests ([#15353](https://github.com/GoogleChrome/lighthouse/pull/15353))

## Tests

* better error handling when test modules fail to load ([#15421](https://github.com/GoogleChrome/lighthouse/pull/15421))
* do not allow hashes in mock dt log ([#15363](https://github.com/GoogleChrome/lighthouse/pull/15363))
* dbw: remove upper bound for LCP load start/end ([#15432](https://github.com/GoogleChrome/lighthouse/pull/15432))
* dbw: increase threshold for LCP load start/end ([#15393](https://github.com/GoogleChrome/lighthouse/pull/15393))
* devtools: sync e2e ([#15389](https://github.com/GoogleChrome/lighthouse/pull/15389))
* smoke: update installability icon error for ToT ([#15422](https://github.com/GoogleChrome/lighthouse/pull/15422))
* unit: retry failures and upload failure artifacts ([#15378](https://github.com/GoogleChrome/lighthouse/pull/15378))

## Misc

* move root.js to shared/ ([#15439](https://github.com/GoogleChrome/lighthouse/pull/15439))
* remove url hash to avoid gtm hang in treemap, viewer ([#15425](https://github.com/GoogleChrome/lighthouse/pull/15425))
* move esm-utils.js to shared/ ([#15418](https://github.com/GoogleChrome/lighthouse/pull/15418))
* move dependabot.yml to correct folder ([#15417](https://github.com/GoogleChrome/lighthouse/pull/15417))
* add dependabot.yml ([#15341](https://github.com/GoogleChrome/lighthouse/pull/15341))
* build: do not minify browser extension ([#15381](https://github.com/GoogleChrome/lighthouse/pull/15381))
* build: output source map when building bundles ([#15348](https://github.com/GoogleChrome/lighthouse/pull/15348))
* readme: use note for Node version callout ([#15410](https://github.com/GoogleChrome/lighthouse/pull/15410))
* treemap: reduce granularity for byte values ([#15415](https://github.com/GoogleChrome/lighthouse/pull/15415))

<a name="11.0.0"></a>
# 11.0.0 (2023-08-03)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v10.4.0...v11.0.0)

We expect this release to ship in the DevTools of [Chrome 118](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Nakamura Ayahito @penicillin0
- patrick kettner @patrickkettner
- lasseschou @lasseschou
- ZzZzzzxc @ZzZzzzxc

## Notable Changes

### Removed legacy navigation runner

The `--legacy-navigation` flag on the CLI, the `legacyNavigation()` function in the Node API, and the "Legacy navigation" checkbox in the DevTools panel have all been removed.

### New `DevtoolsLog` and `Trace` artifacts

For custom audits, the `devtoolsLogs['defaultPass']` and `traces['defaultPass']` artifacts have been deprecated in favor of `DevtoolsLog` and `Trace`. See our [plugin docs](https://github.com/GoogleChrome/lighthouse/blob/main/docs/plugins.md#using-network-requests) for example usage.

`devtoolsLogs` and `traces` still exist for compatibility purposes but will be removed in a future breaking release.

## 🆕 New Audits

* add minor aXe audits and re-weight existing ones ([#15298](https://github.com/GoogleChrome/lighthouse/pull/15298))

## 💥 Breaking changes

* misc: drop node 16 support ([#15290](https://github.com/GoogleChrome/lighthouse/pull/15290))
* core: remove `resource-summary` audit ([#15299](https://github.com/GoogleChrome/lighthouse/pull/15299))
* core: add `DevtoolsLogError` and `TraceError` artifacts ([#15311](https://github.com/GoogleChrome/lighthouse/pull/15311))
* core: make INP non-experimental ([#15285](https://github.com/GoogleChrome/lighthouse/pull/15285))
* core: remove `service-worker` audit ([#15257](https://github.com/GoogleChrome/lighthouse/pull/15257))
* core: remove legacy runner ([#15253](https://github.com/GoogleChrome/lighthouse/pull/15253))
* core: remove `first-contentful-paint-3g` audit ([#15252](https://github.com/GoogleChrome/lighthouse/pull/15252))

## Core

* re-weight best practices ([#15321](https://github.com/GoogleChrome/lighthouse/pull/15321))
* single network monitor kept on Driver ([#15055](https://github.com/GoogleChrome/lighthouse/pull/15055))
* do not emit NOT_HTML error if record not ok ([#15271](https://github.com/GoogleChrome/lighthouse/pull/15271))
* report artifact error when collected, add err.extra ([#15258](https://github.com/GoogleChrome/lighthouse/pull/15258))
* remove the "FR" prefix from types ([#15274](https://github.com/GoogleChrome/lighthouse/pull/15274))
* remove legacy artifacts types ([#15273](https://github.com/GoogleChrome/lighthouse/pull/15273))
* duplicated-javascript: use valid granularity ([#15275](https://github.com/GoogleChrome/lighthouse/pull/15275))
* lcp-element: gracefully handle error in phase table ([#15329](https://github.com/GoogleChrome/lighthouse/pull/15329))
* network-analyzer: coarse rtt estimate on per-origin basis ([#15103](https://github.com/GoogleChrome/lighthouse/pull/15103))
* network-request: loosen lightrider timing checksum ([#15330](https://github.com/GoogleChrome/lighthouse/pull/15330))
* render-blocking-resources: add FCP and LCP savings ([#15238](https://github.com/GoogleChrome/lighthouse/pull/15238))
* response-compresson: throw on unexpected error ([#15259](https://github.com/GoogleChrome/lighthouse/pull/15259))
* source-maps: use `Scripts` as a dependency ([#15293](https://github.com/GoogleChrome/lighthouse/pull/15293))
* stack-packs: add NitroPack detection ([#15314](https://github.com/GoogleChrome/lighthouse/pull/15314))
* uses-http2: add LCP and FCP savings ([#15320](https://github.com/GoogleChrome/lighthouse/pull/15320))
* uses-rel-preconnect: add FCP and LCP savings ([#15281](https://github.com/GoogleChrome/lighthouse/pull/15281))

## CLI

* sentry: mention --enable-error-reporting flag in prompt ([#15174](https://github.com/GoogleChrome/lighthouse/pull/15174))

## Report

* re-order manual audits and expand when audits pass ([#15310](https://github.com/GoogleChrome/lighthouse/pull/15310))
* move "View Original Trace" to the topbar dropdown ([#15315](https://github.com/GoogleChrome/lighthouse/pull/15315))

## Deps

* upgrade puppeteer to 21.0.1 ([#15331](https://github.com/GoogleChrome/lighthouse/pull/15331))
* upgrade `lighthouse-logger` to 2.0.1 ([#15282](https://github.com/GoogleChrome/lighthouse/pull/15282))
* upgrade `chrome-launcher` to 1.0.0 ([#15287](https://github.com/GoogleChrome/lighthouse/pull/15287))
* deduplicate yarn.lock ([#15269](https://github.com/GoogleChrome/lighthouse/pull/15269))
* upgrade robots-parser to 3.0.1 ([#15268](https://github.com/GoogleChrome/lighthouse/pull/15268))

## Clients

* extension: update to manifest v3 ([#15219](https://github.com/GoogleChrome/lighthouse/pull/15219))

## I18n

* import ([#15334](https://github.com/GoogleChrome/lighthouse/pull/15334))

## Docs

* remove legacy navigation ([#15340](https://github.com/GoogleChrome/lighthouse/pull/15340))
* remove references to `devtoolsLogs` and `traces` ([#15318](https://github.com/GoogleChrome/lighthouse/pull/15318))
* plugins: fix syntax typos ([#15264](https://github.com/GoogleChrome/lighthouse/pull/15264))
* readme: add PageVitals to the list of integrations ([#15288](https://github.com/GoogleChrome/lighthouse/pull/15288))

## Tests

* add page functions bundling test ([#15280](https://github.com/GoogleChrome/lighthouse/pull/15280))
* make smokehouse output dir with recursive flag ([#15261](https://github.com/GoogleChrome/lighthouse/pull/15261))
* save smokehouse outputs to .tmp/smokehouse-output ([#15251](https://github.com/GoogleChrome/lighthouse/pull/15251))
* call toString for errors from bundled worker ([#15245](https://github.com/GoogleChrome/lighthouse/pull/15245))
* devtools: remove unused test options ([#15260](https://github.com/GoogleChrome/lighthouse/pull/15260))
* devtools: sync e2e ([#15250](https://github.com/GoogleChrome/lighthouse/pull/15250))
* smoke: allow for decimal in a11y tap target ([#15327](https://github.com/GoogleChrome/lighthouse/pull/15327))
* smoke: drop legacy support ([#15249](https://github.com/GoogleChrome/lighthouse/pull/15249))

## Misc

* remove residual references to legacy ([#15292](https://github.com/GoogleChrome/lighthouse/pull/15292))
* fix typo ([#15120](https://github.com/GoogleChrome/lighthouse/pull/15120))
* rename `fraggle-rock` fixtures directory to `user-flows` ([#15291](https://github.com/GoogleChrome/lighthouse/pull/15291))
* add main path to logger ([#15284](https://github.com/GoogleChrome/lighthouse/pull/15284))
* build: bundle with esbuild minification instead of terser ([#15283](https://github.com/GoogleChrome/lighthouse/pull/15283))
* build: replace rollup with esbuild ([#15239](https://github.com/GoogleChrome/lighthouse/pull/15239))
* ci: update actions using deprecated node12 ([#15304](https://github.com/GoogleChrome/lighthouse/pull/15304))
* logger: add types, remove cjs ([#15279](https://github.com/GoogleChrome/lighthouse/pull/15279))

<a name="10.4.0"></a>
# 10.4.0 (2023-07-10)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v10.3.0...v10.4.0)

We expect this release to ship in the DevTools of [Chrome 117](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Sanjaiyan Parthipan @sanjaiyan-dev

## New Audits

* add hidden, 0-weight a11y audits ([#15216](https://github.com/GoogleChrome/lighthouse/pull/15216))
* aria-dialog-name, aria-text, link-in-text-block, select-name ([#15159](https://github.com/GoogleChrome/lighthouse/pull/15159))

## Core

* remove unnecessary references to legacy gatherer ([#15236](https://github.com/GoogleChrome/lighthouse/pull/15236))
* update residual usages of legacy runner ([#15227](https://github.com/GoogleChrome/lighthouse/pull/15227))
* compute TBT impact for main thread tasks ([#15175](https://github.com/GoogleChrome/lighthouse/pull/15175))
* support ts targets before es2022 ([#15189](https://github.com/GoogleChrome/lighthouse/pull/15189))
* byte-efficiency: compute FCP & LCP savings ([#15104](https://github.com/GoogleChrome/lighthouse/pull/15104))
* config: add more validation from legacy ([#15211](https://github.com/GoogleChrome/lighthouse/pull/15211))
* link-text: add tamil keywords to blocklist ([#15152](https://github.com/GoogleChrome/lighthouse/pull/15152))
* long-tasks: add more task information to debugData ([#15198](https://github.com/GoogleChrome/lighthouse/pull/15198))
* network-recorder: set target type of unfinished request ([#15232](https://github.com/GoogleChrome/lighthouse/pull/15232))
* non-composited-animations: add CLS savings as always 0 ([#15099](https://github.com/GoogleChrome/lighthouse/pull/15099))
* prioritize-lcp-image: add LCP savings ([#15229](https://github.com/GoogleChrome/lighthouse/pull/15229))
* proto: add errorStack to AuditResult ([#15187](https://github.com/GoogleChrome/lighthouse/pull/15187))
* redirects: add FCP and LCP savings ([#15228](https://github.com/GoogleChrome/lighthouse/pull/15228))
* source-maps: support BOM markers and CORB prefix ([#15224](https://github.com/GoogleChrome/lighthouse/pull/15224))
* stacks: add wix ([#15171](https://github.com/GoogleChrome/lighthouse/pull/15171))
* unsized-images: add CLS savings as always 0 ([#15196](https://github.com/GoogleChrome/lighthouse/pull/15196))
* viewport: add INP savings ([#15071](https://github.com/GoogleChrome/lighthouse/pull/15071))
* work-during-interaction: add INP savings ([#15176](https://github.com/GoogleChrome/lighthouse/pull/15176))

## Report

* use fixed position for hidden radios ([#15181](https://github.com/GoogleChrome/lighthouse/pull/15181))

## Deps

* upgrade puppeteer to 20.8 ([#15226](https://github.com/GoogleChrome/lighthouse/pull/15226))
* upgrade third-party-web to 0.23.3 ([#15213](https://github.com/GoogleChrome/lighthouse/pull/15213))

## I18n

* import ([#15243](https://github.com/GoogleChrome/lighthouse/pull/15243))

## Tests

* save smokehouse failures, improve bundle runner logging ([#15235](https://github.com/GoogleChrome/lighthouse/pull/15235))
* remove usages of legacy driver ([#15230](https://github.com/GoogleChrome/lighthouse/pull/15230))
* a11y: use regex for target size explanation ([#15231](https://github.com/GoogleChrome/lighthouse/pull/15231))
* ci: skip puppeteer Chrome download ([#15177](https://github.com/GoogleChrome/lighthouse/pull/15177))
* config: add unit tests from legacy config ([#15209](https://github.com/GoogleChrome/lighthouse/pull/15209))
* devtools: fix e2e compile error ([#15210](https://github.com/GoogleChrome/lighthouse/pull/15210))
* devtools: remove parallel modifier from e2e tests ([#15172](https://github.com/GoogleChrome/lighthouse/pull/15172))
* issues-mixed-content: use new site for testing ([#15241](https://github.com/GoogleChrome/lighthouse/pull/15241))
* runner: drop usages of legacy runner ([#15047](https://github.com/GoogleChrome/lighthouse/pull/15047))
* smoke: expect server-response-time to be greater than 0 ([#15188](https://github.com/GoogleChrome/lighthouse/pull/15188))

<a name="10.3.0"></a>
# 10.3.0 (2023-06-13)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v10.2.0...v10.3.0)

We expect this release to ship in the DevTools of [Chrome 116](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Derek Perkins @derekperkins
- Rob McGuire @robatron
- Aditya Dharmawan Saputra @adityadees

## New Audits

* table-fake-caption, html-xml-lang-mismatch, input-button-name ([#15098](https://github.com/GoogleChrome/lighthouse/pull/15098))
* td-has-header ([#15051](https://github.com/GoogleChrome/lighthouse/pull/15051))

## Core

* expose error stack on errored audits ([#14491](https://github.com/GoogleChrome/lighthouse/pull/14491))
* move metric savings to audit product ([#15074](https://github.com/GoogleChrome/lighthouse/pull/15074))
* add metric savings to audit result ([#14997](https://github.com/GoogleChrome/lighthouse/pull/14997))
* byte-efficiency: use log-normal distribution scoring ([#14977](https://github.com/GoogleChrome/lighthouse/pull/14977))
* crawlable-anchors: allow elements acting as anchors ([#15079](https://github.com/GoogleChrome/lighthouse/pull/15079))
* cumulative-layout-shift: remove totalCumulativeLayoutShift ([#15122](https://github.com/GoogleChrome/lighthouse/pull/15122))
* entity-classification: classify chrome extensions into separate entities ([#15017](https://github.com/GoogleChrome/lighthouse/pull/15017))
* global-listeners: iterate all execution contexts ([#15054](https://github.com/GoogleChrome/lighthouse/pull/15054))
* inspector-issues: add `federatedAuthUserInfoRequestIssue` ([#15149](https://github.com/GoogleChrome/lighthouse/pull/15149))
* inspector-issues: add `stylesheetLoadingIssue` ([#15144](https://github.com/GoogleChrome/lighthouse/pull/15144))
* largest-contentful-paint-element: display LCP value ([#15061](https://github.com/GoogleChrome/lighthouse/pull/15061))
* layout-shift-elements: add CLS savings ([#15070](https://github.com/GoogleChrome/lighthouse/pull/15070))
* network-analyzer: estimate from lrStatistics ([#15158](https://github.com/GoogleChrome/lighthouse/pull/15158))
* network-analyzer: include 0 start times in rtt estimate ([#15100](https://github.com/GoogleChrome/lighthouse/pull/15100))
* network-analyzer: fix num of roundtrips for h3 estimates ([#15102](https://github.com/GoogleChrome/lighthouse/pull/15102))
* network-analyzer: use arithmetic mean for median ([#15096](https://github.com/GoogleChrome/lighthouse/pull/15096))
* network-analyzer: infer single rtt estimate for h3 ([#15095](https://github.com/GoogleChrome/lighthouse/pull/15095))
* network-request: simplify recomputeTimesWithResourceTiming ([#15107](https://github.com/GoogleChrome/lighthouse/pull/15107))
* network-requests: add entity classification ([#15105](https://github.com/GoogleChrome/lighthouse/pull/15105))
* server-response-time: fix for lightrider ([#15156](https://github.com/GoogleChrome/lighthouse/pull/15156))
* server-response-time: use receiveHeadersStart instead of end ([#15155](https://github.com/GoogleChrome/lighthouse/pull/15155))
* time-to-first-byte: use receiveHeadersStart ([#15126](https://github.com/GoogleChrome/lighthouse/pull/15126))
* trace-elements: use CLS metric event filtering ([#15067](https://github.com/GoogleChrome/lighthouse/pull/15067))
* uses-rel-preconnect: handle 0 connect start timings ([#15157](https://github.com/GoogleChrome/lighthouse/pull/15157))

## Report

* append utm query params to stack pack links ([#15094](https://github.com/GoogleChrome/lighthouse/pull/15094))
* update error icons ([#15092](https://github.com/GoogleChrome/lighthouse/pull/15092))
* update keyframes for confetti animation ([#15059](https://github.com/GoogleChrome/lighthouse/pull/15059))

## Deps

* upgrade third-party-web to 0.23.0 ([#15166](https://github.com/GoogleChrome/lighthouse/pull/15166))
* upgrade puppeteer to 20.7.1 ([#15164](https://github.com/GoogleChrome/lighthouse/pull/15164))
* upgrade axe-core to 4.7.2 ([#15165](https://github.com/GoogleChrome/lighthouse/pull/15165))
* update to latest chrome-devtools-frontend ([#15137](https://github.com/GoogleChrome/lighthouse/pull/15137))
* upgrade `puppeteer` and `puppeteer-core` ([#15143](https://github.com/GoogleChrome/lighthouse/pull/15143))
* upgrade third-party-web to 0.22.0 ([#15097](https://github.com/GoogleChrome/lighthouse/pull/15097))
* upgrade axe-core to 4.7.1 ([#15078](https://github.com/GoogleChrome/lighthouse/pull/15078))
* upgrade lighthouse-logger to 1.4.1 ([#15082](https://github.com/GoogleChrome/lighthouse/pull/15082))
* es-main: update to 1.2.0 ([#15121](https://github.com/GoogleChrome/lighthouse/pull/15121))

## I18n

* import ([#15168](https://github.com/GoogleChrome/lighthouse/pull/15168))

## Docs

* readme: add unit test tips ([#15108](https://github.com/GoogleChrome/lighthouse/pull/15108))
* readme: add `laravel-lighthouse` to project list ([#15011](https://github.com/GoogleChrome/lighthouse/pull/15011))

## Tests

* remove most usages of `afterPass` ([#15057](https://github.com/GoogleChrome/lighthouse/pull/15057))
* rebaseline inspector issue detail types ([#15050](https://github.com/GoogleChrome/lighthouse/pull/15050))
* ci: bump node to fix windows latency failure ([#15162](https://github.com/GoogleChrome/lighthouse/pull/15162))
* smoke: add expectations for network-rtt, network-server-latency ([#15113](https://github.com/GoogleChrome/lighthouse/pull/15113))
* smoke: remove external resource from dbw ([#15111](https://github.com/GoogleChrome/lighthouse/pull/15111))
* smoke: add expectation for lcp-element ([#15112](https://github.com/GoogleChrome/lighthouse/pull/15112))

## Misc

* support node 10 in lighthouse-logger ([#15089](https://github.com/GoogleChrome/lighthouse/pull/15089))
* add cjs path for logger ([#15084](https://github.com/GoogleChrome/lighthouse/pull/15084))
* bump `lighthouse-logger` to v1.4.0 ([#15081](https://github.com/GoogleChrome/lighthouse/pull/15081))
* compare-runs: allow for multiple args to lighthouse ([#15066](https://github.com/GoogleChrome/lighthouse/pull/15066))
* lantern-collect: drop sampling ([#15072](https://github.com/GoogleChrome/lighthouse/pull/15072))
* lantern-collect: add median lhr to golden zip ([#15077](https://github.com/GoogleChrome/lighthouse/pull/15077))
* lantern-collect: rebaseline to include new ttfb metric ([#15069](https://github.com/GoogleChrome/lighthouse/pull/15069))
* proto: add package name ([#15116](https://github.com/GoogleChrome/lighthouse/pull/15116))

<a name="10.2.0"></a>
# 10.2.0 (2023-05-04)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v10.1.1...v10.2.0)

We expect this release to ship in the DevTools of [Chrome 115](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Eric K @doteric

## Notable Changes

* largest-contentful-paint-element: add phases table ([#14891](https://github.com/GoogleChrome/lighthouse/pull/14891))

## Core

* add flow methods to cjs entry ([#15045](https://github.com/GoogleChrome/lighthouse/pull/15045))
* use target type instead of session for oopif ([#15006](https://github.com/GoogleChrome/lighthouse/pull/15006))
* create timing entries for `getArtifact` ([#15024](https://github.com/GoogleChrome/lighthouse/pull/15024))
* classify extension urls as non-network ([#15022](https://github.com/GoogleChrome/lighthouse/pull/15022))
* add time-to-first-byte and lcp-breakdown ([#14941](https://github.com/GoogleChrome/lighthouse/pull/14941))
* fix viewport when running over adb ([#14937](https://github.com/GoogleChrome/lighthouse/pull/14937))
* driver: warn about remaining inflight requests urls ([#14963](https://github.com/GoogleChrome/lighthouse/pull/14963))
* entity-classification: classify unknown urls as "unattributable" ([#15009](https://github.com/GoogleChrome/lighthouse/pull/15009))
* predictive-perf: add URL as requiredArtifact ([#15028](https://github.com/GoogleChrome/lighthouse/pull/15028))
* runner: handle erroneous screenshot ([#14981](https://github.com/GoogleChrome/lighthouse/pull/14981))
* stack-packs: sort packs in order we defined them ([#15039](https://github.com/GoogleChrome/lighthouse/pull/15039))

## Report

* avoid really slow regexes for long urls ([#14745](https://github.com/GoogleChrome/lighthouse/pull/14745))
* remove content-visibility from lh-category ([#14994](https://github.com/GoogleChrome/lighthouse/pull/14994))

## Deps

* update to typescript 5.0.4 ([#15023](https://github.com/GoogleChrome/lighthouse/pull/15023))
* upgrade puppeteer and puppeteer-core ([#15000](https://github.com/GoogleChrome/lighthouse/pull/15000))
* axe-core: upgrade to 4.7.0 ([#15033](https://github.com/GoogleChrome/lighthouse/pull/15033))
* chrome-launcher: update to 0.15.2 ([#14983](https://github.com/GoogleChrome/lighthouse/pull/14983))
* lighthouse-stack-packs: upgrade to 1.10.0 ([#15038](https://github.com/GoogleChrome/lighthouse/pull/15038))
* puppeteer: upgrade to 20.1.0 ([#15037](https://github.com/GoogleChrome/lighthouse/pull/15037))

## I18n

* import ([#15041](https://github.com/GoogleChrome/lighthouse/pull/15041))

## Docs

* update throttling methods ([#14993](https://github.com/GoogleChrome/lighthouse/pull/14993))
* update pptr options example ([#14978](https://github.com/GoogleChrome/lighthouse/pull/14978))

## Tests

* devtools: sync e2e ([#14995](https://github.com/GoogleChrome/lighthouse/pull/14995))
* move regenerated fixtures to new folders ([#15031](https://github.com/GoogleChrome/lighthouse/pull/15031))
* add user flows to generate some fixtures ([#15005](https://github.com/GoogleChrome/lighthouse/pull/15005))

## Misc

* logger: add warn level ([#14964](https://github.com/GoogleChrome/lighthouse/pull/14964))

<a name="10.1.1"></a>
# 10.1.1 (2023-04-14)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v10.1.0...v10.1.1)

We expect this release to ship in the DevTools of [Chrome 114](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## Core

* collect fetchpriority for images and rel=preload links ([#14925](https://github.com/GoogleChrome/lighthouse/pull/14925))
* installability: deprecate scheme support warning ([#14960](https://github.com/GoogleChrome/lighthouse/pull/14960))
* link-elements: gracefully handle header parser error ([#14936](https://github.com/GoogleChrome/lighthouse/pull/14936))

## Deps

* upgrade `http-link-header` ([#14973](https://github.com/GoogleChrome/lighthouse/pull/14973))
* upgrade `devtools-protocol` & deprecate SW install error ([#14974](https://github.com/GoogleChrome/lighthouse/pull/14974))

## Tests

* remove cross origin timespan test ([#14932](https://github.com/GoogleChrome/lighthouse/pull/14932))
* devtools: fix config for testing ([#14962](https://github.com/GoogleChrome/lighthouse/pull/14962))
* devtools: sync e2e ([#14931](https://github.com/GoogleChrome/lighthouse/pull/14931))

## Misc

* proto: fix case in entities fields ([#14959](https://github.com/GoogleChrome/lighthouse/pull/14959))

<a name="10.1.0"></a>
# 10.1.0 (2023-03-23)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v10.0.2...v10.1.0)

We expect this release to ship in the DevTools of [Chrome 114](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Do Thanh Hai @dothanhhai
- Jongwoo Han @jongwooo
- Henry Lim @limhenry
- Sepehr Safari @sepehr-safari

## Notable Changes

* report: group third-party entities ([#14655](https://github.com/GoogleChrome/lighthouse/pull/14655))

## Core

* cap byte-efficiency-audit scores to a max of 1 ([#14921](https://github.com/GoogleChrome/lighthouse/pull/14921))
* correctly truncate unicode strings ([#14911](https://github.com/GoogleChrome/lighthouse/pull/14911))
* allow any audit details type to be used in an opportunity ([#14903](https://github.com/GoogleChrome/lighthouse/pull/14903))
* audit: update link for source maps to chrome developer docs ([#14855](https://github.com/GoogleChrome/lighthouse/pull/14855))
* cls: ignore `had_recent_input` by timing window ([#14402](https://github.com/GoogleChrome/lighthouse/pull/14402))
* doctype: handle optional trace correctly ([#14918](https://github.com/GoogleChrome/lighthouse/pull/14918))
* legacy-javascript: add focus-visible polyfill ([#14827](https://github.com/GoogleChrome/lighthouse/pull/14827))
* tap-targets: update audit description ([#14869](https://github.com/GoogleChrome/lighthouse/pull/14869))
* trace-processor: support single process trace ([#14901](https://github.com/GoogleChrome/lighthouse/pull/14901))
* uses-responsive-images-snapshot: ignore CSS images ([#14890](https://github.com/GoogleChrome/lighthouse/pull/14890))

## CLI

* fix `--channel` flag ([#14924](https://github.com/GoogleChrome/lighthouse/pull/14924))

## Report

* update table hover shades ([#14873](https://github.com/GoogleChrome/lighthouse/pull/14873))
* consistently use our monospace font stack ([#14842](https://github.com/GoogleChrome/lighthouse/pull/14842))

## Deps

* upgrade `http-link-header` and node polyfills ([#14889](https://github.com/GoogleChrome/lighthouse/pull/14889))
* upgrade soft navigation plugin ([#14883](https://github.com/GoogleChrome/lighthouse/pull/14883))
* testdouble: update, move off forked quibble ([#14863](https://github.com/GoogleChrome/lighthouse/pull/14863))

## Clients

* bundled: include soft navigation plugin ([#14874](https://github.com/GoogleChrome/lighthouse/pull/14874))
* lr: remove FCP 3G from config ([#14910](https://github.com/GoogleChrome/lighthouse/pull/14910))
* viewer: link to diff tool's new URL ([#14865](https://github.com/GoogleChrome/lighthouse/pull/14865))
* viewer: rework landing with link to lhci diff tool ([#14851](https://github.com/GoogleChrome/lighthouse/pull/14851))

## Docs

* fix various typos ([#14209](https://github.com/GoogleChrome/lighthouse/pull/14209))

## Tests

* fix seo-tap-targets in high DPI ([#14866](https://github.com/GoogleChrome/lighthouse/pull/14866))
* devtools: reenable `issues-mixed-content` ([#14862](https://github.com/GoogleChrome/lighthouse/pull/14862))

## Misc

* replace deprecated command with environment file ([#14751](https://github.com/GoogleChrome/lighthouse/pull/14751))
* fix typos of overridden ([#14877](https://github.com/GoogleChrome/lighthouse/pull/14877))

<a name="10.0.2"></a>
# 10.0.2 (2023-02-28)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v10.0.1...v10.0.2)

We expect this release to ship in the DevTools of [Chrome 113](https://chromiumdash.appspot.com/schedule).

## Core

* tracing: handle `FrameCommittedInBrowser` with `processPseudoId` ([#14800](https://github.com/GoogleChrome/lighthouse/pull/14800))
* `redirects`: use `requestId` instead of URL to find requests ([#14838](https://github.com/GoogleChrome/lighthouse/pull/14838))
* don't use failed network requests as potential initiators ([#14819](https://github.com/GoogleChrome/lighthouse/pull/14819))
* config: change error message if no `artifacts` are defined ([#14818](https://github.com/GoogleChrome/lighthouse/pull/14818))
* `bf-cache`: count failures based on affected frames ([#14823](https://github.com/GoogleChrome/lighthouse/pull/14823))
* `legacy-javascript`: update polyfill size graph ([#14828](https://github.com/GoogleChrome/lighthouse/pull/14828))
* `prioritize-lcp-image`: use request initiators for load path ([#14807](https://github.com/GoogleChrome/lighthouse/pull/14807))
* `prioritize-lcp-image`: better identify lcp request ([#14804](https://github.com/GoogleChrome/lighthouse/pull/14804))
* types: fix error when using `moduleResolution: "node"` ([#14815](https://github.com/GoogleChrome/lighthouse/pull/14815))

## Clients

* lr: accept multiple `channel` naming conventions ([#14799](https://github.com/GoogleChrome/lighthouse/pull/14799))

## Docs

* user-flows: add desktop config examples ([#14806](https://github.com/GoogleChrome/lighthouse/pull/14806))

## Tests

* reenable `metrics-tricky-tti` on ToT ([#14790](https://github.com/GoogleChrome/lighthouse/pull/14790))
* devtools: use new `primaryPageTarget` function ([#14839](https://github.com/GoogleChrome/lighthouse/pull/14839))
* add roundtrip-proto lhr render test, check for `undefined` ([#14817](https://github.com/GoogleChrome/lighthouse/pull/14817))
* devtools: sync e2e tests ([#14801](https://github.com/GoogleChrome/lighthouse/pull/14801))

## Misc

* proto: add `screenEmulation` to `configSettings` ([#14809](https://github.com/GoogleChrome/lighthouse/pull/14809), [#14826](https://github.com/GoogleChrome/lighthouse/pull/14826))

<a name="10.0.1"></a>
# 10.0.1 (2023-02-14)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v10.0.0...v10.0.1)

We expect this release to ship in the DevTools of [Chrome 112](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## Core

* reduce DevTools flakiness ([#14782](https://github.com/GoogleChrome/lighthouse/pull/14782))
* doctype: only consider main frame ([#14795](https://github.com/GoogleChrome/lighthouse/pull/14795))
* paste-preventing-inputs: rephrase description ([#14794](https://github.com/GoogleChrome/lighthouse/pull/14794))

## Deps

* move quibble to dev deps ([#14780](https://github.com/GoogleChrome/lighthouse/pull/14780))

## Docs

* split changelog at 10.0 ([#14778](https://github.com/GoogleChrome/lighthouse/pull/14778))
* changelog: minor v10 edits ([#14777](https://github.com/GoogleChrome/lighthouse/pull/14777))

## Misc

* update .npmignore ([#14779](https://github.com/GoogleChrome/lighthouse/pull/14779))

<a name="10.0.0"></a>
# 10.0.0 (2023-02-09)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v9.6.8...v10.0.0)

We expect this release to ship in the DevTools of [Chrome 112](https://chromiumdash.appspot.com/schedule), and to PageSpeed Insights within 2 weeks.

## New Contributors

Thanks to our new contributors 👽🐷🐰🐯🐻!

- Alex N. Jose @alexnj
- Alexandra White @heyawhite
- Amanda @apettenati
- Andrew Gutekanst @Andoryuuta
- Christopher Holder @ChristopherPHolder
- Dongkyun Yu (Steve) @hackurity01
- Floris @FMJansen
- Gabe @MrBrain295
- ghost_32 @k99sharma
- Littleton Riggins @TripleEquals
- lowkeyAngry @lowkeyAngry
- Michael McMahon @TechnologyClassroom
- Shogo Hida @shogohida
- Stoyan @stoyan
- Yang Guo @hashseed

## Notable Changes

### Performance Score Changes

In the 8.0 release, we [described TTI's waning role](https://github.com/GoogleChrome/lighthouse/blob/main/docs/v8-perf-faq.md#whats-the-story-with-tti), and today we have the followup. Time to Interactive (TTI) no longer contributes to the performance score and is not displayed in the report. However, it is still accessible in the Lighthouse result JSON.

Without TTI, the weighting of Cumulative Layout Shift (CLS) has increased from 15% to 25%. See the docs for a complete breakdown of [how the Performance score is calculated in 10.0](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/#lighthouse-10), or [play with the scoring calculator](https://googlechrome.github.io/lighthouse/scorecalc/#FCP=3000&SI=5800&FMP=4000&TTI=7300&FCI=6500&LCP=4000&TBT=600&CLS=0.25&device=mobile&version=10&version=8).

### Types for the Node package

Lighthouse now includes type declarations! Our [example TypeScript recipe](https://github.com/GoogleChrome/lighthouse/tree/main/docs/recipes/type-checking) demonstrates how to achieve proper type safety with Lighthouse.

### Third-party Entity classification

Since Lighthouse 5.3, the community-driven [`third-party-web`](https://github.com/patrickhulce/third-party-web) dataset has been used to summarize how every third-party found on a page contributes to the total JavaScript blocking time, via the `third-party-summary` audit. With Lighthouse 10.0, we are adding a new property to the JSON result (`entities`) to make further use of this dataset. Every origin encountered on a page is now classified as first-party or third-party within `entities`. In 10.0, this classification is used to power the existing third-party filter checkbox.

In a future version of Lighthouse, this will be used to group the table items of every audit based on the entity it originated from, and aggregate the impact of items from that specific entity.

## 🆕 New Audits

### Back/forward cache

The Back/forward cache (bfcache for short) is a browser optimization that serves pages from fully serialized snapshots when navigating back or forwards in session history. There are over 100 different reasons why a page may not be eligible for this optimization, so to assist developers Lighthouse now attempts to trigger a bfcache response and will list anything that prevented the browser from using the bfcache. [#14465](https://github.com/GoogleChrome/lighthouse/pull/14465)

For more on bfcache, see [the web.dev article](https://web.dev/bfcache/).

Note: This audit initially will not be available for PageSpeed Insights.

### Preventing pasting to inputs

The audit `password-inputs-can-be-pasted-into` is now `paste-preventing-inputs`. This audit's logic works just as before, but rather than just considering `[type=password]` inputs, it now fails if _any_ non-readonly input element prevents the user from pasting. [#14313](https://github.com/GoogleChrome/lighthouse/pull/14313)

## Lighthouse documentation is now on developer.chrome.com

Our documentation is no longer hosted on web.dev. For the most up to date audit docs, please go to [developer.chrome.com/docs/lighthouse/](https://developer.chrome.com/docs/lighthouse/)

## 💥 Breaking changes

Under the hood, Lighthouse now uses the new user-flow supporting infrastructure by default, even for traditional navigation runs. You can opt out of this by: in the CLI, use `--legacy-navigation`; in DevTools: check “Legacy Navigation” in the settings menu. If you have a use case that necessitates this escape hatch, please file an issue. We plan to remove this legacy path in 11.0.

### For Lighthouse result JSON (LHR) users

#### Page URLs on the Lighthouse Result

Until now, there were two URL fields to describe a Lighthouse run:

- `requestedUrl`: the url given by the users, which Lighthouse instructs Chrome to navigate to
- `finalUrl`: the url after any server-initiated HTTP and JS-initiated redirects

This taxonomy cannot account for more complex scenarios, such as JS-initiated redirects, usage of the History API or soft-navigations. They were also ill-defined for timespan and snapshot modes. To account for that, Lighthouse 10.0 now has these URL fields:

- (changed) `requestedUrl`: The URL that Lighthouse initially navigated to before redirects. This is the same as it was before for navigation mode, but now it will be `undefined` in timespan/snapshot.
- (new) `mainDocumentUrl`: The URL of the last document requested during a navigation. It does not account for soft navigations or history API events made after the page loads. It is only available in navigation mode, and will be undefined in timespan and snapshot modes.
- (new) `finalDisplayedUrl`: The URL displayed in the browser combobox at the end of a Lighthouse run. It accounts for soft navigations and history API events. Available in navigation, timespan, and snapshot modes.
- (deprecated) `finalUrl`: Same value as `mainDocumentUrl`.

#### Audit changes

- `password-inputs-can-be-pasted-into` -> `paste-preventing-inputs`
- `preload-lcp-image` -> `prioritize-lcp-image`
- `third-party-summary` no longer uses a `link` value for `item.entity`, instead uses a raw `text` value
- `full-page-screenshot` is no longer an audit, instead it is stored at `lhr.fullPageScreenshot`. To suppress collection of the full-page screenshot in the CLI, you must migrate from `--skip-audits full-page-screenshot` to `--disable-full-page-screenshot`.

### For Node users

- Node 14 is no longer supported, the minimum is now Node 16
- In case you import paths within the lighthouse node package: `lighthouse-core/` and `lighthouse-cli/` folders are now simply `core/` and `cli/`
- Converted from CommonJS to ES modules. You can still use lighthouse in CommonJS by using an dynamic import: `await import('lighthouse')`. For access to just the `lighthouse` function in CommonJS, you can also use `require('lighthouse/core/index.cjs')`
- The CSV output for Lighthouse is much more useful now. Consult the PR for [an example of the new format](https://github.com/GoogleChrome/lighthouse/pull/13558)
- `LHError` is now `LighthouseError`. If you are attempting to catch an error thrown by Lighthouse, be sure to account for this!

#### Node API changes

The `lighthouse` function now has [better integration with Puppeteer](https://github.com/GoogleChrome/lighthouse/blob/main/docs/puppeteer.md). Use `lighthouse(url, flags, config, page)` to run Lighthouse, passing an existing `Puppeteer.Page` handle as `page`.

The user flow api has moved to the top level node entrypoint and can be imported with `import {startFlow} from 'lighthouse'`.

New `flow.startNavigation()` and `flow.endNavigation()` functions let you define a user triggered navigation without any callback function. See the user flow docs for [an example](https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md#triggering-a-navigation-via-user-interactions).

To change settings for a single user flow step, define the settings overrides on the toplevel flags options `flow.snapshot({skipAduits: ['uses-http2']})` instead of on the `settingsOverride` property.

To give a flow step a custom name, use `flow.snapshot({name: 'Custom name'})`. Previously this was done via `stepName`.

### For Lighthouse customization (custom config, gatherers, audits)

- To work in Lighthouse 10.0, custom gatherers will need to implement the new Gatherer interface ([an example](https://github.com/GoogleChrome/lighthouse/blob/main/docs/recipes/custom-audit/memory-gatherer.js)). Otherwise, they will only work in [legacy navigation mode](https://github.com/GoogleChrome/lighthouse/blob/main/docs/configuration.md#using-legacy-configs-in-100) and older versions of Lighthouse
- Lighthouse cannot use `passes` to load the page multiple times in navigation mode anymore. If you need to load the page multiple times, we recommend using a user flow. See our config docs for instructions on [how to convert to the new config format](https://github.com/GoogleChrome/lighthouse/blob/main/docs/configuration.md#legacy-configs)
- The `ScriptElements` artifact is now `Scripts`, with a [slightly different shape](https://github.com/GoogleChrome/lighthouse/blob/955586c4e05d501d69a79d4ef0297991b6805690/types/artifacts.d.ts#L317)
- `Audit.makeOpportunityDetails` and `Audit.makeTableDetails` now accept an options object as the third parameter. This ends up being a breaking change for just `Audit.makeOpportunityDetails`.


# Detailed changelog

## Removed Audits

* [BREAKING] apple-touch-icon: remove audit ([#14243](https://github.com/GoogleChrome/lighthouse/pull/14243))
* [BREAKING] vulnerable-libraries: remove audit ([#14194](https://github.com/GoogleChrome/lighthouse/pull/14194))
* [BREAKING] full-page-screenshot: remove audit, move to top-level ([#14657](https://github.com/GoogleChrome/lighthouse/pull/14657))

## Core

* [BREAKING] scoring: rebalance perf metric weightings for v10 ([#14667](https://github.com/GoogleChrome/lighthouse/pull/14667))
* [BREAKING] third-party-summary: change item.entity from link to text ([#14749](https://github.com/GoogleChrome/lighthouse/pull/14749))
* [BREAKING] refactor csv output ([#13558](https://github.com/GoogleChrome/lighthouse/pull/13558))
* [BREAKING] emulation: retire moto g4, use moto g power ([#14674](https://github.com/GoogleChrome/lighthouse/pull/14674))
* [BREAKING] emulation: bump chrome UA to m109 and drop LH identifier ([#14384](https://github.com/GoogleChrome/lighthouse/pull/14384))
* [BREAKING] rename preload-lcp-image to prioritize-lcp-image ([#14761](https://github.com/GoogleChrome/lighthouse/pull/14761))
* [BREAKING] audit: add options param to make{Table,Opportunity}Details ([#14753](https://github.com/GoogleChrome/lighthouse/pull/14753))
* restructure types for direct import and publishing ([#14441](https://github.com/GoogleChrome/lighthouse/pull/14441))
* add entity classification of origins to the LHR ([#14622](https://github.com/GoogleChrome/lighthouse/pull/14622), [#14744](https://github.com/GoogleChrome/lighthouse/pull/14744))
* no-unload-listeners: move to best practices ([#14668](https://github.com/GoogleChrome/lighthouse/pull/14668))
* viewport: support interactive-widget ([#14664](https://github.com/GoogleChrome/lighthouse/pull/14664))
* preload-lcp-image: get LCP image url from trace ([#14695](https://github.com/GoogleChrome/lighthouse/pull/14695))
* use `performance.now` in isolation ([#14685](https://github.com/GoogleChrome/lighthouse/pull/14685))
* add initiatorRequest from async stacks and preloads ([#14741](https://github.com/GoogleChrome/lighthouse/pull/14741))
* processed-navigation: computed directly from trace ([#14693](https://github.com/GoogleChrome/lighthouse/pull/14693))
* add `usePassiveGathering` flag ([#14610](https://github.com/GoogleChrome/lighthouse/pull/14610))
* finalize master => main branch rename ([#14409](https://github.com/GoogleChrome/lighthouse/pull/14409))
* is-crawlable: only warn if some bots are blocked ([#14550](https://github.com/GoogleChrome/lighthouse/pull/14550))
* doctype: check for limited quirks mode ([#14576](https://github.com/GoogleChrome/lighthouse/pull/14576))
* add `BFCacheFailures` artifact ([#14485](https://github.com/GoogleChrome/lighthouse/pull/14485))
* use LCP specific message for NO_LCP ([#14556](https://github.com/GoogleChrome/lighthouse/pull/14556))
* i18n: fix path bug resulting in invalid i18n id via npx ([#14314](https://github.com/GoogleChrome/lighthouse/pull/14314))
* warn when clear storage times out ([#14476](https://github.com/GoogleChrome/lighthouse/pull/14476))
* expose default and desktop configs on `index.js` ([#14543](https://github.com/GoogleChrome/lighthouse/pull/14543))
* remove globals from `externs.d.ts` ([#14537](https://github.com/GoogleChrome/lighthouse/pull/14537))
* merge `api.js` into `index.js`, new report generator api ([#14531](https://github.com/GoogleChrome/lighthouse/pull/14531))
* remove deprecated flags check ([#14454](https://github.com/GoogleChrome/lighthouse/pull/14454))
* make `bypass`, `th-has-data-cells`, and `video-caption` informative ([#14453](https://github.com/GoogleChrome/lighthouse/pull/14453))
* save lhr to latest-run/ for -A, not just -GA ([#14414](https://github.com/GoogleChrome/lighthouse/pull/14414))
* remove `fraggle-rock` directory ([#14377](https://github.com/GoogleChrome/lighthouse/pull/14377))
* use-landmarks: fix missing markdown in description ([#14608](https://github.com/GoogleChrome/lighthouse/pull/14608))
* remove sd-validation audit files ([#14391](https://github.com/GoogleChrome/lighthouse/pull/14391))
* remove replay stringify extension ([#14330](https://github.com/GoogleChrome/lighthouse/pull/14330))
* rename url-shim to url-utils, stop extending global URL ([#14360](https://github.com/GoogleChrome/lighthouse/pull/14360))
* deprecate passes, remove config navigations from FR ([#13881](https://github.com/GoogleChrome/lighthouse/pull/13881))
* rename pwmetrics-events to metric-trace-events ([14258](https://github.com/GoogleChrome/lighthouse/pull/14258))
* remove trace-of-tab ([#14237](https://github.com/GoogleChrome/lighthouse/pull/14237))
* return result for xhtml, but with warning ([#12351](https://github.com/GoogleChrome/lighthouse/pull/12351))
* move network recorder and monitor to EventEmitter ([#14152](https://github.com/GoogleChrome/lighthouse/pull/14152))
* make session an event emitter ([#14147](https://github.com/GoogleChrome/lighthouse/pull/14147))
* update SourceMap build to use newest frontend and ParsedURL ([#14108](https://github.com/GoogleChrome/lighthouse/pull/14108))
* move target manager a driver component ([#14122](https://github.com/GoogleChrome/lighthouse/pull/14122))
* handle sessions inside target-manager ([#14106](https://github.com/GoogleChrome/lighthouse/pull/14106))
* save native getBoundingClientRect to avoid overrides ([#14002](https://github.com/GoogleChrome/lighthouse/pull/14002))
* log `requestedUrl` with unexpected value ([#14010](https://github.com/GoogleChrome/lighthouse/pull/14010))
* make `requestedUrl` optional ([#13816](https://github.com/GoogleChrome/lighthouse/pull/13816))
* fix build-sample-reports ([#13865](https://github.com/GoogleChrome/lighthouse/pull/13865))
* use `mainDocumentUrl` instead of `finalUrl` ([#13793](https://github.com/GoogleChrome/lighthouse/pull/13793))
* remove `context.url` ([#13806](https://github.com/GoogleChrome/lighthouse/pull/13806))
* append sourceURL comment to eval code ([#13754](https://github.com/GoogleChrome/lighthouse/pull/13754))
* expand URL artifact ([#13776](https://github.com/GoogleChrome/lighthouse/pull/13776))
* always use `MainResource` for main document ([#13756](https://github.com/GoogleChrome/lighthouse/pull/13756))
* accessibility: link audits directly to axe docs ([#13876](https://github.com/GoogleChrome/lighthouse/pull/13876))
* build: inline-fs error if file missing, ignorePaths ([#14436](https://github.com/GoogleChrome/lighthouse/pull/14436))
* cdp: update HTTP method for /json/new call ([#14063](https://github.com/GoogleChrome/lighthouse/pull/14063))
* computed-artifacts: convert to named exports ([#14352](https://github.com/GoogleChrome/lighthouse/pull/14352))
* config: use fr config to construct the legacy config ([#13965](https://github.com/GoogleChrome/lighthouse/pull/13965))
* config: make module resolution async ([#13974](https://github.com/GoogleChrome/lighthouse/pull/13974))
* connection: drop /new tab creation fallback ([#14012](https://github.com/GoogleChrome/lighthouse/pull/14012))
* crc: exclude non network nodes from being a leaf ([#9801](https://github.com/GoogleChrome/lighthouse/pull/9801))
* csp-xss: prevent meta warning if header CSPs are secure ([#14490](https://github.com/GoogleChrome/lighthouse/pull/14490))
* refactor audits to use async syntax ([#14542](https://github.com/GoogleChrome/lighthouse/pull/14542))
* cumulative-layout-shift: deprecate m89 check ([#14085](https://github.com/GoogleChrome/lighthouse/pull/14085))
* devtools-log: consolidate implementation into gatherer ([#14080](https://github.com/GoogleChrome/lighthouse/pull/14080))
* devtoolslog: include Target and Runtime domains ([#14101](https://github.com/GoogleChrome/lighthouse/pull/14101))
* doctype: check document.compatMode for quirks mode ([#12978](https://github.com/GoogleChrome/lighthouse/pull/12978))
* doctype: fix mistaken text saying name must be lowercase ([#13888](https://github.com/GoogleChrome/lighthouse/pull/13888))
* dom-size: display metric values as integers ([#14479](https://github.com/GoogleChrome/lighthouse/pull/14479))
* driver: guard verbose logic behind log.isVerbose check ([#14086](https://github.com/GoogleChrome/lighthouse/pull/14086))
* driver: do not use target manager in legacy mode ([#14079](https://github.com/GoogleChrome/lighthouse/pull/14079))
* fetcher: remove iframe fetcher ([#13923](https://github.com/GoogleChrome/lighthouse/pull/13923))
* font-size: use order from protocol as implicit specificity ([#13501](https://github.com/GoogleChrome/lighthouse/pull/13501))
* fps: limit height at max webp size ([#14499](https://github.com/GoogleChrome/lighthouse/pull/14499))
* fps: use observed metrics for screenshot dimensions ([#14418](https://github.com/GoogleChrome/lighthouse/pull/14418))
* fps: make lhId less dependent on chrome internals ([#14272](https://github.com/GoogleChrome/lighthouse/pull/14272))
* full-page-screenshot: use webp instead of jpeg ([#13828](https://github.com/GoogleChrome/lighthouse/pull/13828))
* i18n: delete `i18n.createMessageInstanceIdFn` ([#14251](https://github.com/GoogleChrome/lighthouse/pull/14251))
* image-elements: use execution context isolation ([#14005](https://github.com/GoogleChrome/lighthouse/pull/14005))
* index: update api helpers to use FR ([#14011](https://github.com/GoogleChrome/lighthouse/pull/14011))
* js-usage: remove debugger domain ([#13753](https://github.com/GoogleChrome/lighthouse/pull/13753))
* lantern: add network timings to debug traces ([#14571](https://github.com/GoogleChrome/lighthouse/pull/14571))
* lantern: add comment to about node times being in microseconds ([#14568](https://github.com/GoogleChrome/lighthouse/pull/14568))
* lantern: divide throughput only on network node count ([#14564](https://github.com/GoogleChrome/lighthouse/pull/14564))
* largest-contentful-paint: remove m79 check ([#14082](https://github.com/GoogleChrome/lighthouse/pull/14082))
* layout-shift-elements: add link to documentation ([#14466](https://github.com/GoogleChrome/lighthouse/pull/14466))
* legacy: create legacy directory under core ([#14341](https://github.com/GoogleChrome/lighthouse/pull/14341))
* legacy-javascript: key on script id, not url ([#13746](https://github.com/GoogleChrome/lighthouse/pull/13746))
* listitem: mention li can be contained by a menu ([#13927](https://github.com/GoogleChrome/lighthouse/pull/13927))
* manifest: remove css color verification ([#14447](https://github.com/GoogleChrome/lighthouse/pull/14447))
* network-monitor: resolve server redirects ([#13790](https://github.com/GoogleChrome/lighthouse/pull/13790))
* network-request: use ms instead of seconds ([#14567](https://github.com/GoogleChrome/lighthouse/pull/14567))
* page-dependency-graph: compute using URL artifact ([#13772](https://github.com/GoogleChrome/lighthouse/pull/13772))
* plugins: allow `supportedModes` in category ([#13921](https://github.com/GoogleChrome/lighthouse/pull/13921))
* preload-lcp-image: be specific about when to do this ([#13771](https://github.com/GoogleChrome/lighthouse/pull/13771))
* replay: fix stringify extension ([#14297](https://github.com/GoogleChrome/lighthouse/pull/14297))
* replay: @puppeteer/replay stringify extension ([#14146](https://github.com/GoogleChrome/lighthouse/pull/14146))
* user-flow: passively collect full-page screenshot ([#14656](https://github.com/GoogleChrome/lighthouse/pull/14656))
* network-request: switch to improved timing names ([#14721](https://github.com/GoogleChrome/lighthouse/pull/14721))
* network-request: add rendererStartTime ([#14711](https://github.com/GoogleChrome/lighthouse/pull/14711))
* legacy-javascript: upgrade babel and core-js ([#14712](https://github.com/GoogleChrome/lighthouse/pull/14712))
* fr: preserve scroll position in gatherers ([#14660](https://github.com/GoogleChrome/lighthouse/pull/14660))
* bf-cache: link to chrome developer docs ([#14699](https://github.com/GoogleChrome/lighthouse/pull/14699))
* bf-cache-failures: pause on the temporary page ([#14694](https://github.com/GoogleChrome/lighthouse/pull/14694))
* fix protocol errors from late frame navigation ([#14716](https://github.com/GoogleChrome/lighthouse/pull/14716))
* remove util.cjs ([#14703](https://github.com/GoogleChrome/lighthouse/pull/14703), [#14709](https://github.com/GoogleChrome/lighthouse/pull/14709))
* rename `Config.Json` to `Config` ([#14673](https://github.com/GoogleChrome/lighthouse/pull/14673))
* use `config` to name every config json ([#14649](https://github.com/GoogleChrome/lighthouse/pull/14649))
* legacy: convert some base artifacts to regular gatherers ([#14680](https://github.com/GoogleChrome/lighthouse/pull/14680))
* scoring: update expected perf score for flow fixtures ([#14692](https://github.com/GoogleChrome/lighthouse/pull/14692))
* trace-processing: add backport for pubads ([#14700](https://github.com/GoogleChrome/lighthouse/pull/14700))
* trace-processor: refactor processEvents and frameEvents ([#14287](https://github.com/GoogleChrome/lighthouse/pull/14287))
* script-treemap-data: create node for each inline script ([#13802](https://github.com/GoogleChrome/lighthouse/pull/13802))
* scripts: narrow to only listen to parsed events ([#14120](https://github.com/GoogleChrome/lighthouse/pull/14120))
* scripts: use scriptId as identifier for scripts ([#13704](https://github.com/GoogleChrome/lighthouse/pull/13704))
* smoke: replace --invert-match cli option with --ignore-exclusions ([#14332](https://github.com/GoogleChrome/lighthouse/pull/14332))
* smoke: support a per-runner test exclusion list ([#14316](https://github.com/GoogleChrome/lighthouse/pull/14316))
* source-maps: throw explicit error when map is missing required fields ([#14060](https://github.com/GoogleChrome/lighthouse/pull/14060))
* target-manager: only listen to LH sessions ([#14385](https://github.com/GoogleChrome/lighthouse/pull/14385))
* types: use union of `puppeteer` and `puppeteer-core` ([#14435](https://github.com/GoogleChrome/lighthouse/pull/14435))
* user-flow: update UIString comments ([#14458](https://github.com/GoogleChrome/lighthouse/pull/14458))
* user-flow: add base flags option ([#14459](https://github.com/GoogleChrome/lighthouse/pull/14459))
* user-flow: cleanup types ([#14442](https://github.com/GoogleChrome/lighthouse/pull/14442))
* user-flow: i18n default names ([#14455](https://github.com/GoogleChrome/lighthouse/pull/14455))
* user-flow: start/end navigation functions ([#13966](https://github.com/GoogleChrome/lighthouse/pull/13966))
* uses-responsive-images: higher threshold with breakpoints ([#13853](https://github.com/GoogleChrome/lighthouse/pull/13853))
* viewport: fix tap delay link ([#14460](https://github.com/GoogleChrome/lighthouse/pull/14460))
* page-functions: remove all `*String` exports ([#14374](https://github.com/GoogleChrome/lighthouse/pull/14374))
* internalize resolved configs ([#14589](https://github.com/GoogleChrome/lighthouse/pull/14589))
* asset-saver: save flow artifacts in separate files ([#14599](https://github.com/GoogleChrome/lighthouse/pull/14599))
* replace `Page.getResourceTree` with `Page.getFrameTree` ([#14663](https://github.com/GoogleChrome/lighthouse/pull/14663))
* js-usage: ignore __puppeteer_evaluation_script__ ([#13952](https://github.com/GoogleChrome/lighthouse/pull/13952))
* use main-frame LCP trace element ([#14760](https://github.com/GoogleChrome/lighthouse/pull/14760))
* full-page-screenshot: get screenshot, nodes concurrently ([#14763](https://github.com/GoogleChrome/lighthouse/pull/14763))
* config: prevent custom gatherer interference ([#14756](https://github.com/GoogleChrome/lighthouse/pull/14756))
* valid-source-maps: validate url in first-party check ([#14758](https://github.com/GoogleChrome/lighthouse/pull/14758))
* disconnect Puppeteer when started by Lighthouse ([#14770](https://github.com/GoogleChrome/lighthouse/pull/14770))
* use `resolvedConfig` to name every resolved config ([#14600](https://github.com/GoogleChrome/lighthouse/pull/14600))
* rename resolved config types ([#14647](https://github.com/GoogleChrome/lighthouse/pull/14647))
* remove trace-of-tab references ([#14590](https://github.com/GoogleChrome/lighthouse/pull/14590))
* disable bf-cache in lr/psi ([#14774](https://github.com/GoogleChrome/lighthouse/pull/14774))

## User Flows

* [BREAKING] update flow API for 10.0 ([#14388](https://github.com/GoogleChrome/lighthouse/pull/14388))
* [BREAKING] replace `configContext` with `flags` ([#14050](https://github.com/GoogleChrome/lighthouse/pull/14050))
* add page to context ([#14359](https://github.com/GoogleChrome/lighthouse/pull/14359))
* always run NetworkUserAgent gatherer ([#14392](https://github.com/GoogleChrome/lighthouse/pull/14392))
* index test parity ([#13867](https://github.com/GoogleChrome/lighthouse/pull/13867))
* do not monkey patch puppeteer session.emit ([#14087](https://github.com/GoogleChrome/lighthouse/pull/14087))
* minor renames: cdpSession, defaultSession, requestfinished ([#14097](https://github.com/GoogleChrome/lighthouse/pull/14097))

## CLI

* [BREAKING] use fraggle rock (user flow) runner by default, deprecate legacy navigation runner ([#13860](https://github.com/GoogleChrome/lighthouse/pull/13860))
* [BREAKING] remove --print-config ([#14585](https://github.com/GoogleChrome/lighthouse/pull/14585))
* error early if --output-path is invalid ([#14367](https://github.com/GoogleChrome/lighthouse/pull/14367))
* throw error if running x64 node on mac arm64 ([#14288](https://github.com/GoogleChrome/lighthouse/pull/14288))

## Report

* thumbnails: increase res and display, reduce number ([#14679](https://github.com/GoogleChrome/lighthouse/pull/14679))
* use entity classification to filter third-parties ([#14697](https://github.com/GoogleChrome/lighthouse/pull/14697))
* fix compat for older lighthouse reports ([#14617](https://github.com/GoogleChrome/lighthouse/pull/14617))
* sticky table headers ([#14508](https://github.com/GoogleChrome/lighthouse/pull/14508), [#14748](https://github.com/GoogleChrome/lighthouse/pull/14748), [#14766](https://github.com/GoogleChrome/lighthouse/pull/14766))
* reuse numberFormatters for ~50% performance gains ([#14493](https://github.com/GoogleChrome/lighthouse/pull/14493))
* expand on "learn more" links ([#14091](https://github.com/GoogleChrome/lighthouse/pull/14091))
* prevent opportunity savings from wrapping ([#14619](https://github.com/GoogleChrome/lighthouse/pull/14619))
* screen emulation and dpr in meta tooltip ([#14515](https://github.com/GoogleChrome/lighthouse/pull/14515))
* use narrow formatting for opportunity units ([#14723](https://github.com/GoogleChrome/lighthouse/pull/14723))
* filter `lcp-lazy-loaded` with LCP audits ([#14724](https://github.com/GoogleChrome/lighthouse/pull/14724))
* reduce stuttery feel of gauge animation ([#14513](https://github.com/GoogleChrome/lighthouse/pull/14513))
* limit screenshot thumbnail height ([#14511](https://github.com/GoogleChrome/lighthouse/pull/14511))
* use `focus-visible` for the three-dot menu ([#14497](https://github.com/GoogleChrome/lighthouse/pull/14497))
* link accessibility audits to new docs ([#14400](https://github.com/GoogleChrome/lighthouse/pull/14400))
* remove extra space from screenshot preview ([#14424](https://github.com/GoogleChrome/lighthouse/pull/14424))
* set minimum width of element screenshot preview ([#13856](https://github.com/GoogleChrome/lighthouse/pull/13856))
* prevent breaking words in opportunity text ([#14329](https://github.com/GoogleChrome/lighthouse/pull/14329))
* handle non-numeric numericValues in calc link ([#10880](https://github.com/GoogleChrome/lighthouse/pull/10880))
* avoid css issue with border when hoisting meta block ([#13877](https://github.com/GoogleChrome/lighthouse/pull/13877))
* dom: support code snippets within markdown links ([#14121](https://github.com/GoogleChrome/lighthouse/pull/14121))
* flow: fix ui strings not being bundled ([#14427](https://github.com/GoogleChrome/lighthouse/pull/14427))
* fix wording when screenEmulation disabled ([#14587](https://github.com/GoogleChrome/lighthouse/pull/14587))
* specify in tooltip that cpu/memory power is unthrottled ([#14704](https://github.com/GoogleChrome/lighthouse/pull/14704))
* devtools: fix wrong emulation string in meta block ([#14672](https://github.com/GoogleChrome/lighthouse/pull/14672))
* rename i18n to i18n-formatter, move strings to Util ([#13933](https://github.com/GoogleChrome/lighthouse/pull/13933))
* remove eslint --fix step in report generation ([#13864](https://github.com/GoogleChrome/lighthouse/pull/13864))
* consolidate table headers ([#14315](https://github.com/GoogleChrome/lighthouse/pull/14315))

## Deps

* puppeteer@19.6.0 ([#14244](https://github.com/GoogleChrome/lighthouse/pull/14244), [#14706](https://github.com/GoogleChrome/lighthouse/pull/14706))
* lighthouse-stack-packs@1.9.0 ([#14713](https://github.com/GoogleChrome/lighthouse/pull/14713))
* chrome-launcher@0.15.1 ([#14070](https://github.com/GoogleChrome/lighthouse/pull/14070))
* axe-core@4.6.3 ([#14690](https://github.com/GoogleChrome/lighthouse/pull/14690))
* third-party-web@0.20.2 ([#14546](https://github.com/GoogleChrome/lighthouse/pull/14546))
* latest chrome-devtools-frontend ([#14606](https://github.com/GoogleChrome/lighthouse/pull/14606))
* switch third-party-web dataset to entities-nostats subset ([#14548](https://github.com/GoogleChrome/lighthouse/pull/14548))
* typescript@4.9.4 ([#14646](https://github.com/GoogleChrome/lighthouse/pull/14646), [#14058](https://github.com/GoogleChrome/lighthouse/pull/14058))
* update typescript-eslint for tsc 4.7 ([#14111](https://github.com/GoogleChrome/lighthouse/pull/14111))
* jpeg-js@0.4.4 ([#14221](https://github.com/GoogleChrome/lighthouse/pull/14221))
* latest CDT packages ([#14293](https://github.com/GoogleChrome/lighthouse/pull/14293))
* bump node-fetch from 2.6.1 to 2.6.7 ([#13759](https://github.com/GoogleChrome/lighthouse/pull/13759))
* devtools-protocol@0.0.995287 ([#13902](https://github.com/GoogleChrome/lighthouse/pull/13902))
* update quibble fork to work with new loader api ([#14366](https://github.com/GoogleChrome/lighthouse/pull/14366))
* re-sync yarn.lock file ([#14403](https://github.com/GoogleChrome/lighthouse/pull/14403))

## Clients

* viewer: ga event for flow-report ([#13932](https://github.com/GoogleChrome/lighthouse/pull/13932))
* lr: expose computeBenchmarkIndex ([#14582](https://github.com/GoogleChrome/lighthouse/pull/14582))
* lr: export primary api, presets from lr bundle ([#14425](https://github.com/GoogleChrome/lighthouse/pull/14425))
* lr: add FR navigation support ([#13901](https://github.com/GoogleChrome/lighthouse/pull/13901))
* lr: run benchmark repeatedly given special query parameter ([#14075](https://github.com/GoogleChrome/lighthouse/pull/14075))
* psi: expose hasLocale in bundle types ([#14325](https://github.com/GoogleChrome/lighthouse/pull/14325))

## I18n

* localize units in report formatter ([#13830](https://github.com/GoogleChrome/lighthouse/pull/13830))
* fix broken description in installable-manifest audit ([#14444](https://github.com/GoogleChrome/lighthouse/pull/14444))
* update comments to match expanded "learn more" links ([#14446](https://github.com/GoogleChrome/lighthouse/pull/14446))
* remove default granularity values from formatter ([#13839](https://github.com/GoogleChrome/lighthouse/pull/13839))
* replace placeholder using replacer callback ([#14109](https://github.com/GoogleChrome/lighthouse/pull/14109))
* fix i18n filename path on windows ([#14220](https://github.com/GoogleChrome/lighthouse/pull/14220))
* fix collect-strings on windows with pathToFileURL ([#14201](https://github.com/GoogleChrome/lighthouse/pull/14201))
* handle string placeholder collisions ([#14432](https://github.com/GoogleChrome/lighthouse/pull/14432))
* reduce unnecessary message formats ([#14030](https://github.com/GoogleChrome/lighthouse/pull/14030))
* import strings ([#14768](https://github.com/GoogleChrome/lighthouse/pull/14768))

## Docs

* update web.dev links to new developer.chrome.com home ([#14581](https://github.com/GoogleChrome/lighthouse/pull/14581))
* fix multiline xvfb-run command ([#14471](https://github.com/GoogleChrome/lighthouse/pull/14471))
* remove gulp recipe ([#14183](https://github.com/GoogleChrome/lighthouse/pull/14183))
* remove git.io shortlinks ([#13911](https://github.com/GoogleChrome/lighthouse/pull/13911))
* fix some broken links ([#13872](https://github.com/GoogleChrome/lighthouse/pull/13872))
* architecture: update to reflect FR changes ([#14017](https://github.com/GoogleChrome/lighthouse/pull/14017))
* budgets: add example using config ([#14278](https://github.com/GoogleChrome/lighthouse/pull/14278))
* config: revert #14321 ([#14323](https://github.com/GoogleChrome/lighthouse/pull/14323))
* config: update to reflect changes in FR ([#14321](https://github.com/GoogleChrome/lighthouse/pull/14321))
* proto: update protobuf installation guidance ([#14558](https://github.com/GoogleChrome/lighthouse/pull/14558))
* readme: drop dead and unmaintained services/projects ([#14338](https://github.com/GoogleChrome/lighthouse/pull/14338))
* readme: update devtools screenshot, better alt ([#14563](https://github.com/GoogleChrome/lighthouse/pull/14563))
* readme: add Auditzy and Lighthouse Metrics to services list ([#13976](https://github.com/GoogleChrome/lighthouse/pull/13976))
* releasing: dependencies that should always be up to date ([#14156](https://github.com/GoogleChrome/lighthouse/pull/14156))
* user-flows: fix the order of the mode thumbnail images ([#14219](https://github.com/GoogleChrome/lighthouse/pull/14219))
* user-flows: refactor document ([#14021](https://github.com/GoogleChrome/lighthouse/pull/14021))
* user-flows: add instructions for DevTools ([#14009](https://github.com/GoogleChrome/lighthouse/pull/14009))
* user-flows: update api usage ([#13826](https://github.com/GoogleChrome/lighthouse/pull/13826))
* update user-flow.md to reflect current release ([#14604](https://github.com/GoogleChrome/lighthouse/pull/14604))
* config: add plugins property ([#14645](https://github.com/GoogleChrome/lighthouse/pull/14645))
* fix outdated code and command line in hacking tips ([#14720](https://github.com/GoogleChrome/lighthouse/pull/14720))
* changelog: add 9.6.x release notes ([f03850a](https://github.com/GoogleChrome/lighthouse/commit/f03850a))
* update custom gatherer recipe for 10.0 ([#14765](https://github.com/GoogleChrome/lighthouse/pull/14765))
* reintroduce changes to flows for 10.0 ([#14710](https://github.com/GoogleChrome/lighthouse/pull/14710))
* update docs/readme.md for 10.0 ([#14457](https://github.com/GoogleChrome/lighthouse/pull/14457))
* update puppeteer auth example for 10.0 ([#14195](https://github.com/GoogleChrome/lighthouse/pull/14195))
* config: update to reflect changes in FR ([#14324](https://github.com/GoogleChrome/lighthouse/pull/14324))
* plugins: update to reflect changes in 10.0 ([#14322](https://github.com/GoogleChrome/lighthouse/pull/14322))
* puppeteer: update to reflect FR changes ([#14319](https://github.com/GoogleChrome/lighthouse/pull/14319))
* recipes: update custom-gatherer-puppeteer to use FR ([#13940](https://github.com/GoogleChrome/lighthouse/pull/13940))
* user-flows: use new api location ([#14533](https://github.com/GoogleChrome/lighthouse/pull/14533))

## Tests

* fix timings in update-flow-fixtures.js ([#14591](https://github.com/GoogleChrome/lighthouse/pull/14591))
* fix mocha test runner and mocks on windows ([#14202](https://github.com/GoogleChrome/lighthouse/pull/14202))
* upgrade protobuf test to use python 3 ([#14557](https://github.com/GoogleChrome/lighthouse/pull/14557))
* dynamically import all modules when using mocks ([#14468](https://github.com/GoogleChrome/lighthouse/pull/14468))
* fix node version in weekly cron ([#14534](https://github.com/GoogleChrome/lighthouse/pull/14534))
* fix mocha test paths for windows ([#14464](https://github.com/GoogleChrome/lighthouse/pull/14464))
* assert to assert/strict ([#14412](https://github.com/GoogleChrome/lighthouse/pull/14412))
* add missing await on promise assertions ([#14437](https://github.com/GoogleChrome/lighthouse/pull/14437))
* static-server can continue if already running ([#14307](https://github.com/GoogleChrome/lighthouse/pull/14307))
* reformat trace fixtures ([#14279](https://github.com/GoogleChrome/lighthouse/pull/14279))
* use workers, Mocha node api instead of calling the CLI ([#14215](https://github.com/GoogleChrome/lighthouse/pull/14215))
* sync BUILD.gn files for devtools e2e tests ([#14184](https://github.com/GoogleChrome/lighthouse/pull/14184))
* move readJson from root.js to test-utils.js ([#14175](https://github.com/GoogleChrome/lighthouse/pull/14175))
* replace jest with mocha ([#14054](https://github.com/GoogleChrome/lighthouse/pull/14054))
* add devtools e2e test runner ([#14110](https://github.com/GoogleChrome/lighthouse/pull/14110))
* disable `perf-diagnostics-third-party` for FR ([#14092](https://github.com/GoogleChrome/lighthouse/pull/14092))
* use readJson instead of imports for json ([#14020](https://github.com/GoogleChrome/lighthouse/pull/14020))
* move webtest expectations to platform/generic ([#13997](https://github.com/GoogleChrome/lighthouse/pull/13997))
* add eslintrc jest env and remove all the env comments ([#13954](https://github.com/GoogleChrome/lighthouse/pull/13954))
* fix unconverted test ([#13959](https://github.com/GoogleChrome/lighthouse/pull/13959))
* replace $0 in cli-flag snapshots ([#13922](https://github.com/GoogleChrome/lighthouse/pull/13922))
* add temp fix for failing deprecations smoke test ([#13930](https://github.com/GoogleChrome/lighthouse/pull/13930))
* default to chrome-launcher path ([#13912](https://github.com/GoogleChrome/lighthouse/pull/13912))
* assert what axe checks matches our a11y audits ([#12699](https://github.com/GoogleChrome/lighthouse/pull/12699))
* use cache instead of artifacts for devtools build ([#13840](https://github.com/GoogleChrome/lighthouse/pull/13840))
* fix flaky isPositionFixed check in oopif-scripts ([#13855](https://github.com/GoogleChrome/lighthouse/pull/13855))
* temporarily disable oopif-scripts smoke for devtools ([#13859](https://github.com/GoogleChrome/lighthouse/pull/13859))
* fix invalid artifact name for devtools smoke failures ([#13841](https://github.com/GoogleChrome/lighthouse/pull/13841))
* fix smoke shard total in CI ([#13844](https://github.com/GoogleChrome/lighthouse/pull/13844))
* upload smoke failures for devtools ([#13794](https://github.com/GoogleChrome/lighthouse/pull/13794))
* improve logging for devtools smoke runner ([#13781](https://github.com/GoogleChrome/lighthouse/pull/13781))
* increase smoke shards from 2 to 3 ([#13792](https://github.com/GoogleChrome/lighthouse/pull/13792))
* clean devtools repo in CI ([#13758](https://github.com/GoogleChrome/lighthouse/pull/13758))
* asset-saver: use .tmp instead of pwd for temp file ([#14140](https://github.com/GoogleChrome/lighthouse/pull/14140))
* ci: force color output in CI ([#14580](https://github.com/GoogleChrome/lighthouse/pull/14580))
* ci: add node 18 to test matrix ([#13874](https://github.com/GoogleChrome/lighthouse/pull/13874))
* ci: shard all smoke tests ([#13968](https://github.com/GoogleChrome/lighthouse/pull/13968))
* ci: sample flow result check ([#13728](https://github.com/GoogleChrome/lighthouse/pull/13728))
* config-helpers: restore process.cwd after mocking ([#14036](https://github.com/GoogleChrome/lighthouse/pull/14036))
* crq: call setExtrasFn before using the urls ([#13910](https://github.com/GoogleChrome/lighthouse/pull/13910))
* dbw: ignore `webkitStorageInfo` deprecation in m110 ([#14541](https://github.com/GoogleChrome/lighthouse/pull/14541))
* devtools: sync e2e ([#14577](https://github.com/GoogleChrome/lighthouse/pull/14577))
* devtools: sync e2e ([#14544](https://github.com/GoogleChrome/lighthouse/pull/14544))
* devtools: sync e2e tests ([#14451](https://github.com/GoogleChrome/lighthouse/pull/14451))
* devtools: ensure device emulation is ready ([#14431](https://github.com/GoogleChrome/lighthouse/pull/14431))
* devtools: sync e2e tests ([#14426](https://github.com/GoogleChrome/lighthouse/pull/14426))
* devtools: sync e2e ([#14389](https://github.com/GoogleChrome/lighthouse/pull/14389))
* devtools: sync e2e tests ([#14373](https://github.com/GoogleChrome/lighthouse/pull/14373))
* devtools: sync e2e tests ([#14365](https://github.com/GoogleChrome/lighthouse/pull/14365))
* devtools: add i18n to e2e navigation test ([#14294](https://github.com/GoogleChrome/lighthouse/pull/14294))
* devtools: inject custom config directly ([#14285](https://github.com/GoogleChrome/lighthouse/pull/14285))
* devtools: sync e2e tests ([#14236](https://github.com/GoogleChrome/lighthouse/pull/14236))
* devtools: use linux for CI ([#14199](https://github.com/GoogleChrome/lighthouse/pull/14199))
* devtools: remove webtests, sync e2e tests, use release mode ([#14163](https://github.com/GoogleChrome/lighthouse/pull/14163))
* devtools: extend yarn timeout ([#13878](https://github.com/GoogleChrome/lighthouse/pull/13878))
* devtools: reduce concurrent job number ([#13797](https://github.com/GoogleChrome/lighthouse/pull/13797))
* devtools: bump cache ([#13755](https://github.com/GoogleChrome/lighthouse/pull/13755))
* devtools: support dbw smoke ([#14616](https://github.com/GoogleChrome/lighthouse/pull/14616))
* devtools: use correct build folder for e2e tests ([#14613](https://github.com/GoogleChrome/lighthouse/pull/14613))
* docs: clear problematic cache ([#13941](https://github.com/GoogleChrome/lighthouse/pull/13941))
* eslint: add import/order rule for core tests ([#13955](https://github.com/GoogleChrome/lighthouse/pull/13955))
* fr: snapshot audit id lists in api test ([#13994](https://github.com/GoogleChrome/lighthouse/pull/13994))
* lantern: correctly clear old trace data ([#13809](https://github.com/GoogleChrome/lighthouse/pull/13809))
* smoke: check runner result is sensible before using ([#14343](https://github.com/GoogleChrome/lighthouse/pull/14343))
* smoke: check lhr.environment exists in version check ([#14320](https://github.com/GoogleChrome/lighthouse/pull/14320))
* smoke: remove external domains from perf-preload ([#14289](https://github.com/GoogleChrome/lighthouse/pull/14289))
* smoke: check objects against a subset of keys ([#14270](https://github.com/GoogleChrome/lighthouse/pull/14270))
* smoke: enable more DevTools tests ([#14224](https://github.com/GoogleChrome/lighthouse/pull/14224))
* smoke: test fr navigations in devtools ([#14217](https://github.com/GoogleChrome/lighthouse/pull/14217))
* smoke: use DevTools runner through node directly ([#14205](https://github.com/GoogleChrome/lighthouse/pull/14205))
* smoke: use fraggle rock as the default ([#13951](https://github.com/GoogleChrome/lighthouse/pull/13951))
* smoke: reenable oopif smokes with ToT ([#14153](https://github.com/GoogleChrome/lighthouse/pull/14153))
* smoke: disable `oopif-scripts` in FR ([#14150](https://github.com/GoogleChrome/lighthouse/pull/14150))
* smoke: disable `oopif-requests` ([#14148](https://github.com/GoogleChrome/lighthouse/pull/14148))
* smoke: make oopif-requests assertions more specific ([#14100](https://github.com/GoogleChrome/lighthouse/pull/14100))
* smoke: print multiple differences ([#14141](https://github.com/GoogleChrome/lighthouse/pull/14141))
* smoke: add tests for report-assert.js ([#14138](https://github.com/GoogleChrome/lighthouse/pull/14138))
* smoke: use major milestone ([#14104](https://github.com/GoogleChrome/lighthouse/pull/14104))
* smoke: increase windows retries ([#14022](https://github.com/GoogleChrome/lighthouse/pull/14022))
* smoke: run bundle smokes in a worker ([#13947](https://github.com/GoogleChrome/lighthouse/pull/13947))
* smoke: realign byte ranges ([#13920](https://github.com/GoogleChrome/lighthouse/pull/13920))
* smoke: disable `lantern-idle-callback-short` ([#14670](https://github.com/GoogleChrome/lighthouse/pull/14670))
* smoke: disable metrics-tricky-tti for M112 ([#14762](https://github.com/GoogleChrome/lighthouse/pull/14762))
* topbar: replace module mock with dependency injection ([#14057](https://github.com/GoogleChrome/lighthouse/pull/14057))
* unit: fix node to 16.16 ([#14333](https://github.com/GoogleChrome/lighthouse/pull/14333))
* rewrite fake timer usage to reduce isolation ([#14595](https://github.com/GoogleChrome/lighthouse/pull/14595))
* add computed/metrics/interactive-test.js to tsconfig ([#13071](https://github.com/GoogleChrome/lighthouse/pull/13071))
* better times for generated network requests ([#14714](https://github.com/GoogleChrome/lighthouse/pull/14714))

## Misc

* [BREAKING] rename LHError to LighthouseError ([#14173](https://github.com/GoogleChrome/lighthouse/pull/14173))
* inp: switch proccessing "delay" to "time" ([#13999](https://github.com/GoogleChrome/lighthouse/pull/13999))
* document where network timings come from ([#14227](https://github.com/GoogleChrome/lighthouse/pull/14227))
* split lhr compat code to lib/lighthouse-compatibility.js ([#14701](https://github.com/GoogleChrome/lighthouse/pull/14701))
* update tsconfig.json ([e2f7e75](https://github.com/GoogleChrome/lighthouse/commit/e2f7e75))
* fix broken link for PWA checklist ([#14240](https://github.com/GoogleChrome/lighthouse/pull/14240))
* include used files in flow-report tsconfig ([#14174](https://github.com/GoogleChrome/lighthouse/pull/14174))
* only run scheduled publish job if there are new commits ([#14145](https://github.com/GoogleChrome/lighthouse/pull/14145))
* prevent forks from running cron job ([#13973](https://github.com/GoogleChrome/lighthouse/pull/13973))
* use top-level await ([#13975](https://github.com/GoogleChrome/lighthouse/pull/13975))
* remove `createCommonjsRefs` ([#14004](https://github.com/GoogleChrome/lighthouse/pull/14004))
* shim fs out of lightrider report generator bundle ([#14098](https://github.com/GoogleChrome/lighthouse/pull/14098))
* replace appendChild with append ([#13995](https://github.com/GoogleChrome/lighthouse/pull/13995))
* also update flow json in update:sample-json script ([#13936](https://github.com/GoogleChrome/lighthouse/pull/13936))
* generate snapshot/timespan reports from sample flow result ([#13937](https://github.com/GoogleChrome/lighthouse/pull/13937))
* use a unique local port for the treemap ([#14308](https://github.com/GoogleChrome/lighthouse/pull/14308))
* set encoding on streams for unicode correctness ([#13780](https://github.com/GoogleChrome/lighthouse/pull/13780))
* lantern-trace-saver: fix request finishTime ([#14198](https://github.com/GoogleChrome/lighthouse/pull/14198))
* build: remove lighthouse shim no longer necessary for plugins ([#14538](https://github.com/GoogleChrome/lighthouse/pull/14538))
* build: remove non-functional package.json shim ([#14536](https://github.com/GoogleChrome/lighthouse/pull/14536))
* build: extract bfcache strings from devtools ([#14452](https://github.com/GoogleChrome/lighthouse/pull/14452))
* build: use git-describe for build bundle version header ([#14347](https://github.com/GoogleChrome/lighthouse/pull/14347))
* build: fix smokerider bundles ([#14267](https://github.com/GoogleChrome/lighthouse/pull/14267))
* build: shim unneeded deps in lr report generator ([#14773](https://github.com/GoogleChrome/lighthouse/pull/14773))
* change default build folder for devtools gn ([#14492](https://github.com/GoogleChrome/lighthouse/pull/14492))
* fix broken links in changelog ([#14130](https://github.com/GoogleChrome/lighthouse/pull/14130))
* mark build folder as not generated for GitHub UI ([#14192](https://github.com/GoogleChrome/lighthouse/pull/14192))
* rename eslint config files to .cjs ([#14172](https://github.com/GoogleChrome/lighthouse/pull/14172))
* restore expected newline padding around imports ([#13998](https://github.com/GoogleChrome/lighthouse/pull/13998))
* fix gcp-collection scripts ([#14625](https://github.com/GoogleChrome/lighthouse/pull/14625))
* update vercel deployment config ([#14588](https://github.com/GoogleChrome/lighthouse/pull/14588))
* assets: update logo ([#13919](https://github.com/GoogleChrome/lighthouse/pull/13919))
* mark dependencies of entity classification computed artifact ([#14732](https://github.com/GoogleChrome/lighthouse/pull/14732))
* fix issues found in some strings from localizers ([#14740](https://github.com/GoogleChrome/lighthouse/pull/14740))
* exclude core/util.cjs from code coverage ([#14688](https://github.com/GoogleChrome/lighthouse/pull/14688))
* github: mark styles.css as not generated ([#14754](https://github.com/GoogleChrome/lighthouse/pull/14754))
* allow multiple nightlies to be published in a day ([#14767](https://github.com/GoogleChrome/lighthouse/pull/14767))
* lint: enable no-conditional-assignment rule ([#14757](https://github.com/GoogleChrome/lighthouse/pull/14757))
* add brendan back to triage rotation ([#13838](https://github.com/GoogleChrome/lighthouse/pull/13838))


# Older Changelog

See the [older changelog](changelog-pre10.md) for pre-10.0 revisions.
