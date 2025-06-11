/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import CSSUsage from '../../../gather/gatherers/css-usage.js';
import {createMockContext} from '../mock-driver.js';

describe('CSSUsage gatherer', () => {
  it('gets CSS usage', async () => {
    const context = createMockContext();
    context.driver.defaultSession.sendCommand
      .mockResponse('DOM.enable')
      .mockResponse('CSS.enable')
      .mockResponse('CSS.startRuleUsageTracking')
      .mockResponse('CSS.stopRuleUsageTracking', {
        ruleUsage: [
          {styleSheetId: '1', used: true},
          {styleSheetId: '2', used: false},
        ],
      })
      .mockResponse('CSS.disable')
      .mockResponse('DOM.disable');

    const gatherer = new CSSUsage();
    const artifact = await gatherer.getArtifact(context.asContext());

    expect(artifact).toEqual([
      {
        styleSheetId: '1',
        used: true,
      },
      {
        styleSheetId: '2',
        used: false,
      },
    ]);
  });
});
