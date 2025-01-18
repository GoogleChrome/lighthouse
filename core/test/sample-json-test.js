/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {readJson} from './test-utils.js';

const sampleJson = readJson('./results/sample_v2.json', import.meta);

describe('Sample JSON', () => {
  /** @type {LH.Result} */
  let lhr;

  beforeEach(() => {
    lhr = JSON.parse(JSON.stringify(sampleJson));
  });

  it('no category score is null', () => {
    for (const category of Object.values(lhr.categories)) {
      expect(category).not.toMatchObject({score: null});
    }
  });
});
