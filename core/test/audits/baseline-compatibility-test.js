/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaselineCompatibility from '../../audits/baseline-compatibility.js';

describe('Baseline Compatibility Audit', () => {
  it('should return a passing score when no features are used', async () => {
    const artifacts = {
      Trace: {
        BaselineFeatureArtifact: []
      }
    };

    const result = await BaselineCompatibility.audit(artifacts);
    expect(result.score).toEqual(1);
    expect(result.details.items).toHaveLength(0);
  });

  it('should return a passing score when trace has no custom artifact', async () => {
    const artifacts = {
      Trace: {}
    };

    const result = await BaselineCompatibility.audit(artifacts);
    expect(result.score).toEqual(1);
    expect(result.details.items).toHaveLength(0);
  });

  it('should return a failing score and details when features are found', async () => {
    const artifacts = {
      Trace: {
        BaselineFeatureArtifact: [
          { featureId: 'a', source: 'http://example.com/index.html', line: 12 },
          { featureId: 'abortsignal-any', source: 'http://example.com/app.js', line: 42 },
          { featureId: 'accelerometer', source: 'http://example.com/sensor.js', line: 100 },
          { featureId: 'missing-in-json', source: 'http://example.com/missing.js', line: 1 },
          { featureId: 'a' } // missing source/line
        ]
      }
    };

    const result = await BaselineCompatibility.audit(artifacts);

    expect(result.score).toEqual(0);
    expect(result.details.items).toHaveLength(4);

    expect(result.details.items[0]).toEqual({
      featureId: {
        type: 'link',
        text: 'a',
        url: 'https://webstatus.dev/features/a',
      },
      displayStatus: 'Widely Available (2018-01-29)',
      source: {
        type: 'source-location',
        url: 'http://example.com/index.html',
        urlProvider: 'network',
        line: 12,
        column: 0
      }
    });

    expect(result.details.items[1].displayStatus).toEqual('Newly Available (2024-03-19)');
    expect(result.details.items[2].displayStatus).toEqual('Limited Availability');

    // Check fallback for missing source
    expect(result.details.items[3].source).toEqual('Unknown');
  });
});
