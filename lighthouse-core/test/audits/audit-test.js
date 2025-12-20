/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/audit.js');
const assert = require('assert').strict;

/* eslint-env jest */

// Extend the Audit class but fail to implement meta. It should throw errors.
class A extends Audit {}
class B extends Audit {
  static get meta() {
    return {};
  }

  static audit() {}
}

class PassOrFailAudit extends Audit {
  static get meta() {
    return {
      id: 'pass-or-fail',
      title: 'Passing',
      failureTitle: 'Failing',
      description: 'A pass or fail audit',
      requiredArtifacts: [],
    };
  }
}

class NumericAudit extends Audit {
  static get meta() {
    return {
      id: 'numeric-time',
      title: 'Numbersssss',
      description: '01000000001011011111100001010100',
      requiredArtifacts: [],
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
    };
  }
}

describe('Audit', () => {
  it('throws if an audit does not override the meta', () => {
    assert.throws(_ => A.meta);
  });

  it('does not throw if an audit overrides the meta', () => {
    assert.doesNotThrow(_ => B.meta);
  });

  it('throws if an audit does not override audit()', () => {
    assert.throws(_ => A.audit());
  });

  it('does not throw if an audit overrides audit()', () => {
    assert.doesNotThrow(_ => B.audit());
  });

  describe('generateAuditResult', () => {
    describe('scoreDisplayMode', () => {
      it('defaults to BINARY scoring when no scoreDisplayMode is set', () => {
        assert.strictEqual(PassOrFailAudit.meta.scoreDisplayMode, undefined);
        const auditResult = Audit.generateAuditResult(PassOrFailAudit, {score: 1});
        assert.strictEqual(auditResult.scoreDisplayMode, Audit.SCORING_MODES.BINARY);
        assert.strictEqual(auditResult.score, 1);
      });

      it('does not override scoreDisplayMode and is scored when it is NUMERIC', () => {
        assert.strictEqual(NumericAudit.meta.scoreDisplayMode, Audit.SCORING_MODES.NUMERIC);
        const auditResult = Audit.generateAuditResult(NumericAudit, {score: 1});
        assert.strictEqual(auditResult.scoreDisplayMode, Audit.SCORING_MODES.NUMERIC);
        assert.strictEqual(auditResult.score, 1);
      });

      it('switches to an ERROR and is not scored if an errorMessage is passed in', () => {
        const errorMessage = 'ERRRRR';
        const auditResult = Audit.generateAuditResult(NumericAudit, {score: 1, errorMessage});

        assert.strictEqual(auditResult.scoreDisplayMode, Audit.SCORING_MODES.ERROR);
        assert.strictEqual(auditResult.errorMessage, errorMessage);
        assert.strictEqual(auditResult.score, null);
      });

      it('switches to an ERROR and is not scored if an errorMessage is passed in with null', () => {
        const errorMessage = 'ERRRRR';
        const auditResult = Audit.generateAuditResult(NumericAudit, {score: null, errorMessage});

        assert.strictEqual(auditResult.scoreDisplayMode, Audit.SCORING_MODES.ERROR);
        assert.strictEqual(auditResult.errorMessage, errorMessage);
        assert.strictEqual(auditResult.score, null);
      });

      it('switches to NOT_APPLICABLE and is not scored if product was marked notApplicable', () => {
        const auditResult = Audit.generateAuditResult(PassOrFailAudit,
            {score: 1, notApplicable: true});

        assert.strictEqual(auditResult.scoreDisplayMode, Audit.SCORING_MODES.NOT_APPLICABLE);
        assert.strictEqual(auditResult.score, null);
      });
    });

    it('throws if an audit returns a score > 1', () => {
      assert.throws(_ => Audit.generateAuditResult(PassOrFailAudit, {score: 100}), /is > 1/);
      assert.throws(_ => Audit.generateAuditResult(PassOrFailAudit, {score: 2}), /is > 1/);
    });

    it('throws if an audit returns a score < 0', () => {
      assert.throws(_ => Audit.generateAuditResult(PassOrFailAudit, {score: -0.1}), /is < 0/);
      assert.throws(_ => Audit.generateAuditResult(PassOrFailAudit, {score: -100}), /is < 0/);
    });

    it('throws if an audit returns a score that\'s not a number', () => {
      const re = /Invalid score/;
      assert.throws(_ => Audit.generateAuditResult(PassOrFailAudit, {score: NaN}), re);
      assert.throws(_ => Audit.generateAuditResult(PassOrFailAudit, {score: 'string'}), re);
    });

    it('throws if an audit does not return a result with a score', () => {
      assert.throws(_ => Audit.generateAuditResult(PassOrFailAudit, {}), /requires a score/);
    });

    it('clamps the score to two decimals', () => {
      const auditResult = Audit.generateAuditResult(PassOrFailAudit, {score: 0.29666666666666663});
      assert.strictEqual(auditResult.score, 0.3);
    });

    it('chooses the title if score is passing', () => {
      const auditResult = Audit.generateAuditResult(PassOrFailAudit, {score: 1});
      assert.strictEqual(auditResult.score, 1);
      assert.equal(auditResult.title, 'Passing');
    });

    it('chooses the failureTitle if score is failing', () => {
      const auditResult = Audit.generateAuditResult(PassOrFailAudit, {score: 0});
      assert.strictEqual(auditResult.score, 0);
      assert.equal(auditResult.title, 'Failing');
    });

    it('chooses the title if audit is not scored due to scoreDisplayMode', () => {
      const auditResult = Audit.generateAuditResult(PassOrFailAudit,
          {score: 0, errorMessage: 'what errors lurk'});
      assert.strictEqual(auditResult.score, null);
      assert.equal(auditResult.title, 'Passing');
    });
  });

  it('sets state of non-applicable audits', () => {
    const providedResult = {score: 1, notApplicable: true};
    const result = Audit.generateAuditResult(B, providedResult);
    assert.equal(result.score, null);
    assert.equal(result.scoreDisplayMode, 'notApplicable');
  });

  it('sets state of failed audits', () => {
    const providedResult = {score: 1, errorMessage: 'It did not work'};
    const result = Audit.generateAuditResult(B, providedResult);
    assert.equal(result.score, null);
    assert.equal(result.scoreDisplayMode, 'error');
  });

  describe('makeSnippetDetails', () => {
    const maxLinesAroundMessage = 10;

    it('Transforms code to lines array', () => {
      const details = Audit.makeSnippetDetails({
        content: 'a\nb\nc',
        title: 'Title',
        lineMessages: [],
        generalMessages: [],
      });

      assert.equal(details.lines.length, 3);
      assert.deepEqual(details.lines[1], {
        lineNumber: 2,
        content: 'b',
      });
    });

    it('Truncates long lines', () => {
      const details = Audit.makeSnippetDetails({
        content: Array(1001).join('-'),
        title: 'Title',
        lineMessages: [],
        generalMessages: [],
      });

      assert.equal(details.lines[0].truncated, true);
      assert.ok(details.lines[0].content.length < 1000);
    });

    function makeLines(lineCount) {
      return Array(lineCount + 1).join('-\n');
    }

    it('Limits the number of lines if there are no line messages', () => {
      const details = Audit.makeSnippetDetails({
        content: makeLines(100),
        title: 'Title',
        lineMessages: [],
        generalMessages: [{
          message: 'General',
        }],
        maxLinesAroundMessage,
      });
      expect(details.lines.length).toBe(2 * maxLinesAroundMessage + 1);
    });

    it('Does not omit lines if fewer than 4 lines would be omitted', () => {
      const details = Audit.makeSnippetDetails({
        content: makeLines(200),
        title: 'Title',
        lineMessages: [
          // without the special logic for small gaps lines 71-73 would be missing
          {
            // putting last message first to make sure makeSnippetDetails doesn't depend on order
            lineNumber: 84,
            message: 'Message 2',
          }, {
            lineNumber: 60,
            message: 'Message 1',
          }],
        generalMessages: [],
        maxLinesAroundMessage,
      });

      const normalExpectedLineNumber = 2 * (maxLinesAroundMessage * 2 + 1);
      assert.equal(details.lines.length, normalExpectedLineNumber + 3);
    });

    it('Limits the number of lines around line messages', () => {
      const content = makeLines(99) + 'A\n' + makeLines(99) + '\nB';
      const allLines = content.split('\n');
      const details = Audit.makeSnippetDetails({
        content,
        title: 'Title',
        lineMessages: [{
          lineNumber: allLines.findIndex(l => l === 'A') + 1,
          message: 'a',
        }, {
          lineNumber: allLines.findIndex(l => l === 'B') + 1,
          message: 'b',
        }],
        generalMessages: [],
        maxLinesAroundMessage,
      });

      // 2 line messages and their surounding lines, second line with message only has preceding lines
      const lineCount = maxLinesAroundMessage * 3 + 2;
      assert.equal(details.lines.length, lineCount);
      const lastLine = details.lines.slice(-1)[0];
      assert.deepEqual(lastLine, {
        lineNumber: 201,
        content: 'B',
      });
    });
  });

  describe('makeListDetails', () => {
    it('Generates list details', () => {
      const details = Audit.makeListDetails([1, 2, 3]);

      assert.deepEqual(details, {
        type: 'list',
        items: [1, 2, 3],
      });
    });
  });

  describe('#computeLogNormalScore', () => {
    it('clamps the score to two decimal places', () => {
      const params = {
        median: 1000,
        p10: 500,
      };

      assert.strictEqual(Audit.computeLogNormalScore(params, 0), 1);
      assert.strictEqual(Audit.computeLogNormalScore(params, 250), 0.99);
      assert.strictEqual(Audit.computeLogNormalScore(params, 1500), 0.23);
      assert.strictEqual(Audit.computeLogNormalScore(params, 2500), 0.05);
      assert.strictEqual(Audit.computeLogNormalScore(params, 4000), 0.01);
      assert.strictEqual(Audit.computeLogNormalScore(params, 4100), 0);
    });
  });
});
