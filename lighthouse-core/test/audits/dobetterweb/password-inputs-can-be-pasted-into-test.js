/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const PasswordInputsCanBePastedIntoAudit =
  require('../../../audits/dobetterweb/password-inputs-can-be-pasted-into.js');
const assert = require('assert').strict;

/* eslint-env jest */

describe('Password inputs can be pasted into', () => {
  it('passes when there are no password inputs preventing paste', () => {
    const auditResult = PasswordInputsCanBePastedIntoAudit.audit({
      PasswordInputsWithPreventedPaste: [],
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.extendedInfo.value.length, 0);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when there are password inputs preventing paste', () => {
    const auditResult = PasswordInputsCanBePastedIntoAudit.audit({
      PasswordInputsWithPreventedPaste: [{snippet: ''}, {snippet: ''}],
    });
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.extendedInfo.value.length, 2);
    assert.equal(auditResult.details.items.length, 2);
  });
});
