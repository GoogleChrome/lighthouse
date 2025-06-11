/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import NonCompositedAnimationsAudit from '../../audits/non-composited-animations.js';
describe('Non-composited animations audit', () => {
  it('correctly surfaces non-composited animations', async () => {
    const artifacts = {
      TraceElements: [
        {
          traceEventType: 'animation',
          nodeId: 4,
          node: {
            devtoolsNodePath: '1,HTML,1,BODY,1,DIV',
            selector: 'body > div#animated-boi',
            nodeLabel: 'div',
            snippet: '<div id="animated-boi">',
          },
          animations: [
            {failureReasonsMask: 8192, unsupportedProperties: ['height', 'width']},
            {name: 'alpha', failureReasonsMask: 8192, unsupportedProperties: ['color']},
            {name: 'beta', failureReasonsMask: 8192, unsupportedProperties: ['top']},
          ],
        },
      ],
      HostUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4216.0 Safari/537.36',
    };

    const auditResult = await NonCompositedAnimationsAudit.audit(artifacts);
    expect(auditResult.score).toEqual(0);
    expect(auditResult.metricSavings).toEqual({CLS: 0});
    expect(auditResult.details.headings).toHaveLength(2);
    expect(auditResult.displayValue).toBeDisplayString('1 animated element found');
    expect(auditResult.details.items).toHaveLength(1);
    expect(auditResult.details.items[0].node).toEqual({
      type: 'node',
      path: '1,HTML,1,BODY,1,DIV',
      selector: 'body > div#animated-boi',
      nodeLabel: 'div',
      snippet: '<div id="animated-boi">',
    });
    expect(auditResult.details.items[0].subItems.items[0].failureReason)
      .toBeDisplayString('Unsupported CSS Properties: height, width');
    expect(auditResult.details.items[0].subItems.items[0].animation)
      .toBeUndefined();
    expect(auditResult.details.items[0].subItems.items[1].failureReason)
      .toBeDisplayString('Unsupported CSS Property: color');
    expect(auditResult.details.items[0].subItems.items[1].animation)
      .toEqual('alpha');
    expect(auditResult.details.items[0].subItems.items[2].failureReason)
      .toBeDisplayString('Unsupported CSS Property: top');
    expect(auditResult.details.items[0].subItems.items[2].animation)
      .toEqual('beta');
  });

  it('properly removes duplicate reasons', async () => {
    const artifacts = {
      TraceElements: [
        {
          traceEventType: 'animation',
          nodeId: 4,
          node: {
            devtoolsNodePath: '1,HTML,1,BODY,1,DIV',
            selector: 'body > div#animated-1',
            nodeLabel: 'div',
            snippet: '<div id="animated-1">',
          },
          animations: [
            {failureReasonsMask: 8192, unsupportedProperties: ['height']},
            {failureReasonsMask: 8192, unsupportedProperties: ['height']},
          ],
        },
        {
          traceEventType: 'animation',
          nodeId: 5,
          node: {
            devtoolsNodePath: '1,HTML,1,BODY,2,DIV',
            selector: 'body > div#animated-2',
            nodeLabel: 'div',
            snippet: '<div id="animated-2">',
          },
          animations: [
            {failureReasonsMask: 8192, unsupportedProperties: ['height']},
          ],
        },
      ],
      HostUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4216.0 Safari/537.36',
    };

    const auditResult = await NonCompositedAnimationsAudit.audit(artifacts);
    expect(auditResult.score).toEqual(0);
    expect(auditResult.details.headings).toHaveLength(1);
    expect(auditResult.displayValue).toBeDisplayString('2 animated elements found');
    expect(auditResult.details.items).toHaveLength(2);
    expect(auditResult.details.items[0].node).toEqual({
      type: 'node',
      path: '1,HTML,1,BODY,1,DIV',
      selector: 'body > div#animated-1',
      nodeLabel: 'div',
      snippet: '<div id="animated-1">',
    });
    expect(auditResult.details.items[1].node).toEqual({
      type: 'node',
      path: '1,HTML,1,BODY,2,DIV',
      selector: 'body > div#animated-2',
      nodeLabel: 'div',
      snippet: '<div id="animated-2">',
    });
    expect(auditResult.details.items[0].subItems.items[0].failureReason)
      .toBeDisplayString('Unsupported CSS Property: height');
    expect(auditResult.details.items[0].subItems.items[0].animation)
      .toBeUndefined();
    expect(auditResult.details.items[1].subItems.items[0].failureReason)
      .toBeDisplayString('Unsupported CSS Property: height');
    expect(auditResult.details.items[1].subItems.items[0].animation)
      .toBeUndefined();
  });

  it('does not surface composited animation', async () => {
    const artifacts = {
      TraceElements: [
        {
          traceEventType: 'animation',
          nodeId: 4,
          node: {
            devtoolsNodePath: '1,HTML,1,BODY,1,DIV',
            selector: 'body > div#animated-boi',
            nodeLabel: 'div',
            snippet: '<div id="animated-boi">',
          },
          animations: [
            {failureReasonsMask: 0, unsupportedProperties: []},
            {name: 'alpha', failureReasonsMask: 0, unsupportedProperties: []},
          ],
        },
      ],
      HostUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4216.0 Safari/537.36',
    };

    const auditResult = await NonCompositedAnimationsAudit.audit(artifacts);
    expect(auditResult.score).toEqual(1);
    expect(auditResult.metricSavings).toEqual({CLS: 0});
    expect(auditResult.details.items).toHaveLength(0);
  });

  it('only surfaces actionable animation failure reasons', async () => {
    const artifacts = {
      TraceElements: [
        {
          traceEventType: 'animation',
          nodeId: 4,
          node: {
            devtoolsNodePath: '1,HTML,1,BODY,1,DIV',
            selector: 'body > div#animated-boi',
            nodeLabel: 'div',
            snippet: '<div id="animated-boi">',
          },
          animations: [
            {name: 'alpha', failureReasonsMask: 4, unsupportedProperties: []}, // kInvalidAnimationOrEffect
          ],
        },
      ],
      HostUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4216.0 Safari/537.36',
    };

    const auditResult = await NonCompositedAnimationsAudit.audit(artifacts);
    expect(auditResult.score).toEqual(1);
    expect(auditResult.metricSavings).toEqual({CLS: 0});
    expect(auditResult.details.items).toHaveLength(0);
  });

  it('properly reports all failure reasons', async () => {
    const artifacts = {
      TraceElements: [
        {
          traceEventType: 'animation',
          nodeId: 4,
          node: {
            devtoolsNodePath: '1,HTML,1,BODY,1,DIV',
            selector: 'body > div#animated',
            nodeLabel: 'div',
            snippet: '<div id="animated">',
          },
          animations: [
            {failureReasonsMask: 0b11100001011000, unsupportedProperties: ['height']},
          ],
        },
      ],
      HostUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4216.0 Safari/537.36',
    };

    const auditResult = await NonCompositedAnimationsAudit.audit(artifacts);
    expect(auditResult.score).toEqual(0);
    expect(auditResult.details.headings).toHaveLength(1);
    expect(auditResult.displayValue).toBeDisplayString('1 animated element found');
    expect(auditResult.details.items).toHaveLength(1);
    expect(auditResult.details.items[0].node).toEqual({
      type: 'node',
      path: '1,HTML,1,BODY,1,DIV',
      selector: 'body > div#animated',
      nodeLabel: 'div',
      snippet: '<div id="animated">',
    });
    expect(auditResult.details.items[0].subItems.items[0].failureReason)
      .toBeDisplayString('Unsupported CSS Property: height');
    expect(auditResult.details.items[0].subItems.items[0].animation)
      .toBeUndefined();
    expect(auditResult.details.items[0].subItems.items[1].failureReason)
      .toBeDisplayString('Transform-related property depends on box size');
    expect(auditResult.details.items[0].subItems.items[1].animation)
      .toBeUndefined();
    expect(auditResult.details.items[0].subItems.items[2].failureReason)
      .toBeDisplayString('Filter-related property may move pixels');
    expect(auditResult.details.items[0].subItems.items[2].animation)
      .toBeUndefined();
    expect(auditResult.details.items[0].subItems.items[3].failureReason)
      .toBeDisplayString('Effect has composite mode other than "replace"');
    expect(auditResult.details.items[0].subItems.items[3].animation)
      .toBeUndefined();
    expect(auditResult.details.items[0].subItems.items[4].failureReason)
      .toBeDisplayString('Target has another animation which is incompatible');
    expect(auditResult.details.items[0].subItems.items[4].animation)
      .toBeUndefined();
    expect(auditResult.details.items[0].subItems.items[5].failureReason)
      .toBeDisplayString('Effect has unsupported timing parameters');
    expect(auditResult.details.items[0].subItems.items[5].animation)
      .toBeUndefined();
  });
});
