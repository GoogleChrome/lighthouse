/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @fileoverview An inline-fs plugin for browserify. */

import {Transform} from 'stream';
import path from 'path';

import {inlineFs} from './inline-fs.js';
import {LH_ROOT} from '../../shared/root.js';

/**
 * @typedef Options
 * @property {boolean} [verbose] If true, turns on verbose logging, e.g. log instances where fs methods could not be inlined.
 */

/**
 * @param {Options} [options]
 * @return {(filepath: string) => Transform}
 */
function browserifyInlineFs(options = {}) {
  /**
   * @param {string} filepath
   * @return {Transform}
   */
  function inlineFsTransform(filepath) {
    /** @type {Array<Buffer>} */
    const chunks = [];

    return new Transform({
      transform(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },

      flush(callback) {
        const originalCode = Buffer.concat(chunks).toString('utf8');
        inlineFs(originalCode, filepath).then(({code, warnings}) => {
          if (options.verbose && warnings.length) {
            console.log(`warnings for ${path.relative(LH_ROOT, filepath)}`);
            for (const warning of warnings) {
              const {line, column} = warning.location;
              console.log(`  ${warning.text} (${line}:${column})`);
            }
          }

          // Fall back to original if inlineFs did nothing.
          code = code || originalCode;
          callback(null, code);
        });
      },
    });
  }

  return inlineFsTransform;
}

export {browserifyInlineFs};
