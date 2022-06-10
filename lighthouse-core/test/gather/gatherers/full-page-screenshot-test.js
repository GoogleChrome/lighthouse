/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {jest} from '@jest/globals';

import {createMockContext, mockDriverSubmodules} from '../../fraggle-rock/gather/mock-driver.js';
// import FullPageScreenshotGatherer from '../../../gather/gatherers/full-page-screenshot.js';

// Some imports needs to be done dynamically, so that their dependencies will be mocked.
// See: https://jestjs.io/docs/ecmascript-modules#differences-between-esm-and-commonjs
//      https://github.com/facebook/jest/issues/10025
/** @typedef {import('../../../gather/gatherers/full-page-screenshot.js')} FullPageScreenshotGatherer */
/** @type {typeof import('../../../gather/gatherers/full-page-screenshot.js')} */
let FullPageScreenshotGatherer;

beforeAll(async () => {
  FullPageScreenshotGatherer =
    (await import('../../../gather/gatherers/full-page-screenshot.js')).default;
});

const mocks = mockDriverSubmodules();

// Headless's default value is (1024 * 16), but this varies by device
const maxTextureSizeMock = 1024 * 8;

/** @type {{width: number, height: number}} */
let contentSize;
/** @type {{width?: number, height?: number, dpr: number}} */
let screenSize;
/** @type {string[]} */
let screenshotData;
let mockContext = createMockContext();

jest.setTimeout(10_000);

beforeEach(() => {
  contentSize = {width: 100, height: 100};
  screenSize = {width: 100, height: 100, dpr: 1};
  screenshotData = [];
  mockContext = createMockContext();
  mockContext.driver.defaultSession.sendCommand.mockImplementation((method) => {
    if (method === 'Page.getLayoutMetrics') {
      return {
        contentSize,
        // See comment within _takeScreenshot() implementation
        layoutViewport: {clientWidth: screenSize.width, clientHeight: screenSize.height},
      };
    }
    if (method === 'Page.captureScreenshot') {
      return {
        data: screenshotData?.length ? screenshotData.shift() : 'abc',
      };
    }
  });
  mockContext.driver._executionContext.evaluate.mockImplementation(fn => {
    if (fn.name === 'resolveNodes') {
      return {};
    } if (fn.name === 'getMaxTextureSize') {
      return maxTextureSizeMock;
    } else if (fn.name === 'getObservedDeviceMetrics') {
      return {
        width: screenSize.width,
        height: screenSize.height,
        screenWidth: screenSize.width,
        screenHeight: screenSize.height,
        screenOrientation: {
          type: 'landscapePrimary',
          angle: 30,
        },
        deviceScaleFactor: screenSize.dpr,
      };
    } else if (fn.name === 'waitForDoubleRaf') {
      return {};
    } else {
      throw new Error(`unexpected fn ${fn.name}`);
    }
  });
  mocks.reset();
});

describe('FullPageScreenshot gatherer', () => {
  it('captures a full-page screenshot', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    contentSize = {width: 412, height: 2000};
    screenSize = {width: 412, height: 412};

    mockContext.settings = {
      formFactor: 'mobile',
      screenEmulation: {
        height: screenSize.height,
        width: screenSize.width,
        mobile: true,
        disabled: false,
      },
    };
    const artifact = await fpsGatherer.getArtifact(mockContext.asContext());

    expect(artifact).toEqual({
      screenshot: {
        data: 'data:image/webp;base64,abc',
        height: 2000,
        width: 412,
      },
      nodes: {},
    });
  });

  it('resets the emulation correctly when Lighthouse controls it', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    contentSize = {width: 412, height: 2000};
    screenSize = {width: 412, height: 412};

    mockContext.settings = {
      formFactor: 'mobile',
      screenEmulation: {
        height: screenSize.height,
        width: screenSize.width,
        mobile: true,
        disabled: false,
      },
    };

    await fpsGatherer.getArtifact(mockContext.asContext());

    const expectedArgs = {
      formFactor: 'mobile',
      screenEmulation: {
        height: 412,
        width: 412,
        disabled: false,
        mobile: true,
      },
    };
    expect(mocks.emulationMock.emulate).toHaveBeenCalledTimes(1);
    expect(mocks.emulationMock.emulate).toHaveBeenCalledWith(
      mockContext.driver.defaultSession,
      expectedArgs
    );
  });

  it('resets the emulation correctly when Lighthouse does not control it', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    contentSize = {width: 500, height: 1500};
    screenSize = {width: 500, height: 500, dpr: 2};
    mockContext.settings = {
      screenEmulation: {
        height: screenSize.height,
        width: screenSize.width,
        mobile: true,
        disabled: true,
      },
      formFactor: 'mobile',
    };

    await fpsGatherer.getArtifact(mockContext.asContext());

    // Setting up for screenshot.
    expect(mockContext.driver.defaultSession.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        mobile: true,
        deviceScaleFactor: 1,
        height: 1500,
        width: 0,
      })
    );

    // Restoring.
    expect(mockContext.driver.defaultSession.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        mobile: true,
        deviceScaleFactor: 2,
        height: 500,
        width: 0,
      })
    );
  });

  it('limits the screenshot height to the max Chrome can capture', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();

    contentSize = {width: 412, height: 100000};
    screenSize = {width: 412, height: 412, dpr: 1};
    mockContext.settings = {
      formFactor: 'mobile',
      screenEmulation: {
        height: screenSize.height,
        width: screenSize.width,
        mobile: true,
        disabled: false,
      },
    };

    await fpsGatherer.getArtifact(mockContext.asContext());

    expect(mockContext.driver.defaultSession.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      {
        mobile: true,
        deviceScaleFactor: 1,
        width: 0,
        height: maxTextureSizeMock,
      }
    );
  });
});
