/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @fileoverview This file exercises two LH reports within the same DOM. */

/** @typedef {import('../clients/bundle.js')} lighthouseRenderer */
/** @type {lighthouseRenderer} */
// @ts-expect-error
const lighthouseRenderer = window['report'];

const wait = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

(async function __initPsiReports__() {
  document.querySelector('button#reanalyze')?.addEventListener('click', () => {
    __initPsiReports__();
  });

  document.querySelector('button#translate')?.addEventListener('click', async () => {
    const hash = location.hash.slice(1);
    const someLocales = ['es', 'ja', 'ru', 'ar', 'en-US'];
    // Just rotate to the next one
    const nextLocale = someLocales[(someLocales.indexOf(hash) + 1) % someLocales.length];
    location.hash = `#${nextLocale}`;
    location.reload();
  });

  const hash = location.hash.slice(1);
  if (hash) {
    // @ts-expect-error Can't do string to LH.Locale
    await swapLhrLocale(hash);
  }

  // We deliberately want the non-blocking await behavior w/ forEach
  ['mobile', 'desktop'].forEach(async id => {
    const container = document.querySelector(`section#${id} .reportContainer`);
    if (!container) throw new Error('Unexpected DOM. Bailing.');
    container.textContent = 'Analyzing…';
    await wait(id === 'desktop' ? 3000 : 500);

    // @ts-expect-error
    const lhr = JSON.parse(JSON.stringify(window.__LIGHTHOUSE_JSON__));
    await distinguishLHR(lhr, id);

    renderLHReport(lhr, container);
  });
})();

/**
 * @param {any} lhr
 * @param {Element} container
 */
async function renderLHReport(lhr, container) {
  try {
    for (const el of container.childNodes) el.remove();

    const reportRootEl = lighthouseRenderer.renderReport(lhr, {
      omitTopbar: true,
      disableFireworks: true,
      disableDarkMode: true,
    });
    // TODO: display warnings if appropriate.
    for (const el of reportRootEl.querySelectorAll('.lh-warnings--toplevel')) {
      el.setAttribute('hidden', 'true');
    }

    // Move env block
    const metaItemsEl = reportRootEl.querySelector('.lh-meta__items');
    if (metaItemsEl) {
      reportRootEl.querySelector('.lh-metrics-container')?.parentNode?.insertBefore(
        metaItemsEl,
        reportRootEl.querySelector('.lh-buttons')
      );
      reportRootEl.querySelector('.lh-metrics-container')?.closest('.lh-category')?.classList
          .add('lh--hoisted-meta');
    }

    container.append(reportRootEl);

    // Override some LH styles. (To find .lh-vars we must descend from reportRootEl's parent)
    for (const el of container.querySelectorAll('article.lh-vars')) {
      // Ensure these css var names are not stale.
      el.style.setProperty('--report-content-max-width', '100%');
      el.style.setProperty('--edge-gap-padding', '0');
    }
    for (const el of reportRootEl.querySelectorAll('footer.lh-footer')) {
      el.style.display = 'none';
    }
  } catch (e) {
    console.error(e);
    container.textContent = 'Error: LHR failed to render.';
  }
}

/**
 * @param {LH.Locale} locale
 */
async function swapLhrLocale(locale) {
  // @ts-expect-error LHR global
  const lhrLocale = window.__LIGHTHOUSE_JSON__['configSettings']['locale'];

  // Only fetch and swapLocale if necessary.
  if (lhrLocale === locale) return;

  if (!lighthouseRenderer.format.hasLocale(locale)) {
    // Requires running a server in LH root and viewing localhost:XXXX/dist/sample-reports/⌣.psi.english/index.html
    const response = await fetch(`/shared/localization/locales/${locale}.json`);
    /** @type {import('../../shared/localization/locales').LhlMessages} */
    const lhlMessages = await response.json();
    if (!lhlMessages) throw new Error(`could not fetch data for locale: ${locale}`);
    lighthouseRenderer.format.registerLocaleData(locale, lhlMessages);
  }
  // @ts-expect-error LHR global
  window.__LIGHTHOUSE_JSON__ = lighthouseRenderer.swapLocale(window.__LIGHTHOUSE_JSON__, locale)
    .lhr;
}


/**
 * Tweak the LHR to make the desktop and mobile reports easier to identify.
 * Adjusted: Perf category name and score, and emoji placed on top of key screenshots.
 * @param {LH.Result} lhr
 * @param {string} tabId
 */
async function distinguishLHR(lhr, tabId) {
  if (tabId === 'desktop') {
    lhr.categories.performance.score = 0.81;
  }

  const finalSSDetails = lhr.audits['final-screenshot']?.details;
  if (finalSSDetails && finalSSDetails.type === 'screenshot') {
    finalSSDetails.data = await decorateScreenshot(finalSSDetails.data, tabId);
  }

  if (lhr.fullPageScreenshot) {
    lhr.fullPageScreenshot.screenshot.data =
      await decorateScreenshot(lhr.fullPageScreenshot.screenshot.data, tabId);
  }
}

/**
 * Add 📱 and 💻 emoji on top of screenshot
 * @param {string} datauri
 * @param {string} tabId
 */
async function decorateScreenshot(datauri, tabId) {
  const img = document.createElement('img');

  await new Promise((resolve, reject) => {
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.src = datauri;
  });
  const c = document.createElement('canvas');
  c.width = tabId === 'desktop' ? 280 : img.width;
  c.height = tabId === 'desktop' ? 194 : img.height;

  const ctx = c.getContext('2d');
  if (!ctx) throw new Error();
  ctx.drawImage(img, 0, 0, c.width, c.height);
  ctx.font = `${c.width / 2}px serif`;
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.7;
  ctx.fillText(tabId === 'mobile' ? '📱' : '💻', c.width / 2, Math.min(c.height / 2, 700));
  return c.toDataURL();
}
