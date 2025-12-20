/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');

class ViolationAudit extends Audit {
  /**
   * @param {LH.Artifacts} artifacts
   * @param {RegExp} pattern
   * @return {Array<{label: string, url?: string}>}
   */
  static getViolationResults(artifacts, pattern) {
    const seen = new Set();
    return artifacts.ConsoleMessages
        .map(message => message.entry)
        .filter(entry => entry.url && entry.source === 'violation' && pattern.test(entry.text))
        .map(entry => ({label: `line: ${entry.lineNumber}`, url: entry.url}))
        .filter(entry => {
          // Filter out duplicate entries by URL/label since they are not differentiable to the user
          // @see https://github.com/GoogleChrome/lighthouse/issues/5218
          const key = `${entry.url}!${entry.label}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
  }
}

module.exports = ViolationAudit;
