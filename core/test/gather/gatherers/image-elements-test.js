/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jestMock from 'jest-mock';

import ImageElements from '../../../gather/gatherers/image-elements.js';
import {createMockContext, createMockDriver, createMockSession} from
  '../mock-driver.js';
import {fnAny, readJson, timers} from '../../test-utils.js';

const devtoolsLog = readJson('../../fixtures/artifacts/paul/devtoolslog.json', import.meta);

/**
 * @param {Partial<LH.Artifacts.ImageElement>=} partial
 * @return {LH.Artifacts.ImageElement}
 */
function mockElement(partial = {}) {
  return {
    src: 'https://www.paulirish.com/avatar150.jpg',
    srcset: '',
    displayedWidth: 200,
    displayedHeight: 200,
    clientRect: {
      top: 50,
      bottom: 250,
      left: 50,
      right: 250,
    },
    attributeWidth: '',
    attributeHeight: '',
    naturalDimensions: undefined,
    cssEffectiveRules: undefined,
    computedStyles: {position: 'absolute', objectFit: '', imageRendering: ''},
    isCss: false,
    isPicture: false,
    isInShadowDOM: false,
    node: {
      lhId: '__nodeid__',
      devtoolsNodePath: '1,HTML,1,BODY,1,DIV,1,IMG',
      selector: 'body > div > img',
      nodeLabel: 'img',
      snippet: '<img src="https://www.paulirish.com/avatar150.jpg">',
      boundingRect: {
        top: 50,
        bottom: 250,
        left: 50,
        right: 250,
        width: 200,
        height: 200,
      },
    },
    ...partial,
  };
}

function makeImageElements() {
  const gatherer = new ImageElements();
  jestMock.spyOn(gatherer, 'collectExtraDetails');
  jestMock.spyOn(gatherer, 'fetchSourceRules');
  jestMock.spyOn(gatherer, 'fetchElementWithSizeInformation');
  return gatherer;
}

