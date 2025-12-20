/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NoVulnerableLibrariesAudit =
  require('../../../audits/dobetterweb/no-vulnerable-libraries.js');
const assert = require('assert').strict;
const semver = require('semver');

/* eslint-env jest */
describe('Avoids front-end JavaScript libraries with known vulnerabilities', () => {
  describe('#normalizeVersion', () => {
    it('should leave valid and unsavable versions untouched', () => {
      assert.equal(NoVulnerableLibrariesAudit.normalizeVersion(undefined), undefined);
      assert.equal(NoVulnerableLibrariesAudit.normalizeVersion('52.1.13'), '52.1.13');
      assert.equal(NoVulnerableLibrariesAudit.normalizeVersion('52.1.13-rc.1'), '52.1.13-rc.1');
      assert.equal(NoVulnerableLibrariesAudit.normalizeVersion('c0ab71056b936'), 'c0ab71056b936');
    });

    it('should fix bad version numbers', () => {
      assert.equal(NoVulnerableLibrariesAudit.normalizeVersion('11.51'), '11.51.0');
      assert.equal(NoVulnerableLibrariesAudit.normalizeVersion('12.27.14 -junk'), '12.27.14');
      assert.equal(NoVulnerableLibrariesAudit.normalizeVersion('12.27.14_other-junk'), '12.27.14');
    });
  });

  it('fails when JS libraries with known vulnerabilities are detected', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      Stacks: [
        {detector: 'js', name: 'lib1', version: '1.0.0', npm: 'lib1'},
        {detector: 'js', name: 'angular', version: '1.1.4', npm: 'angular'},
        {detector: 'js', name: 'lib3', version: undefined, npm: 'lib3'},
      ],
    });
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.extendedInfo.jsLibs.length, 3);
    expect(auditResult.details.items[0].highestSeverity).toBeDisplayString('High');
    assert.equal(auditResult.details.items[0].detectedLib.type, 'link');
    assert.equal(auditResult.details.items[0].detectedLib.text, 'angular@1.1.4');
    assert.equal(auditResult.details.items[0].detectedLib.url, 'https://snyk.io/vuln/npm:angular?lh=1.1.4&utm_source=lighthouse&utm_medium=ref&utm_campaign=audit');
  });

  it('fails when libraries w/ vulnerabilities are detected (anywhere in the semver array)', () => {
    // Vulnerability with an array of semver ranges
    const mockSnykDb = {
      npm: {
        badlib: [
          {id: 'badlibvuln:12345', severity: 'medium', semver: {vulnerable: ['<2', '>=3.0.0']}},
        ],
      },
    };
    const Stacks = [{detector: 'js', name: 'Badlib', version: '3.0.0', npm: 'badlib'}];
    const vulns = NoVulnerableLibrariesAudit.getVulnerabilities(
      '3.0.0',
      Stacks[0],
      mockSnykDb
    );

    expect(vulns[0].severity).toBeDisplayString('Medium');
    assert.equal(vulns[0].library, 'Badlib@3.0.0');
    assert.equal(vulns[0].numericSeverity, 2);
    assert.equal(vulns[0].url, 'https://snyk.io/vuln/badlibvuln:12345');
  });

  it('handles ill-specified versions', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      Stacks: [
        {detector: 'js', name: 'angular', version: 'c0ab71056b936', npm: 'angular'},
        {detector: 'js', name: 'react', version: '1.5.0 -something,weird', npm: 'react'},
        {detector: 'js', name: 'jquery', version: '1.8', npm: 'jquery'},
      ],
    });

    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.details.items[0].detectedLib.type, 'link');
    assert.equal(auditResult.details.items[0].detectedLib.text, 'jquery@1.8.0');
  });

  it('passes when no JS libraries with known vulnerabilities are detected', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      Stacks: [
        {detector: 'js', name: 'lib1', version: '3.10.1', npm: 'lib1'},
        {detector: 'js', name: 'lib2', version: undefined, npm: 'lib2'},
      ],
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
    assert.equal(auditResult.extendedInfo.jsLibs.length, 2);
  });

  it('passes when no JS libraries are detected', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      Stacks: [],
    });
    assert.equal(auditResult.score, 1);
  });
});

describe('Snyk database', () => {
  // https://github.com/npm/node-semver/issues/166#issuecomment-245990039
  function hasUpperBound(rangeString) {
    const range = new semver.Range(rangeString);
    if (!range) return false;

    // For every subset ...
    for (const subset of range.set) {
    // Upperbound exists if...

    // < or <= is in one of the subset's clauses (= gets normalized to >= and <).
      if (subset.some(comparator => comparator.operator && comparator.operator.match(/^</))) {
        continue;
      }

      // Subset has a prerelease tag (operator will be empty string).
      if (subset.length === 1 && subset[0].operator === '') {
        continue;
      }

      // No upperbound for this subset.
      return false;
    }

    return true;
  }

  it('hasUpperBound works as intended', () => {
    assert.equal(hasUpperBound('<1.12.2'), true);
    assert.equal(hasUpperBound('=1.12.2'), true);
    assert.equal(hasUpperBound('>=1.12.3 <2.2.2'), true);
    assert.equal(hasUpperBound('>=2.2.3 <3.0.0'), true);
    assert.equal(hasUpperBound('>=3.0.0 <3.10.1 || =3.10.2'), true);

    assert.equal(hasUpperBound('>1.12.2'), false);
    assert.equal(hasUpperBound('>=1.12.2'), false);
    assert.equal(hasUpperBound('*'), false);
  });

  it('every snyk vulnerability has an upper bound', () => {
    for (const vulns of Object.values(NoVulnerableLibrariesAudit.snykDB.npm)) {
      for (const vuln of vulns) {
        for (const semver of vuln.semver.vulnerable) {
          if (!hasUpperBound(semver)) {
            assert.fail(`invalid semver: ${semver}. Must contain an upper bound`);
          }
        }
      }
    }
  });
});
