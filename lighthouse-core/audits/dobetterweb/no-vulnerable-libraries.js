/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audits a page to make sure there are no JS libraries with
 * known vulnerabilities being used. Checks against a vulnerability db
 * provided by Snyk.io and checked in locally as third-party/snyk/snapshot.json
 */

'use strict';

const Audit = require('../audit.js');
const Sentry = require('../../lib/sentry.js');
const semver = require('semver');
const snykDatabase = require('../../../third-party/snyk/snapshot.json');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on Javascript libraries the page uses. This descriptive title is shown to users when all Javascript libraries are free of known security vulnerabilities. */
  title: 'Avoids front-end JavaScript libraries' +
    ' with known security vulnerabilities',
  /** Title of a Lighthouse audit that provides detail on Javascript libraries the page uses. This descriptive title is shown to users when some detected Javascript libraries have known security vulnerabilities. */
  failureTitle: 'Includes front-end JavaScript libraries' +
    ' with known security vulnerabilities',
  /** Description of a Lighthouse audit that tells the user why they should be concerned about the third party Javascript libraries that they use. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Some third-party scripts may contain known security vulnerabilities ' +
    'that are easily identified and exploited by attackers. ' +
    '[Learn more](https://web.dev/no-vulnerable-libraries).',
  /** [ICU Syntax] Label for the audit identifying the number of vulnerable Javascript libraries found. */
  displayValue: `{itemCount, plural,
    =1 {1 vulnerability detected}
    other {# vulnerabilities detected}
    }`,
  /** Label for a column in a data table; entries will be the version numbers of the Javascript libraries found.  */
  columnVersion: 'Library Version',
  /** Label for a column in a data table; entries will be the counts of JavaScript-library vulnerabilities found.  */
  columnVuln: 'Vulnerability Count',
  /** Label for a column in a data table; entries will be the severity of the vulnerabilities found within a Javascript library. */
  columnSeverity: 'Highest Severity',
  /** Table row value for the severity of a small, or low impact Javascript vulnerability.  Part of a ranking scale in the form: low, medium, high. */
  rowSeverityLow: 'Low',
  /** Table row value for the severity of a Javascript vulnerability.  Part of a ranking scale in the form: low, medium, high. */
  rowSeverityMedium: 'Medium',
  /** Table row value for the severity of a high impact, or dangerous Javascript vulnerability.  Part of a ranking scale in the form: low, medium, high. */
  rowSeverityHigh: 'High',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const SEMVER_REGEX = /^(\d+\.\d+\.\d+)[^-0-9]+/;

/** @type {Object<string, string>} */
const rowMap = {
  'low': str_(UIStrings.rowSeverityLow),
  'medium': str_(UIStrings.rowSeverityMedium),
  'high': str_(UIStrings.rowSeverityHigh),
};

/** @typedef {{npm: Object<string, Array<{id: string, severity: string, semver: {vulnerable: Array<string>}}>>}} SnykDB */
/** @typedef {{severity: string, numericSeverity: number, library: string, url: string}} Vulnerability */

class NoVulnerableLibrariesAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'no-vulnerable-libraries',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Stacks'],
    };
  }

  /**
   * @return {SnykDB}
   */
  static get snykDB() {
    return snykDatabase;
  }

  /**
   * @return {Object<string, number>}
   */
  static get severityMap() {
    return {
      high: 3,
      medium: 2,
      low: 1,
    };
  }

  /**
   * Attempts to normalize the version.
   * @param {string|undefined} version
   * @return {string|undefined}
   */
  static normalizeVersion(version) {
    if (!version) return version;
    if (semver.valid(version)) return version;

    // converts 1.5 -> 1.5.0
    if (/^\d+\.\d+$/.test(version)) return `${version}.0`;
    // converts 1.0.0a-bunch-of-crap -> 1.0.0
    const versionMatch = version.match(SEMVER_REGEX);
    if (versionMatch) return versionMatch[1];
    // leave everything else untouched
    return version;
  }

  /**
   * @param {string} normalizedVersion
   * @param {LH.Artifacts.DetectedStack} lib
   * @param {SnykDB} snykDB
   * @return {Array<Vulnerability>}
   */
  static getVulnerabilities(normalizedVersion, lib, snykDB) {
    if (!lib.npm || !snykDB.npm[lib.npm]) {
      return [];
    }

    // Verify the version is well-formed first
    try {
      semver.satisfies(normalizedVersion, '*');
    } catch (err) {
      err.pkgName = lib.npm;
      // Report the failure and skip this library if the version was ill-specified
      Sentry.captureException(err, {level: 'warning'});
      return [];
    }

    // Match the vulnerability candidates from snyk against the version we see in the page
    const vulnCandidatesForLib = snykDB.npm[lib.npm];
    const matchingVulns = vulnCandidatesForLib.filter(vulnCandidate => {
      // Each snyk vulnerability comes with an array of semver ranges
      // The page is vulnerable if any of the ranges match.
      const hasMatchingVersion = vulnCandidate.semver.vulnerable.some(vulnSemverRange =>
        semver.satisfies(normalizedVersion, vulnSemverRange)
      );
      return hasMatchingVersion;
    });

    const vulns = matchingVulns.map(vuln => {
      return {
        severity: rowMap[vuln.severity],
        numericSeverity: this.severityMap[vuln.severity],
        library: `${lib.name}@${normalizedVersion}`,
        url: 'https://snyk.io/vuln/' + vuln.id,
      };
    });

    return vulns;
  }

  /**
   * @param {Array<Vulnerability>} vulnerabilities
   * @return {string}
   */
  static highestSeverity(vulnerabilities) {
    const sortedVulns = vulnerabilities
      .sort((a, b) => b.numericSeverity - a.numericSeverity);
    return sortedVulns[0].severity;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const foundLibraries = artifacts.Stacks.filter(stack => stack.detector === 'js');
    const snykDB = NoVulnerableLibrariesAudit.snykDB;

    if (!foundLibraries.length) {
      return {
        score: 1,
      };
    }

    let totalVulns = 0;
    /** @type {Array<{highestSeverity: string, vulnCount: number, detectedLib: LH.Audit.Details.LinkValue}>} */
    const vulnerabilityResults = [];

    const libraryVulns = foundLibraries.map(lib => {
      const version = this.normalizeVersion(lib.version) || '';
      const vulns = this.getVulnerabilities(version, lib, snykDB);
      const vulnCount = vulns.length;
      totalVulns += vulnCount;

      let highestSeverity;
      if (vulns.length > 0) {
        highestSeverity = this.highestSeverity(vulns);

        vulnerabilityResults.push({
          highestSeverity,
          vulnCount,
          detectedLib: {
            text: lib.name + '@' + version,
            url: `https://snyk.io/vuln/npm:${lib.npm}?lh=${version}&utm_source=lighthouse&utm_medium=ref&utm_campaign=audit`,
            type: 'link',
          },
        });
      }

      return {
        name: lib.name,
        npmPkgName: lib.npm,
        version,
        vulns,
        highestSeverity,
      };
    });

    let displayValue = '';
    if (totalVulns > 0) {
      displayValue = str_(UIStrings.displayValue, {itemCount: totalVulns});
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'detectedLib', itemType: 'link', text: str_(UIStrings.columnVersion)},
      {key: 'vulnCount', itemType: 'text', text: str_(UIStrings.columnVuln)},
      {key: 'highestSeverity', itemType: 'text', text: str_(UIStrings.columnSeverity)},
    ];
    const details = Audit.makeTableDetails(headings, vulnerabilityResults, {});

    return {
      score: Number(totalVulns === 0),
      displayValue,
      extendedInfo: {
        jsLibs: libraryVulns,
        vulnerabilities: vulnerabilityResults,
      },
      details,
    };
  }
}

module.exports = NoVulnerableLibrariesAudit;
module.exports.UIStrings = UIStrings;
