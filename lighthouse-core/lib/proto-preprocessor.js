/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const fs = require('fs');

/**
 * @fileoverview Helper functions to transform an LHR into a proto-ready LHR.
 *
 * FIXME: This file is 100% technical debt.  Our eventual goal is for the
 * roundtrip JSON to match the Golden LHR 1:1.
 */

/**
  * Transform an LHR into a proto-friendly, mostly-compatible LHR.
  * @param {LH.Result} lhr
  * @return {LH.Result}
  */
function processForProto(lhr) {
  /** @type {LH.Result} */
  const reportJson = JSON.parse(JSON.stringify(lhr));

  // Clean up the configSettings
  // Note: This is not strictly required for conversion if protobuf parsing is set to
  // 'ignore unknown fields' in the language of conversion.
  if (reportJson.configSettings) {
    // The settings that are in both proto and LHR
    const {emulatedFormFactor, locale, onlyCategories, channel} = reportJson.configSettings;

    // @ts-ignore - intentionally only a subset of settings.
    reportJson.configSettings = {emulatedFormFactor, locale, onlyCategories, channel};
  }

  // Remove runtimeError if it is NO_ERROR
  if (reportJson.runtimeError && reportJson.runtimeError.code === 'NO_ERROR') {
    delete reportJson.runtimeError;
  }

  // Clean up actions that require 'audits' to exist
  if (reportJson.audits) {
    Object.keys(reportJson.audits).forEach(auditName => {
      const audit = reportJson.audits[auditName];

      // Rewrite 'not-applicable' and 'not_applicable' scoreDisplayMode to 'notApplicable'. #6201, #6783.
      if (audit.scoreDisplayMode) {
        // @ts-ignore ts properly flags this as invalid as it should not happen,
        // but remains in preprocessor to protect from proto translation errors from
        // old LHRs.
        // eslint-disable-next-line max-len
        if (audit.scoreDisplayMode === 'not-applicable' || audit.scoreDisplayMode === 'not_applicable') {
          audit.scoreDisplayMode = 'notApplicable';
        }
      }

      // Normalize displayValue to always be a string, not an array. #6200
      if (Array.isArray(audit.displayValue)) {
        /** @type {Array<any>}*/
        const values = [];
        audit.displayValue.forEach(item => {
          values.push(item);
        });
        audit.displayValue = values.join(' | ');
      }
    });
  }

  // Drop the i18n icuMessagePaths. Painful in proto, and low priority to expose currently.
  if (reportJson.i18n && reportJson.i18n.icuMessagePaths) {
    delete reportJson.i18n.icuMessagePaths;
  }

  // Remove any found empty strings, as they are dropped after round-tripping anyway
  /**
   * @param {any} obj
   */
  function removeStrings(obj) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string' && obj[key] === '') {
          delete obj[key];
        } else if (typeof obj[key] === 'object' || Array.isArray(obj[key])) {
          removeStrings(obj[key]);
        }
      });
    } else if (Array.isArray(obj)) {
      obj.forEach(item => {
        if (typeof item === 'object' || Array.isArray(item)) {
          removeStrings(item);
        }
      });
    }
  }

  removeStrings(reportJson);

  return reportJson;
}

// @ts-ignore claims always false, but this checks if cli or module
if (require.main === module) {
  // read in the argv for the input & output
  const args = process.argv.slice(2);
  let input;
  let output;

  if (args.length) {
    // find can return undefined, so default it to '' with OR
    input = (args.find(flag => flag.startsWith('--in')) || '').replace('--in=', '');
    output = (args.find(flag => flag.startsWith('--out')) || '').replace('--out=', '');
  }

  if (input && output) {
    // process the file
    const report = processForProto(JSON.parse(fs.readFileSync(input, 'utf-8')));
    // write to output from argv
    fs.writeFileSync(output, JSON.stringify(report), 'utf-8');
  }
} else {
  module.exports = {
    processForProto,
  };
}
