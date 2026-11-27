/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ViewportDimensionsGatherer from '../../../gather/gatherers/viewport-dimensions.js';
import {createMockContext} from '../../gather/mock-driver.js';

/** @type {ViewportDimensionsGatherer} */
let gatherer;

describe('ViewportDimensions gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    gatherer = new ViewportDimensionsGatherer();
  });

  it('returns an artifact', () => {
    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate.mockResolvedValue({
      innerWidth: 400,
      outerWidth: 400,
      innerHeight: 600,
      outerHeight: 600,
      devicePixelRatio: 2,
    });
    return gatherer.getArtifact(mockContext.asContext()).then(artifact => {
      assert.ok(typeof artifact === 'object');
      assert.ok(artifact.outerWidth === 400);
      assert.ok(artifact.innerHeight === 600);
    });
  });
});
