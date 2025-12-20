# Using Puppeteer with Lighthouse

### Option 1: Launch Chrome with Puppeteer and handoff to Lighthouse

The example below shows how to inject CSS into the page before Lighthouse audits the page.
A similar approach can be taken for injecting JavaScript.

```js
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const {URL} = require('url');

(async() => {
const url = 'https://www.chromestatus.com/features';

// Use Puppeteer to launch headful Chrome and don't use its default 800x600 viewport.
const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
});

// Wait for Lighthouse to open url, then customize network conditions.
// Note: this will re-establish these conditions when LH reloads the page. Think that's ok....
browser.on('targetchanged', async target => {
  const page = await target.page();

  function addStyleContent(content) {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(content));
    document.head.appendChild(style);
  }

  const css = '* {color: red}';

  if (page && page.url() === url) {
    // Note: can't use page.addStyleTag due to github.com/GoogleChrome/puppeteer/issues/1955.
    // Do it ourselves.
    const client = await page.target().createCDPSession();
    await client.send('Runtime.evaluate', {
      expression: `(${addStyleContent.toString()})('${css}')`
    });
  }
});

// Lighthouse will open URL. Puppeteer observes `targetchanged` and sets up network conditions.
// Possible race condition.
const {lhr} = await lighthouse(url, {
  port: (new URL(browser.wsEndpoint())).port,
  output: 'json',
  logLevel: 'info',
});

console.log(`Lighthouse scores: ${Object.values(lhr.categories).map(c => c.score).join(', ')}`);

await browser.close();
})();
```

### Option 2: Launch Chrome with Lighthouse/chrome-launcher and handoff to Puppeteer

When using Lighthouse programmatically, you'll often use chrome-launcher to launch Chrome.
Puppeteer can reconnect to this existing browser instance like so:

```js
const chromeLauncher = require('chrome-launcher');
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const request = require('request');
const util = require('util');

(async() => {

const URL = 'https://www.chromestatus.com/features';

const opts = {
  //chromeFlags: ['--headless'],
  logLevel: 'info',
  output: 'json'
};

// Launch chrome using chrome-launcher.
const chrome = await chromeLauncher.launch(opts);
opts.port = chrome.port;

// Connect to it using puppeteer.connect().
const resp = await util.promisify(request)(`http://localhost:${opts.port}/json/version`);
const {webSocketDebuggerUrl} = JSON.parse(resp.body);
const browser = await puppeteer.connect({browserWSEndpoint: webSocketDebuggerUrl});

// Run Lighthouse.
const {lhr}  = await lighthouse(URL, opts, null);
console.log(`Lighthouse scores: ${Object.values(lhr.categories).map(c => c.score).join(', ')}`);

await browser.disconnect();
await chrome.kill();

})();
```

### [Using Puppeteer in a custom gatherer](https://github.com/GoogleChrome/lighthouse/tree/master/docs/recipes/custom-gatherer-puppeteer)


--------------

**Note**: https://github.com/GoogleChrome/lighthouse/issues/3837 tracks the overall discussion for making Lighthouse work in concert with Puppeteer. Some things, like A/B testing the perf of UI changes, are tricky or not yet possible.
