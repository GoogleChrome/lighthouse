[English](readme.md) | **繁體中文** | [日本語](readme.ja.md)

# Lighthouse  [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/CI/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/ci.yml) [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/unit/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/unit.yml) [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/smoke/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/smoke.yml) [![Coverage Status](https://codecov.io/gh/GoogleChrome/lighthouse/branch/main/graph/badge.svg)](https://codecov.io/gh/GoogleChrome/lighthouse) [![Build tracker for Lighthouse](https://img.shields.io/badge/buildtracker-ok-blue)](https://lh-build-tracker.herokuapp.com/) [![NPM lighthouse package](https://img.shields.io/npm/v/lighthouse.svg)](https://npmjs.org/package/lighthouse)

> Lighthouse 會分析網路應用程式與網頁，收集現代化的效能指標，以及開發者最佳做法的深入解析。

- 使用 Lighthouse
  - [在 Chrome DevTools 中使用 Lighthouse](#在-chrome-devtools-中使用-lighthouse)
  - [使用 Chrome 擴充功能](#使用-chrome-擴充功能)
  - [使用 Node CLI](#使用-node-cli)
    * [CLI 選項](#cli-選項)
  - [使用 Node 模組](#使用-node-模組)
  - [檢視報表](#檢視報表)
    * [線上檢視器](#線上檢視器)
  - [文件與實作範例](#文件與實作範例)
  - [開發 Lighthouse](#開發)
    * [設定](#設定)
    * [執行](#執行)
    * [測試](#測試)
    * [文件](#文件)
- 相關產品與專案
  - [網頁效能服務中的 Lighthouse 整合](#網頁效能服務中的-lighthouse-整合)
  - [非網頁效能服務中的 Lighthouse 整合](#非網頁效能服務中的-lighthouse-整合)
  - [外掛程式](#外掛程式)
  - [相關專案](#相關專案)
- [常見問題](#常見問題)
  * [Lighthouse 的運作方式為何？](#lighthouse-的運作方式為何)
  * [我可以調整 Lighthouse 的執行方式嗎？](#我可以調整-lighthouse-的執行方式嗎)
  * [Lighthouse 如何使用網路節流？我又該如何改善它？](#lighthouse-如何使用網路節流我又該如何改善它)
  * [結果會傳送到遠端伺服器嗎？](#結果會傳送到遠端伺服器嗎)
  * [如何透過 CLI 取得在地化的 Lighthouse 結果？](#如何透過-cli-取得在地化的-lighthouse-結果)
  * [如何撰寫自訂審查來擴充 Lighthouse？](#如何撰寫自訂審查來擴充-lighthouse)
  * [我要如何參與貢獻？](#我要如何參與貢獻)

## 在 Chrome DevTools 中使用 Lighthouse

Lighthouse 已直接整合到 Chrome DevTools 的「Lighthouse」面板中。

**安裝**：安裝 [Chrome](https://www.google.com/chrome/browser)。

**開始使用**：開啟 Chrome DevTools、選取 Lighthouse 面板，然後按下「產生報表」。

<img width="550" alt="Lighthouse integration in Chrome DevTools." src="https://user-images.githubusercontent.com/2766281/204185043-9c49abe5-baee-4b26-b5ce-ece410661213.png">

## 使用 Chrome 擴充功能

在 Lighthouse 進入 Chrome DevTools 之前，Chrome 擴充功能就已經存在，並提供相近的功能。

**安裝**：從 Chrome 線上應用程式商店[安裝擴充功能](https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk)。

**開始使用**：請依照[擴充功能快速入門指南](https://developers.google.com/web/tools/lighthouse/#extension)操作。

## 使用 Node CLI

Node CLI 提供最高的彈性，讓您自由設定 Lighthouse 的執行方式與報表輸出。若需要更進階的用法，或想以自動化方式執行 Lighthouse，請使用 Node CLI。

> [!NOTE]
> Lighthouse 需要 Node 22 (LTS) 或更新版本。

**安裝**：

```sh
npm install -g lighthouse
# or use yarn:
# yarn global add lighthouse
```

**開始使用**：`lighthouse https://airhorner.com/`

預設情況下，Lighthouse 會將報表寫入 HTML 檔案。您可以透過傳入旗標來控制輸出格式。

### CLI 選項

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
  --form-factor                  Determines how performance metrics are scored and if mobile-only audits are skipped. For desktop, use --preset=desktop instead.  [string] [choices: "mobile", "desktop"]
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

##### 輸出範例

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

##### 生命週期範例
您可以透過 `--gather-mode`（`-G`）與 `--audit-mode`（`-A`）CLI 旗標，只執行 Lighthouse 生命週期中的部分階段。

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


#### 錯誤回報注意事項

第一次執行 CLI 時，系統會詢問您是否允許 Lighthouse 以匿名方式回報執行時期例外狀況。Lighthouse 團隊會利用這些資訊偵測新錯誤並避免效能回歸。選擇退出不會以任何方式影響您使用 Lighthouse。[進一步瞭解](https://github.com/GoogleChrome/lighthouse/blob/main/docs/error-reporting.md)。

## 使用 Node 模組
您也可以透過程式設計方式，使用 Node 模組來操作 Lighthouse。

如需入門協助，請閱讀[以程式設計方式使用 Lighthouse](./docs/readme.md#using-programmatically)。\
如需瞭解更多可用的設定選項，請閱讀 [Lighthouse 設定](./docs/configuration.md)。

## 檢視報表

Lighthouse 可以產生 JSON 或 HTML 格式的報表。

HTML 報表：

<img src="https://raw.githubusercontent.com/GoogleChrome/lighthouse/443ff2c8a297dfd2297dfaca86c4966a87c8574a/assets/example_audit.png" alt="Lighthouse example audit" width="500px">

### 線上檢視器

使用 `--output=json` 旗標執行 Lighthouse 會產生該次執行的 JSON 檔案。
您可以前往 <https://googlechrome.github.io/lighthouse/viewer/> 並將檔案拖曳到應用程式中，
即可線上檢視這份報表。您也可以使用任何 Lighthouse HTML 報表頂端的「匯出」按鈕，
然後在 [Lighthouse 檢視器](https://googlechrome.github.io/lighthouse/viewer/)中開啟該報表。

在檢視器中，只要點選右上角的分享圖示並登入 GitHub，即可分享報表。

> [!NOTE]
>  分享的報表會以私密 Gist 的形式，儲存在您自己的 GitHub 帳戶下。

## 文件與實作範例

這裡整理了實用的文件、範例與實作配方，協助您快速上手。

**文件**

- [處理變異性](./docs/variability.md)
- [以程式設計方式使用 Lighthouse](./docs/readme.md#using-programmatically)
- [測試需要登入的網站](./docs/authenticated-pages.md)
- [開發外掛程式](./docs/plugins.md)
- [新增審查項目](./docs/new-audits.md)
- [在行動裝置上測試](./docs/readme.md#testing-on-a-mobile-device)
- [Lighthouse 架構](./docs/architecture.md)

**實作範例**

- [外掛程式](./docs/recipes/lighthouse-plugin-example) - Lighthouse 外掛程式範例
- [自訂審查範例](./docs/recipes/custom-audit) - 擴充 Lighthouse、執行您自己的審查

**影片**

Google I/O 2018 的這場議程介紹了全新的效能引擎、即將推出的 Lighthouse REST API，以及如何運用 Chrome UX Report 評估真實使用者資料。

[![Watch the Lighthouse @ Google I/O 2018 session.](https://img.youtube.com/vi/UvK9zAsSM8Q/0.jpg)](https://www.youtube.com/watch?v=UvK9zAsSM8Q)

Google I/O 2017 的這場議程則涵蓋架構、撰寫自訂審查、
GitHub/Travis/CI 整合、headless Chrome 等主題：

[![Watch the Lighthouse @ Google I/O 2017 session.](https://img.youtube.com/vi/NoRYn6gOtVo/0.jpg)](https://www.youtube.com/watch?v=NoRYn6gOtVo)

_點擊圖片即可在 YouTube 觀看影片。_

## 開發

以下介紹開發 Lighthouse 的基礎知識。更詳細的資訊請參閱[貢獻指南](./CONTRIBUTING.md)。

### 設定

```sh
# yarn should be installed first

git clone https://github.com/GoogleChrome/lighthouse

cd lighthouse
yarn
yarn build-all
```

### 執行

```sh
node cli http://example.com
# append --chrome-flags="--no-sandbox --headless --disable-gpu" if you run into problems connecting to Chrome
```

> **入門提示**：`node --inspect-brk cli http://example.com` 可以開啟 Chrome DevTools 並逐步
> 檢視整個應用程式。更多資訊請參閱[使用 Chrome DevTools 偵錯 Node.js](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.59rma3ukm)。

### 測試

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

### 文件

部分文件的測試預設只會在 CI 中執行。若要修改文件，請在本機執行 `yarn build-pack && yarn test-docs` 確認測試通過。

**額外相依項目**
- `brew install jq`

## 網頁效能服務中的 Lighthouse 整合

本節整理了已整合 Lighthouse 資料的服務。如果您正在進行酷炫的 Lighthouse 整合專案並希望在此曝光，歡迎向本儲存庫提交 issue，或在 Twitter 上聯絡我們 [@_____lighthouse](https://twitter.com/____lighthouse)！

* **[Web Page Test](https://www.webpagetest.org)** — 一款[開放原始碼](https://github.com/WPO-Foundation/webpagetest)工具，可在真實裝置上量測與分析網頁效能。使用者可以選擇在 WebPageTest 結果分析之外，一併產出 Lighthouse 報表。

* **[HTTPArchive](http://httparchive.org/)** - HTTPArchive 以 Web Page Test 爬取 50 萬個網頁（包含 Lighthouse 結果）來追蹤網路的建構方式，並將資訊儲存於 BigQuery，且[公開提供](https://discuss.httparchive.org/t/quickstart-guide-to-exploring-the-http-archive/682)。

* **[Calibre](https://calibreapp.com)** - Calibre 是一套建立在 Lighthouse 之上的完整效能監控平台。透過 GitHub Pull Request Review，在功能上線前就看見效能影響；追蹤第三方腳本的影響；並以開發者優先的 Node.js API 自動化您的效能系統。Calibre 提供 15 天免費試用。

* **[DebugBear](https://www.debugbear.com/)** - DebugBear 是一套以 Lighthouse 為基礎的網站監控工具。看見分數與指標隨時間的變化，並專注於理解每次變動的原因。DebugBear 是付費產品，提供 30 天免費試用。

* **[Treo](https://treo.sh)** - Treo 是 Lighthouse 即服務（Lighthouse as a Service）。提供回歸測試、地理區域、自訂網路，以及與 GitHub 和 Slack 的整合。Treo 是付費產品，提供個人開發者與團隊方案。

* **[PageVitals](https://pagevitals.com)** - PageVitals 結合 Lighthouse、CrUX 與實地測試來監控網站效能。掌握網站隨時間的表現，效能變慢時收到警報，並深入挖掘找出效能問題的真正原因。PageVitals 是付費產品，提供 14 天免費試用。

* **[Screpy](https://screpy.com)** - Screpy 是一套網路分析工具，可在單一儀表板中分析您網站的所有頁面，並與團隊一同監控。它由 Lighthouse 驅動，也包含多種不同的分析工具（SERP、W3C、Uptime 等）。Screpy 提供免費與付費方案。

* **[Siteimprove Performance](https://siteimprove.com/en/performance/)** — Siteimprove Performance 是一套網頁效能監控解決方案，讓行銷人員、經理人或決策者能瞭解並最佳化網站載入時間。提供易於使用的洞察，專注於快速且有影響力的改善。Siteimprove Performance 是付費產品，提供 14 天免費試用。

* **[SpeedCurve](https://speedcurve.com)** — SpeedCurve 是一套持續監控不同瀏覽器、裝置與區域之網頁效能的工具。它能跨多個網頁與網站彙總任何指標（包含 Lighthouse 分數），並讓您設定效能預算與 Slack 或電子郵件警報。SpeedCurve 是付費產品，提供 30 天免費試用。

* **[Foo](https://www.foo.software/lighthouse)** - 提供免費與付費方案的 Lighthouse 即服務。透過 CircleCI、GitHub 與其他整合，提供 Lighthouse 審查的監控與歷史報表。功能包含 Slack 通知、PR 留言報表等。

* **[Apdex](https://apdex.co)** - Apdex 是一套網站效能服務。主要功能包含歷史 Lighthouse 報表視覺化、行動／桌面選項、警報、正常運作時間監控等。提供有彈性的付費方案與 30 天免費試用。

* **[Websu](https://websu.io)** - Websu 是一個開放原始碼專案，透過簡單的 HTTP REST API 提供 Lighthouse 即服務。主要特色是能自行託管與部署，並保留歷史 Lighthouse 報表摘要。

* **[DTEKT.IO](https://dtekt.io)** - DTEKT 是一套網站效能與正常運作時間監控服務。它使用 Lighthouse，從多個位置、多種裝置提供網站效能的能見度。提供三個月免費試用與付費方案。

* **[SpeedVitals](https://speedvitals.com)** - SpeedVitals 是一套由 Lighthouse 驅動的工具，用於量測多裝置、多地區的網頁效能。具備版面配置位移視覺化、瀑布圖、實地資料與資源圖表等多項功能。SpeedVitals 提供免費與付費方案。

* **[Lighthouse Metrics](https://lighthouse-metrics.com/)** - Lighthouse Metrics 讓您以單一次測試取得全球效能洞察，也能以每天或每小時的頻率監控網站。Lighthouse Metrics 提供免費的全球一次性測試，效能監控則為付費功能並有 14 天免費試用。

* **[Auditzy](https://auditzy.com)** - Auditzy™ 是一套強大的網站稽核與監控工具，讓您在使用者旅程之前分析網頁。分析競爭對手健康度指標、核心網頁指標與技術堆疊；將您的網頁與競爭對手比較，瞭解領先或落後之處。提供 Slack 即時通知、多團隊無縫協作，並可按每小時、每天、每週等頻率自動化稽核。提供免費試用與隨用隨付方案。

* **[Lighthouse Metrics China](http://lighthousemetricschina.com)** - 第一套專為中國設計的 Lighthouse 指標工具。透過 Lighthouse 體驗無與倫比的網站監控能力，深入瞭解在[中國防火長城](https://www.chinafirewalltest.co)環境下分數與指標的波動，全面掌握影響每次變動的因素。Lighthouse Metrics China 提供免費與付費方案。

* **[DeploymentHawk](https://deploymenthawk.com)** - DeploymentHawk 是一套由 Lighthouse 驅動的自動化網站稽核工具。輕鬆在效能、無障礙功能與 SEO 問題影響使用者之前加以攔截。DeploymentHawk 是付費產品，提供 7 天免費試用。

* **[Guardius](https://guardius.io)** - Guardius 是一套 DevOps 與 DevSecOps SaaS 平台，整合 Lighthouse 提供自動化網頁效能分析。除了指標評估與自動掃描，還能比較不同時期的效能並持續追蹤。此外，Guardius 提供符合您需求的預設與自訂警報。Guardius 提供免費版本供使用者探索其功能。

* **[Sonā](https://getsona.io)** - Sonā 以 Lighthouse 等工具為後盾，提供您網站健康狀況的深入洞察。追蹤隨時間的變化、分享報表，並取得改善效能、無障礙功能、SEO、最佳做法與安全性的可行建議。Sonā 在測試期間免費。

* **[FERU](https://feru.app)** - 從全球多個地區執行 Google Lighthouse 速度測試。透過 Lighthouse 分數、核心網頁指標與行動裝置效能指標，輕鬆測試您網站的速度、無障礙功能與 SEO。FERU 提供永久免費方案，以及進階分析與監控的付費功能。

* **[LightKeeper](https://www.lightkeeper.cloud)** - Lighthouse 測試服務，提供免費的 HAR Matrix 檢視與多區域測試（3 個免費區域、25 個以上付費區域），支援需要登入的網頁與跨區域效能比較。

## 非網頁效能服務中的 Lighthouse 整合

* **[PageWatch](https://pagewatch.dev/)** — PageWatch 是一套協助找出網站問題頁面的工具。提供拼字錯誤、版面配置問題、載入緩慢頁面（由 Lighthouse 驅動）等洞察。PageWatch 提供免費與付費方案。

* **[Fluxguard](https://fluxguard.com/)** - Fluxguard 以 Google Puppeteer 編排網站 DOM 變更監控，並由 Lighthouse 稽核。Fluxguard 是免費增值產品，每月免費監控最多 75 個頁面。

* **[Microlink](https://microlink.io)** — Microlink 是以 API 形式提供的雲端瀏覽器。它可隨選提供 Lighthouse 報表，讓您輕鬆在之上建立任何服務。底層的開放原始碼專案 browserless 也提供相近的功能。

* **[Wattspeed](https://wattspeed.com/)** — Wattspeed 是一套免費工具，能產生網頁的歷史快照，其中包含 Lighthouse 分數、技術清單、W3C HTML 驗證器結果、DOM 大小、混合內容資訊等。

## 外掛程式

* **[lighthouse-plugin-field-performance](https://github.com/treosh/lighthouse-plugin-field-performance)** - 一款外掛程式，運用 [Chrome UX Report](https://developers.google.com/web/tools/chrome-user-experience-report/) 的資料，為該 URL 加入真實使用者效能指標。

* **[lighthouse-plugin-publisher-ads](https://github.com/googleads/publisher-ads-lighthouse-plugin)** - 透過一系列自動化審查來改善廣告速度與整體品質的工具。目前主要針對使用 Google Ad Manager 的網站。此工具有助於解決發現的問題，並提供工具評估迭代變更的成效，同時給出可行的回饋建議。

* **[lighthouse-plugin-crux](https://github.com/dvelasquez/lighthouse-plugin-crux)** - 一款外掛程式，可從 [Chrome UX Report API](https://developers.google.com/web/tools/chrome-user-experience-report/api/reference) 快速收集真實使用者指標資料。

## 相關專案

其他使用 Lighthouse 的優秀開放原始碼專案。

* **[auto-lighthouse](https://github.com/TGiles/auto-lighthouse)** - 用於爬取網域並為每個頁面產生行動與桌面報表的 CLI。
* **[Exthouse](https://github.com/treosh/exthouse)** - 分析瀏覽器擴充功能對網頁效能的影響。
* **[Gimbal](https://labs.moduscreate.com/gimbal-web-performance-audit-budgeting)** - 一款[開放原始碼（MIT 授權）](https://github.com/ModusCreateOrg/gimbal)工具，用於量測、分析與編列網路應用程式的各項預算。Gimbal 也會將報表整合進 GitHub pull request。
* **[Gradle Lighthouse Plugin](https://github.com/Cognifide/gradle-lighthouse-plugin)** - 一款開放原始碼的 Gradle 外掛程式，可在多個 URL 上執行 Lighthouse 測試並斷言類別分數門檻（適合持續整合使用）。
* **[lighthouse-badges](https://github.com/emazzotta/lighthouse-badges)** - 依據 Lighthouse 效能產生 gh-badges（shields.io）。
* **[lighthouse-batch](https://github.com/mikestead/lighthouse-batch)** - 在多個網站上執行 Lighthouse 並產生其指標／分數的摘要。
* **[lighthouse-batch-parallel](https://github.com/Carr1005/lighthouse-batch-parallel)** - 平行執行多次 Lighthouse 以加速資料收集流程，並在您自己的程序中取得結果串流（csv、json、js 物件）（注意：效能結果可能波動）。
* **[lighthouse-check-action](https://github.com/foo-software/lighthouse-check-action)** - 一個 GitHub Action，用於在工作流程中執行 Lighthouse，具備 Slack 通知與報表上傳至 S3 的功能。
* **[lighthouse-check-orb](https://circleci.com/orbs/registry/orb/foo-software/lighthouse-check)** - 一個 CircleCI Orb，用於在工作流程中執行 Lighthouse，具備 Slack 通知與報表上傳至 S3 的功能。
* **[andreasonny83/lighthouse-ci](https://github.com/andreasonny83/lighthouse-ci)** - 執行 Lighthouse 並斷言分數符合您自訂的門檻。
* **[GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)** - （**官方**）自動化每次提交的 Lighthouse 執行、檢視變更並防止效能回歸。
* **[lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action)** - 一個 GitHub Action，讓您輕鬆在 CI 中執行 Lighthouse，並透過效能預算保持頁面精簡。
* **[lighthouse-gh-reporter](https://github.com/carlesnunez/lighthouse-gh-reporter)** - 在 CI 中執行 Lighthouse，並在 pull request 的留言中回報結果。
* **[lighthouse-jest-example](https://github.com/justinribeiro/lighthouse-jest-example)** - 透過 Lighthouse 收集效能指標並以 Jest 斷言結果；使用 Puppeteer 依 WebPageTest 定義的網路模擬設定啟動 Chrome。
* **[lighthouse-lambda](https://github.com/Otterseer/lighthouse-lambda)** - 在 AWS Lambda 上以預先建置的穩定桌面版 Headless Chrome 執行 Lighthouse。
* **[lighthouse-matchers](https://github.com/ackama/lighthouse-matchers)** - 提供 RSpec matcher，用於執行與評估 Google Chrome Lighthouse 審查分數。
* **[lighthouse-mocha-example](https://github.com/rishichawda/lighthouse-mocha-example)** - 使用 Mocha 與 chrome-launcher 執行 Lighthouse 效能測試。
* **[lighthouse-monitor](https://github.com/verivox/lighthouse-monitor)** - 在您所有 URL 上執行 Lighthouse。將指標傳送到任何後端、依自動資料保留策略保存所有報表，並在網頁介面中比較任意兩次結果。
* **[lighthouse-persist](https://github.com/foo-software/lighthouse-persist)** - 執行 Lighthouse 並將 HTML 報表上傳至 AWS S3 儲存貯體。
* **[lighthouse-viewer](https://github.com/dvelasquez/lighthouse-viewer/tree/main/packages/lighthouse-viewer)** - 將 Lighthouse JSON 渲染成報表，使用重新封裝為 UMD 與 ESM 的 Lighthouse Report Renderer。另提供 React、Svelte 與 Vue 的封裝。
* **[lighthouse4u](https://github.com/godaddy/lighthouse4u)** - LH4U 以服務形式提供 Google Lighthouse，具備友善的 UI+API，並以 Elastic Search 為後盾，方便查詢與視覺化。
* **[react-lighthouse-viewer](https://www.npmjs.com/package/react-lighthouse-viewer)** - 在 React 元件中渲染 Lighthouse JSON 報表。
* **[site-audit-seo](https://github.com/viasite/site-audit-seo)** - 用於 SEO 網站稽核的 CLI 工具，可爬取網站並對每個頁面執行 Lighthouse。輸出至主控台與 csv、xlsx、json、網頁或 Google Drive 表格。
* **[webpack-lighthouse-plugin](https://github.com/addyosmani/webpack-lighthouse-plugin)** - 在 Webpack 建置流程中執行 Lighthouse。
* **[cypress-audit](https://github.com/mfrachet/cypress-audit)** - 直接在 E2E 測試套件中執行 Lighthouse 與 Pa11y 審查。
* **[laravel-lighthouse](https://github.com/adityadees/laravel-lighthouse)** - Laravel 框架的 Google Lighthouse 封裝，可用自訂選項執行 Google Lighthouse CLI，並自動將結果存放在您的伺服器目錄。
* **[Neodymium](https://github.com/Xceptance/neodymium/wiki/Accessibility)** - Neodymium 測試自動化框架整合了 Lighthouse，用於無障礙功能與 Web Vitals 驗證，可程式化驗證與斷言所有審查數值。

## 常見問題

### Lighthouse 的運作方式為何？

請參閱 [Lighthouse 架構](./docs/architecture.md)。

### 為什麼效能分數這麼低？我覺得看起來沒問題啊。

Lighthouse 報告的效能指標，是以典型行動裝置使用者在 4G 網路與中階（約 200 美元）手機上的體驗為準。即使在您的裝置與網路上載入很快，其他環境的使用者體驗可能截然不同。

更多資訊請閱讀我們的[節流指南](./docs/throttling.md)。

### 為什麼效能分數的變化這麼大？

即使程式碼沒有變動，由於網路與網路技術固有的變異性，Lighthouse 的效能分數仍會變化。請在一致的環境中測試、多次執行 Lighthouse，並在對效能變動下結論之前留意變異性。

更多資訊請閱讀我們的[降低變異性指南](./docs/variability.md)。

### 我可以調整 Lighthouse 的執行方式嗎？

可以！細節請見 [Lighthouse 設定](./docs/configuration.md)。

### Lighthouse 如何使用網路節流？我又該如何改善它？

問得好。Lighthouse 執行時預設會套用網路與 CPU 節流。網路會嘗試模擬緩慢的 4G 連線，CPU 則會比您機器的預設速度慢 4 倍。如果您想在沒有節流的情況下執行 Lighthouse，就必須使用 CLI，並透過上述 `--throttling.*` 旗標將其關閉。

更多資訊請閱讀我們的[網路節流指南](./docs/throttling.md)。

### 結果會傳送到遠端伺服器嗎？

不會。Lighthouse 在本機執行，使用安裝在機器上的本機版 Chrome 瀏覽器來審查頁面。報表結果絕不會被處理或傳送到遠端伺服器。

### 如何透過 CLI 取得在地化的 Lighthouse 結果？

從 Lighthouse 8.0 開始，Lighthouse 完全依賴原生的 `Intl` 支援，不再使用 `Intl` polyfill。如果您使用 Node 14 或更新版本，應該不會有任何問題，因為 Node 現在[預設以 `full-icu` 建置](https://nodejs.medium.com/node-js-12-to-lts-and-node-js-13-is-here-e28d6a4a2bd#9514)。

不過，如果您使用的是 `small-icu` 的 Node 建置版本，可能會看到 Lighthouse 記錄關於無法使用您語言環境的訊息。要解決這個問題，您可以在啟動時使用 [`full-icu`](https://www.npmjs.com/package/full-icu) 模組與 [`--icu-data-dir` node 旗標](https://nodejs.org/api/intl.html#intl_providing_icu_data_at_runtime)手動安裝 ICU 資料。

### 如何撰寫自訂審查來擴充 Lighthouse？

> **提示**：如需術語與架構的更多資訊，請參閱 [Lighthouse 架構](./docs/architecture.md)。

Lighthouse 可以擴充以執行您所撰寫的自訂審查與收集器。
如果您已經在網站上追蹤效能指標，並希望在 Lighthouse 報表中呈現這些指標，這會非常實用。

如果您有興趣執行自己的自訂審查，請看看實作範例中的
[自訂審查範例](./docs/recipes/custom-audit)。

### 我要如何參與貢獻？

我們非常歡迎您協助撰寫審查、修復錯誤，並讓這個工具更加實用！
請參閱[貢獻指南](./CONTRIBUTING.md)開始行動。

---
<p align="center">
  <img src="./assets/lighthouse-logo_512px.png" alt="Lighthouse logo" height="150">
  <br>
  <b>Lighthouse</b>，ˈlītˌhous（名詞）：一座<s>塔或其他建築物</s>裝有 beacon 訊號燈的<s>燈塔</s>工具，
  用來警告或引導<s>海上船隻</s>開發者。
</p>
