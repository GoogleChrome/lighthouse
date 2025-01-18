/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';

import ScreenshotThumbnailsAudit from '../../audits/screenshot-thumbnails.js';
import {LH_ROOT} from '../../../shared/root.js';
import {readJson} from '../test-utils.js';

const pwaTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const pwaDevtoolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

const noScreenshotsTrace = {traceEvents: pwaTrace.traceEvents.filter(e => e.name !== 'Screenshot')};

describe('Screenshot thumbnails', () => {
  it('should extract thumbnails from a trace', () => {
    const options = {minimumTimelineDuration: 500, numberOfThumbnails: 10, thumbnailWidth: 120};
    const settings = {throttlingMethod: 'provided'};
    const artifacts = {
      GatherContext: {gatherMode: 'timespan'},
      traces: {defaultPass: pwaTrace},
      devtoolsLogs: {}, // empty devtools logs to test just thumbnails without TTI behavior
    };

    const context = {settings, options, computedCache: new Map()};
    return ScreenshotThumbnailsAudit.audit(artifacts, context).then(results => {
      results.details.items.forEach((result, index) => {
        const framePath = path.join(LH_ROOT,
          `core/test/fixtures/traces/screenshots/progressive-app-frame-${index}.jpg`);
        const expectedData = fs.readFileSync(framePath, 'base64');
        const actualData = result.data.slice('data:image/jpeg;base64,'.length);
        expect(actualData).toEqual(expectedData);
      });

      assert.equal(results.score, 1);
      assert.equal(results.details.items[0].timing, 82);
      assert.equal(results.details.items[2].timing, 245);
      assert.equal(results.details.items[9].timing, 818);
      assert.equal(results.details.items[0].timestamp, 225414253815);
    });
  }, 10000);

  it('should throw when screenshots are missing in navigation', async () => {
    const options = {minimumTimelineDuration: 500};
    const settings = {throttlingMethod: 'provided'};
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: noScreenshotsTrace},
      devtoolsLogs: {}, // empty devtools logs to test just thumbnails without TTI behavior
    };

    const context = {settings, options, computedCache: new Map()};
    await expect(ScreenshotThumbnailsAudit.audit(artifacts, context)).rejects.toThrow();
  });

  it('should be notApplicable when screenshots are missing in timespan', async () => {
    const options = {minimumTimelineDuration: 500};
    const settings = {throttlingMethod: 'provided'};
    const artifacts = {
      GatherContext: {gatherMode: 'timespan'},
      traces: {defaultPass: noScreenshotsTrace},
      devtoolsLogs: {}, // empty devtools logs to test just thumbnails without TTI behavior
    };

    const context = {settings, options, computedCache: new Map()};
    const results = await ScreenshotThumbnailsAudit.audit(artifacts, context);
    expect(results.notApplicable).toBe(true);
  });

  it('should scale the timeline to last visual change', () => {
    const options = {minimumTimelineDuration: 500};
    const settings = {throttlingMethod: 'devtools'};
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: pwaTrace},
      devtoolsLogs: {defaultPass: pwaDevtoolsLog},
    };

    const context = {settings, options, computedCache: new Map()};
    return ScreenshotThumbnailsAudit.audit(artifacts, context).then(results => {
      assert.equal(results.details.items[0].timing, 102);
      assert.equal(results.details.items[7].timing, 818);
    });
  });

  it('should scale the timeline to minimumTimelineDuration', () => {
    const settings = {throttlingMethod: 'simulate'};
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: pwaTrace},
    };

    const context = {settings, options: {}, computedCache: new Map()};
    return ScreenshotThumbnailsAudit.audit(artifacts, context).then(results => {
      assert.equal(results.details.items[0].timing, 375);
      assert.equal(results.details.items[7].timing, 3000);
    });
  });

  it('should handle nonsense times', async () => {
    const infiniteTrace = JSON.parse(JSON.stringify(pwaTrace));
    infiniteTrace.traceEvents.forEach(event => {
      if (event.name === 'Screenshot') {
        event.ts = Infinity;
      }
    });

    const settings = {throttlingMethod: 'simulate'};
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: infiniteTrace},
    };
    const context = {settings, options: {}, computedCache: new Map()};

    try {
      await ScreenshotThumbnailsAudit.audit(artifacts, context);
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.message, 'INVALID_SPEEDLINE');
    }
  });
});
