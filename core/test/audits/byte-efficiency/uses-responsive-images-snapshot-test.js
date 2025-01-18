/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import UsesResponsiveImagesSnapshot from
  '../../../audits/byte-efficiency/uses-responsive-images-snapshot.js';

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

it('reports images that are bigger than displayed dimensions', async () => {
  const artifacts = {
    ImageElements: [
      mockElement({naturalDimensions: {width: 500, height: 500}}),
    ],
    ViewportDimensions: {
      width: 500,
      height: 500,
      devicePixelRatio: 1,
    },
  };

  const result = await UsesResponsiveImagesSnapshot.audit(artifacts);

  expect(result.score).toEqual(0);
  expect(result.details.items).toMatchObject([
    {
      actualDimensions: '500x500',
      displayedDimensions: '200x200',
      url: 'https://www.paulirish.com/avatar150.jpg',
    },
  ]);
});

it('ignores images smaller or equal to displayed dimensions', async () => {
  const artifacts = {
    ImageElements: [
      mockElement({naturalDimensions: {width: 200, height: 200}}),
      mockElement({naturalDimensions: {width: 40, height: 40}}),
    ],
    ViewportDimensions: {
      width: 500,
      height: 500,
      devicePixelRatio: 1,
    },
  };

  const result = await UsesResponsiveImagesSnapshot.audit(artifacts);

  expect(result.score).toEqual(1);
  expect(result.details.items).toEqual([]);
});

it('ignores images with no natural dimensions', async () => {
  const artifacts = {
    ImageElements: [
      mockElement(),
    ],
    ViewportDimensions: {
      width: 500,
      height: 500,
      devicePixelRatio: 1,
    },
  };

  const result = await UsesResponsiveImagesSnapshot.audit(artifacts);

  expect(result.score).toEqual(1);
  expect(result.details.items).toEqual([]);
});

it('uses pixel ratio to compute used pixels', async () => {
  const artifacts = {
    ImageElements: [
      mockElement({naturalDimensions: {width: 400, height: 400}}),
      mockElement({naturalDimensions: {width: 500, height: 500}}),
    ],
    ViewportDimensions: {
      width: 500,
      height: 500,
      devicePixelRatio: 2,
    },
  };

  const result = await UsesResponsiveImagesSnapshot.audit(artifacts);

  expect(result.score).toEqual(0);
  expect(result.details.items).toMatchObject([
    {
      actualDimensions: '500x500',
      displayedDimensions: '400x400',
      url: 'https://www.paulirish.com/avatar150.jpg',
    },
  ]);
});

it('passes if pixel difference is within the threshold', async () => {
  const artifacts = {
    ImageElements: [
      mockElement({naturalDimensions: {width: 201, height: 200}}),
    ],
    ViewportDimensions: {
      width: 500,
      height: 500,
      devicePixelRatio: 1,
    },
  };

  const result = await UsesResponsiveImagesSnapshot.audit(artifacts);

  expect(result.score).toEqual(1);
  expect(result.details.items).toMatchObject([
    {
      actualDimensions: '201x200',
      displayedDimensions: '200x200',
      url: 'https://www.paulirish.com/avatar150.jpg',
      node: {
        boundingRect: {
          bottom: 250,
          height: 200,
          left: 50,
          right: 250,
          top: 50,
          width: 200,
        },
        lhId: '__nodeid__',
        nodeLabel: 'img',
        path: '1,HTML,1,BODY,1,DIV,1,IMG',
        selector: 'body > div > img',
        snippet: '<img src="https://www.paulirish.com/avatar150.jpg">',
        type: 'node',
      },
    },
  ]);
});
