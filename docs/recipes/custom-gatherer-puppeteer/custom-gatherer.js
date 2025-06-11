/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global document */

import {Gatherer} from 'lighthouse';

class CustomGatherer extends Gatherer {
  meta = {
    supportedModes: ['navigation', 'timespan', 'snapshot'],
  };

  async getArtifact(context) {
    const {driver, page} = context;
    const {executionContext} = driver;

    // Inject an input field for our debugging pleasure.
    function makeInput() {
      const el = document.createElement('input');
      el.type = 'number';
      document.body.append(el);
    }
    await executionContext.evaluate(makeInput, {args: []});
    await new Promise(resolve => setTimeout(resolve, 100));

    // Prove that `driver` (Lighthouse) and `page` (Puppeteer) are talking to the same page.
    await executionContext.evaluateAsync(`document.querySelector('input').value = '1'`);
    await page.type('input', '23', {delay: 300});
    const value = await executionContext.evaluateAsync(`document.querySelector('input').value`);
    if (value !== '123') throw new Error('huh?');

    return {value};
  }
}

export default CustomGatherer;
