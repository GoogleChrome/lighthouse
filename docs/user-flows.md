# User Flows in Lighthouse

Historically, Lighthouse has analyzed the cold pageload of a page. Starting in 2022 (Lighthouse v10), it can analyze and report on the entire page lifecycle via "user flows".

#### You might be interested in flows if…

* … you want to run Lighthouse on your whole webapp, not just the landing page.
* … you want to know if all parts of the web experience are accessible (e.g. a checkout process).
* … you want to know the Cumulative Layout Shift of my SPA page transition

In these cases, you want Lighthouse on a _flow_, not just a page load.

## The three modes: Navigation, Timespan, Snapshot

Lighthouse can now run in three modes: navigations, timespans, and snapshots. Each mode has its own unique use cases, benefits, and limitations. Later, you'll create a flow by combining these three core report types.

* **Navigation mode** analyzes a single page load. It should feel familiar as all Lighthouse runs prior to v9.6.0 were essentially in this mode. Even in v9.6.0 and onwards, it remains the default.
* **Timespan mode** analyzes an arbitrary period of time, typically containing user interactions.
* **Snapshot mode** analyzes the page in a particular state.

| | |
|:---:|---|
| Navigation <br> <img src="https://user-images.githubusercontent.com/39191/170560057-4f7cab97-ee6b-497f-8e18-1f84ba3616dd.png" height="96" width="141">  | **Use Cases** <br>  ✅ Obtain a Lighthouse Performance score and all performance metrics.<br>✅ Assess Progressive Web App capabilities.<br>✅ Analyze accessibility immediately after page load.<br><br> **Limitations** <br>  🤔 Cannot analyze form submissions or single page app transitions.<br>🤔 Cannot analyze content that isn't available immediately on page load. |
| Timespan <br> <img src="https://user-images.githubusercontent.com/39191/170560055-fb599418-c94d-44bf-9921-be4dce6abccf.png" height="96" width="141">  | **Use Cases** <br> ✅ Measure layout shifts and JavaScript execution time over a timerange including interactions.<br>✅ Discover performance opportunities to improve the experience for long-lived pages and SPAs.<br><br> **Limitations** <br>  🤔 Does not provide an overall performance score.<br>🤔 Cannot analyze moment-based performance metrics (e.g. Largest Contentful Paint).<br>🤔 Cannot analyze state-of-the-page issues (e.g. no Accessibility category) |
| Snapshot <br> <img src="https://user-images.githubusercontent.com/39191/170560049-a6b630a2-187a-4233-9f8b-8d7fb276f51e.png" height="96" width="141">  | **Use Cases** <br> ✅ Analyze the page in its current state.<br> ✅ Find accessibility issues deep within SPAs or complex forms.<br>✅ Evaluate best practices of menus and UI elements hidden behind interaction.<br><br> **Limitations** <br>  🤔 Does not provide an overall performance score or metrics.<br>🤔 Cannot analyze any issues outside the current DOM (e.g. no network, main-thread, or performance analysis). |


### Navigation mode

 <img src="https://user-images.githubusercontent.com/39191/170560057-4f7cab97-ee6b-497f-8e18-1f84ba3616dd.png">

In DevTools, navigation is easy: ensure it's the selected mode and then click _Analyze page load_.

