/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global document */

const Gatherer = require('lighthouse').Gatherer;
const Puppeteer = require('puppeteer-core');

async function connect(driver) {
  const browser = await Puppeteer.connect({
    browserWSEndpoint: await driver.wsEndpoint(),
    defaultViewport: null,
  });
  const {targetInfo} = await driver.sendCommand('Target.getTargetInfo');
  const puppeteerTarget = (await browser.targets())
    .find(target => target._targetId === targetInfo.targetId);
  const page = await puppeteerTarget.page();
  return {browser, page};
}

class CustomGatherer extends Gatherer {
  async afterPass(options) {
    const {driver} = options;
    const {page} = await connect(driver);

    // Inject an input field for our debugging pleasure.
    function makeInput() {
      const el = document.createElement('input');
      el.type = 'number';
      document.body.append(el);
    }
    await driver.evaluateAsync(`(${makeInput})()`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Prove that `driver` (Lighthouse) and `page` (Puppeteer) are talking to the same page.
    await driver.evaluateAsync(`document.querySelector('input').value = '1'`);
    await page.type('input', '23', {delay: 300});
    const value = await driver.evaluateAsync(`document.querySelector('input').value`);
    if (value !== '123') throw new Error('huh?');

    // No need to close the browser or page. Puppeteer doesn't own either of them.

    return {value};
  }
}

module.exports = CustomGatherer;
