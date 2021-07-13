// @ts-nocheck
/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MagicString = require('magic-string');

let currentToken;
const replacer = (str, index) => currentToken[index];

module.exports = function postprocess(allReplacements) {
  return {
    name: 'postprocess',
    renderChunk(code, {sourceMap, format}) {
      const str = new MagicString(code);
      const replacements = typeof allReplacements === 'function' ?
        allReplacements({code, sourceMap, format}) :
        allReplacements;

      for (let i = 0; i < replacements.length; i++) {
        // eslint-disable-next-line prefer-const
        let [find, replace = ''] = replacements[i];
        if (typeof find === 'string') find = new RegExp(find);
        if (!find.global) {
          find = new RegExp(find.source, 'g' + String(find).split('/').pop());
        }

        let token;
        while (token = find.exec(code)) {
          let value;
          if (typeof replace === 'function') {
            value = replace(...token);
            if (value === null) value = '';
          } else {
            currentToken = token;
            value = replace.replace(/\$(\d+)/, replacer);
          }
          str.overwrite(token.index, token.index + token[0].length, value);
        }
      }

      return {
        code: str.toString(),
        map: sourceMap === false ? null : str.generateMap({hires: true}),
      };
    },
  };
};
