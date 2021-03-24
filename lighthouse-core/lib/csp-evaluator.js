/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('csp_evaluator/finding').Finding} Finding */

const {
  evaluateForFailure,
  evaluateForSyntaxErrors,
  evaluateForWarnings,
} = require('csp_evaluator/dist/lighthouse/lighthouse_checks.js');
const {Type} = require('csp_evaluator/dist/finding.js');
const {CspParser} = require('csp_evaluator/dist/parser.js');
const {Directive} = require('csp_evaluator/dist/csp.js');

const log = require('lighthouse-logger');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Message shown when a CSP does not have a base-uri directive. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "base-uri", "'none'", and "'self'" do not need to be translated. */
  missingBaseUri: 'Missing `base-uri` allows injected `<base>` tags to set the base URL for all ' +
    'relative URLs (e.g. scripts) to an attacker controlled domain. ' +
    'Consider setting `base-uri` to `none` or `self`.',
  /** Message shown when a CSP does not have a script-src directive. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "script-src" does not need to be translated. */
  missingScriptSrc: '`script-src` directive is missing. ' +
    'This can allow the execution of unsafe scripts.',
  /** Message shown when a CSP does not have a script-src directive. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "object-src" and "'none'" do not need to be translated. */
  missingObjectSrc: 'Elements controlled by `object-src` are considered legacy features. ' +
    'Consider setting `object-src` to `none` to prevent the injection of ' +
    'plugins that execute unsafe scripts.',
  /** Message shown when a CSP uses a domain allowlist to filter out malicious scripts. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "CSP", "'strict-dynamic'", "nonces", and "hashes" do not need to be translated. "allowlists" can be interpreted as "whitelist". */
  strictDynamic: 'Host allowlists can frequently be bypassed. Consider using ' +
    '`strict-dynamic` in combination with CSP nonces or hashes.',
  /** Message shown when a CSP allows inline scripts to be run in the page. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "CSP", "'unsafe-inline'", "nonces", and "hashes" do not need to be translated. */
  unsafeInline: '`unsafe-inline` allows the execution of unsafe in-page scripts ' +
    'and event handlers. Consider using CSP nonces or hashes to allow scripts individually.',
  /** Message shown when a CSP is not backwards compatible with browsers that do not support CSP nonces/hashes. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "'unsafe-inline'", "nonces", and "hashes" do not need to be translated. */
  unsafeInlineFallback: 'Consider adding `unsafe-inline` (ignored by browsers supporting ' +
    'nonces/hashes) to be backward compatible with older browsers.',
  /** Message shown when a CSP is not backwards compatible with browsers that do not support the 'strict-dynamic' keyword. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "http:", "https:", and "'strict-dynamic'" do not need to be translated. */
  allowlistFallback: 'Consider adding https: and http: URL schemes (ignored by browsers ' +
    'supporting `strict-dynamic`) to be backward compatible with older browsers.',
  /** Message shown when a CSP only provides a reporting destination through the report-to directive. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "report-to", "report-uri", and "Chromium" do not need to be translated. */
  reportToOnly: 'The reporting destination is only configured via the `report-to` directive. ' +
    'This directive is only supported in Chromium-based browsers so it is ' +
    'recommended to also use a `report-uri` directive.',
  /** Message shown when a CSP does not provide a reporting destination. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "CSP" does not need to be translated. */
  reportingDestinationMissing: 'No CSP configures a reporting destination. ' +
    'This makes it difficult to maintain the CSP over time and monitor for any breakages.',
  /** Message shown when a CSP nonce has less than 8 characters. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "Nonces" does not need to be translated. */
  nonceLength: 'Nonces should be at least 8 characters long.',
  /** Message shown when a CSP nonce does not use teh base64 charset. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "Nonces" and "base84" do not need to be translated. "charset" can be interpreted as "a set of characters". */
  nonceCharset: 'Nonces should use the base64 charset.',
  /**
   * @description Message shown when a CSP is missing a semicolon. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy".
   * @example {'object-src'} keyword
   */
  missingSemicolon: 'Did you forget the semicolon? ' +
    '{keyword} seems to be a directive, not a keyword.',
  /** Message shown when a CSP contains an unknown keyword. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "CSP" does not need to be translated. */
  unknownDirective: 'Unknown CSP directive.',
  /**
   * @description Message shown when a CSP contains an invalid keyword. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy".
   * @example {'invalid-keyword'} keyword
   */
  unknownKeyword: '{keyword} seems to be an invalid keyword.',
  /** Message shown when a CSP uses the deprecated reflected-xss directive. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "reflected-xss", "CSP2" and "X-XSS-Protection" do not need to be translated. */
  deprecatedReflectedXSS: 'reflected-xss is deprecated since CSP2. ' +
    'Please, use the X-XSS-Protection header instead.',
  /** Message shown when a CSP uses the deprecated referrer directive. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "referrer", "CSP2" and "Referrer-Policy" do not need to be translated. */
  deprecatedReferrer: 'referrer is deprecated since CSP2. ' +
    'Please, use the Referrer-Policy header instead.',
  /** Message shown when a CSP uses the deprecated disown-opener directive. Shown in a table with a list of other CSP vulnerabilities and suggestions. "CSP" stands for "Content Security Policy". "disown-opener", "CSP3" and "Cross-Origin-Opener-Policy" do not need to be translated. */
  deprecatedDisownOpener: 'disown-opener is deprecated since CSP3. ' +
    'Please, use the Cross-Origin-Opener-Policy header instead.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/** @type {Record<number, string|LH.IcuMessage|Record<string, LH.IcuMessage>>} */
