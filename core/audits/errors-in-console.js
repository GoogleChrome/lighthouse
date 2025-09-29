/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audits a page to determine whether it contains console errors.
 * This is done by collecting Chrome console log messages and filtering out the non-error ones.
 */

import log from 'lighthouse-logger';

import {Audit} from './audit.js';
import {JSBundles} from '../computed/js-bundles.js';
import * as i18n from '../lib/i18n/i18n.js';
import {Util} from '../../shared/util.js';

const KB = 1024;
const MAX_CONSOLE_ERRORS = 1000;

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on browser errors. This descriptive title is shown to users when no browser errors were logged into the devtools console. */
  title: 'No browser errors logged to the console',
  /** Title of a Lighthouse audit that provides detail on browser errors. This descriptive title is shown to users when browser errors occurred and were logged into the devtools console. */
  failureTitle: 'Browser errors were logged to the console',
  /** Description of a Lighthouse audit that tells the user why errors being logged to the devtools console are a cause for concern and so should be fixed. This is displayed after a user expands the section to see more. No character length limits. */
  description: 'Errors logged to the console indicate unresolved problems. ' +
    'They can come from network request failures and other browser concerns. ' +
    '[Learn more about this errors in console diagnostic audit](https://developer.chrome.com/docs/lighthouse/best-practices/errors-in-console/)',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

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
      requiredArtifacts: ['ConsoleMessages', 'SourceMaps', 'Scripts'],
    };
  }

  /** @return {AuditOptions} */
  static get defaultOptions() {
    // Any failed network requests with error messsage aren't actionable
    return {ignoredPatterns: ['ERR_BLOCKED_BY_CLIENT.Inspector']};
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
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    /** @type {AuditOptions} */
    const auditOptions = context.options;
    const bundles = await JSBundles.request(artifacts, context);

    /** @type {Array<{source: string, description: string|undefined, sourceLocation: LH.Audit.Details.SourceLocationValue|undefined}>} */
    const consoleRows = artifacts.ConsoleMessages
      .filter(item => item.level === 'error')
      .map(item => {
        const bundle = bundles.find(bundle => bundle.script.scriptId === item.scriptId);
        return {
          source: item.source,
          description: item.text ? Util.truncate(item.text, 10 * KB) : undefined,
          sourceLocation: Audit.makeSourceLocationFromConsoleMessage(item, bundle),
        };
      }).slice(0, MAX_CONSOLE_ERRORS);

    const tableRows = ErrorLogs.filterAccordingToOptions(consoleRows, auditOptions)
      .sort((a, b) => (a.description || '').localeCompare(b.description || ''));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'sourceLocation', valueType: 'source-location', label: str_(i18n.UIStrings.columnSource)},
      {key: 'description', valueType: 'code', label: str_(i18n.UIStrings.columnDescription)},
      /* eslint-enable max-len */
    ];

    const details = Audit.makeTableDetails(headings, tableRows);
    const numErrors = tableRows.length;

    return {
      score: Number(numErrors === 0),
      details,
    };
  }
}

export default ErrorLogs;
export {UIStrings};
