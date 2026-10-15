/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ScreenshotThumbnailsAudit from '../../audits/screenshot-thumbnails.js';
import {readJson} from '../test-utils.js';

const pwaTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const pwaDevtoolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

const noScreenshotsTrace = {traceEvents: pwaTrace.traceEvents.filter(e => e.name !== 'Screenshot')};

describe('Screenshot thumbnails', () => {
  it('should extract thumbnails from a trace', () => {
    const options = {minimumTimelineDuration: 500, numberOfThumbnails: 10};
    const settings = {throttlingMethod: 'provided'};
    const artifacts = {
      GatherContext: {gatherMode: 'timespan'},
      Trace: pwaTrace,
      DevtoolsLog: [], // empty devtools logs to test just thumbnails without TTI behavior
    };

    const context = {settings, options, computedCache: new Map()};
    return ScreenshotThumbnailsAudit.audit(artifacts, context).then(results => {
      const screenshots = pwaTrace.traceEvents
        .filter(e => e.name === 'Screenshot')
        .map(e => `data:image/jpeg;base64,${e.args.snapshot}`);

      // First 6 thumbnails use speedline's synthesized white starting frame.
      for (let i = 0; i <= 5; i++) {
        expect(results.details.items[i].data).toEqual(results.details.items[0].data);
      }
      expect(results.details.items[0].data).not.toEqual(screenshots[0]);
      expect(results.details.items[6].data).toEqual(screenshots[0]);
      expect(results.details.items[7].data).toEqual(screenshots[1]);
      expect(results.details.items[8].data).toEqual(screenshots[1]);
      // screenshots[2] has interpolated progress and is skipped.
      expect(results.details.items[9].data).toEqual(screenshots[3]);

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
      Trace: noScreenshotsTrace,
      DevtoolsLog: [], // empty devtools logs to test just thumbnails without TTI behavior
    };

    const context = {settings, options, computedCache: new Map()};
    await expect(ScreenshotThumbnailsAudit.audit(artifacts, context)).rejects.toThrow();
  });

  it('should be notApplicable when screenshots are missing in timespan', async () => {
    const options = {minimumTimelineDuration: 500};
    const settings = {throttlingMethod: 'provided'};
    const artifacts = {
      GatherContext: {gatherMode: 'timespan'},
      Trace: noScreenshotsTrace,
      DevtoolsLog: [], // empty devtools logs to test just thumbnails without TTI behavior
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
      Trace: pwaTrace,
      DevtoolsLog: pwaDevtoolsLog,
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
      Trace: pwaTrace,
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
      Trace: infiniteTrace,
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
