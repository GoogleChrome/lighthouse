# Lighthouse  [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/CI/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/ci.yml) [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/unit/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/unit.yml) [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/smoke/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/smoke.yml) [![Coverage Status](https://codecov.io/gh/GoogleChrome/lighthouse/branch/main/graph/badge.svg)](https://codecov.io/gh/GoogleChrome/lighthouse) [![Build tracker for Lighthouse](https://img.shields.io/badge/buildtracker-ok-blue)](https://lh-build-tracker.herokuapp.com/) [![NPM lighthouse package](https://img.shields.io/npm/v/lighthouse.svg)](https://npmjs.org/package/lighthouse)

> Lighthouse analyzes web apps and web pages, collecting modern performance metrics and insights on developer best practices.

- Using Lighthouse
  - [Using Lighthouse in Chrome DevTools](#using-lighthouse-in-chrome-devtools)
  - [Using the Chrome extension](#using-the-chrome-extension)
  - [Using the Node CLI](#using-the-node-cli)
    * [CLI options](#cli-options)
  - [Using the Node module](#using-the-node-module)
  - [Viewing a report](#viewing-a-report)
    * [Online Viewer](#online-viewer)
  - [Docs & Recipes](#docs--recipes)
  - [Developing Lighthouse](#develop)
    * [Setup](#setup)
    * [Run](#run)
    * [Tests](#tests)
    * [Docs](#docs)
- Associated Products and Projects
  - [Lighthouse Integrations in Web Perf services](#lighthouse-integrations-in-web-perf-services)
  - [Lighthouse Integrations in non-Web Perf services](#lighthouse-integrations-in-non-web-perf-services)
  - [Plugins](#plugins)
  - [Related projects](#related-projects)
- [FAQ](#faq)
  * [How does Lighthouse work?](#how-does-lighthouse-work)
  * [Can I configure the lighthouse run?](#can-i-configure-the-lighthouse-run)
  * [How does Lighthouse use network throttling, and how can I make it better?](#how-does-lighthouse-use-network-throttling-and-how-can-i-make-it-better)
  * [Are results sent to a remote server?](#are-results-sent-to-a-remote-server)
  * [How do I get localized Lighthouse results?](#how-do-i-get-localized-lighthouse-results-via-the-cli)
  * [How do I author custom audits to extend Lighthouse?](#how-do-i-author-custom-audits-to-extend-lighthouse)
  * [How do I contribute?](#how-do-i-contribute)

## Using Lighthouse in Chrome DevTools

Lighthouse is integrated directly into the Chrome DevTools, under the "Lighthouse" panel.

**Installation**: install [Chrome](https://www.google.com/chrome/browser).

**Run it**: open Chrome DevTools, select the Lighthouse panel, and hit "Generate report".

<img width="550" alt="Lighthouse integration in Chrome DevTools." src="https://user-images.githubusercontent.com/2766281/204185043-9c49abe5-baee-4b26-b5ce-ece410661213.png">

## Using the Chrome extension

The Chrome extension was available prior to Lighthouse being available in Chrome Developer Tools, and offers similar functionality.

**Installation**: [install the extension](https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk) from the Chrome Web Store.

**Run it**: follow the [extension quick-start guide](https://developers.google.com/web/tools/lighthouse/#extension).

## Using the Node CLI

The Node CLI provides the most flexibility in how Lighthouse runs can be configured and reported. Users who want more advanced usage, or want to run Lighthouse in an automated fashion should use the Node CLI.

> [!NOTE]
> Lighthouse requires Node 18.20 or later.

**Installation**:

```sh
npm install -g lighthouse
# or use yarn:
# yarn global add lighthouse
```

**Run it**: `lighthouse https://airhorner.com/`

By default, Lighthouse writes the report to an HTML file. You can control the output format by passing flags.

### CLI options

<!-- To update the help output:
  node cli --help | pbcopy
-->

```
$ lighthouse --help

lighthouse <url> <options>

Logging:
  --verbose  Displays verbose logging  [boolean] [default: false]
  --quiet    Displays no progress, debug logs, or errors  [boolean] [default: false]

Configuration:
  --save-assets                  Save the trace contents & devtools logs to disk  [boolean] [default: false]
  --list-all-audits              Prints a list of all available audits and exits  [boolean] [default: false]
  --list-trace-categories        Prints a list of all required trace categories and exits  [boolean] [default: false]
  --additional-trace-categories  Additional categories to capture with the trace (comma-delimited).  [string]
  --config-path                  The path to the config JSON.
                                 An example config file: core/config/lr-desktop-config.js  [string]
  --preset                       Use a built-in configuration.
                                 WARNING: If the --config-path flag is provided, this preset will be ignored.  [string] [choices: "perf", "experimental", "desktop"]
  --chrome-flags                 Custom flags to pass to Chrome (space-delimited). For a full list of flags, see https://bit.ly/chrome-flags
                                 Additionally, use the CHROME_PATH environment variable to use a specific Chrome binary. Requires Chromium version 66.0 or later. If omitted, any detected Chrome Canary or Chrome stable will be used.  [string] [default: ""]
  --port                         The port to use for the debugging protocol. Use 0 for a random port  [number] [default: 0]
  --hostname                     The hostname to use for the debugging protocol.  [string] [default: "localhost"]
  --form-factor                  Determines how performance metrics are scored and if mobile-only audits are skipped. For desktop, --preset=desktop instead.  [string] [choices: "mobile", "desktop"]
  --screenEmulation              Sets screen emulation parameters. See also --preset. Use --screenEmulation.disabled to disable. Otherwise set these 4 parameters individually: --screenEmulation.mobile --screenEmulation.width=360 --screenEmulation.height=640 --screenEmulation.deviceScaleFactor=2
  --emulatedUserAgent            Sets useragent emulation  [string]
  --max-wait-for-load            The timeout (in milliseconds) to wait before the page is considered done loading and the run should continue. WARNING: Very high values can lead to large traces and instability  [number]
  --enable-error-reporting       Enables error reporting, overriding any saved preference. --no-enable-error-reporting will do the opposite. More: https://github.com/GoogleChrome/lighthouse/blob/main/docs/error-reporting.md  [boolean]
  --gather-mode, -G              Collect artifacts from a connected browser and save to disk. (Artifacts folder path may optionally be provided). If audit-mode is not also enabled, the run will quit early.
  --audit-mode, -A               Process saved artifacts from disk. (Artifacts folder path may be provided, otherwise defaults to ./latest-run/)
  --only-audits                  Only run the specified audits  [array]
  --only-categories              Only run the specified categories. Available categories: accessibility, best-practices, performance, seo  [array]
  --skip-audits                  Run everything except these audits  [array]
  --disable-full-page-screenshot Disables collection of the full page screenshot, which can be quite large  [boolean]

Output:
  --output       Reporter for the results, supports multiple values. choices: "json", "html", "csv"  [array] [default: ["html"]]
  --output-path  The file path to output the results. Use 'stdout' to write to stdout.
                   If using JSON output, default is stdout.
                   If using HTML or CSV output, default is a file in the working directory with a name based on the test URL and date.
                   If using multiple outputs, --output-path is appended with the standard extension for each output type. "reports/my-run" -> "reports/my-run.report.html", "reports/my-run.report.json", etc.
                   Example: --output-path=./lighthouse-results.html  [string]
  --view         Open HTML report in your browser  [boolean] [default: false]

Options:
  --version                            Show version number  [boolean]
  --help                               Show help  [boolean]
  --cli-flags-path                     The path to a JSON file that contains the desired CLI flags to apply. Flags specified at the command line will still override the file-based ones.
  --locale                             The locale/language the report should be formatted in
  --blocked-url-patterns               Block any network requests to the specified URL patterns  [array]
  --disable-storage-reset              Disable clearing the browser cache and other storage APIs before a run  [boolean]
  --throttling-method                  Controls throttling method  [string] [choices: "devtools", "provided", "simulate"]
  --throttling
  --throttling.rttMs                   Controls simulated network RTT (TCP layer)
  --throttling.throughputKbps          Controls simulated network download throughput
  --throttling.requestLatencyMs        Controls emulated network RTT (HTTP layer)
  --throttling.downloadThroughputKbps  Controls emulated network download throughput
  --throttling.uploadThroughputKbps    Controls emulated network upload throughput
  --throttling.cpuSlowdownMultiplier   Controls simulated + emulated CPU throttling
  --extra-headers                      Set extra HTTP Headers to pass with request
  --precomputed-lantern-data-path      Path to the file where lantern simulation data should be read from, overwriting the lantern observed estimates for RTT and server latency.  [string]
  --lantern-data-output-path           Path to the file where lantern simulation data should be written to, can be used in a future run with the `precomputed-lantern-data-path` flag.  [string]
  --plugins                            Run the specified plugins  [array]
  --channel  [string] [default: "cli"]
  --chrome-ignore-default-flags  [boolean] [default: false]

Examples:
  lighthouse <url> --view                                                                          Opens the HTML report in a browser after the run completes
  lighthouse <url> --config-path=./myconfig.js                                                     Runs Lighthouse with your own configuration: custom audits, report generation, etc.
  lighthouse <url> --output=json --output-path=./report.json --save-assets                         Save trace, screenshots, and named JSON report.
  lighthouse <url> --screenEmulation.disabled --throttling-method=provided --no-emulatedUserAgent  Disable device emulation and all throttling
  lighthouse <url> --chrome-flags="--window-size=412,660"                                          Launch Chrome with a specific window size
  lighthouse <url> --quiet --chrome-flags="--headless"                                             Launch Headless Chrome, turn off logging
  lighthouse <url> --extra-headers "{\"Cookie\":\"monster=blue\", \"x-men\":\"wolverine\"}"        Stringify'd JSON HTTP Header key/value pairs to send in requests
  lighthouse <url> --extra-headers=./path/to/file.json                                             Path to JSON file of HTTP Header key/value pairs to send in requests
  lighthouse <url> --only-categories=performance,seo                                               Only run the specified categories. Available categories: accessibility, best-practices, performance, seo

For more information on Lighthouse, see https://developers.google.com/web/tools/lighthouse/.
```

##### Output Examples

```sh
lighthouse
# saves `./<HOST>_<DATE>.report.html`

lighthouse --output json
# json output sent to stdout

lighthouse --output html --output-path ./report.html
# saves `./report.html`

# NOTE: specifying an output path with multiple formats ignores your specified extension for *ALL* formats
lighthouse --output json --output html --output-path ./myfile.json
# saves `./myfile.report.json` and `./myfile.report.html`

lighthouse --output json --output html
# saves `./<HOST>_<DATE>.report.json` and `./<HOST>_<DATE>.report.html`

lighthouse --output-path=~/mydir/foo.out --save-assets
# saves `~/mydir/foo.report.html`
# saves `~/mydir/foo-0.trace.json` and `~/mydir/foo-0.devtoolslog.json`

lighthouse --output-path=./report.json --output json
# saves `./report.json`
```

##### Lifecycle Examples
You can run a subset of Lighthouse's lifecycle if desired via the `--gather-mode` (`-G`) and  `--audit-mode` (`-A`) CLI flags.

```sh
lighthouse http://example.com -G
# launches browser, collects artifacts, saves them to disk (in `./latest-run/`) and quits

lighthouse http://example.com -A
# skips browser interaction, loads artifacts from disk (in `./latest-run/`), runs audits on them, generates report

lighthouse http://example.com -GA
# Normal gather + audit run, but also saves collected artifacts to disk for subsequent -A runs.


# You can optionally provide a custom folder destination to -G/-A/-GA. Without a value, the default will be `$PWD/latest-run`.
lighthouse -GA=./gmailartifacts https://gmail.com
```


#### Notes on Error Reporting

The first time you run the CLI you will be prompted with a message asking you if Lighthouse can anonymously report runtime exceptions. The Lighthouse team uses this information to detect new bugs and avoid regressions. Opting out will not affect your ability to use Lighthouse in any way. [Learn more](https://github.com/GoogleChrome/lighthouse/blob/main/docs/error-reporting.md).

## Using the Node module
You can also use Lighthouse programmatically with the Node module.

Read [Using Lighthouse programmatically](./docs/readme.md#using-programmatically) for help getting started.\
Read [Lighthouse Configuration](./docs/configuration.md) to learn more about the configuration options available.

## Viewing a report

Lighthouse can produce a report as JSON or HTML.

HTML report:

<img src="https://raw.githubusercontent.com/GoogleChrome/lighthouse/443ff2c8a297dfd2297dfaca86c4966a87c8574a/assets/example_audit.png" alt="Lighthouse example audit" width="500px">

### Online Viewer

Running Lighthouse with the `--output=json` flag generates a JSON dump of the run.
You can view this report online by visiting <https://googlechrome.github.io/lighthouse/viewer/>
and dragging the file onto the app. You can also use the "Export" button from the
top of any Lighthouse HTML report and open the report in the
[Lighthouse Viewer](https://googlechrome.github.io/lighthouse/viewer/).

In the Viewer, reports can be shared by clicking the share icon in the top
right corner and signing in to GitHub.

> [!NOTE]
>  shared reports are stashed as a secret Gist in GitHub, under your account.

## Docs & Recipes

Useful documentation, examples, and recipes to get you started.

**Docs**

- [Dealing with variance](./docs/variability.md)
- [Using Lighthouse programmatically](./docs/readme.md#using-programmatically)
- [Testing a site with authentication](./docs/authenticated-pages.md)
- [Developing Plugins](./docs/plugins.md)
- [Making a New Audit](./docs/new-audits.md)
- [Testing on a mobile device](./docs/readme.md#testing-on-a-mobile-device)
- [Lighthouse Architecture](./docs/architecture.md)

**Recipes**

- [Plugin](./docs/recipes/lighthouse-plugin-example) - example Lighthouse plugin
- [Custom Audit example](./docs/recipes/custom-audit) - extend Lighthouse, run your own audits

**Videos**

The session from Google I/O 2018 covers the new performance engine, upcoming Lighthouse REST API, and using the Chrome UX report to evaluate real-user data.

[![Watch the Lighthouse @ Google I/O 2018 session.](https://img.youtube.com/vi/UvK9zAsSM8Q/0.jpg)](https://www.youtube.com/watch?v=UvK9zAsSM8Q)

The session from Google I/O 2017 covers architecture, writing custom audits,
GitHub/Travis/CI integration, headless Chrome, and more:

[![Watch the Lighthouse @ Google I/O 2017 session.](https://img.youtube.com/vi/NoRYn6gOtVo/0.jpg)](https://www.youtube.com/watch?v=NoRYn6gOtVo)

_Click the image to watch the video on YouTube._

## Develop

Read on for the basics of hacking on Lighthouse. Also, see [Contributing](./CONTRIBUTING.md)
for detailed information.

### Setup

```sh
# yarn should be installed first

git clone https://github.com/GoogleChrome/lighthouse

cd lighthouse
yarn
yarn build-all
```

### Run

```sh
node cli http://example.com
# append --chrome-flags="--no-sandbox --headless --disable-gpu" if you run into problems connecting to Chrome
```

> **Getting started tip**: `node --inspect-brk cli http://example.com` to open up Chrome DevTools and step
through the entire app. See [Debugging Node.js with Chrome
DevTools](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.59rma3ukm)
for more info.

### Tests

```sh
# lint and test all files
yarn test

# run all unit tests
yarn unit

# run a given unit test (e.g. core/test/audits/byte-efficiency/uses-long-cache-ttl-test.js)
yarn mocha uses-long-cache-ttl

# watch for file changes and run tests
#   Requires http://entrproject.org : brew install entr
yarn watch

## run linting, unit, and smoke tests separately
yarn lint
yarn unit
yarn smoke

## run tsc compiler
yarn type-check
```

### Docs

Some of our docs have tests that run only in CI by default. To modify our documentation, you'll need to run `yarn build-pack && yarn test-docs` locally to make sure they pass.

**Additional Dependencies**
- `brew install jq`

## Lighthouse Integrations in Web Perf services

This section details services that have integrated Lighthouse data. If you're working on a cool project integrating Lighthouse and would like to be featured here, file an issue to this repo or tweet at us [@_____lighthouse](https://twitter.com/____lighthouse)!

* **[Web Page Test](https://www.webpagetest.org)** — An [open source](https://github.com/WPO-Foundation/webpagetest) tool for measuring and analyzing the performance of web pages on real devices. Users can choose to produce a Lighthouse report alongside the analysis of WebPageTest results.

* **[HTTPArchive](http://httparchive.org/)** - HTTPArchive tracks how the web is built by crawling 500k pages with Web Page Test, including Lighthouse results, and stores the information in BigQuery where it is [publicly available](https://discuss.httparchive.org/t/quickstart-guide-to-exploring-the-http-archive/682).

* **[Calibre](https://calibreapp.com)** - Calibre is a comprehensive performance monitoring platform running on Lighthouse. See the performance impact of your work before it hits production with GitHub Pull Request Reviews. Track the impact of Third Party scripts. Automate your performance system with a developer-first Node.js API. Try Calibre with a free 15-day trial.

* **[DebugBear](https://www.debugbear.com/)** - DebugBear is a website monitoring tool based on Lighthouse. See how your scores and metrics changed over time, with a focus on understanding what caused each change. DebugBear is a paid product with a free 30-day trial.

* **[Treo](https://treo.sh)** - Treo is Lighthouse as a Service. It provides regression testing, geographical regions, custom networks, and integrations with GitHub & Slack. Treo is a paid product with plans for solo-developers and teams.

* **[PageVitals](https://pagevitals.com)** - PageVitals combines Lighthouse, CrUX and field testing to monitor the performance of websites. See how your website performs over time and get alerted if it gets too slow. Drill down and find the real cause of any performance issue. PageVitals is a paid product with a free 14-day trial.

* **[Screpy](https://screpy.com)** - Screpy is a web analysis tool that can analyze all pages of your websites in one dashboard and monitor them with your team. It's powered by Lighthouse and it also includes some different analysis tools (SERP, W3C, Uptime, etc). Screpy has free and paid plans.

* **[Siteimprove Performance](https://siteimprove.com/en/performance/)** — Siteimprove Performance is a web Performance monitoring solution that enables a marketer, manager or decision maker to understand and optimize website load times. Get easy-to-use insights with a focus on quick and impactful wins. Siteimprove Performance is a paid product with a free 14-day trial.

* **[SpeedCurve](https://speedcurve.com)** — SpeedCurve is a tool for continuously monitoring web performance across different browsers, devices, and regions. It can aggregate any metric including Lighthouse scores across multiple pages and sites, and allows you to set performance budgets with Slack or email alerts. SpeedCurve is a paid product with a free 30-day trial.

* **[Foo](https://www.foo.software/lighthouse)** - Lighthouse-as-a-service offering free and premium plans. Provides monitoring and historical reporting of Lighthouse audits with CircleCI, GitHub, and other integrations. Features include Slack notifications, PR comment reporting and more.

* **[Apdex](https://apdex.co)** - Apdex is a website performance service. The main features are historical Lighthouse report visualizations, mobile/desktop options, alerts, uptime monitoring, and more. There are flexible paid plans and a 30-day free trial.

* **[Websu](https://websu.io)** - Websu is an open source project to provide Lighthouse-as-a-Service through a simple HTTP REST API. The main features are ability to host and deploy in your own environment and historical Lighthouse report summaries.

* **[DTEKT.IO](https://dtekt.io)** - DTEKT is a website performance and uptime monitoring service. It uses lighthouse to provide visibility into the performance of websites from multiple locations on multiple devices. It offers three months free trial and paid plans.

* **[SpeedVitals](https://speedvitals.com)** - SpeedVitals is a Lighthouse powered tool to measure web performance across multiple devices and locations. It has various features like Layout Shift Visualization, Waterfall Chart, Field Data and Resource Graphs. SpeedVitals offers both free and paid plans.

* **[Lighthouse Metrics](https://lighthouse-metrics.com/)** - Lighthouse Metrics gives you global performance insights with a single test. You can also monitor your websites on a daily or hourly base. Lighthouse Metrics offers free global one-time tests and performance monitoring as a paid feature with a free 14-day trial.

* **[Auditzy](https://auditzy.com)** - Auditzy™ is a robust website auditing & monitoring tool which lets you analyze your web page(s) pre-user journey. Analyze the Competitor Health Metric, Core Web Vitals, and Technology. Compare your web pages with your competitors to understand where you are leading or lagging. Real-time notification with Slack. Have Seamless Collaboration with Multiple Teams. Automate your Audits hourly, daily, weekly, and so on. It has a free trial with pay as you go plans.

* **[Lighthouse Metrics China](http://lighthousemetricschina.com)** - The first Lighthouse metrics tool specifically designed for China. Experience unparalleled website monitoring capabilities with Lighthouse. Gain insights into the fluctuations of your scores and metrics within the realm of the [Great Firewall of China](https://www.chinafirewalltest.co), enabling a comprehensive understanding of the factors influencing each change. Lighthouse Metrics China offers both free and paid plans.

* **[DeploymentHawk](https://deploymenthawk.com)** - DeploymentHawk is an automated site auditing tool powered by Lighthouse. Effortlessly catch performance, accessibility, and SEO issues before they impact your users. DeploymentHawk is a paid product with a free 7-day trial.

* **[Guardius](https://guardius.io)** - Guardius is a DevOps and DevSecOps SaaS platform that integrates Lighthouse to deliver automated web performance analysis. It not only provides metrics evaluation and automatic scanning but also enables performance comparisons across different periods and ongoing observation over time. Additionally, Guardius offers predefined and customized alerts tailored to your specific requirements. A free version of Guardius is available for users to explore its features.

* **[Sonā](https://getsona.io)** - Powered by Lighthouse amongst others, Sonā delivers in-depth insights into your website’s health. Track changes over time, share reports, and receive actionable recommendations to improve performance, accessibility, SEO, best practices, and security. Sonā is free during its beta period.

## Lighthouse Integrations in non-Web Perf services

* **[PageWatch](https://pagewatch.dev/)** — PageWatch is a tool to find problem pages on your website.  It provides insights into spelling errors, layout issues, slow pages (powered by Lighthouse) and more.  PageWatch is offered via free and paid plans.

* **[Fluxguard](https://fluxguard.com/)** - Fluxguard provides website DOM change monitoring orchestrated with Google Puppeteer, and audited by Lighthouse. Fluxguard is a freemium product, with monthly monitoring of up to 75 pages for free.

* **[Microlink](https://microlink.io)** — Microlink is a cloud browser as API. It offers Lighthouse reports on demand, making it easy to build any service on top. Similar functionality is available via the underlying open-source project named browserless.

* **[Wattspeed](https://wattspeed.com/)** — Wattspeed is a free tool that generates snapshots - historical captures of your web pages that include Lighthouse scores, a list of technologies, W3C HTML validator results, DOM size, mixed content info, and more.

## Plugins

* **[lighthouse-plugin-field-performance](https://github.com/treosh/lighthouse-plugin-field-performance)** - a plugin that adds real-user performance metrics for the URL using the data from [Chrome UX Report](https://developers.google.com/web/tools/chrome-user-experience-report/).

* **[lighthouse-plugin-publisher-ads](https://github.com/googleads/publisher-ads-lighthouse-plugin)** - a tool to improve ad speed and overall quality through a series of automated audits. At the moment, this is primarily targeted at sites using Google Ad Manager. This tool will aid in resolving discovered problems, providing a tool to be used to evaluate effectiveness of iterative changes while suggesting actionable feedback.

* **[lighthouse-plugin-crux](https://github.com/dvelasquez/lighthouse-plugin-crux)** - a plugin that quickly gathers real-user-metrics data from the [Chrome UX Report API](https://developers.google.com/web/tools/chrome-user-experience-report/api/reference).

## Related projects

Other awesome open source projects that use Lighthouse.

* **[auto-lighthouse](https://github.com/TGiles/auto-lighthouse)** - a CLI for crawling a domain and generating mobile and desktop reports for each page.
* **[Exthouse](https://github.com/treosh/exthouse)** - Analyze the impact of a browser extension on web performance.
* **[Gimbal](https://labs.moduscreate.com/gimbal-web-performance-audit-budgeting)** - An [open source (MIT licensed)](https://github.com/ModusCreateOrg/gimbal) tool used to measure, analyze, and budget aspects of a web application. Gimbal also integrates reports with GitHub pull requests.
* **[Gradle Lighthouse Plugin](https://github.com/Cognifide/gradle-lighthouse-plugin)** - An open source Gradle plugin that runs Lighthouse tests on multiple URLs and asserts category score thresholds (useful in continuous integration).
* **[lighthouse-badges](https://github.com/emazzotta/lighthouse-badges)** - Generate gh-badges (shields.io) based on Lighthouse performance.
* **[lighthouse-batch](https://github.com/mikestead/lighthouse-batch)** - Run Lighthouse over a number of sites and generate a summary of their metrics/scores.
* **[lighthouse-batch-parallel](https://github.com/Carr1005/lighthouse-batch-parallel)** - Run multiple Lighthouse runs in parallel to accelerate the data collecting process, get the result stream (csv, json, js object) in your own process (warning: performance results may be volatile).
* **[lighthouse-check-action](https://github.com/foo-software/lighthouse-check-action)** - A GitHub Action to run Lighthouse in a workflow, featuring Slack notifications and report upload to S3.
* **[lighthouse-check-orb](https://circleci.com/orbs/registry/orb/foo-software/lighthouse-check)** - A CircleCI Orb to run Lighthouse in a workflow, featuring Slack notifications and report upload to S3.
* **[andreasonny83/lighthouse-ci](https://github.com/andreasonny83/lighthouse-ci)** - Run Lighthouse and assert scores satisfy your custom thresholds.
* **[GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)** - (**official**) Automate running Lighthouse for every commit, viewing the changes, and preventing regressions.
* **[lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action)** - A GitHub Action that makes it easy to run Lighthouse in CI and keep your pages small using performance budgets.
* **[lighthouse-gh-reporter](https://github.com/carlesnunez/lighthouse-gh-reporter)** - Run Lighthouse in CI and report back in a comment on your pull requests
* **[lighthouse-jest-example](https://github.com/justinribeiro/lighthouse-jest-example)** - Gather performance metrics via Lighthouse and assert results with Jest; uses Puppeteer to start Chrome with network emulation settings defined by WebPageTest.
* **[lighthouse-lambda](https://github.com/Otterseer/lighthouse-lambda)** - Run Lighthouse on AWS Lambda with prebuilt stable desktop Headless Chrome.
* **[lighthouse-matchers](https://github.com/ackama/lighthouse-matchers)** - Provides RSpec matchers for executing and evaluating Google Chrome Lighthouse audit scores.
* **[lighthouse-mocha-example](https://github.com/rishichawda/lighthouse-mocha-example)** - Run Lighthouse performance tests with Mocha and chrome-launcher.
* **[lighthouse-monitor](https://github.com/verivox/lighthouse-monitor)** - Run Lighthouse against all your URLs. Send metrics to any backend you want, save all reports with automatic data retention, and compare any two results in a web UI.
* **[lighthouse-persist](https://github.com/foo-software/lighthouse-persist)** - Run Lighthouse and upload HTML reports to an AWS S3 bucket.
* **[lighthouse-viewer](https://github.com/dvelasquez/lighthouse-viewer/tree/main/packages/lighthouse-viewer)** - Render the Lighthouse JSON into a report, using the Lighthouse Report Renderer repackaged as UMD and ESM. Also available with React, Svelte and Vue wrappers.
* **[lighthouse4u](https://github.com/godaddy/lighthouse4u)** - LH4U provides Google Lighthouse as a service, surfaced by both a friendly UI+API, and backed by Elastic Search for easy querying and visualization.
* **[react-lighthouse-viewer](https://www.npmjs.com/package/react-lighthouse-viewer)** - Render a Lighthouse JSON report in a React Component.
* **[site-audit-seo](https://github.com/viasite/site-audit-seo)** - CLI tool for SEO site audit, crawl site, lighthouse each page. Output to console and tables in csv, xlsx, json, web or Google Drive.
* **[webpack-lighthouse-plugin](https://github.com/addyosmani/webpack-lighthouse-plugin)** - Run Lighthouse from a Webpack build.
* **[cypress-audit](https://github.com/mfrachet/cypress-audit)** - Run Lighthouse and Pa11y audits directly in your E2E test suites.
* **[laravel-lighthouse](https://github.com/adityadees/laravel-lighthouse)** - Google Lighthouse wrapper for laravel framework to run Google Lighthouse CLI with custom option and can automatically save result in your server directory.
* **[Neodymium](https://github.com/Xceptance/neodymium/wiki/Accessibility)** - The Neodymium test automation framework integrates Lighthouse for accessibility and Web Vitals verification, allowing programmatic validation and assertion of all audit values.

## FAQ

### How does Lighthouse work?

See [Lighthouse Architecture](./docs/architecture.md).

### Why is the performance score so low? It looks fine to me.

Lighthouse reports the performance metrics as they would be experienced by a typical mobile user on a 4G connection and a mid-tier ~$200 phone. Even if it loads quickly on your device and network, users in other environments will experience the site very differently.

Read more in our [guide to throttling](./docs/throttling.md).

### Why does the performance score change so much?

Lighthouse performance scores will change due to inherent variability in web and network technologies, even if there hasn't been a code change. Test in consistent environments, run Lighthouse multiple times, and beware of variability before drawing conclusions about a performance-impacting change.

Read more in our [guide to reducing variability](./docs/variability.md).

### Can I configure the lighthouse run?

Yes! Details in [Lighthouse configuration](./docs/configuration.md).

### How does Lighthouse use network throttling, and how can I make it better?

Good question. Network and CPU throttling are applied by default in a Lighthouse run. The network
attempts to emulate slow 4G connectivity and the CPU is slowed down 4x from your machine's default speed. If you
prefer to run Lighthouse without throttling, you'll have to use the CLI and disable it with the
`--throttling.*` flags mentioned above.

Read more in our [guide to network throttling](./docs/throttling.md).

### Are results sent to a remote server?

Nope. Lighthouse runs locally, auditing a page using a local version of the Chrome browser installed on the
machine. Report results are never processed or beaconed to a remote server.

### How do I get localized Lighthouse results via the CLI?

Starting in Lighthouse 8.0, Lighthouse relies entirely on native `Intl` support and no longer uses an `Intl` polyfill. If you're using Node 14 or later, there should be no issue because Node is now [built with `full-icu` by default](https://nodejs.medium.com/node-js-12-to-lts-and-node-js-13-is-here-e28d6a4a2bd#9514).

However, if you're using a `small-icu` Node build, you may see Lighthouse log messages about your locale not being available. To remedy this, you can manually install ICU data by using the [`full-icu`](https://www.npmjs.com/package/full-icu) module and the [`--icu-data-dir` node flag](https://nodejs.org/api/intl.html#intl_providing_icu_data_at_runtime) at launch.

### How do I author custom audits to extend Lighthouse?

> **Tip**: see [Lighthouse Architecture](./docs/architecture.md) for more information
on terminology and architecture.

Lighthouse can be extended to run custom audits and gatherers that you author.
This is great if you're already tracking performance metrics in your site and
want to surface those metrics within a Lighthouse report.

If you're interested in running your own custom audits, check out our
[Custom Audit Example](./docs/recipes/custom-audit) over in recipes.

### How do I contribute?

We'd love help writing audits, fixing bugs, and making the tool more useful!
See [Contributing](./CONTRIBUTING.md) to get started.

---
<p align="center">
  <img src="./assets/lighthouse-logo_512px.png" alt="Lighthouse logo" height="150">
  <br>
  <b>Lighthouse</b>, ˈlītˌhous (n): a <s>tower or other structure</s> tool containing a beacon light
  to warn or guide <s>ships at sea</s> developers.
</p>
