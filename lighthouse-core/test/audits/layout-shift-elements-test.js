/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LayoutShiftElementsAudit =
  require('../../audits/layout-shift-elements.js');

/* eslint-env jest */

describe('Performance: layout-shift-elements audit', () => {
  it('correctly surfaces a single CLS element', async () => {
    const artifacts = {
      TraceElements: [{
        metricName: 'cumulative-layout-shift',
        devtoolsNodePath: '1,HTML,3,BODY,5,DIV,0,HEADER',
        selector: 'div.l-header > div.chorus-emc__content',
        nodeLabel: 'My Test Label',
        snippet: '<h1 class="test-class">',
      }],
    };

    const auditResult = await LayoutShiftElementsAudit.audit(artifacts);
    expect(auditResult.score).toEqual(1);
    expect(auditResult.displayValue).toBeDisplayString('1 element found');
    expect(auditResult.details.items).toHaveLength(1);
    expect(auditResult.details.items[0]).toHaveProperty('node');
    expect(auditResult.details.items[0].node).toHaveProperty('type', 'node');
  });

  it('correctly surfaces multiple CLS elements', async () => {
    const clsElement = {
      metricName: 'cumulative-layout-shift',
      devtoolsNodePath: '1,HTML,3,BODY,5,DIV,0,HEADER',
      selector: 'div.l-header > div.chorus-emc__content',
      nodeLabel: 'My Test Label',
      snippet: '<h1 class="test-class">',
    };
    const artifacts = {
      TraceElements: Array(4).fill(clsElement),
    };

    const auditResult = await LayoutShiftElementsAudit.audit(artifacts);
    expect(auditResult.score).toEqual(1);
    expect(auditResult.displayValue).toBeDisplayString('4 elements found');
    expect(auditResult.details.items).toHaveLength(4);
  });

  it('correctly handles when there are no CLS elements to show', async () => {
    const artifacts = {
      TraceElements: [],
    };

    const auditResult = await LayoutShiftElementsAudit.audit(artifacts);
    expect(auditResult.score).toEqual(1);
    expect(auditResult.displayValue).toBeUndefined();
    expect(auditResult.details.items).toHaveLength(0);
  });
});
