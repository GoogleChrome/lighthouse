/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * An extension of Error that includes any stdout or stderr from a child
 * process. Based on the error thrown by `child_process.exec()`.
 * https://github.com/nodejs/node/blob/3aeae8d81b7b78668c37f7a07a72d94781126d49/lib/child_process.js#L150-L176
 */
class ChildProcessError extends Error {
  /**
   * @param {string} message
   * @param {string=} stdout
   * @param {string=} stderr
   */
  constructor(message, stdout = '', stderr = '') {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

module.exports = ChildProcessError;
