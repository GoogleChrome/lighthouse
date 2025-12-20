/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Audits a page to determine whether it contains console errors.
 * This is done by collecting Chrome console log messages and filtering out the non-error ones.
 */

const log = require('lighthouse-logger');
const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on browser errors. This descriptive title is shown to users when no browser errors were logged into the devtools console. */
  title: 'No browser errors logged to the console',
  /** Title of a Lighthouse audit that provides detail on browser errors. This descriptive title is shown to users when browser errors occurred and were logged into the devtools console. */
  failureTitle: 'Browser errors were logged to the console',
  /** Description of a Lighthouse audit that tells the user why errors being logged to the devtools console are a cause for concern and so should be fixed. This is displayed after a user expands the section to see more. No character length limits. */
  description: 'Errors logged to the console indicate unresolved problems. ' +
    'They can come from network request failures and other browser concerns. ' +
    '[Learn more](https://web.dev/errors-in-console)',
  /**  Label for a column in a data table; entries in the column will be the descriptions of logged browser errors. */
  columnDesc: 'Description',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/** @typedef {{ignoredPatterns?: Array<RegExp|string>}} AuditOptions */

class ErrorLogs extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'errors-in-console',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['ConsoleMessages', 'RuntimeExceptions'],
    };
  }

  /** @return {AuditOptions} */
  static defaultOptions() {
    return {};
  }


  /**
   * @template {{description: string | undefined}} T
   * @param {Array<T>} items
   * @param {AuditOptions} options
   * @return {Array<T>}
   */
  static filterAccordingToOptions(items, options) {
    const {ignoredPatterns, ...restOfOptions} = options;
    const otherOptionKeys = Object.keys(restOfOptions);
    if (otherOptionKeys.length) log.warn(this.meta.id, 'Unrecognized options', otherOptionKeys);
    if (!ignoredPatterns) return items;

    return items.filter(({description}) => {
      if (!description) return true;
      for (const pattern of ignoredPatterns) {
        if (pattern instanceof RegExp && pattern.test(description)) return false;
        if (typeof pattern === 'string' && description.includes(pattern)) return false;
      }

      return true;
    });
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {LH.Audit.Product}
   */
  static audit(artifacts, context) {
    const auditOptions = /** @type {AuditOptions} */ (context.options);

    const consoleEntries = artifacts.ConsoleMessages;
    const runtimeExceptions = artifacts.RuntimeExceptions;
    /** @type {Array<{source: string, description: string|undefined, url: string|undefined}>} */
    const consoleRows =
      consoleEntries.filter(log => log.entry && log.entry.level === 'error')
      .map(item => {
        return {
          source: item.entry.source,
          description: item.entry.text,
          url: item.entry.url,
        };
      });

    const runtimeExRows =
      runtimeExceptions.filter(entry => entry.exceptionDetails !== undefined)
      .map(entry => {
        const description = entry.exceptionDetails.exception ?
          entry.exceptionDetails.exception.description : entry.exceptionDetails.text;

        return {
          source: 'Runtime.exception',
          description,
          url: entry.exceptionDetails.url,
        };
      });

    const tableRows = ErrorLogs.filterAccordingToOptions(
      consoleRows.concat(runtimeExRows),
      auditOptions
    ).sort((a, b) => (a.description || '').localeCompare(b.description || ''));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
      {key: 'description', itemType: 'code', text: str_(UIStrings.columnDesc)},
    ];

    const details = Audit.makeTableDetails(headings, tableRows);
    const numErrors = tableRows.length;

    return {
      score: Number(numErrors === 0),
      details,
    };
  }
}

module.exports = ErrorLogs;
module.exports.UIStrings = UIStrings;
