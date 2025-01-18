/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import FontSizeAudit from '../../../audits/seo/font-size.js';
import * as constants from '../../../config/constants.js';

const URL = {
  requestedUrl: 'https://example.com',
  finalDisplayedUrl: 'https://example.com',
};
const validViewport = 'width=device-width';

describe('SEO: Font size audit', () => {
  const makeMetaElements = viewport => [{name: 'viewport', content: viewport}];

  /** @param {LH.SharedFlagsSettings['formFactor']} formFactor */
  const getFakeContext = (formFactor = 'mobile') => ({
    computedCache: new Map(),
    settings: {
      formFactor: formFactor,
      screenEmulation: constants.screenEmulationMetrics[formFactor],
    },
  });

  it('fails when viewport is not set', async () => {
    const artifacts = {
      URL,
      MetaElements: [],
      FontSize: [],
    };

    const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());
    assert.equal(auditResult.score, 0);
    expect(auditResult.explanation)
      .toBeDisplayString('Text is illegible because there\'s ' +
        'no viewport meta tag optimized for mobile screens.');
  });

  it('fails when less than 60% of text is legible', async () => {
    const artifacts = {
      URL,
      MetaElements: makeMetaElements(validViewport),
      FontSize: {
        totalTextLength: 100,
        failingTextLength: 41,
        analyzedFailingTextLength: 41,
        analyzedFailingNodesData: [
          {nodeId: 1, textLength: 10, fontSize: 10, parentNode: {nodeName: 'p', attributes: []}},
          {nodeId: 2, textLength: 31, fontSize: 11, parentNode: {nodeName: 'p', attributes: []}},
        ],
      },
    };

    const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());
    assert.equal(auditResult.score, 0);
    expect(auditResult.displayValue).toBeDisplayString('59% legible text');
  });

  it('passes when there is no text', async () => {
    const artifacts = {
      URL,
      MetaElements: makeMetaElements(validViewport),
      FontSize: {
        totalTextLength: 0,
        failingTextLength: 0,
        analyzedFailingTextLength: 0,
        analyzedFailingNodesData: [
          {nodeId: 1, textLength: 0, fontSize: 11, parentNode: {nodeName: 'p', attributes: []}},
        ],
      },
    };

    const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());
    assert.equal(auditResult.score, 1);
  });

  it('passes when more than 60% of text is legible', async () => {
    const artifacts = {
      URL,
      MetaElements: makeMetaElements(validViewport),
      FontSize: {
        totalTextLength: 330,
        failingTextLength: 33,
        analyzedFailingTextLength: 33,
        analyzedFailingNodesData: [
          {nodeId: 1, textLength: 11, fontSize: 10, parentNode: {nodeName: 'p', attributes: []}},
          {nodeId: 2, textLength: 22, fontSize: 11, parentNode: {nodeName: 'p', attributes: []}},
        ],
      },
    };
    const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());
    assert.equal(auditResult.score, 1);
    expect(auditResult.displayValue).toBeDisplayString('90% legible text');
  });

  it('groups entries with same source, sorts them by coverage', async () => {
    const style1 = {
      styleSheetId: 1,
      type: 'Regular',
      range: {
        startLine: 123,
        startColumn: 10,
      },
    };
    const style2 = {
      styleSheetId: 1,
      type: 'Regular',
      range: {
        startLine: 0,
        startColumn: 10,
      },
    };
    const artifacts = {
      URL,
      MetaElements: makeMetaElements(validViewport),
      FontSize: {
        totalTextLength: 7,
        failingTextLength: 7,
        analyzedFailingTextLength: 7,
        analyzedFailingNodesData: [
          {nodeId: 1, textLength: 3, fontSize: 11, parentNode: {}, cssRule: style1},
          {nodeId: 2, textLength: 2, fontSize: 10, parentNode: {}, cssRule: style2},
          {nodeId: 3, textLength: 2, fontSize: 10, parentNode: {}, cssRule: style2},
        ],
      },
    };
    const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());

    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 2);
    assert.equal(auditResult.details.items[0].coverage, '57.14%');
    expect(auditResult.displayValue).toBeDisplayString('0% legible text');
  });

  it('adds a category for failing text that wasn\'t analyzed', async () => {
    const artifacts = {
      URL,
      MetaElements: makeMetaElements(validViewport),
      FontSize: {
        totalTextLength: 100,
        failingTextLength: 50,
        analyzedFailingTextLength: 10,
        analyzedFailingNodesData: [
          {textLength: 10, fontSize: 10, parentNode: {nodeId: 1, nodeName: 'p', attributes: []}},
        ],
      },
    };
    const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 3);
    assert.equal(auditResult.details.items[1].source.type, 'code');
    expect(auditResult.details.items[1].source.value).toBeDisplayString('Add\'l illegible text');
    assert.equal(auditResult.details.items[1].coverage, '40.00%');
    expect(auditResult.displayValue).toBeDisplayString('50% legible text');
  });

  it('informs user if audit haven\'t covered all text on the page', async () => {
    const artifacts = {
      URL,
      MetaElements: makeMetaElements(validViewport),
      FontSize: {
        totalTextLength: 100,
        failingTextLength: 50,
        analyzedFailingTextLength: 50,
        analyzedFailingNodesData: [
          {textLength: 50, fontSize: 10, parentNode: {nodeId: 1, nodeName: 'p', attributes: []}},
        ],
      },
    };
    const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());
    assert.equal(auditResult.score, 0);
    expect(auditResult.displayValue).toBeDisplayString('50% legible text');
  });

  it('maintains 2 trailing decimal places', async () => {
    const artifacts = {
      URL,
      MetaElements: makeMetaElements(validViewport),
      FontSize: {
        totalTextLength: 323,
        failingTextLength: 33,
        analyzedFailingTextLength: 33,
        analyzedFailingNodesData: [
          {textLength: 11, fontSize: 10, parentNode: {nodeId: 1, nodeName: 'p', attributes: []}},
          {textLength: 22, fontSize: 11, parentNode: {nodeId: 2, nodeName: 'p', attributes: []}},
        ],
      },
    };
    const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());
    expect(auditResult.displayValue).toBeDisplayString('89.78% legible text');
  });

  it('maintains 2 trailing decimal places with only 1 leading digit', async () => {
    const artifacts = {
      URL,
      MetaElements: makeMetaElements(validViewport),
      FontSize: {
        totalTextLength: 323,
        failingTextLength: 315,
        analyzedFailingTextLength: 315,
        analyzedFailingNodesData: [
          {textLength: 311, fontSize: 10, parentNode: {nodeId: 1, nodeName: 'p', attributes: []}},
          {textLength: 4, fontSize: 11, parentNode: {nodeId: 2, nodeName: 'p', attributes: []}},
        ],
      },
    };
    const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());
    expect(auditResult.displayValue).toBeDisplayString('2.48% legible text');
  });

  it('is not applicable on desktop', async () => {
    const artifacts = {
      URL,
      MetaElements: [],
      FontSize: {},
    };
    const desktopContext = getFakeContext('desktop');
    const auditResult = await FontSizeAudit.audit(artifacts, desktopContext);
    expect(auditResult.score).toBe(1);
    expect(auditResult.notApplicable).toBe(true);
  });

  it('handles valueless attributes on grandparent nodes', async () => {
    const artifacts = {
      URL,
      MetaElements: makeMetaElements(validViewport),
      FontSize: {
        totalTextLength: 13,
        failingTextLength: 13,
        analyzedFailingTextLength: 13,
        analyzedFailingNodesData: [
          {
            nodeId: 1,
            textLength: 13,
            fontSize: 10,
            cssRule: {type: 'Inline'},
            parentNode: {
              nodeName: 'p',
              attributes: ['style', 'font-size: 10px;'],
              parentNode: {nodeName: 'div', attributes: ['style', undefined]},
            },
          },
        ],
      },
    };

    const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());
    assert.equal(auditResult.score, 0);
    expect(auditResult.displayValue).toBeDisplayString('0% legible text');
  });

  describe('attributes source of style', () => {
    async function runFontSizeAuditWithSingleFailingStyle(style, nodeProperties) {
      const artifacts = {
        URL,
        MetaElements: makeMetaElements(validViewport),
        FontSize: {
          analyzedFailingNodesData: [
            {textLength: 1, fontSize: 1, parentNode: {...nodeProperties}, cssRule: style},
          ],
        },
      };
      const auditResult = await FontSizeAudit.audit(artifacts, getFakeContext());
      expect(auditResult.details.items).toHaveLength(1);
      return auditResult;
    }

    it('to inline node stylesheet', async () => {
      const auditResult = await runFontSizeAuditWithSingleFailingStyle({
        type: 'Inline',
      }, {
        parentNode: {attributes: ['id', 'my-parent']},
        nodeName: 'p',
        attributes: ['class', 'my-p'],
      });

      expect(auditResult.details.items[0]).toMatchObject({
        source: {
          type: 'url',
          value: URL.finalDisplayedUrl,
        },
        selector: {
          type: 'node',
          selector: '#my-parent',
          snippet: '<p class="my-p">',
        },
      });
    });

    it('to attributes node stylesheet', async () => {
      const auditResult = await runFontSizeAuditWithSingleFailingStyle({
        type: 'Attributes',
      }, {
        parentNode: {attributes: ['id', 'my-parent']},
        nodeName: 'font',
        attributes: ['size', '10px'],
      });

      expect(auditResult.details.items[0]).toMatchObject({
        source: {
          type: 'url',
          value: URL.finalDisplayedUrl,
        },
        selector: {
          type: 'node',
          selector: '#my-parent',
          snippet: '<font size="10px">',
        },
      });
    });

    it('to external stylesheet', async () => {
      const auditResult = await runFontSizeAuditWithSingleFailingStyle({
        stylesheet: {
          sourceURL: 'http://www.example.com/styles-1.css',
        },
        type: 'Regular',
        range: {
          startLine: 50,
          startColumn: 50,
        },
      });

      assert.equal(auditResult.details.items.length, 1);
      assert.deepEqual(auditResult.details.items[0].source, {
        type: 'source-location',
        url: 'http://www.example.com/styles-1.css',
        urlProvider: 'network',
        line: 50,
        column: 50,
        original: undefined,
      });
    });

    it('to inline <style>', async () => {
      const auditResult = await runFontSizeAuditWithSingleFailingStyle({
        stylesheet: {
          sourceURL: 'http://www.example.com',
          isInline: true,
          startLine: 5,
          startColumn: 5,
        },
        type: 'Regular',
        range: {
          startLine: 10,
          startColumn: 10,
        },
      });

      assert.equal(auditResult.details.items.length, 1);
      assert.deepEqual(auditResult.details.items[0].source, {
        type: 'source-location',
        url: 'http://www.example.com',
        urlProvider: 'network',
        line: 15,
        column: 10,
        original: undefined,
      });
    });

    it('to inline <style> with rule on the same line as <style>', async () => {
      const auditResult = await runFontSizeAuditWithSingleFailingStyle({
        stylesheet: {
          sourceURL: 'http://www.example.com',
          isInline: true,
          startLine: 5,
          startColumn: 5,
        },
        type: 'Regular',
        range: {
          startLine: 0,
          startColumn: 10,
        },
      });

      assert.equal(auditResult.details.items.length, 1);
      assert.deepEqual(auditResult.details.items[0].source, {
        type: 'source-location',
        url: 'http://www.example.com',
        urlProvider: 'network',
        line: 5,
        column: 15,
        original: undefined,
      });
    });

    it('to inline <style> with magic sourceURL comment', async () => {
      const auditResult = await runFontSizeAuditWithSingleFailingStyle({
        stylesheet: {
          sourceURL: 'something-magical.css',
          isInline: true,
          hasSourceURL: true,
          startLine: 5,
          startColumn: 5,
        },
        type: 'Regular',
        range: {
          startLine: 10,
          startColumn: 10,
        },
      });

      assert.equal(auditResult.details.items.length, 1);
      assert.deepEqual(auditResult.details.items[0].source, {
        type: 'source-location',
        url: 'something-magical.css',
        urlProvider: 'comment',
        line: 10,
        column: 10,
        original: undefined,
      });
    });
  });
});
