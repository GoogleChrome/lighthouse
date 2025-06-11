/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import UnsizedImagesAudit from '../../audits/unsized-images.js';

function generateImage(props, src = 'https://google.com/logo.png', isCss = false,
  isInShadowDOM = false, computedStyles = {position: 'static'}, node = {boundingRect: {}}) {
  const image = {src, isCss, isInShadowDOM, computedStyles, node};
  Object.assign(image, props);
  return image;
}

describe('Sized images audit', () => {
  function runAudit(props) {
    const result = UnsizedImagesAudit.audit({
      ImageElements: [
        generateImage(props),
      ],
    });
    return result;
  }

  it('passes when an image is a css image', async () => {
    const result = await runAudit({
      isCss: true,
      attributeWidth: '',
      attributeHeight: '',
      cssEffectiveRules: {
        width: null,
        height: null,
      },
    });
    expect(result.score).toEqual(1);
    expect(result.metricSavings).toEqual({CLS: 0});
  });

  it('passes when an image is a shadowroot image', async () => {
    const result = await runAudit({
      isInShadowDOM: true,
      attributeWidth: '',
      attributeHeight: '',
      cssEffectiveRules: {
        width: null,
        height: null,
      },
    });
    expect(result.score).toEqual(1);
    expect(result.metricSavings).toEqual({CLS: 0});
  });

  it('passes when an image has absolute css position', async () => {
    const result = await runAudit({
      computedStyles: {position: 'absolute'},
      attributeWidth: '',
      attributeHeight: '',
      cssEffectiveRules: {
        width: null,
        height: null,
      },
    });
    expect(result.score).toEqual(1);
    expect(result.metricSavings).toEqual({CLS: 0});
  });

  it('passes when an image has fixed css position', async () => {
    const result = await runAudit({
      computedStyles: {position: 'fixed'},
      attributeWidth: '',
      attributeHeight: '',
      cssEffectiveRules: {
        width: null,
        height: null,
      },
    });
    expect(result.score).toEqual(1);
    expect(result.metricSavings).toEqual({CLS: 0});
  });

  it('passes when an image is a non-network SVG data url base64', async () => {
    const result = await runAudit({
      attributeWidth: '',
      attributeHeight: '',
      cssEffectiveRules: {
        width: null,
        height: null,
      },
      src: 'data:image/svg+xml;base64,foo',
    });
    expect(result.score).toEqual(1);
    expect(result.metricSavings).toEqual({CLS: 0});
  });

  it('passes when an image is a non-network SVG data url with encoded characters', async () => {
    const result = await runAudit({
      attributeWidth: '',
      attributeHeight: '',
      cssEffectiveRules: {
        width: null,
        height: null,
      },
      src: 'data:image/svg+xml,%3csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20version=%271.1%27%20width=%27200%27%20height=%27200%27/%3e',
    });
    expect(result.score).toEqual(1);
    expect(result.metricSavings).toEqual({CLS: 0});
  });

  describe('has empty width', () => {
    it('fails when an image only has attribute height', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: null,
          height: null,
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('fails when an image only has css height', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '',
        cssEffectiveRules: {
          width: null,
          height: '100',
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('fails when an image only has attribute height & css height', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: null,
          height: '100',
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('fails a network svg', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: null,
          height: '100',
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });
  });

  describe('has empty height', () => {
    it('fails when an image only has attribute width', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '',
        cssEffectiveRules: {
          width: null,
          height: null,
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('fails when an image only has css width', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '',
        cssEffectiveRules: {
          width: '100',
          height: null,
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('fails when an image only has attribute width & css width', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '',
        cssEffectiveRules: {
          width: '100',
          height: null,
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });
  });

  it('fails when an image has empty width and height', async () => {
    const result = await runAudit({
      attributeWidth: '',
      attributeHeight: '',
      cssEffectiveRules: {
        width: null,
        height: null,
      },
    });
    expect(result.score).toEqual(0);
    expect(result.metricSavings).toEqual({CLS: 0});
  });

  describe('has explicit width and height', () => {
    it('passes when an image has attribute width and css height', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '',
        cssEffectiveRules: {
          width: null,
          height: '100',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has attribute width and attribute height', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: null,
          height: null,
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has css width and attribute height', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: '100',
          height: null,
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has css width and css height', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '',
        cssEffectiveRules: {
          width: '100',
          height: '100',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has css & attribute width and css height', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '',
        cssEffectiveRules: {
          width: '100',
          height: '100',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has css & attribute width and attribute height', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: '100',
          height: null,
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has css & attribute height and css width', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: '100',
          height: '100',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has css & attribute height and attribute width', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: null,
          height: '100',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has css & attribute height and css & attribute width', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: '100',
          height: '100',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has attribute width/height of zero', async () => {
      const result = await runAudit({
        attributeWidth: '0',
        attributeHeight: '0',
        cssEffectiveRules: {
          width: null,
          height: null,
        },
        node: {
          boundingRect: {
            width: 0,
            height: 0,
          },
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image is unsized, but its parent is not displayed', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '',
        cssEffectiveRules: {
          width: null,
          height: null,
        },
        node: {
          boundingRect: {
            width: 0,
            height: 0,
          },
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });
  });

  describe('has invalid or non-explicit width', () => {
    it('fails when an image has invalid width attribute', async () => {
      const result = await runAudit({
        attributeWidth: '-200',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: null,
          height: null,
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('fails when an image has invalid height attribute', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '-200',
        cssEffectiveRules: {
          width: null,
          height: null,
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('fails when an image has non-explicit css width', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '',
        cssEffectiveRules: {
          width: 'auto',
          height: '100',
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('fails when an image has non-explicit css height', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '',
        cssEffectiveRules: {
          width: '100',
          height: 'auto',
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has invalid width attribute, and explicit css width', async () => {
      const result = await runAudit({
        attributeWidth: '-200',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: '100',
          height: null,
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has invalid height attribute, and valid css height', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '-200',
        cssEffectiveRules: {
          width: null,
          height: '100',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has nonexplicit css width, and valid attribute width', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '',
        cssEffectiveRules: {
          width: 'auto',
          height: '100',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has nonexplicit css height, and valid attribute height', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: '100',
          height: 'auto',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has nonexplicit css width & height, and valid attribute width & height', // eslint-disable-line max-len
    async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '100',
        cssEffectiveRules: {
          width: 'auto',
          height: 'auto',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when an image has invalid attribute width & height, and valid css width & height',
    async () => {
      const result = await runAudit({
        attributeWidth: '-200',
        attributeHeight: '-200',
        cssEffectiveRules: {
          width: '100',
          height: '100',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('fails when an image has invalid attribute width & height, and nonexplicit css width & height', // eslint-disable-line max-len
    async () => {
      const result = await runAudit({
        attributeWidth: '-200',
        attributeHeight: '-200',
        cssEffectiveRules: {
          width: 'auto',
          height: 'auto',
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });
  });

  describe('has defined aspect-ratio', () => {
    it('fails when an image only has explicit CSS aspect-ratio', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '',
        cssEffectiveRules: {
          width: null,
          height: null,
          aspectRatio: '1 / 1',
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('fails when an image only has non-explicit CSS aspect-ratio', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '',
        cssEffectiveRules: {
          width: null,
          height: null,
          aspectRatio: 'auto',
        },
      });
      expect(result.score).toEqual(0);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when CSS aspect-ratio and attribute width are explicit', async () => {
      const result = await runAudit({
        attributeWidth: '100',
        attributeHeight: '',
        cssEffectiveRules: {
          width: null,
          height: null,
          aspectRatio: '1 / 1',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it('passes when CSS aspect-ratio and width are explicit', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '',
        cssEffectiveRules: {
          width: '100',
          height: null,
          aspectRatio: '1 / 1',
        },
      });
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });
  });

  it('is applicable and passing when there are no images', async () => {
    const result = await UnsizedImagesAudit.audit({
      ImageElements: [],
    });
    expect(result.notApplicable).toBeUndefined();
    expect(result.score).toEqual(1);
    expect(result.metricSavings).toEqual({CLS: 0});
  });

  it('can return multiple unsized images', async () => {
    const result = await UnsizedImagesAudit.audit({
      ImageElements: [
        generateImage(
          {
            attributeWidth: '',
            attributeHeight: '',
            cssEffectiveRules: {
              width: null,
              height: null,
            },
          },
          'image1.png'
        ),
        generateImage(
          {
            attributeWidth: '100',
            attributeHeight: '150',
          },
          'image2.png'
        ),
        generateImage(
          {
            attributeWidth: '',
            attributeHeight: '',
            cssEffectiveRules: {
              width: null,
              height: null,
            },
          },
          'image3.png'
        ),
      ],
    });
    expect(result.score).toEqual(0);
    expect(result.metricSavings).toEqual({CLS: 0});
    expect(result.details.items).toHaveLength(2);
    const srcs = result.details.items.map(item => item.url);
    expect(srcs).toEqual(['image1.png', 'image3.png']);
  });

  describe('doesn\'t have enough data', () => {
    // https://github.com/GoogleChrome/lighthouse/pull/12065#discussion_r573090652
    it('passes because we didnt gather the data we need to be conclusive', async () => {
      const result = await runAudit({
        attributeWidth: '',
        attributeHeight: '',
        cssEffectiveRules: undefined,
      });
      expect(result.details.items.length).toEqual(0);
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });

    it(`passes because it's html-sized, even we cannot be conclusive about css-sized`, async () => {
      const result = await runAudit({
        attributeWidth: '10',
        attributeHeight: '10',
        cssEffectiveRules: undefined,
      });
      expect(result.details.items.length).toEqual(0);
      expect(result.score).toEqual(1);
      expect(result.metricSavings).toEqual({CLS: 0});
    });
  });
});

describe('html attribute sized check', () => {
  it('fails if it is empty', () => {
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('')).toEqual(false);
  });

  it('handles non-numeric edgecases', () => {
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('zero')).toEqual(false);
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('1002$')).toEqual(true); // interpretted as 1002
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('s-5')).toEqual(false);
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('3,000')).toEqual(true); // interpretted as 3
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('100.0')).toEqual(true); // interpretted as 100
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('2/3')).toEqual(true); // interpretted as 2
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('-2020')).toEqual(false);
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('+2020')).toEqual(false); // see doesHtmlAttrProvideExplicitSize comments about positive-sign
  });

  it('passes on zero input', () => {
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('0')).toEqual(true);
  });

  it('passes on non-zero non-negative integer input', () => {
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('1')).toEqual(true);
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('250')).toEqual(true);
    expect(UnsizedImagesAudit.doesHtmlAttrProvideExplicitSize('4000000')).toEqual(true);
  });
});

describe('CSS property sized check', () => {
  it('fails if it was never defined', () => {
    expect(UnsizedImagesAudit.isCssPropExplicitlySet(undefined)).toEqual(false);
  });

  it('fails if it is empty', () => {
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('')).toEqual(false);
  });

  it('fails if it is not explicit', () => {
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('auto')).toEqual(false);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('inherit')).toEqual(false);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('unset')).toEqual(false);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('initial')).toEqual(false);
  });

  it('passes if it is defined and explicit', () => {
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('200')).toEqual(true);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('300.5')).toEqual(true);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('150px')).toEqual(true);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('80%')).toEqual(true);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('5cm')).toEqual(true);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('20rem')).toEqual(true);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('7vw')).toEqual(true);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('-20')).toEqual(true);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('0')).toEqual(true);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('three')).toEqual(true);
    expect(UnsizedImagesAudit.isCssPropExplicitlySet('-20')).toEqual(true);
  });
});
