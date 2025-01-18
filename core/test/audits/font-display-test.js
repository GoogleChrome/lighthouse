/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import FontDisplayAudit from '../../audits/font-display.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

describe('Performance: Font Display audit', () => {
  let networkRecords;
  let stylesheet;
  let context;

  beforeEach(() => {
    stylesheet = {content: '', header: {}};
    context = {computedCache: new Map()};
  });

  function getArtifacts() {
    return {
      devtoolsLogs: {[FontDisplayAudit.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalDisplayedUrl: 'https://example.com/foo/bar/page'},
      Stylesheets: [stylesheet],
    };
  }

  it('fails when not all fonts have a correct font-display rule', async () => {
    stylesheet.content = `
      @font-face {
        /* try with " */
        src: url("./font-a.woff");
      }

      @font-face {
        font-display: 'optional'; // invalid quotes, should still fail for being invalid rule
        /* try up a directory with ' */
        src: url('../font-b.woff');
      }

      @font-face {
        font-display: optional // missing a semi-colon, should still fail for being invalid block
        /* try no path with no quotes ' */
        src: url(font.woff);
      }
    `;

    networkRecords = [
      {
        url: 'https://example.com/foo/bar/font-a.woff',
        networkEndTime: 3000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
      {
        url: 'https://example.com/foo/font-b.woff',
        networkEndTime: 5000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
      {
        url: 'https://example.com/foo/bar/font.woff',
        networkEndTime: 2000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
    ];

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    const items = [
      {url: networkRecords[0].url, wastedMs: 2000},
      {url: networkRecords[1].url, wastedMs: 3000},
      {url: networkRecords[2].url, wastedMs: 1000},
    ];
    expect(result.score).toEqual(0);
    expect(result.details.items).toEqual(items);
    expect(result.warnings).toEqual([]);
  });

  it('resolves URLs relative to stylesheet URL when available', async () => {
    stylesheet.header.sourceURL = 'https://cdn.example.com/foo/bar/file.css';
    stylesheet.content = `
      @font-face {
        font-display: block;
        /* try with " and same directory */
        src: url("./font-a.woff");
      }

      @font-face {
        font-display: block;
        /* try with " and site origin */
        src: url("https://example.com/foo/bar/document-font.woff");
      }

      @font-face {
        font-display: fallback;
        /* try up a directory with ' */
        src: url('../font-b.woff');
      }

      @font-face {
        font-display: optional;
        /* try no path with no quotes ' */
        src: url(font.woff);
      }
    `;

    networkRecords = [
      {
        url: 'https://example.com/foo/bar/document-font.woff',
        networkEndTime: 3000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
      {
        url: 'https://cdn.example.com/foo/bar/font-a.woff',
        networkEndTime: 3000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
      {
        url: 'https://cdn.example.com/foo/font-b.woff',
        networkEndTime: 5000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
      {
        url: 'https://cdn.example.com/foo/bar/font.woff',
        networkEndTime: 2000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
    ];

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    expect(result.score).toEqual(1);
    expect(result.details.items).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('passes when all fonts have a correct font-display rule', async () => {
    stylesheet.content = `
      @font-face {
        /* make sure we can handle carriage returns */
        \r\n
        font-display: block;
        /* try with " */
        src: url("./font-a.woff");
      }

      @font-face {\r
        font-display: fallback;
        /* try up a directory with ' */
        src: url('../font-b.woff');
      }

      @font-face {\n
        font-display: optional;
        /* try no path with no quotes ' */
        src: url(font.woff);
      }
    `;

    networkRecords = [
      {
        url: 'https://example.com/foo/bar/font-a.woff',
        networkEndTime: 3000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
      {
        url: 'https://example.com/foo/font-b.woff',
        networkEndTime: 5000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
      {
        url: 'https://example.com/foo/bar/font.woff',
        networkEndTime: 2000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
      {
        url: 'data:application/font-woff',
        networkEndTime: 7000, networkRequestTime: 1000,
        resourceType: 'Font',
      },
    ];

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    expect(result.score).toEqual(1);
    expect(result.details.items).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('should handle real-world font-face declarations', async () => {
    /* eslint-disable max-len, no-useless-escape */
    stylesheet.content = `
      @font-face{font-family:CNN Clock;src:url(//edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.eot) format("embedded-opentype"),url(//edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.woff2) format("woff2"),url(//edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.woff) format("woff"),url(//edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.ttf) format("truetype");font-weight:900;font-style:normal}
      @font-face{font-family:FAVE-CNN;src:url(
        "//registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.eot")
        ;src:       url("//registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.eot?#iefix") format("embedded-opentype"),url("//registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.woff") format("woff"),url("//registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.ttf") format("truetype"),url("//registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.svg?#cnn-icons") format("svg");font-weight:700;font-style:normal}
      @font-face{font-family:\'FontAwesome\';src:url(\'../fonts/fontawesome-webfont.eot?v=4.6.1\');src:url(\'../fonts/fontawesome-webfont.eot?#iefix&v=4.6.1\') format(\'embedded-opentype\'),url(\'../fonts/fontawesome-webfont.woff2?v=4.6.1\') format(\'woff2\'),url(\'../fonts/fontawesome-webfont.woff?v=4.6.1\') format(\'woff\'),url(\'../fonts/fontawesome-webfont.ttf?v=4.6.1\') format(\'truetype\'),url(\'../fonts/fontawesome-webfont.svg?v=4.6.1#fontawesomeregular\') format(\'svg\');font-weight:normal;font-style:normal;font-display:swap;}
      @font-face {   font-family: \'Lato\';   font-style: normal;   font-weight: 900;   src: local(\'Lato Black\'), local(\'Lato-Black\'), url(https://fonts.gstatic.com/s/lato/v14/S6u9w4BMUTPHh50XSwiPGQ3q5d0.woff2) format(\'woff2\');   unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
    `;
    /* eslint-enable max-len, no-useless-escape */

    networkRecords = [
      {
        url: 'https://edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.woff2',
        networkRequestTime: 1000, networkEndTime: 5000,
        resourceType: 'Font',
      },
      {
        url: 'https://registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.woff',
        networkRequestTime: 1000, networkEndTime: 5000,
        resourceType: 'Font',
      },
      {
        url: 'https://example.com/foo/fonts/fontawesome-webfont.woff2?v=4.6.1',
        networkRequestTime: 1000, networkEndTime: 5000,
        resourceType: 'Font',
      },
      {
        url: 'https://fonts.gstatic.com/s/lato/v14/S6u9w4BMUTPHh50XSwiPGQ3q5d0.woff2',
        networkRequestTime: 1000, networkEndTime: 5000,
        resourceType: 'Font',
      },
    ];

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    expect(result.score).toEqual(0);
    expect(result.details.items.map(item => item.url)).toEqual([
      'https://edition.i.cdn.cnn.com/.a/fonts/cnn/3.7.2/cnnclock-black.woff2',
      'https://registry.api.cnn.io/assets/fave/fonts/2.0.15/cnnsans-bold.woff',
      // FontAwesome should pass
      // 'https://example.com/foo/fonts/fontawesome-webfont.woff2?v=4.6.1',
      'https://fonts.gstatic.com/s/lato/v14/S6u9w4BMUTPHh50XSwiPGQ3q5d0.woff2',
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('handles varied font-display declarations', async () => {
    stylesheet.content = `
      @font-face {
        src: url(font-0.woff);
        font-display: swap
      }

      @font-face {src: url(font-1.woff);font-display   : fallback
      }

      @font-face {
        src: url(font-2.woff);
        font-display:optional}

      @font-face {
        src: url(font-3.woff);
        font-display    :  swap  ;  }

      @font-face {src: url(font-4.woff);font-display:swap;}
    `;

    networkRecords = Array.from({length: 5}).map((_, idx) => ({
      url: `https://example.com/foo/bar/font-${idx}.woff`,
      networkEndTime: 2000, networkRequestTime: 1000,
      resourceType: 'Font',
    }));

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    expect(result.details.items).toEqual([]);
    expect(result.score).toEqual(1);
    expect(result.warnings).toEqual([]);
  });

  it('handles custom source URLs from sourcemaps', async () => {
    // Make sure we don't use sourceURL when it's not a valid URL, see https://github.com/GoogleChrome/lighthouse/issues/8534
    stylesheet.header.sourceURL = 'custom-url-from-source-map';
    stylesheet.content = `
      @font-face {
        src: url(font-0.woff);
        font-display: swap
      }
    `;

    networkRecords = [{
      url: `https://example.com/foo/bar/font-0.woff`,
      networkEndTime: 2000, networkRequestTime: 1000,
      resourceType: 'Font',
    }];

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    expect(result.details.items).toEqual([]);
    expect(result.score).toEqual(1);
  });

  it('should not flag a URL for which there is not @font-face at all', async () => {
    // Sometimes the content does not come through, see https://github.com/GoogleChrome/lighthouse/issues/8493
    stylesheet.content = ``;

    networkRecords = [{
      url: `https://example.com/foo/bar/font-0.woff`,
      networkEndTime: 2000, networkRequestTime: 1000,
      resourceType: 'Font',
    }];

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    expect(result.details.items).toEqual([]);
    expect(result.score).toEqual(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0])
      .toBeDisplayString(/value for the origin https:\/\/example\.com\.$/);
  });

  it('should handle mixed content', async () => {
    networkRecords = [{
      url: `https://example.com/foo/bar/font-0.woff`,
      networkEndTime: 2000, networkRequestTime: 1000,
      resourceType: 'Font',
    }, {
      url: `https://example.com/foo/bar/font-1.woff`,
      networkEndTime: 2000, networkRequestTime: 1000,
      resourceType: 'Font',
    }];

    const artifacts = getArtifacts();
    artifacts.Stylesheets = [
      {content: '', header: {}},
      {
        content: `
          @font-face {
            /* try with " */
            src: url("./font-0.woff");
          }
        `,
        header: {},
      },
    ];
    const result = await FontDisplayAudit.audit(artifacts, context);
    expect(result.details.items).toEqual([{
      url: `https://example.com/foo/bar/font-0.woff`,
      wastedMs: 1000,
    }]);
    expect(result.score).toEqual(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0])
      .toBeDisplayString(/value for the origin https:\/\/example\.com\.$/);
  });

  it('should dedupe warnings by origin when there are multiple uncheckable fonts', async () => {
    stylesheet.content = ``;

    networkRecords = [{
      url: 'https://example.com/foo/bar/font-a.woff',
      networkEndTime: 3000, networkRequestTime: 1000,
      resourceType: 'Font',
    }, {
      url: 'https://example.com/foo/font-b.woff',
      networkEndTime: 5000, networkRequestTime: 1000,
      resourceType: 'Font',
    }, {
      url: 'https://example.com/foo/bar/font.woff',
      networkEndTime: 2000, networkRequestTime: 1000,
      resourceType: 'Font',
    }, {
      url: 'https://fonts.gstatic.com/s/would-you-look-at-this-font.woff2',
      networkEndTime: 7000, networkRequestTime: 1000,
      resourceType: 'Font',
    }];

    const result = await FontDisplayAudit.audit(getArtifacts(), context);
    expect(result.details.items).toHaveLength(0);
    expect(result.score).toEqual(1);

    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0])
      // Plural 'values' for multiple fonts.
      .toBeDisplayString(/values for the origin https:\/\/example\.com\.$/);
    expect(result.warnings[1])
      .toBeDisplayString(/value for the origin https:\/\/fonts\.gstatic\.com\.$/);
  });
});
