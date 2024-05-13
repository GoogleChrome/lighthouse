# Using Puppeteer with Lighthouse

## Recipes

### [Using Puppeteer for authenticated pages](./recipes/auth/README.md)

### [Using Puppeteer in a custom gatherer](https://github.com/GoogleChrome/lighthouse/tree/main/docs/recipes/custom-gatherer-puppeteer)

## General Process

### Option 1: Launch Chrome with Puppeteer and handoff to Lighthouse

The example below shows how to inject CSS into the page before Lighthouse audits the page.
A similar approach can be taken for injecting JavaScript.

```js
import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';

const url = 'https://chromestatus.com/features';

// Use Puppeteer to launch headless Chrome
// - Omit `--enable-automation` (See https://github.com/GoogleChrome/lighthouse/issues/12988)
// - Don't use 800x600 default viewport
const browser = await puppeteer.launch({
  // Set to false if you want to see the script in action.
  headless: 'new',
  defaultViewport: null,
  ignoreDefaultArgs: ['--enable-automation']
});
const page = await browser.newPage();

// Wait for Lighthouse to open url, then inject our stylesheet.
browser.on('targetchanged', async target => {
  if (page && page.url() === url) {
    await page.addStyleTag({content: '* {color: red}'});
  }
});

// Lighthouse will open the URL.
// Puppeteer will observe `targetchanged` and inject our stylesheet.
const {lhr} = await lighthouse(url, undefined, undefined, page);

console.log(`Lighthouse scores: ${Object.values(lhr.categories).map(c => c.score).join(', ')}`);

await browser.close();
```

### Option 2: Launch Chrome with Lighthouse/chrome-launcher and handoff to Puppeteer

When using Lighthouse programmatically, you'll often use chrome-launcher to launch Chrome.
Puppeteer can reconnect to this existing browser instance like so:

```js
import chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import fetch from 'node-fetch';

const url = 'https://chromestatus.com/features';

// Launch chrome using chrome-launcher.
const chrome = await chromeLauncher.launch();

// Connect to it using puppeteer.connect().
const resp = await fetch(`http://localhost:${chrome.port}/json/version`);
const {webSocketDebuggerUrl} = await resp.json();
const browser = await puppeteer.connect({browserWSEndpoint: webSocketDebuggerUrl});
const page = await browser.newPage();

// Run Lighthouse.
const {lhr}  = await lighthouse(url, undefined, undefined, page);
console.log(`Lighthouse scores: ${Object.values(lhr.categories).map(c => c.score).join(', ')}`);

await browser.disconnect();
chrome.kill();
```
