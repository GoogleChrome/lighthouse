[English](readme.md) | **繁體中文** | [日本語](readme.ja.md)

本目錄收錄了實用的文件與範例（請繼續往下讀），
以及協助您快速上手的[實作範例](./recipes/)。如需 Lighthouse 內部運作的概覽，
請參閱 [Lighthouse 架構](architecture.md)。

> [!NOTE]
> 其餘深入的開發者文件目前為英文。主要入口請見 [Lighthouse README](../readme.zh-TW.md)。

## 以程式設計方式使用

以下範例示範如何以 Node 模組的方式、透過程式設計執行 Lighthouse。這裡假設您已將 Lighthouse 安裝為相依項目（`yarn add --dev lighthouse`）。

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

### 僅限效能的 Lighthouse 執行

許多使用 Lighthouse 的模組只關心效能數字。
您可以將執行的審查限制在特定類別或特定的一組審查。

```js
const flags = {onlyCategories: ['performance']};
await lighthouse(url, flags);
```

您也可以撰寫自己的設定（例如 [experimental-config.js](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/experimental-config.js)）以進行自訂執行。另請參閱[基礎自訂審查實作範例](https://github.com/GoogleChrome/lighthouse/tree/main/docs/recipes/custom-audit)。

### 與 CLI 旗標的差異

請注意，部分旗標功能只有 CLI 才提供。Node 與 CLI 共用的旗標清單請見[我們的型別定義](https://github.com/GoogleChrome/lighthouse/blob/main/types/lhr/settings.d.ts#:~:text=interface%20SharedFlagsSettings)。多數情況下，Node 模組不提供該功能，只是因為您自行實作會更簡單也更有彈性。

| CLI 旗標 | 在 Node 中的差異 |
| - | - |
| `port` | 只指定要使用的埠號，不會替您啟動 Chrome。 |
| `chromeFlags` | 忽略，不會替您啟動 Chrome。 |
| `outputPath` | 忽略，輸出以字串形式回傳於 `.report` 屬性。 |
| `saveAssets` | 忽略，產物以 `.artifacts` 屬性回傳。 |
| `view` | 忽略，如需此功能請使用 `open` npm 模組。 |
| `enableErrorReporting` | 忽略，Node 環境一律停用錯誤回報。 |
| `listAllAudits` | 忽略，與程式化使用無關。 |
| `listTraceCategories` | 忽略，與程式化使用無關。 |
| `configPath` | 忽略，請將設定作為 `lighthouse` 的第 3 個引數傳入。 |
| `preset` | 忽略，請將設定作為 `lighthouse` 的第 3 個引數傳入。 |
| `verbose` | 忽略，請改用 `logLevel`。 |
| `quiet` | 忽略，請改用 `logLevel`。 |

### 開啟記錄

如想在 Lighthouse 執行時看到記錄輸出，請在程式碼中設定適當的記錄等級，
並在呼叫 `lighthouse` 時傳入 `logLevel` 旗標。

```javascript
const flags = {logLevel: 'info'};
await lighthouse('https://example.com', flags);
```

## 設定
如要透過程式設計擴充 Lighthouse 設定，需要將設定物件作為第 3 個引數傳入。若省略，則使用預設設定。

**範例：**
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

您可以擴充 [lighthouse:default](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js) 的基礎設定，也可以從頭打造自己的設定以取得完全的控制權。

如需更多可提供設定類型的資訊，請參閱 [Lighthouse 設定](https://github.com/GoogleChrome/lighthouse/blob/main/docs/configuration.md)。

## 測試需要登入的網站

透過 `npm i -g lighthouse` 或 `yarn global add lighthouse` 全域安裝後，
`chrome-debug` 會被加入您的 `PATH`。這個執行檔會啟動一個獨立的 Chrome
執行個體，並開啟偵錯埠。

1. 執行 `chrome-debug`。它會記錄您 Chrome 執行個體的偵錯埠
1. 前往您的網站並登入。
1. 在另一個終端機分頁，使用 chrome-debug 提供的埠號執行 `lighthouse http://mysite.com --port port-number`。

## 測試不受信任憑證的網站

測試使用不受信任憑證的網站時，Chrome 將無法載入頁面，因此 Lighthouse 報表幾乎都會是錯誤。

如果這張憑證**是由您控制**且開發所需（例如用於本機 HTTP/2 測試、使用自我簽章憑證的 `localhost`），我們建議您_將憑證加入本機受信任的憑證存放區_。在 Chrome 中請見 `設定` > `隱私權和安全性` > `管理憑證`，或參考您的作業系統將憑證加入存放區的說明。

另外，您也可以透過加入 Lighthouse CLI 旗標 `--chrome-flags="--ignore-certificate-errors"` 指示 Chrome 忽略無效憑證。但使用此旗標務必謹慎，因為它等同於在停用 TLS 的情況下上網。測試頁面載入的任何內容（例如第三方腳本或 iframe 廣告）*同樣*不會經過憑證檢查，[進而開啟中間人（MitM）攻擊的途徑](https://www.chromium.org/Home/chromium-security/education/tls#TOC-What-security-properties-does-TLS-give-me-)。基於這些理由，我們建議採用前述將憑證加入本機憑證存放區的方案。

## 在行動裝置上測試

Lighthouse 可以對真實的行動裝置執行。您可以按照[Android 上的遠端偵錯（舊版工作流程）](https://developer.chrome.com/devtools/docs/remote-debugging-legacy)進行到步驟 3.3；重點是安裝並執行 adb、啟用 USB 偵錯，然後將裝置的 9222 埠轉發到安裝 Lighthouse 的機器。

您多半會想使用 CLI 旗標 `--screenEmulation.disabled --throttling.cpuSlowdownMultiplier=1 --throttling-method=provided` 關閉額外的模擬。

```sh
$ adb kill-server

$ adb devices -l
* daemon not running. starting it now on port 5037 *
* daemon started successfully *
00a2fd8b1e631fcb       device usb:335682009X product:bullhead model:Nexus_5X device:bullhead

$ adb forward tcp:9222 localabstract:chrome_devtools_remote

$ lighthouse --port=9222 --screenEmulation.disabled --throttling.cpuSlowdownMultiplier=1 --throttling-method=provided https://example.com
```

## 作為追蹤處理器的 Lighthouse

Lighthouse 可用來分析其他工具（例如 WebPageTest 與 ChromeDriver）收集的追蹤與效能資料。`Trace` 與 `DevtoolsLog` 產物項目可以使用磁碟上的絕對路徑字串提供，只要它們分別以 `.trace.json` 與 `.devtoolslog.json` 副檔名保存即可。`DevtoolsLog` 陣列是從 `Network` 與 `Page` 網域擷取的（如同 ChromeDriver 的 [enableNetwork 與 enablePage 選項](https://sites.google.com/a/chromium.org/chromedriver/capabilities#TOC-perfLoggingPrefs-object)）。

以下範例是一個只使用追蹤資料的執行，報告使用者時間與關鍵請求鏈：

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

接著執行：`lighthouse --config-path=config.json http://www.random.url`
