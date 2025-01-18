/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

import esMain from 'es-main';

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
    const {
      formFactor,
      locale,
      onlyCategories,
      channel,
      throttling,
      screenEmulation,
      throttlingMethod} = reportJson.configSettings;

    // @ts-expect-error - intentionally only a subset of settings.
    reportJson.configSettings = {
      formFactor,
      locale,
      onlyCategories,
      channel,
      throttling,
      screenEmulation,
      throttlingMethod};
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
        // @ts-expect-error ts properly flags this as invalid as it should not happen,
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

  /**
   * Execute `cb(obj, key)` on every object property where obj[key] is a string, recursively.
   * @param {any} obj
   * @param {(obj: Record<string, string>, key: string) => void} cb
   */
  function iterateStrings(obj, cb) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          cb(obj, key);
        } else {
          iterateStrings(obj[key], cb);
        }
      });
    } else if (Array.isArray(obj)) {
      obj.forEach(item => {
        if (typeof item === 'object' || Array.isArray(item)) {
          iterateStrings(item, cb);
        }
      });
    }
  }

  iterateStrings(reportJson, (obj, key) => {
    const value = obj[key];

    // Remove empty strings, as they are dropped after round-tripping anyway.
    if (value === '') {
      delete obj[key];
      return;
    }

    // Sanitize lone surrogates.
    // @ts-expect-error node 20
    if (String.prototype.isWellFormed && !value.isWellFormed()) {
      // @ts-expect-error node 20
      obj[key] = value.toWellFormed();
    }
  });

  return reportJson;
}

// Test if called from the CLI or as a module.
if (esMain(import.meta)) {
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
}

export {
  processForProto,
};
