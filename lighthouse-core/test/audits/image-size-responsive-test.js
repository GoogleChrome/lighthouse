/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ImageSizeResponsiveAudit = require('../../audits/image-size-responsive.js');
const assert = require('assert').strict;

/* eslint-env jest */

const WIDTH = 800;
const HEIGHT = 600;

function generateImage(clientSize, naturalSize, props, src = 'https://google.com/logo.png') {
  const image = {src, mimeType: 'image/png'};
  const clientRect = {
    clientRect: {
      top: 0,
      bottom: clientSize.displayedHeight,
      left: 0,
      right: clientSize.displayedWidth,
    },
  };
  Object.assign(image, clientSize, naturalSize, clientRect, props);
  return image;
}

describe('Images: size audit', () => {
  function testImage(condition, data) {
    const description = `identifies when an image ${condition}`;
    it(description, () => {
      const result = ImageSizeResponsiveAudit.audit({
        ImageElements: [
          generateImage(
            {displayedWidth: data.clientSize[0], displayedHeight: data.clientSize[1]},
            {naturalWidth: data.naturalSize[0], naturalHeight: data.naturalSize[1]},
            data.props
          ),
        ],
        ViewportDimensions: {
          innerWidth: WIDTH,
          innerHeight: HEIGHT,
          devicePixelRatio: data.devicePixelRatio || 1,
        },
      });
      let details = '';
      if (result.score === 0) {
        const {displayedSize: displayed, actualSize: actual, expectedSize: expected} =
            result.details.items[0];
        details = ` (displayed: ${displayed}, actual: ${actual}, expected: ${expected})`;
      }
      assert.strictEqual(result.score, data.score, `score does not match${details}`);
    });
  }

  testImage('invalid image', {
    score: 0,
    clientSize: [100, 100],
    naturalSize: [5, 5],
  });

  describe('is empty', () => {
    testImage('is empty along width', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [0, 5],
    });

    testImage('is empty along height', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 0],
    });
  });

  describe('too small to bother testing', () => {
    testImage('is too small along width', {
      score: 1,
      clientSize: [1, 100],
      naturalSize: [5, 5],
    });

    testImage('is too small along height', {
      score: 1,
      clientSize: [100, 1],
      naturalSize: [5, 5],
    });
  });

  testImage('is an SVG image', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [5, 5],
    props: {
      mimeType: 'image/svg+xml',
    },
  });

  testImage('is a css image', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [5, 5],
    props: {
      isCss: true,
    },
  });

  testImage('uses object-fit', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [5, 5],
    props: {
      usesObjectFit: true,
    },
  });

  testImage('uses PixelArt scaling', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [5, 5],
    props: {
      usesPixelArtScaling: true,
    },
  });

  testImage('uses srcset density descriptor', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [5, 5],
    props: {
      usesSrcSetDensityDescriptor: true,
    },
  });

  describe('visibility', () => {
    testImage('has no client area', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
    });

    testImage('is above the visible area', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: -1 - 100,
          bottom: -1,
          left: 0,
          right: 100,
        },
      },
    });

    testImage('is almost above the visible area', {
      score: 0,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: - 100,
          bottom: 0,
          left: 0,
          right: 100,
        },
      },
    });

    testImage('is below the visible area', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: HEIGHT + 1,
          bottom: HEIGHT + 1 + 100,
          left: 0,
          right: 100,
        },
      },
    });

    testImage('is almost below the visible area', {
      score: 0,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: HEIGHT,
          bottom: HEIGHT + 100,
          left: 0,
          right: 100,
        },
      },
    });

    testImage('is to the left of the visible area', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: 0,
          bottom: 100,
          left: -1 - 100,
          right: -1,
        },
      },
    });

    testImage('is almost to the left of the visible area', {
      score: 0,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: 0,
          bottom: 100,
          left: -100,
          right: 0,
        },
      },
    });

    testImage('is to the right of the visible area', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: 0,
          bottom: 100,
          left: WIDTH + 1,
          right: WIDTH + 1 + 100,
        },
      },
    });

    testImage('is almost to the right of the visible area', {
      score: 0,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: 0,
          bottom: 100,
          left: WIDTH,
          right: WIDTH + 100,
        },
      },
    });
  });

  describe('check size', () => {
    describe('DPR = 1', () => {
      testImage('is an icon with right size', {
        score: 1,
        clientSize: [64, 64],
        naturalSize: [64, 64],
      });

      testImage('is an icon with an invalid size', {
        score: 0,
        clientSize: [64, 64],
        naturalSize: [63, 63],
      });

      testImage('has right size', {
        score: 1,
        clientSize: [65, 65],
        naturalSize: [49, 49],
      });

      testImage('has an invalid size', {
        score: 0,
        clientSize: [65, 65],
        naturalSize: [48, 48],
      });
    });

    describe('DPR = 2', () => {
      testImage('is an icon with right size', {
        score: 1,
        clientSize: [64, 64],
        naturalSize: [128, 128],
        devicePixelRatio: 2,
      });

      testImage('is an icon with an invalid size', {
        score: 0,
        clientSize: [64, 64],
        naturalSize: [127, 127],
        devicePixelRatio: 2,
      });

      testImage('has right size', {
        score: 1,
        clientSize: [65, 65],
        naturalSize: [98, 98],
        devicePixelRatio: 2,
      });

      testImage('has an invalid size', {
        score: 0,
        clientSize: [65, 65],
        naturalSize: [97, 97],
        devicePixelRatio: 2,
      });
    });

    describe('DPR = 2.625', () => {
      testImage('is an icon with right size', {
        score: 1,
        clientSize: [64, 64],
        naturalSize: [128, 128],
        devicePixelRatio: 2.625,
      });

      testImage('is an icon with an invalid size', {
        score: 0,
        clientSize: [64, 64],
        naturalSize: [127, 127],
        devicePixelRatio: 2.625,
      });

      testImage('has right size', {
        score: 1,
        clientSize: [65, 65],
        naturalSize: [98, 98],
        devicePixelRatio: 2.625,
      });

      testImage('has an invalid size', {
        score: 0,
        clientSize: [65, 65],
        naturalSize: [97, 97],
        devicePixelRatio: 2.625,
      });
    });
  });

  it('de-dupes images', () => {
    const result = ImageSizeResponsiveAudit.audit({
      ImageElements: [
        generateImage(
          {displayedWidth: 80, displayedHeight: 40},
          {naturalWidth: 40, naturalHeight: 20}
        ),
        generateImage(
          {displayedWidth: 160, displayedHeight: 80},
          {naturalWidth: 40, naturalHeight: 20}
        ),
        generateImage(
          {displayedWidth: 60, displayedHeight: 30},
          {naturalWidth: 40, naturalHeight: 20}
        ),
      ],
      ViewportDimensions: {
        innerWidth: WIDTH,
        innerHeight: HEIGHT,
        devicePixelRatio: 1,
      },
    });
    assert.equal(result.details.items.length, 1);
    assert.equal(result.details.items[0].expectedSize, '160 x 80');
  });

  it('sorts images by size delta', () => {
    const result = ImageSizeResponsiveAudit.audit({
      ImageElements: [
        generateImage(
          {displayedWidth: 80, displayedHeight: 40},
          {naturalWidth: 40, naturalHeight: 20},
          {},
          'image1.png'
        ),
        generateImage(
          {displayedWidth: 120, displayedHeight: 60},
          {naturalWidth: 40, naturalHeight: 20},
          {},
          'image2.png'
        ),
        generateImage(
          {displayedWidth: 90, displayedHeight: 45},
          {naturalWidth: 40, naturalHeight: 20},
          {},
          'image3.png'
        ),
      ],
      ViewportDimensions: {
        innerWidth: WIDTH,
        innerHeight: HEIGHT,
        devicePixelRatio: 1,
      },
    });
    assert.equal(result.details.items.length, 3);
    const srcs = result.details.items.map(item => item.url);
    assert.deepEqual(srcs, ['image2.png', 'image3.png', 'image1.png']);
  });

  it('shows the right expected size', () => {
    const result = ImageSizeResponsiveAudit.audit({
      ImageElements: [
        generateImage(
          {displayedWidth: 80, displayedHeight: 40},
          {naturalWidth: 40, naturalHeight: 20}
        ),
      ],
      ViewportDimensions: {
        innerWidth: WIDTH,
        innerHeight: HEIGHT,
        devicePixelRatio: 2.71,
      },
    });
    assert.equal(result.details.items.length, 1);
    assert.equal(result.details.items[0].expectedSize, '217 x 109');
  });
});
