/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ViewportDimensionsGatherer from '../../../gather/gatherers/viewport-dimensions.js';

let gatherer;

describe('ViewportDimensions gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    gatherer = new ViewportDimensionsGatherer();
  });

  it('returns an artifact', () => {
    return gatherer.getArtifact({
      driver: {
        executionContext: {
          async evaluate() {
            return {
              innerWidth: 400,
              outerWidth: 400,
              innerHeight: 600,
              outerHeight: 600,
              devicePixelRatio: 2,
            };
          },
        },
      },
    }).then(artifact => {
      assert.ok(typeof artifact === 'object');
      assert.ok(artifact.outerWidth === 400);
      assert.ok(artifact.innerHeight === 600);
    });
  });
});
