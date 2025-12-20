<a name="6.0.0"></a>
# 6.0.0 (2020-05-19)
[Raw commit changelog](https://github.com/GoogleChrome/lighthouse/compare/v5.6.0...v6.0.0)

We expect this release to ship in the DevTools of Chrome 84.

## Notable changes

So many! See the [**Lighthouse 6.0: What's New** blog post](https://web.dev/lighthouse-whats-new-6.0/) for an in-depth look.

## 🆕 New audits

* [Largest Contentful Paint](https://web.dev/lighthouse-largest-contentful-paint/) (LCP) is a new metric that measures the time from navigation until the largest content element in the viewport is rendered ([#9905](https://github.com/GoogleChrome/lighthouse/pull/9905), [#10213](https://github.com/GoogleChrome/lighthouse/pull/10213), [#10452](https://github.com/GoogleChrome/lighthouse/pull/10452), [#10529](https://github.com/GoogleChrome/lighthouse/pull/10529)).
   - `largest-contentful-paint-element` is a companion audit that gives information about which element triggered the LCP ([#10517](https://github.com/GoogleChrome/lighthouse/pull/10517), [#10713](https://github.com/GoogleChrome/lighthouse/pull/10713)).
* [Cumulative Layout Shift](https://web.dev/cls/) (CLS) is a new metric that measures the amount of unexpected movement of content as a page loads ([#9037](https://github.com/GoogleChrome/lighthouse/pull/9037), [#10427](https://github.com/GoogleChrome/lighthouse/pull/10427), [#10495](https://github.com/GoogleChrome/lighthouse/pull/10495), [#10570](https://github.com/GoogleChrome/lighthouse/pull/10570), [#10728](https://github.com/GoogleChrome/lighthouse/pull/10728)).
   - `layout-shift-elements` is another companion diagnostic that gives information about the elements that shifted as the page loaded ([#10702](https://github.com/GoogleChrome/lighthouse/pull/10702)).
* `unused-javascript` is an audit that has been kicking around for some time but is only now turned on by default. It accounts for what JavaScript was loaded but never executed during page load and estimates the load time that could be saved via code splitting, dead code elimination, or judicious use of the delete key ([#9854](https://github.com/GoogleChrome/lighthouse/pull/9854)).
* A PWA [`maskable-icon`](https://web.dev/maskable-icon-audit/) just looks better on your homescreen, so this new audit encourages you to have at least one available in your manifest ([#10370](https://github.com/GoogleChrome/lighthouse/pull/10370)).
* `timing-budget` expands [budget assertions](https://github.com/GoogleChrome/lighthouse/blob/7e4fa55/docs/performance-budgets.md) to now be settable on all the performance metrics ([#9901](https://github.com/GoogleChrome/lighthouse/pull/9901), [#9925](https://github.com/GoogleChrome/lighthouse/pull/9925)).
* The new [`charset`](https://web.dev/charset) audit ensures a proper character encoding for page content ([#10284](https://github.com/GoogleChrome/lighthouse/pull/10284), [#10389](https://github.com/GoogleChrome/lighthouse/pull/10389), [#10689](https://github.com/GoogleChrome/lighthouse/pull/10689)).
* `image-size-responsive` checks that images have an aspect ratio and resolution that match well with how they are displayed on a page ([#10460](https://github.com/GoogleChrome/lighthouse/pull/10460)).
* Updating to the latest version of `axe-core` has unlocked a number of new accessibility audits: [`aria-hidden-body`](https://web.dev/aria-hidden-body/), [`aria-hidden-focus`](https://web.dev/aria-hidden-focus/), [`aria-input-field-name`](https://web.dev/aria-input-field-name/), [`aria-toggle-field-name`](https://web.dev/aria-toggle-field-name/), [`duplicate-id-active`](https://web.dev/duplicate-id-active/), [`duplicate-id-aria`](https://web.dev/duplicate-id-aria/), [`form-field-multiple-labels`](https://web.dev/form-field-multiple-labels/), [`heading-order`](https://web.dev/heading-order/) ([#9798](https://github.com/GoogleChrome/lighthouse/pull/9798)).

## ⚗️ Experimental audits

These audits are not yet part of the default Lighthouse experience, but they will provide performance advice based on analysis of a page's JavaScript bundles. They can be tested today on the command line with the `--preset=experimental` flag.

* `legacy-javascript` rummages through your bundles looking for polyfills and bundler transforms that aren't necessary or are outdated ([#10303](https://github.com/GoogleChrome/lighthouse/pull/10303), [#10568](https://github.com/GoogleChrome/lighthouse/pull/10568), [#10564](https://github.com/GoogleChrome/lighthouse/pull/10564)).
* `duplicated-javascript` also takes a dive through a page's JavaScript looking for code that has ended up duplicated within bundles or across multiple bundles ([#10314](https://github.com/GoogleChrome/lighthouse/pull/10314)).
* `unused-javascript` now runs by default (as mentioned above), but when run under `experimental`, the audit can use source maps to show what _original_ source code was never run and could be postponed or eliminated ([#10090](https://github.com/GoogleChrome/lighthouse/pull/10090)).

## New contributors!

Thanks to @TGiles, @roelfjan, @chruxin, @warrengm, @alexgreencode, @mikedijkstra, @egsweeny, @johnsampson, @jazyan, @b3none, @mattjared, @Malvoz, @Beytoven, @Munter, @jayaddison, @msomji, @piotrzarycki, @awdltd, @mathiasbynens, @Carr1005, @staabm, @SphinxKnight, @sk-, @AndreasKubasa, @jantimon, @kmanuel, @Kikobeats, @RolandBurrows, @nxqamar, @catalinred, and @baseeee for their first contributions! So many!

## 💥 Breaking changes

* Performance metric scores [have been reweighted](https://web.dev/performance-scoring/) to better reflect a user's loading experience ([#9949](https://github.com/GoogleChrome/lighthouse/pull/9949)).
* Metric score curves have been updated when running a desktop Lighthouse test to account for the faster connection and CPU ([#9911](https://github.com/GoogleChrome/lighthouse/pull/9911), [#10756](https://github.com/GoogleChrome/lighthouse/pull/10756)).
* `frameNavigated` events are now used to track redirects, which means JS redirects are now accounted for when determining the run's `finalUrl` ([#10339](https://github.com/GoogleChrome/lighthouse/pull/10339)).
* The emulated mobile device has moved from the Nexus 5x to the Moto G4 (but the existing DPR has been left unchanged) ([#10191](https://github.com/GoogleChrome/lighthouse/pull/10191), [#10749](https://github.com/GoogleChrome/lighthouse/pull/10749)).
* The `mixed-content` preset has been removed as it was not widely used and takes too long to be added to the default Lighthouse experience ([#10159](https://github.com/GoogleChrome/lighthouse/pull/10159), [#10750](https://github.com/GoogleChrome/lighthouse/pull/10750)).
* The `full` preset has been renamed `experimental` to signify that the code there may not be ready for running by default ([#9930](https://github.com/GoogleChrome/lighthouse/pull/9930), [#10311](https://github.com/GoogleChrome/lighthouse/pull/10311), [#10333](https://github.com/GoogleChrome/lighthouse/pull/10333), [#10585](https://github.com/GoogleChrome/lighthouse/pull/10585)).
* The emulated Chrome UA string has been updated to Chrome 80 ([#9967](https://github.com/GoogleChrome/lighthouse/pull/9967)).
* `installable-manifest`: icons in the Web app manifest must be fetchable to be considered installable ([#10168](https://github.com/GoogleChrome/lighthouse/pull/10168), [#10320](https://github.com/GoogleChrome/lighthouse/pull/10320))

## 🤖💥 Breaking Changes for programmatic users

These changes are unlikely to affect end users, but may be important if you are writing custom configs, plugins, or processing the Lighthouse JSON output.

* `LH.Audit.Context` passed into audits is now treated as immutable. If code previously pushed to `context.LighthouseRunWarnings` to get a top-level warning, it should now pass that back in `runWarnings` on the audit's product ([#10555](https://github.com/GoogleChrome/lighthouse/pull/10555)).
* `Audit.computeLogNormalScore` has been redefined to specify log-normal curves with median and p10 points (dropping the "point of diminishing returns"). Existing audits have been moved to this new definition so that no score changes should occur ([#10715](https://github.com/GoogleChrome/lighthouse/pull/10715)).
* A `loadFailureMode` setting has been added to `Config` passes to control behavior in case of page load failure. Previously this was implicitly controlled (e.g. no offline page available did not cause an error) ([#9987](https://github.com/GoogleChrome/lighthouse/pull/9987))
* `time-to-first-byte` has been renamed `server-response-time` to better reflect what is being measured by the audit ([#10735](https://github.com/GoogleChrome/lighthouse/pull/10735)).
* `resource-summary`: `details.items.size` has been renamed to `transferSize` for clarity ([#10700](https://github.com/GoogleChrome/lighthouse/pull/10700), [#10743](https://github.com/GoogleChrome/lighthouse/pull/10743)).

## 🧱 Core

### Improvements, bug fixes, clarifications

The following changes are considered to be bug fixes or updates to better match what was intended to be audited, but the changes may cause adjustments in audit scores or behavior.

* add top-level warning if Lighthouse hit a timeout before load was complete ([#10538](https://github.com/GoogleChrome/lighthouse/pull/10538))
* add top-level warning if tested URL was redirected ([#10157](https://github.com/GoogleChrome/lighthouse/pull/10157))
* FCP + 5 seconds is now included as a minimum time that must be reached before the test page is considered loaded ([#10505](https://github.com/GoogleChrome/lighthouse/pull/10505), [#10516](https://github.com/GoogleChrome/lighthouse/pull/10516))
* load simulation: add edges from `initiatorRequest` when there are duplicate records ([#10097](https://github.com/GoogleChrome/lighthouse/pull/10097))
* load simulation: keep first layout/paint/parse events regardless of duration ([#9922](https://github.com/GoogleChrome/lighthouse/pull/9922))
* load simulation: do not create self-dependencies via timers ([#10280](https://github.com/GoogleChrome/lighthouse/pull/10280))
* load simulation: remove min task duration on CPU nodes ([#9910](https://github.com/GoogleChrome/lighthouse/pull/9910))
* load simulation: use fixed times for data URLs since they've already been loaded ([#9932](https://github.com/GoogleChrome/lighthouse/pull/9932))
* load simulation: link layout nodes to root frame request ([#9727](https://github.com/GoogleChrome/lighthouse/pull/9727))
* tracehouse: improved attribution for XHRs + paint/layout/HTML ([#10001](https://github.com/GoogleChrome/lighthouse/pull/10001))
* `offscreen-images`: look outside three viewports for possible images to defer ([#10643](https://github.com/GoogleChrome/lighthouse/pull/10643))
* `uses-responsive-images`: include offscreen images larger than viewport ([#10506](https://github.com/GoogleChrome/lighthouse/pull/10506), [#10561](https://github.com/GoogleChrome/lighthouse/pull/10561))
* `accessibility`: include `axe-core` ['incomplete'](https://github.com/dequelabs/axe-core/blob/ffa666972d2c82fe198c76a3491988def64769ee/doc/rule-development.md#check-properties) results in artifact to include even partial a11y results ([#10072](https://github.com/GoogleChrome/lighthouse/pull/10072), [#10270](https://github.com/GoogleChrome/lighthouse/pull/10270))
* `audio-caption`: remove check that has been disabled by `axe-core` ([#10453](https://github.com/GoogleChrome/lighthouse/pull/10453))
* `link-text`: Add more keywords to blocklist ([#9986](https://github.com/GoogleChrome/lighthouse/pull/9986))
* `font-size`: don't allow a deleted node to fail gatherer ([#9928](https://github.com/GoogleChrome/lighthouse/pull/9928))
* `installable-manifest`: lower required icon size from 192px to 144px ([#10175](https://github.com/GoogleChrome/lighthouse/pull/10175))
* `is-on-https`: add `filesystem` to secure schemes ([#10073](https://github.com/GoogleChrome/lighthouse/pull/10073))
* `offscreen-images`: exclude `lazy` or `eager` `loading` images ([#10117](https://github.com/GoogleChrome/lighthouse/pull/10117))
* `resource-summary`: don't include favicon.ico in summary ([#10190](https://github.com/GoogleChrome/lighthouse/pull/10190))
* `uses-rel-preconnect`: warn if more than three preconnects found ([#9903](https://github.com/GoogleChrome/lighthouse/pull/9903), [#10293](https://github.com/GoogleChrome/lighthouse/pull/10293))
* `third-party-summary`: don't include main resource if origin in third-party list ([#10006](https://github.com/GoogleChrome/lighthouse/pull/10006))
* `js-lib-detector`: handle new fast lib detection entries, version heterogeneity ([#9888](https://github.com/GoogleChrome/lighthouse/pull/9888), [#10295](https://github.com/GoogleChrome/lighthouse/pull/10295), [#10176](https://github.com/GoogleChrome/lighthouse/pull/10176))
* `is-on-https`: update description to reference mixed content ([#10712](https://github.com/GoogleChrome/lighthouse/pull/10712))
* `definition-list`: mention `<div>` is allowed to group content in `<dl>` ([#10479](https://github.com/GoogleChrome/lighthouse/pull/10479))
* `offline-start-url`: improve failure messages ([#9982](https://github.com/GoogleChrome/lighthouse/pull/9982))
* update and fix links to docs in audit and stack-pack descriptions ([#9850](https://github.com/GoogleChrome/lighthouse/pull/9850), [#9863](https://github.com/GoogleChrome/lighthouse/pull/9863), [#10019](https://github.com/GoogleChrome/lighthouse/pull/10019), [#10069](https://github.com/GoogleChrome/lighthouse/pull/10069), [#10246](https://github.com/GoogleChrome/lighthouse/pull/10246), [#10496](https://github.com/GoogleChrome/lighthouse/pull/10496), [#10714](https://github.com/GoogleChrome/lighthouse/pull/10714))

### New things for programmatic users

* audit results now have a `numericUnit` property to specify the units for their `numericResult` ([#9979](https://github.com/GoogleChrome/lighthouse/pull/9979))
* `ImageElements`: add `usesPixelArtScaling` and `usesSrcSetDensityDescriptor` properties ([#10481](https://github.com/GoogleChrome/lighthouse/pull/10481))
* `MetaElements`: include `property` attribute ([#9978](https://github.com/GoogleChrome/lighthouse/pull/9978))
* add new base artifact `HostFormFactor` ([#9923](https://github.com/GoogleChrome/lighthouse/pull/9923))
* refactor to share `unused-javascript-summary` as a computed artifact ([#10387](https://github.com/GoogleChrome/lighthouse/pull/10387), [#10634](https://github.com/GoogleChrome/lighthouse/pull/10634))
* add new source-map computed artifact, `js-bundles` ([#10078](https://github.com/GoogleChrome/lighthouse/pull/10078))
* refactor to share `unused-css` as a computed artifact ([#10160](https://github.com/GoogleChrome/lighthouse/pull/10160))
* refactor to share metric timing as a computed artifact ([#9814](https://github.com/GoogleChrome/lighthouse/pull/9814))
* budgets: add support for CLS and LCP budgets ([#10579](https://github.com/GoogleChrome/lighthouse/pull/10579), [#10625](https://github.com/GoogleChrome/lighthouse/pull/10625))
* budgets: add `firstPartyHostnames` to the API ([#10105](https://github.com/GoogleChrome/lighthouse/pull/10105), [#10324](https://github.com/GoogleChrome/lighthouse/pull/10324))
* budgets: remove unused `tolerance` property from API ([#9770](https://github.com/GoogleChrome/lighthouse/pull/9770))

### Internal refactors and improvements

* ensure `axe-core` errors are properly serialized ([#10646](https://github.com/GoogleChrome/lighthouse/pull/10646))
* cleanup of `audit-details` type names ([#10603](https://github.com/GoogleChrome/lighthouse/pull/10603))
* include `finished` state on hidden `network-requests` audit ([#10530](https://github.com/GoogleChrome/lighthouse/pull/10530))
* fetch source maps outside of test page so not blocked by CORS ([#9459](https://github.com/GoogleChrome/lighthouse/pull/9459))
* `driver`: dead code cleanup ([#10491](https://github.com/GoogleChrome/lighthouse/pull/10491), [#10571](https://github.com/GoogleChrome/lighthouse/pull/10571))
* add internal-only `__internalOptionalArtifacts` for experimental artifacts ([#10355](https://github.com/GoogleChrome/lighthouse/pull/10355))
* `font-size`: use `DOMSnapshot.captureSnapshot` for better performance ([#10200](https://github.com/GoogleChrome/lighthouse/pull/10200))
* use isolated `evaluateAsync` when fetching content from the test page ([#10130](https://github.com/GoogleChrome/lighthouse/pull/10130))
* budgets: centralize path-matching logic ([#9895](https://github.com/GoogleChrome/lighthouse/pull/9895))
* `script-elements`: fetch script content in parallel ([#9713](https://github.com/GoogleChrome/lighthouse/pull/9713))
* include `GatherRunner.runPass` in internal perf timing numbers ([#10205](https://github.com/GoogleChrome/lighthouse/pull/10205))
* rename `GatherRunner.isPerfPass` for clarity ([#9896](https://github.com/GoogleChrome/lighthouse/pull/9896))
* migrate to flattened Chrome DevTools Protocol ([#9783](https://github.com/GoogleChrome/lighthouse/pull/9783))

## 💻 CLI

* add support for multiple `--chrome-flags` ([#10607](https://github.com/GoogleChrome/lighthouse/pull/10607))
* allow comma-separated values for `--output` ([#10188](https://github.com/GoogleChrome/lighthouse/pull/10188))
* add `--chrome-ignore-default-flags` ([#10184](https://github.com/GoogleChrome/lighthouse/pull/10184))
* allow `--extra-headers` as object ([#9962](https://github.com/GoogleChrome/lighthouse/pull/9962))

## 📔 Report

* add "Trust and Safety" group in the Best Practices category ([#10623](https://github.com/GoogleChrome/lighthouse/pull/10623))
* add link to score calculator populated with current metric scores ([#10754](https://github.com/GoogleChrome/lighthouse/pull/10754), [#10763](https://github.com/GoogleChrome/lighthouse/pull/10763), [#10773](https://github.com/GoogleChrome/lighthouse/pull/10773), [#10767](https://github.com/GoogleChrome/lighthouse/pull/10767))
* improve display of top-level warnings ([#10636](https://github.com/GoogleChrome/lighthouse/pull/10636), [#10765](https://github.com/GoogleChrome/lighthouse/pull/10765))
* `external-anchors-use-rel-noopener`: use `node` audit details type ([#10242](https://github.com/GoogleChrome/lighthouse/pull/10242))
* `is-crawlable`: include `robots.txt` line number that blocks crawling ([#10154](https://github.com/GoogleChrome/lighthouse/pull/10154))
* temporary test of css grid for metrics ([#10695](https://github.com/GoogleChrome/lighthouse/pull/10695), [#10778](https://github.com/GoogleChrome/lighthouse/pull/10778))
* define monospace `font-size` relative to `report-font-size` ([#10761](https://github.com/GoogleChrome/lighthouse/pull/10761))
* link to updated scoring documentation ([#10725](https://github.com/GoogleChrome/lighthouse/pull/10725))
* add non-`null` jsdoc type annotations for internal linter ([#10454](https://github.com/GoogleChrome/lighthouse/pull/10454))
* clarify "size" as either transfer or resource size ([#10420](https://github.com/GoogleChrome/lighthouse/pull/10420))
* update table and inline code formatting ([#10437](https://github.com/GoogleChrome/lighthouse/pull/10437))
* fix link contrast in dark mode ([#10364](https://github.com/GoogleChrome/lighthouse/pull/10364))
* add `channel` to runtime settings ([#10099](https://github.com/GoogleChrome/lighthouse/pull/10099))
* align audit warnings ([#10232](https://github.com/GoogleChrome/lighthouse/pull/10232))
* close drop-down menu when focus is lost ([#10208](https://github.com/GoogleChrome/lighthouse/pull/10208))
* hide drop-down menu when printing ([#10216](https://github.com/GoogleChrome/lighthouse/pull/10216))
* move `Util.UIStrings` to `Util.i18n` ([#10153](https://github.com/GoogleChrome/lighthouse/pull/10153))
* add initial support for subrows within a table ([#10084](https://github.com/GoogleChrome/lighthouse/pull/10084))
* adjust score gauge's arc length to account for rounded linecap ([#9913](https://github.com/GoogleChrome/lighthouse/pull/9913))
* fix header-shifting flicker during scrolling ([#9955](https://github.com/GoogleChrome/lighthouse/pull/9955))
* add `source-location` details for linking to source code ([#9354](https://github.com/GoogleChrome/lighthouse/pull/9354))
* CSV report: add tested URLs to entries ([#10656](https://github.com/GoogleChrome/lighthouse/pull/10656), [#10675](https://github.com/GoogleChrome/lighthouse/pull/10675))
* viewer: add option for loading JSON from any URL ([#10608](https://github.com/GoogleChrome/lighthouse/pull/10608))
* viewer: mention other lighthouse channels ([#10384](https://github.com/GoogleChrome/lighthouse/pull/10384))
* viewer: add page and cursor styling to signal loading ([#10305](https://github.com/GoogleChrome/lighthouse/pull/10305), [#10348](https://github.com/GoogleChrome/lighthouse/pull/10348))
* viewer: use new logo ([#9991](https://github.com/GoogleChrome/lighthouse/pull/9991), [#9999](https://github.com/GoogleChrome/lighthouse/pull/9999), [#10002](https://github.com/GoogleChrome/lighthouse/pull/10002))

## 👥 Clients

* retire extension; replace with PSI launcher ([#9193](https://github.com/GoogleChrome/lighthouse/pull/9193), [#9988](https://github.com/GoogleChrome/lighthouse/pull/9988), [#9989](https://github.com/GoogleChrome/lighthouse/pull/9989))
* extension: add firefox support ([#10332](https://github.com/GoogleChrome/lighthouse/pull/10332))
* extension: remove content security policy ([#10380](https://github.com/GoogleChrome/lighthouse/pull/10380))
* devtools: share desktop throttling settings with lightrider ([#10322](https://github.com/GoogleChrome/lighthouse/pull/10322))
* devtools: split up `runLighthouseInWorker` and expose to worker ([#10005](https://github.com/GoogleChrome/lighthouse/pull/10005))
* devtools: add `settings.internalDisableDeviceScreenEmulation` ([#9377](https://github.com/GoogleChrome/lighthouse/pull/9377))
* devtools: include `lighthouse-plugin-publisher-ads` in bundle ([#9924](https://github.com/GoogleChrome/lighthouse/pull/9924), [#10583](https://github.com/GoogleChrome/lighthouse/pull/10583), [#10682](https://github.com/GoogleChrome/lighthouse/pull/10682))
* devtools: update `roll-to-devtools` and track upstream changes ([#9942](https://github.com/GoogleChrome/lighthouse/pull/9942), [#10310](https://github.com/GoogleChrome/lighthouse/pull/10310), [#10036](https://github.com/GoogleChrome/lighthouse/pull/10036), [#10758](https://github.com/GoogleChrome/lighthouse/pull/10758), [#10762](https://github.com/GoogleChrome/lighthouse/pull/10762))

## 🌍 i18n

* new strings: audits, stack packs, headings, and corrections ([#9940](https://github.com/GoogleChrome/lighthouse/pull/9940), [#10244](https://github.com/GoogleChrome/lighthouse/pull/10244), [#10245](https://github.com/GoogleChrome/lighthouse/pull/10245), [#10645](https://github.com/GoogleChrome/lighthouse/pull/10645))
* localize runtime settings and tools in report ([#9166](https://github.com/GoogleChrome/lighthouse/pull/9166))
* don't give unused arguments for localized protocol errors ([#9935](https://github.com/GoogleChrome/lighthouse/pull/9935))
* use `log.verbose()` for outdated-strings warning ([#9931](https://github.com/GoogleChrome/lighthouse/pull/9931))
* centralize strings for metric names ([#9871](https://github.com/GoogleChrome/lighthouse/pull/9871))

## Docs

* plugins: update recipe and docs to use `NODE_PATH` ([#9997](https://github.com/GoogleChrome/lighthouse/pull/9997), [#10028](https://github.com/GoogleChrome/lighthouse/pull/10028))
* plugins: update example list ([#9917](https://github.com/GoogleChrome/lighthouse/pull/9917))
* scoring: update for v6, defer to web.dev for performance ([#10223](https://github.com/GoogleChrome/lighthouse/pull/10223), [#10633](https://github.com/GoogleChrome/lighthouse/pull/10633), [#10676](https://github.com/GoogleChrome/lighthouse/pull/10676))
* lantern: add deep-dive video ([#10546](https://github.com/GoogleChrome/lighthouse/pull/10546))
* new-audits: emphasize what makes a good audit ([#10376](https://github.com/GoogleChrome/lighthouse/pull/10376))
* hacking-tips: link to gist on using audit results directly ([#10480](https://github.com/GoogleChrome/lighthouse/pull/10480))
* variability: expand on hardware recommendations ([#10483](https://github.com/GoogleChrome/lighthouse/pull/10483))
* throttling: add devtools-throttling deprecation notice ([#9933](https://github.com/GoogleChrome/lighthouse/pull/9933))
* auth: use `--disable-storage-reset` in recipe ([#10189](https://github.com/GoogleChrome/lighthouse/pull/10189))
* tweak authenticated-pages and puppeteer docs ([#10277](https://github.com/GoogleChrome/lighthouse/pull/10277))
* add integration-test recipe for using Lighthouse and Jest ([#9722](https://github.com/GoogleChrome/lighthouse/pull/9722))
* add performance-budgets doc ([#10542](https://github.com/GoogleChrome/lighthouse/pull/10542))
* add recipe for using puppeteer in a custom gatherer ([#10253](https://github.com/GoogleChrome/lighthouse/pull/10253), [#10447](https://github.com/GoogleChrome/lighthouse/pull/10447))
* add readme for `build/` directory ([#10004](https://github.com/GoogleChrome/lighthouse/pull/10004))
* readme: add variability and throttling to FAQ ([#10631](https://github.com/GoogleChrome/lighthouse/pull/10631))
* readme: add a table of contents ([#10283](https://github.com/GoogleChrome/lighthouse/pull/10283))
* readme: add note about `yarn test-docs` ([#10263](https://github.com/GoogleChrome/lighthouse/pull/10263))
* readme: fix typos ([#10179](https://github.com/GoogleChrome/lighthouse/pull/10179), [#10694](https://github.com/GoogleChrome/lighthouse/pull/10694))
* readme: add protobuf install directions ([#10250](https://github.com/GoogleChrome/lighthouse/pull/10250))
* readme: separate free and paid integrations ([#10027](https://github.com/GoogleChrome/lighthouse/pull/10027))
* readme: add new and updated integrations ([#9954](https://github.com/GoogleChrome/lighthouse/pull/9954), [#9984](https://github.com/GoogleChrome/lighthouse/pull/9984), [#10018](https://github.com/GoogleChrome/lighthouse/pull/10018), [#9985](https://github.com/GoogleChrome/lighthouse/pull/9985), [#10156](https://github.com/GoogleChrome/lighthouse/pull/10156), [#9836](https://github.com/GoogleChrome/lighthouse/pull/9836), [#10385](https://github.com/GoogleChrome/lighthouse/pull/10385), [#10466](https://github.com/GoogleChrome/lighthouse/pull/10466), [#10475](https://github.com/GoogleChrome/lighthouse/pull/10475), [#10609](https://github.com/GoogleChrome/lighthouse/pull/10609), [#10745](https://github.com/GoogleChrome/lighthouse/pull/10745))

## Tests

* remove protobuf roundtrip check (and local protobuf dev requirement) from `yarn update:sample-json` ([#10557](https://github.com/GoogleChrome/lighthouse/pull/10557), [#10661](https://github.com/GoogleChrome/lighthouse/pull/10661))
* run CI tests on new github action ([#10418](https://github.com/GoogleChrome/lighthouse/pull/10418), [#10551](https://github.com/GoogleChrome/lighthouse/pull/10551), [#10620](https://github.com/GoogleChrome/lighthouse/pull/10620), [#10622](https://github.com/GoogleChrome/lighthouse/pull/10622), [#10627](https://github.com/GoogleChrome/lighthouse/pull/10627))
* report to buildtracker on commit via CI github action ([#10550](https://github.com/GoogleChrome/lighthouse/pull/10550), [#10718](https://github.com/GoogleChrome/lighthouse/pull/10718))
* lantern: update golden trace collection script and recollect them ([#9662](https://github.com/GoogleChrome/lighthouse/pull/9662), [#10129](https://github.com/GoogleChrome/lighthouse/pull/10129), [#10209](https://github.com/GoogleChrome/lighthouse/pull/10209), [#10279](https://github.com/GoogleChrome/lighthouse/pull/10279), [#10663](https://github.com/GoogleChrome/lighthouse/pull/10663))
* smokehouse: refactor to be able to integration test all lighthouse clients ([#9843](https://github.com/GoogleChrome/lighthouse/pull/9843), [#10158](https://github.com/GoogleChrome/lighthouse/pull/10158))
* smokehouse: add `bundle.js` runner for driving bundled lighthouse tests ([#9943](https://github.com/GoogleChrome/lighthouse/pull/9943))
* bundle smokehouse + `bundle.js` runner + bundled lighthouse for integration testing in a browser ([#9873](https://github.com/GoogleChrome/lighthouse/pull/9873), [#10727](https://github.com/GoogleChrome/lighthouse/pull/10727))
* smokehouse: use ranges for some expectations to work in varying environments ([#10227](https://github.com/GoogleChrome/lighthouse/pull/10227), [#10473](https://github.com/GoogleChrome/lighthouse/pull/10473))
* smokehouse: add `static-server` hook to modify response body ([#9872](https://github.com/GoogleChrome/lighthouse/pull/9872))
* smokehouse: adjust expectation handling and logging for compatibility ([#10361](https://github.com/GoogleChrome/lighthouse/pull/10361))
* smokehouse: commit copy of `pwa.rocks` for testing ([#10648](https://github.com/GoogleChrome/lighthouse/pull/10648))
* add type checking to `driver-test` ([#10135](https://github.com/GoogleChrome/lighthouse/pull/10135), [#10123](https://github.com/GoogleChrome/lighthouse/pull/10123))
* add type checking to `gather-runner-test` ([#10136](https://github.com/GoogleChrome/lighthouse/pull/10136), [#10215](https://github.com/GoogleChrome/lighthouse/pull/10215), [#10230](https://github.com/GoogleChrome/lighthouse/pull/10230))
* fix `i18n-test.js` bugs in Node 13 ([#10595](https://github.com/GoogleChrome/lighthouse/pull/10595))
* i18n: add check of locale files for strings that are probably wrong ([#9847](https://github.com/GoogleChrome/lighthouse/pull/9847))
* use `assert` in strict assertion mode ([#10606](https://github.com/GoogleChrome/lighthouse/pull/10606), [#10733](https://github.com/GoogleChrome/lighthouse/pull/10733))
* `report-ui-features`: add tests and remove interdependencies ([#10199](https://github.com/GoogleChrome/lighthouse/pull/10199), [#10201](https://github.com/GoogleChrome/lighthouse/pull/10201))
* update `coveragePathIgnore` jest configuration ([#10448](https://github.com/GoogleChrome/lighthouse/pull/10448))
* `speedline`: remove flaky test ([#10181](https://github.com/GoogleChrome/lighthouse/pull/10181))
* remove `global.URL` for jsdom tests ([#10186](https://github.com/GoogleChrome/lighthouse/pull/10186))
* viewer-test: don't override `puppeteer`'s chromium ([#9877](https://github.com/GoogleChrome/lighthouse/pull/9877))
* fix appveyor cache failures ([#10281](https://github.com/GoogleChrome/lighthouse/pull/10281))
* use lighthouse tarball for recipe tests ([#10254](https://github.com/GoogleChrome/lighthouse/pull/10254))
* stage viewer per PR with `yarn now-build` ([#10151](https://github.com/GoogleChrome/lighthouse/pull/10151))

## Misc

* update license headers to credit `Lighthouse Authors` ([#10469](https://github.com/GoogleChrome/lighthouse/pull/10469))
* add `timings-data/` to `.npmignore`  ([#10584](https://github.com/GoogleChrome/lighthouse/pull/10584))
* update commitlint config to latest, loosen subject-case ([#10371](https://github.com/GoogleChrome/lighthouse/pull/10371))
* tweak `CODEOWNERS` for codereview assignment ([#10265](https://github.com/GoogleChrome/lighthouse/pull/10265), [#10274](https://github.com/GoogleChrome/lighthouse/pull/10274), [#10282](https://github.com/GoogleChrome/lighthouse/pull/10282))
* release script push tag ([#10193](https://github.com/GoogleChrome/lighthouse/pull/10193))
* add a `bump-versions.js` release script ([#9998](https://github.com/GoogleChrome/lighthouse/pull/9998))
* add comment about minimum chrome version for LCP ([#9889](https://github.com/GoogleChrome/lighthouse/pull/9889))
* update changelog order and add chrome note placeholder ([#9859](https://github.com/GoogleChrome/lighthouse/pull/9859))
* add `.mailmap` file ([#10766](https://github.com/GoogleChrome/lighthouse/pull/10766))
* add chrome version field to bug report template ([#9866](https://github.com/GoogleChrome/lighthouse/pull/9866))
* upgrade Lighthouse CI dogfood script ([#9879](https://github.com/GoogleChrome/lighthouse/pull/9879), [#9951](https://github.com/GoogleChrome/lighthouse/pull/9951), [#9972](https://github.com/GoogleChrome/lighthouse/pull/9972), [#10482](https://github.com/GoogleChrome/lighthouse/pull/10482))
* updates and new features for internal `compare-runs` script ([#10296](https://github.com/GoogleChrome/lighthouse/pull/10296), [#10519](https://github.com/GoogleChrome/lighthouse/pull/10519), [#10526](https://github.com/GoogleChrome/lighthouse/pull/10526), [#10652](https://github.com/GoogleChrome/lighthouse/pull/10652))
* add `git3po` scripts for managing Github issues and PRs ([#10231](https://github.com/GoogleChrome/lighthouse/pull/10231), [#10266](https://github.com/GoogleChrome/lighthouse/pull/10266), [#10255](https://github.com/GoogleChrome/lighthouse/pull/10255), [#10271](https://github.com/GoogleChrome/lighthouse/pull/10271), [#10338](https://github.com/GoogleChrome/lighthouse/pull/10338), [#10256](https://github.com/GoogleChrome/lighthouse/pull/10256), [#10304](https://github.com/GoogleChrome/lighthouse/pull/10304), [#10658](https://github.com/GoogleChrome/lighthouse/pull/10658), [#10257](https://github.com/GoogleChrome/lighthouse/pull/10257))

## Deps

* `lighthouse-plugin-publisher-ads`: upgrade to 1.1.0-beta.0 ([#10544](https://github.com/GoogleChrome/lighthouse/pull/10544), [#10776](https://github.com/GoogleChrome/lighthouse/pull/10776))
* `chrome-launcher`: upgrade to 0.13.2 ([#9904](https://github.com/GoogleChrome/lighthouse/pull/9904), [#10535](https://github.com/GoogleChrome/lighthouse/pull/10535), [#10724](https://github.com/GoogleChrome/lighthouse/pull/10724))
* `yargs-parser`: upgrade to 18.1.3 ([#10723](https://github.com/GoogleChrome/lighthouse/pull/10723))
* `third-party-web`: upgrade to 0.11.1 ([#10711](https://github.com/GoogleChrome/lighthouse/pull/10711))
* `axe-core`: upgrade to 3.5.3 ([#10056](https://github.com/GoogleChrome/lighthouse/pull/10056), [#10344](https://github.com/GoogleChrome/lighthouse/pull/10344), [#10637](https://github.com/GoogleChrome/lighthouse/pull/10637))
* `typescript`: upgrade to 3.8.3 ([#10461](https://github.com/GoogleChrome/lighthouse/pull/10461))
* `puppeteer`: upgrade to 1.20.0 ([#10275](https://github.com/GoogleChrome/lighthouse/pull/10275))
* `bundlesize`: upgrade to to 0.18.0 ([#10272](https://github.com/GoogleChrome/lighthouse/pull/10272))
* `devtools-protocol`: upgrade to 0.0.729809 ([#10207](https://github.com/GoogleChrome/lighthouse/pull/10207))
* check `angular` test fixture into repo ([#10086](https://github.com/GoogleChrome/lighthouse/pull/10086))
* remove `mkdirp` and `make-dir` for `fs.mkdir` ([#9858](https://github.com/GoogleChrome/lighthouse/pull/9858))
* update snyk snapshot ([#10771](https://github.com/GoogleChrome/lighthouse/pull/10771), [#10670](https://github.com/GoogleChrome/lighthouse/pull/10670), [#10621](https://github.com/GoogleChrome/lighthouse/pull/10621), [#10559](https://github.com/GoogleChrome/lighthouse/pull/10559), [#10066](https://github.com/GoogleChrome/lighthouse/pull/10066), [#9929](https://github.com/GoogleChrome/lighthouse/pull/9929), [#10531](https://github.com/GoogleChrome/lighthouse/pull/10531), [#10478](https://github.com/GoogleChrome/lighthouse/pull/10478), [#10423](https://github.com/GoogleChrome/lighthouse/pull/10423), [#10163](https://github.com/GoogleChrome/lighthouse/pull/10163), [#9965](https://github.com/GoogleChrome/lighthouse/pull/9965))

 <a name="6.0.0-beta.0"></a>
# 6.0.0-beta.0 (2020-03-11)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v5.6.0...v6.0.0-beta.0)

This beta release will not ship in Chrome DevTools, but we'll ship the final 6.0 release.

## Notable Changes
* Brand new metrics and performance score calculation (seeking feedback)
* Lots more, complete release notes brewing..

See the [6.0.0 release notes](https://github.com/GoogleChrome/lighthouse/releases/tag/v6.0.0) for full changelog.

<a name="5.6.0"></a>
# 5.6.0 (2019-10-17)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v5.5.0...v5.6.0)

We expect this release to ship in the DevTools of Chrome 79.

## New contributors!

Thanks to @dpacassi, @lirantal and @yeonjuan for their first contributions!

## Notable

* gather: add new MainDocumentContent public artifact ([#9781](https://github.com/googlechrome/lighthouse/pull/9781))
* stack-packs: add angular, react, amp, and magento packs ([#9797](https://github.com/googlechrome/lighthouse/pull/9797))

## Core

* tracehouse: allow child to start <1ms before parent ([#9786](https://github.com/googlechrome/lighthouse/pull/9786))
* driver: fix error handling for Runtime.evaluate ([#9831](https://github.com/googlechrome/lighthouse/pull/9831))
* errors-in-console: add ignoredPatterns option ([#9480](https://github.com/googlechrome/lighthouse/pull/9480), [#9829](https://github.com/googlechrome/lighthouse/pull/9829))
* image-elements: cache naturalSize results ([#9818](https://github.com/googlechrome/lighthouse/pull/9818))
* link-elements: ignore non-HTMLLinkElements ([#9765](https://github.com/googlechrome/lighthouse/pull/9765))
* optimized-images: log errors ([#9782](https://github.com/googlechrome/lighthouse/pull/9782))
* seo: support korean in link-text audit ([#9804](https://github.com/googlechrome/lighthouse/pull/9804))
* tracehouse: allow nested trace events without an end ([#9785](https://github.com/googlechrome/lighthouse/pull/9785))
* rename Element to LHElement ([#9832](https://github.com/googlechrome/lighthouse/pull/9832))

## Deps

* update third-party-web to 0.11.0 ([#9849](https://github.com/googlechrome/lighthouse/pull/9849))
* snyk: update snyk snapshot ([#9793](https://github.com/googlechrome/lighthouse/pull/9793))

## Report

* rephrase titles for 3rdparty & crc ([#9419](https://github.com/googlechrome/lighthouse/pull/9419))
* rewrite dom-size description ([#9821](https://github.com/googlechrome/lighthouse/pull/9821))
* update logo in top bar ([#9728](https://github.com/googlechrome/lighthouse/pull/9728))
* remove some dead code ([#9800](https://github.com/googlechrome/lighthouse/pull/9800))

## Clients

* lr: don't include html report assets in bundle ([#9828](https://github.com/googlechrome/lighthouse/pull/9828))
* viewer: minify inlined report-generator bundle ([#9596](https://github.com/googlechrome/lighthouse/pull/9596))

## I18n

* import: web.dev links and small corrections ([#9846](https://github.com/googlechrome/lighthouse/pull/9846))
* import translations ([#9802](https://github.com/googlechrome/lighthouse/pull/9802))

## Docs

* related-projects: add lighthouse-check ([#9753](https://github.com/googlechrome/lighthouse/pull/9753))
* related-projects: add the is-website-vulnerable CLI tool ([#9810](https://github.com/googlechrome/lighthouse/pull/9810))
* related-projects: add the gradle lighthouse plugin ([#9789](https://github.com/googlechrome/lighthouse/pull/9789))
* document 'meaning' field in i18n readme ([#9787](https://github.com/googlechrome/lighthouse/pull/9787))
* update stale references to audits ([#9760](https://github.com/googlechrome/lighthouse/pull/9760))

## Tests

* use firehouse smoke test runner to test bundle ([#9791](https://github.com/googlechrome/lighthouse/pull/9791))
* attempt bundle test three times in CI ([#9830](https://github.com/googlechrome/lighthouse/pull/9830))
* smokehouse: fix tmp directory creation ([#9855](https://github.com/googlechrome/lighthouse/pull/9855))
* smokehouse: use static requires for test definitions ([#9501](https://github.com/googlechrome/lighthouse/pull/9501))

## Misc

* build: minify report javascript for lightrider report generator ([#9823](https://github.com/googlechrome/lighthouse/pull/9823))
* more releasing tweaks ([#9772](https://github.com/googlechrome/lighthouse/pull/9772))
* add compare-timings script ([#9723](https://github.com/googlechrome/lighthouse/pull/9723), [#9776](https://github.com/googlechrome/lighthouse/pull/9776))

<a name="5.5.0"></a>
# 5.5.0 (2019-10-02)

## Notable changes
* Preliminary implementation of the [Largest Contentful Paint](https://web.dev/largest-contentful-paint) metric has landed (`devtools` and `provided` throttling only) and can be found in the hidden `metrics` audit in the raw LHR JSON ([#9706](https://github.com/googlechrome/lighthouse/pull/9706))
* The creation of main-thread tasks from a trace is now more robust. This should significantly reduce the occurrence of Issue [#7764](https://github.com/GoogleChrome/lighthouse/issues/7764), `"Fatal trace logic error - expected start event, got X"` ([#9491](https://github.com/googlechrome/lighthouse/pull/9491))
* `<script>` element `id` has been added to the `ScriptElements` artifact ([#9718](https://github.com/googlechrome/lighthouse/pull/9718))

## New contributors!
Thanks to @LarsKumbier, @TimvdLippe, and @uchoudh for their first contributions!

## Core

* network-recorder: remove quic-request-finished workaround ([#9744](https://github.com/googlechrome/lighthouse/pull/9744))
* network-recorder: optimize network idle detection ([#9712](https://github.com/googlechrome/lighthouse/pull/9712))
* unused-css-rules: no more infinity savings ([#9731](https://github.com/googlechrome/lighthouse/pull/9731))

## Clients

* devtools: expose `registerLocaleData` to worker ([#9645](https://github.com/googlechrome/lighthouse/pull/9645))
* devtools: update references to `Runtime.cachedResources` ([#9758](https://github.com/googlechrome/lighthouse/pull/9758))

## Docs

* new documentation for running Lighthouse on [authenticated pages](https://github.com/GoogleChrome/lighthouse/blob/a7e823ebf017224a3528a5a337e3b79c2983fee5/docs/authenticated-pages.md) ([#9628](https://github.com/googlechrome/lighthouse/pull/9628), [#9705](https://github.com/googlechrome/lighthouse/pull/9705))
* point more docs links to web.dev ([#9540](https://github.com/googlechrome/lighthouse/pull/9540), [#9711](https://github.com/googlechrome/lighthouse/pull/9711), [#9761](https://github.com/googlechrome/lighthouse/pull/9761))
* readme: add more related projects ([#9716](https://github.com/googlechrome/lighthouse/pull/9716), [#9743](https://github.com/googlechrome/lighthouse/pull/9743))
* releasing: add schedule, more integration testing ([#9695](https://github.com/googlechrome/lighthouse/pull/9695))
* add links to more info about throttling and variability ([#9734](https://github.com/googlechrome/lighthouse/pull/9734))
* update scoring calculator link to v5 ([#9729](https://github.com/googlechrome/lighthouse/pull/9729))

## Tests

* add Lighthouse CI dogfood script to travis ([#9677](https://github.com/googlechrome/lighthouse/pull/9677), [#9745](https://github.com/googlechrome/lighthouse/pull/9745))
* report: update `utm_medium` check for web.dev links ([#9737](https://github.com/googlechrome/lighthouse/pull/9737))
* smokehouse: add check for any `runWarnings` ([#9732](https://github.com/googlechrome/lighthouse/pull/9732))
* attempt to download lantern test trace set a few times ([#9766](https://github.com/googlechrome/lighthouse/pull/9766))

## Misc

* devtools: remove version replacement for expectations ([#9702](https://github.com/googlechrome/lighthouse/pull/9702))
* remove unnecessary return in Promise ([#9703](https://github.com/googlechrome/lighthouse/pull/9703))
* assets: update logo ([#9694](https://github.com/googlechrome/lighthouse/pull/9694))

[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v5.4.0...v5.5.0)

 <a name="5.4.0"></a>
# 5.4.0 (2019-09-18)

Expected DevTools release in Chrome 79 ([December 2019](https://chromestatus.com/features/schedule))

## Core

* iframe-elements: Include new IFrameElements gatherer ([#8979](https://github.com/googlechrome/lighthouse/pull/8979))

## Report

* update favicon ([#9688](https://github.com/googlechrome/lighthouse/pull/9688))

## Docs

* plugins: update recipe's lighthouse peerDependency version ([#9653](https://github.com/googlechrome/lighthouse/pull/9653))

## I18n

* treat Infinity and NaN as numeric values ([#9687](https://github.com/googlechrome/lighthouse/pull/9687))

## Tests

* smokehouse: fix unintentional 404, relax max-len ([#9665](https://github.com/googlechrome/lighthouse/pull/9665))

<a name="5.3.0"></a>
# 5.3.0 (2019-09-13)

Expected DevTools release in Chrome 79 ([December 2019](https://chromestatus.com/features/schedule))

## New contributors!
Thanks to our new contributors @alabiaga, @olore, @letanure, and @mfriesenhahn!

## Core
* point audit descriptions to new web.dev Lighthouse docs ([#9538](https://github.com/googlechrome/lighthouse/pull/9538), [#9539](https://github.com/googlechrome/lighthouse/pull/9539), [#9084](https://github.com/googlechrome/lighthouse/pull/9084), [#9537](https://github.com/googlechrome/lighthouse/pull/9537))
* constants: increase default `maxWaitForFcp` to 30s ([#9509](https://github.com/googlechrome/lighthouse/pull/9509))
* font-size: gather style declaration of type attributes ([#9414](https://github.com/googlechrome/lighthouse/pull/9414))
* gather-runner: only fail on interstitials interrupting the `mainRecord` ([#9576](https://github.com/googlechrome/lighthouse/pull/9576))
* lightwallet: add path property to `budget.json` ([#9453](https://github.com/googlechrome/lighthouse/pull/9453))
* seo: support portuguese in `link-text` audit ([#9446](https://github.com/googlechrome/lighthouse/pull/9446))
* start-url: stay offline for entirety of `offlinePass` ([#9451](https://github.com/googlechrome/lighthouse/pull/9451))
* third-party-summary: add blocking-time impact ([#9486](https://github.com/googlechrome/lighthouse/pull/9486))
* tracehouse: sort trace events by nesting order ([#9230](https://github.com/googlechrome/lighthouse/pull/9230))
* add `source-maps` gatherer ([#9101](https://github.com/googlechrome/lighthouse/pull/9101))
* unused-css: allow up to 10KB of unused CSS per file ([#9479](https://github.com/googlechrome/lighthouse/pull/9479))

## CLI

* list audit categories in help text ([#9399](https://github.com/googlechrome/lighthouse/pull/9399))

## Clients

* devtools: fix collapsing-width svg in flexbox ([#9602](https://github.com/googlechrome/lighthouse/pull/9602))
* devtools: update test command to run only .js files ([#9532](https://github.com/googlechrome/lighthouse/pull/9532))
* proto: don't filter `channel` from `configSettings` ([#9554](https://github.com/googlechrome/lighthouse/pull/9554))
* viewer: remove obsolete polyfills ([#9553](https://github.com/googlechrome/lighthouse/pull/9553))
* proto: update import hooks, obey line length ([#9595](https://github.com/googlechrome/lighthouse/pull/9595))

## Deps

* chrome-launcher: update to 0.11.2 ([#9515](https://github.com/googlechrome/lighthouse/pull/9515))
* details-element-polyfill: update to 2.4.0 ([#9552](https://github.com/googlechrome/lighthouse/pull/9552))
* jsonlint-mod: update to 1.7.5 ([#9465](https://github.com/googlechrome/lighthouse/pull/9465))
* update transitive deps ([#9670](https://github.com/googlechrome/lighthouse/pull/9670))

## Docs

* fix broken plugin example link ([#9524](https://github.com/googlechrome/lighthouse/pull/9524))
* lightwallet: add link to budget.json repo ([#9579](https://github.com/googlechrome/lighthouse/pull/9579))

## I18n

* import translations from tc/ ([#9577](https://github.com/googlechrome/lighthouse/pull/9577), [#9620](https://github.com/googlechrome/lighthouse/pull/9620), [#9454](https://github.com/googlechrome/lighthouse/pull/9454))
* add `registerLocaleData()` method ([#9638](https://github.com/googlechrome/lighthouse/pull/9638))
* rewrite `aria-required-children` titles ([#9590](https://github.com/googlechrome/lighthouse/pull/9590))
* reword `pwa-page-transitions` description ([#9615](https://github.com/googlechrome/lighthouse/pull/9615))
* throw on excess placeholder replacement values ([#9580](https://github.com/googlechrome/lighthouse/pull/9580))
* remove translated messages when ICU arguments change ([#9598](https://github.com/googlechrome/lighthouse/pull/9598))
* use better types for `intl-messageformat` ([#9570](https://github.com/googlechrome/lighthouse/pull/9570))
* add code spans to `uses-rel-preconnect` description ([#9568](https://github.com/googlechrome/lighthouse/pull/9568))
* fix bugs in locale-importing scripts ([#9621](https://github.com/googlechrome/lighthouse/pull/9621))
* fix custom formatted ICU within plurals ([#9460](https://github.com/googlechrome/lighthouse/pull/9460))
* capitalize `robots.txt` `displayValue` ([#9567](https://github.com/googlechrome/lighthouse/pull/9567))
* add link to cldr parentLocales ([#9520](https://github.com/googlechrome/lighthouse/pull/9520))
* move pwa audits to i18n system ([#9105](https://github.com/googlechrome/lighthouse/pull/9105))
* use TypeScript compiler to collect `UIStrings` ([#9487](https://github.com/googlechrome/lighthouse/pull/9487))
* align type names with docs ([#9461](https://github.com/googlechrome/lighthouse/pull/9461))
* expand placeholder support ([#9114](https://github.com/googlechrome/lighthouse/pull/9114))
* rewrite `td-headers-attr` titles ([#9587](https://github.com/googlechrome/lighthouse/pull/9587))
* improve Intl polyfill and use it in Util ([#9584](https://github.com/googlechrome/lighthouse/pull/9584))

## Report

* make dropdown match ARIA action menu button pattern ([#9433](https://github.com/googlechrome/lighthouse/pull/9433))
* move drop-down logic into a separate class ([#9564](https://github.com/googlechrome/lighthouse/pull/9564))
* topbar: fix overflowing url ([#9497](https://github.com/googlechrome/lighthouse/pull/9497))
* viewer: add option for loading from the PSI API ([#9546](https://github.com/googlechrome/lighthouse/pull/9546))
* viewer: fix favicon typo ([#9629](https://github.com/googlechrome/lighthouse/pull/9629))
* don't use unnessary monospace ([#9626](https://github.com/googlechrome/lighthouse/pull/9626))
* remove PWA badge flicker workaround for Chrome ([#9636](https://github.com/googlechrome/lighthouse/pull/9636))
* add utm params to web.dev links ([#9555](https://github.com/googlechrome/lighthouse/pull/9555))
* update favicon to new logo ([#9591](https://github.com/googlechrome/lighthouse/pull/9591))
* render unstyled json (rather than throwing) when LHR contains unknown details type ([#9557](https://github.com/googlechrome/lighthouse/pull/9557))

## Tests

* migrate travis to xenial for modern Chrome support ([#9654](https://github.com/googlechrome/lighthouse/pull/9654))
* fixtures: use relative path in static server 404 page ([d0e5c58](https://github.com/googlechrome/lighthouse/commit/d0e5c58))
* report: add `axe-core` validation of report output ([#9421](https://github.com/googlechrome/lighthouse/pull/9421))
* add index page for static server ([#9541](https://github.com/googlechrome/lighthouse/pull/9541))
* smokehouse: use mime-types + proper encoding for response write ([#9542](https://github.com/googlechrome/lighthouse/pull/9542))
* retry cli tests up to 3 times in appveyor ([#9512](https://github.com/googlechrome/lighthouse/pull/9512))
* simplify serving of zone.js ([#9672](https://github.com/googlechrome/lighthouse/pull/9672))

## Misc

* add comment on diff between `document.write()` audit and intervention ([#9644](https://github.com/googlechrome/lighthouse/pull/9644))
* refactor `collect-strings` to use `glob` and work on windows ([#9406](https://github.com/googlechrome/lighthouse/pull/9406))
* trim missed `yarn.lock` cruft & deduplicate dependencies ([#9603](https://github.com/googlechrome/lighthouse/pull/9603), [#9600](https://github.com/googlechrome/lighthouse/pull/9600))
* replace deprecated `uglify-es` with terser ([#9594](https://github.com/googlechrome/lighthouse/pull/9594))
* share markdown parsing in collect-strings and the report ([#9514](https://github.com/googlechrome/lighthouse/pull/9514))
* add note about global.URL in node 10 ([#9449](https://github.com/googlechrome/lighthouse/pull/9449))
* build: include locale files in devtools roll ([#9639](https://github.com/googlechrome/lighthouse/pull/9639))

 <a name="5.2.0"></a>
# 5.2.0 (2019-07-24)

Expected DevTools release in Chrome 77 ([September 2019](https://chromestatus.com/features/schedule))

## New contributors!
Thanks to @AngeloGulina, @jamesgeorge007, @johnemau, @kaushikchaubal, @mitchellsimoens, @NickolasBenakis, @noelyoo, @PatOnTheBack, @rishichawda, and @Remexllee for their first contributions!

## New Audits

* `Third-Party Usage`, a new performance diagnostic that shows a breakdown of third-party resources in the page and the time/bytes needed to load them ([#9067](https://github.com/googlechrome/lighthouse/pull/9067))
* `Total Blocking Time` an experimental new metric that serves as a companion to TTI to help prioritize unblocking the main thread. Since it is currently experimental, it is unscored and appears only in the raw LHR JSON, not in the HTML report. ([#8975](https://github.com/googlechrome/lighthouse/pull/8975), [#9409](https://github.com/googlechrome/lighthouse/pull/9409))

## Notable changes
* **tracehouse**: performance trace processing has been moved to its own directory in `lib/tracehouse/` to serve as a more standalone library ([9f80524](https://github.com/googlechrome/lighthouse/commit/9f80524), [1af2edd](https://github.com/googlechrome/lighthouse/commit/1af2edd), [7ba6776](https://github.com/googlechrome/lighthouse/commit/7ba6776), [ddff3d6](https://github.com/googlechrome/lighthouse/commit/ddff3d6))
* certificate security errors are no longer a fatal Lighthouse error, though the Chrome error page will still return few results in the report by default. See [the docs](https://github.com/GoogleChrome/lighthouse/tree/82835eb6e4bcece5ac1ce9c575a8d2d9ecd995d1/docs#testing-on-a-site-with-an-untrusted-certificate) for testing a page in this situation. ([#8865](https://github.com/googlechrome/lighthouse/pull/8865))

## Core

* support saving and loading errors in artifacts ([#9397](https://github.com/googlechrome/lighthouse/pull/9397))
* config: assert all audit `requiredArtifacts` will be gathered ([#9284](https://github.com/googlechrome/lighthouse/pull/9284))
* `domstats`: support an empty html body ([#9340](https://github.com/googlechrome/lighthouse/pull/9340))
* `font-display`: limit false positives ([#9148](https://github.com/googlechrome/lighthouse/pull/9148))
* `font-size`: calculate accurate line/column for styles ([#9356](https://github.com/googlechrome/lighthouse/pull/9356))
* `font-size`: comment why source 'Other' occurs ([#9363](https://github.com/googlechrome/lighthouse/pull/9363))
* localize invalid-URL error message ([#9334](https://github.com/googlechrome/lighthouse/pull/9334))
* `gather-runner`: add `PageLoadError` base artifact ([#9236](https://github.com/googlechrome/lighthouse/pull/9236))
* `gather-runner`: don't save trace on pass with `pageLoadError` ([#9198](https://github.com/googlechrome/lighthouse/pull/9198))
* `gather-runner`: treat Chrome interstitials as `pageLoadErrors` ([#9176](https://github.com/googlechrome/lighthouse/pull/9176))
* `gather-runner`: always reset scroll position ([#9060](https://github.com/googlechrome/lighthouse/pull/9060))
* `gather-runner`: convert `PAGE_HUNG` to non-fatal `runtimeError` ([#9121](https://github.com/googlechrome/lighthouse/pull/9121))
* `manifest-parser`: handle blob manifests ([#9088](https://github.com/googlechrome/lighthouse/pull/9088))
* `page-functions`: don't try to clone a ShadowRoot ([#9079](https://github.com/googlechrome/lighthouse/pull/9079))
* perf: speed up `tap-target`'s `isVisible()` ([#9056](https://github.com/googlechrome/lighthouse/pull/9056))
* tracehouse: allow missing FCP ([#9174](https://github.com/googlechrome/lighthouse/pull/9174))

## CLI
* accept flags from a file ([#9109](https://github.com/googlechrome/lighthouse/pull/9109))

## Clients

* devtools: audits2->audits and defer reading resources ([#8985](https://github.com/googlechrome/lighthouse/pull/8985), [#9344](https://github.com/googlechrome/lighthouse/pull/9344))
* devtools: unset overflow in print ([#9274](https://github.com/googlechrome/lighthouse/pull/9274))
* lightrider: update `processForProto` method signature, `string` -> `LH.Result` ([#9016](https://github.com/googlechrome/lighthouse/pull/9016))
* lightrider: serialize errors in artifacts ([#9410](https://github.com/googlechrome/lighthouse/pull/9410))

## Deps

* update `axe-core` to 3.3.0 ([#9343](https://github.com/googlechrome/lighthouse/pull/9343))
* update `typescript` to 3.5.3 ([#9357](https://github.com/googlechrome/lighthouse/pull/9357))
* update `chrome-launcher` to 0.11.1 ([#9339](https://github.com/googlechrome/lighthouse/pull/9339))
* `intl`: move from devDep to dep ([#9309](https://github.com/googlechrome/lighthouse/pull/9309))
* update `debug` to 2.6.9 ([#9398](https://github.com/googlechrome/lighthouse/pull/9398))
* update to `open` from `opn` ([#9267](https://github.com/googlechrome/lighthouse/pull/9267))
* update outdated transitive deps ([#9347](https://github.com/googlechrome/lighthouse/pull/9347))
* update `brfs` to 2.0.2 ([#9312](https://github.com/googlechrome/lighthouse/pull/9312))
* remove `commitizen` as local dep ([#9246](https://github.com/googlechrome/lighthouse/pull/9246))
* update `extend` to 3.0.2 ([#9184](https://github.com/googlechrome/lighthouse/pull/9184))
* bump transitive dep `js-yaml` ([#9131](https://github.com/googlechrome/lighthouse/pull/9131))
* update `bundlesize`, add more budgets ([#9089](https://github.com/googlechrome/lighthouse/pull/9089))

## Docs

* add i18n overview and authoring documentation ([#9361](https://github.com/googlechrome/lighthouse/pull/9361))
* link to good first issues ([#9440](https://github.com/googlechrome/lighthouse/pull/9440))
* add instructions for testing with self-signed certificate ([#9112](https://github.com/googlechrome/lighthouse/pull/9112))
* update `understanding-results.md` ([#9226](https://github.com/googlechrome/lighthouse/pull/9226))
* change score type from 'string' to 'number' ([#9225](https://github.com/googlechrome/lighthouse/pull/9225))
* readme: add `Exthouse` to related projects ([#9243](https://github.com/googlechrome/lighthouse/pull/9243))
* readme: add `lighthouse-jest-example` to related projects ([#9172](https://github.com/googlechrome/lighthouse/pull/9172))
* readme: add `lighthouse-persist` to related projects([#9161](https://github.com/googlechrome/lighthouse/pull/9161))
* readme: add `gimbal` integration to related projects ([#9083](https://github.com/googlechrome/lighthouse/pull/9083))
* readme: update `lighthouse-mocha-example` related project ([#9158](https://github.com/googlechrome/lighthouse/pull/9158))
* readme: alphabetize related projects ([#9110](https://github.com/googlechrome/lighthouse/pull/9110))
* fix various typos ([#9411](https://github.com/googlechrome/lighthouse/pull/9411))

## I18n

* introduce script to swap in new locale to LHR ([#8755](https://github.com/googlechrome/lighthouse/pull/8755))
* enable local debug locale, `en-XL` ([#9192](https://github.com/googlechrome/lighthouse/pull/9192))
* begin localization of audits in `best-practices` ([#9092](https://github.com/googlechrome/lighthouse/pull/9092))
* add `es-419` ([#9171](https://github.com/googlechrome/lighthouse/pull/9171))
* localize column headers of budget audits ([#9127](https://github.com/googlechrome/lighthouse/pull/9127))

## Report

* fix audit explanation rendering ([#9439](https://github.com/googlechrome/lighthouse/pull/9439))
* accessibility: add heading role to report category gauge ([#9422](https://github.com/googlechrome/lighthouse/pull/9422))
* add link to docs on performance scoring ([#9355](https://github.com/googlechrome/lighthouse/pull/9355))
* use full-bleed image thumbnails ([#9238](https://github.com/googlechrome/lighthouse/pull/9238))
* show disabled checkbox when all/no urls are third party ([#9299](https://github.com/googlechrome/lighthouse/pull/9299))
* remove unnecessary attribute in svg ([#9301](https://github.com/googlechrome/lighthouse/pull/9301))
* make urls clickable ([#9224](https://github.com/googlechrome/lighthouse/pull/9224))
* use css grid for metrics ([#9273](https://github.com/googlechrome/lighthouse/pull/9273))
* center and style top-level runtimeError ([#9271](https://github.com/googlechrome/lighthouse/pull/9271))
* create naming convention for css variables ([#9149](https://github.com/googlechrome/lighthouse/pull/9149), [37f7261](https://github.com/googlechrome/lighthouse/commit/37f7261), [ece89ec](https://github.com/googlechrome/lighthouse/commit/ece89ec))
* add aria-labels to tools button and metric toggle ([#9201](https://github.com/googlechrome/lighthouse/pull/9201))
* update permalink calculations for correct hash nav scroll position ([#9188](https://github.com/googlechrome/lighthouse/pull/9188))
* devtools: enable report UI features ([#9157](https://github.com/googlechrome/lighthouse/pull/9157))
* position sticky-header highlighter with css grid ([#9186](https://github.com/googlechrome/lighthouse/pull/9186))
* ensure SVG elements in `<defs>` have unique ids ([#9151](https://github.com/googlechrome/lighthouse/pull/9151))
* only print light theme ([#9173](https://github.com/googlechrome/lighthouse/pull/9173))
* make 'tools' menu focus-able ([#9169](https://github.com/googlechrome/lighthouse/pull/9169))
* rename 'exports' to 'tools' ([#9135](https://github.com/googlechrome/lighthouse/pull/9135))
* remove unused css vars ([#9144](https://github.com/googlechrome/lighthouse/pull/9144))

## Tests

* relax contrast font size expectation ([#9441](https://github.com/googlechrome/lighthouse/pull/9441))
* `font-size`: assert on source ([#9400](https://github.com/googlechrome/lighthouse/pull/9400), [#9413](https://github.com/googlechrome/lighthouse/pull/9413))
* assert `vulnerable-library` ranges have upper bounds ([#9308](https://github.com/googlechrome/lighthouse/pull/9308))
* i18n: update canonical locale test for node 12.6 ([#9396](https://github.com/googlechrome/lighthouse/pull/9396))
* i18n: throw when no ICU replacement value is given ([#9384](https://github.com/googlechrome/lighthouse/pull/9384))
* run CI with a frozen `yarn.lock` ([#9362](https://github.com/googlechrome/lighthouse/pull/9362))
* smokehouse: assert on expected array length ([#9292](https://github.com/googlechrome/lighthouse/pull/9292))
* smokehouse: always assert `lhr.runtimeError` ([#9130](https://github.com/googlechrome/lighthouse/pull/9130))
* `tags-blocking-first-paint`: make alternate stylesheets not blocking ([#9248](https://github.com/googlechrome/lighthouse/pull/9248))
* improve drag-and-drop test coverage ([#9314](https://github.com/googlechrome/lighthouse/pull/9314))
* clean up crufty `gather-runner` tests ([#9227](https://github.com/googlechrome/lighthouse/pull/9227))

## Misc

* fix `yarn.lock` and translations master drift ([#9404](https://github.com/googlechrome/lighthouse/pull/9404))
* build: adjust deployment filenames ([#9338](https://github.com/googlechrome/lighthouse/pull/9338), [#9434](https://github.com/googlechrome/lighthouse/pull/9434))
* build: create error-y LHR for the deploy ([#9283](https://github.com/googlechrome/lighthouse/pull/9283))
* `network-server-latency`: fix serverResponseTime typo ([#9388](https://github.com/googlechrome/lighthouse/pull/9388))
* localize logged `GatherRunner` error ([#9291](https://github.com/googlechrome/lighthouse/pull/9291))
* remove duplicate colon from regex ([#9295](https://github.com/googlechrome/lighthouse/pull/9295))
* runner: add assertion for `devtoolsLog` as `requiredArtifact` ([#9290](https://github.com/googlechrome/lighthouse/pull/9290))
* add `yarn static-server` script ([#9293](https://github.com/googlechrome/lighthouse/pull/9293))
* fix typo in `performance-budget` smoke test ([#9244](https://github.com/googlechrome/lighthouse/pull/9244))
* add `.idea` to `.gitignore` for WebStorm developers ([#9275](https://github.com/googlechrome/lighthouse/pull/9275))
* build: generate report variants in deployment ([#9280](https://github.com/googlechrome/lighthouse/pull/9280))
* suggest uploading issue repro ([#9217](https://github.com/googlechrome/lighthouse/pull/9217))
* use `CHROME_PATH` variable in CI and scripts ([#9202](https://github.com/googlechrome/lighthouse/pull/9202))
* update broken tracing-processor require ([#9123](https://github.com/googlechrome/lighthouse/pull/9123))
* address release script feedback ([#9111](https://github.com/googlechrome/lighthouse/pull/9111))
* release script should commit with format vX.Y.Z ([#9090](https://github.com/googlechrome/lighthouse/pull/9090))

[Full 5.2.0 Changelog](https://github.com/googlechrome/lighthouse/compare/v5.1.0...v5.2.0)

<a name="5.1.0"></a>
# 5.1.0 (2019-05-30)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v5.0.0...v5.1.0)

## New contributors!

Thanks to our new contributors 👽🐷🐰🐯🐻!
@thebengeu
@boyney123

## Core

* gather-runner: treat NO_FCP as a pageLoadError ([#8340](https://github.com/googlechrome/lighthouse/pull/8340))
* logging: change log messages for gathering and trace retrieval ([#9029](https://github.com/googlechrome/lighthouse/pull/9029))
* tap-targets: don't exclude visible position absolute elements from audit ([#7778](https://github.com/googlechrome/lighthouse/pull/7778))
* budget: throw error on duplicate budget types ([#8915](https://github.com/googlechrome/lighthouse/pull/8915))
* config: split out config helpers ([#9003](https://github.com/googlechrome/lighthouse/pull/9003))
* gather-runner: always reset scroll position (reverted) ([#8625](https://github.com/googlechrome/lighthouse/pull/8625))
* image-elements: drop spritesheet logic ([#8940](https://github.com/googlechrome/lighthouse/pull/8940))
* refactor gather-runner control flow ([#8964](https://github.com/googlechrome/lighthouse/pull/8964))
* perf: speed up getNodePath ([#9055](https://github.com/googlechrome/lighthouse/pull/9055))
* performance-budget: add MP-FID as budget metric ([#8905](https://github.com/googlechrome/lighthouse/pull/8905))
* runner: fix missing timing properties in the browser ([#9072](https://github.com/googlechrome/lighthouse/pull/9072))

## Report

* two rows for filmstrip on mobile ([#8563](https://github.com/googlechrome/lighthouse/pull/8563))
* move gauge styles to main stylesheet ([#8893](https://github.com/googlechrome/lighthouse/pull/8893))
* show metric descriptions by default when errors exist ([#9054](https://github.com/googlechrome/lighthouse/pull/9054))
* show fireworks only if all core categories score 100 ([#9073](https://github.com/googlechrome/lighthouse/pull/9073))
* make gauge font size and positioning dynamic ([#9057](https://github.com/googlechrome/lighthouse/pull/9057))
* hide 3rd party filter checkbox if all rows are 3rd party ([#8966](https://github.com/googlechrome/lighthouse/pull/8966))
* fix word breaking of display text, move metric disclaimer ([#9030](https://github.com/googlechrome/lighthouse/pull/9030))
* show nodeLabel for DOM nodes in addition to snippet ([#8961](https://github.com/googlechrome/lighthouse/pull/8961))

## Clients

* devtools: move topbar out of scrollable container ([#9077](https://github.com/googlechrome/lighthouse/pull/9077))
* devtools: enable sticky header, top bar, and report ui features ([#9023](https://github.com/googlechrome/lighthouse/pull/9023))
* devtools: ignore dark mode media query ([#9082](https://github.com/googlechrome/lighthouse/pull/9082))
* devtools: update version in tests on lh roll ([#8819](https://github.com/googlechrome/lighthouse/pull/8819))
* lr: insert assets in lhr for logging purposes ([#9002](https://github.com/googlechrome/lighthouse/pull/9002))

## CLI

* flags: accept comma-separated array values ([#8933](https://github.com/googlechrome/lighthouse/pull/8933))

## Docs

* plugins: add link to field-performance plugin ([#9051](https://github.com/googlechrome/lighthouse/pull/9051))
* plugins: rename Google AdSpeed Insights to Publisher Ads Audit ([#8906](https://github.com/googlechrome/lighthouse/pull/8906))
* add lighthouse-plugin-field-performance to plugins ([#9049](https://github.com/googlechrome/lighthouse/pull/9049))
* add performance-budgets to related projects ([#8971](https://github.com/googlechrome/lighthouse/pull/8971))

## I18n

* minor fr and ta translation updates ([#8999](https://github.com/googlechrome/lighthouse/pull/8999))

## Misc

* assets: remove outdated extension screenshots ([#9015](https://github.com/googlechrome/lighthouse/pull/9015))
* dot-js require() everywhere ([#9006](https://github.com/googlechrome/lighthouse/pull/9006))
* remove unneeded reportCategories from LH.ReportResult ([#9001](https://github.com/googlechrome/lighthouse/pull/9001))
* update minify-trace scripts; extract to lib/ ([#8968](https://github.com/googlechrome/lighthouse/pull/8968))
* fix master: tmp revert of scroll change in #8625 ([#9059](https://github.com/googlechrome/lighthouse/pull/9059))

## Tests

* lint: require file extension in require() ([#9017](https://github.com/googlechrome/lighthouse/pull/9017))
* update a11y sample artifacts ([#9010](https://github.com/googlechrome/lighthouse/pull/9010))
* remove compile-devtools on travis ([#8988](https://github.com/googlechrome/lighthouse/pull/8988))
* smoke: re-enable dialog prompt ([#8894](https://github.com/googlechrome/lighthouse/pull/8894))

 <a name="5.0.0"></a>
# 5.0.0 (2019-05-07)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v4.3.0...v5.0.0)

## Major new features

* [Stack packs](https://github.com/GoogleChrome/lighthouse-stack-packs) are a new way to present stack-specific advice wihin the Lighthouse report. This initial version detects if a site is running on WordPress and adds additional information to the report on how to take advantage of Wordpress plugins and configuration to improve performance. ([#7243](https://github.com/googlechrome/lighthouse/pull/7243), [#8169](https://github.com/googlechrome/lighthouse/pull/8169), [#8633](https://github.com/googlechrome/lighthouse/pull/8633), [#8536](https://github.com/googlechrome/lighthouse/pull/8536), [#8778](https://github.com/googlechrome/lighthouse/pull/8778))
* [Performance budgets](https://developers.google.com/web/tools/lighthouse/audits/budgets) are a new feature of Lighthouse to help prevent your site performance from regressing over time. Set budgets for the resources a page should load and have Lighthouse alert if the budgets aren't met. ([#8539](https://github.com/googlechrome/lighthouse/pull/8539), [#8522](https://github.com/googlechrome/lighthouse/pull/8522), [#8727](https://github.com/googlechrome/lighthouse/pull/8727), [#8709](https://github.com/googlechrome/lighthouse/pull/8709), [#8427](https://github.com/googlechrome/lighthouse/pull/8427), [#8708](https://github.com/googlechrome/lighthouse/pull/8708))
* The HTML report has been redesigned!

## New Audits

* `apple-touch-icon` PWA audit ([#8857](https://github.com/googlechrome/lighthouse/pull/8857))
* `max-potential-fid` (new in HTML report) ([#8729](https://github.com/googlechrome/lighthouse/pull/8729), [#8817](https://github.com/googlechrome/lighthouse/pull/8817))
* `performance-budget` ([#8539](https://github.com/googlechrome/lighthouse/pull/8539))
* `resource-summary` ([#8522](https://github.com/googlechrome/lighthouse/pull/8522))

## Breaking changes
* Node 10 (LTS) or later is now required. ([#8117](https://github.com/googlechrome/lighthouse/pull/8117))
* `rawValue` has been removed from audit results. If the audit had a meaningful numeric result (like a metric), this result will now be on `numericValue`. ([#8343](https://github.com/googlechrome/lighthouse/pull/8343), [#8385](https://github.com/googlechrome/lighthouse/pull/8385), [#8421](https://github.com/googlechrome/lighthouse/pull/8421))
* The accessibility category scoring has been reweighted based on severity. ([#8823](https://github.com/googlechrome/lighthouse/pull/8823))
* FCP accuracy has improved (in 'simulation' throttling) and may noticeably affect scores. ([#7513](https://github.com/googlechrome/lighthouse/pull/7513))
* The deprecated `--disable-device-emulation` flag has been removed. Use `--emulated-form-factor`. ([#8289](https://github.com/googlechrome/lighthouse/pull/8289), [#8334](https://github.com/googlechrome/lighthouse/pull/8334))
* The `dom-size` now ignores elements in `<head>` and limits scoring to only DOM nodes in the body. ([#7241](https://github.com/googlechrome/lighthouse/pull/7241))
* The `diagnostics` audit details have had their `type` value changed to `debugdata` ([#8298](https://github.com/googlechrome/lighthouse/pull/8298))
* The format of the `screenshot-thumbnails` screenshots has changed. They are now a full image data URL. ([#8299](https://github.com/googlechrome/lighthouse/pull/8299))

## New contributors!

Thanks to @arnabsen, @housseindjirdeh, @MarkelFe, @muuvmuuv, and @Meggin for their first contributions!


## Core

* a11y: disable unused axe rules ([#8373](https://github.com/googlechrome/lighthouse/pull/8373))
* artifacts: create a PublicGathererArtifacts type ([#8382](https://github.com/googlechrome/lighthouse/pull/8382))
* runner: only pass requiredArtifacts to audits ([#8760](https://github.com/googlechrome/lighthouse/pull/8760))
* crc: redirects leading to iframe shouldn't be marked as critical ([#6704](https://github.com/googlechrome/lighthouse/pull/6704))
* driver: enable async stacks ([#5504](https://github.com/googlechrome/lighthouse/pull/5504))
* `font-display`: do not use invalid sourceURLs ([#8535](https://github.com/googlechrome/lighthouse/pull/8535))
* jsonld: structured data validation updates ([#8137](https://github.com/googlechrome/lighthouse/pull/8137))
* rect-helpers: make getBoundingRect take an array of rects ([#8789](https://github.com/googlechrome/lighthouse/pull/8789))
* seo: support spanish in `link-text` audit ([#7547](https://github.com/googlechrome/lighthouse/pull/7547))
* filter blob urls from more audits ([#8724](https://github.com/googlechrome/lighthouse/pull/8724))
* reword insecure error message ([#8530](https://github.com/googlechrome/lighthouse/pull/8530))
* seo: add `image-alt` to SEO category ([#8407](https://github.com/googlechrome/lighthouse/pull/8407))
* add devtoolsNodePath property to ScriptElements artifact ([#8133](https://github.com/googlechrome/lighthouse/pull/8133))
* always run axe gatherer last ([#8216](https://github.com/googlechrome/lighthouse/pull/8216))

## Report

* redesign: three dots for export button ([#8629](https://github.com/googlechrome/lighthouse/pull/8629))
* redesign: design review feedback ([#8785](https://github.com/googlechrome/lighthouse/pull/8785))
* redesign: whitespace, font weights ([#8820](https://github.com/googlechrome/lighthouse/pull/8820), [#8891](https://github.com/googlechrome/lighthouse/pull/8891), [#8592](https://github.com/googlechrome/lighthouse/pull/8592), [#8591](https://github.com/googlechrome/lighthouse/pull/8591), [#8531](https://github.com/googlechrome/lighthouse/pull/8531), [#8528](https://github.com/googlechrome/lighthouse/pull/8528))
* make v5 renderer compatible with v3 and v4 LHRs ([#8822](https://github.com/googlechrome/lighthouse/pull/8822))
* redesign: fireworks ([#8660](https://github.com/googlechrome/lighthouse/pull/8660))
* redesign: add toggle control to show metric descriptions ([#8661](https://github.com/googlechrome/lighthouse/pull/8661), [#8844](https://github.com/googlechrome/lighthouse/pull/8844))
* add table filter for third-party urls ([#6351](https://github.com/googlechrome/lighthouse/pull/6351))
* redesign: remove units from table column headings ([#8658](https://github.com/googlechrome/lighthouse/pull/8658)))
* redesign: hide sparkline in mobile ([#8562](https://github.com/googlechrome/lighthouse/pull/8562))
* redesign: add dark theme ([#8425](https://github.com/googlechrome/lighthouse/pull/8425), [#8843](https://github.com/googlechrome/lighthouse/pull/8843), [#8845](https://github.com/googlechrome/lighthouse/pull/8845), [#8842](https://github.com/googlechrome/lighthouse/pull/8842))
* redesign: add sticky scores header ([#8524](https://github.com/googlechrome/lighthouse/pull/8524), [#8883](https://github.com/googlechrome/lighthouse/pull/8883))
* redesign: runtime settings footer ([#8229](https://github.com/googlechrome/lighthouse/pull/8229))
* add missing </div> ([#8240](https://github.com/googlechrome/lighthouse/pull/8240))
* redesign: new gauges, score scale, category headers, variables ([#8121](https://github.com/googlechrome/lighthouse/pull/8121), [#8300](https://github.com/googlechrome/lighthouse/pull/8300), [#8329](https://github.com/googlechrome/lighthouse/pull/8329), [#8307](https://github.com/googlechrome/lighthouse/pull/8307), [#8222](https://github.com/googlechrome/lighthouse/pull/8222), [#8529](https://github.com/googlechrome/lighthouse/pull/8529), [#8532](https://github.com/googlechrome/lighthouse/pull/8532), [#8590](https://github.com/googlechrome/lighthouse/pull/8590), [#8653](https://github.com/googlechrome/lighthouse/pull/8653), [#8720](https://github.com/googlechrome/lighthouse/pull/8720), [#8722](https://github.com/googlechrome/lighthouse/pull/8722), [#8763](https://github.com/googlechrome/lighthouse/pull/8763), [#8872](https://github.com/googlechrome/lighthouse/pull/8872))
* extract init() function from report-template ([#8228](https://github.com/googlechrome/lighthouse/pull/8228))

## Clients

* devtools: remove ascii-encoded asset requirement ([#8456](https://github.com/googlechrome/lighthouse/pull/8456), [#8637](https://github.com/googlechrome/lighthouse/pull/8637))
* lr: increase Page.getAppManifest timeout to 10s ([#8350](https://github.com/googlechrome/lighthouse/pull/8350))
* lr: apply, revert Lightrider timings to NetworkRequests ([#8109](https://github.com/googlechrome/lighthouse/pull/8109), [#8752](https://github.com/googlechrome/lighthouse/pull/8752))
* psi: pass score scale element to psi ([#8827](https://github.com/googlechrome/lighthouse/pull/8827))
* lr: build report-generator-bundle ([#8197](https://github.com/googlechrome/lighthouse/pull/8197))

## Docs

* update throttling ([#8854](https://github.com/googlechrome/lighthouse/pull/8854))
* add plugin guide ([#8728](https://github.com/googlechrome/lighthouse/pull/8728))
* readme: add mention of free tier of Foo integration ([#8160](https://github.com/googlechrome/lighthouse/pull/8160))
* readme: remove link to archived lighthouse-security project ([#8141](https://github.com/googlechrome/lighthouse/pull/8141))

## CLI

* always handle chrome connection errors ([#8583](https://github.com/googlechrome/lighthouse/pull/8583))
* document that CSV is output to file ([#8520](https://github.com/googlechrome/lighthouse/pull/8520))

## Deps

* chrome-launcher@0.10.7 ([#8781](https://github.com/googlechrome/lighthouse/pull/8781))
* axe-core@3.2.2 ([#8370](https://github.com/googlechrome/lighthouse/pull/8370))

## Tests

* lightwallet: add perf-budget smoke test ([#8853](https://github.com/googlechrome/lighthouse/pull/8853))
* lightwallet: add budget to sample artifacts config ([#8783](https://github.com/googlechrome/lighthouse/pull/8783), [#8870](https://github.com/googlechrome/lighthouse/pull/8870))
* add tap targets to dobetterweb sample page ([#8803](https://github.com/googlechrome/lighthouse/pull/8803))
* make update:sample-artifacts work for a single artifact type ([#8802](https://github.com/googlechrome/lighthouse/pull/8802))
* smokehouse: capture microtask regression ([#8379](https://github.com/googlechrome/lighthouse/pull/8379))
* smokehouse: support artifacts assertions in smoke tests ([#8044](https://github.com/googlechrome/lighthouse/pull/8044))
* smokehouse: fix tests from sharing artifacts ([#8897](https://github.com/googlechrome/lighthouse/pull/8897))
* smokehouse: change metric assertions from score to numericValue ([#8805](https://github.com/googlechrome/lighthouse/pull/8805))
* fix sample_v2 generation, proto errors ([#8605](https://github.com/googlechrome/lighthouse/pull/8605))

## I18n

* import tamil translated strings ([#8886](https://github.com/googlechrome/lighthouse/pull/8886))
* SEO group titles and descriptions ([#8719](https://github.com/googlechrome/lighthouse/pull/8719))
* stack pack translations ([#8154](https://github.com/googlechrome/lighthouse/pull/8154), [#8415](https://github.com/googlechrome/lighthouse/pull/8415))
* update seo group titles and descriptions ([#8378](https://github.com/googlechrome/lighthouse/pull/8378))

## Misc

* proto: require protobuf 3.7.1, add stricter audit details test ([#8863](https://github.com/googlechrome/lighthouse/pull/8863), [#8867](https://github.com/googlechrome/lighthouse/pull/8867))
* proto: remove trailing whitespace; add contributing help ([#8818](https://github.com/googlechrome/lighthouse/pull/8818))
* fix roundtrip sample_v2.json ([#8815](https://github.com/googlechrome/lighthouse/pull/8815))
* rename release scripts properly ([#8751](https://github.com/googlechrome/lighthouse/pull/8751))
* simplify LH.Config settings types ([#8630](https://github.com/googlechrome/lighthouse/pull/8630))
* add correct listitem.js @fileoverview ([#8586](https://github.com/googlechrome/lighthouse/pull/8586))
* update sample_v2 artifacts ([#8243](https://github.com/googlechrome/lighthouse/pull/8243))
* ci: build report and deploy to now.sh on every commit ([#8194](https://github.com/googlechrome/lighthouse/pull/8194))
* fix bad auto-merge ([#8201](https://github.com/googlechrome/lighthouse/pull/8201))
* update collected i18n string ([#8158](https://github.com/googlechrome/lighthouse/pull/8158))
* `--help`: remove screenshots mention from `--save-assets` ([#8263](https://github.com/googlechrome/lighthouse/pull/8263))
* lightwallet: update budget link ([#8871](https://github.com/googlechrome/lighthouse/pull/8871))
* fix common typos ([#8726](https://github.com/googlechrome/lighthouse/pull/8726))

 <a name="4.3.1"></a>
# 4.3.1 (2019-04-30)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v4.3.0...v4.3.1)

## Core

* support traces missing TracingStartedInBrowser ([#7122](https://github.com/googlechrome/lighthouse/pull/7122))
* driver: only fail security state if scheme is not cryptographic ([#8338](https://github.com/googlechrome/lighthouse/pull/8338))

## Clients

* extension: remove github link in favor of copy to clipboard ([#8294](https://github.com/googlechrome/lighthouse/pull/8294))

## Deps

* snyk: update snyk snapshot ([#8354](https://github.com/googlechrome/lighthouse/pull/8354))

## Misc

* add releasing scripts ([#8387](https://github.com/googlechrome/lighthouse/pull/8387))

 <a name="4.3.0"></a>
# 4.3.0 (2019-04-08)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/4.2.0...4.3.0)

## New contributors!

Thanks to @rdlabo and @yashrajbharti for their first contributions!

## Report

* include utm params in links to docs ([#7441](https://github.com/googlechrome/lighthouse/pull/7441))
* fix PWA badge from disappearing on scroll ([#7512](https://github.com/googlechrome/lighthouse/pull/7512))

## Core

* artifacts: rename Scripts to ScriptElements artifact ([#7920](https://github.com/googlechrome/lighthouse/pull/7920))
* canonical: move canonical audit to LinkElements ([#7080](https://github.com/googlechrome/lighthouse/pull/7080))
* font-display: handle carriage returns ([#7712](https://github.com/googlechrome/lighthouse/pull/7712))
* font-display: ignore data URLs ([#7684](https://github.com/googlechrome/lighthouse/pull/7684))
* image-aspect-ratio: ignore css background images ([#7516](https://github.com/googlechrome/lighthouse/pull/7516))
* jsonld: add structured data validation ([#6750](https://github.com/googlechrome/lighthouse/pull/6750))
* lhr: truncate measure timings to hundredths ([#7748](https://github.com/googlechrome/lighthouse/pull/7748))
* logging: don't log when closing already closed page ([#7576](https://github.com/googlechrome/lighthouse/pull/7576))
* main-thread-tasks: improve event-order error messages ([#7745](https://github.com/googlechrome/lighthouse/pull/7745))
* main-thread-tasks: handle last task not finishing ([#7728](https://github.com/googlechrome/lighthouse/pull/7728))
* main-thread-tasks: use toplevel tasks in main thread audit ([#7711](https://github.com/googlechrome/lighthouse/pull/7711))
* oopif: attach to all descendants ([#7608](https://github.com/googlechrome/lighthouse/pull/7608))
* oopif: skip OOPIF network records in some gatherers ([#7640](https://github.com/googlechrome/lighthouse/pull/7640))
* optimized-images: cap execution to 5 seconds ([#7237](https://github.com/googlechrome/lighthouse/pull/7237))
* settings: add lighthouse channel ([#7312](https://github.com/googlechrome/lighthouse/pull/7312))
* remove hreflang gatherer ([#7477](https://github.com/googlechrome/lighthouse/pull/7477))
* tap-targets: exclude sticky elements from tap targets audit ([#7603](https://github.com/googlechrome/lighthouse/pull/7603))
* vuln-libs: match against all semver ranges provided by snyk ([#7402](https://github.com/googlechrome/lighthouse/pull/7402))
* uses-http2: ignore requests from service-worker ([#7197](https://github.com/googlechrome/lighthouse/pull/7197))

## Docs

* add plugin recipe ([#6965](https://github.com/googlechrome/lighthouse/pull/6965))
* readme: Foo integration ([#8035](https://github.com/googlechrome/lighthouse/pull/8035))
* url-shim: add comment about public suffix lst ([#7671](https://github.com/googlechrome/lighthouse/pull/7671))

## Clients

* devtools: refactor build script ([#7421](https://github.com/googlechrome/lighthouse/pull/7421), [#7567](https://github.com/googlechrome/lighthouse/pull/7567))
* lr: always use transferSize from X-TotalFetchedSize header ([#7478](https://github.com/googlechrome/lighthouse/pull/7478))
* lr: gather network timing numbers from headers ([#7888](https://github.com/googlechrome/lighthouse/pull/7888))
* lr: add custom config support ([#7613](https://github.com/googlechrome/lighthouse/pull/7613))

## Tests

* better fatal trace logic error coverage ([#7959](https://github.com/googlechrome/lighthouse/pull/7959))
* fix test coverage generation ([#7475](https://github.com/googlechrome/lighthouse/pull/7475))
* finish removing mocha ([#7429](https://github.com/googlechrome/lighthouse/pull/7429))
* upgrade jest to fix current node 11 build ([#7413](https://github.com/googlechrome/lighthouse/pull/7413))
* smoke: remove trivial uses of rawValue from expectations ([#7780](https://github.com/googlechrome/lighthouse/pull/7780))
* smoke: set Content-Type for files served by static-server.js ([#7612](https://github.com/googlechrome/lighthouse/pull/7612), [#8015](https://github.com/googlechrome/lighthouse/pull/8015), [#8078](https://github.com/googlechrome/lighthouse/pull/8078))

## Misc

* chore: remove old dep postinstall-prepare ([#7647](https://github.com/googlechrome/lighthouse/pull/7647))
* remove unused typedef ([#8075](https://github.com/googlechrome/lighthouse/pull/8075))
* specify types for some dependency-graph options objects ([#7962](https://github.com/googlechrome/lighthouse/pull/7962))
* simplifications in simulator/connection-pool ([#7894](https://github.com/googlechrome/lighthouse/pull/7894))
* drive-by code cleanup in BaseNode ([#7723](https://github.com/googlechrome/lighthouse/pull/7723))
* remove lhr-lite.d.ts ([#7991](https://github.com/googlechrome/lighthouse/pull/7991))
* remove obsolete Util.formatDisplayValue ([#7628](https://github.com/googlechrome/lighthouse/pull/7628))
* various spelling fixes ([#7370](https://github.com/googlechrome/lighthouse/pull/7370), [#7492](https://github.com/googlechrome/lighthouse/pull/7492), [#7427](https://github.com/googlechrome/lighthouse/pull/7427))
* fix unit-viewer command for windows ([#7624](https://github.com/googlechrome/lighthouse/pull/7624))
* remove obsolete unused files ([#7476](https://github.com/googlechrome/lighthouse/pull/7476))
* cli: add --plugins flag to load from the command line ([#7407](https://github.com/googlechrome/lighthouse/pull/7407))
* gather: update comment re: ClientRect copying ([#7785](https://github.com/googlechrome/lighthouse/pull/7785))

## Deps

* update nyc to latest ([#7431](https://github.com/googlechrome/lighthouse/pull/7431))
* snyk: update snyk snapshot ([#7392](https://github.com/googlechrome/lighthouse/pull/7392), [#7589](https://github.com/googlechrome/lighthouse/pull/7589), [#7943](https://github.com/googlechrome/lighthouse/pull/7943))

## I18n

* Hindi for seo and a11y ([#7786](https://github.com/googlechrome/lighthouse/pull/7786), [#8070](https://github.com/googlechrome/lighthouse/pull/8070))
* add new translations for SEO; updates for a11y and perf ([#7720](https://github.com/googlechrome/lighthouse/pull/7720))

 <a name="4.2.0"></a>
# 4.2.0 (2019-03-06)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v4.1.0...v4.2.0)

## New contributors!

@pra85, @tgfjt, @gidztech and @jburger424. Thank ya!

## New Audits

* tap-targets: verify tap targets are well sized and distinct ([#5846](https://github.com/googlechrome/lighthouse/pull/5846))

## CLI

* write report in runLighthouse before quitting Chrome ([#7339](https://github.com/googlechrome/lighthouse/pull/7339))

## Core

* fid: add Max Potential FID to JSON ([#5842](https://github.com/googlechrome/lighthouse/pull/5842))
* artifacts: unify AnchorElements into single gatherer ([#7101](https://github.com/googlechrome/lighthouse/pull/7101))
* artifacts: include inline scripts in Scripts artifact ([#7065](https://github.com/googlechrome/lighthouse/pull/7065))
* artifacts: create ViewportMeta computed artifact ([#7264](https://github.com/googlechrome/lighthouse/pull/7264))
* artifacts: add TestedAsMobileDevice base artifact ([#7280](https://github.com/googlechrome/lighthouse/pull/7280))
* bootup-time: better attribution ([#7059](https://github.com/googlechrome/lighthouse/pull/7059))
* byte-efficiency: use more optimistic GZIP ratios ([#7210](https://github.com/googlechrome/lighthouse/pull/7210))
* cache-headers: fix typo in must-revalidate ([#7189](https://github.com/googlechrome/lighthouse/pull/7189))
* details-renderer: add snippet details renderer ([#6999](https://github.com/googlechrome/lighthouse/pull/6999))
* diagnostics: add diagnostic audits ([#7052](https://github.com/googlechrome/lighthouse/pull/7052))
* driver: add waitForFCP timeout ([#7356](https://github.com/googlechrome/lighthouse/pull/7356))
* driver: collect network requests from out-of-process iframes ([#6922](https://github.com/googlechrome/lighthouse/pull/6922))
* driver: add ' Chrome-Lighthouse' to useragent ([#7297](https://github.com/googlechrome/lighthouse/pull/7297))
* emulation: bump chrome useragent to m74 ([#7211](https://github.com/googlechrome/lighthouse/pull/7211))
* fcp-3g: remove unused i18n for LR compatibility ([#7103](https://github.com/googlechrome/lighthouse/pull/7103))
* font-display: more accurately follow CSS spec ([#7191](https://github.com/googlechrome/lighthouse/pull/7191))
* image-elements: cap natural-size fetch time ([#7274](https://github.com/googlechrome/lighthouse/pull/7274))
* lantern: add configuration for precomputed network analysis ([#7239](https://github.com/googlechrome/lighthouse/pull/7239))
* lhr: include resourceSize in network-requests audit ([#7056](https://github.com/googlechrome/lighthouse/pull/7056))
* manifest: remove Manifest artifact in favor of new WebAppManifest ([#7078](https://github.com/googlechrome/lighthouse/pull/7078))
* metrics: do not fail if TTI fails ([#7132](https://github.com/googlechrome/lighthouse/pull/7132))
* network-analysis: set additional RTT to 0 not NaN ([#7156](https://github.com/googlechrome/lighthouse/pull/7156))
* network-recorder: redirects started by script are set as initiators ([#7352](https://github.com/googlechrome/lighthouse/pull/7352))
* plugins: add support for groups ([#7304](https://github.com/googlechrome/lighthouse/pull/7304))
* seo: remove manual mobile-friendly audit ([#7223](https://github.com/googlechrome/lighthouse/pull/7223))
* seo: add rel=canonical test for auditing a domain root ([#7228](https://github.com/googlechrome/lighthouse/pull/7228))
* tap-targets: disable font size and tap targets audit on desktop ([#7393](https://github.com/googlechrome/lighthouse/pull/7393))
* tap-targets: make tap targets failures more visible ([#7373](https://github.com/googlechrome/lighthouse/pull/7373))
* tsc: fix audit details type hierarchy ([#7177](https://github.com/googlechrome/lighthouse/pull/7177), [#7154](https://github.com/googlechrome/lighthouse/pull/7154), [#7285](https://github.com/googlechrome/lighthouse/pull/7285))
* unused-css: change title Defer -> Remove ([#7235](https://github.com/googlechrome/lighthouse/pull/7235))
* give sort fallback for broken test details in node 11 ([#7216](https://github.com/googlechrome/lighthouse/pull/7216))
* suppress protocol timeout for app manifest bug in LR ([#7184](https://github.com/googlechrome/lighthouse/pull/7184))
* optimize tap-targets audit ([#7130](https://github.com/googlechrome/lighthouse/pull/7130))
* remove NO_ERROR runtimeError when no error ([#7358](https://github.com/googlechrome/lighthouse/pull/7358))


## Deps

* snyk: update snyk snapshot ([#7277](https://github.com/googlechrome/lighthouse/pull/7277), [#7233](https://github.com/googlechrome/lighthouse/pull/7233), [#7167](https://github.com/googlechrome/lighthouse/pull/7167), [#7116](https://github.com/googlechrome/lighthouse/pull/7116))
* updates to weed out transitive vulnerabilities ([#7319](https://github.com/googlechrome/lighthouse/pull/7319))
* update cssstyle to parse more named colors, CSS4 colors ([#7283](https://github.com/googlechrome/lighthouse/pull/7283))

## Docs

* contributing.md: fix typos ([#7170](https://github.com/googlechrome/lighthouse/pull/7170))
* fix throttling rate comment and tweak comcast bandwidth ([#7374](https://github.com/googlechrome/lighthouse/pull/7374))
* improve explanations of extending and using config files ([#7354](https://github.com/googlechrome/lighthouse/pull/7354))
* update throttling docs to public version ([#7332](https://github.com/googlechrome/lighthouse/pull/7332))
* readme: add lighthouse-keeper to integrations ([#7399](https://github.com/googlechrome/lighthouse/pull/7399))
* docs(related-projects) add react-lighthouse-viewer ([#7262](https://github.com/googlechrome/lighthouse/pull/7262))
* readme: Add Fluxguard to the list of integrations ([#7249](https://github.com/googlechrome/lighthouse/pull/7249))
* variability: add dedicated variance doc ([#7175](https://github.com/googlechrome/lighthouse/pull/7175))

## I18n

* fix max potential FID description ([#7353](https://github.com/googlechrome/lighthouse/pull/7353))
* ICU syntax correction ([#7320](https://github.com/googlechrome/lighthouse/pull/7320))
* seo strings prepped for i18n ([#6860](https://github.com/googlechrome/lighthouse/pull/6860))
* translate strings in the tap-targets audit ([#7111](https://github.com/googlechrome/lighthouse/pull/7111))
* a11y category title and description ([#7113](https://github.com/googlechrome/lighthouse/pull/7113))
* import translated accessibility and lh-error messages ([#7008](https://github.com/googlechrome/lighthouse/pull/7008))

## Report

* reorganize a11y audit groups ([#7129](https://github.com/googlechrome/lighthouse/pull/7129))
* clip exceptionally long URLs in the header ([#6858](https://github.com/googlechrome/lighthouse/pull/6858))
* details-renderer: use new audit-details types ([#7192](https://github.com/googlechrome/lighthouse/pull/7192))

## Tests

* refactor driver, more gotoURL tests ([#7270](https://github.com/googlechrome/lighthouse/pull/7270), [#7242](https://github.com/googlechrome/lighthouse/pull/7242), [#7212](https://github.com/googlechrome/lighthouse/pull/7212))
* run node 11 in CI ([#7230](https://github.com/googlechrome/lighthouse/pull/7230))
* replace non-volatile snapshots with inline literals ([#7217](https://github.com/googlechrome/lighthouse/pull/7217))
* smokehouse: refactor to enable Smokerider ([#7284](https://github.com/googlechrome/lighthouse/pull/7284))
* smokehouse: +/- operator ([#7343](https://github.com/googlechrome/lighthouse/pull/7343))
* smokehouse: gzip test to assert transfer and resource sizes ([#7286](https://github.com/googlechrome/lighthouse/pull/7286))
* smokehouse: fail on finalUrl/errorCode mismatches ([#7227](https://github.com/googlechrome/lighthouse/pull/7227))

## Misc

* tap-targets: remove lines with trailing whitespace ([#7105](https://github.com/googlechrome/lighthouse/pull/7105))
* clean node_modules/.cache before travis builds its cache ([#7388](https://github.com/googlechrome/lighthouse/pull/7388))
* convert Flags comments to jsdoc for better intellisense ([#7359](https://github.com/googlechrome/lighthouse/pull/7359))
* export UA strings from emulation.js ([#7318](https://github.com/googlechrome/lighthouse/pull/7318))
* fix typo in comment ([#7296](https://github.com/googlechrome/lighthouse/pull/7296))

 <a name="4.1.0"></a>
# 4.1.0 (2019-01-28)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v4.0.0...v4.1.0)

## New contributors!

@castilloandres you da man, man.

## Core

* font-size audit: count code points for text length ([#6973](https://github.com/googlechrome/lighthouse/pull/6973))
* cache headers audit: ignore private, must-validate, no-cache ([#6835](https://github.com/googlechrome/lighthouse/pull/6835))
* introduce Lighthouse plugins ([#6959](https://github.com/googlechrome/lighthouse/pull/6959))
* new audit: add FCP on 3G ([#7062](https://github.com/googlechrome/lighthouse/pull/7062))

## Refactor

* refactor meta element artifacts to single `meta-elements` artifact ([#7025](https://github.com/googlechrome/lighthouse/pull/7025))
* images: cleanup `ImageUsage` to match other `*Elements` artifacts ([#7030](https://github.com/googlechrome/lighthouse/pull/7030))
* add baseArtifacts (with new WebAppManifest) to passContext ([#6957](https://github.com/googlechrome/lighthouse/pull/6957))
* use async/await in evaluateAsync ([#7038](https://github.com/googlechrome/lighthouse/pull/7038))

## Report / Viewer

* renderer: do not attempt fireworks for devtools ([#7090](https://github.com/googlechrome/lighthouse/pull/7090))
* viewer: allow loading RunnerResult json ([#7031](https://github.com/googlechrome/lighthouse/pull/7031))

## Misc

* readme: Add DebugBear to the list of integrations ([#7036](https://github.com/googlechrome/lighthouse/pull/7036))
* snyk: update snyk snapshot ([#7079](https://github.com/googlechrome/lighthouse/pull/7079))
* viewer: fix types to reference `LH.Result` ([#7051](https://github.com/googlechrome/lighthouse/pull/7051))
* replace TODOs with github issue links ([#7049](https://github.com/googlechrome/lighthouse/pull/7049))
* fix extension package path and viewer comments ([#7032](https://github.com/googlechrome/lighthouse/pull/7032))

 <a name="4.0.0"></a>
# 4.0.0 (2019-01-16)

## New contributors!

@mattzeunert, @dima74, @jeffbcross, @knoxmic, and @shogunsea. Thanks!

## Major changes

* A bevy of bug fixes and performance improvements.

* A special reward for getting a perfect score.

* A new layout for the PWA category, emphasizing speed, installability, and polish.

<a href="https://user-images.githubusercontent.com/316891/51218948-6e60ef00-18e3-11e9-8a48-535b59a41301.png"><img height="300" alt="Lighthouse 4.0 PWA category" src="https://user-images.githubusercontent.com/316891/51218948-6e60ef00-18e3-11e9-8a48-535b59a41301.png"></a>

## Breaking changes

* New PWA category, organization, and scoring ([#6395](https://github.com/GoogleChrome/lighthouse/issues/6395))
  - the PWA section of the report has a set of badges instead of a numeric score gauge ([#6526](https://github.com/googlechrome/lighthouse/pull/6526), [#6670](https://github.com/googlechrome/lighthouse/pull/6670))
  - the `webapp-install-banner` audit is now `installable-manifest` ([#6630](https://github.com/googlechrome/lighthouse/pull/6630))
  - the offline check formerly in `webapp-install-banner` is the new audit `offline-start-url` ([#6397](https://github.com/googlechrome/lighthouse/pull/6397))
* audits' `scoreDisplayMode` `'not-applicable'` is now `'notApplicable'` ([#6783](https://github.com/googlechrome/lighthouse/pull/6783))
* `no-websql` audit removed due to performance cost ([#6293](https://github.com/googlechrome/lighthouse/pull/6293))
* `speed-index` scoring now scales based on throttling ([#7007](https://github.com/googlechrome/lighthouse/pull/7007))
* empty children arrays are now removed from `critical-request-chain` audit result ([#6211](https://github.com/googlechrome/lighthouse/pull/6211))
* the correct Nexus 5X screen height of 660 now used instead of 732 ([#6932](https://github.com/googlechrome/lighthouse/pull/6932))
* throttling constants under `mobile3G` renamed to the more accurate `mobileSlow4G` with no change in values ([#6163](https://github.com/googlechrome/lighthouse/pull/6163))
* typescript definition files are now located under `types/` ([#6617](https://github.com/googlechrome/lighthouse/pull/6617))
* computed artifact files are now located under `lighthouse-core/computed/` ([#6618](https://github.com/googlechrome/lighthouse/pull/6618))

<hr>

[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v4.0.0-beta...v4.0.0) (in addition to the changes in [4.0.0-beta](https://github.com/GoogleChrome/lighthouse/releases/tag/v4.0.0-beta), [4.0.0-alpha.1](https://github.com/GoogleChrome/lighthouse/releases/tag/v4.0.0-alpha.1), and [4.0.0-alpha.0](https://github.com/GoogleChrome/lighthouse/releases/tag/4.0.0-alpha.0))

## Core

* config: reorder categories to match new score gauge order ([#6848](https://github.com/googlechrome/lighthouse/pull/6848))
* driver: handle navigation rejections within `Driver.gotoURL` ([#6739](https://github.com/googlechrome/lighthouse/pull/6739))
* driver: exit early when testing page with insecure certificate ([#6608](https://github.com/googlechrome/lighthouse/pull/6608))
* driver: `waitForFCP` when tracing ([#6944](https://github.com/googlechrome/lighthouse/pull/6944))
* handle invalid network timing data ([#6780](https://github.com/googlechrome/lighthouse/pull/6780))
* fix `usesObjectFit` property for ImageElement ([#6761](https://github.com/googlechrome/lighthouse/pull/6761))
* fonts: resolve URLs relative to stylesheet ([#6782](https://github.com/googlechrome/lighthouse/pull/6782))
* lantern: remove unnecessary sort calls ([#6900](https://github.com/googlechrome/lighthouse/pull/6900))
* lantern: drop node id from error message ([#6774](https://github.com/googlechrome/lighthouse/pull/6774))
* minification: properly handle regex character classes ([#6745](https://github.com/googlechrome/lighthouse/pull/6745))
* preconnect: add warning if preconnect link is not used ([#6694](https://github.com/googlechrome/lighthouse/pull/6694))
* preload: warn when duplicate requests issued ([#6849](https://github.com/googlechrome/lighthouse/pull/6849))
* scoreDisplayMode: change `'not-applicable'` to `'notApplicable'` ([#6783](https://github.com/googlechrome/lighthouse/pull/6783))
* service-worker: check that `start_url` is within SW's scope ([#6678](https://github.com/googlechrome/lighthouse/pull/6678))
* speedindex: scale scoring coefficients based on throttling ([#7007](https://github.com/googlechrome/lighthouse/pull/7007))
* tap-targets: helper functions for working with `ClientRects` ([#6703](https://github.com/googlechrome/lighthouse/pull/6703))
* url: add intent protocol to `NON_NETWORK_PROTOCOLS` ([#6711](https://github.com/googlechrome/lighthouse/pull/6711))
* user-timings: move into computed artifact ([#6719](https://github.com/googlechrome/lighthouse/pull/6719))
* change `displayValue` to be string only ([#6767](https://github.com/googlechrome/lighthouse/pull/6767))
* add type checking to `pwmetrics-events` ([#6980](https://github.com/googlechrome/lighthouse/pull/6980))
* stricter LR-desktop metric scoring ([#6969](https://github.com/googlechrome/lighthouse/pull/6969))
* in-page functions refactor ([#6702](https://github.com/googlechrome/lighthouse/pull/6702))

## Deps

* update axe-core to latest ([#7020](https://github.com/googlechrome/lighthouse/pull/7020))
* update details-element-polyfill to 2.2.0 ([#6928](https://github.com/googlechrome/lighthouse/pull/6928))
* update tsc to 3.2.2 ([#6684](https://github.com/googlechrome/lighthouse/pull/6684))
* snyk: update snyk snapshot ([#6888](https://github.com/googlechrome/lighthouse/pull/6888), [#6842](https://github.com/googlechrome/lighthouse/pull/6842))

## Docs

* readme: add speedrank to integrations list ([#6987](https://github.com/googlechrome/lighthouse/pull/6987))
* readme: added simple guidance on install options ([#6810](https://github.com/googlechrome/lighthouse/pull/6810))
* configuration.md: update link to pwmetrics ([#6816](https://github.com/googlechrome/lighthouse/pull/6816))
* scoring: update TTI references ([#6865](https://github.com/googlechrome/lighthouse/pull/6865))
* `--help`: use HTTPS link to bit.ly/chrome-flags ([#6692](https://github.com/googlechrome/lighthouse/pull/6692))
* ask people to test a11y issues upstream first ([#6764](https://github.com/googlechrome/lighthouse/pull/6764))

## Extension

* return `runnerResult` from `runLighthouseInExtension()` ([#6839](https://github.com/googlechrome/lighthouse/pull/6839))

## I18n

* localize `LighthouseError` messages ([#6457](https://github.com/googlechrome/lighthouse/pull/6457), [#6812](https://github.com/googlechrome/lighthouse/pull/6812))

## Report

* pwa: add tooltip to badge gauge ([#6689](https://github.com/googlechrome/lighthouse/pull/6689))
* add top-level section for passed audits that had warnings ([#6989](https://github.com/googlechrome/lighthouse/pull/6989))
* celebrate all 100s ([#5455](https://github.com/googlechrome/lighthouse/pull/5455))
* expand groups within "Passed Audits" by default ([#6930](https://github.com/googlechrome/lighthouse/pull/6930))
* fix margin on score gauge wrappers ([#6948](https://github.com/googlechrome/lighthouse/pull/6948), [#6972](https://github.com/googlechrome/lighthouse/pull/6972))
* support narrow screens ([#6857](https://github.com/googlechrome/lighthouse/pull/6857))
* larger margins for audit group summaries ([#6688](https://github.com/googlechrome/lighthouse/pull/6688))
* clean up more clump/group/expandable cruft ([#6982](https://github.com/googlechrome/lighthouse/pull/6982))

## Tests

* smokehouse: assert `errorCode` in expectations ([#6851](https://github.com/googlechrome/lighthouse/pull/6851))
* smokehouse: use node's native `URLSearchParams` ([#6929](https://github.com/googlechrome/lighthouse/pull/6929))
* add type checking to `cli/tests/` ([#6874](https://github.com/googlechrome/lighthouse/pull/6874))
* report: restore old, disabled failed grouping test ([#7006](https://github.com/googlechrome/lighthouse/pull/7006))

## Misc

* descriptions: more accurate metric descriptions ([#6508](https://github.com/googlechrome/lighthouse/pull/6508))
* emulation: use correct Nexus 5X screen size ([#6932](https://github.com/googlechrome/lighthouse/pull/6932))
* snyk: only keep vuln data for detectable libs ([#6919](https://github.com/googlechrome/lighthouse/pull/6919))
* clean up local names within Config ([#6950](https://github.com/googlechrome/lighthouse/pull/6950))

 <a name="4.0.0-beta"></a>
# 4.0.0-beta (2018-11-29)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v4.0.0-alpha.1...v4.0.0-beta)

## Core

* service-worker: check that test page is in SW scope ([#6609](https://github.com/googlechrome/lighthouse/pull/6609))
* throw fatally on page hang ([#6497](https://github.com/googlechrome/lighthouse/pull/6497))
* define new DNS failure LH Error ([#6579](https://github.com/googlechrome/lighthouse/pull/6579))
* assert securityIssues before getPageLoadError ([#6578](https://github.com/googlechrome/lighthouse/pull/6578))
* remove protocol timeout for Page.navigate ([#6413](https://github.com/googlechrome/lighthouse/pull/6413))
* rename webapp-install-banner audit to installable-manifest ([#6630](https://github.com/googlechrome/lighthouse/pull/6630))
* computed-artifacts: fix cache and add perf timing ([#6619](https://github.com/googlechrome/lighthouse/pull/6619))

## Report

* add PWA category badge gauge ([#6526](https://github.com/googlechrome/lighthouse/pull/6526), [#6670](https://github.com/googlechrome/lighthouse/pull/6670))
* give passed-opportunities group an icon ([#6594](https://github.com/googlechrome/lighthouse/pull/6594))
* safari: fix dropdown overlap translateZ ([#6546](https://github.com/googlechrome/lighthouse/pull/6546))
* use details-element-polyfill from node_modules ([#6593](https://github.com/googlechrome/lighthouse/pull/6593), [#6607](https://github.com/googlechrome/lighthouse/pull/6607))

## CLI

* exit and kill Chrome on unhandledRejection ([#6394](https://github.com/googlechrome/lighthouse/pull/6394))

## Tests

* add smoketest for slow service worker ([#6648](https://github.com/googlechrome/lighthouse/pull/6648))

## Misc

* tsc: infer dom.createElement type from tag name ([#6637](https://github.com/googlechrome/lighthouse/pull/6637))
* rename core/gather/computed/ to core/computed/ ([#6618](https://github.com/googlechrome/lighthouse/pull/6618))
* rename typings/ to types/ ([#6617](https://github.com/googlechrome/lighthouse/pull/6617))
* bump extension version ([#6569](https://github.com/googlechrome/lighthouse/pull/6569))

 <a name="4.0.0-alpha.1"></a>
# 4.0.0-alpha.1 (2018-11-15)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v4.0.0-alpha.0...v4.0.0-alpha.1)

## Core

* skip h2 audit in LR ([#6564](https://github.com/googlechrome/lighthouse/pull/6564))
* config: faster category validation ([#6445](https://github.com/googlechrome/lighthouse/pull/6445))
* driver: wait for Page.frameNavigated for about:blank ([#6446](https://github.com/googlechrome/lighthouse/pull/6446))
* lib: add chrome-extension to URL allowedProtocols and add test ([#6447](https://github.com/googlechrome/lighthouse/pull/6447))
* pwa: audit and report group renames ([#6494](https://github.com/googlechrome/lighthouse/pull/6494))
* seo: properly handle anchors in SVG ([#6483](https://github.com/googlechrome/lighthouse/pull/6483))
* increase protocol timeout to 30s ([#6505](https://github.com/googlechrome/lighthouse/pull/6505), [#6531](https://github.com/googlechrome/lighthouse/pull/6531))

## Report

* pwa: give badges to groups with all passing audits ([#6504](https://github.com/googlechrome/lighthouse/pull/6504))
* pwa: add pwa-category-renderer ([#6486](https://github.com/googlechrome/lighthouse/pull/6486))
* compat: add details-element polyfill for Edge ([#6465](https://github.com/googlechrome/lighthouse/pull/6465))
* compat: fix support for edge ([#6459](https://github.com/googlechrome/lighthouse/pull/6459))
* compat: ignore Edge's Invalid Argument error ([#6456](https://github.com/googlechrome/lighthouse/pull/6456))
* compat: fix summary rendering in FF ([#6448](https://github.com/googlechrome/lighthouse/pull/6448))
* handle underscored not_applicable scoreDisplayMode ([#6549](https://github.com/googlechrome/lighthouse/pull/6549))
* css: make performance category more compact ([#6437](https://github.com/googlechrome/lighthouse/pull/6437))
* rename clump classes; give classes to all audit groups ([#6482](https://github.com/googlechrome/lighthouse/pull/6482))
* refactor rendering of top-level failed/passing/etc clumps ([#6460](https://github.com/googlechrome/lighthouse/pull/6460))

## Misc

* build: fix viewer deploy ([#6449](https://github.com/googlechrome/lighthouse/pull/6449))
* timing: move timing-trace to async events ([#6440](https://github.com/googlechrome/lighthouse/pull/6440))
* update puppeteer to version 1.10.0 ([#6493](https://github.com/googlechrome/lighthouse/pull/6493))
* readme: use official appveyor badge ([#6443](https://github.com/googlechrome/lighthouse/pull/6443))
* i18n: convert accessibility audits ([#6229](https://github.com/googlechrome/lighthouse/pull/6229))

 <a name="4.0.0-alpha.0"></a>
# 4.0.0-alpha.0 (2018-10-31)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v3.2.0...v4.0.0-alpha.0)

## New Contributors!
Thanks to @carlesnunez and @justin0022 for their first contributions!

Thanks to @CodeDem for improving how the image-aspect-ratio audit handles small images!

Huge thanks to myself (@Hoten) for joining Lighthouse! Go me!

## New Audits

* offline-start-url ([#6397](https://github.com/googlechrome/lighthouse/pull/6397))

## Core

* aspectratio: ignore placeholder images ([#6305](https://github.com/googlechrome/lighthouse/pull/6305))
* audit: add utm parameters when calling snyk ([#6172](https://github.com/googlechrome/lighthouse/pull/6172))
* audits: clarify diff between load-fast-enough-for-pwa's TTI and perf TTI ([#6286](https://github.com/googlechrome/lighthouse/pull/6286))
* axe: disable unused audits ([#6180](https://github.com/googlechrome/lighthouse/pull/6180))
* computed: fix new computed artifact interface ([#6151](https://github.com/googlechrome/lighthouse/pull/6151))
* config: add new PWA category groups ([#6396](https://github.com/googlechrome/lighthouse/pull/6396))
* critical-request-chain: remove empty children from LHR ([#6211](https://github.com/googlechrome/lighthouse/pull/6211))
* driver: save performance.now() to avoid conflict ([#6387](https://github.com/googlechrome/lighthouse/pull/6387))
* driver: request smaller trace in m71+ ([#6117](https://github.com/googlechrome/lighthouse/pull/6117))
* driver: stringify protocol error messages ([#6302](https://github.com/googlechrome/lighthouse/pull/6302))
* driver: address bckenny feedback on #6117 ([#6285](https://github.com/googlechrome/lighthouse/pull/6285))
* driver: reduce required traceCategories again ([54baf91](https://github.com/googlechrome/lighthouse/commit/54baf91))
* driver: recover from rejection on handleJavaScriptDialog ([#6327](https://github.com/googlechrome/lighthouse/pull/6327))
* emulation: fix missing space in mobile UA ([#6161](https://github.com/googlechrome/lighthouse/pull/6161))
* icons: defer to manifest-icon type hint for image type ([#6230](https://github.com/googlechrome/lighthouse/pull/6230))
* network: handle invalid NetworkRequests ([#6157](https://github.com/googlechrome/lighthouse/pull/6157))
* network-analyzer: move throughput to NetworkAnalyzer ([#5900](https://github.com/googlechrome/lighthouse/pull/5900))
* perf: add timing instrumentation to measure runtime perf ([#3745](https://github.com/googlechrome/lighthouse/pull/3745))
* proto: add proto definition for LHR ([#6183](https://github.com/googlechrome/lighthouse/pull/6183))
* simulator: start nodes in observed order ([#5362](https://github.com/googlechrome/lighthouse/pull/5362))
* unminified-javascript: replace esprima with custom tokenizer ([#5925](https://github.com/googlechrome/lighthouse/pull/5925))
* remove recoverOrThrow / err.fatal ([#6343](https://github.com/googlechrome/lighthouse/pull/6343))
* convert computed artifact loading to regular require() ([#6204](https://github.com/googlechrome/lighthouse/pull/6204))
* remove no-websql audit ([#6293](https://github.com/googlechrome/lighthouse/pull/6293))
* bail on run if insecure ssl certification ([#6300](https://github.com/googlechrome/lighthouse/pull/6300))
* make throttled offscreen-images work without TTI ([#6039](https://github.com/googlechrome/lighthouse/pull/6039))
* save HTMLElement.p.matches function to avoid conflict ([#6283](https://github.com/googlechrome/lighthouse/pull/6283))
* remove fonts gatherer, move font-display to use CSSUsage artifact ([#6166](https://github.com/googlechrome/lighthouse/pull/6166))
* remove last dependency on WebInspector ([#6209](https://github.com/googlechrome/lighthouse/pull/6209))
* add timeout to all protocol commands ([#6347](https://github.com/googlechrome/lighthouse/pull/6347))
* don't load blank page twice in first pass ([#6369](https://github.com/googlechrome/lighthouse/pull/6369))
* refactor finding of trace start ([#6370](https://github.com/googlechrome/lighthouse/pull/6370))
* increase Page.navigate timeout ([#6412](https://github.com/googlechrome/lighthouse/pull/6412))

## Report

* fix tooltip hover animation ([#6288](https://github.com/googlechrome/lighthouse/pull/6288))
* reframe Fast 3G as Slow 4G ([#6163](https://github.com/googlechrome/lighthouse/pull/6163))
* fix html report viewing bugs for Safari ([#6143](https://github.com/googlechrome/lighthouse/pull/6143))
* dom-size: right-align the value column ([#6372](https://github.com/googlechrome/lighthouse/pull/6372))

## Clients

* simplify viewer build process ([#6426](https://github.com/googlechrome/lighthouse/pull/6426))
* reorganize file structure and build process ([#6344](https://github.com/googlechrome/lighthouse/pull/6344))
* build: ignore all locales from devtools & extension build ([#6170](https://github.com/googlechrome/lighthouse/pull/6170))
* lr: skip early emulation now that lr-desktop is defined ([#6158](https://github.com/googlechrome/lighthouse/pull/6158))
* split browserifying and extension packaging into separate scripts ([#6295](https://github.com/googlechrome/lighthouse/pull/6295))
* simplify bundle building ([#6282](https://github.com/googlechrome/lighthouse/pull/6282))
* stop report bug prompt for file:// urls ([#6278](https://github.com/googlechrome/lighthouse/pull/6278))

## Deps

* update typescript to latest patch release ([#6235](https://github.com/googlechrome/lighthouse/pull/6235))
* update to tsc 3.1.1 ([#6126](https://github.com/googlechrome/lighthouse/pull/6126))
* jsdom: upgrade to support Element.prototype.closest ([#6411](https://github.com/googlechrome/lighthouse/pull/6411))
* snyk: update snyk snapshot ([#6377](https://github.com/googlechrome/lighthouse/pull/6377))

## Docs

* contributing: consistent capitalization ([#6174](https://github.com/googlechrome/lighthouse/pull/6174))
* new-audits: revise issue template ([#6233](https://github.com/googlechrome/lighthouse/pull/6233))
* readme: Add new related project, lighthouse-github-reporter ([#6307](https://github.com/googlechrome/lighthouse/pull/6307))
* readme: change image references be commit hash raw gh urls ([#6116](https://github.com/googlechrome/lighthouse/pull/6116))
* add primer on viewing the timing data ([#6393](https://github.com/googlechrome/lighthouse/pull/6393))
* typo fix ([#6335](https://github.com/googlechrome/lighthouse/pull/6335))
* Remove "sh" format for CLI --help output ([#6311](https://github.com/googlechrome/lighthouse/pull/6311))
* update docs for --output-path re: multiple output types ([#6339](https://github.com/googlechrome/lighthouse/pull/6339))

## I18n

* roll latest messages from TC ([#6388](https://github.com/googlechrome/lighthouse/pull/6388))
* update test for new canonical locale codes ([#6360](https://github.com/googlechrome/lighthouse/pull/6360))

## Tests

* use predictable numbers in golden LHR ([#6404](https://github.com/googlechrome/lighthouse/pull/6404))
* add basic sentry tests ([#6308](https://github.com/googlechrome/lighthouse/pull/6308))
* restore lr-entry test ([#6214](https://github.com/googlechrome/lighthouse/pull/6214))
* remove more mock computed artifacts ([#6195](https://github.com/googlechrome/lighthouse/pull/6195))
* add trace creator ([#6196](https://github.com/googlechrome/lighthouse/pull/6196))
* add networkRecord-to-devtoolsLog mocking utility ([#6171](https://github.com/googlechrome/lighthouse/pull/6171))
* add angular test for JS minification ([#6138](https://github.com/googlechrome/lighthouse/pull/6138))
* run node 10 on Travis ([#6361](https://github.com/googlechrome/lighthouse/pull/6361))

## Misc

* tweaks for devtools client ([#6127](https://github.com/googlechrome/lighthouse/pull/6127))
* simplify proto npm scripts ([#6406](https://github.com/googlechrome/lighthouse/pull/6406))
* add cli module diagram ([#6129](https://github.com/googlechrome/lighthouse/pull/6129))
* keep download-chrome script in npm package ([#6153](https://github.com/googlechrome/lighthouse/pull/6153))
* lantern script path resolution fix ([#6380](https://github.com/googlechrome/lighthouse/pull/6380))
* add integrity data to yarn.lock ([#6212](https://github.com/googlechrome/lighthouse/pull/6212))
* add yarn integrity hashes for extension/viewer ([#6277](https://github.com/googlechrome/lighthouse/pull/6277))
* only allow 1 error from each audit/gatherer ([#6215](https://github.com/googlechrome/lighthouse/pull/6215))
* Revert "core(driver): stringify protocol error messages (#6302)" ([#6328](https://github.com/googlechrome/lighthouse/pull/6328))
* fix typo in feature request template ([#6431](https://github.com/googlechrome/lighthouse/pull/6431))
* remove plots/ ([#6346](https://github.com/googlechrome/lighthouse/pull/6346))
* build: cleanup extension package zip using gulp ([#6210](https://github.com/googlechrome/lighthouse/pull/6210))
* build: rename bundled files (devtools/ext/lr) ([#6179](https://github.com/googlechrome/lighthouse/pull/6179))
* eslint: enforce infix-op spacing ([#6382](https://github.com/googlechrome/lighthouse/pull/6382))
* logger: isVerbose(), getTimeEntries() ([#6383](https://github.com/googlechrome/lighthouse/pull/6383))
* logging: add hanging request logging in driver ([#6297](https://github.com/googlechrome/lighthouse/pull/6297))
* proto: made default LighthouseError enum 'UNDEFINED' ([#6334](https://github.com/googlechrome/lighthouse/pull/6334))
* proto: align proto whitespace ([#6374](https://github.com/googlechrome/lighthouse/pull/6374))
* proto: convert int32's into DoubleValue in proto ([#6332](https://github.com/googlechrome/lighthouse/pull/6332))
* proto: adjust configSetting.output in preprocessor ([#6310](https://github.com/googlechrome/lighthouse/pull/6310))
* proto: add audit_mode and timings ([#6363](https://github.com/googlechrome/lighthouse/pull/6363))
* proto: fix linting and add LR hook ([#6373](https://github.com/googlechrome/lighthouse/pull/6373))
* proto: make NO_ERROR default in proto ([#6358](https://github.com/googlechrome/lighthouse/pull/6358))
* proto: reduce configSettings in proto to minimum ([88b2829](https://github.com/googlechrome/lighthouse/commit/88b2829))
* yarn: update lockfile for micromatch ([#6384](https://github.com/googlechrome/lighthouse/pull/6384))

<a name="3.2.1"></a>
# 3.2.1 (2018-10-01)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v3.2.0...v3.2.1)

## Core

* emulation: set desktop viewport to 1350x940 ([#6131](https://github.com/googlechrome/lighthouse/pull/6131))
* await js-libraries detection ([#6141](https://github.com/googlechrome/lighthouse/pull/6141))

 <a name="3.2.0"></a>
# 3.2.0 (2018-09-27)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v3.1.1...v3.2.0)

## New Audits

* add js-libraries audit, just listing detected js libs ([#6081](https://github.com/googlechrome/lighthouse/pull/6081))

## Faster

* driver: deliver trace as events rather than a stream ([#6056](https://github.com/googlechrome/lighthouse/pull/6056))
* network-recorder: consider iframe responses finished. helps avoid pageload timeout ([#6078](https://github.com/googlechrome/lighthouse/pull/6078))
* replace WebInspector traceparser with native JSON.parse ([#6099](https://github.com/googlechrome/lighthouse/pull/6099))

## Core

* add `emulatedFormFactor` setting ([#6098](https://github.com/googlechrome/lighthouse/pull/6098))
* remove some trivial uses of WebInspector ([#6090](https://github.com/googlechrome/lighthouse/pull/6090))
* use cssstyle to parse CSS colors instead of WebInspector ([#6091](https://github.com/googlechrome/lighthouse/pull/6091))
* initial refactor of computedArtifact import/caching ([#5907](https://github.com/googlechrome/lighthouse/pull/5907))
* asset-saver: stop creating screenshot files during --save-assets ([#6066](https://github.com/googlechrome/lighthouse/pull/6066))
* content-width: not applicable on desktop ([#5893](https://github.com/googlechrome/lighthouse/pull/5893))
* driver: add check to make sure Runtime.evaluate result exists ([#6089](https://github.com/googlechrome/lighthouse/pull/6089))
* icons: Add PNG check to manifest icon validation ([#6024](https://github.com/googlechrome/lighthouse/pull/6024))
* lhr: add top-level runtimeError ([#6014](https://github.com/googlechrome/lighthouse/pull/6014))
  * gather-runner: include error status codes in pageLoadError ([#6051](https://github.com/googlechrome/lighthouse/pull/6051))
  * smooth rough edges of pageLoadError display and reporting ([#6083](https://github.com/googlechrome/lighthouse/pull/6083))
* net-request: transferSize now shared via 'X-TotalFetchedSize' ([#6050](https://github.com/googlechrome/lighthouse/pull/6050))
* don't allow analysis of file:// urls ([#5936](https://github.com/googlechrome/lighthouse/pull/5936))

## Report

* dont show zero ms savings in preconnect, preload audits ([#5983](https://github.com/googlechrome/lighthouse/pull/5983))
* align table headings & columns left/right ([#6063](https://github.com/googlechrome/lighthouse/pull/6063))
* audit: make dom-size table prettier ([#6065](https://github.com/googlechrome/lighthouse/pull/6065))
* `cursor:pointer` on Passed Audits, etc ([#5977](https://github.com/googlechrome/lighthouse/pull/5977))
* psi: remove redundant varience disclaimer ([#6110](https://github.com/googlechrome/lighthouse/pull/6110))
* util: ✅ audits should be in Passed Audits ([#5963](https://github.com/googlechrome/lighthouse/pull/5963))
* vulnerable-jslibs: tweak snyk link for highlighted matches ([#6096](https://github.com/googlechrome/lighthouse/pull/6096))
* xbrowser: replace Typed OM getComputedStyle() with CSSOM equivalent ([#5984](https://github.com/googlechrome/lighthouse/pull/5984))

## CLI

* add --print-config flag ([#6107](https://github.com/googlechrome/lighthouse/pull/6107))

## Deps

* snyk: update snyk snapshot ([#6074](https://github.com/googlechrome/lighthouse/pull/6074))
* chrome-launcher@0.10.5 ([#6106](https://github.com/googlechrome/lighthouse/pull/6106))
* js-library-detector@5.1.0 ([#6102](https://github.com/googlechrome/lighthouse/pull/6102))
* speedline@1.4.2 (faster sort) ([#6073](https://github.com/googlechrome/lighthouse/pull/6073))
* chrome-devtools-frontend@latest ([#6101](https://github.com/googlechrome/lighthouse/pull/6101))

## Docs

* readme: add lighthouse4u ([#6008](https://github.com/googlechrome/lighthouse/pull/6008))
* readme: updated report screenshot to 3.1.0 ([#6042](https://github.com/googlechrome/lighthouse/pull/6042))
* readme: add lighthouse-badges to related projects ([#5969](https://github.com/googlechrome/lighthouse/pull/5969))
* recipes: update custom-audit package.json ([#6007](https://github.com/googlechrome/lighthouse/pull/6007))
* releasing: minor updates ([#5345](https://github.com/googlechrome/lighthouse/pull/5345))

## i18n

* roll latest strings from TC ([#6109](https://github.com/googlechrome/lighthouse/pull/6109))
* mv locale files ([#5981](https://github.com/googlechrome/lighthouse/pull/5981))
* speed up replacement regex ([#6072](https://github.com/googlechrome/lighthouse/pull/6072))

## Misc

* bump bundlesize threshold a little more ([#6055](https://github.com/googlechrome/lighthouse/pull/6055))
* runner: added locale to settings that can change between -G and -A ([#6080](https://github.com/googlechrome/lighthouse/pull/6080))
* tsc: add type checking to sentry usage ([#5993](https://github.com/googlechrome/lighthouse/pull/5993))


 <a name="3.1.1"></a>
# 3.1.1 (2018-09-07)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v3.1.0...v3.1.1)

* update report score legend to match updated color buckets ([#5985](https://github.com/googlechrome/lighthouse/pull/5985))

<a name="3.1.0"></a>
# 3.1.0 (2018-09-06)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v3.0.3...v3.1.0)

## New Contributors!
Huge thanks to @midzer and @justinribeiro for being so darn helpful. Great stuff. :D

And thanks to @mettamatt for some helpful documentation. Who doesn't love better docs?!

## Notable changes

* red/orange/green color buckets for scores are tougher now. ([#5831](https://github.com/googlechrome/lighthouse/pull/5831))

| | Previously | Now |
|-|-|-|
| Red (bad) | 0-44 | 0-49 |
| Orange (average)| 45-74 | 50-89 |
| Green (good)| 75-100 | 90-100 |

Scoring itself hasn't changed; only what color is used to decorate a score.

* trace-processor: fix bug where top-level events weren't being found in the trace ([#5841](https://github.com/googlechrome/lighthouse/pull/5841))

## Core

* normalize URL before checking equality ([#5960](https://github.com/googlechrome/lighthouse/pull/5960))
* expose LighthouseRunWarnings on audit context ([#5684](https://github.com/googlechrome/lighthouse/pull/5684))
* adjust audit titles for consistency ([#5717](https://github.com/googlechrome/lighthouse/pull/5717))
* export any page-functions as string ([#5902](https://github.com/googlechrome/lighthouse/pull/5902))
* all ByteEfficiency audits require a trace ([#5840](https://github.com/googlechrome/lighthouse/pull/5840))
* enhanced noopener output ([#5857](https://github.com/googlechrome/lighthouse/pull/5857))
* errors: class rename and re-source page load errors ([#5972](https://github.com/googlechrome/lighthouse/pull/5972))
* fix defaultConfig UIStrings and exit code for test ([#5884](https://github.com/googlechrome/lighthouse/pull/5884))
* remove last debugString references ([#5856](https://github.com/googlechrome/lighthouse/pull/5856))
* redirects: update redirects to use OpportunityDetails ([#5791](https://github.com/googlechrome/lighthouse/pull/5791))
* warn when extensions affected perf ([#5666](https://github.com/googlechrome/lighthouse/pull/5666))
* driver: handle when page redefines global.URL ([#5748](https://github.com/googlechrome/lighthouse/pull/5748))
* gather-runner: call clearDataForOrigin on teardown ([#5933](https://github.com/googlechrome/lighthouse/pull/5933))
* lhr: expose environment info ([#5871](https://github.com/googlechrome/lighthouse/pull/5871))
* lr: add LR presets for desktop and mobile ([#5886](https://github.com/googlechrome/lighthouse/pull/5886))
* lr: drop maxWaitForLoad 45 -> 35 ([#5938](https://github.com/googlechrome/lighthouse/pull/5938))
* network: handle LR transferSize ([#5895](https://github.com/googlechrome/lighthouse/pull/5895))
* network-analyzer: infer RTT from receiveHeadersEnd ([#5694](https://github.com/googlechrome/lighthouse/pull/5694))
* optimized-images: support non-standard mime types ([#5688](https://github.com/googlechrome/lighthouse/pull/5688))
* preload: remove CRC dependency ([#5901](https://github.com/googlechrome/lighthouse/pull/5901))
* screenshot-thumbnails: improve caching ([#5976](https://github.com/googlechrome/lighthouse/pull/5976))
* ttfb: reuse requestMainResource ([#5657](https://github.com/googlechrome/lighthouse/pull/5657))
* trace-of-tab: only use navstart of chrome/http documents ([#5917](https://github.com/googlechrome/lighthouse/pull/5917))
* tracing-processor: throw on no top level events ([#5878](https://github.com/googlechrome/lighthouse/pull/5878))
* uses-long-cache-ttl: handle multiple cache-control headers ([#5745](https://github.com/googlechrome/lighthouse/pull/5745))

## Extension

* access core through module instead of Runner ([#5855](https://github.com/googlechrome/lighthouse/pull/5855))
* tweak runLighthouseAsInCLI jsdoc ([#5812](https://github.com/googlechrome/lighthouse/pull/5812))
* refactor option/flag passing (breaking change) ([#5769](https://github.com/googlechrome/lighthouse/pull/5769))
* remove X-UA-Compatible meta ([#5739](https://github.com/googlechrome/lighthouse/pull/5739))
* popup: keep feedback class ([#5872](https://github.com/googlechrome/lighthouse/pull/5872))

## i18n

* add i18n 'type' for prlint ([#5880](https://github.com/googlechrome/lighthouse/pull/5880))
* minor message and description changes based on translator feedback ([#5829](https://github.com/googlechrome/lighthouse/pull/5829))
* reframe the ICU message descriptions with placeholders ([#5737](https://github.com/googlechrome/lighthouse/pull/5737))
* export rendererFormattedStrings ([#5713](https://github.com/googlechrome/lighthouse/pull/5713))
* extract performance category strings to UIStrings ([#5716](https://github.com/googlechrome/lighthouse/pull/5716))
* always use english for status logs ([#5727](https://github.com/googlechrome/lighthouse/pull/5727))
* add 'ln' locale which maps to 'fr' ([#5879](https://github.com/googlechrome/lighthouse/pull/5879))
* support descriptions ([#5718](https://github.com/googlechrome/lighthouse/pull/5718))
* add [ICU Syntax] label to relevant message descriptions ([#5736](https://github.com/googlechrome/lighthouse/pull/5736))
* import psuedo-locale json from TC ([#5726](https://github.com/googlechrome/lighthouse/pull/5726))
* incorporate 52 languages into messages pipeline ([#5781](https://github.com/googlechrome/lighthouse/pull/5781))
* add descriptions to UI strings ([#5743](https://github.com/googlechrome/lighthouse/pull/5743))
* add strings of the opportunity group split (first paint, overall) ([#5744](https://github.com/googlechrome/lighthouse/pull/5744))
* add locale fallback when language not supported ([#5746](https://github.com/googlechrome/lighthouse/pull/5746))
* localize strings at end of run ([#5655](https://github.com/googlechrome/lighthouse/pull/5655))
* always use formatted strings for extension popup ([#5761](https://github.com/googlechrome/lighthouse/pull/5761))
* add strings for user timing entries table ([#5806](https://github.com/googlechrome/lighthouse/pull/5806))
* sort the ICU messages when saved ([#5771](https://github.com/googlechrome/lighthouse/pull/5771))
* roll latest TC messages ([#5802](https://github.com/googlechrome/lighthouse/pull/5802))
* add localized messages for 52 locales ([#5780](https://github.com/googlechrome/lighthouse/pull/5780))
* add assertion script ([#5686](https://github.com/googlechrome/lighthouse/pull/5686))
* report: use LHR locale for toLocaleString ([#5734](https://github.com/googlechrome/lighthouse/pull/5734))
* report: localize CRC renderer strings ([#5730](https://github.com/googlechrome/lighthouse/pull/5730))

## Types

* don't use index signature in LHErrors ([#5896](https://github.com/googlechrome/lighthouse/pull/5896))
* type check config files ([#5858](https://github.com/googlechrome/lighthouse/pull/5858))
* don't use index signature in simulator.js ([#5897](https://github.com/googlechrome/lighthouse/pull/5897))
* update debugger protocol type checking ([#5836](https://github.com/googlechrome/lighthouse/pull/5836))
* remove more reliance on implicit index signatures ([#5874](https://github.com/googlechrome/lighthouse/pull/5874))
* update types in emulation.js ([#5830](https://github.com/googlechrome/lighthouse/pull/5830))
* tighten traceOfTab timing types ([#5887](https://github.com/googlechrome/lighthouse/pull/5887))
* update to ts 3.1 to support new protocol defs ([#5942](https://github.com/googlechrome/lighthouse/pull/5942))
* update to latest tsc ([#5581](https://github.com/googlechrome/lighthouse/pull/5581))
* NetworkRequest.RESOURCE_TYPES type fix ([#5851](https://github.com/googlechrome/lighthouse/pull/5851))
* add explicit index signature in mainthread-work-breakdown ([#5859](https://github.com/googlechrome/lighthouse/pull/5859))
* cli: make LH.Flags type correct and consistent ([#5849](https://github.com/googlechrome/lighthouse/pull/5849))

## Report

* link to our own "unused css" reference doc ([#5698](https://github.com/googlechrome/lighthouse/pull/5698))
* expose prepareLabData directly as a fn ([#5818](https://github.com/googlechrome/lighthouse/pull/5818))
* responsive styles ([#5706](https://github.com/googlechrome/lighthouse/pull/5706))
* add PSI.prepareLabData() ([#5804](https://github.com/googlechrome/lighthouse/pull/5804))
* adopt 80-char line-length license ([#5757](https://github.com/googlechrome/lighthouse/pull/5757))
* add method to get the final screenshot ([#5673](https://github.com/googlechrome/lighthouse/pull/5673))
* metrics: display metrics in seconds ([#5914](https://github.com/googlechrome/lighthouse/pull/5914))
* psi: add Util.prepareReportResult method ([#5766](https://github.com/googlechrome/lighthouse/pull/5766))
* psi: reset template styles on every call of prepareLabData ([#5877](https://github.com/googlechrome/lighthouse/pull/5877))
* psi: add lab data summary sentence ([#5961](https://github.com/googlechrome/lighthouse/pull/5961))

## New Audits

* a11y: add manual audit for interactive element affordance ([#5764](https://github.com/googlechrome/lighthouse/pull/5764))

## Tests

* quiet down collect-scripts during CI ([#5801](https://github.com/googlechrome/lighthouse/pull/5801))
* better display value tests with i18n ([#5720](https://github.com/googlechrome/lighthouse/pull/5720))
* dbw: remove createShadowRoot call ([#5906](https://github.com/googlechrome/lighthouse/pull/5906))
* jest: disable coverage collection by default ([#5772](https://github.com/googlechrome/lighthouse/pull/5772))
* smokehouse: update expectations for HTML Imports deprecation ([#5943](https://github.com/googlechrome/lighthouse/pull/5943))
* smokehouse: update passive listener expectations ([#5899](https://github.com/googlechrome/lighthouse/pull/5899))

## Deps

* snyk: update snyk snapshot ([#5774](https://github.com/googlechrome/lighthouse/pull/5774)), ([#5773](https://github.com/googlechrome/lighthouse/pull/5773)), ([#5762](https://github.com/googlechrome/lighthouse/pull/5762)), ([#5691](https://github.com/googlechrome/lighthouse/pull/5691))
* depend on speedline-core, rather than the cli ([#5800](https://github.com/googlechrome/lighthouse/pull/5800))


## Docs

* headless: Require Node 8 and apt install chromium ([#5974](https://github.com/googlechrome/lighthouse/pull/5974))
* headless: example script to post report as gist ([#5975](https://github.com/googlechrome/lighthouse/pull/5975))\
* integrations: Add SpeedCurve to "Lighthouse Integrations" ([#5732](https://github.com/googlechrome/lighthouse/pull/5732))
* link FCP audit description to lighthouse docs ([#5850](https://github.com/googlechrome/lighthouse/pull/5850))
* puppeteer: remove appMode mention ([#5923](https://github.com/googlechrome/lighthouse/pull/5923))
* readme: mention chrome-flags troubleshooting in getting started ([#5916](https://github.com/googlechrome/lighthouse/pull/5916))
* report: add a renderer readme ([#5725](https://github.com/googlechrome/lighthouse/pull/5725))
* scoring: http2 redirect PWA score issue ([#5929](https://github.com/googlechrome/lighthouse/pull/5929))

## Misc

* cli: enableErrorReporting must be undefined by default ([#5854](https://github.com/googlechrome/lighthouse/pull/5854))
* asset-saver: tweak output format of logAssets ([#5696](https://github.com/googlechrome/lighthouse/pull/5696))
* logger: add time/timeEnd methods ([#5905](https://github.com/googlechrome/lighthouse/pull/5905))
* fix grocers apostrophe typo (API's v APIs) ([#5948](https://github.com/googlechrome/lighthouse/pull/5948))

 <a name="3.0.3"></a>
# 3.0.3 (2018-07-17)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v3.0.2...v3.0.3)

## Core

* emulation: use setTouchEmulationEnabled ([#5661](https://github.com/googlechrome/lighthouse/pull/5661))
* response-compression: graceful recovery ([#5578](https://github.com/googlechrome/lighthouse/pull/5578))
* simulator: add DNS timing ([#5607](https://github.com/googlechrome/lighthouse/pull/5607))

## Misc

* convert strings to NetworkRequest.TYPES ([#5674](https://github.com/googlechrome/lighthouse/pull/5674))
* sentry: lower "could not load stylesheet" sampling to 0.01 ([#5677](https://github.com/googlechrome/lighthouse/pull/5677))

<a name="3.0.2"></a>
# 3.0.2 (2018-07-11)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v3.0.1...v3.0.2)

## New Contributors!
Thanks to @schalkneethling and @eduardosada for their first contributions!

## New Audits

* assert a present and valid doctype ([#5274](https://github.com/googlechrome/lighthouse/pull/5274))

## Core

* fonts: bump gatherer timeout to 5s ([#5643](https://github.com/googlechrome/lighthouse/pull/5643))
* network-request: cleanup DevTools property names ([#5606](https://github.com/googlechrome/lighthouse/pull/5606))
* preload: remove blob protocol from preload audit ([#5409](https://github.com/googlechrome/lighthouse/pull/5409))
* without-javascript: allow noscript pages ([#5571](https://github.com/googlechrome/lighthouse/pull/5571))

## Docs

* architecture: add diagram of module dependencies ([#5615](https://github.com/googlechrome/lighthouse/pull/5615))
* custom-audit: update custom-audit to 3.0.0 api ([#5612](https://github.com/googlechrome/lighthouse/pull/5612))
* [minor] issue template tweaks ([#5641](https://github.com/googlechrome/lighthouse/pull/5641))

## Extension

* fix "extension Error: couldn't resolve current tab" ([#5591](https://github.com/googlechrome/lighthouse/pull/5591))
* 3.0.0 as well ([#5584](https://github.com/googlechrome/lighthouse/pull/5584))

## Tests

* [minor] rename robots.txt test file ([#5610](https://github.com/googlechrome/lighthouse/pull/5610))
* run the golden LHR check earlier ([#5609](https://github.com/googlechrome/lighthouse/pull/5609))

## Misc

* scripts: more succinct lantern output ([#5523](https://github.com/googlechrome/lighthouse/pull/5523))

 <a name="3.0.1"></a>
# 3.0.1 (2018-07-02)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v3.0.0...v3.0.1)

## Core

* fonts: handle CORS cssRules ([#5592](https://github.com/googlechrome/lighthouse/pull/5592))

## Tests

* adopt jest (leaving mocha) for core & cli ([#5386](https://github.com/googlechrome/lighthouse/pull/5386))

 <a name="3.0.0"></a>
# 3.0.0 Final (2018-06-29)
[Changelog of v3.0.0-beta.0 to 3.0 final](https://github.com/googlechrome/lighthouse/compare/v3.0.0-beta.0...v3.0.0)

## New Contributors!
Thanks to @underbyte, @nourikhalass and @ernstmul for their first contributions! Awesome stuff.

## Core

* a11y: add back html/tags/impact ([#5439](https://github.com/googlechrome/lighthouse/pull/5439))
* audit: align meta properties with LHR ([#5540](https://github.com/googlechrome/lighthouse/pull/5540))
* audit-mode: do not require a URL ([#5495](https://github.com/googlechrome/lighthouse/pull/5495))
* driver: [minor] fix spelling of evaluate ([#5553](https://github.com/googlechrome/lighthouse/pull/5553))
* fcp: fix scoring curve ([#5507](https://github.com/googlechrome/lighthouse/pull/5507))
* image-aspect-ratio: loosen ratio check ([#5358](https://github.com/googlechrome/lighthouse/pull/5358))
* lhr: migrate opportunity details to new format ([#5296](https://github.com/googlechrome/lighthouse/pull/5296))
* main-resource: work with hash URLs ([#5422](https://github.com/googlechrome/lighthouse/pull/5422))
* multi-check: expose manifest checks in details ([#5405](https://github.com/googlechrome/lighthouse/pull/5405))
* network-requests: handle negative endTime ([#5530](https://github.com/googlechrome/lighthouse/pull/5530))
* offscreen-images: add lantern filter ([#5361](https://github.com/googlechrome/lighthouse/pull/5361))
* opportunities: more granular score ([#5331](https://github.com/googlechrome/lighthouse/pull/5331))
* preload: only allow same origin (domain + subdomains) ([#5065](https://github.com/googlechrome/lighthouse/pull/5065))
* pwa: revamp and move short_name_length audit ([#4860](https://github.com/googlechrome/lighthouse/pull/4860))
* pwa: adjust score weights ([#5233](https://github.com/googlechrome/lighthouse/pull/5233))
* faster saveTrace by streaming 500 events at a time ([#5387](https://github.com/googlechrome/lighthouse/pull/5387))
* convert requestIds before sending to backend ([#5580](https://github.com/googlechrome/lighthouse/pull/5580))
* remove dependency on DevtoolsTimelineModel ([#5533](https://github.com/googlechrome/lighthouse/pull/5533))
* remove no-mutation-events audit ([#5509](https://github.com/googlechrome/lighthouse/pull/5509))
* remove WebInspector.resourceTypes references ([#5556](https://github.com/googlechrome/lighthouse/pull/5556))
* [minor] migrate remaining .description -> .title ([cee9d55](https://github.com/googlechrome/lighthouse/commit/cee9d55))
* support traces with TracingStartedInBrowser event ([#5271](https://github.com/googlechrome/lighthouse/pull/5271))
* remove dependency on devtools-frontend NetworkRequest ([#5451](https://github.com/googlechrome/lighthouse/pull/5451))
* convert gather-runner.js to async/await ([#5462](https://github.com/googlechrome/lighthouse/pull/5462))
* handle DOM.resolveNode errors ([#5427](https://github.com/googlechrome/lighthouse/pull/5427))
* split out BaseArtifacts, those always provided by LH itself ([#5506](https://github.com/googlechrome/lighthouse/pull/5506))
* simulator: convert node timings to trace ([#5350](https://github.com/googlechrome/lighthouse/pull/5350))
* simulator: improved timing typedef ([#5347](https://github.com/googlechrome/lighthouse/pull/5347))
* trace-of-tab: remove DevTools stableSort dependency ([#5532](https://github.com/googlechrome/lighthouse/pull/5532))
* traces: move findTracingStartedEvt to tracingProcessor ([4826a77](https://github.com/googlechrome/lighthouse/commit/4826a77))
* tsc: make CPUNode and NetworkNode a discriminated union ([#5548](https://github.com/googlechrome/lighthouse/pull/5548))
* tsc: use Config class to define Config type ([#5525](https://github.com/googlechrome/lighthouse/pull/5525))
* tsc: add initial trivial type info to config.js ([#5481](https://github.com/googlechrome/lighthouse/pull/5481))
* tsc: refactor config.js (and add type checking) ([#5486](https://github.com/googlechrome/lighthouse/pull/5486))
* tsc: migrate renderer & viewer off typedefs to .d.ts ([#5342](https://github.com/googlechrome/lighthouse/pull/5342))
* user-timings: add back startTime ([#5442](https://github.com/googlechrome/lighthouse/pull/5442))

## Deps

* bump gulp's `natives` dep for node 10.4 compat ([#5497](https://github.com/googlechrome/lighthouse/pull/5497))

## Docs

* update required chrome version ([#5425](https://github.com/googlechrome/lighthouse/pull/5425))
* update docs for v3 ([#5357](https://github.com/googlechrome/lighthouse/pull/5357))
* audit: add jsdoc descriptions to the audit meta properties ([#5567](https://github.com/googlechrome/lighthouse/pull/5567))
* readme: lighthouse-ci ([#5410](https://github.com/googlechrome/lighthouse/pull/5410))
* scoring: update metric explanations ([#5528](https://github.com/googlechrome/lighthouse/pull/5528))

## Extension

* popup: integration test for popup ([#5412](https://github.com/googlechrome/lighthouse/pull/5412))
* tsc: add type checking to extension entry points ([#5346](https://github.com/googlechrome/lighthouse/pull/5346))
* expose devtools hooks reliably ([#5579](https://github.com/googlechrome/lighthouse/pull/5579))
* allow use of ES2018 features ([#5377](https://github.com/googlechrome/lighthouse/pull/5377))
* update minimum Chrome version to 66 ([#5403](https://github.com/googlechrome/lighthouse/pull/5403))
* close the popup once the report has opened ([#5341](https://github.com/googlechrome/lighthouse/pull/5341))

## Tests

* lantern: add lantern regression test scripts ([#5435](https://github.com/googlechrome/lighthouse/pull/5435))
* fix golden LHR ([#5529](https://github.com/googlechrome/lighthouse/pull/5529))
* smoke: remove console.timeline() call ([#5560](https://github.com/googlechrome/lighthouse/pull/5560))

## Misc

* externs: import crdp from root node_modules ([#5366](https://github.com/googlechrome/lighthouse/pull/5366))
* golden-lhr: exclude audit descriptions ([#5538](https://github.com/googlechrome/lighthouse/pull/5538))
* scripts: more useful lantern debugging output ([#5517](https://github.com/googlechrome/lighthouse/pull/5517))
* viewer: load *.json if no *.lighthouse.report.json ([#5343](https://github.com/googlechrome/lighthouse/pull/5343))
* update codeowners file ([#5564](https://github.com/googlechrome/lighthouse/pull/5564))
* move metrics into dedicated metrics/ folder ([9def0a6](https://github.com/googlechrome/lighthouse/commit/9def0a6))
* needs NPM as well as Node installed ([114ebf5](https://github.com/googlechrome/lighthouse/commit/114ebf5))
* add links to lighthouse docs ([c7304a7](https://github.com/googlechrome/lighthouse/commit/c7304a7))

 <a name="3.0.0-beta.0"></a>
# 3.0.0-beta.0 (2018-05-24)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v3.0.0-alpha.2...v3.0.0-beta.0)

## Core

* lantern: handle disk cache simulation ([#5221](https://github.com/googlechrome/lighthouse/pull/5221))
* network-recorder: handle QUIC requests ([#5256](https://github.com/googlechrome/lighthouse/pull/5256))
* tsc: add type checking to viewer ([#5258](https://github.com/googlechrome/lighthouse/pull/5258))
* tsc: add tsc type checking to report ([#5195](https://github.com/googlechrome/lighthouse/pull/5195))

## Deps

* snyk: prettify snyk snapshot ([#5080](https://github.com/googlechrome/lighthouse/pull/5080))

## Docs

* readme: add Garie to related projects ([#5272](https://github.com/googlechrome/lighthouse/pull/5272))

## Extension

* expose URL shim ([#5293](https://github.com/googlechrome/lighthouse/pull/5293))
* another speculative fix for getCurrentTabURL; more logging ([#5323](https://github.com/googlechrome/lighthouse/pull/5323))

## Report

* updates for devtools roll ([#5326](https://github.com/googlechrome/lighthouse/pull/5326))
* audit warnings are no longer top-level ([#5270](https://github.com/googlechrome/lighthouse/pull/5270))
* move runtime settings to footer ([#5295](https://github.com/googlechrome/lighthouse/pull/5295))
* avoid paint storms on scrolly header ([#5207](https://github.com/googlechrome/lighthouse/pull/5207))
* restore missing non-applicable icon ([#5267](https://github.com/googlechrome/lighthouse/pull/5267))
* animated chevrons ([#5137](https://github.com/googlechrome/lighthouse/pull/5137))
* DRY up audit & opportunity rendering ([#5136](https://github.com/googlechrome/lighthouse/pull/5136))

## Misc

* github: add github PR and issue templates ([#5163](https://github.com/googlechrome/lighthouse/pull/5163))
* plots: extend default config ([#5309](https://github.com/googlechrome/lighthouse/pull/5309))
* scripts: add lantern evaluation scripts ([#5257](https://github.com/googlechrome/lighthouse/pull/5257))
* scripts: add trace/devtoolslog minification scripts ([#5237](https://github.com/googlechrome/lighthouse/pull/5237))
* viewer: fix saving as gist ([#5251](https://github.com/googlechrome/lighthouse/pull/5251))
* remove checkboxes from bug report template ([#5330](https://github.com/googlechrome/lighthouse/pull/5330))

 <a name="3.0.0-alpha.2"></a>
# 3.0.0-alpha.2 (2018-05-16)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v3.0.0-alpha...v3.0.0-alpha.2)

## Core

* lhr: audit id, title, description ([#5190](https://github.com/googlechrome/lighthouse/pull/5190))
* lhr: revert default wait bump ([06205ef](https://github.com/googlechrome/lighthouse/commit/06205ef))
* uses-preload: prevent infinite loop ([#5184](https://github.com/googlechrome/lighthouse/pull/5184))
* violation-audit: de-dupe items by URL and label ([#5219](https://github.com/googlechrome/lighthouse/pull/5219))

## Docs

* readme: add lighthouse-lambda to related projects ([#5227](https://github.com/googlechrome/lighthouse/pull/5227))

## Report

* dom-size: use correct learn more link ([#5192](https://github.com/googlechrome/lighthouse/pull/5192))
* header: fix stacking contexts within header ([#5185](https://github.com/googlechrome/lighthouse/pull/5185))
* minimum time scale for opportunities & filmstrip ([#5183](https://github.com/googlechrome/lighthouse/pull/5183))

## Tests

* compile: fix broken compile-devtools script ([#5234](https://github.com/googlechrome/lighthouse/pull/5234))
* viewer: upgrade pptr to handle new CSSOM use in the report ([#5191](https://github.com/googlechrome/lighthouse/pull/5191))

## Misc

* npmignore: include chrome launcher script ([aa0e089](https://github.com/googlechrome/lighthouse/commit/aa0e089))
* viewer: switch to 2x viewer within the same tab ([#5231](https://github.com/googlechrome/lighthouse/pull/5231))
* viewer: support legacy 2.x reports in viewer ([#5204](https://github.com/googlechrome/lighthouse/pull/5204))
* closure cleanup in viewer from #5231 ([#5235](https://github.com/googlechrome/lighthouse/pull/5235))
* 3.0.0-alpha.1 ([c7c0044](https://github.com/googlechrome/lighthouse/commit/c7c0044))

 <a name="3.0.0-alpha"></a>
# 3.0.0-alpha (2018-05-09)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.9.1...v3.0.0-alpha)

## New Audits

* robots-txt: /robots.txt validation ([#4845](https://github.com/googlechrome/lighthouse/pull/4845))
* efficient-animated-content, use videos instead of gifs ([#4885](https://github.com/googlechrome/lighthouse/pull/4885))
* add preconnect audit (avoid costly origin roundtrips) ([#4362](https://github.com/googlechrome/lighthouse/pull/4362))

## CLI

* chore: remove chrome-launcher stubs ([#4945](https://github.com/googlechrome/lighthouse/pull/4945))
* output: Add ability to export results to CSV ([#4912](https://github.com/googlechrome/lighthouse/pull/4912))
* update documented throttling flags ([#5000](https://github.com/googlechrome/lighthouse/pull/5000))

## Core

* byte-efficiency: use lantern for opportunity estimates ([#4601](https://github.com/googlechrome/lighthouse/pull/4601))
* canonical-audit: allow multiple identical canonical links ([#4973](https://github.com/googlechrome/lighthouse/pull/4973))
* category: add manualDescription ([#5100](https://github.com/googlechrome/lighthouse/pull/5100))
* computed-artifact: remove requiredNumberOfArtifacts ([#4764](https://github.com/googlechrome/lighthouse/pull/4764))
* config: add support for audit/gatherer options ([#4394](https://github.com/googlechrome/lighthouse/pull/4394))
* config: remove config.artifacts; always use auditMode ([#4986](https://github.com/googlechrome/lighthouse/pull/4986))
* config: clean flags for config settings ([#4960](https://github.com/googlechrome/lighthouse/pull/4960))
* config: augment settings/passes with defaults ([#4894](https://github.com/googlechrome/lighthouse/pull/4894))
* config: switch to throttling settings object ([#4879](https://github.com/googlechrome/lighthouse/pull/4879))
* config: switch to lantern by default, add presets ([#5041](https://github.com/googlechrome/lighthouse/pull/5041))
* critical-request-chains: exclude preloaded requests from crc ([#5011](https://github.com/googlechrome/lighthouse/pull/5011))
* displayValue: fancier displayValue type ([#5111](https://github.com/googlechrome/lighthouse/pull/5111))
* domstats: useIsolation within domstats ([#4811](https://github.com/googlechrome/lighthouse/pull/4811))
* driver: add timeout to getRequestContent ([#4718](https://github.com/googlechrome/lighthouse/pull/4718))
* emulation: update Chrome userAgent to 66 ([#4779](https://github.com/googlechrome/lighthouse/pull/4779))
* estimated-input-latency: use a 5s rolling window ([#4989](https://github.com/googlechrome/lighthouse/pull/4989))
* fast-config: bring back a11y & SEO categories ([#4932](https://github.com/googlechrome/lighthouse/pull/4932))
* font-size: recalibrate the legible font sizes ([#4550](https://github.com/googlechrome/lighthouse/pull/4550))
* http-redirect: drop use of getSecurityState() to gain Android support ([#4661](https://github.com/googlechrome/lighthouse/pull/4661))
* image-usage: use min of resourceSize/transferSize ([#4968](https://github.com/googlechrome/lighthouse/pull/4968))
* img-usage: handle invalid images within determineNaturalSize ([#4812](https://github.com/googlechrome/lighthouse/pull/4812))
* is-crawlable: fix empty row in the details table ([#4820](https://github.com/googlechrome/lighthouse/pull/4820))
* is-crawlable: determine if page indexing is blocked by robots.txt ([#4548](https://github.com/googlechrome/lighthouse/pull/4548))
* is-on-https: consider about:* secure ([#4749](https://github.com/googlechrome/lighthouse/pull/4749))
* lantern: cleanup Simulator construction ([#4910](https://github.com/googlechrome/lighthouse/pull/4910))
* lantern: more flexible graph edge creation ([#4933](https://github.com/googlechrome/lighthouse/pull/4933))
* lantern: move metrics to computed artifacts ([#4766](https://github.com/googlechrome/lighthouse/pull/4766))
* lantern: improve RTT estimates ([#4552](https://github.com/googlechrome/lighthouse/pull/4552))
* lantern: use securityOrigin on record ([#5071](https://github.com/googlechrome/lighthouse/pull/5071))
* lantern: never exclude main document from graphs ([#5124](https://github.com/googlechrome/lighthouse/pull/5124))
* lantern: rename Simulation.Result.nodeTiming to be plural ([#5038](https://github.com/googlechrome/lighthouse/pull/5038))
* lhr: eliminate cards and list details ([#4789](https://github.com/googlechrome/lighthouse/pull/4789))
* lhr: convert reportCategories to categories object ([#5155](https://github.com/googlechrome/lighthouse/pull/5155))
* lhr: support printf displayValues ([#5099](https://github.com/googlechrome/lighthouse/pull/5099))
* lhr: rename perf-hint, perf-info, etc ([#5102](https://github.com/googlechrome/lighthouse/pull/5102))
* lhr: make reportCategories shallow; move audit scores to AuditResult ([#4711](https://github.com/googlechrome/lighthouse/pull/4711))
* lhr: support null scores ([#5128](https://github.com/googlechrome/lighthouse/pull/5128))
* lhr: s/initialUrl/requestedUrl, s/url/finalUrl ([#5127](https://github.com/googlechrome/lighthouse/pull/5127))
* lhr: s/audits/auditRefs, s/category.name/category.title/ ([#5157](https://github.com/googlechrome/lighthouse/pull/5157))
* lhr: strictly numeric scores, add scoreDisplayMode ([#4690](https://github.com/googlechrome/lighthouse/pull/4690))
* lhr: move runtime config to report => lhr.configSettings ([#5122](https://github.com/googlechrome/lighthouse/pull/5122))
* lhr: remove extendedInfo ([#5160](https://github.com/googlechrome/lighthouse/pull/5160))
* lhr: drop informative/manual, moving them to scoreDisplayMode ([#5105](https://github.com/googlechrome/lighthouse/pull/5105))
* lhr: overhaul LHR details, introduce details.summary ([#4616](https://github.com/googlechrome/lighthouse/pull/4616))
* lhr: remove debugString, add explantion/errorMessage ([#5132](https://github.com/googlechrome/lighthouse/pull/5132))
* lhr: s/fetchedAt/fetchTime ([#5112](https://github.com/googlechrome/lighthouse/pull/5112))
* lhr: lhr-lite type declaration ([#4983](https://github.com/googlechrome/lighthouse/pull/4983))
* lhr: overallSavingsMs, overallSavingsBytes ([#5035](https://github.com/googlechrome/lighthouse/pull/5035))
* load-fast-4-pwa: use computed artifacts ([#4981](https://github.com/googlechrome/lighthouse/pull/4981))
* main-resource: adjust main resource identification logic ([#4475](https://github.com/googlechrome/lighthouse/pull/4475))
* mainthreadwork: multiply by cpuSlowdownMultiplier ([#5126](https://github.com/googlechrome/lighthouse/pull/5126))
* metrics: consumable metrics audit output ([#5101](https://github.com/googlechrome/lighthouse/pull/5101))
* metrics: move TTCI to computed artifact ([#4943](https://github.com/googlechrome/lighthouse/pull/4943))
* metrics: switch to speedIndex from perceptualSpeedIndex ([#4980](https://github.com/googlechrome/lighthouse/pull/4980))
* metrics: add lantern speed index ([#4695](https://github.com/googlechrome/lighthouse/pull/4695))
* metrics: update lantern coefficients ([#5120](https://github.com/googlechrome/lighthouse/pull/5120))
* metrics: move first-interactive to first-cpu-idle ([#4982](https://github.com/googlechrome/lighthouse/pull/4982))
* metrics: rename ConsistentlyInteractive -> Interactive ([#5068](https://github.com/googlechrome/lighthouse/pull/5068))
* metrics: add lantern EIL ([#5024](https://github.com/googlechrome/lighthouse/pull/5024))
* metrics: add FCP metric ([#4948](https://github.com/googlechrome/lighthouse/pull/4948))
* metrics: add first CPU idle lantern metric ([#4966](https://github.com/googlechrome/lighthouse/pull/4966))
* metrics: move FMP to computed artifact ([#4951](https://github.com/googlechrome/lighthouse/pull/4951))
* network-analyzer: more distrustful of chrome connection info ([#4828](https://github.com/googlechrome/lighthouse/pull/4828))
* network-recorder: fix typo in once() call on super ([#4926](https://github.com/googlechrome/lighthouse/pull/4926))
* response-compression: also check x-original-content-encoding ([#4607](https://github.com/googlechrome/lighthouse/pull/4607))
* unify config and CLI settings ([#4849](https://github.com/googlechrome/lighthouse/pull/4849))
* network-requests: add resource type ([#4743](https://github.com/googlechrome/lighthouse/pull/4743))
* network-requests: add network requests audit ([#4631](https://github.com/googlechrome/lighthouse/pull/4631))
* noopener-audit: allow noreferrer as well ([#4920](https://github.com/googlechrome/lighthouse/pull/4920))
* opportunities: take max of savings on TTI, load ([#5084](https://github.com/googlechrome/lighthouse/pull/5084))
* preconnect: use lantern to compute savings ([#5070](https://github.com/googlechrome/lighthouse/pull/5070))
* preload: use lantern to compute savings ([#5062](https://github.com/googlechrome/lighthouse/pull/5062))
* redirects: use lantern to compute savings ([#5081](https://github.com/googlechrome/lighthouse/pull/5081))
* render-blocking: address followup feedback ([#5039](https://github.com/googlechrome/lighthouse/pull/5039))
* render-blocking: handle amp-style stylesheets ([#4555](https://github.com/googlechrome/lighthouse/pull/4555))
* runner: split lhr, artifacts return, respect output type ([#4999](https://github.com/googlechrome/lighthouse/pull/4999))
* runner: support multiple output modes ([#5154](https://github.com/googlechrome/lighthouse/pull/5154))
* runner: add custom folder support to -G/-A ([#4792](https://github.com/googlechrome/lighthouse/pull/4792))
* runner: rename generatedTime to fetchedAt ([#4783](https://github.com/googlechrome/lighthouse/pull/4783))
* scoring: tweak performance weights ([#5083](https://github.com/googlechrome/lighthouse/pull/5083))
* scoring: loosen metric thresholds ([#5092](https://github.com/googlechrome/lighthouse/pull/5092))
* scoring: tweak scoring thresholds based on HTTPArchive data ([#5022](https://github.com/googlechrome/lighthouse/pull/5022))
* screenshots: align filmstrip to observed metrics ([#4965](https://github.com/googlechrome/lighthouse/pull/4965))
* seo: link to "meta description" reference ([#4566](https://github.com/googlechrome/lighthouse/pull/4566))
* start_url: fix start_url audit while offline ([#4710](https://github.com/googlechrome/lighthouse/pull/4710))
* start-url: use window.location over fetch ([#5159](https://github.com/googlechrome/lighthouse/pull/5159))
* tsc: more type checking of top-level audits ([#5089](https://github.com/googlechrome/lighthouse/pull/5089))
* tsc: add type checking to dbw audits ([#5069](https://github.com/googlechrome/lighthouse/pull/5069))
* tsc: update for new @types/css-font-loading-module ([#5061](https://github.com/googlechrome/lighthouse/pull/5061))
* tsc: add type checking to Driver ([#4827](https://github.com/googlechrome/lighthouse/pull/4827))
* tsc: add type checking to gather-runner ([#4944](https://github.com/googlechrome/lighthouse/pull/4944))
* tsc: add type checking to asset-saver ([#4949](https://github.com/googlechrome/lighthouse/pull/4949))
* tsc: add types for DevtoolsLog and NetworkRecorder ([#4918](https://github.com/googlechrome/lighthouse/pull/4918))
* tsc: add type defs for Chrome Remote Debugging Protocol ([#4816](https://github.com/googlechrome/lighthouse/pull/4816))
* tsc: add type checking to remote protocol commands ([#4914](https://github.com/googlechrome/lighthouse/pull/4914))
* tsc: add type checking to fonts gatherer ([#5018](https://github.com/googlechrome/lighthouse/pull/5018))
* tsc: add type checking to use of CRDP events ([#4886](https://github.com/googlechrome/lighthouse/pull/4886))
* tsc: add type checking to dbw gatherers ([#5005](https://github.com/googlechrome/lighthouse/pull/5005))
* tsc: add type checking to most byte efficiency audits ([#5072](https://github.com/googlechrome/lighthouse/pull/5072))
* tsc: add type checking of first top-level audits ([#5086](https://github.com/googlechrome/lighthouse/pull/5086))
* tsc: fix OptimizedImages type; type check dep audits ([#5129](https://github.com/googlechrome/lighthouse/pull/5129))
* tsc: add type checking to seo gatherers ([#4991](https://github.com/googlechrome/lighthouse/pull/4991))
* tsc: add type checking to a11y and manual audits ([#5055](https://github.com/googlechrome/lighthouse/pull/5055))
* tsc: fix ImageUsage artifact type and gather bug ([#5113](https://github.com/googlechrome/lighthouse/pull/5113))
* tsc: add type checking to remaining top-level audits ([#5090](https://github.com/googlechrome/lighthouse/pull/5090))
* tsc: add type checking to computed artifacts ([#5051](https://github.com/googlechrome/lighthouse/pull/5051))
* tsc: add type checking to runner ([#4961](https://github.com/googlechrome/lighthouse/pull/4961))
* tsc: gather type-checking cleanup ([#5019](https://github.com/googlechrome/lighthouse/pull/5019))
* tsc: add type checking for seo audits ([#5103](https://github.com/googlechrome/lighthouse/pull/5103))
* add type checking to audit and gatherer base classes ([#4762](https://github.com/googlechrome/lighthouse/pull/4762))
* tsc: add type checking to many core gatherers ([#4975](https://github.com/googlechrome/lighthouse/pull/4975))
* convert diagnostics to numeric scores ([#4778](https://github.com/googlechrome/lighthouse/pull/4778))
* remove cache-start-url audit ([#4760](https://github.com/googlechrome/lighthouse/pull/4760))
* audit.details features numbers, not strings. introduce itemKey ([#4384](https://github.com/googlechrome/lighthouse/pull/4384))
* add default audit options for scores ([#4927](https://github.com/googlechrome/lighthouse/pull/4927))
* look up custom gatherer relative to the config file path ([#4751](https://github.com/googlechrome/lighthouse/pull/4751))
* add type checking to connection ([#4738](https://github.com/googlechrome/lighthouse/pull/4738))
* make url-shim extend native URL module; add type checking ([#4712](https://github.com/googlechrome/lighthouse/pull/4712))
* merge render blocking audits to lantern ([#4995](https://github.com/googlechrome/lighthouse/pull/4995))
* bump version to 3.0 alpha ([#5082](https://github.com/googlechrome/lighthouse/pull/5082))
* de-dupe URLs in is-on-http, uses-http2 ([#4950](https://github.com/googlechrome/lighthouse/pull/4950))
* rename uses-request-compression ([#4763](https://github.com/googlechrome/lighthouse/pull/4763))
* tti: update ignorable network requests and use FCP ([#5021](https://github.com/googlechrome/lighthouse/pull/5021))
* webapp-install: simplify start_url warning when no SW is found ([#5067](https://github.com/googlechrome/lighthouse/pull/5067))

## Deps

* axe-core: update axe-core to 3.0.0-beta.2 release ([#4595](https://github.com/googlechrome/lighthouse/pull/4595))
* browserify: update deep transitive dep to use recent acorn ([#4813](https://github.com/googlechrome/lighthouse/pull/4813))
* browserify: bump browserify for async/await ([#4767](https://github.com/googlechrome/lighthouse/pull/4767))
* extension: bump browserify version and sub-deps ([#5076](https://github.com/googlechrome/lighthouse/pull/5076))
* robots-parser: patch robots-parser to work in browser env ([#4819](https://github.com/googlechrome/lighthouse/pull/4819))
* snyk: update snyk snapshot ([#5074](https://github.com/googlechrome/lighthouse/pull/5074))
* speedline: use speedline's types instead of our own ([#5078](https://github.com/googlechrome/lighthouse/pull/5078))

## Docs

* contributing: fix link for closure annotations ([#4680](https://github.com/googlechrome/lighthouse/pull/4680))
* headless-chrome: switch to prioritize headless ([#4553](https://github.com/googlechrome/lighthouse/pull/4553))
* headless-chrome.md: fix broken link ([#4523](https://github.com/googlechrome/lighthouse/pull/4523))
* programmatic: add caveat about removing artifacts ([#4540](https://github.com/googlechrome/lighthouse/pull/4540))
* readme: remove ts command for lighthouse-cli dev ([#5088](https://github.com/googlechrome/lighthouse/pull/5088))
* readme: Bye Bye Greta ([#5036](https://github.com/googlechrome/lighthouse/pull/5036))
* releasing: updates ([fcec593](https://github.com/googlechrome/lighthouse/commit/fcec593))
* update docker image id ([f092a8a](https://github.com/googlechrome/lighthouse/commit/f092a8a))
* remove dated domhtml reference from README ([#4900](https://github.com/googlechrome/lighthouse/pull/4900))
* "LHR" is "Lighthouse Result" ([8861386](https://github.com/googlechrome/lighthouse/commit/8861386))
* add html report overview writeup ([#5059](https://github.com/googlechrome/lighthouse/pull/5059))
* report: minor fix of markdown link ([#5063](https://github.com/googlechrome/lighthouse/pull/5063))
* understanding-results: description can dynamically be the failureDescription ([cc53688](https://github.com/googlechrome/lighthouse/commit/cc53688))

## Extension

* compilation: add object rest support ([#4954](https://github.com/googlechrome/lighthouse/pull/4954))
* tests: add extension pptr smoketest ([#4640](https://github.com/googlechrome/lighthouse/pull/4640))
* add checkbox for using Lantern/DevTools throttling ([#5156](https://github.com/googlechrome/lighthouse/pull/5156))
* pass flags through to config ([#4936](https://github.com/googlechrome/lighthouse/pull/4936))
* use browserify url library ([#4875](https://github.com/googlechrome/lighthouse/pull/4875))
* polish the status updates within the popup ([#4780](https://github.com/googlechrome/lighthouse/pull/4780))
* fix issue where gatheres cannot be found ([#4592](https://github.com/googlechrome/lighthouse/pull/4592))

## Report

* bootup-time: fix learn more link ([#4962](https://github.com/googlechrome/lighthouse/pull/4962))
* score gauges, metrics display, add rich tooltips ([#5009](https://github.com/googlechrome/lighthouse/pull/5009))
* category: enable all categories to show audit groups, refactor CategoryRenderer ([#4278](https://github.com/googlechrome/lighthouse/pull/4278))
* final metrics display, icons, whitespace polish ([#5130](https://github.com/googlechrome/lighthouse/pull/5130))
* improved text-wrapping ([#5138](https://github.com/googlechrome/lighthouse/pull/5138))
* new audit list display, indexes & new icons ([#5109](https://github.com/googlechrome/lighthouse/pull/5109))
* error'd audits get 'Error!' treatment ([#5077](https://github.com/googlechrome/lighthouse/pull/5077))
* add docs link to bootup-time audit ([#4537](https://github.com/googlechrome/lighthouse/pull/4537))
* tweak tooltips ([2993522](https://github.com/googlechrome/lighthouse/commit/2993522))
* add auditIds to DOM. update pptr tests to assert against them ([#5058](https://github.com/googlechrome/lighthouse/pull/5058))
* rework the DOM of audits ([#5045](https://github.com/googlechrome/lighthouse/pull/5045))
* only appendScoreScale to scoreHeader if it exists ([#5040](https://github.com/googlechrome/lighthouse/pull/5040))
* move html report from v2/ dir to html/ ([#5034](https://github.com/googlechrome/lighthouse/pull/5034))
* audit details not longer collapsible. fixup width and margin ([#5151](https://github.com/googlechrome/lighthouse/pull/5151))
* update link to rel=canonical reference ([#4701](https://github.com/googlechrome/lighthouse/pull/4701))
* implement new design for opportunities ([#5115](https://github.com/googlechrome/lighthouse/pull/5115))
* fix audit description typos ([#4882](https://github.com/googlechrome/lighthouse/pull/4882))
* update SEO audit descriptions & links ([#4903](https://github.com/googlechrome/lighthouse/pull/4903))
* add jsdoc for lhr.artifacts ([#4859](https://github.com/googlechrome/lighthouse/pull/4859))
* new header branding ([#5125](https://github.com/googlechrome/lighthouse/pull/5125))
* description: update helpText for document.title audit ([#4677](https://github.com/googlechrome/lighthouse/pull/4677))
* font-size, link-text: update docs links ([#4829](https://github.com/googlechrome/lighthouse/pull/4829))
* is-crawlable: fix broken learn more link ([#4844](https://github.com/googlechrome/lighthouse/pull/4844))
* scores: make sure scores are represented out of 100 ([#4750](https://github.com/googlechrome/lighthouse/pull/4750))
* seo: update link to the is-crawlable/indexing reference ([#4678](https://github.com/googlechrome/lighthouse/pull/4678))
* table: handle null cells ([#5075](https://github.com/googlechrome/lighthouse/pull/5075))
* util: fix formatDuration, add tests ([#5023](https://github.com/googlechrome/lighthouse/pull/5023))

## Tests

* appeveyor: exclude perf smoketest until flake is fixed. ([#5060](https://github.com/googlechrome/lighthouse/pull/5060))
* exclude audit helpText from 'yarn diff:sample-json' assertion ([#4964](https://github.com/googlechrome/lighthouse/pull/4964))
* closure: avoid failing closure compilation ([#4737](https://github.com/googlechrome/lighthouse/pull/4737))
* closure: fix BSD sed calls within compile-devtools ([#4736](https://github.com/googlechrome/lighthouse/pull/4736))
* config: add merge-options test ([#4747](https://github.com/googlechrome/lighthouse/pull/4747))
* extension: add reminder about building the extension ([#4902](https://github.com/googlechrome/lighthouse/pull/4902))
* fixtures: introduce update-report-fixtures script ([#4793](https://github.com/googlechrome/lighthouse/pull/4793))
* smoke: add smoke test code coverage ([#4967](https://github.com/googlechrome/lighthouse/pull/4967))
* fix run-smoke handoff of testResults ([#4959](https://github.com/googlechrome/lighthouse/pull/4959))
* smokehouse: increase timeout ([#4990](https://github.com/googlechrome/lighthouse/pull/4990))
* smokehouse: split pwa2, perf batches ([#4988](https://github.com/googlechrome/lighthouse/pull/4988))
* smokehouse: adjust byte efficiency CPU multiplier ([#4809](https://github.com/googlechrome/lighthouse/pull/4809))
* smokehouse: retry failed tests ([#5143](https://github.com/googlechrome/lighthouse/pull/5143))
* smokehouse: run smoketests in parallel ([#4748](https://github.com/googlechrome/lighthouse/pull/4748))
* rename seo test files ([#4853](https://github.com/googlechrome/lighthouse/pull/4853))
* bump bundlesize threshold ([#5050](https://github.com/googlechrome/lighthouse/pull/5050))
* use nyc instead of istanbul for coverage ([#4919](https://github.com/googlechrome/lighthouse/pull/4919))
* node 10 compat ([#5106](https://github.com/googlechrome/lighthouse/pull/5106))
* disable compile-devtools on travis ([48792ae](https://github.com/googlechrome/lighthouse/commit/48792ae))
* add CI test to confirm sample_v2.json is up to date ([#4956](https://github.com/googlechrome/lighthouse/pull/4956))
* split up parallel smoketests into 2 batches ([#4996](https://github.com/googlechrome/lighthouse/pull/4996))
* drop port number from dbw_tester for golden lhr ([#5006](https://github.com/googlechrome/lighthouse/pull/5006))
* remove unused fixtures ([#5107](https://github.com/googlechrome/lighthouse/pull/5107))
* fix cli handling empty runnerResult during gatherMode ([#5052](https://github.com/googlechrome/lighthouse/pull/5052))
* viewer: add pptr test for viewer ([#5025](https://github.com/googlechrome/lighthouse/pull/5025))

## Misc

* codeowners: revert brendan's leave ([#4716](https://github.com/googlechrome/lighthouse/pull/4716))
* eslint: add no-floating-decimal (leading zero) rule ([#4893](https://github.com/googlechrome/lighthouse/pull/4893))
* eslint: update to es2017 to allow async/await ([#4791](https://github.com/googlechrome/lighthouse/pull/4791))
* tsc: reorganize and expose external interfaces ([#4788](https://github.com/googlechrome/lighthouse/pull/4788))
* typecheck: add dependency graph to tsc ([#4605](https://github.com/googlechrome/lighthouse/pull/4605))
* remove timing from golden lhr ([#5020](https://github.com/googlechrome/lighthouse/pull/5020))
* clean *.screenshots.json ([#4754](https://github.com/googlechrome/lighthouse/pull/4754))
* drop support of Node 6 ([#4703](https://github.com/googlechrome/lighthouse/pull/4703))
* minor whitespace fix on unminified-css audit ([16da670](https://github.com/googlechrome/lighthouse/commit/16da670))

 <a name="2.9.1"></a>
# 2.9.1 (2018-02-12)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.9.0...v2.9.1)


## New Contributors!
Thanks to @GaryJones for [helping us spel gud](https://github.com/GoogleChrome/lighthouse/pull/4485)!


## Core

* REVERT: gather-runner: load a blank data URI, rather than about:blank ([#4518](https://github.com/googlechrome/lighthouse/pull/4518))
* fonts: fix infinite loop ([#4488](https://github.com/googlechrome/lighthouse/pull/4488))
* responsive-images: move images with no dimensions to offscreen audit ([#4487](https://github.com/googlechrome/lighthouse/pull/4487))
* tracing-processor: fix scheduleable task logic ([#4480](https://github.com/googlechrome/lighthouse/pull/4480))
* webfonts: patch fonts gatherer to handle missing font item ([#4465](https://github.com/googlechrome/lighthouse/pull/4465))
* computed-artifact: use deep equality over strict ([#4409](https://github.com/googlechrome/lighthouse/pull/4409))

## Docs & Tests

* docs: examples of combining puppeteer & lighthouse ([#4408](https://github.com/googlechrome/lighthouse/pull/4408))
* appveyor: quietly unzip Chrome to keep appveyor logs cleaner ([ecedb32](https://github.com/googlechrome/lighthouse/commit/ecedb32))
* appveyor: only run tests against master and PRs ([#4484](https://github.com/googlechrome/lighthouse/pull/4484))
* smokehouse: improve smokehouse failure output ([#4482](https://github.com/googlechrome/lighthouse/pull/4482))
* spelling: fix discernable to discernible ([#4485](https://github.com/googlechrome/lighthouse/pull/4485))


 <a name="2.9.0"></a>
# 2.9.0 (2018-02-08)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.8.0...v2.9.0)

## New Contributors!
Thanks to @FadySamirSadek, @christhompson and @rupesh1 for their first contributions! Awesome stuff.


## New Audits

* mixed-content https upgradeability ([#3953](https://github.com/googlechrome/lighthouse/pull/3953))
* preload: Adding `<link rel=preload>` audit ([#3450](https://github.com/googlechrome/lighthouse/pull/3450))
* font-display: Recommend `font-display: optional` ([#3831](https://github.com/googlechrome/lighthouse/pull/3831))

## CLI

* Add `--extra-headers`: Enable sending additional HTTP Headers ([#3732](https://github.com/googlechrome/lighthouse/pull/3732))
* Add `--mixed-content`: triggers the mixed content audit ([#4441](https://github.com/googlechrome/lighthouse/pull/4441))

## Core

* centralize error strings ([#4280](https://github.com/googlechrome/lighthouse/pull/4280))
* gather-runner: load a branded data URI, rather than `about:blank` ([#4310](https://github.com/googlechrome/lighthouse/pull/4310))
* mobile-friendly: convey MFT covers add'l mobile-friendly auditing ([#4307](https://github.com/googlechrome/lighthouse/pull/4307))
* response-compression: Exclude binary files from auditing ([#4144](https://github.com/googlechrome/lighthouse/pull/4144))
* screenshot-thumbnails: increase size to 120px ([#4383](https://github.com/googlechrome/lighthouse/pull/4383))
* start-url: switch to plain old fetch ([#4301](https://github.com/googlechrome/lighthouse/pull/4301))
* unminified-js: add tolerant option to esprima ([#4338](https://github.com/googlechrome/lighthouse/pull/4338))
* a11y: aXe perf: only collect provided resultTypes ([#4380](https://github.com/googlechrome/lighthouse/pull/4380))

## Deps

* bump metaviewport-parser to 0.2.0 ([#4382](https://github.com/googlechrome/lighthouse/pull/4382))
* snyk: update snyk snapshot ([#4439](https://github.com/googlechrome/lighthouse/pull/4439))

## Misc

* coverage: minimize impact of timeout due to istanbul's instrumentation ([#4396](https://github.com/googlechrome/lighthouse/pull/4396))
* escape usage of '#' in data URIs ([#4381](https://github.com/googlechrome/lighthouse/pull/4381))
* package: scripts don't require "--" for options to be forwarded ([#4437](https://github.com/googlechrome/lighthouse/pull/4437))
* sentry: update sampled errors list ([#4277](https://github.com/googlechrome/lighthouse/pull/4277))
* travis: Only build on Node 6 for PRs. Don't do the `push` build for non-master. ([af8dbd0](https://github.com/googlechrome/lighthouse/commit/af8dbd0))
* Extension: Fix scrollbar from showing on Options page ([#4263](https://github.com/googlechrome/lighthouse/pull/4263))

 <a name="2.8.0"></a>
# 2.8.0 (2018-01-12)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.7.0...v2.8.0)

## New Contributors!
Thanks to @jianzhoufeng and @nhodges for their first contributions!

## New Audits

* avoid plugins ([#4218](https://github.com/googlechrome/lighthouse/pull/4218))
* rel canonical: document has a valid rel=canonical ([#4163](https://github.com/googlechrome/lighthouse/pull/4163))
* unminified-css: identifies savings from unminified CSS ([#4127](https://github.com/googlechrome/lighthouse/pull/4127))
* unminified-javascript: detect savings from minifcation ([#3950](https://github.com/googlechrome/lighthouse/pull/3950))
* manual SEO audits (structured data & mobile friendly) ([#4108](https://github.com/googlechrome/lighthouse/pull/4108))

## Core

* lifecycle: allow gathering & auditing to run separately ([#3743](https://github.com/googlechrome/lighthouse/pull/3743))
* gather-runner: covert assertPageLoaded into soft failure ([#4048](https://github.com/googlechrome/lighthouse/pull/4048))
* network-recorder: use findNetworkQuietPeriods for networkIdle ([#4102](https://github.com/googlechrome/lighthouse/pull/4102))
* report-generator: extract scoring into separate module ([#4161](https://github.com/googlechrome/lighthouse/pull/4161))
* screenshots: fix getParsedImage of null ([#4189](https://github.com/googlechrome/lighthouse/pull/4189))
* trace-of-tab: error when TracingStartedInPage is missing ([#4164](https://github.com/googlechrome/lighthouse/pull/4164))
* errors-in-console: If exception info is not present use exception text ([#4191](https://github.com/googlechrome/lighthouse/pull/4191))
* estimated-input-latency: remove target reference ([#4069](https://github.com/googlechrome/lighthouse/pull/4069))
* bootup-time: Add 10ms threshold to bootup-time audits ([#4223](https://github.com/googlechrome/lighthouse/pull/4223))
* font-size: make font size artifact serializable ([#4194](https://github.com/googlechrome/lighthouse/pull/4194))

## Report

* a11y: Don't count non-applicable a11y audits toward score ([#4052](https://github.com/googlechrome/lighthouse/pull/4052))
* more attractive table/URL rendering ([#4190](https://github.com/googlechrome/lighthouse/pull/4190))
* improve devtools dark mode rendering ([#4232](https://github.com/googlechrome/lighthouse/pull/4232))
* categories: performance first, then pwa, then the others ([#4095](https://github.com/googlechrome/lighthouse/pull/4095))
* grammar: do not finalize audit titles with a period ([c5f6d05](https://github.com/googlechrome/lighthouse/commit/c5f6d05))
* change 'app' => 'web app' ([29eecce](https://github.com/googlechrome/lighthouse/commit/29eecce))
* Update vulnerability links ([#4198](https://github.com/googlechrome/lighthouse/pull/4198))

## Deps

* bump js-library-detector ([#4086](https://github.com/googlechrome/lighthouse/pull/4086))
* chrome-launcher: Upgrade chrome-launcher to 0.10.2 ([#4192](https://github.com/googlechrome/lighthouse/pull/4192))

## Docs

* readme: update CLI options, output examples. add GAR/Lifecycle examples ([#4185](https://github.com/googlechrome/lighthouse/pull/4185))
* readme: demo flags in example of programmatic use ([#3841](https://github.com/googlechrome/lighthouse/pull/3841))
* lantern: update accuracy data ([#4180](https://github.com/googlechrome/lighthouse/pull/4180))
* extract Release Guide into own docs file ([#4200](https://github.com/googlechrome/lighthouse/pull/4200))
* releasing: document the LH Release Process ([#4201](https://github.com/googlechrome/lighthouse/pull/4201))
* results: describe audit's notApplicable/error ([#4186](https://github.com/googlechrome/lighthouse/pull/4186))

## Extension

* extract a new ext-bg file, splitting extn/devtools usecases ([#4162](https://github.com/googlechrome/lighthouse/pull/4162))

## Tests

* remove global timeout, set timeouts individually ([#4224](https://github.com/googlechrome/lighthouse/pull/4224))
* trace-parser: use fs over require ([#4209](https://github.com/googlechrome/lighthouse/pull/4209))
* travis: force use of GCE, remove dSE calls ([#4222](https://github.com/googlechrome/lighthouse/pull/4222))
* travis: remove upload artifacts ([#4219](https://github.com/googlechrome/lighthouse/pull/4219))
* travis: test on Node 9, drop testing on Node 7 ([#4181](https://github.com/googlechrome/lighthouse/pull/4181))

## Misc

* remove CLI's legacy domhtml output ([#4176](https://github.com/googlechrome/lighthouse/pull/4176))
* viewer: retain /plots/ when deploying new viewer version ([#4079](https://github.com/googlechrome/lighthouse/pull/4079))


 <a name="2.7.0"></a>
# 2.7.0 (2017-12-14)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.6.0...v2.7.0)

## New Contributors!
Thanks to @sanjsanj, @dennismartensson, @daannijkamp, @crimeminister!

## New Audits

* accessibility: add accessibility manual audits ([#3834](https://github.com/googlechrome/lighthouse/pull/3834))
* font-size: legible font sizes audit ([#3533](https://github.com/googlechrome/lighthouse/pull/3533))
* hreflang: document has a valid hreflang code ([#3815](https://github.com/googlechrome/lighthouse/pull/3815))

## CLI

* compile out remaining typescript; add tsc type checking via jsdocs ([#3747](https://github.com/googlechrome/lighthouse/pull/3747))
* sentry: handle configstore errors; don't enabling error reporting ([#3878](https://github.com/googlechrome/lighthouse/pull/3878))

## Core

* config: show SEO audits in the UI ([#4057](https://github.com/googlechrome/lighthouse/pull/4057))
* critical-request-chains: corrected help text ([#4009](https://github.com/googlechrome/lighthouse/pull/4009))
* devtools-timeline-model: extract model generation to a computed artifact...    ([46f6d2a](https://github.com/googlechrome/lighthouse/commit/46f6d2a))
* driver: add driver.wsEndpoint() ([#3864](https://github.com/googlechrome/lighthouse/pull/3864))
* gather-runner: fix headless chrome UA check ([#4019](https://github.com/googlechrome/lighthouse/pull/4019))
* noopener-audit: Only test http/https links ([#4036](https://github.com/googlechrome/lighthouse/pull/4036))
* optimized-images: skip mismatched mimeTypes ([#4045](https://github.com/googlechrome/lighthouse/pull/4045))
* seo: consistent help text links ([#3901](https://github.com/googlechrome/lighthouse/pull/3901))
* uses-webp: tweak text to be more next-gen focused ([#3985](https://github.com/googlechrome/lighthouse/pull/3985))
* vulnerable-libs: add fix for recovering from bad versions ([#3932](https://github.com/googlechrome/lighthouse/pull/3932))
* web-inspector: keep all experiments disabled, fixing conflict when running in DevTools ([#4010](https://github.com/googlechrome/lighthouse/pull/4010))

## Deps

* Bump ws to 3.3.2 ([#3949](https://github.com/googlechrome/lighthouse/pull/3949))

## Docs

* error-reporting: improve clarity for opt-out folks ([#3876](https://github.com/googlechrome/lighthouse/pull/3876))
* add lantern accuracy data ([#3826](https://github.com/googlechrome/lighthouse/pull/3826))
* fox mobile device testing example ([#3887](https://github.com/googlechrome/lighthouse/pull/3887))
* readme: Add Greta Lighthouse to list of Integrations ([#4031](https://github.com/googlechrome/lighthouse/pull/4031))

## Report

* perf-audits: adjust presentation of runtime cost audits ([#4020](https://github.com/googlechrome/lighthouse/pull/4020))
* warnings: warn only if using an old headless ([#4021](https://github.com/googlechrome/lighthouse/pull/4021))

## Tests

* smokehouse: adopt URLSearchParams for querystring manipulation ([#3941](https://github.com/googlechrome/lighthouse/pull/3941))

## Misc

* changelog: tweaks to changelog template and instructions ([#3849](https://github.com/googlechrome/lighthouse/pull/3849))
* changelog: minor changelog generation usability bumps ([#3847](https://github.com/googlechrome/lighthouse/pull/3847))
* codeowners: represent brendan's leave ([#3991](https://github.com/googlechrome/lighthouse/pull/3991))
* error-reporting: report unhandled promise rejections, take 2 ([#3930](https://github.com/googlechrome/lighthouse/pull/3930))
* error-reporting: tweak sentry levels and ignore list ([#3890](https://github.com/googlechrome/lighthouse/pull/3890))
* error-reporting: report unhandled promise rejections ([#3886](https://github.com/googlechrome/lighthouse/pull/3886))
* Update wording ([6036117](https://github.com/googlechrome/lighthouse/commit/6036117))

 <a name="2.6.0"></a>
# 2.6.0 (2017-11-18)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.5.1...v2.6.0)

## New Contributors!
@peterjanes, @stevector, @AkshayIyer12, @manekinekko, @alekseykulikov, @coliff, @emazzotta

## New Audits

* `redirects`: avoid page redirects ([#3308](https://github.com/googlechrome/lighthouse/pull/3308))
* `link-text`: descriptive anchor text audit ([#3490](https://github.com/googlechrome/lighthouse/pull/3490))
* `is-crawlable`: page is blocked from indexing ([#3657](https://github.com/googlechrome/lighthouse/pull/3657))
* `bootup-time`: JS bootup time per script ([#3563](https://github.com/googlechrome/lighthouse/pull/3563))
* `uses-long-cache-ttl`: detects savings from leveraging caching ([#3531](https://github.com/googlechrome/lighthouse/pull/3531))
* `mainthread-work-breakdown`: audit for page-execution timings ([#3520](https://github.com/googlechrome/lighthouse/pull/3520))

## CLI

* do not double quote `chromeFlags` ([#3775](https://github.com/googlechrome/lighthouse/pull/3775))

## Core

* `aspect-ratio`: skip aspect ratio audit for svg ([#3722](https://github.com/googlechrome/lighthouse/pull/3722))
* audit: Ignore `href=javascript:.*` for `rel=noopener` audit ([#3574](https://github.com/googlechrome/lighthouse/pull/3574))
* bootup-time: refactor task/group iteration ([33b1574](https://github.com/googlechrome/lighthouse/commit/33b1574))
* config: add silent seo audits to default config ([#3582](https://github.com/googlechrome/lighthouse/pull/3582))
* config: re-weight a11y scores based on severity and frequency ([#3515](https://github.com/googlechrome/lighthouse/pull/3515))
* config: add category weight to perf config ([#3529](https://github.com/googlechrome/lighthouse/pull/3529))
* `critical-request-chains`: Remove iframe as Critical Request ([#3583](https://github.com/googlechrome/lighthouse/pull/3583))
* `dependency-graph`: add acyclic check ([#3592](https://github.com/googlechrome/lighthouse/pull/3592))
* `devtools-model`: fix missing `Runtime.experiments` object ([#3514](https://github.com/googlechrome/lighthouse/pull/3514))
* driver: increase default timeout to 45s ([#3741](https://github.com/googlechrome/lighthouse/pull/3741))
* driver: use execution context isolation when necessary ([#3500](https://github.com/googlechrome/lighthouse/pull/3500))
* emulation: remove use of deprecated `Emulation.setVisibleSize` ([#3536](https://github.com/googlechrome/lighthouse/pull/3536))
* `errors-in-console`: include runtime exceptions ([#3494](https://github.com/googlechrome/lighthouse/pull/3494))
* `image-aspect-ratio`: pass audit when no images are missized ([#3552](https://github.com/googlechrome/lighthouse/pull/3552))
* `image-usage`: add null check for parentElement ([#3779](https://github.com/googlechrome/lighthouse/pull/3779))
* add error reporting (CLI only) ([#2420](https://github.com/googlechrome/lighthouse/pull/2420))
* meta tag gatherers: meta tag search should be case-insensitive ([#3729](https://github.com/googlechrome/lighthouse/pull/3729))
* `predictive-perf`: predict FCP ([#3730](https://github.com/googlechrome/lighthouse/pull/3730))
* `predictive-perf`: refactor simulation logic ([#3489](https://github.com/googlechrome/lighthouse/pull/3489))
* `response-compression`: add transferSize sanity check ([#3606](https://github.com/googlechrome/lighthouse/pull/3606))
* record top-level warnings in LHR and display in report ([#3692](https://github.com/googlechrome/lighthouse/pull/3692))
* remove useless `optimalValue` ([#3774](https://github.com/googlechrome/lighthouse/pull/3774))
* `speed-index`: only compute perceptual speed index ([#3845](https://github.com/googlechrome/lighthouse/pull/3845))
* tags blocking first-paint: exclude script type=module ([#3676](https://github.com/googlechrome/lighthouse/pull/3676))

## Docs

* `changelog-generator`: Generate changelogs ([#3632](https://github.com/googlechrome/lighthouse/pull/3632))
* scoring: create documentation on scoring ([#3436](https://github.com/googlechrome/lighthouse/pull/3535))
* `bug-labels.md`: Create bug-labels.md ([#3522](https://github.com/googlechrome/lighthouse/pull/3535), [#3525](https://github.com/googlechrome/lighthouse/pull/3525), [#3535](https://github.com/googlechrome/lighthouse/pull/3535))
* contributing: pr title guidelines ([#3590](https://github.com/googlechrome/lighthouse/pull/3590))
* correct capitalization of GitHub ([#3669](https://github.com/googlechrome/lighthouse/pull/3669))
* add results object explainer ([#3495](https://github.com/googlechrome/lighthouse/pull/3495))
* `new-audits.md`: Principles and guidance for new audits ([#3617](https://github.com/googlechrome/lighthouse/pull/3617))
* readme: add MagicLight WebBLE integration ([#3613](https://github.com/googlechrome/lighthouse/pull/3613))
* readme: add Treo to the list of integrations ([#3484](https://github.com/googlechrome/lighthouse/pull/3484))
* throttling: because `comcast` throttles the websocket ([bedb9a1](https://github.com/googlechrome/lighthouse/commit/bedb9a1))

## Report

* Add print summary and print expanded options ([#3578](https://github.com/googlechrome/lighthouse/pull/3578))
* `image-aspect-ratio`: fix audit description ([#3843](https://github.com/googlechrome/lighthouse/pull/3843))
* redirects: reformat results, incl all requests and wasted time, ([#3492](https://github.com/googlechrome/lighthouse/pull/3492))
* `render-blocking-stylesheets`: improve actionability of helpText ([#3544](https://github.com/googlechrome/lighthouse/pull/3544))

## Tests

* update `eslint` (and goog config) to latest ([#3396](https://github.com/googlechrome/lighthouse/pull/3396))
* `eslint`: use `--quiet` flag rather than `--silent` ([#3491](https://github.com/googlechrome/lighthouse/pull/3491))
* smokehouse: add long task to `byte-efficiency` tester to deflake appveyor ([#3804](https://github.com/googlechrome/lighthouse/pull/3804))
* smokehouse: disable multiple shadow root deprecation test ([#3695](https://github.com/googlechrome/lighthouse/pull/3695))
* smokehouse: Passive event listener violation doesn't report on passive:false now ([#3498](https://github.com/googlechrome/lighthouse/pull/3498))
* `web-inspector`: add test for `setImmediate` polyfill ([#3670](https://github.com/googlechrome/lighthouse/pull/3670))

## Misc

* codereview: add CODEOWNERS file ([#3591](https://github.com/googlechrome/lighthouse/pull/3591))
* Bump `chrome-launcher` to 0.8.1 ([#3479](https://github.com/googlechrome/lighthouse/pull/3479))
* web-inspector: fall back to page's `Runtime` and `queryParam()` ([#3497](https://github.com/googlechrome/lighthouse/pull/3497))
* use undated Apache 2 LICENSE file ([#3700](https://github.com/googlechrome/lighthouse/pull/3700))
* audits: removed unused audit `meta.category` ([#3554](https://github.com/googlechrome/lighthouse/pull/3554))
* changelog: add commitlint config (for commitlintbot) ([21e25aa](https://github.com/googlechrome/lighthouse/commit/21e25aa))
* `commitizen`: new-audit => new_audit ([#3534](https://github.com/googlechrome/lighthouse/pull/3534))
* jsconfig: Enable type checking for JavaScript ([#3589](https://github.com/googlechrome/lighthouse/pull/3589))
* logos: provide svg logo as png ([8b3d7f0](https://github.com/googlechrome/lighthouse/commit/8b3d7f0))
* Fix minor grammatical error ([#3638](https://github.com/googlechrome/lighthouse/pull/3638))
* add `cz-customizable` to establish a commit message convention ([#3499](https://github.com/googlechrome/lighthouse/pull/3499))
* typo: fix typo in `image-aspect-ratio` audit ([#3513](https://github.com/googlechrome/lighthouse/pull/3513))

<a name="2.5.1"></a>
# 2.5.1 (2017-10-06)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.5.0...v2.5.1)

* Fix compat with DevTools via Runtime mock object

<a name="2.5.0"></a>
# 2.5.0 (2017-10-04)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.4.0...v2.5.0)

## New Contributors!
* Huge contributions from new contributors with all-new audits, Chrome launching improvements, and more complete documentation. Thanks to @mikecardwell, @rviscomi, @siddharthkp, @ThisIzKp, @rootulp, @kdzwinel, @LCartwright, @siteriaitaliana, @vinamratasingal, @alanyin0322, and @tkadlec!

## New audits
* `image-aspect-ratio` best practice audit (#3084)
* `time-to-first-byte` perf audit (last fixes and now enabled) (#2231)
* `errors-in-console` best practice audit (#2836)
* `no-vulnerable-libraries` best practice audit (#2372)

### New audits in [full-config](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/full-config.js)
* `unused-javascript` coverage audit (#3085)

### New audits in new [SEO config](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/seo.js) (#2999)
* `meta-description` SEO audit (#3227)
* `http-status-code` SEO audit (#3311)

## [FastMode](https://github.com/GoogleChrome/lighthouse/issues/2703)
* add `predictive-perf` shell and base audit (#2720, #3189)
* add network estimation (#3187, cf5638d6)
* add CPU estimation (#3162, 18837dad, 5b459a1e)

## Core
* update `unused-css-rules` audit to support new coverage format (full-config only) (#2518)
* perf: use `Audits.getEncodedResponse` in `optimized-images` audit (#3087)
* don't wait for `Page.navigate` to resolve to listen for page load (#3413)
* include `v8.execute` trace event category (ab6aabde)

## Report
* clarify wording of category descriptions (#3000)
* add a linked-text type to details renderer (#3165)
* fix: tame greedy markdown-link regex (#3312)
* fix: prevent `\u2028` and `\u2029` from breaking the report (#3442)
* improve descriptions for a11y audits (#3474)

## Testing
* smokehouse: adjust `unused-css-rules` audit expectations (#3036)
* bundlesize: fix reporting in github UI (ede05c0a, #3392)
* smokehouse: add basic smoke test for SEO audits (#3267)
* travis: unset `\_JAVA_OPTIONS` for DevTools' `compile_frontend.py` test (#3354)
* eslint: enable `comma-dangle` rule, fix all new errors (#3324)
* smokehouse: add `time-to-first-byte` smoke test (#3310)

## Docs
* import [audit glossary](https://github.com/GoogleChrome/lighthouse/blob/190b8abb9c39d469c09aa167e6a72fa9e01740d1/docs/architecture.md#components--terminology) from SEO doc (#3207)
* add [advanced throttling guide](https://github.com/GoogleChrome/lighthouse/blob/190b8abb9c39d469c09aa167e6a72fa9e01740d1/docs/throttling.md) (#3205)
* readme: reduce minimum Chrome version to current stable (#3287, 5382f37c)
* readme: add explanation for [Lighthouse Integrations](https://github.com/GoogleChrome/lighthouse/blob/190b8abb9c39d469c09aa167e6a72fa9e01740d1/readme.md#lighthouse-integrations) section (#3418)
contributing.md: fix grammatical errors (#3419)

## CLI
* add [`blockedUrlPatterns` support to CLI](https://github.com/GoogleChrome/lighthouse/blob/190b8abb9c39d469c09aa167e6a72fa9e01740d1/readme.md#cli-options) (#3125)
* adopt `yargsParser` directly for `chromeFlags` parsing (#3408)

## Chrome-launcher
_chrome-launcher has moved to a [standalone npm package](https://npmjs.org/package/chrome-launcher)_
* docs: add changelog (#2987)
* improve `SIGINT` handling (#2959)
* mute audio (#3028)
* rev to 0.6.0 (ec38bcd9, 970d3cad, e9d569c5, 5e9a3aba)
* handle errors inside `spawnPromise` (#2939)
* switch to using standalone package (#3410)

## Misc
* apply small license header to remaining files (#3309)
* fix: remove redundant `lighthouse-logger/` from npm package (#3411)
* remove old `perfX` code (#3431)
* update plots-config to use newer quiet parameters (#3464)
* collect even malformed error messages in extension (#3473)

## Deps
* upgrade `bundlesize` to 0.13.2 (#3122)
* upgrade `axe-core` to 2.4.1 (#3284, #3320)
* upgrade `ws` to 1.1.2 (2d2206b8)
* add yargs-parser at 7.0.0 (#3477, #3478)

<a name="2.4.0"></a>
# 2.4.0 (2017-08-14)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.3.0...v2.4.0)

## Core
* Refactor error throwing from assertPageLoaded (#2785) ([07817f9](https://github.com/GoogleChrome/lighthouse/commit/07817f9))
* refactor: cleanup unused waitFor properties (#2716) ([9d8a32f](https://github.com/GoogleChrome/lighthouse/commit/9d8a32f))
* All audits must specify helpText and failureDescription (#2737) ([db3f324](https://github.com/GoogleChrome/lighthouse/commit/db3f324))
*  "shrink-to-fit" property in "viewport" meta is no longer invalid (#2863) ([e1a04dd](https://github.com/GoogleChrome/lighthouse/commit/e1a04dd))
* driver: add compat comment on PerfObserver GC bug ([d7ffec1](https://github.com/GoogleChrome/lighthouse/commit/d7ffec1))
* emulation comment: can remove injectedTouchEventsFunction in October (#2889) ([a6b71c9](https://github.com/GoogleChrome/lighthouse/commit/a6b71c9))
* Ignoring other extension assets in request compression audit (#2733) ([428f637](https://github.com/GoogleChrome/lighthouse/commit/428f637))
* fix(anchors-with-no-rel): ignore same origin links (#2749) ([78ec647](https://github.com/GoogleChrome/lighthouse/commit/78ec647))
* add flag to FMP to indicate if it fell back to FMP candidate (#2851) ([46d9ba7](https://github.com/GoogleChrome/lighthouse/commit/46d9ba7))
* fix(script-blocking-first-paint): ignore latent resources (#2721) ([ac99084](https://github.com/GoogleChrome/lighthouse/commit/ac99084))
* Include version and commit in lighthouse-background.js bundle (#2236) ([7fe3574](https://github.com/GoogleChrome/lighthouse/commit/7fe3574))


## Report
* link all a11y audits to 2.2 aXe docs (#2709) ([924e1f1](https://github.com/GoogleChrome/lighthouse/commit/924e1f1))
* Update consistently-interactive.js helpText (#2740) ([6f7bf29](https://github.com/GoogleChrome/lighthouse/commit/6f7bf29))
* Update first-interactive.js helpText (#2739) ([a829811](https://github.com/GoogleChrome/lighthouse/commit/a829811))
* Report: add lighthouse query param to axe helpText links (#2767) ([4b9cbb5](https://github.com/GoogleChrome/lighthouse/commit/4b9cbb5))
* Report: Close export dropdown when printing (#2914) ([a45ece8](https://github.com/GoogleChrome/lighthouse/commit/a45ece8)), closes [#2914](https://github.com/GoogleChrome/lighthouse/issues/2914)
* report: draw metric lines over the screenshots. (#2848) ([5832761](https://github.com/GoogleChrome/lighthouse/commit/5832761))
* fix(report): proper arrow state and consistent capitalization (#2750) ([7c461bf](https://github.com/GoogleChrome/lighthouse/commit/7c461bf))

## Testing
* testing: prune smokehouse configs to improve testing perf (#2732) ([e72483b](https://github.com/GoogleChrome/lighthouse/commit/e72483b))

## CLI
* Fix: Basic chrome-flags parsing for embedded quotes (#2754) ([78a8bd7](https://github.com/GoogleChrome/lighthouse/commit/78a8bd7))
* Add hostname CLI flag and option for CriConnection (#2728) ([0455283](https://github.com/GoogleChrome/lighthouse/commit/0455283)), closes [GoogleChrome/lighthouse#2727](https://github.com/GoogleChrome/lighthouse/issues/2727)

## Chrome launcher
* launcher: clarify priority of chromePath options ([494f991](https://github.com/GoogleChrome/lighthouse/commit/494f991))
* chrome-launcher: add support for finding Chromium on Linux (#2950) ([1c11021](https://github.com/GoogleChrome/lighthouse/commit/1c11021))
* launcher: support enabling extension loading (#2650) ([c942d17](https://github.com/GoogleChrome/lighthouse/commit/c942d17))
* [chrome-launcher] Publish type definitions instead of source TypeScript files (#2898) ([391e204](https://github.com/GoogleChrome/lighthouse/commit/391e204))

## Misc
* Lowercase fix for "service worker" (#2729) ([15068bd](https://github.com/GoogleChrome/lighthouse/commit/15068bd)), closes [#2729](https://github.com/GoogleChrome/lighthouse/issues/2729)
* open extension's report in new window. (fix for incognito) (#2734) ([934aa42](https://github.com/GoogleChrome/lighthouse/commit/934aa42)), closes [#2734](https://github.com/GoogleChrome/lighthouse/issues/2734)
* pass --enable-extensions on from manual-chrome-launcher (#2735) ([37fd38c](https://github.com/GoogleChrome/lighthouse/commit/37fd38c))
* Update lighthouse-logger location in readme (#2867) ([1347b15](https://github.com/GoogleChrome/lighthouse/commit/1347b15))
* readme: added CHROME_PATH description from CLI help (#2757) ([af003d4](https://github.com/GoogleChrome/lighthouse/commit/af003d4))
* readme: update example using deprecated `LIGHTHOUSE_CHROMIUM_PATH` (#2929) ([de408ad](https://github.com/GoogleChrome/lighthouse/commit/de408ad))
* docs: Add a changelog.md (#2986) ([626ce68](https://github.com/GoogleChrome/lighthouse/commit/626ce68))
* Viewer: log expected URL (#2724) ([6478f15](https://github.com/GoogleChrome/lighthouse/commit/6478f15))
* Fix eslint max length in github-api.js (#2730) ([1ca40de](https://github.com/GoogleChrome/lighthouse/commit/1ca40de)), closes [#2730](https://github.com/GoogleChrome/lighthouse/issues/2730)
* add license file to launcher package. (#2849) ([8bc6d18](https://github.com/GoogleChrome/lighthouse/commit/8bc6d18))
* Add license to lighthouse-logger. (#2846) ([367ea7a](https://github.com/GoogleChrome/lighthouse/commit/367ea7a))
* Clarification of hasOfflineStartUrl rule (#2775) ([7097d5c](https://github.com/GoogleChrome/lighthouse/commit/7097d5c))
* gulpfile. add commented out lines for sourcemap generation. ([6f53ab9](https://github.com/GoogleChrome/lighthouse/commit/6f53ab9))


<a name="2.3.0"></a>
# 2.3.0 (2017-07-20)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.2.0...v2.3.0)

* test: fix clang-format error (#2691) ([fedc76a](https://github.com/GoogleChrome/lighthouse/commit/fedc76a)), closes [#2691](https://github.com/GoogleChrome/lighthouse/issues/2691)
* test(format-helpers): TZ independent check (#2653) ([56e8f9b](https://github.com/GoogleChrome/lighthouse/commit/56e8f9b))
* add bundlesize to track our build size (#2676) ([5172ff7](https://github.com/GoogleChrome/lighthouse/commit/5172ff7))
* Add failureDescription to audit. display on fail (#2478) ([b0df777](https://github.com/GoogleChrome/lighthouse/commit/b0df777))
* Added CHROME_PATH to readme (#2694) ([5728695](https://github.com/GoogleChrome/lighthouse/commit/5728695))
* bump extension to 2.2.1 ([e5f3a7b](https://github.com/GoogleChrome/lighthouse/commit/e5f3a7b))
* Expose LHR to modules consuming cli/run.ts (#2654) ([9c0c078](https://github.com/GoogleChrome/lighthouse/commit/9c0c078))
* Fix chrome finder on linux/osx when process.env isn't populated (#2687) ([112c2c7](https://github.com/GoogleChrome/lighthouse/commit/112c2c7)), closes [#2687](https://github.com/GoogleChrome/lighthouse/issues/2687)
* fix launcher w/ arbitrary flags (#2670) ([8c9724e](https://github.com/GoogleChrome/lighthouse/commit/8c9724e)), closes [#2670](https://github.com/GoogleChrome/lighthouse/issues/2670)
* Gather-runner: Get useragent before emulating (#2715) ([f8c1dc1](https://github.com/GoogleChrome/lighthouse/commit/f8c1dc1))
* launcher to 0.3.1 ([2004363](https://github.com/GoogleChrome/lighthouse/commit/2004363))
* launcher to 0.3.2 ([fc48c8a](https://github.com/GoogleChrome/lighthouse/commit/fc48c8a))
* remove duplicate url check in core/index.js (#2658) ([425b5fb](https://github.com/GoogleChrome/lighthouse/commit/425b5fb))
* track number of completed requests in total-byte-weight extendedInfo (#2697) ([eecf525](https://github.com/GoogleChrome/lighthouse/commit/eecf525))
* tweak codecov config. ([e9d5a0f](https://github.com/GoogleChrome/lighthouse/commit/e9d5a0f))
* update "page load fast enough on 3G" helpText ([1d0d4ff](https://github.com/GoogleChrome/lighthouse/commit/1d0d4ff))
* Update the helpText in uses-webp-images.js (#2681) ([b93ca14](https://github.com/GoogleChrome/lighthouse/commit/b93ca14))
* update uses-optimized-images.js helpText (#2669) ([5b41ebc](https://github.com/GoogleChrome/lighthouse/commit/5b41ebc))
* update webapp-install-banner.js helpText (#2622) ([a2e4e1e](https://github.com/GoogleChrome/lighthouse/commit/a2e4e1e))
* upgrade rimraf to latest (#2641) ([ef08106](https://github.com/GoogleChrome/lighthouse/commit/ef08106))
* v2.3.0 ([232c99b](https://github.com/GoogleChrome/lighthouse/commit/232c99b))
* perf(uses-http2): check protocol first (#2701) ([bbe2191](https://github.com/GoogleChrome/lighthouse/commit/bbe2191))
* feat: add base fast mode config (#2702) ([5d61056](https://github.com/GoogleChrome/lighthouse/commit/5d61056))
* feat(computed-artifact): support arbitrarily many inputs (#2705) ([4143aac](https://github.com/GoogleChrome/lighthouse/commit/4143aac))
* refactor: extract computeLogNormalScore method (#2710) ([648cce6](https://github.com/GoogleChrome/lighthouse/commit/648cce6))
* refactor(StartUrl): switch from error to debugString object (#2549) ([64b015e](https://github.com/GoogleChrome/lighthouse/commit/64b015e))
* docs(config): add explanations for gatherers property (#2704) ([76cdb54](https://github.com/GoogleChrome/lighthouse/commit/76cdb54))
* docs(readme): link to config docs from readme ([98d85cc](https://github.com/GoogleChrome/lighthouse/commit/98d85cc))
* Report: improvements w/ new density... (#2706) ([97c7170](https://github.com/GoogleChrome/lighthouse/commit/97c7170))
* Report: Updated styles (#2297) ([a9867d5](https://github.com/GoogleChrome/lighthouse/commit/a9867d5))
* fix(config): keep defaultPass on rebuild (#2671) ([78e761a](https://github.com/GoogleChrome/lighthouse/commit/78e761a))
* fix(domstats): enable DOM domain (#2640) ([3ee5215](https://github.com/GoogleChrome/lighthouse/commit/3ee5215))
* fix(driver): prevent PerfObserver from being garbage collected (#2682) ([36c2df5](https://github.com/GoogleChrome/lighthouse/commit/36c2df5))
* launcher: log the specific chrome spawn command. ([3f143b1](https://github.com/GoogleChrome/lighthouse/commit/3f143b1))
* launcher: nuke 'as string' ([a6bbcab](https://github.com/GoogleChrome/lighthouse/commit/a6bbcab))
* launcher: support custom port via chrome-debug binary (#2644) ([6df6b0e](https://github.com/GoogleChrome/lighthouse/commit/6df6b0e))
* cli: remove --select-chrome,--skip-autolaunch. Support CHROME_PATH env  (#2659) ([41df647](https://github.com/GoogleChrome/lighthouse/commit/41df647))
* connection: log the protocol error data field (#2645) ([d587357](https://github.com/GoogleChrome/lighthouse/commit/d587357))
* plots: dashboard - identify variance over lighthouse versions (#2520) ([9561330](https://github.com/GoogleChrome/lighthouse/commit/9561330))



<a name="2.2.1"></a>
## 2.2.1 (2017-06-30)

* v2.2.1 ([187c6d5](https://github.com/GoogleChrome/lighthouse/commit/187c6d5))
* fix(extension): Restore status logging to extension (#2629) ([fe99052](https://github.com/GoogleChrome/lighthouse/commit/fe99052))



<a name="2.2.0"></a>
# 2.2.0 (2017-06-30)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.1.0...v2.2.0)

### `chrome-launcher` shipped as a standalone module
The [`chrome-launcher`](https://www.npmjs.com/package/chrome-launcher) module is now on npm. Great for working with [Chrome headless](https://developers.google.com/web/updates/2017/04/headless-chrome).

### Lighthouse viewer updated for Lighthouse 2.0
The [Lighthouse Report Viewer](https://googlechrome.github.io/lighthouse/viewer/) can now view data from Lighthouse 2.x, including JSON saved from the CLI, exported from the Chrome extension or DevTools Audits panel. (#2521)

### New contributors
Thanks to Katie Hempenius, Artur M, Kevin Farrugia, Piper Chester, Robin Drexler, and Mike Deverell. Due to the effort of these developers we now have an audit for checking for paste-blocked password fields, unified usage of toLocaleString(), a correct gulp recipe, a well-functioning chrome-launcher module, and improved clarity in the audit test descriptions.  **We truly appreciate all these improvements!**

-------------

Since 2.1.0 we've had a number of other features, fixes, and improvements. Presented by category:

#### Report
* use locale string for all our number output (#2553)
* fixes viewer CSS specificity and event listener removal (#2575)
* freshen up audit helpText
* Report: don't display score gauge header if there's only one. (#2261)
* Remove report v1 and dependencies (#2596)
* better debug message for missing network times (#2451)
* spelling fix in link-name audit (#2496)
* Theme Color wording fixes (#2466)

#### Audit + Gather
* fix(driver): wait for CPU idle via clientside perfObserver (#2473)
* Remove /deep/ usage as it is being deprecated (#2371)
* Remove BOM encoding from manifest (#2175)
* Throw better error message when url is not auditable (#2527)
* Critical Request Chain audit: fix incorrect transfersize. (#2610)
* domstats: prevent infinite loop (#2561)

#### Performance & Traces
* docs: add trace interpretation guide (#2472)
* use a stable sort for trace events (#2415)
* remove old TTI code (#2452)
* refactor(trace-of-tab): return timestamps in microseconds (#2454)
* add streaming json parser
* add streaming trace writer in saveAssets

#### Plots
* better support power use cases (#2464)
* disable flaky smoke test (#2606)
* smoke test for happy case (#2411)


#### Configurability
* feat(config): add audit blacklist support (#2499)
* feat(config): add extends lighthouse:full (#2557)
* docs(config): add config documentation (#2592)

#### Misc
* Add script to capture travis build durations (#2541)
* Expose launch/lighthouse/report flow to consuming modules (#2602)
* harden security of static-server (#2563)
* is-on-https: check record.protocol for blob urls (#2538)
* LH implementation of LogNormalDistribution; remove traceviewer (#2456)
* move computed artifacts dependent on networkRecords to devtoolsLog (#2467)
* Enable typescript coverage metrics for coveralls.


<a name="2.1.0"></a>
# 2.1.0 (2017-06-07)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.0.0...v2.1.0)

**Fixed bugs:**

- Friendlier message for multiple tabs to same origin [\#2299](https://github.com/GoogleChrome/lighthouse/issues/2299)
- de-jsonify default.js [\#2445](https://github.com/GoogleChrome/lighthouse/pull/2445)
- Compact the license headers [\#2444](https://github.com/GoogleChrome/lighthouse/pull/2444)
- update smokehouse PWA expectations [\#2443](https://github.com/GoogleChrome/lighthouse/pull/2443)
- Disable the dismissJavaScriptDialogs smoketest.  [\#2437](https://github.com/GoogleChrome/lighthouse/pull/2437)
- Large DOM size increases memory usage, not memory \(fix wording\) [\#2433](https://github.com/GoogleChrome/lighthouse/pull/2433) ([khempenius](https://github.com/khempenius))
- Fix US-centric wording [\#2432](https://github.com/GoogleChrome/lighthouse/pull/2432) ([khempenius](https://github.com/khempenius))
- add units to LoadFastEnough debug string [\#2427](https://github.com/GoogleChrome/lighthouse/pull/2427)
- remove aggregations [\#2426](https://github.com/GoogleChrome/lighthouse/pull/2426)
- link to "offscreen images" reference [\#2417](https://github.com/GoogleChrome/lighthouse/pull/2417) ([kaycebasques](https://github.com/kaycebasques))
- readme: add notes on per runs [\#2410](https://github.com/GoogleChrome/lighthouse/pull/2410)
- Updated readme to add port number when testing a site with authentication [\#2409](https://github.com/GoogleChrome/lighthouse/pull/2409) ([mikerhyssmith](https://github.com/mikerhyssmith))
- Update optimized-images overview jsdoc [\#2408](https://github.com/GoogleChrome/lighthouse/pull/2408)
- fix\(report\): footer height on small viewports [\#2400](https://github.com/GoogleChrome/lighthouse/pull/2400)
- rmtraceviewer branch: reduce -\> for..of [\#2399](https://github.com/GoogleChrome/lighthouse/pull/2399)
- feat: tooltips for all formatted URLs [\#2398](https://github.com/GoogleChrome/lighthouse/pull/2398)
- travis: include node 8.0.0 [\#2395](https://github.com/GoogleChrome/lighthouse/pull/2395)
- fixed incorrect comments [\#2392](https://github.com/GoogleChrome/lighthouse/pull/2392) ([mixed](https://github.com/mixed))
- Appveyor fixes: fresh yarn, only node6 build [\#2382](https://github.com/GoogleChrome/lighthouse/pull/2382)
- Run npm install/build tasks in parallel [\#2381](https://github.com/GoogleChrome/lighthouse/pull/2381)
- Re-enable AppVeyor support. [\#2380](https://github.com/GoogleChrome/lighthouse/pull/2380) ([XhmikosR](https://github.com/XhmikosR))
- Fix icons on firefox by decoding svg imgs [\#2378](https://github.com/GoogleChrome/lighthouse/pull/2378) ([ev1stensberg](https://github.com/ev1stensberg))
- revise package.json script to the correct folder [\#2373](https://github.com/GoogleChrome/lighthouse/pull/2373) ([ev1stensberg](https://github.com/ev1stensberg))
- update help text for a11y audits [\#2370](https://github.com/GoogleChrome/lighthouse/pull/2370) ([kaycebasques](https://github.com/kaycebasques))
- fix: deprecate old HTML report [\#2367](https://github.com/GoogleChrome/lighthouse/pull/2367)
- add audit to check if paste is allowed in password inputs [\#2366](https://github.com/GoogleChrome/lighthouse/pull/2366) ([robin-drexler](https://github.com/robin-drexler))
- swap math.round with util.formatNumber [\#2361](https://github.com/GoogleChrome/lighthouse/pull/2361) ([ev1stensberg](https://github.com/ev1stensberg))
- 😈 Fix disconnect promise race. [\#2359](https://github.com/GoogleChrome/lighthouse/pull/2359) ([samccone](https://github.com/samccone))
- Enable passing of a custom userDataDir to launcher [\#2357](https://github.com/GoogleChrome/lighthouse/pull/2357) ([samccone](https://github.com/samccone))
- test\(smokehouse\): add numeric comparisons [\#2356](https://github.com/GoogleChrome/lighthouse/pull/2356)
- ✨ Add Calibre and WPT to Readme [\#2355](https://github.com/GoogleChrome/lighthouse/pull/2355) ([benschwarz](https://github.com/benschwarz))
- fix: bump jpeg quality [\#2354](https://github.com/GoogleChrome/lighthouse/pull/2354)
- fix: hide violations with no URL information [\#2352](https://github.com/GoogleChrome/lighthouse/pull/2352)
- fix\(connection\): gracefully handle missing method [\#2351](https://github.com/GoogleChrome/lighthouse/pull/2351)
- fix: normalize all times to navStart, remove traceviewer model [\#2347](https://github.com/GoogleChrome/lighthouse/pull/2347)
- extension: Fix formatting of bug reports [\#2343](https://github.com/GoogleChrome/lighthouse/pull/2343)
- Docs: update readme, add docs/readme, modernize a bit [\#2341](https://github.com/GoogleChrome/lighthouse/pull/2341)
- Total byte audit reports full URL [\#2312](https://github.com/GoogleChrome/lighthouse/pull/2312) ([johnboxall](https://github.com/johnboxall))
- polish: show audits with debug string, don't fail loadfast4pwa on network latencies, works-offline change [\#2294](https://github.com/GoogleChrome/lighthouse/pull/2294)
- fix: always ensure tracing is off before starting [\#2279](https://github.com/GoogleChrome/lighthouse/pull/2279)
- polish: listen for network idle after DCL [\#2271](https://github.com/GoogleChrome/lighthouse/pull/2271)
- Switch to containerized Trusty [\#2234](https://github.com/GoogleChrome/lighthouse/pull/2234) ([stramel](https://github.com/stramel))
- Plots: make measure script more flexible \(CLI args\) [\#2183](https://github.com/GoogleChrome/lighthouse/pull/2183) ([wwwillchen](https://github.com/wwwillchen))


# 2.0.0 (2017-05-19)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v1.6.0...v2.0.0)

## Big changes
### Brand new report
<a href="https://user-images.githubusercontent.com/39191/28991453-b9061d48-793c-11e7-957f-1399ae992e84.png"><img src="https://user-images.githubusercontent.com/39191/28991453-b9061d48-793c-11e7-957f-1399ae992e84.png" height=300 align=right></a>
Everything is brand new UI. header footer, left nav, export, score gauges… screenshots! filmstrip . pass and failures seperated. Sparklines. Accessibility by section. Perf sections..

<br clear=all>

### Chrome DevTools Integration
Take a look at the DevTools' Audit tab, where Lighthouse is now integrated

### Lighthouse is much faster now
<img src="https://user-images.githubusercontent.com/39191/28991472-1a1f0b9e-793d-11e7-95c1-34effccb8126.png" align=right>

Overall the **Operation Yaquina Bay** (Issue #2146) effort made massive improvements to the total lighthouse runtime:

* 476e7806 fix: remove afterPass throttling (#1901)
* 7d7bac66 perf: enable speedline fastMode (#2230)
* f7ea9354 perf(config): disable styles gatherer (#2153)
* d99778b4 perf: consolidate DBW pass into defaultPass (#2160)
* ff21a33a fix: only record a trace if needed by an audit (#2117)
* 740c2e99 perf(gather-runner): Clear cache selectively per-pass (#2156)
* 4c515cfa block stylesheets and images on redirect pass (#2168)
* d0cb646a perf(gatherers): skip optimization of cross origin images (#2154)
* d99b5ada perf: make network quiet threshold configurable per pass (#2220)

## New Contributors!

Huge thanks to who contributed 27 epic PRs.

* @abacon - remove images from critical request chains
* @benschwarz - Calibre and WPT to readme
* @chrisdwheatley - add related projects section
* @dandv - Mention where the documentation is
* @dgozman - Add basic rendering to report generator v2
* @ev1stensberg - math.round scores, firefox svg images, package.json correct folder
* @jinjorge - Fix typo in readme
* @jimthedev - readme instructions for running behind a login
* @johnboxall - Total byte audit reports full URL
* @mrbusche - Update outdated link for "Web App Install Banners" article
* @maya - Fix "Installation" spelling mistake
* @stramel - non-critical images, template literal linting, containerized trusty
* @mikerhyssmith - Updated readme to add port number when testing a site with authentication
* @sendilkumarn - handlebars precompiled (we'll pour one out), clearer iconography, helpText fixes.
* @ZZhaoTireless - report `<details>` printing fix
* @cedricbellet - handleJavascriptDialogs
* @thearegee - Readme: Adding lighthouse-cron to Related Projects



## Audits
* Added the "is fast on 3g" audit
* 4c34e28f Fix service worker gatherer by waiting for active state (#1864)
* bbe7f3b9 allow computed artifacts to request other computed artifacts (#2018)
* ba01e2a2 Added audit for request compression (gzip & br) (#1513)
* ef520256 feat(image-usage): add support for CSS images (#1868)
* 17088655 fix: default(.json -> .js). Disable css usage audit (#1911)
* 50349613 Collapse the 9 manifest PWA audits into 3  (#1847)
* 902585b8 feat: add OffscreenImages Audit (#1807)
* bad5bdae Add TTI < 10s audit for PWA (#1840)
* d2cb5a21 feat: add consistently interactive audit (#2023)
* d3a06925 DOMStat Audit: shadow roots don't have .classList (#2131)
* 691157f2 Add audit to check if start_url is cached by SW (#2040)
* df2fae5e PWA Audits: add placeholders for rest of baseline checks. (#2248)
* 3c752a0c refactor: split optimized images into WebP and optimize audit (#2216)
* c908e817 retire TTI (alpha) audit (#2266)


## Metrics & Precision
* ade2d88f Enable CPU throttling (4.5x) (#1778)
* added the TTFI and TTCI metrics
* f1aeb581 Fix screenshot capture bounds (#1839)
* 7b86c71e Enhance error wording around busy traces. (#2247)
* 008c5d91 add lighthouse execution time to json results (#2241)
* f0e0dfaf tests: exclude score checking and flaky link preload assertion. (#2202)
* bd7f862d Update: Use array of non-critical resource types (#2191)
* 0549cca7 fix: always use navStart as speedline timeOrigin (#2114)
* da8e0979 NEW feat: add firstInteractive (#2013)
* 2212ca2e Update network throttling to simulate more realistic network conditions (#2238)
* b5bf067b Remove images from critical request chains. (#2085)
* 0bf1744b fix: add more helpful error messages when fMP is missing (#1959)
* ca2600ac Improve reliability of finding navStart (#1895)
* 04579fe3 Ignore cache hits for "fast on 3g" check (#2143)
* b1784d12 Ignore memory cache hits too. ref #2143
* e84530e7 fix: bump jpeg quality for image optimization audit (#2354)
* 0d0e93f3 fix: do not flag blob urls as insecure (#2330)
* 782acc59 polish: do not fail loadfast4pwa for internal redirects (#2296)


## Plots
* b2eaa086 Plots: A/B screenshot viewer (#2026)
* 618d5f0a plots: metrics-per-site view (#2041)
* c43eb098 plots: measure and visualize perf metrics (#1936)
* 3f7e5a1c Plots: make measure script more flexible (CLI args) (#2183)


## CLI
* Chrome launcher is a thing now.
* 2bb9c5b3 readme: tell developer to have yarn installed. ref #2072
* 65bec1bd feat(cli): add support for custom trace categories (#1866)
* b9bce62b Warn users if they have not yet generated the file. (#2176)


## Testing
* 47ee1b8d travis: include node 8.0.0 (#2395)
* Re-enable AppVeyor support #2380, #2382
* d5854b64 test(smokehouse): add numeric comparisons (#2356)
* 8b47006e Smokehouse: log out the node command we spawn (#2074)
* 4f598c50 ci: save perf trace to S3 on failure (#2051)
* 5945332c Switch to containerized Trusty (#2234)
* fb791e40 update eslint `curly` rule to google js style (#2263)


## Misc
* 07e0aab1 Remove recordNetwork from config (#2102)
* 16b0b048 feat: support Config category and audit whitelisting (#1988)
* b2ccdfcb Allow opn & update-notifier CLI deps to be optional. (#2150)
* 283af871 dismiss any Javascript Dialogs automatically (#1939) (#2106)
* e475bdb5 refactor(aggregations): switch usage of aggregations to categories (#1935)
* 48b72a85 fix: always ensure tracing is off before starting (#2279)
* 131df278 polish: listen for network idle after DCL (#2271)
* d7e4d1bb always construct networkRecords from devtoolsLog (#2133)
* 11a1db3c networkRecords => computed artifact. generate networkRecords during gather via the networkRecorder dispatcher breaking change: performanceLog => devtoolsLogs
* fb3cfbd5 makes non-finished network records available (#2197)
* d7064290 extension: Fix formatting of bug reports (#2343)
* 9f5a8aa9 Add error to chrome extension when url is using the chrome protocol (#2346)

## Docs
* Many readme/contributing changes, related projects
* e46f5401 Architecture docs: add arch diagram and lingo updates (#2158)
* af479e9f Architecture diagram
* 8047ef36 Add custom audit recipe (#2255)
* 6898d09e add CI gulp recipe (#1886)
* 909a4638 add doc for testing site with authentication (#1906)
* 7c1c1c59 improve instructions for running behind a login (#2123)
* fb86d507 Docs: add docs/readme (#2341)
* d926f321 README: update CLI help with latest. Give common examples (#2182)
* 15c5ef13 add related projects section (#1835)

## Deps
* e46244d6 Bump axe-core  (#2090)
* 638760ee Migrate all dev scripts + docs from npm to yarn. (#2071, #2072, #2067)
* d90bce3b fix: bump speedline to fix perceptual speed index (#2046)
* 3716658b Rev axe to address #2206 (#2335)


<a name="1.6.5"></a>
# 1.6.5 (2017-03-04)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v1.6.0...1.6.5)

This is a **maintenance release** on the stable [1.6 branch](https://github.com/GoogleChrome/lighthouse/tree/1.6).

Master branch (tagged at 2.0.0-alpha) is under some heavy refactors, so we're holding off on shipping a new version. Expect one by mid-May.
_( Poke around recent PRs and issues if you're curious what we're up to ;)_

In the meantime, only a few changes here in 1.6.5:

### Audits

* Improve HTTPS audit by using network records rather than Security domain, which is broken on Android.(original pr #1918) (#2054)
* Disable unused css rules audit for now, as we want to revisit correctness later (#1912)

### Report
* Add legend to decipher iconography left to us by the ancient ones (#1841)
* Print doesn't cut off expanded audit details (#1870)
* Biggin icons for a11y (#1856)
* Tweak report colors so that we are WCAG2AA valid.

### CLI
* support multiple output modes (#1813)
* add update-notifier. (#1890)

### Testing
* smokehouse:  fix flakiness of dom-size expectation (#1881)
* include a normal CLI run in the travis build.

### Misc
* remove npm prepublish (#1889)

Thanks to @ebidel and @paulirish for merging this stuff back to stable branch.

<a name="1.6.0"></a>
# 1.6.0 (2017-03-04)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v1.5.2...1.6.0)

There were 44 PRs landed for this release. These are their stories.

### New Contributors!

Huge thanks to @sendilkumarn, who contributed [four epic PRs](https://github.com/GoogleChrome/lighthouse/commits?author=sendilkumarn). Also welcome to @tommycli, @narendrashetty, @mohsen1 and @dentemple. Readme tweaks are how it all starts. ;)

### Notable Changes

- **WebPageTest integration is in beta**

  By popular demand, you will soon have a way to run Lighthouse on demand in the cloud. We've worked closely with WebPageTest to enable Lighthouse auditing and analysis from within a WPT run.
  Our contribution [WPO-Foundation/webpagetest#825](https://github.com/WPO-Foundation/webpagetest/pull/825) was just merged and Lighthouse on WPT is currently in private beta.

<p align="center"><img alt="lighthouse-webpagetest-beta" src="https://cloud.githubusercontent.com/assets/39191/23574976/96be73fa-003a-11e7-9f08-45e104ef2560.gif"></p>

- **Lighthouse's CLI output has taken a chill pill** - #1764

  While you can view all Lighthouse results on the command line, it hasn't scaled well. A few screenworths of report was generally dumped to stdout right as Lighthouse finished up. Now, to keep your terminal happy, you will no longer see the reams of results printed to stdout.
  The HTML report is saved to disk by default, and you can automatically open it with `lighthouse --view`.

<p align="center"><img alt="lighthouse --view flag" src="https://cloud.githubusercontent.com/assets/39191/23574913/8f733424-0039-11e7-8ecd-3fe4758e735a.gif"></p>

  If you still want the stdout output, use `--output=pretty`. Oh so pretty.

- **CI coverage for Windows via AppVeyor** - #1280

<p align="center"><img src="https://cloud.githubusercontent.com/assets/39191/23574765/2f787e50-0037-11e7-9bba-ccf57423a815.png" width="450"></p>

  Thanks to a large effort from @XhmikosR, we now have an eye in the sky on Lighthouse's Windows compatibility. Now, all PRs are tested on both Linux and Windows.

## New audits
* **New audit**: DOM stats (total nodes, depth, width). (#1673) Get flagged if the size or depth of your DOM is big enough to cause big slowdowns.
![image](https://cloud.githubusercontent.com/assets/39191/23575128/34caa486-003d-11e7-8cb1-98e7805900ce.png)

* **New audit**: Total byte weight audit (#1759). An extra check to make sure folks don't ship 5MB webpages.
![image](https://cloud.githubusercontent.com/assets/39191/23575150/76da8292-003d-11e7-8288-1c58eb579d87.png)



### Improvements
* **CLI**: Add -`-chrome-flags` option to CLI. (#1761)
* **CLI**: Add `--disable-storage-reset` flag to skip clearing cache and storage (#1675)
* **Report:** Centralize perf audits within Performance section (#1724)
* **Report:** Collapse sections when all audits pass (#1742)
* **Config**: Allow extension of default config (#1731)
* **Config**: Configurable blank page options (#1732)
* **Config**: Configurable page timeout (#1672)
* Disable throttling for non-performance passes (#1740)
* Reduce build size by 33% (#1756)
* Enhanced display URLs (#1793)

### Bug Fixes
* Improve reliability of TTI metric by extending trace (#1785)
* Do not fail if chrome could not be killed (#1735)
* Headless fix: reuse existing tab if creating new tab fails (#1760)
* Fix code escaping (#1790)
* Speculative fix for getCurrentTabURL (#1753)
* Rewrite chrome:// URLs to compare them. (#1777)
* Responsive image audit correctly handles SVG and duplicates (#1749)

### Testing
* Use download-chrome.sh to download Chrome on Windows too.
* Add AppVeyor CI support for Windows testing.

### Docs
* Link to PWA Checklist (#1734)
* Reorganization and new "Using programmatically" section (#1721)
* fix typo in promise chain
* minor yarn typo fix (#1736)
* Fix typo s/console.err/console.error (#1772)

### Refactor
* DRY byte efficiency audits (#1635)
* Add explicit strict null checks for TS. (#1763)
* CSS consistency changes. (#1698)
* Switch to two space indention. (#1693)
* Refactor handlebar helpers into static methods

### Report Improvements
* Use ! for aggregation icon when some audits dont pass (#1789)
* Clearer iconography in Perf metrics and Fancier Stuff (#1750)
* Adopt the non-failure iconography for perf audits  (#1812)
* Reformat the critical chain details (#1647)
* Reformat the usertiming details (#1810)
* Adjust table em color val for WCAG2AA. (#1743)
* Better colors. Still accessible (#1758)
* Brand the header (#1797)
* Quazzle the tardiplums for best quality fleekdrops.

### Report Bug fixes
* Fix table overflow with Firefox. (#1704)
* Use pre instead of inline code for listener snippets. (#1786)
* Use the same favicon as the viewer. (#1657)
* Tweak colors so that we are WCAG2AA valid. (#1686)
* CSS icon alignment for FF (#1796)
* Clean up table styling (#1726)



<a name="1.5.1"></a>
## 1.5.1 (2017-02-10)

[Full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.5.0...1.5.1) (2017-02-10)

### Bug Fixes
- HTML hygiene - #1682, #1683, #1684
- **Extension:** Rollback of `management` permission to study effect first (#1689) - #1687




<a name="1.5.0"></a>
# 1.5.0 (2017-02-10)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v1.4.1...1.5.0)

There were 128 PRs landed for this release. These are their stories.

### New Contributors!

@graph1994, @denar90, and @kiermasp

### Notable Changes
- **Dropped support for Node earlier than v6** - #1519

  Node v6 became the [Node long-term-support version](https://github.com/nodejs/LTS#lts-schedule) in October 2016. After a suitable mourning period for v4 with a `--harmony` flag, Lighthouse has moved on and will only support v6+ going forward.
- **Improved selection of First Contentful and Meaningful Paint events from unusual traces** - #1632, #1634

  Lighthouse has banished the dreaded `-1` score that has long plagued runs for [certain sites](https://airhorner.com/).

  ![image](https://cloud.githubusercontent.com/assets/316891/22815981/ea000d68-ef13-11e6-95f5-258e2cacdd54.png)

  First Meaningful Paint is now detected much more robustly. While it is [not yet a completely solved problem](https://github.com/GoogleChrome/lighthouse/issues/1464), a large class of these errors should be eliminated. Reporting on these errors has also improved over the ambiguous `-1`, clearly differentiating between an issue with Lighthouse and an issue with the page being tested.
- **Open local report in online report Viewer** - #1179

  When viewing a Lighthouse HTML report generated locally—in the extension or from the command line—a new option is available in the "Export..." dropdown that allows you to upload to the [Lighthouse Online Viewer](https://googlechrome.github.io/lighthouse/viewer/).

  ![localreport](https://cloud.githubusercontent.com/assets/316891/22817784/3d865302-ef1e-11e6-9535-50937f5929ef.png)

  ![viewer](https://cloud.githubusercontent.com/assets/316891/22817839/9b477ab6-ef1e-11e6-8fc7-bafbedfd2872.png)

  You can then use the Viewer share button to get a report URL that you can share freely.

  Behind the scenes, Viewer gets your permission via OAuth to create a GitHub [secret gist](https://help.github.com/articles/about-gists/#secret-gists) and saves the report there. Since it's done as _your_ gist, you maintain full control over the sharing of the report and you can delete it at any time. You can revoke the Viewer's permission to create gists under your [GitHub settings](https://github.com/settings/applications).
- **Performance metrics are injected into trace saved with `--save-assets` for viewing in timeline** - #1446

  Lighthouse metrics like "First meaningful paint", "Time to Interactive", etc are mocked out as User Timing measures and injected back into the trace taken by Lighthouse.

  ![image](https://cloud.githubusercontent.com/assets/39191/21796487/f35ad136-d6bd-11e6-9447-2260adcf1d65.png)

  If you save a run's trace with `--save-assets` and then open it in DevTools or [Timeline Viewer](https://chromedevtools.github.io/timeline-viewer/), you'll be able to see your key metrics in context with the full trace of the page load.
- **Throttling and emulation information in report** - #1485, #1608, fc858ea

  <img width="719" alt="screen shot 2017-02-09 at 22 43 27" src="https://cloud.githubusercontent.com/assets/316891/22816879/3c913ac0-ef19-11e6-812b-7e728543318b.png">

  It's easy to forget what throttling and emulation settings were used for a particular Lighthouse run after some time has passed. The settings used are now saved in the raw JSON results and are printed at the top of the HTML report under the arrow dropdown.
- **UI to interactively block certain page resources and measure the load performance difference**

  The first version of the [Performance Experiment](https://docs.google.com/document/d/1FYt5Es_Kf5IyC_bkTHj2G_a_sTvRvIq5iZCEN8VZY5o/edit#heading=h.cetla8h0y4o) project is landing in 1.5.0. When Lighthouse is run with the `--interactive` flag, a special report is generated that allows interactive selection of costly page resources. The experiment server then reruns Lighthouse on that page with those resources blocked.

  <img width="720" alt="screen shot 2017-02-09 at 23 45 34" src="https://cloud.githubusercontent.com/assets/316891/22818415/f19058e0-ef21-11e6-82f6-aa6b49013e11.png">

  This lets you experiment with your page load performance, interactively testing the effects of blocking or delaying assets in your critical path.

### New Audits
- **CSS usage** - #1421, #1479, #1466, #1496, #1557

  Reports the number of unused style rules in your page and the byte/time savings of removing them:

  <img width="831" alt="screen shot 2017-02-09 at 23 43 17" src="https://cloud.githubusercontent.com/assets/316891/22818581/d4fd379c-ef22-11e6-9143-36cc7c7245ae.png">
- **Image optimization** - #1452, #1579

  Reports images that are unoptimized and the byte/time savings of optimizing them:

  <img width="630" alt="screen shot 2017-02-09 at 23 43 49" src="https://cloud.githubusercontent.com/assets/316891/22818588/dd3994aa-ef22-11e6-8fee-7469a8866aa6.png">
- **Report Chrome's deprecated API warnings** - #1470

  Lists console warnings from Chrome if your page is using deprecated APIs or features that have [interventions](https://www.chromestatus.com/features#intervention):

  <img width="675" alt="screen shot 2017-02-10 at 00 05 25" src="https://cloud.githubusercontent.com/assets/316891/22818969/b317e9d6-ef24-11e6-89db-9ee596ba8539.png">
- **Responsive image sizing** - #1497

  Reports images that are too big and the potential byte/time savings of sizing them correctly for the given device:

  <img width="758" alt="screen shot 2017-02-09 at 23 44 23" src="https://cloud.githubusercontent.com/assets/316891/22818602/ef802c82-ef22-11e6-9e77-138bd743aca8.png">

### Improvements
- **Audit:** Catch more obsolete cases in `no-old-flexbox` audit - #1374
- **Audit:** Add extended timing data to `speed-index` audit results - #1430, #1558
- **Audit:** Base bytes- and time-saved estimates on mean throughput for that load - #1536
- **CLI:** Disable more Chrome background features that may interfere with auditing - #1416
- **CLI:** Close tab when Lighthouse is done with it - #1543, #1592
- **CLI:** Use `--output-path` when saving artifacts and assets from run - #1601
- **CLI:** Update `--perf` config to include latest perf audits - #1640
- **Extension:** Move from a persistent background page to an event page - #1487
- **Extension:** ~~Option to disable other extensions during run for improved accuracy~~ - #1492, #1604 (see #1689)
- **Gatherer:** Issue `all-event-listeners` collection commands in parallel to improve performance - #1667
- **PerformanceExperiment:** Create server to rerun Lighthouse with new options on POST request - #1393
- **PerformanceExperiment:** Add UI for options to block asset loading on rerun - #1455, #1577
- **PerformanceExperiment:** Add report sidebar to switch between multiple Lighthouse run results - #1477, #1597
- **Report:** Expand audit `<details>` on print - #1468
- **Report:** Add table formatter for audit details - #1505, #1538, #1546, #1547, #1545, #1622, #1636, #1678
- **Report:** Reduce visual noise by auto-collapsing audit details and removing redundant info - #1561, #1598, #1606, #1617
- **Report:** Remove 'Coming Soon' results from report - #1637
- **Report:** Share save and export code in report and Viewer - #1594
- **Viewer:** Make Viewer a PWA - #1554, #1571

### Bug Fixes
- Stop Lighthouse run if initial page request fails (404, domain not found, etc) - #1174, #1603, #1677
- **Audit:** Check for proper mimetype in tags-that-block audit - #1432
- **Audit:** Add proper parsing of meta viewport content - #1267
- **Audit:** Ignore fragment in document URL comparison to correctly test offline loading - #1319, #1566
- **Audit:** Filter out `goog_*` from user timings - #1563
- **Audit:** Report proper first paint delay for blocking tags audits - #1555
- **Audit:** Handle empty chain in critical-request-chains audit - #1620
- **Audit:** Warn that `geolocation-on-start` gatherer cannot be run on insecure origins - #1679
- **CLI:** Guard against launching multiple Chrome processes - #1436
- **CLI:** Add support to find Chrome via `LIGHTHOUSE_CHROMIUM_PATH` variable on Windows - #1572
- **PerformanceExperiment:** Fix various cross-browser report issues - #1593
- **Report:** Improve filename eliding in audit details - #1437
- **Report:** Various fixes for mobile and cross-browser issues - #1429, #1551, #1590, #1626
- **Report:** Change generated HTML to be mostly valid; improve CSS consistency - #1575, #1627

### Testing
- Viewer: Add tests for file uploader - #1184
- Update smokehouse to support deep comparisons of test expectations - #1450, #1457
- Fix eslint base config, improve rules - #1462, #1440
- Deal with Shop test site flakiness - #1491, #1493, #1654
- Remove global installation of typescript on Travis - #1520
- Use `bash` and `node` explicitly in npm scripts for cross-platform compatibility - #1510
- Switch to a more concise unit test reporter - #1650

### Docs
- Add Chrome webstore extension screenshots - #1481, #1531, #1526
- Various JSDoc, markdown, and capitalization fixes - #1441, #1494, #1503, #1533, #1523, #1553, #1565
- **Audit:** Change messaging for uses-h2 audit - #1445
- **Report:** Add help text (with links to docs) to manifest and a11y audits - #1428, #1589

### Refactor
- Use `json-stringify-safe` only when necessary - #1435
- Centralize console special characters for cross-platform compatibility - #1438, #1509
- Add JS information to categories traced - #1442, #1444
- Track enabled debugger domains for safe simultaneous use - #1474
- Node v6+: switch to rest parameters, `[].includes()`, and default parameters - #1524, #1580, #1633
- Introduce `TraceOfTab` computed artifact to centralize extraction of key trace events - #1549
- Handle gatherer errors as native exceptions instead of `-1` ad hoc system - #1560, #1623, #1641, #1624
- Create audit error result to rid report of `-1`s and score more consistently - #1591, #1649, f92b8ed
- Save log of debugger protocol messages for `Page` and `Network` events - #1665, #1669
- Move `tracingModel` to computed artifact to halve time spent constructing timeline model - #1668
- **CLI:** Simplification of asset saving format and filenames - #1433, bba5818
- **Report:** Turn report script into class, Viewer into subclass - #1471, #1559
- **Report:** Include each partial's CSS only once - #1652

### Release
- Add release checklist to contribution guide - #1409, #1423
- Add npmignore file - #1411, #1681
- Add install/build scripts for each `package.json` - #1439, #1488, #1522

### Dependencies
- Lock `package.json` dependencies to specific versions - #1422
- Update `mocha` to 3.2.0 - #1585



<a name="1.4.1"></a>
## 1.4.1 (2017-01-05)

* 1.4.1 (#1406) ([179783b](https://github.com/GoogleChrome/lighthouse/commit/179783b))
* Add LH images assets. Fixes #1401 ([0d5a4bc](https://github.com/GoogleChrome/lighthouse/commit/0d5a4bc)), closes [#1401](https://github.com/GoogleChrome/lighthouse/issues/1401)
* Allow FMP trace event to appear slightly before the FCP (#1404) ([a7648e7](https://github.com/GoogleChrome/lighthouse/commit/a7648e7))
* fix: don't extend URL in url-shim to support es5 transpilation (#1407) ([b03b0db](https://github.com/GoogleChrome/lighthouse/commit/b03b0db))



<a name="1.4.0"></a>
# 1.4.0 (2017-01-04)
[Full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.4.0...1.3.2)

### New Contributors!

@dracos, @lokson, and @AdrianoCahete

### Improvements
- Add URL blocking by pattern to driver - #1195
- **Extension:** Add test URL to "Report Error" template - #1357
- **Extension:** Keep Lighthouse extension popup active while running - #1185
- **Extension:** Use live icon and badge text while running - #1367
- **Gather:** Only run axe tests that we have audits for - #1257
- **Report:** Only use markdown for injected HTML - #1226
- **Report:** Style tweaks for DevTools report - 4a2f97a21644989c325e1203be2af7230773934f, 68ccb6401143f18ac9702bb8d05a82936c1c8b0e
- **Report:** Include total score in JSON and pretty output modes - #1356
- **Viewer:** Add input for gist URL on mobile - #1341

### Bug Fixes
- **Audit:** Handle invalid URLs in `external-anchors-use-rel-noopener` audit - #1358
- **Audit:** Handle invalid URLs in `no-console-time` and `no-datenow` audits - #1288
- **Audit:** Make zero-length critical-request chains pass the test - #1303
- **Audit:** Add `"minimal-ui"` as an allowed Manifest `display` value - #1268
- **Audit:** Improved handling of invalid URLs in call site and event listener audits - #1390
- **Audit:** Async stylesheet handling to limit false positives for stylesheets blocking first paint - #1389
- **CLI:** Improve Windows console support - #1307
- **CLI:** Ignore `which` failures when looking for Linux Chrome executable - #1395

### Docs
- Closure type check fixes - #1293

### Refactor
- Return artifacts from Runner (and move assets/artifacts saving to CLI) - #1163, #1400
- **PerformanceExperiment:** Centralize more implementation in `server.js` - #1189

### Dependencies
- Only list `mkdirp` dependency once - #1284
- Add `marked` - #1226



<a name="1.3.2"></a>
## 1.3.2 (2016-12-23)

* 1.3.2 (#1281) ([aa1059b](https://github.com/GoogleChrome/lighthouse/commit/aa1059b))
* handle Date.now uses with call site URL (#1277) ([2299f94](https://github.com/GoogleChrome/lighthouse/commit/2299f94))



<a name="1.3.1"></a>
## 1.3.1 (2016-12-22)


### New Contributor!

@XhmikosR

### Improvements
- **Report:** remove `noreferrer` from `helpText` links (#1190)
- **Viewer:** add consolidated export button - #1182

### Bug Fixes
- Remove Node v7 URL parsing while bugs are being fixed - #1187
- Fix `driver.captureFunctionCallSites` in the face of Error polyfills - #1218
- **Audit:** handle anchor tags with no href in 'external-anchors-use-rel-noopener' audit - #1238
- **CLI:** use exec, not spawn, to kill Chrome process on Windows - #1206
- **Viewer:** don't check upload's file type, try to parse json file directly - #1234

### Docs
- **readme:** improve definition - #1216




<a name="1.3.0"></a>
# 1.3.0 (2016-12-20)
[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.2.2...1.3.0)

### New Contributors!

@Janpot, @robdodson, and @WeiweiAtGit

### Major Changes
- New hosted [Lighthouse report viewer](https://googlechrome.github.io/lighthouse/viewer/) - #1109, #1139
- New Lighthouse [logo](https://github.com/GoogleChrome/lighthouse/blob/029e1f0d7809e27f9826dae4d31cced468e135c3/lighthouse-viewer/app/images/lh_logo_bg.png) - #1129, #1144

### Improvements
- Use [`whatwg-url`](https://www.npmjs.com/package/whatwg-url) to parse URLs - #997
- Use `firstMeaningfulPaint` trace event directly - #1066
- Remove whitespace and comments from traceviewer-js - #1095, #1103
- **Audit:** Remove browser-generated `paintNonDefaultBackgroundColor` event from `user-timings` - #1077
- **Audit:** Handle where `tracingStartedInPage` doesn't precede `navStart` in trace - #1152, 9c8d13e5
- **Audit:** Add new required attr and attr-value accessibility audits - #1156
- **CLI:** Add improved search for Chrome executable on Linux - #856
- **CLI:** Add check that TypeScript files have been compiled before running - #1113
- **CLI:** Add `--view` flag which serves generated report after Lighthouse run - #1130, f6afd225
- **Driver:** Return meaningful errors from page context when `evaluateAsync` rejects - #1037
- **Report:** Create "Fancier Stuff" section for newer (but not necessarily better) APIs - #1087
- **Report:** Convert `helpText` toggle to pure CSS - #1104
- **Report:** Stick header to top of page - #1121, #1132, #1133
- **Report:** Make mobile-friendly and responsive - #1134
- **Report:** Don't emit script tags in devtools report - #1105
- **Report:** Use same favicon throughout all reports - #1172
- **Viewer:** Move share button to core report - #1117
- **Viewer:** Add support for copy and paste of report JSON - #1126, #1128
- **Viewer:** Concat CSS files - #1153

### Bug Fixes
- Unmute some smoke test failures - #1081
- **CLI:** Make `rimraf` async for deleting Chrome temp profile - #1127
- **CLI:** Eliminate errors from calling `ChromeLauncher.kill()` twice - #1131
- **CLI:** Fix html `reportContext` when generated by the CLI - #1171
- **Driver:** Fix `evaluateAsync` when page has overridden native Promise - #1037, #1178
- **Report:** Fix for formatting with unknown time zone - #1086
- **Report:** Fix report color issues in Safari - #1114
- **Report:** Fix print styling - #1180
- **Testing:** Handle critical-request-chains audit promise rejections - #1100
- **Testing:** Fix failing lint test - aa6d38b3
- **Viewer:** Disable sharing button if gist is already saved - #1118

### Testing
- Don't run Closure type checking on Travis - 558a26
- Update `eslint` and `eslint-config-google` to latest - #1136, #1159, #1160
- **Audit:** Add tests for `notification-on-start` - #1089
- **CLI:** Add test for obsolete CLI flags - #1168
- **Viewer:** Add analytics #1120, #1162
- **Viewer:** Add build of viewer to CI test suite - #1160

### Docs
- Update jsconfig for intellisense - 835ae985
- **Audit:** Fix type in `no-console-time` `helpText` - #1142
- **Audit:** Add links to DoBetterWeb `helpText` docs - #1161
- **readme:** Add Viewer to readme - #1164

### Refactor
- **Audit:** Add check for an audit's `requiredArtifacts` before running - #1088
- **Audit:** Centralize auditing of `axe-core` results - #1167
- **CLI:** Unify `bin.ts` execution and error-handling paths - #1141
- **Gatherer:** Gatherers now return artifacts directly rather than setting `this.artifact` - #1122
- **Viewer:** Split code into modules - #1116
- **Viewer:** Use `tsc` to es3ify viewer code - #1150

### Dependencies
- Add [`whatwg-url`](https://www.npmjs.com/package/whatwg-url) - #997
- Add [`opn`](https://www.npmjs.com/package/opn) - #1130
- Remove [`jszip`](https://www.npmjs.com/package/jszip) - #1094
- Update [`eslint`](https://www.npmjs.com/package/eslint) and [`eslint-config-google`](https://www.npmjs.com/package/eslint-config-google) - #1136
- Update [`axe-core`](https://www.npmjs.com/package/axe-core) to 2.1.7; now 8x faster - #1155




<a name="1.2.2"></a>
## 1.2.2 (2016-11-29)

[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.2.1...1.2.2)

### New Contributor!

@beaufortfrancois

### Improvements
- **Extension:** remove "tabs" extension permission - #1032

### Bug Fixes
- Ensure `driver.captureFunctionCallSites` resolves to an array - #1036
- Handle call sites in `eval`'d code in `driver.captureFunctionCallSites` - #1073
- **Audit:** identify `noopener` when in list of link types in `rel` - #1035
- **CLI:** explicitly close outfile and errfile in chrome launcher - #1057
- **Extension:** set minimum supported Chrome to m54 - #1027
- **Extension:** better error message if user attempts to audit the Chrome Web Store - #1025
- **Report:** work around unsupported timezones when pretty printing dates - #1067
- **Report:** fix coloring by score - #1070

### Docs
- **Report:** better formatting for Manifest icon size list - #1041, #1044
- **Report:** improve language consistency in audit `description` strings - #1045
- **Report:** add `helpText` to remaining audits - #998
- **Report:** remove scores from performance metrics; change to pass/fail - #1072



<a name="1.2.1"></a>
## 1.2.1 (2016-11-23)
[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.2.0...1.2.1)

### Improvements
- **Audit:** add DBW audit for `<script>` elements in head that block first paint - #965
- **Extension:** Add error description to title of auto-generated github issues - #992

### Bug Fixes
- fix typo in default config file - f9f7c25
- **Audit:** treat non-strings as an error in `without-javascript` gatherer and audit - #971
- **Audit:** catch driver errors (and set on `artifact.debugString`) in geolocation gatherer - #999
- **Audit:** fix property name used for error value in `all-event-listeners` gatherer - #1013
- **CLI:** fix implicit-any-typed `_` in chrome launcher - #981
- **Extension:** fix aggregation category filtering based on selection in options panel - #973
- **Report:** escape </script> tags when embedding raw results in the html page - #1003

### Testing
- Force `npm install` (for now) on Travis after [their change](https://github.com/travis-ci/travis-build/pull/895) to prefer yarn - #994

### Docs
- **readme:** new report screenshot - cb2ebfd

### Refactor
- Unify CLI and extension implementations of debugger protocol error handling - #977



<a name="1.2.0"></a>
# 1.2.0 (2016-11-17)
[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.1.7...1.2.0)

### New Contributors!

@Bassoon08, @karanjthakkar, @chowse, @hsingh23, @olingern, and @patrickhulce

### Major Changes
- Launch [DoBetterWeb](https://github.com/GoogleChrome/lighthouse#do-better-web) (DBW) audits and gatherers as part of default Lighthouse run - #917
- **Report:** Lighthouse report refactor and refresh - #926, #935

### Improvements
- Log errors in red, warnings in yellow - #860, #915
- **Audit:** Add DBW audit for Mutation Events - #786
- **Audit:** Add DBW audit for `<link>` elements in head that block first paint - #892
- **Audit:** Add DBW audit for `rel=noopener` on external links - #912
- **Audit:** Make geolocation audit return error if permission already granted - #925
- **CLI:** Handle `--quiet` logging as silent - #881
- **Extension:** Add integrated 'Report Error' button with pre-populated data - #944
- **Gatherer:** Add support for collecting event listeners across all DOM nodes - #930
- **Report:** Remove excessive EIL percentiles from report - #851
- **Report:** Update TTI scoring label to 5000ms to match guidance - #947
- **Report:** Cleanup of event listener extended info display - #952
- **Report:** Group event listener extended info by call site location - #960

### Bug Fixes
- Restore log's status event payload - #883
- Ignore protocol error from defensive `DOM.disable` call - #895, #907
- Remove cache-contents gatherer from default config since currently no audit requires it - #900
- Enforce audit naming consistency in the config file and filenames - #914
- **Audit:** Handle error case from htmlwithoutjs gatherer and audit - #891
- **Audit:** Prevent attempts to parse script URLs when no URL was found - #893
- **Audit:** Don't include disabled `<link>`s in link-blocking-first-paint audit - #911
- **Audit:** Handle undefined Accessibility violations array - #942
- **Audit:** Only create a manifest display debugString when there is an error - #954
- **Audit:** Look for non-async `<link>`s and fix unit of time in link-blocking-first-paint audit - #963
- **CLI:** Add `main` field to CLI's package.json - #875
- **CLI:** Disable Chrome's Google Translate service during Lighthouse run - #897
- **CLI:** Disable Chrome's default Apps during Lighthouse run - #918
- **Driver:** Dedupe function call site entries on location, not stack trace - #958
- **Extension:** Properly filter the audits to run - #946
- **Gatherer:** Handle CSS parse errors in stylesheet gatherer - #906
- **Report:** Move `gt` handlebars helper to accessibility formatter - #929
- **Report:** Fix handlebars `and` helper to show `displayValue` in reports - #938

### Testing
- Add DBW to smokehouse tests - #843, #901
- Add script for bumping Travis to restart timing-out test runs - #913
- Fix Travis timeouts by rerunning with random Chrome debug ports - #922

### Docs
- **Audit:** Update EQT/EIL design doc links to latest docs - #923
- **Audit:** Fix no-datenow `helpText` typo - #955
- **Audit:** Update uses-passive-event-listeners `description` text - #956
- **readme:** Add DBW to readme - #863
- **readme:** Update development section with TypeScript info - #859
- **readme:** Document yarn install command - #939

### Refactor
- **Audit:** Rewrite geolocation-on-start audit to use DBW tooling and testing - #903
- **CLI:** Migrate `chrome-debug` binary to use internal Chrome launcher - #898
- **Report:** Refactor report generation to be blob based and simpler - #908

### Dependencies
- Yarn lock file cleanup - 3e9e88c


<a name="1.1.7"></a>
## 1.1.7 (2016-10-31)

[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.1.6...1.1.7)

### Features
- Add cpu throttling option (initially disabled by default) - #747
- Stop Lighthouse run if tabs with a shared Service Worker are found - #639
- Add Web Worker entry point to `lighthouse-background.js` - #803
- **Audit:** add DBW stylesheet gatherer and old flexbox audit - #767
- **Audit:** adopt [Perceptual Speed Index](http://www.parvez-ahammad.org/blog/perceptual-speed-index-psi-for-measuring-above-fold-visual-performance-of-webpages) - #785
- **Audit:** add DBW audit for passive event listeners - #830
- **CLI:** add support for using stable Google Chrome on MacOS - #782

### Bug Fixes
- Fix function call location from `driver.captureJSCallUsage` - #779
- Update `driver.captureFunctionCallSites` to use updated `driver.evaluateAsync` - #809
- Stop interpreting manifest parse errors as failure to fetch manifest - #823
- Update `npm run dbw` to use new emulation flags - #834
- Make network emulation numbers always integers - #839
- Trim `extendedInfo` returned from DBW http2 audit to prevent circular references - #842
- Navigate to about:blank before driver setup - #850
- Fix handling of errors from the debugging protocol - #853
- Stop spreading strings in `log` - #835
- Allow debugger protocol's `DOM` domain to be redundantly disabled - #861
- Remove tab `targetId` requirement for checking if other tabs will share a service worker - #852
- Consistently reject Promises with an `Error` - #862
- Don't throw an error in stylesheet gatherer if no stylesheets are found - #864
- **CLI:** Disable extension system in launched Chrome instance - #771
- **CLI:** make Chrome Launcher respect `--quiet` flag - #774
- **CLI:** use about:blank as initial URL - #776
- **CLI:** make HTML report have gitignorable filename - #790
- **CLI:** fix `outputMode` conditional - #846
- **CLI:** add warning if `tsc` has not been run before use - #857
- **Report:** fix pluralization of "resources" - #773

### Testing
- Add smokehouse, an end-to-end test runner, and use for smoke tests - #781, #788
- Run default smoke tests with full config - #801
- Add `prefer-const` eslint rule - #804
- Run well-known-PWA smokehouse tests in CI - #824
- Fix several eslint warnings - #831
- Test node v6 and v7 explicitly in CI - #832
- Add tests for `getLogNormalDistribution` and `getRiskToResponsiveness` on `TracingProcessor` - #806

### Docs
- **CLI:** clarify description of `--select-chrome` flag - #829
- **readme:** add basic instructions for custom audits/gatherers - 8d696af
- **readme:** update module diagram - ee1dc0d
- **readme:** add node debugging getting started tip - #807
- **readme:** add CLI TS development notes - #818
- **readme:** matching parentheses - #855

### Refactor
- Make [`web-inspector.js`](https://github.com/GoogleChrome/lighthouse/blob/694baf61d587eda360e89fde4bb17e6cd46fcbf0/lighthouse-core/lib/web-inspector.js) worker friendly - #795
- Migrate `driver.evaluateAsync` to `Runtime.evaluate(awaitPromise)` - #793
- Extract a `Connection` abstraction from driver - #800
- Create `connections/` directory for debugger protocol connection classes - #822
- **CLI:** convert CLI to typescript - #702
- **CLI:** split mobile emulation and network emulation into separate `--disable-device-emulation` and `--disable-network-throttling` flags - #747
- **CLI:** add more explicit TS typing - #825
- **Extension:** simplify reloading clean state at end of run - #813, #816

### Dependencies
- Bump speedline to 1.0.3 - #785
- Added [typescript](https://www.npmjs.com/package/typescript) - #702
- Removed [chrome-remote-interface](https://www.npmjs.com/package/chrome-remote-interface); added [ws](https://www.npmjs.com/package/ws) - #800




<a name="1.1.6"></a>
## 1.1.6 (2016-10-12)

* 1.1.6 ([f80e121](https://github.com/GoogleChrome/lighthouse/commit/f80e121))
* Add yarn.lock (#765) ([b44e69d](https://github.com/GoogleChrome/lighthouse/commit/b44e69d))
* Fix NaN% in CLI report (#763) ([a21ec65](https://github.com/GoogleChrome/lighthouse/commit/a21ec65)), closes [#763](https://github.com/GoogleChrome/lighthouse/issues/763)
* Replace instances of 'not unfunctioning' with 'still functional' (#764) ([5476243](https://github.com/GoogleChrome/lighthouse/commit/5476243))
* Temporarily disable cache contains start_url audit in config (#766) ([f444703](https://github.com/GoogleChrome/lighthouse/commit/f444703))
* docs: favor installing stable package from npm instead of Github master ([4b8ef79](https://github.com/GoogleChrome/lighthouse/commit/4b8ef79))
* chore: tweak eslintignore. ([fde5452](https://github.com/GoogleChrome/lighthouse/commit/fde5452))



<a name="1.1.5"></a>
## 1.1.5 (2016-10-10)
[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.1.4...1.1.5)

### Features
- Enable passing in a custom `pauseAfterLoad` option #697
- Wait until network has settled before considering page as loaded #714
- Support dynamic plugins in lighthouse config #730
- **Audit:** add DBW AppCache audit #681, #687
- **Audit:** add DBW WebSQL audit #691
- **Audit:** add DBW requests-should-be-over-h2 audit #700
- **Audit:** add DBW `Date.now()` -> `performance.now()` audit #707
- **Audit:** add DBW `console.time()` -> `performance.mark()` audit #712
- **Audit:** add DBW `document.write()` audit #716
- **CLI:** add `chrome-debug` binary to launch the debuggable standalone chrome #678
- **CLI:** reporter pretty formatting #682
- **CLI:** add `npm run dbw` to run DoBetterWeb audits #696
- **Extension:** print errors thrown from handlebars #731
- **Report:** add version number #673
- **Report:** add `helpText` associated with audit results #695
- **Report:** add version number on all report formats #749
- **Report:** tighter vertical whitespace in HTML report #754
- **Report:** add `generatedTime` property in json output #752
- **Report:** add toggle to display `helpText` #751

### Bug Fixes
- Remove old `auditWhitelist` argument #676
- Stop clearing cookies when run #717
- Allow updated speedline to display results for traces with fewer than three frames #745
- Sort trace events by timestamp before calculating FMP #756
- **CLI:** add support for Windows 10 without Chrome Canary #690
- **CLI:** fix screenshot save via `--save-assets` #711
- **CLI:** fix `--mobile` flag #721
- **Extension:** fixes for updated dependencies #734
- **Report:** add fallback font for url heading #674
- **Testing:** loosen path requirement for closure formatter replacement #701
- **Testing:** handle http-redirect gatherer promise rejections #729
- **Testing:** handle https gatherer promise rejections #738
- **Testing:** handle promise rejections in runner testing #739

### Refactor
- Automatically cache computed artifacts #675
- Streamline extensible gather and audit loading #679, #692
- Add `'use strict';` to files where it was missing #694
- Handle `sendCommand` promise rejections #703
- Rename of some `config.json` properties #727
- **Extension:** improve `queryCurrentTab` impl #680
- **Testing:** stronger `user-timing` test assertions #732
- **Testing:** run coveralls only after build success #733
- **Testing:** fix tests which were unconditionally passing failed assertions #737

### Dependencies
- Bump [catapult/traceviewer](https://github.com/catapult-project/catapult/) to latest #723
- Bump [chrome-devtools-frontend](https://github.com/ChromeDevTools/devtools-frontend) to 1.0.401423 #724
- Bump speedline to 1.0.0 #726
- Bump speedline to 1.0.1 (now handles traces with one, two, or three screenshots) #728




<a name="1.1.3"></a>
## 1.1.3 (2016-09-06)

* 1.1.3 ([a5bbe23](https://github.com/GoogleChrome/lighthouse/commit/a5bbe23))
* about:blank navigation moved to before gatherer.beforeClass() ([8cf3841](https://github.com/GoogleChrome/lighthouse/commit/8cf3841))
* add comment on npm explore ([5b36ebb](https://github.com/GoogleChrome/lighthouse/commit/5b36ebb))
* add context to aggregator error strings ([ab96e71](https://github.com/GoogleChrome/lighthouse/commit/ab96e71))
* Add custom config example. Just the perf stuff. (#603) ([ef4044a](https://github.com/GoogleChrome/lighthouse/commit/ef4044a))
* Add empty API-and-internals.md doc ([fb690be](https://github.com/GoogleChrome/lighthouse/commit/fb690be))
* add goOffline/goOnline methods to driver ([ceb5f36](https://github.com/GoogleChrome/lighthouse/commit/ceb5f36))
* added some docs about running LH headless. ([8a176e1](https://github.com/GoogleChrome/lighthouse/commit/8a176e1))
* Added test suffix to all tests ([e9110bf](https://github.com/GoogleChrome/lighthouse/commit/e9110bf))
* Addresses comments ([8c0c05c](https://github.com/GoogleChrome/lighthouse/commit/8c0c05c))
* Adds support for custom audits and gatherers ([bab838b](https://github.com/GoogleChrome/lighthouse/commit/bab838b))
* Asset saver test fixup. ([d24c91e](https://github.com/GoogleChrome/lighthouse/commit/d24c91e))
* assetsaver. write real traces to disk. ([034e9a6](https://github.com/GoogleChrome/lighthouse/commit/034e9a6))
* Attempt to fix the tests ([34509b1](https://github.com/GoogleChrome/lighthouse/commit/34509b1))
* cache start url audit is Alpha ([65778d1](https://github.com/GoogleChrome/lighthouse/commit/65778d1))
* Changed config/index.js to config/config.js ([2e717fe](https://github.com/GoogleChrome/lighthouse/commit/2e717fe))
* config/config. ([5572aab](https://github.com/GoogleChrome/lighthouse/commit/5572aab))
* correctly fall back on erroneous manifest display modes ([fc10f5b](https://github.com/GoogleChrome/lighthouse/commit/fc10f5b))
* delete page reload/navigate logic since we always navigate ([1810c61](https://github.com/GoogleChrome/lighthouse/commit/1810c61))
* eliminate non-functional loadPage cli flag ([990a3c7](https://github.com/GoogleChrome/lighthouse/commit/990a3c7))
* filterPasses -> validatePasses (#608) ([1fb77ae](https://github.com/GoogleChrome/lighthouse/commit/1fb77ae))
* fix audit, gatherer, artifact browserify import ([1ddb8b1](https://github.com/GoogleChrome/lighthouse/commit/1ddb8b1))
* Fix eslint issues in extension ([6be4acf](https://github.com/GoogleChrome/lighthouse/commit/6be4acf))
* fix jsconfig for vscode. ([02dfba2](https://github.com/GoogleChrome/lighthouse/commit/02dfba2))
* Fixed headless documentation ([58e5be5](https://github.com/GoogleChrome/lighthouse/commit/58e5be5))
* Fixes TTI not being counted in overall score ([82c5051](https://github.com/GoogleChrome/lighthouse/commit/82c5051))
* headless docs: adjustments to pr #623 ([364ba40](https://github.com/GoogleChrome/lighthouse/commit/364ba40))
* Introduce computedArtifacts (#583) ([c8662e3](https://github.com/GoogleChrome/lighthouse/commit/c8662e3))
* Keep track of the document URL post-redirects (#582) ([ac70731](https://github.com/GoogleChrome/lighthouse/commit/ac70731))
* launch-chrome: inform user about Chrome launch. refactor & cleanup. ([fdff2ae](https://github.com/GoogleChrome/lighthouse/commit/fdff2ae))
* merge latest manifest/display tests. ([af716df](https://github.com/GoogleChrome/lighthouse/commit/af716df))
* mocha tests unfortch can't rely on globbing ([35e649a](https://github.com/GoogleChrome/lighthouse/commit/35e649a))
* move manifest parser test to correct directory ([35eb5a1](https://github.com/GoogleChrome/lighthouse/commit/35eb5a1))
* move SW version test to audit to use possibly redirected URL ([46e1458](https://github.com/GoogleChrome/lighthouse/commit/46e1458))
* Moves from XHR to DevTools Protocol for manifest retrieval (#600) ([74690f1](https://github.com/GoogleChrome/lighthouse/commit/74690f1))
* overwrite loadData only when configured to ([b798f89](https://github.com/GoogleChrome/lighthouse/commit/b798f89))
* parse URLs in Web App Manifest relative to manifest itself ([f45ae69](https://github.com/GoogleChrome/lighthouse/commit/f45ae69))
* properly throw debug error when page does not include manifest ([6d2ae74](https://github.com/GoogleChrome/lighthouse/commit/6d2ae74))
* Readded $DISPLAY ([1b14da8](https://github.com/GoogleChrome/lighthouse/commit/1b14da8))
* refactor of gather-runner to clarify lifecycle ([8c5e7d1](https://github.com/GoogleChrome/lighthouse/commit/8c5e7d1))
* Refactor the JSON output. (#567) ([703ded6](https://github.com/GoogleChrome/lighthouse/commit/703ded6))
* Remove find command in runmocha ([81653a4](https://github.com/GoogleChrome/lighthouse/commit/81653a4))
* remove redundant gatherer lifecycle methods ([ac2f62d](https://github.com/GoogleChrome/lighthouse/commit/ac2f62d))
* rename computed artifact tests. ([5d20fa8](https://github.com/GoogleChrome/lighthouse/commit/5d20fa8))
* Rename lighthouse-cli tests as well ([9ee4c57](https://github.com/GoogleChrome/lighthouse/commit/9ee4c57))
* Revamp of the offline.js gatherer ([2b39d27](https://github.com/GoogleChrome/lighthouse/commit/2b39d27))
* Revamp smoketest, include offline & SW test ([543b422](https://github.com/GoogleChrome/lighthouse/commit/543b422))
* review feedback ([6add53a](https://github.com/GoogleChrome/lighthouse/commit/6add53a))
* Run audits sequentially. ([8fe81d8](https://github.com/GoogleChrome/lighthouse/commit/8fe81d8))
* s/traceName/passName ([f300f67](https://github.com/GoogleChrome/lighthouse/commit/f300f67))
* Save audit list into storage so it's kept for the next run (#595) ([5c72d72](https://github.com/GoogleChrome/lighthouse/commit/5c72d72))
* smoke test: clean up backgrounded processes. ([74c5f9c](https://github.com/GoogleChrome/lighthouse/commit/74c5f9c))
* squish saveArtifacts and saveAssets together. ([ea23dbd](https://github.com/GoogleChrome/lighthouse/commit/ea23dbd))
* support collecting network records per pass ([4ef3c98](https://github.com/GoogleChrome/lighthouse/commit/4ef3c98))
* terminology fixes and docs added to extension ([8dbd6fa](https://github.com/GoogleChrome/lighthouse/commit/8dbd6fa))
* Update first-meaningful-paint.js ([add0f03](https://github.com/GoogleChrome/lighthouse/commit/add0f03))
* update offline gatherer to use network recording changes ([db69edd](https://github.com/GoogleChrome/lighthouse/commit/db69edd))
* Update tracing-processor.js ([b526eb3](https://github.com/GoogleChrome/lighthouse/commit/b526eb3))
* readme: updates about m52, etc. ([54b93b9](https://github.com/GoogleChrome/lighthouse/commit/54b93b9))
* eslint: no longer ignore all of lighthouse-extension (#613) ([5e42394](https://github.com/GoogleChrome/lighthouse/commit/5e42394))
* docs: headless setup. ([9cb1536](https://github.com/GoogleChrome/lighthouse/commit/9cb1536))
* README: add link to debugging protocol and viewer ([7ba8830](https://github.com/GoogleChrome/lighthouse/commit/7ba8830))
* README: remove outdated install instructions ([5996db7](https://github.com/GoogleChrome/lighthouse/commit/5996db7))



<a name="1.1.2"></a>
## 1.1.2 (2016-08-06)

* 1.1.2 ([0269917](https://github.com/GoogleChrome/lighthouse/commit/0269917))
* addressing brendan's review for ALL the brownie points. ([685bda0](https://github.com/GoogleChrome/lighthouse/commit/685bda0))
* bump extension to 1.1.2 ([1d745c3](https://github.com/GoogleChrome/lighthouse/commit/1d745c3))
* Fixed links to small buttons ([f9de055](https://github.com/GoogleChrome/lighthouse/commit/f9de055))
* Generate audit list from configJson ([1b1cbdf](https://github.com/GoogleChrome/lighthouse/commit/1b1cbdf))
* Generate audit options in extension from configJSON ([a4bfc04](https://github.com/GoogleChrome/lighthouse/commit/a4bfc04))
* Update manifest-background-color.js ([38ba8a2](https://github.com/GoogleChrome/lighthouse/commit/38ba8a2))



<a name="1.1.1"></a>
## 1.1.1 (2016-08-05)

* 1.1.1 ([ed8e056](https://github.com/GoogleChrome/lighthouse/commit/ed8e056))
* Add and adjust cache-start-url test coverage ([81e98d0](https://github.com/GoogleChrome/lighthouse/commit/81e98d0))
* Add extra assertions on the state of debugString ([c7884d7](https://github.com/GoogleChrome/lighthouse/commit/c7884d7))
* Added audit configurations to extension ([561efc2](https://github.com/GoogleChrome/lighthouse/commit/561efc2))
* bump extension to 1.1.0 (now matches npm module) ([699eafd](https://github.com/GoogleChrome/lighthouse/commit/699eafd))
* bump extension to 1.1.1 ([ac4785e](https://github.com/GoogleChrome/lighthouse/commit/ac4785e))
* Clean up CLI logging, moving protocol work to --verbose. (#556) ([6663f6b](https://github.com/GoogleChrome/lighthouse/commit/6663f6b))
* cleanTrace acts on the whole trace ([fa837c3](https://github.com/GoogleChrome/lighthouse/commit/fa837c3))
* Delete launch-chrome.sh ([e90b128](https://github.com/GoogleChrome/lighthouse/commit/e90b128))
* Fix exception on missing manifest start_url ([269b5a8](https://github.com/GoogleChrome/lighthouse/commit/269b5a8))
* handle old and new trace object format ([7c9c44f](https://github.com/GoogleChrome/lighthouse/commit/7c9c44f))
* Manifest tests: Always use the manifest parser ([12bfb3a](https://github.com/GoogleChrome/lighthouse/commit/12bfb3a))
* sourcemaps for the extension off, to avoid the 4MB of tax. ([bfd3b02](https://github.com/GoogleChrome/lighthouse/commit/bfd3b02))
* Tweak to status messages. ([b914ea1](https://github.com/GoogleChrome/lighthouse/commit/b914ea1))



<a name="1.1.0"></a>
# 1.1.0 (2016-08-02)

* 1.1.0 ([d9a7f84](https://github.com/GoogleChrome/lighthouse/commit/d9a7f84))
* add test for traceviewer's require not throwing. ([7293f6e](https://github.com/GoogleChrome/lighthouse/commit/7293f6e))
* bump traceviewer to master. ([a628f62](https://github.com/GoogleChrome/lighthouse/commit/a628f62))
* clarify chrome remote interface var in CLI driver ([b6592d4](https://github.com/GoogleChrome/lighthouse/commit/b6592d4))
* cleanup of extension driver attachment and event registration ([69622b8](https://github.com/GoogleChrome/lighthouse/commit/69622b8))
* fix off-by-one error causing Infinity in 100% EIL ([2737165](https://github.com/GoogleChrome/lighthouse/commit/2737165))
* Fix traceviewer update instructions in README ([2f29085](https://github.com/GoogleChrome/lighthouse/commit/2f29085))
* Fixed version argument in yargs to display current cli version ([504ea95](https://github.com/GoogleChrome/lighthouse/commit/504ea95))
* handle new require for Mann-Whitney U statistics test. ([e0e1052](https://github.com/GoogleChrome/lighthouse/commit/e0e1052))
* Improve check for used JS features (#544) ([4f43470](https://github.com/GoogleChrome/lighthouse/commit/4f43470))
* move driver event handling to base class ([07b3ccb](https://github.com/GoogleChrome/lighthouse/commit/07b3ccb))
* Refactor npm scripts for mocha ([59fdea9](https://github.com/GoogleChrome/lighthouse/commit/59fdea9))
* switch to trace viewer's lean_config, instead of including ALL importers. ([7202494](https://github.com/GoogleChrome/lighthouse/commit/7202494))
* trace reading: only bind to the first tracingComplete event. ([fe634e7](https://github.com/GoogleChrome/lighthouse/commit/fe634e7))
* Update readme.md with trace changes. ([ab76af1](https://github.com/GoogleChrome/lighthouse/commit/ab76af1))
* extension: Don't lint in the watch loop. ([999d3bf](https://github.com/GoogleChrome/lighthouse/commit/999d3bf))
* extension: exclude source-map module from browserified bundles. ([61b8de3](https://github.com/GoogleChrome/lighthouse/commit/61b8de3))
* extension: log exceptions to bg page console. ([9d9642c](https://github.com/GoogleChrome/lighthouse/commit/9d9642c))



<a name="1.0.6"></a>
## 1.0.6 (2016-07-28)

* 1.0.6 ([e8bb926](https://github.com/GoogleChrome/lighthouse/commit/e8bb926))
* Adds auto-requested geolocation audit (#510) ([60a06c5](https://github.com/GoogleChrome/lighthouse/commit/60a06c5))
* Adds content width audit (#493) ([f9bdc7f](https://github.com/GoogleChrome/lighthouse/commit/f9bdc7f))
* Checks cache for start URL (#507) ([4a66309](https://github.com/GoogleChrome/lighthouse/commit/4a66309))
* Cleanup harmony scripts #513 (#516) ([da09ffb](https://github.com/GoogleChrome/lighthouse/commit/da09ffb))
* compat note about firstContentfulPaint trace event. ([3e81a6d](https://github.com/GoogleChrome/lighthouse/commit/3e81a6d))
* config requires absolute paths ([9560a42](https://github.com/GoogleChrome/lighthouse/commit/9560a42))
* delete lighthouse-core/package.json ([d07719e](https://github.com/GoogleChrome/lighthouse/commit/d07719e))
* Do the last (clean-state) reload in parallel with finishing the report (#522) ([c14e7a3](https://github.com/GoogleChrome/lighthouse/commit/c14e7a3))
* Extension popup: styling ([50c3ced](https://github.com/GoogleChrome/lighthouse/commit/50c3ced))
* Faster smoketest. Fix Flaky works-offline gather (#506) ([2fdde48](https://github.com/GoogleChrome/lighthouse/commit/2fdde48)), closes [#506](https://github.com/GoogleChrome/lighthouse/issues/506)
* Fix (and speed up) extension browserify post-config refactor. (#499) ([563ae0c](https://github.com/GoogleChrome/lighthouse/commit/563ae0c)), closes [#499](https://github.com/GoogleChrome/lighthouse/issues/499)
* Fix cachecontents test on HTTP pages ([e6fa594](https://github.com/GoogleChrome/lighthouse/commit/e6fa594))
* Fix scoring exception in handlebars (#509) ([bcff128](https://github.com/GoogleChrome/lighthouse/commit/bcff128)), closes [#509](https://github.com/GoogleChrome/lighthouse/issues/509)
* Fixes lint errors ([bd5f8e1](https://github.com/GoogleChrome/lighthouse/commit/bd5f8e1))
* Handles ports for SW. (#535) ([8c39f91](https://github.com/GoogleChrome/lighthouse/commit/8c39f91)), closes [#532](https://github.com/GoogleChrome/lighthouse/issues/532)
* incl critical-request-chains in traceprocessor example ([4636ffe](https://github.com/GoogleChrome/lighthouse/commit/4636ffe))
* manifest display must be one of the 3 allowed values. ([98c4980](https://github.com/GoogleChrome/lighthouse/commit/98c4980))
* move driver/ to gather/ ([35d0360](https://github.com/GoogleChrome/lighthouse/commit/35d0360))
* Moved everything from lighthouse-core to ligthouse ([1b998a3](https://github.com/GoogleChrome/lighthouse/commit/1b998a3))
* note about excluded cpu profile trace category. ([4f66e0d](https://github.com/GoogleChrome/lighthouse/commit/4f66e0d))
* Removes the 'module' folder from main. ([07e4958](https://github.com/GoogleChrome/lighthouse/commit/07e4958))
* Removes unused test ([3585eef](https://github.com/GoogleChrome/lighthouse/commit/3585eef))
* rename gatherer base class to gatherer ([0c7bef7](https://github.com/GoogleChrome/lighthouse/commit/0c7bef7))
* Reuse existing tab fallback (for Chrome headless) ([27d3ed8](https://github.com/GoogleChrome/lighthouse/commit/27d3ed8))
* Show the test progress (#517) ([ffde8e7](https://github.com/GoogleChrome/lighthouse/commit/ffde8e7))
* Skip offline-ready smoketest (#520) ([5d97d38](https://github.com/GoogleChrome/lighthouse/commit/5d97d38))
* smoke test: simplify --harmony branching. check for viewport ([d45883a](https://github.com/GoogleChrome/lighthouse/commit/d45883a))
* This is a 0.1 definition of Time to Interactive (TTI) which considers ([d0d3829](https://github.com/GoogleChrome/lighthouse/commit/d0d3829))
* Trace buckets (#531) ([1275762](https://github.com/GoogleChrome/lighthouse/commit/1275762))
* Traces that are passed in through the config file are cleaned ([1c62db3](https://github.com/GoogleChrome/lighthouse/commit/1c62db3))
* update error message on failed connection to use the npm explore npm run chrome cmd ([466beff](https://github.com/GoogleChrome/lighthouse/commit/466beff))
* Update manifest-display.js ([3b3e3de](https://github.com/GoogleChrome/lighthouse/commit/3b3e3de))
* Wait for trace data to arrive before continuing (#541) ([df6e013](https://github.com/GoogleChrome/lighthouse/commit/df6e013))
* tti: simplify logic grabbing 85% vis complete ([3906dee](https://github.com/GoogleChrome/lighthouse/commit/3906dee))
* smoketest: do full default run against our basic html page. (#534) ([3e632f9](https://github.com/GoogleChrome/lighthouse/commit/3e632f9))
* cli: use logger to print status messages (#530) ([cc3cca4](https://github.com/GoogleChrome/lighthouse/commit/cc3cca4))
* travis: force install extension deps. ([b17f026](https://github.com/GoogleChrome/lighthouse/commit/b17f026))
* readme: include CLI flags ([d34e5bb](https://github.com/GoogleChrome/lighthouse/commit/d34e5bb))
* readme: notes for config & trace-processor usage ([eb81929](https://github.com/GoogleChrome/lighthouse/commit/eb81929))
* readme: notes on node/chrome version compat ([d960c79](https://github.com/GoogleChrome/lighthouse/commit/d960c79))
* readme: update dep graph visualization ([0435803](https://github.com/GoogleChrome/lighthouse/commit/0435803))
* Travis: enable testing of node v4 + --harmony (#501) ([fe5f57d](https://github.com/GoogleChrome/lighthouse/commit/fe5f57d))



<a name="1.0.5"></a>
## 1.0.5 (2016-07-08)

* 1.0.5 ([90ffa1a](https://github.com/GoogleChrome/lighthouse/commit/90ffa1a))
* CLI shouldn't necc exit on semver check ([dec44de](https://github.com/GoogleChrome/lighthouse/commit/dec44de))
* Install child folder deps through helper script (#500) ([e28ee77](https://github.com/GoogleChrome/lighthouse/commit/e28ee77))



<a name="1.0.4"></a>
## 1.0.4 (2016-07-08)
