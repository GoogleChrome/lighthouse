/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const KB = 1024;
const ResponsesAreCompressedAudit =
  require('../../../audits/byte-efficiency/uses-text-compression.js');
const assert = require('assert').strict;

function generateResponse(options) {
  return Object.assign({
    url: `http://google.com/${options.file}`,
    transferSize: options.resourceSize || 0,
    resourceSize: 0,
    gzipSize: 0,
  }, options);
}

/* eslint-env jest */

describe('Page uses optimized responses', () => {
  it('fails when responses are collectively unoptimized', () => {
    const auditResult = ResponsesAreCompressedAudit.audit_({
      ResponseCompression: [
        generateResponse({file: 'index.js', resourceSize: 100 * KB, gzipSize: 90 * KB}), // 10kb & 10%
        generateResponse({file: 'index.css', resourceSize: 50 * KB, gzipSize: 37 * KB}), //  13kb & 26% (hit)
        generateResponse({file: 'index.json', resourceSize: 2048 * KB, gzipSize: 1024 * KB}), // 1024kb & 50% (hit)
      ],
    });

    assert.equal(auditResult.items.length, 2);
  });

  it('passes when all responses are sufficiently optimized', () => {
    const auditResult = ResponsesAreCompressedAudit.audit_({
      ResponseCompression: [
        generateResponse({file: 'index.js', resourceSize: 1000 * KB, gzipSize: 910 * KB}), // 90kb & 9%
        generateResponse({file: 'index.css', resourceSize: 6 * KB, gzipSize: 4.5 * KB}), // 1,5kb & 25% (hit)
        generateResponse({file: 'index.json', resourceSize: 10 * KB, gzipSize: 10 * KB}), // 0kb & 0%
        generateResponse({file: 'compressed.json', resourceSize: 10 * KB, transferSize: 3 * KB,
          gzipSize: 6 * KB}), // 0kb & 0%
      ],
    });

    assert.equal(auditResult.items.length, 1);
  });
});