const FINDING_TO_UI_STRING = {
  [Type.MISSING_SEMICOLON]: UIStrings.missingSemicolon,
  [Type.UNKNOWN_DIRECTIVE]: str_(UIStrings.unknownDirective),
  [Type.INVALID_KEYWORD]: UIStrings.unknownKeyword,
  [Type.MISSING_DIRECTIVES]: {
    [Directive.BASE_URI]: str_(UIStrings.missingBaseUri),
    [Directive.SCRIPT_SRC]: str_(UIStrings.missingScriptSrc),
    [Directive.OBJECT_SRC]: str_(UIStrings.missingObjectSrc),
  },
  [Type.SCRIPT_UNSAFE_INLINE]: str_(UIStrings.unsafeInline),
  [Type.NONCE_LENGTH]: str_(UIStrings.nonceLength),
  [Type.NONCE_CHARSET]: str_(UIStrings.nonceCharset),
  [Type.DEPRECATED_DIRECTIVE]: {
    [Directive.REFLECTED_XSS]: str_(UIStrings.deprecatedReflectedXSS),
    [Directive.REFERRER]: str_(UIStrings.deprecatedReferrer),
    [Directive.DISOWN_OPENER]: str_(UIStrings.deprecatedDisownOpener),
  },
  [Type.STRICT_DYNAMIC]: str_(UIStrings.strictDynamic),
  [Type.UNSAFE_INLINE_FALLBACK]: str_(UIStrings.unsafeInlineFallback),
  [Type.ALLOWLIST_FALLBACK]: str_(UIStrings.allowlistFallback),
  [Type.REPORTING_DESTINATION_MISSING]: str_(UIStrings.reportingDestinationMissing),
  [Type.REPORT_TO_ONLY]: str_(UIStrings.reportToOnly),
};

/**
 * @param {Finding} finding
 * @return {LH.IcuMessage|string}
 */
function getTranslatedDescription(finding) {
  let result = FINDING_TO_UI_STRING[finding.type];
  if (!result) {
    log.warn('CSP Evaluator', `No translation found for description: ${finding.description}`);
    return finding.description;
  }

  // Return if translated result found.
  if (i18n.isIcuMessage(result)) return result;

  // If result was not translated, that means `finding.value` is included in the UI string.
  if (typeof result === 'string') return str_(result, {keyword: finding.value || ''});

  // Result is a record object, UI string depends on the directive.
  result = result[finding.directive];
  if (!result) {
    log.warn('CSP Evaluator', `No translation found for description: ${finding.description}`);
    return finding.description;
  }

  return result;
}

/**
 * @param {string} rawCsp
 */
function parseCsp(rawCsp) {
  return new CspParser(rawCsp).csp;
}

/**
 * @param {string[]} rawCsps
 * @return {{bypasses: Finding[], warnings: Finding[], syntax: Finding[][]}}
 */
function evaluateRawCspsForXss(rawCsps) {
  const parsedCsps = rawCsps.map(parseCsp);
  const bypasses = evaluateForFailure(parsedCsps);
  const warnings = evaluateForWarnings(parsedCsps);
  const syntax = evaluateForSyntaxErrors(parsedCsps);
  return {bypasses, warnings, syntax};
}

module.exports = {
  getTranslatedDescription,
  evaluateRawCspsForXss,
  parseCsp,
  UIStrings,
};
