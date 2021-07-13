// @ts-nocheck
/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const {Readable} = require('stream');
const brfs = require('@wardpeet/brfs');

const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

const rollupBrfs = function rollUpBrfs(options = {}) {
  return {
    name: 'brfs',
    transform(code, id) {
      const ext = path.extname(id);
      if (!EXTENSIONS.includes(ext)) {
        return null;
      }
      return new Promise((resolve, reject) => {
        let output = '';
        const src = new Readable();
        src.push(code);
        src.push(null);
        const stream = src.pipe(brfs(id, options));
        stream.on('data', function(data) {
          output += data.toString();
        });
        stream.on('end', function() {
          resolve({
            code: output,
            map: {mappings: ''},
          });
        });
        stream.on('error', function(error) {
          reject(error);
        });
      });
    },
  };
};

module.exports = rollupBrfs;