describe('ImageElements', () => {
  describe('.fetchElementsWithSizingInformation', () => {
    before(() => timers.useFakeTimers());
    after(() => timers.dispose());

    let gatherer = makeImageElements();
    let driver = createMockDriver();
    beforeEach(() => {
      gatherer = makeImageElements();
      driver = createMockDriver();
    });

    it('uses natural dimensions from cache if possible', async () => {
      const element = mockElement();
      gatherer._naturalSizeCache.set(element.src, {
        naturalWidth: 200,
        naturalHeight: 200,
      });

      await gatherer.fetchElementWithSizeInformation(driver.asDriver(), element);

      expect(driver._executionContext.evaluate).not.toHaveBeenCalled();
      expect(element).toEqual(mockElement({
        naturalDimensions: {
          width: 200,
          height: 200,
        },
      }));
    });

    it('evaluates natural dimensions if not in cache', async () => {
      const element = mockElement();
      driver._executionContext.evaluate.mockReturnValue({
        naturalWidth: 200,
        naturalHeight: 200,
      });

      await gatherer.fetchElementWithSizeInformation(driver.asDriver(), element);

      expect(gatherer._naturalSizeCache.get(element.src)).toEqual({
        naturalWidth: 200,
        naturalHeight: 200,
      });
      expect(element).toEqual(mockElement({
        naturalDimensions: {
          width: 200,
          height: 200,
        },
      }));
    });

    it('handles error when calculating natural dimensions', async () => {
      const element = mockElement();
      driver._executionContext.evaluate.mockRejectedValue(new Error());

      const returnPromise = gatherer.fetchElementWithSizeInformation(driver.asDriver(), element);

      await expect(returnPromise).resolves.not.toThrow();
      expect(element).toEqual(mockElement()); // Element unchanged
    });
  });

  describe('.fetchSourceRules', () => {
    before(() => timers.useFakeTimers());
    after(() => timers.dispose());

    let gatherer = makeImageElements();
    let session = createMockSession();

    beforeEach(() => {
      gatherer = makeImageElements();
      session = createMockSession();
    });

    it('handles no node found error', async () => {
      session.sendCommand.mockImplementationOnce(() => {
        throw Error('No node found');
      });

      const returnPromise = gatherer.fetchSourceRules(
        session.asSession(),
        '1,HTML,1,BODY,1,IMG',
        mockElement()
      );
      await expect(returnPromise).resolves.not.toThrow();
    });

    it('gets sizes from inline style', async () => {
      session.sendCommand
        .mockResponse('DOM.pushNodeByPathToFrontend', {nodeId: 1})
        .mockResponse('CSS.getMatchedStylesForNode', {inlineStyle: {cssProperties: [
          {name: 'width', value: '200px'},
          {name: 'height', value: '200px'},
          {name: 'aspect-ratio', value: '1 / 1'},
        ]}});

      const element = mockElement();
      await gatherer.fetchSourceRules(session.asSession(), element.node.devtoolsNodePath, element);

      expect(element).toEqual(mockElement({
        cssEffectiveRules: {
          width: '200px',
          height: '200px',
          aspectRatio: '1 / 1',
        },
      }));
    });

    it('gets sizes from attributes', async () => {
      session.sendCommand
        .mockResponse('DOM.pushNodeByPathToFrontend', {nodeId: 1})
        .mockResponse('CSS.getMatchedStylesForNode', {attributesStyle: {cssProperties: [
          {name: 'width', value: '200px'},
          {name: 'height', value: '200px'},
        ]}});

      const element = mockElement();
      await gatherer.fetchSourceRules(session.asSession(), element.node.devtoolsNodePath, element);

      expect(element).toEqual(mockElement({
        cssEffectiveRules: {
          width: '200px',
          height: '200px',
          aspectRatio: null,
        },
      }));
    });

    it('gets sizes from matching CSS rules', async () => {
      session.sendCommand
        .mockResponse('DOM.pushNodeByPathToFrontend', {nodeId: 1})
        .mockResponse('CSS.getMatchedStylesForNode', {matchedCSSRules: [
          {
            rule: {
              selectorList: {selectors: [{text: 'img'}]},
              style: {cssProperties: [
                {name: 'width', value: '200px'},
                {name: 'height', value: '200px'},
              ]},
            },
            matchingSelectors: [0],
          },
          {
            rule: {
              selectorList: {selectors: [{text: '.classy'}]},
              style: {cssProperties: [
                {name: 'aspect-ratio', value: '1 / 1'},
              ]},
            },
            matchingSelectors: [0],
          },
        ]});

      const element = mockElement();
      await gatherer.fetchSourceRules(session.asSession(), element.node.devtoolsNodePath, element);

      expect(element).toEqual(mockElement({
        cssEffectiveRules: {
          width: '200px',
          height: '200px',
          aspectRatio: '1 / 1',
        },
      }));
    });
  });

  describe('.collectExtraDetails', () => {
    before(() => timers.useFakeTimers());
    after(() => timers.dispose());

    let gatherer = makeImageElements();
    let driver = createMockDriver().asDriver();

    beforeEach(() => {
      driver = createMockDriver().asDriver();
      gatherer = makeImageElements();
      gatherer.fetchSourceRules = fnAny();
      gatherer.fetchElementWithSizeInformation = fnAny();
    });

    it('respects the overall time budget for source rules', async () => {
      const elements = [
        mockElement({isInShadowDOM: false, isCss: false}),
        mockElement({isInShadowDOM: false, isCss: false}),
        mockElement({isInShadowDOM: false, isCss: false}),
      ];
      gatherer.fetchSourceRules = fnAny().mockImplementation(async () => {
        timers.advanceTimersByTime(6000);
      });

      await gatherer.collectExtraDetails(driver, elements);

      expect(gatherer.fetchSourceRules).toHaveBeenCalledTimes(1);
    });

    it('fetch source rules to determine sizing for non-shadow DOM/non-CSS images', async () => {
      const elements = [
        mockElement({isInShadowDOM: false, isCss: false}),
        mockElement({isInShadowDOM: true, isCss: false}),
        mockElement({isInShadowDOM: false, isCss: true}),
      ];

      await gatherer.collectExtraDetails(driver, elements);

      expect(gatherer.fetchSourceRules).toHaveBeenCalledTimes(1);
    });

    it('fetch multiple source rules for non-shadow DOM/non-CSS images', async () => {
      const elements = [
        mockElement({isInShadowDOM: false, isCss: false}),
        mockElement({isInShadowDOM: false, isCss: false}),
      ];

      await gatherer.collectExtraDetails(driver, elements);

      expect(gatherer.fetchSourceRules).toHaveBeenCalledTimes(2);
    });

    it('fetch size information for image with picture', async () => {
      const elements = [
        mockElement({src: 'https://example.com/a.png', isPicture: false, isCss: true, srcset: 'src'}),
        mockElement({src: 'https://example.com/b.png', isPicture: true, isCss: false, srcset: 'src'}),
        mockElement({src: 'https://example.com/c.png', isPicture: false, isCss: true}),
        mockElement({src: 'https://example.com/d.png', isPicture: false, isCss: false}),
      ];

      await gatherer.collectExtraDetails(driver, elements);

      expect(gatherer.fetchElementWithSizeInformation).toHaveBeenCalledTimes(3);
    });
  });

  it('works on real artifacts', async () => {
    const gatherer = new ImageElements();
    const mockContext = createMockContext();
    mockContext.driver.defaultSession.sendCommand
      .mockResponse('DOM.enable')
      .mockResponse('CSS.enable')
      .mockResponse('DOM.getDocument')
      .mockResponse('DOM.pushNodeByPathToFrontend', {nodeId: 1})
      .mockResponse('CSS.getMatchedStylesForNode', {attributesStyle: {cssProperties: [
        {name: 'width', value: '200px'},
        {name: 'height', value: '200px'},
      ]}})
      .mockResponse('CSS.disable')
      .mockResponse('DOM.disable');
    mockContext.driver._executionContext.evaluate.mockReturnValue([mockElement()]);

    const artifact = await gatherer.getArtifact({
      ...mockContext.asContext(),
      dependencies: {DevtoolsLog: devtoolsLog},
    });

    expect(artifact).toEqual([
      mockElement({
        cssEffectiveRules: {
          width: '200px',
          height: '200px',
          aspectRatio: null,
        },
      }),
    ]);
  });
});
