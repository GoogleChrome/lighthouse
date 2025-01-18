/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import PreloadFontsAudit from '../../audits/preload-fonts.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

describe('Preload Fonts Audit', () => {
  let networkRecords;
  let stylesheet;
  let context;

  beforeEach(() => {
    stylesheet = {content: '', header: {}};
    context = {computedCache: new Map()};
  });

  function getArtifacts() {
    return {
      devtoolsLogs: {[PreloadFontsAudit.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords)},
      URL: {finalDisplayedUrl: 'https://example.com/foo/bar/page'},
      Stylesheets: [stylesheet],
    };
  }

  describe('font-display is optional', () => {
    it('fails if the font is not preloaded', async () => {
      stylesheet.content = `
        @font-face {
          font-display: optional;
          src: url('/assets/font-a.woff');
        }
      `;

      networkRecords = [
        {
          url: 'https://example.com/assets/font-a.woff',
          resourceType: 'Font',
          isLinkPreload: false,
        },
      ];

      const result = await PreloadFontsAudit.audit(getArtifacts(), context);
      expect(result.score).toEqual(0);
      expect(result.details.items).toEqual([
        {url: networkRecords[0].url},
      ]);
    });

    it('passes if the font is preloaded', async () => {
      stylesheet.content = `
        @font-face {
          font-display: optional;
          src: url('/assets/font-a.woff');
        }
      `;

      networkRecords = [
        {
          url: 'https://example.com/assets/font-a.woff',
          resourceType: 'Font',
          isLinkPreload: true,
        },
      ];

      const result = await PreloadFontsAudit.audit(getArtifacts(), context);
      expect(result.details.items).toEqual([]);
      expect(result.score).toEqual(1);
    });
  });

  describe('font-display is not optional', () => {
    it('passes if the font is not preloaded', async () => {
      stylesheet.content = `
        @font-face {
          src: url('/assets/font-a.woff');
        }
      `;

      networkRecords = [
        {
          url: 'https://example.com/assets/font-a.woff',
          resourceType: 'Font',
          isLinkPreload: false,
        },
      ];

      const result = await PreloadFontsAudit.audit(getArtifacts(), context);
      expect(result.score).toEqual(1);
      expect(result.details.items).toEqual([]);
      expect(result.notApplicable).toEqual(true);
    });

    it('passes if the font is preloaded', async () => {
      stylesheet.content = `
        @font-face {
          src: url('/assets/font-a.woff');
        }
      `;

      networkRecords = [
        {
          url: 'https://example.com/assets/font-a.woff',
          resourceType: 'Font',
          isLinkPreload: true,
        },
      ];

      const result = await PreloadFontsAudit.audit(getArtifacts(), context);
      expect(result.score).toEqual(1);
      expect(result.details.items).toEqual([]);
      expect(result.notApplicable).toEqual(true);
    });
  });

  it('is not applicable on fonts where font-display is not optional', async () => {
    stylesheet.content = `
      @font-face {
        font-display: swap;
        src: url('/assets/font-a.woff');
      }

      @font-face {
        font-display: block;
        src: url('https://example.com/foo/bar/document-font.woff');
      }

      @font-face {
        font-display: fallback;
        src: url('/assets/font-b.woff');
      }

      @font-face {
        src: url('/assets/font-c.woff');
      }
    `;

    networkRecords = [];

    const result = await PreloadFontsAudit.audit(getArtifacts(), context);
    expect(result.score).toEqual(1);
    expect(result.details.items).toEqual([]);
    expect(result.notApplicable).toEqual(true);
  });

  it('handles multiple fonts', async () => {
    stylesheet.content = `
      @font-face {
        font-display: optional;
        src: url('/assets/font-a.woff');
      }

      @font-face {
        font-display: optional;
        src: url('https://example.com/foo/bar/document-font.woff');
      }

      @font-face {
        font-display: fallback;
        src: url('/assets/font-b.woff');
      }

      @font-face {
        font-display: optional;
        src: url('/assets/font-c.woff');
      }
    `;

    networkRecords = [
      {
        url: 'https://example.com/assets/font-a.woff',
        resourceType: 'Font',
        isLinkPreload: true,
      },
      {
        url: 'https://example.com/foo/bar/document-font.woff',
        resourceType: 'Font',
        isLinkPreload: false,
      },
      {
        url: 'https://example.com/assets/font-b.woff',
        resourceType: 'Font',
        isLinkPreload: true,
      },
      {
        url: 'https://example.com/assets/font-c.woff',
        resourceType: 'Font',
        isLinkPreload: false,
      },
    ];

    const result = await PreloadFontsAudit.audit(getArtifacts(), context);
    expect(result.score).toEqual(0);
    expect(result.details.items).toEqual([
      {url: networkRecords[1].url},
      {url: networkRecords[3].url},
    ]);
  });
});
