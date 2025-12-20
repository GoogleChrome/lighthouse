/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert').strict;
const fs = require('fs');
const pwaTrace = require('../fixtures/traces/progressive-app.json');
const threeFrameTrace = require('../fixtures/traces/threeframes-blank_content_more.json');
const Speedline = require('../../computed/speedline.js');

describe('Speedline gatherer', () => {
  it('returns an error message on faulty trace data', () => {
    const context = {computedCache: new Map()};
    return Speedline.request({traceEvents: {boo: 'ya'}}, context).then(_ => {
      assert.fail(true, true, 'Invalid trace did not throw exception in speedline');
    }, err => {
      assert.ok(err);
      assert.ok(err.message.length);
    });
  });

  it('throws when no frames', () => {
    const traceWithNoFrames = pwaTrace.filter(evt => evt.name !== 'Screenshot');
    const context = {computedCache: new Map()};
    return Speedline.request({traceEvents: traceWithNoFrames}, context).then(_ => {
      assert.ok(false, 'Invalid trace did not throw exception in speedline');
    }).catch(err => {
      assert.equal(err.message, 'NO_SCREENSHOTS');
    });
  });

  it('measures the pwa.rocks example', () => {
    const context = {computedCache: new Map()};
    return Speedline.request({traceEvents: pwaTrace}, context).then(speedline => {
      assert.equal(speedline.perceptualSpeedIndex, undefined);
      assert.equal(Math.floor(speedline.speedIndex), 549);
    });
  }, 10000);

  it('measures SI of 3 frame trace (blank @1s, content @2s, more content @3s)', () => {
    const context = {computedCache: new Map()};
    return Speedline.request(threeFrameTrace, context).then(speedline => {
      assert.equal(speedline.perceptualSpeedIndex, undefined);
      assert.equal(Math.floor(speedline.speedIndex), 2040);
    });
  }, 10000);

  it('does not change order of events in traces', () => {
    // Use fresh trace in case it has been altered by other require()s.
    const pwaJson = fs.readFileSync(__dirname +
        '/../fixtures/traces/progressive-app.json', 'utf8');
    const pwaTrace = JSON.parse(pwaJson);
    const context = {computedCache: new Map()};
    return Speedline.request({traceEvents: pwaTrace}, context)
      .then(_ => {
        // assert.deepEqual has issue with diffing large array, so manually loop.
        const freshTrace = JSON.parse(pwaJson);
        assert.strictEqual(pwaTrace.length, freshTrace.length);
        for (let i = 0; i < pwaTrace.length; i++) {
          assert.deepStrictEqual(pwaTrace[i], freshTrace[i]);
        }
      });
  }, 10000);
});
