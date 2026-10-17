[English](readme.md) | [繁體中文](readme.zh-TW.md) | **日本語**

# Lighthouse  [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/CI/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/ci.yml) [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/unit/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/unit.yml) [![GitHub Actions Status Badge](https://github.com/GoogleChrome/lighthouse/workflows/smoke/badge.svg)](https://github.com/GoogleChrome/lighthouse/actions/workflows/smoke.yml) [![Coverage Status](https://codecov.io/gh/GoogleChrome/lighthouse/branch/main/graph/badge.svg)](https://codecov.io/gh/GoogleChrome/lighthouse) [![Build tracker for Lighthouse](https://img.shields.io/badge/buildtracker-ok-blue)](https://lh-build-tracker.herokuapp.com/) [![NPM lighthouse package](https://img.shields.io/npm/v/lighthouse.svg)](https://npmjs.org/package/lighthouse)

> Lighthouse はウェブアプリとウェブページを分析し、最新のパフォーマンス指標と開発者向けベストプラクティスの洞察を収集します。

- Lighthouse を使う
  - [Chrome DevTools で Lighthouse を使う](#chrome-devtools-で-lighthouse-を使う)
  - [Chrome 拡張機能を使う](#chrome-拡張機能を使う)
  - [Node CLI を使う](#node-cli-を使う)
    * [CLI オプション](#cli-オプション)
  - [Node モジュールを使う](#node-モジュールを使う)
  - [レポートを見る](#レポートを見る)
    * [オンラインビューア](#オンラインビューア)
  - [ドキュメントとレシピ](#ドキュメントとレシピ)
  - [Lighthouse の開発](#開発)
    * [セットアップ](#セットアップ)
    * [実行](#実行)
    * [テスト](#テスト)
    * [ドキュメント](#ドキュメント)
- 関連プロダクトとプロジェクト
  - [ウェブパフォーマンスサービスにおける Lighthouse 連携](#ウェブパフォーマンスサービスにおける-lighthouse-連携)
  - [ウェブパフォーマンス以外のサービスにおける Lighthouse 連携](#ウェブパフォーマンス以外のサービスにおける-lighthouse-連携)
  - [プラグイン](#プラグイン)
  - [関連プロジェクト](#関連プロジェクト)
- [よくある質問](#よくある質問)
  * [Lighthouse はどのように動作しますか？](#lighthouse-はどのように動作しますか)
  * [Lighthouse の実行を設定できますか？](#lighthouse-の実行を設定できますか)
  * [Lighthouse はどうやってネットワークをスロットリングしますか？改善するには？](#lighthouse-はどうやってネットワークをスロットリングしますか改善するには)
  * [結果はリモートサーバーに送信されますか？](#結果はリモートサーバーに送信されますか)
  * [CLI からローカライズされた Lighthouse 結果を得るには？](#cli-からローカライズされた-lighthouse-結果を得るには)
  * [Lighthouse を拡張するカスタム監査を書くには？](#lighthouse-を拡張するカスタム監査を書くには)
  * [コントリビュートするには？](#コントリビュートするには)

## Chrome DevTools で Lighthouse を使う

Lighthouse は Chrome DevTools の「Lighthouse」パネルに直接統合されています。

**インストール**: [Chrome](https://www.google.com/chrome/browser) をインストールします。

**実行**: Chrome DevTools を開き、Lighthouse パネルを選択して「レポートを生成」を押します。

<img width="550" alt="Lighthouse integration in Chrome DevTools." src="https://user-images.githubusercontent.com/2766281/204185043-9c49abe5-baee-4b26-b5ce-ece410661213.png">

## Chrome 拡張機能を使う

Chrome 拡張機能は、Lighthouse が Chrome DevTools に入る前から提供されており、同様の機能を備えています。

**インストール**: Chrome ウェブストアから[拡張機能をインストール](https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk)します。

**実行**: [拡張機能クイックスタートガイド](https://developers.google.com/web/tools/lighthouse/#extension)に従ってください。

## Node CLI を使う

Node CLI は、Lighthouse の実行とレポート出力の設定において最大の柔軟性を提供します。より高度な使い方をしたい方や、Lighthouse を自動的に実行したい方は Node CLI を使ってください。

> [!NOTE]
> Lighthouse には Node 22 (LTS) 以降が必要です。

**インストール**:

```sh
npm install -g lighthouse
# or use yarn:
# yarn global add lighthouse
```

**実行**: `lighthouse https://airhorner.com/`

デフォルトでは、Lighthouse はレポートを HTML ファイルに書き出します。フラグを渡すことで出力形式を制御できます。

### CLI オプション

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

##### 出力例

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

##### ライフサイクルの例
`--gather-mode`（`-G`）と `--audit-mode`（`-A`）CLI フラグを使うと、Lighthouse のライフサイクルの一部だけを実行できます。

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


#### エラー報告についての注意

CLI を初めて実行すると、Lighthouse が実行時例外を匿名で報告できるかどうかを尋ねるメッセージが表示されます。Lighthouse チームはこの情報を新しいバグの検出とリグレッションの回避に活用します。オプトアウトしても Lighthouse の利用に一切影響はありません。[詳しく見る](https://github.com/GoogleChrome/lighthouse/blob/main/docs/error-reporting.md)。

## Node モジュールを使う
Node モジュールを使えば、プログラムから Lighthouse を利用することもできます。

入門のヒントは[プログラムから Lighthouse を使う](./docs/readme.md#using-programmatically)をご覧ください。\
利用できる設定オプションの詳細は [Lighthouse の設定](./docs/configuration.md)をご覧ください。

## レポートを見る

Lighthouse は JSON または HTML 形式のレポートを生成できます。

HTML レポート:

<img src="https://raw.githubusercontent.com/GoogleChrome/lighthouse/443ff2c8a297dfd2297dfaca86c4966a87c8574a/assets/example_audit.png" alt="Lighthouse example audit" width="500px">

### オンラインビューア

`--output=json` フラグ付きで Lighthouse を実行すると、その実行の JSON ダンプが生成されます。
<https://googlechrome.github.io/lighthouse/viewer/> にアクセスしてファイルをアプリにドラッグすると、
このレポートをオンラインで見ることができます。任意の Lighthouse HTML レポート上部の「Export」ボタンから、
[Lighthouse Viewer](https://googlechrome.github.io/lighthouse/viewer/) でレポートを開くこともできます。

ビューアでは、右上の共有アイコンをクリックして GitHub にサインインするとレポートを共有できます。

> [!NOTE]
>  共有されたレポートは、あなたのアカウントのシークレット Gist として GitHub に保存されます。

## ドキュメントとレシピ

始めるのに役立つ実用的なドキュメント、例、レシピです。

**ドキュメント**

- [ばらつきへの対処](./docs/variability.md)
- [プログラムから Lighthouse を使う](./docs/readme.md#using-programmatically)
- [認証付きサイトのテスト](./docs/authenticated-pages.md)
- [プラグインの開発](./docs/plugins.md)
- [新しい監査を作る](./docs/new-audits.md)
- [モバイルデバイスでのテスト](./docs/readme.md#testing-on-a-mobile-device)
- [Lighthouse のアーキテクチャ](./docs/architecture.md)

**レシピ**

- [プラグイン](./docs/recipes/lighthouse-plugin-example) - Lighthouse プラグインの例
- [カスタム監査の例](./docs/recipes/custom-audit) - Lighthouse を拡張して独自の監査を実行する

**動画**

Google I/O 2018 のセッションでは、新しいパフォーマンス エンジン、近日公開の Lighthouse REST API、そして実ユーザーデータを評価するための Chrome UX Report の活用について紹介しています。

[![Watch the Lighthouse @ Google I/O 2018 session.](https://img.youtube.com/vi/UvK9zAsSM8Q/0.jpg)](https://www.youtube.com/watch?v=UvK9zAsSM8Q)

Google I/O 2017 のセッションでは、アーキテクチャ、カスタム監査の作成、
GitHub/Travis/CI 連携、headless Chrome などをカバーしています：

[![Watch the Lighthouse @ Google I/O 2017 session.](https://img.youtube.com/vi/NoRYn6gOtVo/0.jpg)](https://www.youtube.com/watch?v=NoRYn6gOtVo)

_画像をクリックすると YouTube で動画が見られます。_

## 開発

Lighthouse をハックする基本を紹介します。詳細は[コントリビューション](./CONTRIBUTING.md)もご覧ください。

### セットアップ

```sh
# yarn should be installed first

git clone https://github.com/GoogleChrome/lighthouse

cd lighthouse
yarn
yarn build-all
```

### 実行

```sh
node cli http://example.com
# append --chrome-flags="--no-sandbox --headless --disable-gpu" if you run into problems connecting to Chrome
```

> **はじめのヒント**: `node --inspect-brk cli http://example.com` で Chrome DevTools を開き、
> アプリ全体をステップ実行できます。詳細は[Chrome DevTools で Node.js をデバッグする](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.59rma3ukm)をご覧ください。

### テスト

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

### ドキュメント

一部のドキュメントには、デフォルトでは CI でのみ実行されるテストがあります。ドキュメントを変更するときは、ローカルで `yarn build-pack && yarn test-docs` を実行して合格することを確認してください。

**追加の依存関係**
- `brew install jq`

## ウェブパフォーマンスサービスにおける Lighthouse 連携

このセクションでは、Lighthouse のデータを連携しているサービスを紹介します。Lighthouse を連携したかっこいいプロジェクトをやっていて、ここで紹介されたい方は、このリポジトリに issue を送るか、Twitter で [@_____lighthouse](https://twitter.com/____lighthouse) までツイートしてください！

* **[Web Page Test](https://www.webpagetest.org)** — 実機でウェブページのパフォーマンスを測定・分析する[オープンソース](https://github.com/WPO-Foundation/webpagetest)ツール。WebPageTest の結果分析に加えて、Lighthouse レポートを一緒に生成できます。

* **[HTTPArchive](http://httparchive.org/)** - HTTPArchive は Web Page Test で 50 万ページをクロール（Lighthouse 結果を含む）してウェブの構築状況を追跡し、その情報を BigQuery に保存して[公開しています](https://discuss.httparchive.org/t/quickstart-guide-to-exploring-the-http-archive/682)。

* **[Calibre](https://calibreapp.com)** - Calibre は Lighthouse 上に構築された総合パフォーマンス監視プラットフォームです。GitHub Pull Request レビューで本番反映前に仕事のパフォーマンスへの影響を確認。サードパーティスクリプトの影響を追跡。開発者ファーストの Node.js API でパフォーマンスシステムを自動化。Calibre は 15 日間の無料トライアルあり。

* **[DebugBear](https://www.debugbear.com/)** - DebugBear は Lighthouse ベースのウェブサイト監視ツールです。スコアや指標が時間とともにどう変わったかを確認でき、それぞれの変化の原因の理解に焦点を当てます。DebugBear は有料プロダクトで、30 日間の無料トライアルがあります。

* **[Treo](https://treo.sh)** - Treo は Lighthouse as a Service です。リグレッションテスト、地理的リージョン、カスタムネットワーク、GitHub と Slack の連携を提供します。Treo は有料プロダクトで、個人開発者とチーム向けのプランがあります。

* **[PageVitals](https://pagevitals.com)** - PageVitals は Lighthouse、CrUX、フィールドテストを組み合わせてウェブサイトのパフォーマンスを監視します。ウェブサイトの経時的なパフォーマンスを確認し、遅くなりすぎたらアラートを受け取れます。掘り下げてパフォーマンス問題の真の原因を見つけられます。PageVitals は有料プロダクトで、14 日間の無料トライアルがあります。

* **[Screpy](https://screpy.com)** - Screpy は、ウェブサイトのすべてのページを 1 つのダッシュボードで分析し、チームで監視できるウェブ解析ツールです。Lighthouse を活用し、さまざまな解析ツール（SERP、W3C、Uptime など）も備えています。Screpy には無料プランと有料プランがあります。

* **[Siteimprove Performance](https://siteimprove.com/en/performance/)** — Siteimprove Performance は、マーケター、マネージャー、意思決定者がウェブサイトの読み込み時間を理解し最適化できるウェブパフォーマンス監視ソリューションです。素早く大きな成果につながる洞察に焦点を当てた使いやすいインサイトを提供します。Siteimprove Performance は有料プロダクトで、14 日間の無料トライアルがあります。

* **[SpeedCurve](https://speedcurve.com)** — SpeedCurve は、さまざまなブラウザ、デバイス、リージョンにわたってウェブパフォーマンスを継続的に監視するツールです。複数ページ・複数サイトの Lighthouse スコアを含む任意の指標を集約でき、Slack やメールアラート付きのパフォーマンス予算を設定できます。SpeedCurve は有料プロダクトで、30 日間の無料トライアルがあります。

* **[Foo](https://www.foo.software/lighthouse)** - 無料プランとプレミアムプランを提供する Lighthouse-as-a-service。CircleCI、GitHub などの連携で Lighthouse 監査の監視と履歴レポートを提供します。Slack 通知、PR コメントレポートなどの機能があります。

* **[Apdex](https://apdex.co)** - Apdex はウェブサイトパフォーマンスサービスです。主な機能は履歴 Lighthouse レポートの可視化、モバイル/デスクトップの選択、アラート、稼働時間監視などです。柔軟な有料プランと 30 日間の無料トライアルがあります。

* **[Websu](https://websu.io)** - Websu は、シンプルな HTTP REST API で Lighthouse-as-a-Service を提供するオープンソースプロジェクトです。主な特徴は、自分の環境でホスト・デプロイできることと、履歴 Lighthouse レポートのサマリーです。

* **[DTEKT.IO](https://dtekt.io)** - DTEKT はウェブサイトのパフォーマンスと稼働時間の監視サービスです。Lighthouse を使って、複数の場所・複数のデバイスからウェブサイトのパフォーマンスを可視化します。3 か月の無料トライアルと有料プランがあります。

* **[SpeedVitals](https://speedvitals.com)** - SpeedVitals は Lighthouse を活用したツールで、複数デバイス・複数ロケーションのウェブパフォーマンスを測定します。レイアウトシフトの可視化、ウォーターフォールチャート、フィールドデータ、リソースグラフなどの機能があります。SpeedVitals は無料プランと有料プランを提供しています。

* **[Lighthouse Metrics](https://lighthouse-metrics.com/)** - Lighthouse Metrics は、1 回のテストでグローバルなパフォーマンスの洞察を提供します。毎日または毎時間のベースでウェブサイトを監視することもできます。Lighthouse Metrics はグローバルな一回限りのテストを無料で提供し、パフォーマンス監視は 14 日間の無料トライアル付きの有料機能です。

* **[Auditzy](https://auditzy.com)** - Auditzy™ は、ユーザージャーニーの前にウェブページを分析できる堅牢なウェブサイト監査・監視ツールです。競合他社の健全性指標、Core Web Vitals、テクノロジーを分析。ウェブページを競合と比較して、どこでリードし、どこで遅れているかを把握できます。Slack によるリアルタイム通知、複数チームのシームレスなコラボレーションに対応。監査は毎時間・毎日・毎週などで自動化できます。無料トライアルと従量課金プランがあります。

* **[Lighthouse Metrics China](http://lighthousemetricschina.com)** - 中国向けに特別設計された初の Lighthouse 指標ツール。Lighthouse で比類のないウェブサイト監視能力を体験できます。[中国のグレートファイアウォール](https://www.chinafirewalltest.co)の環境下でのスコアと指標の変動を把握し、それぞれの変化に影響する要因を包括的に理解できます。Lighthouse Metrics China は無料プランと有料プランがあります。

* **[DeploymentHawk](https://deploymenthawk.com)** - DeploymentHawk は Lighthouse を活用した自動サイト監査ツールです。パフォーマンス、アクセシビリティ、SEO の問題がユーザーに影響する前に簡単に検出できます。DeploymentHawk は有料プロダクトで、7 日間の無料トライアルがあります。

* **[Guardius](https://guardius.io)** - Guardius は Lighthouse を連携して自動ウェブパフォーマンス分析を提供する DevOps / DevSecOps SaaS プラットフォームです。指標評価と自動スキャンに加えて、期間をまたいだパフォーマンス比較と継続的な観測が可能です。さらに、Guardius は特定の要件に合わせた事前定義・カスタムのアラートを提供します。機能を試せる無料版もあります。

* **[Sonā](https://getsona.io)** - Lighthouse などを活用して、ウェブサイトの健全性に関する深い洞察を提供する Sonā。経時的な変化を追跡し、レポートを共有し、パフォーマンス、アクセシビリティ、SEO、ベストプラクティス、セキュリティを改善するための実用的な推奨事項を受け取れます。Sonā はベータ期間中は無料です。

* **[FERU](https://feru.app)** - 世界中の複数リージョンから Google Lighthouse スピードテストを実行。Lighthouse スコア、Core Web Vitals、モバイルパフォーマンス指標でサイトの速度、アクセシビリティ、SEO を簡単にテストできます。FERU は常時無料プランに加えて、高度な分析と監視のプレミアム機能を提供しています。

* **[LightKeeper](https://www.lightkeeper.cloud)** - 無料の HAR Matrix 表示とマルチリージョンテスト（無料 3 リージョン、有料 25 以上）を備えた Lighthouse テストサービス。認証付きページとリージョン間のパフォーマンス比較に対応。

## ウェブパフォーマンス以外のサービスにおける Lighthouse 連携

* **[PageWatch](https://pagewatch.dev/)** — PageWatch はウェブサイトの問題ページを見つけるツールです。スペルミス、レイアウトの問題、遅いページ（Lighthouse が活用）などの洞察を提供します。PageWatch は無料プランと有料プランで提供されています。

* **[Fluxguard](https://fluxguard.com/)** - Fluxguard は Google Puppeteer でオーケストレーションし、Lighthouse が監査するウェブサイト DOM 変更監視を提供します。Fluxguard はフリーミアムプロダクトで、毎月最大 75 ページまで無料で監視できます。

* **[Microlink](https://microlink.io)** — Microlink は API としてのクラウドブラウザです。オンデマンドで Lighthouse レポートを提供し、その上にどんなサービスも簡単に構築できます。同様の機能は、browserless というオープンソースプロジェクトでも利用できます。

* **[Wattspeed](https://wattspeed.com/)** — Wattspeed は、Lighthouse スコア、テクノロジー一覧、W3C HTML バリデーターの結果、DOM サイズ、混在コンテンツ情報などを含む、ウェブページの履歴スナップショットを生成する無料ツールです。

## プラグイン

* **[lighthouse-plugin-field-performance](https://github.com/treosh/lighthouse-plugin-field-performance)** - [Chrome UX Report](https://developers.google.com/web/tools/chrome-user-experience-report/) のデータを使って、その URL の実ユーザー パフォーマンス指標を追加するプラグイン。

* **[lighthouse-plugin-publisher-ads](https://github.com/googleads/publisher-ads-lighthouse-plugin)** - 一連の自動監査を通じて広告の速度と全体的な品質を改善するツール。現時点では主に Google Ad Manager を利用するサイトを対象としています。このツールは発見された問題の解決を助け、反復的な変更の有効性を評価するためのツールを提供しつつ、実用的なフィードバックを提案します。

* **[lighthouse-plugin-crux](https://github.com/dvelasquez/lighthouse-plugin-crux)** - [Chrome UX Report API](https://developers.google.com/web/tools/chrome-user-experience-report/api/reference) から実ユーザーメトリクス データを素早く収集するプラグイン。

## 関連プロジェクト

Lighthouse を使っている他の素晴らしいオープンソースプロジェクト。

* **[auto-lighthouse](https://github.com/TGiles/auto-lighthouse)** - ドメインをクロールし、各ページのモバイルとデスクトップのレポートを生成する CLI。
* **[Exthouse](https://github.com/treosh/exthouse)** - ブラウザ拡張機能がウェブパフォーマンスに与える影響を分析。
* **[Gimbal](https://labs.moduscreate.com/gimbal-web-performance-audit-budgeting)** - ウェブアプリケーションの測定・分析・予算管理に使われる[オープンソース (MIT ライセンス)](https://github.com/ModusCreateOrg/gimbal)ツール。Gimbal は GitHub の pull request にもレポートを連携します。
* **[Gradle Lighthouse Plugin](https://github.com/Cognifide/gradle-lighthouse-plugin)** - 複数の URL で Lighthouse テストを実行し、カテゴリのスコアしきい値をアサートするオープンソースの Gradle プラグイン（継続的インテグレーションに有用）。
* **[lighthouse-badges](https://github.com/emazzotta/lighthouse-badges)** - Lighthouse パフォーマンスに基づく gh-badges (shields.io) を生成。
* **[lighthouse-batch](https://github.com/mikestead/lighthouse-batch)** - 複数のサイトで Lighthouse を実行し、指標/スコアのサマリーを生成。
* **[lighthouse-batch-parallel](https://github.com/Carr1005/lighthouse-batch-parallel)** - 複数の Lighthouse 実行を並列化してデータ収集を高速化し、結果ストリーム (csv, json, js オブジェクト) を自分のプロセスで取得（注意: パフォーマンスの結果は変動する可能性があります）。
* **[lighthouse-check-action](https://github.com/foo-software/lighthouse-check-action)** - ワークフローで Lighthouse を実行する GitHub Action。Slack 通知と S3 へのレポートアップロードが特徴。
* **[lighthouse-check-orb](https://circleci.com/orbs/registry/orb/foo-software/lighthouse-check)** - ワークフローで Lighthouse を実行する CircleCI Orb。Slack 通知と S3 へのレポートアップロードが特徴。
* **[andreasonny83/lighthouse-ci](https://github.com/andreasonny83/lighthouse-ci)** - Lighthouse を実行し、スコアがカスタムしきい値を満たすことをアサート。
* **[GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)** - （**公式**）コミットごとの Lighthouse 実行を自動化し、変更を確認してリグレッションを防止。
* **[lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action)** - CI で Lighthouse を簡単に実行し、パフォーマンス予算を使ってページを小さく保つ GitHub Action。
* **[lighthouse-gh-reporter](https://github.com/carlesnunez/lighthouse-gh-reporter)** - CI で Lighthouse を実行し、pull request のコメントで結果を報告。
* **[lighthouse-jest-example](https://github.com/justinribeiro/lighthouse-jest-example)** - Lighthouse でパフォーマンス指標を収集し、Jest で結果をアサート。WebPageTest で定義されたネットワークエミュレーション設定で Chrome を起動するために Puppeteer を使用。
* **[lighthouse-lambda](https://github.com/Otterseer/lighthouse-lambda)** - ビルド済みの安定したデスクトップ版 Headless Chrome で AWS Lambda 上の Lighthouse を実行。
* **[lighthouse-matchers](https://github.com/ackama/lighthouse-matchers)** - Google Chrome Lighthouse 監査スコアの実行と評価のための RSpec マッチャーを提供。
* **[lighthouse-mocha-example](https://github.com/rishichawda/lighthouse-mocha-example)** - Mocha と chrome-launcher で Lighthouse パフォーマンステストを実行。
* **[lighthouse-monitor](https://github.com/verivox/lighthouse-monitor)** - すべての URL で Lighthouse を実行。指標を任意のバックエンドに送信し、自動データ保持ですべてのレポートを保存し、任意の 2 つの結果をウェブ UI で比較。
* **[lighthouse-persist](https://github.com/foo-software/lighthouse-persist)** - Lighthouse を実行し、HTML レポートを AWS S3 バケットにアップロード。
* **[lighthouse-viewer](https://github.com/dvelasquez/lighthouse-viewer/tree/main/packages/lighthouse-viewer)** - Lighthouse JSON をレポートにレンダリング。UMD と ESM に再パッケージされた Lighthouse Report Renderer を使用。React、Svelte、Vue のラッパーもあります。
* **[lighthouse4u](https://github.com/godaddy/lighthouse4u)** - LH4U は Google Lighthouse をサービスとして提供し、親切な UI+API で表面化し、Elastic Search をバックエンドに、簡単なクエリと可視化を実現。
* **[react-lighthouse-viewer](https://www.npmjs.com/package/react-lighthouse-viewer)** - React コンポーネントで Lighthouse JSON レポートをレンダリング。
* **[site-audit-seo](https://github.com/viasite/site-audit-seo)** - SEO サイト監査のための CLI ツール。サイトをクロールし、各ページで Lighthouse を実行。コンソールや csv、xlsx、json、ウェブ、Google Drive のテーブルに出力。
* **[webpack-lighthouse-plugin](https://github.com/addyosmani/webpack-lighthouse-plugin)** - Webpack ビルドから Lighthouse を実行。
* **[cypress-audit](https://github.com/mfrachet/cypress-audit)** - E2E テストスイート内で Lighthouse と Pa11y の監査を直接実行。
* **[laravel-lighthouse](https://github.com/adityadees/laravel-lighthouse)** - Laravel フレームワーク向け Google Lighthouse ラッパー。カスタムオプションで Google Lighthouse CLI を実行でき、結果をサーバーディレクトリに自動保存できます。
* **[Neodymium](https://github.com/Xceptance/neodymium/wiki/Accessibility)** - Neodymium テスト自動化フレームワークはアクセシビリティと Web Vitals の検証に Lighthouse を連携し、すべての監査値のプログラムによる検証とアサートを可能にします。

## よくある質問

### Lighthouse はどのように動作しますか？

[Lighthouse のアーキテクチャ](./docs/architecture.md)をご覧ください。

### パフォーマンス スコアが低いのはなぜですか？自分には正常に見えますが。

Lighthouse は、4G 接続と中価格帯（約 200 ドル）のスマートフォンを使う典型的なモバイルユーザーの体験としてパフォーマンス指標を報告します。お使いのデバイスやネットワークでは高速に読み込まれても、他の環境のユーザーにはまったく異なる体験になることがあります。

詳しくは[スロットリングのガイド](./docs/throttling.md)をお読みください。

### パフォーマンス スコアが大きく変動するのはなぜですか？

コードに変更がなくても、ウェブとネットワーク技術に固有のばらつきにより、Lighthouse のパフォーマンス スコアは変動します。一貫した環境でテストし、Lighthouse を複数回実行し、パフォーマンスに影響する変更について結論を出す前にばらつきに注意してください。

詳しくは[ばらつきを減らすガイド](./docs/variability.md)をお読みください。

### Lighthouse の実行を設定できますか？

できます！詳細は [Lighthouse の設定](./docs/configuration.md)をご覧ください。

### Lighthouse はどうやってネットワークをスロットリングしますか？改善するには？

良い質問です。Lighthouse の実行では、デフォルトでネットワークと CPU のスロットリングが適用されます。ネットワークは低速な 4G 接続のエミュレーションを試み、CPU はお使いのマシンのデフォルト速度から 4 分の 1 に落とされます。スロットリングなしで Lighthouse を実行したい場合は、上記の `--throttling.*` フラグで無効化するため CLI を使う必要があります。

詳しくは[ネットワークスロットリングのガイド](./docs/throttling.md)をお読みください。

### 結果はリモートサーバーに送信されますか？

いいえ。Lighthouse はローカルで実行され、マシンにインストールされたローカル版の Chrome ブラウザでページを監査します。レポートの結果がリモートサーバーに処理・送信されることは決してありません。

### CLI からローカライズされた Lighthouse 結果を得るには？

Lighthouse 8.0 から、Lighthouse はネイティブの `Intl` サポートに完全に依存し、`Intl` のポリフィルは使わなくなりました。Node 14 以降を使っている場合、Node は[デフォルトで `full-icu` 付きでビルド](https://nodejs.medium.com/node-js-12-to-lts-and-node-js-13-is-here-e28d6a4a2bd#9514)されているので、問題はないはずです。

ただし `small-icu` の Node ビルドを使っていると、ロケールが利用できないという Lighthouse のログメッセージが見えることがあります。これを解決するには、起動時に [`full-icu`](https://www.npmjs.com/package/full-icu) モジュールと [`--icu-data-dir` node フラグ](https://nodejs.org/api/intl.html#intl_providing_icu_data_at_runtime)を使って ICU データを手動でインストールできます。

### Lighthouse を拡張するカスタム監査を書くには？

> **ヒント**: 用語とアーキテクチャの詳細は[Lighthouse のアーキテクチャ](./docs/architecture.md)をご覧ください。

Lighthouse は、自分で書いたカスタム監査とギャザラーを実行するように拡張できます。
すでにサイトでパフォーマンス指標を追跡していて、それらの指標を Lighthouse レポートの中で見せたい場合に最適です。

カスタム監査を実行することに興味があれば、レシピの
[カスタム監査の例](./docs/recipes/custom-audit)をご覧ください。

### コントリビュートするには？

監査の作成、バグの修正、そしてこのツールをより便利にすることにご協力いただければ嬉しいです！
はじめるには[コントリビューション](./CONTRIBUTING.md)をご覧ください。

---
<p align="center">
  <img src="./assets/lighthouse-logo_512px.png" alt="Lighthouse logo" height="150">
  <br>
  <b>Lighthouse</b>、ˈlītˌhous（名詞）：<s>塔やその他の構造物</s>ビーコンの灯りを備えた<s>灯台</s>ツールで、
  <s>海上の船</s>開発者に警告し、導く。
</p>
