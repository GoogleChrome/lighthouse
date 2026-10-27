/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {GithubApi} from '../app/src/github-api.js';

describe('GithubApi', () => {
  describe('getGistFileContentAsJson', () => {
    it('rejects invalid gist IDs before making any network or auth requests', async () => {
      const invalidIds = [
        '',
        '../user',
        '0123456789abcdef/commits',
        '0123456789abcdef?foo=bar',
        'not-a-hex-id',
      ];

      for (const id of invalidIds) {
        await expect(
          GithubApi.prototype.getGistFileContentAsJson.call({}, id)
        ).rejects.toThrow('Invalid gist ID');
      }
    });
  });
});
