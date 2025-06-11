/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import JsLibrariesAudit from '../../../audits/dobetterweb/js-libraries.js';

describe('Returns detected front-end JavaScript libraries', () => {
  it('not applicable when there are no stacks', () => {
    // no libraries
    const auditResult1 = JsLibrariesAudit.audit({
      Stacks: [],
    });
    assert.equal(auditResult1.notApplicable, true);
  });

  it('always passes', () => {
    // duplicates. TODO: consider failing in this case
    const auditResult2 = JsLibrariesAudit.audit({
      Stacks: [
        {detector: 'js', id: 'lib1', name: 'lib1', version: '3.10.1', npm: 'lib1'},
        {detector: 'js', id: 'lib2', name: 'lib2', version: undefined, npm: 'lib2'},
      ],
    });
    assert.equal(auditResult2.score, 1);

    // LOTS of frontend libs
    const auditResult3 = JsLibrariesAudit.audit({
      Stacks: [
        {detector: 'js', id: 'react', name: 'React', version: undefined, npm: 'react'},
        {detector: 'js', id: 'polymer', name: 'Polymer', version: undefined, npm: 'polymer-core'},
        {detector: 'js', id: 'preact', name: 'Preact', version: undefined, npm: 'preact'},
        {detector: 'js', id: 'angular', name: 'Angular', version: undefined, npm: 'angular'},
        {detector: 'js', id: 'jquery', name: 'jQuery', version: undefined, npm: 'jquery'},
      ],
    });
    assert.equal(auditResult3.score, 1);
  });

  it('generates expected details', () => {
    const auditResult = JsLibrariesAudit.audit({
      Stacks: [
        {detector: 'js', id: 'lib1', name: 'lib1', version: '3.10.1', npm: 'lib1'},
        {detector: 'js', id: 'lib2', name: 'lib2', version: undefined, npm: 'lib2'},
        {detector: 'js', id: 'lib2-fast', name: 'lib2', version: undefined, npm: 'lib2'},
      ],
    });
    const expected = [
      {
        name: 'lib1',
        npm: 'lib1',
        version: '3.10.1',
      },
      {
        name: 'lib2',
        npm: 'lib2',
        version: undefined,
      },
    ];
    assert.equal(auditResult.score, 1);
    assert.deepStrictEqual(auditResult.details.items, expected);
    assert.deepStrictEqual(auditResult.details.debugData.stacks[2], {
      id: 'lib2-fast',
      version: undefined,
    });
  });
});
