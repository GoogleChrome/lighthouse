/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import BaseGatherer from '../base-gatherer.js';

class ReactDevModeGatherer extends BaseGatherer {
  meta = {
    supportedModes: ['navigation'],
  };

  // 1. Run this BEFORE the page loads
  async startInstrumentation(context) {
    const session = context.driver.defaultSession;
    await session.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
          isDisabled: false,
          supportsFiber: true,
          renderers: new Map(),
          inject: function(renderer) {
            // bundleType 1 is development, 0 is production
            window.__LIGHTHOUSE_REACT_DEV_MODE = renderer.bundleType === 1; 
            return 1; 
          },
          onScheduleFiberRoot: function() {},
          onCommitFiberRoot: function() {},
          onCommitFiberUnmount: function() {},
          checkDCE: function() {}
        };
      `,
    });
  }

  // 2. Run this AFTER the page loads
  async getArtifact(context) {
    const isDevMode = await context.driver.executionContext.evaluate(
      () => window.__LIGHTHOUSE_REACT_DEV_MODE === true,
      { args: [] }
    );

    return isDevMode;
  }
}

export default ReactDevModeGatherer;