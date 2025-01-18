/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jsdom from 'jsdom';

import {ElementScreenshotRenderer} from '../../renderer/element-screenshot-renderer.js';
import {I18nFormatter} from '../../renderer/i18n-formatter.js';
import {DOM} from '../../renderer/dom.js';
import {Globals} from '../../renderer/report-globals.js';

/**
 * @param {{left: number, top: number, width: number, height:number}} opts
 * @return {LH.Artifacts.Rect}
 */
function makeRect(opts) {
  return {
    ...opts,
    right: opts.left + opts.width,
    bottom: opts.top + opts.height,
  };
}

describe('ElementScreenshotRenderer', () => {
  let dom;

  before(() => {
    Globals.apply({
      providedStrings: {},
      i18n: new I18nFormatter('en'),
      reportJson: null,
    });

    const {document} = new jsdom.JSDOM().window;
    dom = new DOM(document);
    Globals.resetUniqueSuffix();
  });

  after(() => {
    Globals.i18n = undefined;
  });

  it('renders screenshot', () => {
    const fullPageScreenshot = {
      width: 1000,
      height: 1000,
    };
    const elementRectSC = makeRect({
      left: 50,
      top: 50,
      width: 200,
      height: 300,
    });
    const renderContainerSizeDC = {
      width: 500,
      height: 500,
    };
    const el = ElementScreenshotRenderer.render(
      dom,
      fullPageScreenshot,
      elementRectSC,
      renderContainerSizeDC
    );

    const htmlFormatted = el.innerHTML.replace(/(<\w+ )/g, '\n$1');
    /* eslint-disable max-len */
    expect(htmlFormatted).toMatchInlineSnapshot(`
" 
<div class=\\"lh-element-screenshot__content\\"> 
<div class=\\"lh-element-screenshot__image\\" style=\\"width: 500px; height: 500px; background-position-y: 0px; background-position-x: 0px; background-size: 1000px 1000px;\\"> 
<div class=\\"lh-element-screenshot__mask\\" style=\\"width: 500px; height: 500px; clip-path: url(#clip-0);\\"> 
<svg height=\\"0\\" width=\\"0\\"> <defs> 
<clipPath clipPathUnits=\\"objectBoundingBox\\" id=\\"clip-0\\">
<polygon points=\\"0,0             1,0            1,0.1          0,0.1\\"></polygon>
<polygon points=\\"0,0.7     1,0.7    1,1               0,1\\"></polygon>
<polygon points=\\"0,0.1        0.1,0.1 0.1,0.7 0,0.7\\"></polygon>
<polygon points=\\"0.5,0.1 1,0.1       1,0.7       0.5,0.7\\"></polygon></clipPath>  </defs> </svg> </div> 
<div class=\\"lh-element-screenshot__element-marker\\" style=\\"width: 200px; height: 300px; left: 50px; top: 50px;\\"></div> </div> </div> "
`);
    /* eslint-enable max-len */
  });

  it('returns null if element is out of bounds', () => {
    const fullPageScreenshot = {
      width: 1000,
      height: 1000,
    };
    const elementRectSC = makeRect({
      left: 50,
      top: 5000,
      width: 200,
      height: 300,
    });
    const renderContainerSizeDC = {
      width: 500,
      height: 500,
    };
    expect(ElementScreenshotRenderer.render(
      dom,
      fullPageScreenshot,
      elementRectSC,
      renderContainerSizeDC
    )).toBe(null);
  });

  describe('getScreenshotPositions', () => {
    it('centers the screenshot on the highlighted area', () => {
      expect(
        ElementScreenshotRenderer.getScreenshotPositions(
          {left: 400, top: 500, width: 100, height: 40},
          {width: 412, height: 300},
          {width: 1300, height: 5000}
        )
      ).toMatchObject({
        screenshot: {
          left: 244,
          top: 370,
        },
        clip: {
          left: 156,
          top: 130,
        },
      });
    });

    it('contains the screenshot within the display area if the clip is in the top left', () => {
      expect(
        ElementScreenshotRenderer.getScreenshotPositions(
          {left: 0, top: 0, width: 100, height: 40},
          {width: 412, height: 300},
          {width: 412, height: 5000}
        )
      ).toMatchObject({
        screenshot: {
          left: 0,
          top: 0,
        },
        clip: {
          left: 0,
          top: 0,
        },
      });
    });

    it('contains the screenshot within the display area if the clip is in the bottom right', () => {
      expect(
        ElementScreenshotRenderer.getScreenshotPositions(
          {left: 300, top: 4950, width: 100, height: 40},
          {width: 412, height: 300},
          {width: 412, height: 5000}
        )
      ).toMatchObject({
        screenshot: {
          left: 0,
          top: 4700,
        },
        clip: {
          left: 300,
          top: 250,
        },
      });

      expect(
        ElementScreenshotRenderer.getScreenshotPositions(
          {left: 300, top: 4950, width: 100, height: 40},
          {width: 200, height: 300},
          {width: 412, height: 5000}
        )
      ).toMatchObject({
        screenshot: {
          left: 212,
          top: 4700,
        },
        clip: {
          left: 88,
          top: 250,
        },
      });
    });
  });
});
