/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {Screenshots} from '../../computed/screenshots.js';
import {readJson} from '../test-utils.js';

const pwaTrace = readJson('../fixtures/traces/progressive-app.json', import.meta);

describe('Screenshot computed artifact', () => {
  it('returns an artifact for a real trace', () => {
    const context = {computedCache: new Map()};
    return Screenshots.request({traceEvents: pwaTrace}, context).then(screenshots => {
      assert.ok(Array.isArray(screenshots));
      assert.equal(screenshots.length, 7);

      const firstScreenshot = screenshots[0];
      assert.ok(firstScreenshot.datauri.startsWith('data:image/jpeg;base64,'));
      assert.ok(firstScreenshot.datauri.length > 42);
    });
  });
});
