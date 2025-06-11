/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as puppeteer from 'puppeteer-core';
import {getChromePath} from 'chrome-launcher';

import * as LH from '../../../../types/lh.js';
import {createMockContext} from '../../gather/mock-driver.js';
import FullPageScreenshotGatherer from '../../../gather/gatherers/full-page-screenshot.js';
import {fnAny} from '../../test-utils.js';
import lighthouse from '../../../index.js';
import {Server} from '../../../../cli/test/fixtures/static-server.js';

/** @type {{width: number, height: number}} */
let contentSize;
/** @type {{width?: number, height?: number, dpr: number}} */
let screenSize;
/** @type {{width?: number, height?: number}} */
let screenshotSize;
/** @type {string[]} */
let screenshotData;
let mockContext = createMockContext();
let fpsGatherer = new FullPageScreenshotGatherer();

beforeEach(() => {
  fpsGatherer = new FullPageScreenshotGatherer();

  // Prevent `waitForNetworkIdle` from stalling the tests
  fpsGatherer.waitForNetworkIdle = fnAny().mockImplementation(() => ({
    promise: Promise.resolve(),
    cancel: fnAny(),
  }));

  contentSize = {width: 100, height: 100};
  screenSize = {width: 100, height: 100, dpr: 1};
  screenshotSize = contentSize;
  screenshotData = [];
  mockContext = createMockContext();
  mockContext.driver.defaultSession.sendCommand.mockImplementation((method) => {
    if (method === 'Page.getLayoutMetrics') {
      return {
        cssContentSize: contentSize,
        // This is only accessed on the first call to Page.getLayoutMetrics
        // At that time the width and height should match the screen size.
        cssLayoutViewport: {clientWidth: screenSize.width, clientHeight: screenSize.height},
        // This is only accessed on the second call to Page.getLayoutMetrics
        // At that time the width and height should match the screenshot size.
        cssVisualViewport: {clientWidth: screenshotSize.width, clientHeight: screenshotSize.height},
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
    } else if (fn.name === 'getObservedDeviceMetrics') {
      return {
        width: screenSize.width,
        height: screenSize.height,
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
});

describe('FullPageScreenshot gatherer', () => {
  it('captures a full-page screenshot', async () => {
    contentSize = {width: 412, height: 2000};
    screenSize = {width: 412, height: 412};
    screenshotSize = contentSize;

    mockContext.settings = {
      ...mockContext.settings,
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
        data: 'data:image/png;base64,abc',
        height: 2000,
        width: 412,
      },
      nodes: {},
    });
  });

  it('resets the emulation correctly when Lighthouse controls it', async () => {
    contentSize = {width: 412, height: 2000};
    screenSize = {width: 412, height: 412};
    screenshotSize = contentSize;

    mockContext.settings = {
      ...mockContext.settings,
      formFactor: 'mobile',
      screenEmulation: {
        height: screenSize.height,
        width: screenSize.width,
        mobile: true,
        disabled: false,
      },
    };

    await fpsGatherer.getArtifact(mockContext.asContext());

    // Lighthouse-controlled emulation.emulate() sets touch emulation.
    const emulationInvocations = mockContext.driver.defaultSession.sendCommand
        .findAllInvocations('Emulation.setTouchEmulationEnabled');
    expect(emulationInvocations).toHaveLength(1);

    expect(mockContext.driver.defaultSession.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        height: 412,
        width: 412,
        mobile: true,
      })
    );
  });

  it('resets the emulation correctly when Lighthouse does not control it', async () => {
    contentSize = {width: 500, height: 1500};
    screenSize = {width: 500, height: 500, dpr: 2};
    screenshotSize = contentSize;
    mockContext.settings = {
      ...mockContext.settings,
      screenEmulation: {
        height: screenSize.height,
        width: screenSize.width,
        mobile: true,
        disabled: true,
      },
      formFactor: 'mobile',
    };

    await fpsGatherer.getArtifact(mockContext.asContext());

    // If not Lighthouse controlled, no touch emulation.
    const emulationInvocations = mockContext.driver.defaultSession.sendCommand
        .findAllInvocations('Emulation.setTouchEmulationEnabled');
    expect(emulationInvocations).toHaveLength(0);

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
    contentSize = {width: 412, height: 100000};
    screenSize = {width: 412, height: 412, dpr: 1};
    screenshotSize = contentSize;
    mockContext.settings = {
      ...mockContext.settings,
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
        height: 16383,
      }
    );
  });

  // Tests that our node rects line up with content in the screenshot image data.
  // This uses "screenshot-nodes.html", which has elements of solid colors to make verification simple.
  // To verify a node rect is correct, each pixel in its area is looked at in the screenshot data, and is checked
  // for the expected color. Due to compression artifacts, there are thresholds involved instead of exact matches.
  describe('end-to-end integration test', () => {
    const port = 10503;
    let serverBaseUrl = ''
    /** @type {StaticServer} */;
    let server;
    /** @type {puppeteer.Browser} */
    let browser;
    /** @type {puppeteer.Page} */
    let page;

    before(async () => {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: getChromePath(),
        ignoreDefaultArgs: ['--enable-automation'],
      });

      server = new Server(port);
      await server.listen(port, '127.0.0.1');
      serverBaseUrl = `http://localhost:${server.getPort()}`;
    });

    after(async () => {
      await browser.close();
      await server.close();
    });

    beforeEach(async () => {
      page = await browser.newPage();
    });

    afterEach(async () => {
      await page.close();
    });

    /**
     * @typedef NodeAnalysisResult
     * @property {string} id
     * @property {boolean} success
     * @property {number[][]} debugData
     */

    /**
     * @param {puppeteer.Page} page
     * @param {LH.Result} lhr
     * @param {DebugFormat} debugFormat
     * @return {Promise<NodeAnalysisResult>}
     */
    function analyzeScreenshotNodes(page, lhr, debugFormat) {
      const options = {
        fullPageScreenshot: lhr.fullPageScreenshot,
        debugFormat,
      };

      return page.evaluate(async (options) => {
        function hexToRgb(hex) {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          };
        }

        // https://www.compuphase.com/cmetric.htm
        function colorDistance(e1, e2) {
          const rmean = (e1.r + e2.r) / 2;
          const r = e1.r - e2.r;
          const g = e1.g - e2.g;
          const b = e1.b - e2.b;
          return Math.sqrt(
            (((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
        }

        const img = await new Promise((resolve, reject) => {
          // eslint-disable-next-line no-undef
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = options.fullPageScreenshot.screenshot.data;
        });

        // eslint-disable-next-line no-undef
        const canvasEl = document.createElement('canvas');
        canvasEl.width = img.width;
        canvasEl.height = img.height;
        const ctx = canvasEl.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const results = [];
        for (const node of Object.values(options.fullPageScreenshot.nodes)) {
          if (!(node.id.includes('green') || node.id.includes('red'))) {
            continue;
          }
          if (!node.id.includes('el-')) {
            continue;
          }

          const expectedColor = hexToRgb(node.id.includes('green') ? '#427f36' : '#8a4343');
          const result = {id: node.id, success: true};
          results.push(result);

          const right = Math.min(node.right, canvasEl.width - 1);
          const bottom = Math.min(node.bottom, canvasEl.height - 1);

          const debugData = [];
          for (let y = node.top; y <= bottom; y++) {
            const row = [];
            debugData.push(row);

            for (let x = node.left; x <= right; x++) {
              const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
              const delta = colorDistance(expectedColor, {r, g, b});
              const pass = delta > 0;

              if (options.debugFormat === 'color') {
                row.push((r << 16) | (g << 8) | b);
              } else if (options.debugFormat === 'delta') {
                row.push(delta);
              } else if (options.debugFormat === 'pass') {
                row.push(pass);
              }
            }
          }

          if (options.debugFormat) result.debugData = debugData;
        }

        return results;
      }, options);
    }

    /**
     * @param {NodeAnalysisResult[]} results
     * @param {DebugFormat} debugFormat
     */
    function visualizeDebugData(results, debugFormat) {
      for (const result of results) {
        console.log(`\n=== ${result.id} ${result.success ? 'success' : 'failure'} ===\n`);

        const columns = result.debugData;
        for (let y = 0; y < columns.length; y++) {
          let line = '';
          for (let x = 0; x < columns[0].length; x++) {
            if (debugFormat === 'color') {
              line += columns[y][x].toString(16).padStart(6, '0') + ' ';
            } else if (debugFormat === 'delta') {
              line += columns[y][x].toFixed(1) + ' ';
            } else if (debugFormat === 'pass') {
              line += columns[y][x] ? 'O' : 'X';
            }
          }
          console.log(line);
        }
      }
    }

    /**
     * @param {LH.Result} lhr
     * @param {Array<id: string, top: number, bottom: number, left: number: right: number>} rectExpectations
     */
    async function verifyNodeRectsAlignWithImage(lhr, rectExpectations) {
      if (!lhr.fullPageScreenshot) throw new Error('no screenshot');

      // First check we recieved all the expected nodes.
      const nodes = Object.values(lhr.fullPageScreenshot.nodes);
      for (const expectation of rectExpectations) {
        const nodeSeen = nodes.find(node => node.id === expectation.id);
        if (!nodeSeen) throw new Error(`did not find node for id ${expectation.id}`);

        const {id, left, top, right, bottom} = nodeSeen;
        expect({id, left, top, right, bottom}).toEqual(expectation);
      }

      // Now check that the image contents line up with what we think the nodes are.

      /** @type {DebugFormat} */
      const debugFormat = process.env.LH_FPS_DEBUG ?? false;
      const results = await analyzeScreenshotNodes(page, lhr, debugFormat);

      // Very helpful for debugging. Set env LH_FPS_DEBUG to one of the valid debug formats.
      if (debugFormat) {
        console.log(lhr.fullPageScreenshot.screenshot.data);
        visualizeDebugData(results, debugFormat);
      }

      const failingIds = results.filter(r => !r.success).map(r => r.id);
      expect(failingIds).toEqual([]);

      expect(results.length).toBeGreaterThan(0);
    }

    it('mobile dpr 1', async () => {
      const rectExpectations = [
        {
          id: 'el-1-red',
          top: 10,
          bottom: 20,
          left: 18,
          right: 178,
        },
        {
          id: 'el-2-green',
          top: 60,
          bottom: 120,
          left: 48,
          right: 108,
        },
      ];
      const runnerResult = await lighthouse(`${serverBaseUrl}/screenshot-nodes.html`, {
        onlyAudits: ['largest-contentful-paint-element', 'aria-required-parent'],
        screenEmulation: {mobile: true, width: 600, height: 900, deviceScaleFactor: 1.0},
      }, undefined, page);
      if (!runnerResult) throw new Error('no runner result');

      await verifyNodeRectsAlignWithImage(runnerResult.lhr, rectExpectations);
    });

    it('mobile dpr 1 tiny viewport', async () => {
      const rectExpectations = [
        {
          id: 'el-1-red',
          top: 10,
          bottom: 20,
          left: 18,
          right: 178,
        },
        {
          id: 'el-2-green',
          top: 60,
          bottom: 120,
          left: 48,
          right: 108,
        },
      ];
      const runnerResult = await lighthouse(`${serverBaseUrl}/screenshot-nodes.html`, {
        onlyAudits: ['largest-contentful-paint-element', 'aria-required-parent'],
        screenEmulation: {mobile: true, width: 100, height: 200, deviceScaleFactor: 1.0},
      }, undefined, page);
      if (!runnerResult) throw new Error('no runner result');

      await verifyNodeRectsAlignWithImage(runnerResult.lhr, rectExpectations);
    });

    it('mobile dpr 1.75', async () => {
      const rectExpectations = [
        {
          id: 'el-1-red',
          top: 10,
          bottom: 20,
          left: 18,
          right: 178,
        },
        {
          id: 'el-2-green',
          top: 60,
          bottom: 120,
          left: 48,
          right: 108,
        },
      ];
      const runnerResult = await lighthouse(`${serverBaseUrl}/screenshot-nodes.html`, {
        onlyAudits: ['largest-contentful-paint-element', 'aria-required-parent'],
        screenEmulation: {mobile: true, width: 600, height: 900, deviceScaleFactor: 1.75},
      }, undefined, page);
      if (!runnerResult) throw new Error('no runner result');

      await verifyNodeRectsAlignWithImage(runnerResult.lhr, rectExpectations);
    });

    it('desktop', async () => {
      const rectExpectations = [
        {
          id: 'el-1-red',
          top: 10,
          bottom: 20,
          left: 18,
          right: 178,
        },
        {
          id: 'el-2-green',
          top: 60,
          bottom: 120,
          left: 48,
          right: 108,
        },
      ];
      const runnerResult = await lighthouse(`${serverBaseUrl}/screenshot-nodes.html`, {
        onlyAudits: ['largest-contentful-paint-element', 'aria-required-parent'],
        screenEmulation: {mobile: false, width: 1350, height: 940, deviceScaleFactor: 1},
        formFactor: 'desktop',
      }, undefined, page);
      if (!runnerResult) throw new Error('no runner result');

      await verifyNodeRectsAlignWithImage(runnerResult.lhr, rectExpectations);
    });

    it('grow', async () => {
      const runnerResult = await lighthouse(`${serverBaseUrl}/screenshot-nodes.html?grow`, {
        onlyAudits: ['largest-contentful-paint-element', 'aria-required-parent'],
        screenEmulation: {mobile: true, width: 600, height: 900, deviceScaleFactor: 1.0},
      }, undefined, page);
      if (!runnerResult) throw new Error('no runner result');

      // No rect expectations, because we can't know what they'll be ahead of time.
      await verifyNodeRectsAlignWithImage(runnerResult.lhr, []);
    });
  });
});
