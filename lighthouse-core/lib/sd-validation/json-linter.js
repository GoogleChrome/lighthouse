/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const jsonlint = require('jsonlint-mod');

/**
 * @param {string} input
 * @returns {{message: string, lineNumber: number|null}|null}
 */
module.exports = function parseJSON(input) {
  try {
    jsonlint.parse(input);
  } catch (error) {
    /** @type {number|null} */
    let line = error.at;

    // extract line number from message
    if (!line) {
      const regexLineResult = error.message.match(/Parse error on line (\d+)/);

      if (regexLineResult) {
        line = parseFloat(regexLineResult[1]);
      }
    }


    // jsonlint error message points to a specific character, but we just want the message.
    // Example:
    //    ---------^
    //    Unexpected character {
    let message = /** @type {string} */ (error.message);
    const regexMessageResult = error.message.match(/-+\^\n(.+)$/);

    if (regexMessageResult) {
      message = regexMessageResult[1];
    }

    return {
      message,
      lineNumber: line,
    };
  }

  return null;
};
