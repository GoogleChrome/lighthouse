/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */
const Printer = require('../../printer.js');
const assert = require('assert').strict;
const fs = require('fs');
const sampleResults = require('../../../lighthouse-core/test/results/sample_v2.json');

describe('Printer', () => {
  it('accepts valid output paths', () => {
    const path = '/path/to/output';
    assert.equal(Printer.checkOutputPath(path), path);
  });

  it('rejects invalid output paths', () => {
    const path = /** @type {any} */ (undefined);
    assert.notEqual(Printer.checkOutputPath(path), path);
  });

  it('writes file for results', () => {
    const path = './.test-file.json';
    const report = JSON.stringify(sampleResults);
    return Printer.write(report, 'json', path).then(_ => {
      const fileContents = fs.readFileSync(path, 'utf8');
      assert.ok(/lighthouseVersion/gim.test(fileContents));
      fs.unlinkSync(path);
    });
  });

  it('throws for invalid paths', () => {
    const path = '!/#@.json';
    const report = JSON.stringify(sampleResults);
    return Printer.write(report, 'html', path).catch(err => {
      assert.ok(err.code === 'ENOENT');
    });
  });

  it('returns output modes', () => {
    const modes = Printer.getValidOutputOptions();
    assert.ok(Array.isArray(modes));
    assert.ok(modes.length > 1);
    modes.forEach(mode => {
      assert.strictEqual(typeof mode, 'string');
    });
  });
});
