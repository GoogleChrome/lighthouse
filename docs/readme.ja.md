[English](readme.md) | [繁體中文](readme.zh-TW.md) | **日本語**

このディレクトリには、役立つドキュメントと例（読み進めてください）、
そして始めるための[レシピ](./recipes/)が収められています。Lighthouse の
内部構造の概観は [Lighthouse のアーキテクチャ](architecture.md)をご覧ください。

> [!NOTE]
> その他の詳細な開発者ドキュメントは現在英語です。主な入口は [Lighthouse README](../readme.ja.md) をご覧ください。

## プログラムから Lighthouse を使う

以下の例は、Node モジュールとして Lighthouse をプログラムから実行する方法を示しています。Lighthouse を依存関係としてインストール済みである前提です（`yarn add --dev lighthouse`）。

```js
import fs from 'fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
const options = {logLevel: 'info', output: 'html', onlyCategories: ['performance'], port: chrome.port};
const runnerResult = await lighthouse('https://example.com', options);

// `.report` is the HTML report as a string
const reportHtml = runnerResult.report;
fs.writeFileSync('lhreport.html', reportHtml);

// `.lhr` is the Lighthouse Result as a JS object
console.log('Report is done for', runnerResult.lhr.finalDisplayedUrl);
console.log('Performance score was', runnerResult.lhr.categories.performance.score * 100);

chrome.kill();
```

### パフォーマンスのみの Lighthouse 実行

Lighthouse を使う多くのモジュールはパフォーマンスの数値だけに関心があります。
実行する監査を特定のカテゴリや特定の監査セットに限定できます。

```js
const flags = {onlyCategories: ['performance']};
await lighthouse(url, flags);
```

