/**
 * @license Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

import {LH_ROOT} from '../../../../shared/root.js';

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: ['unused-javascript'],
  },
};

const mapJson =
  fs.readFileSync(`${LH_ROOT}/cli/test/fixtures/source-map/script.js.map`, 'utf-8');
const map = JSON.parse(mapJson);

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse values for source map artifacts.
 *
 * We have experienced timeouts in the past when fetching source maps.
 * We should verify the timing issue in Chromium if this gets flaky.
 */
const expectations = {
  artifacts: {
    SourceMaps: [
      {
        scriptUrl: 'http://localhost:10200/source-map/source-map-tester.html',
        sourceMapUrl: 'http://localhost:10200/source-map/script.js.map',
        map,
      },
      {
        scriptUrl: 'http://localhost:10200/source-map/source-map-tester.html',
        sourceMapUrl: 'http://localhost:10503/source-map/script.js.map',
        map,
      },
    ],
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/source-map/source-map-tester.html',
    finalDisplayedUrl: 'http://localhost:10200/source-map/source-map-tester.html',
    audits: {},
  },
};

export default {
  id: 'source-maps',
  expectations,
  config,
};
