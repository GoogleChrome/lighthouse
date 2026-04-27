/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import WebMcpStatusGatherer from '../../../gather/gatherers/webmcp-support-status.js';
import {createMockContext} from '../mock-driver.js';

describe('WebMcpStatus Gatherer', () => {
  it('returns isSupported: true when modelContext is defined', async () => {
    const gatherer = new WebMcpStatusGatherer();
    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate.mockResolvedValue(true);

    const artifact = await gatherer.getArtifact(mockContext.asContext());

    expect(artifact).toEqual({isSupported: true});
  });

  it('returns isSupported: false when modelContext is not defined', async () => {
    const gatherer = new WebMcpStatusGatherer();
    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate.mockResolvedValue(false);

    const artifact = await gatherer.getArtifact(mockContext.asContext());

    expect(artifact).toEqual({isSupported: false});
  });
});
