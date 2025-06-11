/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ResponsesAreCompressedAudit from '../../../audits/byte-efficiency/uses-text-compression.js';

const KB = 1024;
const MB = 1024 * KB;

function generateResponse(options) {
  return {
    url: `http://google.com/${options.file}`,
    transferSize: options.resourceSize || 0,
    resourceSize: 0,
    gzipSize: 0,
    ...options,
  };
}

describe('Page uses optimized responses', () => {
  it('applies a threshold', () => {
    const auditResult = ResponsesAreCompressedAudit.audit_({
      ResponseCompression: [
        generateResponse({file: 'index.js', resourceSize: 1000 * KB, gzipSize: 910 * KB}), // 90kb (hit)
        generateResponse({file: 'index.css', resourceSize: 6 * KB, gzipSize: 4.8 * KB}), // 1.2kb
        generateResponse({file: 'index2.css', resourceSize: 50 * KB, gzipSize: 37 * KB}), //  13kb (hit)
        generateResponse({file: 'index.json', resourceSize: 10 * KB, gzipSize: 10 * KB}), // 0kb
        generateResponse({file: 'uncompressed.xcustom', resourceSize: 11 * MB, gzipSize: 10 * MB}), // 1mb (hit)
        generateResponse({file: 'compressed.json', resourceSize: 10 * KB, transferSize: 3 * KB,
          gzipSize: 6 * KB}), // 0kb
      ],
    });

    expect(auditResult.items.map(item => item.url)).toEqual(
      ['http://google.com/index.js', 'http://google.com/index2.css', 'http://google.com/uncompressed.xcustom']);
  });
});
