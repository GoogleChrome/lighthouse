# Lighthouse  [![Linux Build Status](https://img.shields.io/travis/GoogleChrome/lighthouse/master.svg)](https://travis-ci.org/GoogleChrome/lighthouse) [![Windows Build Status](https://ci.appveyor.com/api/projects/status/46a5yoqc3hk59bl5/branch/master?svg=true)](https://ci.appveyor.com/project/paulirish/lighthouse/branch/master) [![Coverage Status](https://img.shields.io/coveralls/GoogleChrome/lighthouse/master.svg)](https://coveralls.io/github/GoogleChrome/lighthouse?branch=master) [![NPM lighthouse package](https://img.shields.io/npm/v/lighthouse.svg)](https://npmjs.org/package/lighthouse)

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
- Associated Products and Projects
  - [Lighthouse Integrations](#lighthouse-integrations)
  - [Plugins](#plugins)
  - [Related Projects](#related-projects)
- [FAQ](#faq)
  * [How does Lighthouse work?](#how-does-lighthouse-work)
  * [Can I configure the lighthouse run?](#can-i-configure-the-lighthouse-run)
  * [How does Lighthouse use network throttling, and how can I make it better?](#how-does-lighthouse-use-network-throttling-and-how-can-i-make-it-better)
  * [Are results sent to a remote server?](#are-results-sent-to-a-remote-server)
  * [How do I author custom audits to extend Lighthouse?](#how-do-i-author-custom-audits-to-extend-lighthouse)
  * [How do I contribute?](#how-do-i-contribute)

## Using Lighthouse in Chrome DevTools

Lighthouse is integrated directly into the Chrome Developer Tools, under the "Audits" panel.

**Installation**: install [Chrome](https://www.google.com/chrome/browser).

**Run it**: open Chrome DevTools, select the Audits panel, and hit "Run audits".

<img src="https://raw.githubusercontent.com/GoogleChrome/lighthouse/e7997b3db01de3553d8cb208a40f3d4fd350195c/assets/example_dev_tools.png" alt="Lighthouse integration in Chrome DevTools" width="500px">

## Using the Chrome extension

The Chrome extension was available prior to Lighthouse being available in Chrome Developer Tools, and offers similar functionality.

**Installation**: [install the extension](https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk) from the Chrome Web Store.

**Run it**: follow the [extension quick-start guide](https://developers.google.com/web/tools/lighthouse/#extension).

## Using the Node CLI

The Node CLI provides the most flexibility in how Lighthouse runs can be configured and reported. Users who want more advanced usage, or want to run Lighthouse in an automated fashion should use the Node CLI.

_Lighthouse requires Node 10 LTS (10.13) or later._

**Installation**:

```sh
npm install -g lighthouse
# or use yarn:
# yarn global add lighthouse
```

**Run it**: `lighthouse https://airhorner.com/`

By default, Lighthouse writes the report to an HTML file. You can control the output format by passing flags.

### CLI options

```
$ lighthouse --help

lighthouse <url>

Logging:
  --verbose  Displays verbose logging                                                                                                      [boolean]
  --quiet    Displays no progress, debug logs or errors                                                                                    [boolean]

Configuration:
  --save-assets                  Save the trace & devtools log to disk                                                                     [boolean]
  --list-all-audits              Prints a list of all available audits and exits                                                           [boolean]
  --list-trace-categories        Prints a list of all required trace categories and exits                                                  [boolean]
  --print-config                 Print the normalized config for the given config and options, then exit.                                  [boolean]
  --additional-trace-categories  Additional categories to capture with the trace (comma-delimited).
  --config-path                  The path to the config JSON.
                                 An example config file: lighthouse-core/config/lr-desktop-config.js
  --chrome-flags                 Custom flags to pass to Chrome (space-delimited). For a full list of flags, see
                                 http://peter.sh/experiments/chromium-command-line-switches/.

                                 Environment variables:
                                 CHROME_PATH: Explicit path of intended Chrome binary. If set must point to an executable of a build of
                                 Chromium version 66.0 or later. By default, any detected Chrome Canary or Chrome (stable) will be launched.
                                                                                                                                       [default: ""]
  --port                         The port to use for the debugging protocol. Use 0 for a random port                                    [default: 0]
  --preset                       Use a built-in configuration.                                            [choices: "full", "perf", "mixed-content"]
                                 WARNING: If the --config-path flag is provided, this preset will be ignored.
  --hostname                     The hostname to use for the debugging protocol.                                              [default: "localhost"]
  --max-wait-for-load            The timeout (in milliseconds) to wait before the page is considered done loading and the run should continue.
                                 WARNING: Very high values can lead to large traces and instability                                 [default: 45000]
  --emulated-form-factor         Controls the emulated device form factor (mobile vs. desktop) if not disabled                      [choices: "mobile", "desktop", "none"] [default: "mobile"]
  --enable-error-reporting       Enables error reporting, overriding any saved preference. --no-enable-error-reporting will do the opposite. More:
                                 https://git.io/vFFTO
  --gather-mode, -G              Collect artifacts from a connected browser and save to disk. If audit-mode is not also enabled, the run will quit
                                 early.                                                                                                    [boolean]
  --audit-mode, -A               Process saved artifacts from disk                                                                         [boolean]

Output:
  --output       Reporter for the results, supports multiple values                        [choices: "json", "html", "csv"] [default: "html"]
  --output-path  The file path to output the results. Use 'stdout' to write to stdout.
                 If using JSON output, default is stdout.
                 If using HTML or CSV output, default is a file in the working directory with a name based on the test URL and date.
                 If using multiple outputs, --output-path is appended with the standard extension for each output type. "reports/my-run" -> "reports/my-run.report.html", "reports/my-run.report.json", etc.
                 Example: --output-path=./lighthouse-results.html
  --view         Open HTML report in your browser                                                                                          [boolean]

Options:
  --help                        Show help                                                                                                  [boolean]
  --version                     Show version number                                                                                        [boolean]
  --cli-flags-path              The path to a JSON file that contains the desired CLI flags to apply.
                                Flags specified at the command line will still override the file-based ones.
  --blocked-url-patterns        Block any network requests to the specified URL patterns                                                     [array]
  --disable-storage-reset       Disable clearing the browser cache and other storage APIs before a run                                     [boolean]
  --throttling-method                  Controls throttling method         [choices: "devtools", "provided", "simulate"]
  --throttling.rttMs                   Controls simulated network RTT (TCP layer)
  --throttling.throughputKbps          Controls simulated network download throughput
  --throttling.requestLatencyMs        Controls emulated network RTT (HTTP layer)
  --throttling.downloadThroughputKbps  Controls emulated network download throughput
  --throttling.uploadThroughputKbps    Controls emulated network upload throughput
  --throttling.cpuSlowdownMultiplier   Controls simulated + emulated CPU throttling
  --extra-headers               Set extra HTTP Headers to pass with request                                                                 [string]

Examples:
  lighthouse <url> --view                                                   Opens the HTML report in a browser after the run completes
  lighthouse <url> --config-path=./myconfig.js                              Runs Lighthouse with your own configuration: custom audits, report
                                                                            generation, etc.
  lighthouse <url> --output=json --output-path=./report.json --save-assets  Save trace, devtoolslog, and named JSON report.
  lighthouse <url> --emulated-form-factor=none                              Disable device emulation and all throttling.
    --throttling-method=provided
  lighthouse <url> --chrome-flags="--window-size=412,660"                   Launch Chrome with a specific window size
  lighthouse <url> --quiet --chrome-flags="--headless"                      Launch Headless Chrome, turn off logging
  lighthouse <url> --extra-headers "{\"Cookie\":\"monster=blue\"}"          Stringify\'d JSON HTTP Header key/value pairs to send in requests
  lighthouse <url> --extra-headers=./path/to/file.json                      Path to JSON file of HTTP Header key/value pairs to send in requests
  lighthouse <url> --only-categories=performance,pwa                        Only run the specified categories. Available categories: accessibility,
                                                                            best-practices, performance, pwa, seo.

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

The first time you run the CLI you will be prompted with a message asking you if Lighthouse can anonymously report runtime exceptions. The Lighthouse team uses this information to detect new bugs and avoid regressions. Opting out will not affect your ability to use Lighthouse in any way. [Learn more](https://github.com/GoogleChrome/lighthouse/blob/master/docs/error-reporting.md).

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

> **Note**: shared reports are stashed as a secret Gist in GitHub, under your account.

## Docs & Recipes

Useful documentation, examples, and recipes to get you started.

**Docs**

- [Dealing with variance](./docs/variability.md)
- [Using Lighthouse programmatically](./docs/readme.md#using-programmatically)
- [Testing a site with authentication](./docs/authenticated-pages.md)
- [Developing Plugins](./docs/plugins.md)
- [Testing on a mobile device](./docs/readme.md#testing-on-a-mobile-device)
- [Lighthouse Architecture](./docs/architecture.md)

**Recipes**

- [gulp](docs/recipes/gulp) - helpful for CI integration
- [Plugin](./docs/recipes/lighthouse-plugin-example) - example Lighthouse plugin
- [Custom Audit example](./docs/recipes/custom-audit) - extend Lighthouse, run your own audits

**Videos**

The session from Google I/O 2018 covers the new performance engine, upcoming Lighthouse REST API, and using the Chrome UX report to evaluate real-user data.

[![Lighthouse @ Google I/O 2018](https://img.youtube.com/vi/UvK9zAsSM8Q/0.jpg)](https://www.youtube.com/watch?v=UvK9zAsSM8Q)

The session from Google I/O 2017 covers architecture, writing custom audits,
GitHub/Travis/CI integration, headless Chrome, and more:

[![Lighthouse @ Google I/O 2017](https://img.youtube.com/vi/NoRYn6gOtVo/0.jpg)](https://www.youtube.com/watch?v=NoRYn6gOtVo)

_click to watch the video_

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

#### installing protobuf
If changing audit output, you'll need to have v3.7.1 of the protocol-buffer/protobuf compiler installed. (v3.7.1 is known to be compatible, and 3.11.x is known to be **not** compatible.). 

Homebrew should be able to install it correctly: `brew install protobuf@3.7.1`

But if you want to do it manually, these steps that have worked well for us:

```sh
mkdir protobuf-install && cd protobuf-install
curl -L -o protobuf-python-3.7.1.zip https://github.com/protocolbuffers/protobuf/releases/download/v3.7.1/protobuf-python-3.7.1.zip
unzip protobuf-python-3.7.1.zip
cd protobuf-3.7.1

cd python
python setup.py build
python setup.py test
(cd .. && autogen.sh && configure && make)
(cd .. && sudo make install)
python setup.py build --cpp_implementation
sudo python setup.py install --cpp_implementation
```

Also, see the [official installation instructions](https://github.com/protocolbuffers/protobuf#protocol-compiler-installation).


### Run

```sh
node lighthouse-cli http://example.com
# append --chrome-flags="--no-sandbox --headless --disable-gpu" if you run into problems connecting to Chrome
```

> **Getting started tip**: `node --inspect-brk lighthouse-cli http://example.com` to open up Chrome DevTools and step
through the entire app. See [Debugging Node.js with Chrome
DevTools](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.59rma3ukm)
for more info.

### Tests

```sh
# lint and test all files
yarn test

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

Some of our docs have tests that run only in CI by default. If you end up needing to modify our documentation, you'll need to run `yarn test-docs` locally to make sure they pass.

**Additional Dependencies**
- `brew install jq`

## Lighthouse Integrations
This section details services that have integrated Lighthouse data. If you're working on a cool project integrating Lighthouse and would like to be featured here, file an issue to this repo or tweet at us [@_____lighthouse](https://twitter.com/____lighthouse?lang=en)!

### Free

* **[HTTPArchive](http://httparchive.org/)** - HTTPArchive tracks how the web is built by crawling 500k pages with Web Page Test, including Lighthouse results, and stores the information in BigQuery where it is [publicly available](https://discuss.httparchive.org/t/quickstart-guide-to-exploring-the-http-archive/682).

* **[Lighthouse Keeper](https://lighthouse-keeper.com/)** - Lighthouse Keeper monitors your pages' Lighthouse scores and notifies you if they drop below your thresholds. Lighthouse Keeper is a free service that monitors up to 3 URLs once per day.

* **[Web Page Test](https://www.webpagetest.org)** — An [open source](https://github.com/WPO-Foundation/webpagetest) tool for measuring and analyzing the performance of web pages on real devices. Users can choose to produce a Lighthouse report alongside the analysis of WebPageTest results.

### Paid / Tiered

* **[Automated Lighthouse Check](https://www.automated-lighthouse-check.com/)** - Lighthouse-as-a-service offering free and premium plans. Provides monitoring and historical reporting of Lighthouse audits with CircleCI, GitHub, and other integrations. Features include Slack notifications, PR comment reporting and more.

* **[Calibre](https://calibreapp.com)** - Calibre is a comprehensive performance monitoring platform running on Lighthouse. See the performance impact of your work before it hits production with GitHub Pull Request Reviews. Track the impact of Third Party scripts. Automate your performance system with a developer-first Node.js API. Try Calibre with a free 15-day trial.

* **[DebugBear](https://www.debugbear.com/)** - DebugBear is a website monitoring tool based on Lighthouse. See how your scores and metrics changed over time, with a focus on understanding what caused each change. DebugBear is a paid product with a free 30-day trial.

* **[Fluxguard](https://fluxguard.com/)** - Fluxguard provides website DOM change monitoring orchestrated with Google Puppeteer, and audited by Lighthouse. Fluxguard is a freemium product, with monthly monitoring of up to 75 pages for free.

* **[PageSpeed Green](https://pagespeed.green/)** - New web performance monitoring service for web pages. For now, you can track PageSpeed performance indicators for unlimited domains and web pages. Powered By Google Lighthouse and Puppeteer. PageSpeed Green is a paid product with a free 30-day trial.

* **[SpeedCurve](https://speedcurve.com)** — SpeedCurve is a tool for continuously monitoring web performance across different browsers, devices, and regions. It can aggregate any metric including Lighthouse scores across multiple pages and sites, and allows you to set performance budgets with Slack or email alerts. SpeedCurve is a paid product with a free 30-day trial.

* **[Siteimprove Performance](https://siteimprove.com/en/performance/)** — Siteimprove Performance is a web Performance monitoring solution that enables a marketer, manager or decision maker to understand and optimize website load times. Get easy-to-use insights with a focus on quick and impactful wins. Siteimprove Performance is a paid product with a free 14-day trial.

* **[Speedrank](https://speedrank.app)** - Speedrank monitors the performance of your website in the background. It displays Lighthouse reports over time and delivers recommendations for improvement. Speedrank is a paid product with 14-day-trial.

* **[Treo](https://treo.sh)** - Treo is Lighthouse as a Service. It provides regression testing, geographical regions, custom networks, and integrations with GitHub & Slack. Treo is a paid product with plans for solo-developers and teams.


## Plugins

* **[lighthouse-plugin-field-performance](https://github.com/treosh/lighthouse-plugin-field-performance)** - a plugin that adds real-user performance metrics for the URL using the data from [Chrome UX Report](https://developers.google.com/web/tools/chrome-user-experience-report/).

## Related Projects
Other awesome open source projects that use Lighthouse.

* **[auto-lighthouse](https://github.com/TGiles/auto-lighthouse)** - a CLI for crawling a domain and generating mobile and desktop reports for each page.
* **[Exthouse](https://github.com/treosh/exthouse)** - Analyze the impact of a browser extension on web performance.
* **[Garie](https://github.com/boyney123/garie)** - An open source tool for monitoring performance using Lighthouse,  PageSpeed Insights, [Prometheus](https://prometheus.io/), [Grafana](https://grafana.com/) and [Docker](https://www.docker.com/).
* **[Gimbal](https://labs.moduscreate.com/gimbal-web-performance-audit-budgeting)** - An [open source (MIT licensed)](https://github.com/ModusCreateOrg/gimbal) tool used to measure, analyze, and budget aspects of a web application. Gimbal also integrates reports with GitHub pull requests.
* **[Gradle Lighthouse Plugin](https://github.com/Cognifide/gradle-lighthouse-plugin)** - An open source Gradle plugin that runs Lighthouse tests on multiple URLs and asserts category score thresholds (useful in continuous integration).
* **[lightcrawler](https://github.com/github/lightcrawler)** - Crawl a website and run each page found through Lighthouse.
* **[lighthouse-badges](https://github.com/emazzotta/lighthouse-badges)** - Generate gh-badges (shields.io) based on Lighthouse performance.
* **[lighthouse-batch](https://www.npmjs.com/package/lighthouse-batch)** - Run Lighthouse over a number of sites and generate a summary of their metrics/scores.
* **[lighthouse-check-action](https://github.com/foo-software/lighthouse-check-action)** - A Github Action to run Lighthouse in a workflow, featuring Slack notifications and report upload to S3.
* **[lighthouse-check-orb](https://circleci.com/orbs/registry/orb/foo-software/lighthouse-check)** - A CircleCI Orb to run Lighthouse in a workflow, featuring Slack notifications and report upload to S3.
* **[andreasonny83/lighthouse-ci](https://github.com/andreasonny83/lighthouse-ci)** - Run Lighthouse and assert scores satisfy your custom thresholds.
* **[GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)** - (**official**) Automate running Lighthouse for every commit, viewing the changes, and preventing regressions.
* **[lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action)** - A Github Action that makes it easy to run Lighthouse in CI and keep your pages small using performance budgets.
* **[lighthouse-cron](https://github.com/thearegee/lighthouse-cron)** - Cron multiple batch Lighthouse audits and emit results for sending to remote server.
* **[lighthouse-gh-reporter](https://github.com/carlesnunez/lighthouse-gh-reporter)** - Run Lighthouse in CI and report back in a comment on your pull requests
* **[lighthouse-hue](https://github.com/ebidel/lighthouse-hue)** - Set the color of Philips Hue lights based on a Lighthouse score
* **[lighthouse-jest-example](https://github.com/justinribeiro/lighthouse-jest-example)** - Gather performance metrics via Lighthouse and assert results with Jest; uses Puppeteer to start Chrome with network emulation settings defined by WebPageTest.
* **[lighthouse-lambda](https://github.com/joytocode/lighthouse-lambda)** - Run Lighthouse on AWS Lambda with prebuilt stable desktop Headless Chrome.
* **[lighthouse-magic-light](https://github.com/manekinekko/lighthouse-magic-light)** - Set the color of the MagicLight Bluetooth Smart Light Bulb based on Lighthouse score
* **[lighthouse-mocha-example](https://github.com/rishichawda/lighthouse-mocha-example)** - Run Lighthouse performance tests with Mocha and chrome-launcher.
* **[lighthouse-monitor](https://github.com/verivox/lighthouse-monitor)** - Run Lighthouse against all your URLs. Send metrics to any backend you want, save all reports with automatic data retention, and compare any two results in a web UI.
* **[lighthouse-persist](https://github.com/foo-software/lighthouse-persist)** - Run Lighthouse and upload HTML reports to an AWS S3 bucket.
* **[lighthouse4u](https://github.com/godaddy/lighthouse4u)** - LH4U provides Google Lighthouse as a service, surfaced by both a friendly UI+API, and backed by Elastic Search for easy querying and visualization.
* **[performance-budgets](https://performance-budgets.netlify.com/)** - Easily assert Lighthouse budgets with Docker.
* **[pwmetrics](https://github.com/paulirish/pwmetrics/)** - Gather performance metrics
* **[react-lighthouse-viewer](https://www.npmjs.com/package/react-lighthouse-viewer)** - Render a Lighthouse JSON report in a React Component.
* **[webpack-lighthouse-plugin](https://github.com/addyosmani/webpack-lighthouse-plugin)** - Run Lighthouse from a Webpack build.
* **[is-website-vulnerable](https://github.com/lirantal/is-website-vulnerable)** - An open source Node.js CLI tool that finds publicly known security vulnerabilities in a website's frontend JavaScript libraries.

## FAQ

### How does Lighthouse work?

See [Lighthouse Architecture](./docs/architecture.md).

### Can I configure the lighthouse run?

Yes! Details in [Lighthouse configuration](./docs/configuration.md).

### How does Lighthouse use network throttling, and how can I make it better?

Good question. Network and CPU throttling are applied by default in a Lighthouse run. The network
attempts to emulate slow 4G connectivity and the CPU is slowed down 4x from your machine's default speed. If you
prefer to run Lighthouse without throttling, you'll have to use the CLI and disable it with the
`--throttling.*` flags mentioned above.

Read more in our [guide to network throttling](./docs/throttling.md).

### Are results sent to a remote server?

Nope. Lighthouse runs locally, auditing a page using a local version of the Chrome browser installed the
machine. Report results are never processed or beaconed to a remote server.

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

Apache License
                           Version 2.0, January 2004
                        https://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright 2019 Rolando Gopez Lacuata.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       https://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.



---
<p align="center">
  <img src="https://raw.githubusercontent.com/GoogleChrome/lighthouse/8b3d7f052b2e64dd857e741d7395647f487697e7/assets/lighthouse-logo.png" alt="Lighthouse logo" height="150">
  <br>
  <b>Lighthouse</b>, ˈlītˌhous (n): a <s>tower or other structure</s> tool containing a beacon light
  to warn or guide <s>ships at sea</s> developers.
</p>
