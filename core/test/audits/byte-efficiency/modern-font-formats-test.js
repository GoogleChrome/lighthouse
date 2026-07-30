/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ModernFontFormats, {
  IGNORE_THRESHOLD_IN_BYTES,
  W3C_MEDIAN_SAVINGS_RATIOS,
} from '../../../audits/byte-efficiency/modern-font-formats.js';

const KB = 1024;

const LEGACY_FORMAT_CASES = [
  {
    format: 'ttf',
    canonicalMimeType: 'font/ttf',
    legacyMimeTypes: ['application/x-font-ttf'],
  },
  {
    format: 'otf',
    canonicalMimeType: 'font/otf',
    legacyMimeTypes: ['application/x-font-opentype'],
  },
  {
    format: 'woff',
    canonicalMimeType: 'font/woff',
    legacyMimeTypes: ['application/font-woff', 'application/x-font-woff'],
  },
];

const WOFF2_MIME_TYPES = [
  'font/woff2',
  'application/font-woff2',
  'application/x-font-woff2',
];

/**
 * @param {Partial<LH.Artifacts.NetworkRequest> & {url: string}} overrides
 * @return {LH.Artifacts.NetworkRequest}
 */
function makeRecord(overrides) {
  return /** @type {LH.Artifacts.NetworkRequest} */ ({
    resourceType: 'Font',
    mimeType: '',
    resourceSize: 100 * KB,
    transferSize: 100 * KB,
    protocol: 'h2',
    parsedURL: {
      scheme: 'https',
      host: 'example.com',
      securityOrigin: 'https://example.com',
    },
    ...overrides,
  });
}

