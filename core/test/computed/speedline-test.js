/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {Speedline} from '../../computed/speedline.js';
import {readJson} from '../test-utils.js';

const pwaTrace = readJson('../fixtures/traces/progressive-app.json', import.meta);
const threeFrameTrace = readJson('../fixtures/traces/threeframes-blank_content_more.json', import.meta);

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
    const pwaTrace = readJson('core/test/fixtures/traces/progressive-app.json');
    const context = {computedCache: new Map()};
    return Speedline.request({traceEvents: pwaTrace}, context)
      .then(_ => {
        // assert.deepEqual has issue with diffing large array, so manually loop.
        const freshTrace = readJson('core/test/fixtures/traces/progressive-app.json');
        assert.strictEqual(pwaTrace.length, freshTrace.length);
        for (let i = 0; i < pwaTrace.length; i++) {
          assert.deepStrictEqual(pwaTrace[i], freshTrace[i]);
        }
      });
  }, 10000);
});
