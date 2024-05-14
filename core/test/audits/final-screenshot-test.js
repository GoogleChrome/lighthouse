/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import FinalScreenshotAudit from '../../audits/final-screenshot.js';
import {readJson} from '../test-utils.js';

const pwaTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);

const noScreenshotsTrace = {traceEvents: pwaTrace.traceEvents.filter(e => e.name !== 'Screenshot')};

describe('Final screenshot', () => {
  let context;

  beforeEach(() => {
    context = {computedCache: new Map()};
  });

  it('should extract a final screenshot from a trace', async () => {
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace},
      GatherContext: {gatherMode: 'timespan'},
    });
    const results = await FinalScreenshotAudit.audit(artifacts, context);

    expect(results.score).toEqual(1);
    expect(results.details.timing).toEqual(818);
    expect(results.details.timestamp).toEqual(225414990064);
    expect(results.details.data).toContain('data:image/jpeg;base64,/9j/4AAQSkZJRgABA');
  });

  it('should returns not applicable for missing screenshots in timespan mode', async () => {
    const artifacts = {
      traces: {defaultPass: noScreenshotsTrace},
      GatherContext: {gatherMode: 'timespan'},
    };

    const results = await FinalScreenshotAudit.audit(artifacts, context);
    expect(results.notApplicable).toEqual(true);
  });

  it('should throws for missing screenshots in navigation mode', async () => {
    const artifacts = {
      traces: {defaultPass: noScreenshotsTrace},
      GatherContext: {gatherMode: 'navigation'},
    };

    await expect(FinalScreenshotAudit.audit(artifacts, context)).rejects.toThrow();
  });
});