describe('Modern font formats audit', () => {
  it('uses W3C corpus medians to estimate savings for TTF, OTF, and WOFF fonts', () => {
    assert.deepEqual(W3C_MEDIAN_SAVINGS_RATIOS, {
      ttf: 0.6212,
      otf: 0.4969,
      woff: 0.1351,
    });

    const records = LEGACY_FORMAT_CASES.map(({format, canonicalMimeType}) =>
      makeRecord({
        url: `https://example.com/font.${format}`,
        mimeType: canonicalMimeType,
      })
    );

    const result = ModernFontFormats.audit_({} /** @type {LH.Artifacts} */, records);

    assert.deepEqual(result.items.map(item => ({
      format: item.format,
      wastedBytes: item.wastedBytes,
      wastedPercent: item.wastedPercent,
    })), LEGACY_FORMAT_CASES.map(({format}) => ({
      format: format.toUpperCase(),
      wastedBytes: 100 * KB -
        Math.round(100 * KB * (1 - W3C_MEDIAN_SAVINGS_RATIOS[format])),
      wastedPercent: W3C_MEDIAN_SAVINGS_RATIOS[format] * 100,
    })));
  });

  it('recognizes canonical, legacy, mixed-case, and parameterized MIME types', () => {
    for (const {format, canonicalMimeType, legacyMimeTypes} of LEGACY_FORMAT_CASES) {
      for (const mimeType of [canonicalMimeType, ...legacyMimeTypes]) {
        const record = makeRecord({
          url: 'https://example.com/font.bin',
          mimeType,
        });

        assert.equal(ModernFontFormats.getFontFormat(record), format, mimeType);
      }

      const mixedCase = makeRecord({
        url: 'https://example.com/font.bin',
        mimeType: `${canonicalMimeType.toUpperCase()}; charset=binary`,
      });
      assert.equal(ModernFontFormats.getFontFormat(mixedCase), format);
    }
  });

  it('ignores all supported WOFF2 MIME types and non-font resources', () => {
    const records = WOFF2_MIME_TYPES.map((mimeType, index) =>
      makeRecord({
        url: `https://example.com/font-${index}.woff`,
        mimeType,
      })
    );
    records.push(
      makeRecord({
        url: 'https://example.com/font.ttf',
        mimeType: 'font/ttf',
        resourceType: 'Other',
      })
    );

    const result = ModernFontFormats.audit_({} /** @type {LH.Artifacts} */, records);

    assert.equal(result.items.length, 0);
  });

  it('prefers a recognized MIME type over a misleading extension', () => {
    for (const {format, canonicalMimeType} of LEGACY_FORMAT_CASES) {
      const legacy = makeRecord({
        url: 'https://example.com/font.woff2',
        mimeType: canonicalMimeType,
      });
      assert.equal(ModernFontFormats.getFontFormat(legacy), format);
    }

    for (const mimeType of WOFF2_MIME_TYPES) {
      const modern = makeRecord({
        url: 'https://example.com/font.ttf',
        mimeType,
      });
      assert.equal(ModernFontFormats.getFontFormat(modern), undefined);
    }
  });

  it('falls back to the URL extension for generic or missing MIME types', () => {
    const records = [
      makeRecord({
        url: 'https://example.com/font.TTF?v=1',
        mimeType: 'application/octet-stream',
      }),
      makeRecord({
        url: 'https://example.com/font.otf#font',
        mimeType: '',
      }),
      makeRecord({
        url: 'https://example.com/font.woff?download=true',
        mimeType: 'binary/octet-stream',
      }),
    ];

    assert.deepEqual(records.map(ModernFontFormats.getFontFormat), ['ttf', 'otf', 'woff']);
  });

  it('ignores unknown formats', () => {
    const records = [makeRecord({
      url: 'https://example.com/font.bin',
      mimeType: 'application/octet-stream',
    })];

    const result = ModernFontFormats.audit_({} /** @type {LH.Artifacts} */, records);

    assert.equal(result.items.length, 0);
  });

  it('applies the aggregate savings threshold to every legacy format', () => {
    for (const {format, canonicalMimeType} of LEGACY_FORMAT_CASES) {
      const ratio = W3C_MEDIAN_SAVINGS_RATIOS[format];
      const belowThresholdBytes = Math.floor((IGNORE_THRESHOLD_IN_BYTES - 1) / ratio);
      const atThresholdBytes = Math.ceil(IGNORE_THRESHOLD_IN_BYTES / ratio);

      const belowThreshold = ModernFontFormats.audit_({} /** @type {LH.Artifacts} */, [
        makeRecord({
          url: `https://example.com/small.${format}`,
          mimeType: canonicalMimeType,
          resourceSize: belowThresholdBytes,
          transferSize: belowThresholdBytes,
        }),
      ]);
      const atThreshold = ModernFontFormats.audit_({} /** @type {LH.Artifacts} */, [
        makeRecord({
          url: `https://example.com/large.${format}`,
          mimeType: canonicalMimeType,
          resourceSize: atThresholdBytes,
          transferSize: atThresholdBytes,
        }),
      ]);

      assert.equal(belowThreshold.items.length, 0, format);
      assert.equal(atThreshold.items.length, 1, format);
    }
  });

  it('reports multiple fonts when their combined savings exceed the threshold', () => {
    const totalBytes = Math.floor(IGNORE_THRESHOLD_IN_BYTES /
      W3C_MEDIAN_SAVINGS_RATIOS.woff / 2) + 1;
    const records = [
      makeRecord({
        url: 'https://example.com/regular.woff',
        mimeType: 'font/woff',
        resourceSize: totalBytes,
        transferSize: totalBytes,
      }),
      makeRecord({
        url: 'https://example.com/bold.woff',
        mimeType: 'font/woff',
        resourceSize: totalBytes,
        transferSize: totalBytes,
      }),
    ];

    const result = ModernFontFormats.audit_({} /** @type {LH.Artifacts} */, records);

    assert.equal(result.items.length, 2);
    assert.ok(result.items.every(item => item.wastedBytes < IGNORE_THRESHOLD_IN_BYTES));
  });

  it('uses resource size when transfer size is zero or missing', () => {
    const records = LEGACY_FORMAT_CASES.map(({format, canonicalMimeType}, index) =>
      makeRecord({
        url: `https://example.com/cached.${format}`,
        mimeType: canonicalMimeType,
        transferSize: index % 2 ? undefined : 0,
      })
    );

    const result = ModernFontFormats.audit_({} /** @type {LH.Artifacts} */, records);

    assert.deepEqual(result.items.map(item => item.totalBytes), [
      100 * KB,
      100 * KB,
      100 * KB,
    ]);
  });

  it('uses the smaller network size and deduplicates repeated URLs', () => {
    const url = 'https://example.com/font.ttf';
    const records = [
      makeRecord({url, mimeType: 'font/ttf', resourceSize: 100 * KB, transferSize: 80 * KB}),
      makeRecord({url, mimeType: 'font/ttf', resourceSize: 100 * KB, transferSize: 100 * KB}),
    ];

    const result = ModernFontFormats.audit_({} /** @type {LH.Artifacts} */, records);

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].totalBytes, 100 * KB);
  });
});
