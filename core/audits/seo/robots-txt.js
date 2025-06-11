/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Validates robots.txt file according to the official standard and its various
 * extensions respected by the popular web crawlers.
 * Validator rules, and the resources backing these rules, can be found here:
 * https://github.com/GoogleChrome/lighthouse/issues/4356#issuecomment-375489925
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const HTTP_CLIENT_ERROR_CODE_LOW = 400;
const HTTP_SERVER_ERROR_CODE_LOW = 500;

const DIRECTIVE_SITEMAP = 'sitemap';
const DIRECTIVE_USER_AGENT = 'user-agent';
const DIRECTIVE_ALLOW = 'allow';
const DIRECTIVE_DISALLOW = 'disallow';
const DIRECTIVES_GROUP_MEMBERS = new Set([DIRECTIVE_ALLOW, DIRECTIVE_DISALLOW]);
const DIRECTIVE_SAFELIST = new Set([
  DIRECTIVE_USER_AGENT, DIRECTIVE_DISALLOW, // standard
  DIRECTIVE_ALLOW, DIRECTIVE_SITEMAP, // universally supported
  'crawl-delay', // yahoo, bing, yandex
  'clean-param', 'host', // yandex
  'request-rate', 'visit-time', 'noindex', // not officially supported, but used in the wild
]);
const SITEMAP_VALID_PROTOCOLS = new Set(['https:', 'http:', 'ftp:']);

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the site's robots.txt file. Note: "robots.txt" is a canonical filename and should not be translated. This descriptive title is shown when the robots.txt file is present and configured correctly. */
  title: 'robots.txt is valid',
  /** Title of a Lighthouse audit that provides detail on the site's robots.txt file. Note: "robots.txt" is a canonical filename and should not be translated. This descriptive title is shown when the robots.txt file is misconfigured, which makes the page hard or impossible to scan via web crawler. */
  failureTitle: 'robots.txt is not valid',
  /** Description of a Lighthouse audit that tells the user *why* they need to have a valid robots.txt file. Note: "robots.txt" is a canonical filename and should not be translated. This is displayed after a user expands the section to see more. No character length limits. */
  description: 'If your robots.txt file is malformed, crawlers may not be able to understand ' +
  'how you want your website to be crawled or indexed. ' +
  '[Learn more about robots.txt](https://developer.chrome.com/docs/lighthouse/seo/invalid-robots-txt/).',
  /**
   * @description Label for the audit identifying that the robots.txt request has returned a specific HTTP status code. Note: "robots.txt" is a canonical filename and should not be translated.
   * @example {500} statusCode
   * */
  displayValueHttpBadCode: 'Request for robots.txt returned HTTP status: {statusCode}',
  /** [ICU Syntax] Label for the audit identifying the number of errors that occured while validating the robots.txt file. "itemCount" will be replaced by the integer count of errors encountered. */
  displayValueValidationError: `{itemCount, plural,
    =1 {1 error found}
    other {# errors found}
    }`,
  /** Explanatory message stating that there was a failure in an audit caused by Lighthouse not being able to download the robots.txt file for the site.  Note: "robots.txt" is a canonical filename and should not be translated. */
  explanation: 'Lighthouse was unable to download a robots.txt file',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @param {string} directiveName
 * @param {string} directiveValue
 * @throws will throw an exception if given directive is invalid
 */
function verifyDirective(directiveName, directiveValue) {
  if (!DIRECTIVE_SAFELIST.has(directiveName)) {
    throw new Error('Unknown directive');
  }

  if (directiveName === DIRECTIVE_SITEMAP) {
    let sitemapUrl;

    try {
      sitemapUrl = new URL(directiveValue);
    } catch (e) {
      throw new Error('Invalid sitemap URL');
    }

    if (!SITEMAP_VALID_PROTOCOLS.has(sitemapUrl.protocol)) {
      throw new Error('Invalid sitemap URL protocol');
    }
  }

  if (directiveName === DIRECTIVE_USER_AGENT && !directiveValue) {
    throw new Error('No user-agent specified');
  }

  if (directiveName === DIRECTIVE_ALLOW || directiveName === DIRECTIVE_DISALLOW) {
    if (directiveValue !== '' && directiveValue[0] !== '/' && directiveValue[0] !== '*') {
      throw new Error('Pattern should either be empty, start with "/" or "*"');
    }

    const dollarIndex = directiveValue.indexOf('$');

    if (dollarIndex !== -1 && dollarIndex !== directiveValue.length - 1) {
      throw new Error('"$" should only be used at the end of the pattern');
    }
  }
}

/**
 * @param {string} line single line from a robots.txt file
 * @throws will throw an exception if given line has errors
 * @return {{directive: string, value: string}|null}
 */
function parseLine(line) {
  const hashIndex = line.indexOf('#');

  if (hashIndex !== -1) {
    line = line.substr(0, hashIndex);
  }

  line = line.trim();

  if (line.length === 0) {
    return null;
  }

  const colonIndex = line.indexOf(':');

  if (colonIndex === -1) {
    throw new Error('Syntax not understood');
  }

  const directiveName = line.slice(0, colonIndex).trim().toLowerCase();
  const directiveValue = line.slice(colonIndex + 1).trim();

  verifyDirective(directiveName, directiveValue);

  return {
    directive: directiveName,
    value: directiveValue,
  };
}

/**
 * @param {string} content
 * @return {Array<{index: string, line: string, message: string}>}
 */
function validateRobots(content) {
  /**
   * @type Array<{index: string, line: string, message: string}>
   */
  const errors = [];
  let inGroup = false;

  content
    .split(/\r\n|\r|\n/)
    .forEach((line, index) => {
      let parsedLine;

      try {
        parsedLine = parseLine(line);
      } catch (e) {
        errors.push({
          index: (index + 1).toString(),
          line: line,
          message: e.message.toString(),
        });
      }

      if (!parsedLine) {
        return;
      }

      // group-member records (allow, disallow) have to be precided with a start-of-group record (user-agent)
      // see: https://developers.google.com/search/reference/robots_txt#grouping-of-records
      if (parsedLine.directive === DIRECTIVE_USER_AGENT) {
        inGroup = true;
      } else if (!inGroup && DIRECTIVES_GROUP_MEMBERS.has(parsedLine.directive)) {
        errors.push({
          index: (index + 1).toString(),
          line: line,
          message: 'No user-agent specified',
        });
      }
    });

  return errors;
}

class RobotsTxt extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'robots-txt',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['RobotsTxt'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const {
      status,
      content,
    } = artifacts.RobotsTxt;

    if (!status) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanation),
      };
    }

    if (status >= HTTP_SERVER_ERROR_CODE_LOW) {
      return {
        score: 0,
        displayValue: str_(UIStrings.displayValueHttpBadCode, {statusCode: status}),
      };
    } else if (status >= HTTP_CLIENT_ERROR_CODE_LOW || content === '') {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    // If status is good, content must be not null.
    if (content === null) {
      throw new Error(`Status ${status} was valid, but content was null`);
    }

    const validationErrors = validateRobots(content);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'index', valueType: 'text', label: 'Line #'},
      {key: 'line', valueType: 'code', label: 'Content'},
      {key: 'message', valueType: 'code', label: 'Error'},
    ];

    const details = Audit.makeTableDetails(headings, validationErrors);
    let displayValue;

    if (validationErrors.length) {
      displayValue =
        str_(UIStrings.displayValueValidationError, {itemCount: validationErrors.length});
    }

    return {
      score: Number(validationErrors.length === 0),
      details,
      displayValue,
    };
  }
}

export default RobotsTxt;
export {UIStrings};
