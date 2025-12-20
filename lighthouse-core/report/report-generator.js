/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const htmlReportAssets = require('./html/html-report-assets.js');

class ReportGenerator {
  /**
   * Replaces all the specified strings in source without serial replacements.
   * @param {string} source
   * @param {!Array<{search: string, replacement: string}>} replacements
   * @return {string}
   */
  static replaceStrings(source, replacements) {
    if (replacements.length === 0) {
      return source;
    }

    const firstReplacement = replacements[0];
    const nextReplacements = replacements.slice(1);
    return source
        .split(firstReplacement.search)
        .map(part => ReportGenerator.replaceStrings(part, nextReplacements))
        .join(firstReplacement.replacement);
  }

  /**
   * Returns the report HTML as a string with the report JSON and renderer JS inlined.
   * @param {LH.Result} lhr
   * @return {string}
   */
  static generateReportHtml(lhr) {
    const sanitizedJson = JSON.stringify(lhr)
      .replace(/</g, '\\u003c') // replaces opening script tags
      .replace(/\u2028/g, '\\u2028') // replaces line separators ()
      .replace(/\u2029/g, '\\u2029'); // replaces paragraph separators
    const sanitizedJavascript = htmlReportAssets.REPORT_JAVASCRIPT.replace(/<\//g, '\\u003c/');

    return ReportGenerator.replaceStrings(htmlReportAssets.REPORT_TEMPLATE, [
      {search: '%%LIGHTHOUSE_JSON%%', replacement: sanitizedJson},
      {search: '%%LIGHTHOUSE_JAVASCRIPT%%', replacement: sanitizedJavascript},
      {search: '/*%%LIGHTHOUSE_CSS%%*/', replacement: htmlReportAssets.REPORT_CSS},
      {search: '%%LIGHTHOUSE_TEMPLATES%%', replacement: htmlReportAssets.REPORT_TEMPLATES},
    ]);
  }

  /**
   * Converts the results to a CSV formatted string
   * Each row describes the result of 1 audit with
   *  - the name of the category the audit belongs to
   *  - the name of the audit
   *  - a description of the audit
   *  - the score type that is used for the audit
   *  - the score value of the audit
   *
   * @param {LH.Result} lhr
   * @return {string}
   */
  static generateReportCSV(lhr) {
    // To keep things "official" we follow the CSV specification (RFC4180)
    // The document describes how to deal with escaping commas and quotes etc.
    const CRLF = '\r\n';
    const separator = ',';
    /** @param {string} value @return {string} */
    const escape = value => `"${value.replace(/"/g, '""')}"`;

    // Possible TODO: tightly couple headers and row values
    const header = ['requestedUrl', 'finalUrl', 'category', 'name', 'title', 'type', 'score'];
    const table = Object.values(lhr.categories).map(category => {
      return category.auditRefs.map(auditRef => {
        const audit = lhr.audits[auditRef.id];
        // CSV validator wants all scores to be numeric, use -1 for now
        const numericScore = audit.score === null ? -1 : audit.score;
        return [lhr.requestedUrl, lhr.finalUrl, category.title, audit.id, audit.title,
          audit.scoreDisplayMode, numericScore]
          .map(value => value.toString())
          .map(escape);
      });
    });

    return [header].concat(...table)
      .map(row => row.join(separator)).join(CRLF);
  }

  /**
   * Creates the results output in a format based on the `mode`.
   * @param {LH.Result} lhr
   * @param {LH.Config.Settings['output']} outputModes
   * @return {string|string[]}
   */
  static generateReport(lhr, outputModes) {
    const outputAsArray = Array.isArray(outputModes);
    if (typeof outputModes === 'string') outputModes = [outputModes];

    const output = outputModes.map(outputMode => {
      // HTML report.
      if (outputMode === 'html') {
        return ReportGenerator.generateReportHtml(lhr);
      }
      // CSV report.
      if (outputMode === 'csv') {
        return ReportGenerator.generateReportCSV(lhr);
      }
      // JSON report.
      if (outputMode === 'json') {
        return JSON.stringify(lhr, null, 2);
      }

      throw new Error('Invalid output mode: ' + outputMode);
    });

    return outputAsArray ? output : output[0];
  }
}

module.exports = ReportGenerator;