独自の設定（例: [experimental-config.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/experimental-config.js)）を作ってカスタム実行することもできます。[基本的なカスタム監査のレシピ](https://github.com/GoogleChrome/lighthouse/tree/main/docs/recipes/custom-audit)もご覧ください。

### CLI フラグとの違い

一部のフラグ機能は CLI でのみ利用できることに注意してください。Node と CLI の両方で動く共有フラグの一覧は[型定義](https://github.com/GoogleChrome/lighthouse/blob/main/types/lhr/settings.d.ts#:~:text=interface%20SharedFlagsSettings)にあります。多くの場合、Node モジュールにその機能がないのは、自分でやる方が簡単で柔軟だからです。

| CLI フラグ | Node での違い |
| - | - |
| `port` | 使うポートを指定するだけで、Chrome は起動されません。 |
| `chromeFlags` | 無視されます。Chrome は起動されません。 |
| `outputPath` | 無視されます。出力は `.report` プロパティで文字列として返されます。 |
| `saveAssets` | 無視されます。成果物は `.artifacts` プロパティで返されます。 |
| `view` | 無視されます。この機能が必要な場合は npm モジュール `open` を使ってください。 |
| `enableErrorReporting` | 無視されます。Node ではエラー報告は常に無効です。 |
| `listAllAudits` | 無視されます。プログラム利用では無関係です。 |
| `listTraceCategories` | 無視されます。プログラム利用では無関係です。 |
| `configPath` | 無視されます。設定は `lighthouse` の第 3 引数で渡してください。 |
| `preset` | 無視されます。設定は `lighthouse` の第 3 引数で渡してください。 |
| `verbose` | 無視されます。代わりに `logLevel` を使ってください。 |
| `quiet` | 無視されます。代わりに `logLevel` を使ってください。 |

### ログを有効にする

Lighthouse の実行中にログ出力を見たい場合は、コードで適切なログレベルを設定し、
`lighthouse` の呼び出し時に `logLevel` フラグを渡してください。

```javascript
const flags = {logLevel: 'info'};
await lighthouse('https://example.com', flags);
```

## 設定
Lighthouse の設定をプログラムから拡張するには、設定オブジェクトを第 3 引数で渡します。省略するとデフォルト設定が使われます。

**例:**
```js
{
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'speed-index',
      'interactive',
    ],
  },
}
```

[lighthouse:default](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js) の基本設定を拡張することも、完全な制御のために独自の設定を一から構築することもできます。

渡せる設定の種類の詳細は [Lighthouse の設定](https://github.com/GoogleChrome/lighthouse/blob/main/docs/configuration.md)をご覧ください。

## 認証付きサイトのテスト

`npm i -g lighthouse` または `yarn global add lighthouse` でグローバルにインストールすると、
`chrome-debug` が `PATH` に追加されます。このバイナリは、
デバッグ用ポートを開いたスタンドアロンの Chrome インスタンスを起動します。

1. `chrome-debug` を実行します。Chrome インスタンスのデバッグポートがログに出力されます
1. サイトに移動してログインします。
1. 別のターミナルタブで、chrome-debug のポート番号を使って `lighthouse http://mysite.com --port port-number` を実行します。

## 信頼できない証明書のサイトのテスト

信頼できない証明書のサイトをテストすると、Chrome はページを読み込めないため、Lighthouse レポートはほぼエラーになります。

この証明書が**自分で管理していて**開発に必要な場合（たとえばローカル HTTP/2 テスト用の自己署名証明書の `localhost` など)は、_証明書をローカルの信頼できる証明書ストアに追加すること_をお勧めします。Chrome では `設定` > `プライバシーとセキュリティ` > `証明書の管理` を参照するか、お使いの OS の証明書ストアへの追加手順をご確認ください。

あるいは、Lighthouse CLI フラグ `--chrome-flags="--ignore-certificate-errors"` を追加して Chrome に無効な証明書を無視させることもできます。ただし、このフラグは TLS を無効にしてウェブを閲覧するのと同等であるため、細心の注意が必要です。テストページが読み込むあらゆるコンテンツ（サードパーティのスクリプトや iframe 広告など）も*同様に*証明書チェックの対象外となり、[中間者（MitM）攻撃の余地を開きます](https://www.chromium.org/Home/chromium-security/education/tls#TOC-What-security-properties-does-TLS-give-me-)。これらの理由から、前述の証明書をローカル証明書ストアに追加する方法をお勧めします。

## モバイルデバイスでのテスト

Lighthouse は実機のモバイルデバイスに対して実行できます。[Android でのリモートデバッグ（レガシー ワークフロー）](https://developer.chrome.com/devtools/docs/remote-debugging-legacy)に従ってステップ 3.3 まで進めてください。要点は、adb をインストールして実行し、USB デバッグを有効にし、デバイスの 9222 ポートを Lighthouse があるマシンに転送することです。

追加のエミュレーションを無効にするには、CLI フラグ `--screenEmulation.disabled --throttling.cpuSlowdownMultiplier=1 --throttling-method=provided` を使うのが一般的です。

```sh
$ adb kill-server

$ adb devices -l
* daemon not running. starting it now on port 5037 *
* daemon started successfully *
00a2fd8b1e631fcb       device usb:335682009X product:bullhead model:Nexus_5X device:bullhead

$ adb forward tcp:9222 localabstract:chrome_devtools_remote

$ lighthouse --port=9222 --screenEmulation.disabled --throttling.cpuSlowdownMultiplier=1 --throttling-method=provided https://example.com
```

## トレースプロセッサとしての Lighthouse

Lighthouse は、他のツール（WebPageTest や ChromeDriver など）が収集したトレースとパフォーマンスデータの分析にも使えます。`Trace` と `DevtoolsLog` の成果物項目は、それぞれ `.trace.json` と `.devtoolslog.json` の拡張子で保存されていれば、ディスク上の絶対パスの文字列で渡せます。`DevtoolsLog` 配列は `Network` と `Page` ドメインから取得されます（ChromeDriver の [enableNetwork と enablePage オプション](https://sites.google.com/a/chromium.org/chromedriver/capabilities#TOC-perfLoggingPrefs-object)と同様）。

例として、ユーザータイミングとクリティカルリクエストチェーンを報告する、トレースのみの実行を示します：

### `config.json`

```json
{
  "settings": {
    "auditMode": "/User/me/lighthouse/core/test/fixtures/artifacts/perflog/",
  },
  "audits": [
    "user-timings",
    "critical-request-chains"
  ],
  "categories": {
    "performance": {
      "name": "Performance Metrics",
      "description": "These encapsulate your web app's performance.",
      "audits": [
        {"id": "user-timings", "weight": 1},
        {"id": "critical-request-chains", "weight": 1}
      ]
    }
  }
}
```

次のように実行します：`lighthouse --config-path=config.json http://www.random.url`