![navdt](https://user-images.githubusercontent.com/39191/168929174-11311144-ce9b-4124-9a52-0423a073b9fe.png)

> Note: DevTools only generates a report for a standalone navigation. To combine it with other steps for a multi-step user flow report, [use the Node API](#creating-a-flow).

#### Navigations in the Node.js API

```js
import {writeFileSync} from 'fs';
import puppeteer from 'puppeteer';
import {startFlow} from 'lighthouse';

const browser = await puppeteer.launch();
const page = await browser.newPage();
const flow = await startFlow(page);

// Navigate with a URL
await flow.navigate('https://example.com');

// Interaction-initiated navigation via a callback function
await flow.navigate(async () => {
  await page.click('a.link');
});

// Navigate with startNavigation/endNavigation
await flow.startNavigation();
await page.click('a.link');
await flow.endNavigation();

await browser.close();
writeFileSync('report.html', await flow.generateReport());
```
</details>
<br>

##### Triggering a navigation via user interactions

Instead of providing a URL to navigate to, you can provide a callback function or use `startNavigation`/`endNavigation`, as seen above. This is useful when you want to audit a navigation that's initiated by a scenario like a button click or form submission.

> Aside: Lighthouse typically clears out any active Service Worker and Cache Storage for the origin under test. However, in this case, as it doesn't know the URL being analyzed, Lighthouse cannot clear this storage. This generally reflects the real user experience, but if you still wish to clear the Service Workers and Cache Storage you must do it manually.

This callback function _must_ perform an action that will trigger a navigation. Any interactions completed before the callback promise resolves will be captured by the navigation.

The `startNavigation`/`endNavigation` functions _must_ surround an action that triggers a navigation. Any interactions completed after `startNavigation` is invoked and before `endNavigation` is invoked will be captured by the navigation.

### Timespan

<img src="https://user-images.githubusercontent.com/39191/170560055-fb599418-c94d-44bf-9921-be4dce6abccf.png">

In DevTools, select "Timespan" as the mode and click _Start timespan_. Record whatever timerange or interactions is desired and then click _End timespan_.

![timespandt](https://user-images.githubusercontent.com/39191/168929168-ac45d198-f609-4acb-86a7-51775578c8e0.png)

#### Timespans in the Node.js API

```js
import {writeFileSync} from 'fs';
import puppeteer from 'puppeteer';
import {startFlow} from 'lighthouse';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://secret.login');
const flow = await startFlow(page);

await flow.startTimespan();
await page.type('#password', 'L1ghth0useR0cks!');
await page.click('#login');
await page.waitForSelector('#dashboard');
await flow.endTimespan();

await browser.close();
writeFileSync('report.html', await flow.generateReport());
```
</details>
<br>

### Snapshot

<img src="https://user-images.githubusercontent.com/39191/170560049-a6b630a2-187a-4233-9f8b-8d7fb276f51e.png">

In DevTools, select "Snapshot" as the mode. Set up the page in the state you want to evaluate. Then, click _Analyze page state_.

![snapshotdt](https://user-images.githubusercontent.com/39191/168929172-92a70108-a053-4dda-b719-2900b9d3d956.png)

#### Snapshots in the Node.js API


```js
import {writeFileSync} from 'fs';
import puppeteer from 'puppeteer';
import {startFlow} from 'lighthouse';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
const flow = await startFlow(page);

await page.click('#expand-sidebar');
await flow.snapshot();

await browser.close();
writeFileSync('report.html', await flow.generateReport());
```
</details>
<br>

## Creating a Flow

<img src="https://user-images.githubusercontent.com/39191/170560932-f10c8465-de49-4e75-be6c-1cf408cf84f6.png" height=240>


So far we've seen individual Lighthouse modes in action. The true power of flows comes from combining these building blocks into a comprehensive flow to capture the user's entire experience. Analyzing a multi-step user flow is currently only available [using the Lighthouse Node API along with Puppeteer](https://web.dev/articles/lighthouse-user-flows).

When mapping a user flow onto the Lighthouse modes, strive for each report to have a narrow focus. This will make debugging much easier when you have issues to fix!

--------

The below example codifies a user flow for an ecommerce site where the user navigates to the homepage, searches for a product, and clicks on the detail link.

<img alt="Lighthouse User Flows Diagram" src="https://user-images.githubusercontent.com/39191/168932574-944757d8-d110-4777-a01f-0ec27d65719a.png" height="550">

### Complete user Flow Code

```js
import puppeteer from 'puppeteer';
import {startFlow} from 'lighthouse';
import {writeFileSync} from 'fs';

// Setup the browser and Lighthouse.
const browser = await puppeteer.launch();
const page = await browser.newPage();
const flow = await startFlow(page);

// Phase 1 - Navigate to the landing page.
await flow.navigate('https://web.dev/');

// Phase 2 - Interact with the page and submit the search form.
await flow.startTimespan();

await page.click('button[search-open]');
const searchBox = await page.waitForSelector('devsite-search[search-active] input');
await searchBox.type('CLS');
await searchBox.press('Enter');

// Ensure search results have rendered before moving on.
const link = await page.waitForSelector('devsite-content a[href="https://web.dev/articles/cls"]');

await flow.endTimespan();

// Phase 3 - Analyze the new state.
await flow.snapshot();

// Phase 4 - Navigate to the article.
await flow.navigate(async () => {
  await link.click();
});

// Get the comprehensive flow report.
writeFileSync('report.html', await flow.generateReport());
// Save results as JSON.
writeFileSync('flow-result.json', JSON.stringify(await flow.createFlowResult(), null, 2));

// Cleanup.
await browser.close();
```

As this flow has multiple steps, the flow report summarizes everything and allows you to investigate each aspect in more detail.

![Full flow report screenshot](https://user-images.githubusercontent.com/39191/168932301-cfdbe812-db96-4c6d-b43b-fe5c31f9d192.png)

### Creating a desktop user flow

If you want to test the desktop version of a page with user flows, you can use the desktop config provided in the Lighthouse package, which includes desktop scoring and viewport/performance emulation.

```js
import puppeteer from 'puppeteer';
import {startFlow, desktopConfig} from 'lighthouse';

const browser = await puppeteer.launch();
const page = await browser.newPage();

const flow = await startFlow(page, {
  config: desktopConfig,
});

await flow.navigate('https://example.com');
```

### Using Puppeteer's emulation settings in a user flow

If you want to inherit the viewport settings set up by Puppeteer, you need to disable Lighthouse's viewport emulation in the `flags` option.

If Puppeteer is emulating a desktop page make sure to use the `desktopConfig` so Lighthouse still scores the results as a desktop page.

```js
import puppeteer from 'puppeteer';
import {startFlow, desktopConfig} from 'lighthouse';

const browser = await puppeteer.launch();
const page = await browser.newPage();

const flow = await startFlow(page, {
  // Puppeteer is emulating a desktop environment,
  // so we should still use the desktop config.
  //
  // If Puppeteer is emulating a mobile device then we can remove the next line.
  config: desktopConfig,
  // `flags` will override the Lighthouse emulation settings
  // to prevent Lighthouse from changing the screen dimensions.
  flags: {screenEmulation: {disabled: true}},
});

await page.setViewport({width: 1000, height: 500});

await flow.navigate('https://example.com');
```

## Tips and Tricks

- Keep timespan recordings _short_ and focused on a single interaction sequence or page transition.
- Always audit page navigations with navigation mode, avoid auditing hard page navigations with timespan mode.
- Use snapshot recordings when a substantial portion of the page content has changed.
- Always wait for transitions and interactions to finish before ending a timespan. The puppeteer APIs `page.waitForSelector`/`page.waitForFunction`/`page.waitForResponse`/`page.waitForTimeout` are your friends here.

## Related Reading

- [User Flows Issue](https://github.com/GoogleChrome/lighthouse/issues/11313)
- [User Flows Design Document](https://docs.google.com/document/d/1fRCh_NVK82YmIi1Zq8y73_p79d-FdnKsvaxMy0xIpNw/edit#heading=h.b84um9ao7pg7)
- [User Flows Timeline Diagram](https://docs.google.com/drawings/d/1jr9smqqSPsLkzZDEyFj6bvLFqi2OUp7_NxqBnqkT4Es/edit?usp=sharing)
- [User Flows Decision Tree Diagram](https://whimsical.com/lighthouse-flows-decision-tree-9qPyfx4syirwRFH7zdUw8c)
