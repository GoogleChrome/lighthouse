/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ImageAspectRatioAudit from '../../audits/image-aspect-ratio.js';

function generateImage(clientSize, naturalDimensions, props, src = 'https://google.com/logo.png') {
  return {
    src,
    computedStyles: {objectFit: 'fill'},
    naturalDimensions,
    node: {devtoolsNodePath: '1,HTML,1,IMG'},
    ...clientSize,
    ...props,
  };
}

describe('Images: aspect-ratio audit', () => {
  function testImage(condition, data) {
    const description = `identifies when an image ${condition}`;
    it(description, () => {
      const result = ImageAspectRatioAudit.audit({
        ImageElements: [
          generateImage(
            {displayedWidth: data.clientSize[0], displayedHeight: data.clientSize[1]},
            {width: data.naturalSize[0], height: data.naturalSize[1]},
            data.props
          ),
        ],
      });

      assert.strictEqual(result.score, data.score, 'score does not match');
    });
  }

  testImage('is a css image', {
    score: 1,
    clientSize: [1000, 20],
    naturalSize: [5, 5],
    props: {
      isCss: true,
    },
  });

  testImage('is much larger than natural aspect ratio', {
    score: 0,
    clientSize: [800, 500],
    naturalSize: [200, 200],
    props: {
      isCss: false,
    },
  });

  testImage('is a css image and much larger than natural aspect ratio', {
    score: 1,
    clientSize: [],
    naturalSize: [200, 200],
    props: {
      isCss: true,
    },
  });

  testImage('is larger than natural aspect ratio', {
    score: 0,
    clientSize: [400, 300],
    naturalSize: [200, 200],
    props: {
      isCss: false,
    },
  });

  testImage('uses object-fit and is much smaller than natural aspect ratio', {
    score: 1,
    clientSize: [200, 200],
    naturalSize: [800, 500],
    props: {
      isCss: false,
      computedStyles: {objectFit: 'cover'},
    },
  });

  testImage('is much smaller than natural aspect ratio', {
    score: 0,
    clientSize: [200, 200],
    naturalSize: [800, 500],
    props: {
      isCss: false,
    },
  });
  testImage('is smaller than natural aspect ratio', {
    score: 0,
    clientSize: [200, 200],
    naturalSize: [400, 300],
    props: {
      isCss: false,
    },
  });

  testImage('is almost the right expected height', {
    score: 1,
    clientSize: [412, 36],
    naturalSize: [800, 69],
    props: {
      isCss: false,
    },
  });

  testImage('is a small aspect ratio with a rounding error', {
    score: 1,
    clientSize: [63, 256],
    naturalSize: [32, 128],
    props: {
      isCss: false,
    },
  });

  testImage('aspect ratios match', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [300, 300],
    props: {
      isCss: false,
    },
  });

  testImage('has no display sizing information', {
    score: 1,
    clientSize: [0, 0],
    naturalSize: [100, 100],
    props: {
      isCss: false,
    },
  });

  testImage('is placeholder image', {
    score: 1,
    clientSize: [300, 220],
    naturalSize: [1, 1],
    props: {
      isCss: false,
    },
  });

  it('skips svg images', () => {
    const result = ImageAspectRatioAudit.audit({
      ImageElements: [
        generateImage(
          {width: 150, height: 150},
          {width: 100, height: 200},
          {
            isCss: false,
            displayedWidth: 150,
            displayedHeight: 150,
          },
          'https://google.com/logo.svg'
        ),
      ],
    });

    assert.strictEqual(result.score, 1, 'score does not match');
  });
});
