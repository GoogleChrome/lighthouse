/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import CumulativeLayoutShift from '../../../audits/metrics/cumulative-layout-shift.js';
import {readJson} from '../../test-utils.js';

const jumpyClsTrace = readJson('../../fixtures/traces/jumpy-cls-m90.json', import.meta);

describe('Cumulative Layout Shift', () => {
  it('evaluates CLS correctly', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [CumulativeLayoutShift.DEFAULT_PASS]: jumpyClsTrace,
      },
    };

    const context = {
      settings: {throttlingMethod: 'simulate'},
      computedCache: new Map(),
      options: CumulativeLayoutShift.defaultOptions,
    };
    const result = await CumulativeLayoutShift.audit(artifacts, context);
    expect(result).toMatchObject({
      score: 0,
      numericValue: expect.toBeApproximately(2.268816, 6),
      numericUnit: 'unitless',
      details: {
        type: 'debugdata',
        items: [{
          cumulativeLayoutShiftMainFrame: expect.toBeApproximately(2.268816, 6),
        }],
      },
    });
  });
});
