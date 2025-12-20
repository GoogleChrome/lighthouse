/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const stream = require('stream');
const terser = require('terser');

/**
 * Minifies file which are read by fs.readFileSync (brfs)
 *
 * @param {string} file
 */
function minifyFileTransform(file) {
  return new stream.Transform({
    transform(chunk, enc, next) {
      if (file.endsWith('.js')) {
        const result = terser.minify(chunk.toString());
        if (result.error) {
          throw result.error;
        }

        this.push(result.code);
      } else {
        this.push(chunk);
      }

      next();
    },
  });
}

module.exports = {
  minifyFileTransform,
};
