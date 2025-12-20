/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * A simple buffered log to use in place of `console`.
 */
class LocalConsole {
  constructor() {
    this._log = '';
  }

  /**
   * @param {string} str
   */
  log(str) {
    this._log += str + '\n';
  }

  /**
   * Log but without the ending newline.
   * @param {string} str
   */
  write(str) {
    this._log += str;
  }

  /**
   * @return {string}
   */
  getLog() {
    return this._log;
  }

  /**
   * Append a stdout and stderr to this log.
   * @param {{stdout: string, stderr: string}} stdStrings
   */
  adoptStdStrings(stdStrings) {
    this.write(stdStrings.stdout);
    // stderr accrues many empty lines. Don't log unless there's content.
    if (/\S/.test(stdStrings.stderr)) {
      this.write(stdStrings.stderr);
    }
  }
}

module.exports = LocalConsole;
