/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ImageSizeResponsiveAudit from '../../audits/image-size-responsive.js';

const WIDTH = 800;
const HEIGHT = 600;

function generateImage(clientSize, naturalDimensions, props, src) {
  const clientRect = {
    clientRect: {
      top: 0,
      bottom: clientSize.displayedHeight,
      left: 0,
      right: clientSize.displayedWidth,
    },
  };
  return {
    computedStyles: {objectFit: 'fill'},
    src,
    naturalDimensions,
    node: {devtoolsNodePath: '1,HTML,1,IMG'},
    ...clientSize,
    ...clientRect,
    ...props,
  };
}

describe('Images: size audit', () => {
  function testImage(condition, data, src = 'https://google.com/logo.png') {
    const description = `identifies when an image ${condition}`;
    it(description, () => {
      const result = ImageSizeResponsiveAudit.audit({
        ImageElements: [
          generateImage(
            {displayedWidth: data.clientSize[0], displayedHeight: data.clientSize[1]},
            {width: data.naturalSize[0], height: data.naturalSize[1]},
            data.props,
            src
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
  }, 'https://google.com/logo.svg');

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
      computedStyles: {objectFit: 'cover'},
    },
  });

  testImage('uses PixelArt scaling', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [5, 5],
    props: {
      computedStyles: {imageRendering: 'pixelated'},
    },
  });

  testImage('uses srcset density descriptor', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [5, 5],
    props: {
      srcset: 'https://google.com/logo.png 1x',
    },
  });

  testImage('wider than the viewport', {
    score: 1,
    clientSize: [1000, 100],
    naturalSize: [5, 5],
  });

  testImage('taller than the viewport', {
    score: 1,
    clientSize: [100, 1000],
    naturalSize: [5, 5],
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

    describe('DPR = higher than 2', () => {
      testImage('is an icon with right size', {
        score: 1,
        clientSize: [64, 64],
        naturalSize: [128, 128],
        devicePixelRatio: 2.625,

      });

      testImage('is an icon with right size', {
        score: 1,
        clientSize: [64, 64],
        naturalSize: [128, 128],
        devicePixelRatio: 3,
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

      testImage('has right size', {
        score: 1,
        clientSize: [65, 65],
        naturalSize: [98, 98],
        devicePixelRatio: 3,
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
          {width: 40, height: 20}
        ),
        generateImage(
          {displayedWidth: 160, displayedHeight: 80},
          {width: 40, height: 20}
        ),
        generateImage(
          {displayedWidth: 60, displayedHeight: 30},
          {width: 40, height: 20}
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
          {width: 40, height: 20},
          {},
          'image1.png'
        ),
        generateImage(
          {displayedWidth: 120, displayedHeight: 60},
          {width: 40, height: 20},
          {},
          'image2.png'
        ),
        generateImage(
          {displayedWidth: 90, displayedHeight: 45},
          {width: 40, height: 20},
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
          {width: 40, height: 20}
        ),
      ],
      ViewportDimensions: {
        innerWidth: WIDTH,
        innerHeight: HEIGHT,
        devicePixelRatio: 2.71,
      },
    });
    assert.equal(result.details.items.length, 1);
    assert.equal(result.details.items[0].expectedSize, '160 x 80');
  });
});
