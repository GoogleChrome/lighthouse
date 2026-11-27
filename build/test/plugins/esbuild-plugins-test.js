/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import esbuild from 'esbuild';

import {escapeNonAsciiComments, postprocess} from '../../esbuild-plugins.js';

describe('esbuild-plugins', () => {
  describe('escapeNonAsciiComments', () => {
    it('escapes non-ASCII characters in line and block comments', () => {
      const input = [
        '/** value ≤ median; value ≥ p10 */',
        'const x = 1; // ellipsis … and section §2.3',
        '/* tree: ├── leaf */',
      ].join('\n');

      const output = escapeNonAsciiComments(input);
      expect(output).toBe([
        '/** value \\u2264 median; value \\u2265 p10 */',
        'const x = 1; // ellipsis \\u2026 and section \\u00a72.3',
        '/* tree: \\u251c\\u2500\\u2500 leaf */',
      ].join('\n'));
    });

    it('preserves RegExp.prototype.source and String.raw literals', () => {
      const input = [
        '// Comment with non-ASCII: ≤',
        'export const re = /:(?<name>[-\\w]+)(?:\\((?<argument>\u00b6*)\\))?/gu;',
        'export const replaced = re.source.replace("(?<argument>\\xB6*)", "(?<argument>.*)");',
        'export const raw = String.raw`\u00b1`;',
      ].join('\n');

      const output = escapeNonAsciiComments(input);
      expect(output).toContain('// Comment with non-ASCII: \\u2264');
      expect(output).toContain('/:(?<name>[-\\w]+)(?:\\((?<argument>\u00b6*)\\))?/gu');

      // Verify runtime behavior of parsel-js style RegExp.source replacement.
      const re = /:(?<name>[-\w]+)(?:\((?<argument>¶*)\))?/gu;
      expect(output).toContain(re.source);
      expect(re.source.replace('(?<argument>\xB6*)', '(?<argument>.*)')).toBe(
        ':(?<name>[-\\w]+)(?:\\((?<argument>.*)\\))?'
      );
      expect(output).toContain('String.raw`\u00b1`');
    });
  });

  describe('postprocess two-byte character check', () => {
    it('throws if a > 0xff character survives outside comments', async () => {
      let caughtError;
      try {
        await esbuild.build({
          stdin: {
            contents: 'export const re = /can\u2019t/;',
            resolveDir: process.cwd(),
            loader: 'js',
          },
          outfile: 'dist/unused-test-bundle.js',
          bundle: true,
          write: false,
          charset: 'ascii',
          format: 'esm',
          plugins: [postprocess()],
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError.message).toContain('Unexpected character > 0xff (\\u2019)');
    });
  });
});
