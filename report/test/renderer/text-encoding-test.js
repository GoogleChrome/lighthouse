/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

import pako from 'pako';

import {TextEncoding} from '../../renderer/text-encoding.js';
import {LH_ROOT} from '../../../shared/root.js';

describe('TextEncoding', () => {
  before(() => {
    global.window = {pako};
  });

  after(() => {
    global.window = undefined;
  });

  /** @type {string} */
  async function test(str) {
    for (const gzip of [false, true]) {
      const binary = await TextEncoding.toBase64(str, {gzip});
      const roundtrip = TextEncoding.fromBase64(binary, {gzip});
      expect(roundtrip.length).toEqual(str.length);
      expect(roundtrip).toEqual(str);
    }
  }

  it('works', async () => {
    await test('');
    await test('hello');
    await test('😃');
    await test('{åß∂œ∑´}');
    await test('Some examples of emoji are 😃, 🧘🏻‍♂️, 🌍, 🍞, 🚗, 📞, 🎉, ♥️, 🍆, and 🏁.');
    await test('.'.repeat(125183));
    await test('😃'.repeat(125183));
    await test(fs.readFileSync(LH_ROOT + '/treemap/app/debug.json', 'utf-8'));
  });
});
