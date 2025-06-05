/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';

import {readJson} from '../../../core/test/test-utils.js';
import * as Printer from '../../printer.js';

const sampleResults = readJson('../../../core/test/results/sample_v2.json', import.meta);

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
    const path = '//#@.json';
    const report = JSON.stringify(sampleResults);
    return assert.rejects(Printer.write(report, 'html', path));
  });

  it('returns output modes', () => {
    const modes = Printer.getValidOutputOptions();
    assert.ok(Array.isArray(modes));
    assert.ok(modes.length > 1);
    modes.forEach(mode => {
      assert.strictEqual(typeof mode, 'string');
    });
  });

  it('creates missing directories when writing to file', () => {
    const dirPath = './non/existent/directory/.test-file.json';
    const report = JSON.stringify(sampleResults);
    const dir = path.dirname(dirPath);
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir, {recursive: true});
    }
    return Printer.write(report, 'json', dirPath).then(_ => {
      assert.ok(fs.existsSync(dir), `Directory ${dir} should exist now`);
      const fileContents = fs.readFileSync(dirPath, 'utf8');
      assert.ok(/lighthouseVersion/gim.test(fileContents));
      fs.unlinkSync(dirPath);
      fs.rmdirSync(dir, {recursive: true});
    });
  });
});
