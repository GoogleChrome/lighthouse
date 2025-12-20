/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('lighthouse').Gatherer;

/**
 * @fileoverview Extracts `window.myLoadMetrics` from the test page.
 */

class TimeToSearchable extends Gatherer {
  afterPass(options) {
    const driver = options.driver;

    return driver.evaluateAsync('window.myLoadMetrics')
      // Ensure returned value is what we expect.
      .then(loadMetrics => {
        if (!loadMetrics || loadMetrics.searchableTime === undefined) {
          // Throw if page didn't provide the metrics we expect. This isn't
          // fatal -- the Lighthouse run will continue, but any audits that
          // depend on this gatherer will show this error string in the report.
          throw new Error('Unable to find load metrics in page');
        }
        return loadMetrics;
      });
  }
}

module.exports = TimeToSearchable;
